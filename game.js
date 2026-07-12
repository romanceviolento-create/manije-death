import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// --- CONFIGURACIÓN BÁSICA ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.18); 
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1, 5); 

const ambientLight = new THREE.AmbientLight(0x404040, 1); 
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
    let dir = "";
    if (angle > -45 && angle <= 45) dir = "NORTE";
    else if (angle > 45 && angle <= 135) dir = "OESTE";
    else if (angle > 135 || angle <= -135) dir = "SUR";
    else dir = "ESTE";
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

for (let i = 0; i < 20; i++) {
    const tree = createBillboard(texArbol, 15);
    let x = (Math.random() - 0.5) * 40; let z = (Math.random() - 0.5) * 40;
    if (Math.abs(x) > 5 || Math.abs(z) > 5) { tree.position.set(x, 7, z); scene.add(tree); }
}

// --- ZONAS Y CASA ---
let houseGenerated = false;
function updateTerrain(zone) {
    if (zone === 0) {
        ground.material.map = texPasto;
        ground.material.color.set(0xffffff);
    } else {
        ground.material.map = null;
        ground.material.color.set(0x443322); // Suelo de tierra
    }
    ground.material.needsUpdate = true;
}

function generateHouseZone() {
    if (houseGenerated) return;
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x888888, side: THREE.DoubleSide });
    const wallGeo = new THREE.PlaneGeometry(4, 3);
    for(let i=0; i<4; i++) {
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(i < 2 ? (i===0?2:-2) : 0, 1.5, i > 1 ? (i===2?28:32) : 30);
        if (i < 2) wall.rotation.y = Math.PI / 2;
        scene.add(wall);
    }
    houseGenerated = true;
}

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

    // Sistema de Zonas
    const zone = camera.position.z > 15 ? 1 : 0;
    if (window.lastZone !== zone) {
        updateTerrain(zone);
        window.lastZone = zone;
        if (zone === 1) generateHouseZone();
    }

    ambientLight.intensity = 1.0; 
    fireLight.intensity = 15 + (Math.random() - 0.5) * 5;
    scene.children.forEach(obj => { if(obj.userData.isInteractable) obj.visible = obj.position.distanceTo(camera.position) < 25; });
    
    updateCompass();

    if (canMove) {
        let moved = false;
        if (keys['KeyW'] || (isTouchingMove && touchMove.y < -0.3)) { camera.translateZ(-GRID_SIZE); moved = true; }
        if (keys['KeyS'] || (isTouchingMove && touchMove.y > 0.3)) { camera.translateZ(GRID_SIZE); moved = true; }
        if (keys['KeyA'] || (isTouchingMove && touchMove.x < -0.3)) { camera.translateX(-GRID_SIZE); moved = true; }
        if (keys['KeyD'] || (isTouchingMove && touchMove.x > 0.3)) { camera.translateX(GRID_SIZE); moved = true; }
        if (keys['KeyQ']) { camera.rotation.y += Math.PI / 4; moved = true; }
        if (keys['KeyE']) { camera.rotation.y -= Math.PI / 4; moved = true; }
        if (moved) { canMove = false; setTimeout(() => canMove = true, 250); }
    }

    if (isTouchingLook && canTurn) {
        if (touchLook.x > 0.5) { camera.rotation.y -= Math.PI / 2; canTurn = false; setTimeout(() => canTurn = true, 500); }
        else if (touchLook.x < -0.5) { camera.rotation.y += Math.PI / 2; canTurn = false; setTimeout(() => canTurn = true, 500); }
    }

    enemies.forEach((en, i) => {
        en.userData.lastMove++;
        if (en.userData.lastMove > 60) {
            en.position.x += Math.sign(0 - en.position.x) * GRID_SIZE;
            en.position.z += Math.sign(0 - en.position.z) * GRID_SIZE;
            en.userData.lastMove = 0;
        }
        if(en.position.distanceTo(new THREE.Vector3(0,1,0)) < 1.5) { scene.remove(en); enemies.splice(i, 1); }
    });

    renderer.render(scene, camera);
}
animate();
