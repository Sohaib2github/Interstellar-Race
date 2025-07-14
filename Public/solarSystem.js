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
const sunGeometry = new THREE.SphereGeometry(2.5, 64, 64);
const sunTexture = new THREE.TextureLoader().load('planets/Sun.jpg');

const sunMaterial = new THREE.MeshStandardMaterial({
  map: sunTexture,
  emissive: 0xFF4500,
  emissiveMap: sunTexture,
  emissiveIntensity: 1.5,
  roughness: 0.4,
  metalness: 0.6
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);
const pointLight = new THREE.PointLight(0xFFFFFF, 1.5, 300);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);


// Planet data
const AU = 4;
const planetOrbitAU = {
  Mercury: 1.00,
  Venus:   2.00,
  Earth:   3.00,
  Mars:    4.00,
  Jupiter: 5.00,
  Saturn:  6.00,
  Uranus:  7.00,
  Neptune: 8.00
};

const planetSizes = {
  Mercury: 0.4,
  Venus:   0.9,
  Earth:   1.0,
  Mars:    0.8,
  Jupiter: 1.5,
  Saturn:  1.2,
  Uranus:  1.1,
  Neptune: 1.0
};

const planetTextures = {
  Mercury: 'planets/Mercury_2k.png',
  Venus:   'planets/Venus_2k.png',
  Earth:   'planets/Earth_4k.png',
  Mars:    'planets/Mars_2k.png',
  Jupiter: 'planets/Jupiter_2k.png',
  Saturn:  'planets/Saturn_2k.png',
  Uranus:  'planets/Uranus_2k.png',
  Neptune: 'planets/Neptune_2k.png'
};

const planets = {};
const claimRings = {};
const lockRings = {};
const textureLoader = new THREE.TextureLoader();

for (const name in planetOrbitAU) {
  const orbitRadius = planetOrbitAU[name] * AU;
  const angle = Math.random() * Math.PI * 2;

  const x = Math.cos(angle) * orbitRadius;
  const z = Math.sin(angle) * orbitRadius;

  const texture = textureLoader.load(planetTextures[name]);
  const geometry = new THREE.SphereGeometry(planetSizes[name], 32, 32);
  const material = new THREE.MeshPhongMaterial({ map: texture });
  const planet = new THREE.Mesh(geometry, material);
  planet.position.set(x, 0, z);
  planet.name = name;
  scene.add(planet);
  planets[name] = planet;

  // Add orbit ring
  const ringGeometry = new THREE.RingGeometry(orbitRadius - 0.02, orbitRadius + 0.02, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
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
    const radius = planetSizes[planetName];
    const ringGeometry = new THREE.RingGeometry(radius * 1.2, radius * 1.3, 32);
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
        const radius = planetSizes[planetName];
        const ringGeometry = new THREE.RingGeometry(radius * 1.4, radius * 1.5, 32);
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