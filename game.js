import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// --- CONFIGURACIÓN BÁSICA ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.18); 
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- ESCENARIO ---
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30, 15, 15), new THREE.MeshBasicMaterial({ color: 0x222222, wireframe: true }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const fireLight = new THREE.PointLight(0xffaa00, 20, 10);
fireLight.position.set(0, 1, 0);
scene.add(fireLight);

// Árboles
function createTree() {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5), new THREE.MeshBasicMaterial({color: 0x552200, wireframe: true}));
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 6), new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }));
    foliage.position.y = 1.5;
    tree.add(trunk, foliage);
    return tree;
}
for (let i = 0; i < 20; i++) {
    const tree = createTree();
    let x = (Math.random() - 0.5) * 28;
    let z = (Math.random() - 0.5) * 28;
    if (Math.abs(x) > 4 || Math.abs(z) > 4) {
        tree.position.set(x, 0.75, z);
        scene.add(tree);
    }
}

// Puntos de Spawn
const spawnPoints = [];
[{x: -10, z: -10}, {x: 10, z: -10}, {x: -10, z: 10}, {x: 10, z: 10}].forEach(pos => {
    const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.6 }));
    sp.position.set(pos.x, 1, pos.z);
    scene.add(sp);
    spawnPoints.push(sp);
});

// --- LÓGICA DE JUEGO ---
const keys = {};
let touchMove = { x: 0, y: 0 };
let touchLook = { x: 0, y: 0 };
let isTouchingMove = false;
let isTouchingLook = false;

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Joysticks
function initJoystick(id, callback) {
    const area = document.getElementById(id);
    const knob = area.querySelector('.joystick-knob');
    area.addEventListener('touchmove', (e) => {
        const rect = area.getBoundingClientRect();
        const touch = e.touches[0];
        let x = (touch.clientX - rect.left) / rect.width * 2 - 1;
        let y = (touch.clientY - rect.top) / rect.height * 2 - 1;
        knob.style.transform = `translate(-50%, -50%) translate(${x * 30}px, ${y * 30}px)`;
        callback(x, y, true);
    }, {passive: false});
    area.addEventListener('touchend', () => {
        knob.style.transform = `translate(-50%, -50%)`;
        callback(0, 0, false);
    });
}
initJoystick('moveJoystick', (x, y, active) => { touchMove = {x, y}; isTouchingMove = active; });
initJoystick('lookJoystick', (x, y, active) => { touchLook = {x, y}; isTouchingLook = active; });

let gameState = 'idle';
let currentWave = 0;
let enemies = [];
camera.position.set(0, 0.5, 8);

function startNextWave() {
    currentWave++;
    gameState = 'wave_active';
    for (let i = 0; i < currentWave * 3; i++) {
        const enemy = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }));
        const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        enemy.position.set(sp.position.x, 0.25, sp.position.z);
        enemy.userData = { speed: 0.02 + Math.random() * 0.02 };
        scene.add(enemy);
        enemies.push(enemy);
    }
}

window.addEventListener('mousedown', () => { if(gameState === 'idle') startNextWave(); });

// --- ANIMACIÓN ---
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    
    // Movimiento
    if (keys['KeyW']) camera.translateZ(-0.1);
    if (keys['KeyS']) camera.translateZ(0.1);
    if (keys['KeyA']) camera.translateX(-0.1);
    if (keys['KeyD']) camera.translateX(0.1);
    if (keys['KeyQ']) camera.rotation.y += 0.04;
    if (keys['KeyE']) camera.rotation.y -= 0.04;

    if (isTouchingMove) {
        camera.translateX(touchMove.x * 0.1);
        camera.translateZ(touchMove.y * 0.1);
    }
    if (isTouchingLook) {
        camera.rotation.y -= touchLook.x * 0.05;
    }

    // Enemigos
    enemies.forEach((en, i) => {
        en.position.x += (0 - en.position.x) * en.userData.speed;
        en.position.z += (0 - en.position.z) * en.userData.speed;
        if(en.position.distanceTo(new THREE.Vector3(0,0,0)) < 1.5) {
            scene.remove(en);
            enemies.splice(i, 1);
        }
    });

    if (enemies.length === 0 && gameState === 'wave_active') gameState = 'idle';
    
    renderer.render(scene, camera);
}
animate();