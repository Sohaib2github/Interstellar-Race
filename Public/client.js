const socket = io();

// UI Elements
const log = document.getElementById("log");
const status = document.getElementById("status");
const gameStatusText = document.getElementById("game-status-text");
const scoresElement = document.getElementById("scores");
const lobbyElement = document.getElementById("lobby");
const lobbyPlayersElement = document.getElementById("lobby-players");
const readyBtn = document.getElementById("ready-btn");
const feedbackToast = document.getElementById("feedback-toast");
const gameStartToast = document.getElementById("game-start-toast");
const gameOverOverlay = document.getElementById("game-over-overlay");
const gameOverText = document.getElementById("game-over-text");

// Planet Info Modal
const planetInfo = document.getElementById("planet-info");
const planetName = document.getElementById("planet-name");
const planetFact = document.getElementById("planet-fact");
const closeInfoBtn = document.getElementById("close-info");

// Quiz Modal
const quizModal = document.getElementById("quiz-modal");
const quizQuestion = document.getElementById("quiz-question");
const answerBtn1 = document.getElementById("answer-btn-1");
const answerBtn2 = document.getElementById("answer-btn-2");

// Sound Effect Elements
const correctSound = document.getElementById("correct-sound");
const incorrectSound = document.getElementById("incorrect-sound");

let playerId;
let gameState;
let currentQuizPlanet = null;

// Initialize game
socket.on("init", (data) => {
  playerId = data.playerId;
  gameState = data.gameState;
  const player = gameState.players[playerId];

  if (player) {
    status.innerHTML = `Connected as <span style="color:${player.color}">${player.name}</span>`;
  }
  updateLobbyUI();
  updateScoreboard();
});

// === LOBBY AND GAME STATE ===
socket.on("player-status-update", (players) => {
    gameState.players = players;
    updateLobbyUI();
});

socket.on("game-start", () => {
    lobbyElement.style.display = 'none';
    gameStatusText.textContent = 'Race to claim all the planets!';
    logMessage("<strong>Game has started!</strong>");
    gameStartToast.style.display = 'block';
    setTimeout(() => {
        gameStartToast.style.display = 'none';
    }, 1500);
});

socket.on("game-reset", (newState) => {
    logMessage("<strong>New game starting...</strong>");
    gameState = newState;
    updateLobbyUI();
    updateScoreboard();
    if (window.resetPlanetAppearances) {
        window.resetPlanetAppearances();
    }
    lobbyElement.style.display = 'block';
    readyBtn.disabled = false;
    readyBtn.textContent = 'Ready Up';
    gameStatusText.textContent = 'Waiting for players to get ready...';
    gameOverOverlay.style.display = 'none';
    planetInfo.style.display = 'none';
});

// === GAMEPLAY EVENTS ===
socket.on("planet-update", (data) => {
  logMessage(`${data.playerName} claimed ${data.planet} (+${data.points} points)`);
  gameState.planets[data.planet].claimedBy = data.claimedBy;

  if (window.updatePlanetAppearance) {
    window.updatePlanetAppearance(data.planet, data.playerColor);
  }

  if (data.claimedBy === playerId) {
    showPlanetInfo(data.planet);
  }
});

socket.on("score-update", (scores) => {
  gameState.scores = scores;
  updateScoreboard();
});

socket.on("game-over", (data) => {
    const myPlayer = gameState.players[playerId];
    const winnerIsMe = myPlayer && data.winners.includes(myPlayer.name);
    let logText, screenText;

    if (data.winners.length > 1) {
        logText = `It's a draw between: ${data.winners.join(', ')}!`;
        screenText = "Draw!";
    } else {
        const winnerName = data.winners[0];
        logText = winnerIsMe ? `🎉 You won!` : `${winnerName} won!`;
        screenText = winnerIsMe ? "You Win!" : "You Lose!";
    }

  logMessage(`<strong>GAME OVER! ${logText}</strong>`);
  logMessage("New game starting in 10 seconds...");
  showGameOverScreen(screenText);
});


