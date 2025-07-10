// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000033);
document.body.insertBefore(renderer.domElement, document.body.firstChild);

// Lighting
const ambientLight = new THREE.AmbientLight(0x666666); 
scene.add(ambientLight);

// Background Sphere
const bgTexture = new THREE.TextureLoader().load('planets/Purple_Nebula.png');
const bgGeometry = new THREE.SphereGeometry(500, 60, 40);
bgGeometry.scale(-1, 1, 1);
const bgMaterial = new THREE.MeshBasicMaterial({ map: bgTexture });
const background = new THREE.Mesh(bgGeometry, bgMaterial);
scene.add(background);

// Camera position
camera.position.z = 20;
camera.position.y = 5;

// Orbit Controls for camera rotation
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 100;

// Add a visible Sun at the center
const sunGeometry = new THREE.SphereGeometry(2.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);
const pointLight = new THREE.PointLight(0xFFFFFF, 1.5, 200);
scene.add(pointLight);


// Planet data (Original grid layout)
const planetsData = {
  Mercury: { radius: 0.4, texture: 'planets/Mercury_2k.png', position: { x: 13.5, y: 0, z: 0 } },
  Venus:   { radius: 0.9, texture: 'planets/Venus_2k.png',   position: { x: 5.8, y: 0, z: 5.8 } },
  Earth:   { radius: 1,   texture: 'planets/Earth_4k.png',   position: { x: 0, y: 0, z: 17.1 } },
  Mars:    { radius: 0.8, texture: 'planets/Mars_2k.png',    position: { x: -4.6, y: 0, z: 4.6 } },
  Jupiter: { radius: 1.5, texture: 'planets/Jupiter_2k.png', position: { x: -15, y: 0, z: 0 } },
  Saturn:  { radius: 1.2, texture: 'planets/Saturn_2k.png',  position: { x: -8.3, y: 0, z: -8.3 } },
  Uranus:  { radius: 1.1, texture: 'planets/Uranus_2k.png',  position: { x: 0, y: 0, z: -7.7 } },
  Neptune: { radius: 1.0, texture: 'planets/Neptune_2k.png', position: { x: 11.5, y: 0, z: -11.5 } }
};


const planets = {};
const claimRings = {};
const lockRings = {};
const textureLoader = new THREE.TextureLoader();

// Create planets
for (const [name, data] of Object.entries(planetsData)) {
  const texture = textureLoader.load(data.texture);
  const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
  const material = new THREE.MeshPhongMaterial({ map: texture });
  const planet = new THREE.Mesh(geometry, material);
  planet.position.set(data.position.x, data.position.y, data.position.z);
  planet.name = name;
  scene.add(planet);
  planets[name] = planet;
}

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(Object.values(planets));
  if (intersects.length > 0) {
    const planet = intersects[0].object;
    socket.emit('request-planet-quiz', {
      planet: planet.name
    });
  }
}

window.addEventListener('click', onMouseClick, false);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  for (const planet of Object.values(planets)) {
    planet.rotation.y += 0.002;
  }
  
  controls.update();

  renderer.render(scene, camera);
}
animate();


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.updatePlanetAppearance = function(planetName, playerColor) {
  const planet = planets[planetName];
  if (planet) {
    if (claimRings[planetName]) {
        planet.remove(claimRings[planetName]);
    }
    const ringGeometry = new THREE.RingGeometry(planetsData[planetName].radius * 1.2, planetsData[planetName].radius * 1.3, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(playerColor), side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    planet.add(ring);
    claimRings[planetName] = ring;
  }
};

window.lockPlanetAppearance = function(planetName, isLocked) {
    const planet = planets[planetName];
    if(!planet) return;
    if (lockRings[planetName]) {
        planet.remove(lockRings[planetName]);
        delete lockRings[planetName];
    }
    if (isLocked) {
        const ringGeometry = new THREE.RingGeometry(planetsData[planetName].radius * 1.4, planetsData[planetName].radius * 1.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        planet.add(ring);
        lockRings[planetName] = ring;
    }
}

window.resetPlanetAppearances = function() {
  for (const planetName in claimRings) {
    if (planets[planetName] && claimRings[planetName]) {
        planets[planetName].remove(claimRings[planetName]);
    }
  }
  for (const planetName in lockRings) {
    if (planets[planetName] && lockRings[planetName]) {
        planets[planetName].remove(lockRings[planetName]);
    }
  }
};