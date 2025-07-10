// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000033); // Dark blue space background
document.body.insertBefore(renderer.domElement, document.body.firstChild);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// Camera position
camera.position.z = 20;
camera.position.y = 5;

// Planets data
const planetsData = {
  Earth: { radius: 1, texture: '../Planets/Earth_4k.png', position: { x: 5, y: 0, z: 0 } },
  Mars: { radius: 0.8, texture: '../Planets/Mars_2k.png', position: { x: -5, y: 0, z: 0 } },
  Jupiter: { radius: 1.5, texture: '../Planets/Jupiter_2k.png', position: { x: 0, y: 0, z: 8 } },
  Venus: { radius: 0.9, texture: '../Planets/Venus_2k.png', position: { x: 0, y: 0, z: -8 } }
};

const planets = {};
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
    socket.emit('planet-claimed', {
      planet: planet.name
    });
  }
}

window.addEventListener('click', onMouseClick, false);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Rotate planets
  for (const [name, planet] of Object.entries(planets)) {
    planet.rotation.y += 0.005;
  }
  
  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Functions to be called from client.js
window.updatePlanetAppearance = function(planetName, claimedBy, playerColor) {
  const planet = planets[planetName];
  if (planet) {
    // Add a colored ring around claimed planet
    if (planet.children.length > 0) {
      scene.remove(planet.children[0]);
    }
    
    const ringGeometry = new THREE.RingGeometry(planetsData[planetName].radius * 1.2, planetsData[planetName].radius * 1.3, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(playerColor),
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    planet.add(ring);
  }
};

window.resetPlanets = function() {
  for (const [name, planet] of Object.entries(planets)) {
    if (planet.children.length > 0) {
      scene.remove(planet.children[0]);
    }
  }
};