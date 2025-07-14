const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("Public"));

// Helper function to create initial game state
function createInitialGameState() {
  return {
    status: 'waiting',
    players: {},
    planets: {
      Earth: {
        claimedBy: null, isLocked: false, points: 10,
        fact: "Earth is the only known planet to support life and has liquid water on its surface.",
        quiz: { question: "What is the most abundant gas in Earth's atmosphere?", answers: ["Oxygen", "Nitrogen"], correctAnswer: "Nitrogen" }
      },
      Mars: {
        claimedBy: null, isLocked: false, points: 15,
        fact: "Mars is known as the Red Planet due to iron oxide on its surface.",
        quiz: { question: "What is the common name for the iron oxide that gives Mars its color?", answers: ["Rust", "Soot"], correctAnswer: "Rust" }
      },
      Jupiter: {
        claimedBy: null, isLocked: false, points: 20,
        fact: "Jupiter is the largest planet in our solar system and has a Great Red Spot.",
        quiz: { question: "Jupiter's Great Red Spot is a massive, long-lasting...", answers: ["Volcano", "Storm"], correctAnswer: "Storm" }
      },
      Venus: {
        claimedBy: null, isLocked: false, points: 12,
        fact: "Venus is the hottest planet with surface temperatures over 450°C.",
        quiz: { question: "Is Venus closer to the Sun than Mercury?", answers: ["Yes", "No"], correctAnswer: "No" }
      },
      Mercury: {
        claimedBy: null, isLocked: false, points: 8,
        fact: "Mercury is the closest planet to the Sun and has no atmosphere.",
        quiz: { question: "Does Mercury have any moons?", answers: ["Yes", "No"], correctAnswer: "No" }
      },
      Saturn: {
        claimedBy: null, isLocked: false, points: 18,
        fact: "Saturn is famous for its prominent ring system.",
        quiz: { question: "Are Saturn's rings solid?", answers: ["Yes", "No"], correctAnswer: "No" }
      },
      Uranus: {
        claimedBy: null, isLocked: false, points: 16,
        fact: "Uranus rotates on its side, making its seasons very unusual.",
        quiz: { question: "What is unique about Uranus's rotation?", answers: ["It's retrograde (backwards)", "It's on its side"], correctAnswer: "It's on its side" }
      },
      Neptune: {
        claimedBy: null, isLocked: false, points: 17,
        fact: "Neptune is the farthest planet from the Sun and has strong winds.",
        quiz: { question: "Which planet was discovered using mathematical prediction?", answers: ["Neptune", "Uranus"], correctAnswer: "Neptune" }
      }
    },
    scores: {}
  };
}

let gameState = createInitialGameState();
const quizTimeouts = {};

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  gameState.players[socket.id] = {
    name: `Explorer-${Math.floor(Math.random() * 1000)}`,
    color: getRandomColor(),
    isReady: false
  };
  gameState.scores[socket.id] = 0;

  socket.emit("init", {
    playerId: socket.id,
    gameState
  });

  io.emit("player-status-update", gameState.players);

  socket.on("player-ready", () => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].isReady = true;
      io.emit("player-status-update", gameState.players);

      const players = Object.values(gameState.players);
      if (players.length >= 2 && players.every(p => p.isReady)) {
        gameState.status = 'playing';
        io.emit("game-start");
      }
    }
  });

  socket.on("request-planet-quiz", (data) => {
    const planet = gameState.planets[data.planet];
    if (gameState.status === 'playing' && planet && !planet.claimedBy && !planet.isLocked) {
      planet.isLocked = true;
      planet.lockedBy = socket.id;
      io.emit("planet-locked", { planet: data.planet, isLocked: true });

      socket.emit("start-quiz", { planet: data.planet, quiz: planet.quiz });

      quizTimeouts[data.planet] = setTimeout(() => {
        planet.isLocked = false;
        planet.lockedBy = null;
        io.emit("planet-locked", { planet: data.planet, isLocked: false });
        socket.emit("quiz-timeout");
      }, 15000);
    }
  });

  socket.on("submit-answer", (data) => {
    const planet = gameState.planets[data.planet];
    const player = gameState.players[socket.id];

    if (planet && player && planet.lockedBy === socket.id) {
      clearTimeout(quizTimeouts[data.planet]);

      planet.isLocked = false;
      planet.lockedBy = null;
      io.emit("planet-locked", { planet: data.planet, isLocked: false });

      if (data.answer === planet.quiz.correctAnswer) {
        socket.emit("quiz-result", { correct: true });

        planet.claimedBy = socket.id;
        gameState.scores[socket.id] += planet.points;

        io.emit("planet-update", {
          planet: data.planet,
          claimedBy: socket.id,
          playerName: player.name,
          playerColor: player.color,
          points: planet.points
        });

        io.emit("score-update", gameState.scores);
        checkGameOver();
      } else {
        socket.emit("quiz-result", { correct: false, fact: planet.fact });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (gameState.players[socket.id]) {
      for (const planetName in gameState.planets) {
        const planet = gameState.planets[planetName];
        if (planet.lockedBy === socket.id) {
          planet.isLocked = false;
          planet.lockedBy = null;
          io.emit("planet-locked", { planet: planetName, isLocked: false });
        }
      }
      delete gameState.players[socket.id];
      delete gameState.scores[socket.id];
      io.emit("player-status-update", gameState.players);
    }
  });
});

function checkGameOver() {
  const allPlanets = Object.values(gameState.planets);
  if (allPlanets.every(p => p.claimedBy !== null)) {
    gameState.status = 'finished';

    const planetCounts = {};
    for (const player in gameState.players) {
        planetCounts[player] = 0;
    }

    for (const planet of allPlanets) {
        if(planetCounts.hasOwnProperty(planet.claimedBy)) {
            planetCounts[planet.claimedBy]++;
        }
    }

    let maxPlanets = 0;
    for(const count of Object.values(planetCounts)) {
        if (count > maxPlanets) {
            maxPlanets = count;
        }
    }

    const winnerIds = Object.keys(planetCounts).filter(id => planetCounts[id] === maxPlanets);
    const winnerNames = winnerIds.map(id => gameState.players[id] ? gameState.players[id].name : 'A disconnected player');

    io.emit("game-over", {
      winners: winnerNames,
      scores: gameState.scores
    });

    setTimeout(resetGame, 10000);
  }
}

function resetGame() {
  const connectedPlayers = {};
  io.sockets.sockets.forEach(socket => {
    connectedPlayers[socket.id] = {
        name: `Explorer-${Math.floor(Math.random() * 1000)}`,
        color: getRandomColor(),
        isReady: false
    };
  });

  gameState = createInitialGameState();
  gameState.players = connectedPlayers;

  for (const id in connectedPlayers) {
    gameState.scores[id] = 0;
  }

  io.emit("game-reset", gameState);
}

function getRandomColor() {
  const colors = [
    '#FF5252', '#FF4081', '#E040FB', '#7C4DFF',
    '#536DFE', '#448AFF', '#40C4FF', '#18FFFF',
    '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});