// === QUIZ HANDLING ===
socket.on("start-quiz", (data) => {
    currentQuizPlanet = data.planet;
    quizQuestion.textContent = data.quiz.question;
    answerBtn1.textContent = data.quiz.answers[0];
    answerBtn2.textContent = data.quiz.answers[1];
    quizModal.style.display = 'block';
});

socket.on("quiz-result", (data) => {
    if (data.correct) {
        correctSound.play();
    } else {
        incorrectSound.play();
        logMessage(`Incorrect! The planet remains unclaimed.`);
        showPlanetInfoWithFact(currentQuizPlanet, data.fact);
    }
    showFeedbackToast(data.correct);
});

socket.on("quiz-timeout", () => {
    logMessage("Time's up! The planet is available again.");
    quizModal.style.display = 'none';
});

answerBtn1.addEventListener("click", () => submitAnswer(answerBtn1.textContent));
answerBtn2.addEventListener("click", () => submitAnswer(answerBtn2.textContent));

function submitAnswer(answer) {
    quizModal.style.display = 'none';
    socket.emit("submit-answer", { planet: currentQuizPlanet, answer: answer });
}


// === VISUALS and UI ===
socket.on("planet-locked", (data) => {
    if(window.lockPlanetAppearance) {
        window.lockPlanetAppearance(data.planet, data.isLocked);
    }
});

closeInfoBtn.addEventListener("click", () => {
  planetInfo.style.display = "none";
});

readyBtn.addEventListener("click", () => {
    socket.emit("player-ready");
    readyBtn.textContent = "Waiting for others...";
    readyBtn.disabled = true;
});


// === HELPER FUNCTIONS ===
function logMessage(msg) {
  const li = document.createElement("li");
  li.innerHTML = msg;
  log.prepend(li);
  log.scrollTop = log.scrollHeight;
}

function updateLobbyUI() {
    lobbyPlayersElement.innerHTML = "";
    if (!gameState || !gameState.players) return;
    for (const [id, player] of Object.entries(gameState.players)) {
        const li = document.createElement("li");
        const readyState = player.isReady ? '✅ Ready' : '⏳ Waiting';
        li.innerHTML = `<span style="color:${player.color}">${player.name}</span> - ${readyState}`;
        lobbyPlayersElement.appendChild(li);
    }
}

function updateScoreboard() {
  scoresElement.innerHTML = "";
  if (!gameState || !gameState.scores) return;
  const sortedScores = Object.entries(gameState.scores).sort((a,b) => b[1] - a[1]);

  for (const [id, score] of sortedScores) {
    const player = gameState.players[id];
    if (player) {
      const scoreElement = document.createElement("div");
      scoreElement.innerHTML = `<span style="color:${player.color}">${player.name}</span>: ${score} points`;
      scoresElement.appendChild(scoreElement);
    }
  }
}

function showPlanetInfo(planet) {
  const pData = gameState.planets[planet];
  showPlanetInfoWithFact(planet, pData.fact);
}

function showPlanetInfoWithFact(planet, fact) {
  planetName.textContent = planet;
  planetFact.textContent = fact;
  planetInfo.style.display = "block";
}

function showFeedbackToast(isCorrect) {
    if (isCorrect) {
        feedbackToast.textContent = "Correct!";
        feedbackToast.className = "toast correct";
    } else {
        feedbackToast.textContent = "Incorrect!";
        feedbackToast.className = "toast incorrect";
    }
    feedbackToast.style.display = 'block';

    setTimeout(() => {
        feedbackToast.style.display = 'none';
    }, 2000);
}

function showGameOverScreen(message) {
    gameOverText.textContent = message;
    gameOverText.className = "";

    if (message === "You Win!") {
        gameOverText.classList.add("win");
    } else if (message === "You Lose!") {
        gameOverText.classList.add("lose");
    } else {
        gameOverText.classList.add("draw");
    }
    gameOverOverlay.style.display = 'flex';
}