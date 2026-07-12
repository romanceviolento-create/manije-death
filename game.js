import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// --- CONFIGURACIÓN BÁSICA ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02); // Niebla mucho más suave para ver lejos
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1, 5); 

const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // LUZ FIJA AL MÁXIMO
scene.add(ambientLight);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(0.3); 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const fireLight = new THREE.PointLight(0xffaa00, 15, 8); 
fireLight.position.set(0, 1.5, 0);
scene.add(fireLight);

const GRID_SIZE = 1;
let canMove = true, canTurn = true;
let gameState = 'idle', currentWave = 0, enemies = [];
const spawnPoints = [{x: -10, z: -10}, {x: 10, z: -10}, {x: -10, z: 10}, {x: 10, z: 10}];

// --- VARIABLES TÁCTILES ---
let touchMove = {x: 0, y: 0}, touchLook = {x: 0, y: 0};
let isTouchingMove = false, isTouchingLook = false;

// --- BRÚJULA ---
const compass = document.createElement('div');
compass.style.position = 'absolute'; compass.style.top = '10px'; compass.style.left = '50%';
compass.style.color = 'white'; compass.style.fontSize = '20px';
document.body.appendChild(compass);

function updateCompass() {
    const angle = (camera.rotation.y * (180 / Math.PI)) % 360;
    let dir = (angle > -45 && angle <= 45) ? "NORTE" : (angle > 45 && angle <= 135) ? "OESTE" : (angle > 135 || angle <= -135) ? "SUR" : "ESTE";
    compass.innerText = dir;
}

function createBillboard(tex, scale = 2) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(scale, scale, 1);
    return sprite;
}

// --- CARGA DE TEXTURAS ---
const loader = new THREE.TextureLoader();
const texPasto = loader.load('assets/bmp/0006_pasto.png');
const texArpia = loader.load('assets/bmp/0365_arpia.png');
const texFogata = loader.load('assets/bmp/0132_fgoblin.png');
const texArbol = loader.load('assets/bmp/0144_arbol4.png');

[texPasto, texArpia, texFogata, texArbol].forEach(t => { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; });
texPasto.wrapS = texPasto.wrapT = THREE.RepeatWrapping;
texPasto.repeat.set(2, 2); 

const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 15, 15), new THREE.MeshLambertMaterial({ map: texPasto }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const campfireSprite = createBillboard(texFogata, 2);
campfireSprite.position.set(0, 1, 0);
scene.add(campfireSprite);

// --- SEGUNDO TERRENO (Lo creamos de una vez) ---
const ground2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 15, 15), new THREE.MeshLambertMaterial({ color: 0x443322 }));
ground2.rotation.x = -Math.PI / 2;
ground2.position.set(0, 0, 30);
scene.add(ground2);

// Casa simple roja frente a ti
const houseGeo = new THREE.BoxGeometry(4, 3, 4);
const houseMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
const house = new THREE.Mesh(houseGeo, houseMat);
house.position.set(0, 1.5, 30);
scene.add(house);

// --- LÓGICA DE JUEGO ---
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function initJoystick(id, callback) {
    const area = document.getElementById(id);
    if (!area) return;
    const knob = area.querySelector('.joystick-knob');
    area.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = area.getBoundingClientRect();
        const touch = e.touches[0];
        let x = (touch.clientX - rect.left) / rect.width * 2 - 1;
        let y = (touch.clientY - rect.top) / rect.height * 2 - 1;
        const dist = Math.sqrt(x*x + y*y);
        if (dist > 1) { x /= dist; y /= dist; }
        knob.style.transform = `translate(-50%, -50%) translate(${x * 30}px, ${y * 30}px)`;
        callback(x, y, true);
    }, {passive: false});
    area.addEventListener('touchend', (e) => {
        e.preventDefault();
        knob.style.transform = `translate(-50%, -50%)`;
        callback(0, 0, false);
    }, {passive: false});
}

initJoystick('moveJoystick', (x, y, active) => { touchMove = {x, y}; isTouchingMove = active; });
initJoystick('lookJoystick', (x, y, active) => { touchLook = {x, y}; isTouchingLook = active; });

function animate() {
    requestAnimationFrame(animate);
    
    updateCompass();
    fireLight.intensity = 15 + (Math.random() - 0.5) * 5;

    if (canMove) {
        let moved = false;
        if (keys['KeyW'] || (isTouchingMove && touchMove.y < -0.3)) { camera.translateZ(-GRID_SIZE); moved = true; }
        if (keys['KeyS'] || (isTouchingMove && touchMove.y > 0.3)) { camera.translateZ(GRID_SIZE); moved = true; }
        if (keys['KeyA'] || (isTouchingMove && touchMove.x < -0.3)) { camera.translateX(-GRID_SIZE); moved = true; }
        if (keys['KeyD'] || (isTouchingMove && touchMove.x > 0.3)) { camera.translateX(GRID_SIZE); moved = true; }
        if (moved) { canMove = false; setTimeout(() => canMove = true, 250); }
    }

    if (isTouchingLook && canTurn) {
        if (touchLook.x > 0.5) { camera.rotation.y -= Math.PI / 2; canTurn = false; setTimeout(() => canTurn = true, 500); }
        else if (touchLook.x < -0.5) { camera.rotation.y += Math.PI / 2; canTurn = false; setTimeout(() => canTurn = true, 500); }
    }

    renderer.render(scene, camera);
}
animate();
