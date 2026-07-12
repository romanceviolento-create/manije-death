import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// --- CONFIGURACIÓN BÁSICA ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.05); 
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1, 5); 

const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Luz fuerte para ver todo
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
    sprite.userData.isInteractable = true; 
    return sprite;
}

// --- CARGA DE TEXTURAS ---
const loader = new THREE.TextureLoader();
const texPasto = loader.load('assets/bmp/0006_pasto.png');
const texArbol = loader.load('assets/bmp/0144_arbol4.png');
const texFogata = loader.load('assets/bmp/0132_fgoblin.png');

[texPasto, texFogata, texArbol].forEach(t => { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; });
texPasto.wrapS = texPasto.wrapT = THREE.RepeatWrapping;
texPasto.repeat.set(2, 2); 

const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 15, 15), new THREE.MeshLambertMaterial({ map: texPasto }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

scene.add(createBillboard(texFogata, 2));

// --- ZONAS Y CASA ---
let houseGenerated = false;
function updateTerrain(zone) {
    ground.material.color.set(zone === 0 ? 0xffffff : 0x886644); // Suelo tierra color marrón
    ground.material.needsUpdate = true;
}

function generateHouseZone() {
    if (houseGenerated) return;
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const wallGeo = new THREE.PlaneGeometry(4, 3);
    for(let i=0; i<4; i++) {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(i < 2 ? (i===0?2:-2) : 0, 1.5, i > 1 ? (i===2?28:32) : 30);
        if (i < 2) wall.rotation.y = Math.PI / 2;
        scene.add(wall);
    }
    // Luz extra en la casa para que se vea bien
    const houseLight = new THREE.PointLight(0xffffff, 20, 20);
    houseLight.position.set(0, 3, 30);
    scene.add(houseLight);
    houseGenerated = true;
}

// --- LÓGICA DE JUEGO ---
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

let touchMove = {x: 0, y: 0}, touchLook = {x: 0, y: 0};
let isTouchingMove = false, isTouchingLook = false;

function initJoystick(id, callback) {
    const area = document.getElementById(id);
    if (!area) return;
    const knob = area.querySelector('.joystick-knob');
    area.addEventListener('touchmove', (e) => {
        const rect = area.getBoundingClientRect();
        const touch = e.touches[0];
        let x = (touch.clientX - rect.left) / rect.width * 2 - 1;
        let y = (touch.clientY - rect.top) / rect.height * 2 - 1;
        knob.style.transform = `translate(-50%, -50%) translate(${Math.max(-30, Math.min(30, x*30))}px, ${Math.max(-30, Math.min(30, y*30))}px)`;
        callback(x, y, true);
    }, {passive: false});
    area.addEventListener('touchend', () => { knob.style.transform = `translate(-50%, -50%)`; callback(0, 0, false); }, {passive: false});
}
initJoystick('moveJoystick', (x, y, active) => { touchMove = {x, y}; isTouchingMove = active; });
initJoystick('lookJoystick', (x, y, active) => { touchLook = {x, y}; isTouchingLook = active; });

function animate() {
    requestAnimationFrame(animate);

    const zone = camera.position.z > 10 ? 1 : 0;
    if (window.lastZone !== zone) {
        updateTerrain(zone);
        window.lastZone = zone;
        if (zone === 1) generateHouseZone();
    }

    if (canMove) {
        let moved = false;
        if (keys['KeyW'] || (isTouchingMove && touchMove.y < -0.3)) { camera.translateZ(-GRID_SIZE); moved = true; }
        if (keys['KeyS'] || (isTouchingMove && touchMove.y > 0.3)) { camera.translateZ(GRID_SIZE); moved = true; }
        if (keys['KeyA'] || (isTouchingMove && touchMove.x < -0.3)) { camera.translateX(-GRID_SIZE); moved = true; }
        if (keys['KeyD'] || (isTouchingMove && touchMove.x > 0.3)) { camera.translateX(GRID_SIZE); moved = true; }
        if (moved) { canMove = false; setTimeout(() => canMove = true, 250); }
    }

    updateCompass();
    renderer.render(scene, camera);
}
animate();
