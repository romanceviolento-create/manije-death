import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// --- CONFIGURACIÓN BÁSICA ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.18); 
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1, 5); 

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(0.3); 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const fireLight = new THREE.PointLight(0xffaa00, 15, 8); 
fireLight.position.set(0, 1.5, 0);
scene.add(fireLight);

const GRID_SIZE = 1;
let canMove = true;
let gameState = 'idle', currentWave = 0, enemies = [];
const spawnPoints = [{x: -10, z: -10}, {x: 10, z: -10}, {x: -10, z: 10}, {x: 10, z: 10}];

function createBillboard(tex, scale = 2) {
    // IMPORTANTE: SpriteMaterial es auto-iluminado (se ve en la oscuridad)
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

// Configuración de texturas
[texPasto, texArpia, texFogata, texArbol].forEach(t => { 
    t.magFilter = THREE.NearestFilter; 
    t.minFilter = THREE.NearestFilter; 
});

// --- ESCENARIO (Ahora cargado después de la textura) ---
texPasto.wrapS = texPasto.wrapT = THREE.RepeatWrapping;
texPasto.repeat.set(2, 2); // Menos repeticiones = píxeles gigantes

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30, 15, 15), 
    new THREE.MeshLambertMaterial({ map: texPasto }) 
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const campfireSprite = createBillboard(texFogata, 2);
campfireSprite.position.set(0, 1, 0);
scene.add(campfireSprite);

// Árboles
for (let i = 0; i < 20; i++) {
    const tree = createBillboard(texArbol, 15); // 6 es el tamaño base
    let x = (Math.random() - 0.5) * 40; // Expandimos el mapa a 40
    let z = (Math.random() - 0.5) * 40;
    
    // Si están lejos del centro, los ponemos
    if (Math.abs(x) > 5 || Math.abs(z) > 5) {
        tree.position.set(x, 7, z); // Altura 2.5
        scene.add(tree);
    }
}
// --- LÓGICA DE JUEGO ---
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function startNextWave() {
    currentWave++;
    gameState = 'wave_active';
    for (let i = 0; i < currentWave * 3; i++) {
        const enemy = createBillboard(texArpia, 4);
        const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        enemy.position.set(sp.x, 1.5, sp.z); 
        enemy.userData = { lastMove: 0 };
        scene.add(enemy);
        enemies.push(enemy);
    }
}

window.addEventListener('mousedown', () => { if(gameState === 'idle') startNextWave(); });
function initJoystick(id, callback) {
    const area = document.getElementById(id);
    if (!area) return;
    const knob = area.querySelector('.joystick-knob');

    // Usamos {passive: false} para poder usar e.preventDefault()
    area.addEventListener('touchmove', (e) => {
        e.preventDefault(); // IMPORTANTE: Esto evita que la pantalla haga scroll
        const rect = area.getBoundingClientRect();
        const touch = e.touches[0]; // Capturamos el dedo
        
        let x = (touch.clientX - rect.left) / rect.width * 2 - 1;
        let y = (touch.clientY - rect.top) / rect.height * 2 - 1;
        
        // Limitar movimiento dentro del círculo
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

function animate() {
    requestAnimationFrame(animate);

    if (canMove) {
        let moved = false;
        if (keys['KeyW']) { camera.translateZ(-GRID_SIZE); moved = true; }
        if (keys['KeyS']) { camera.translateZ(GRID_SIZE); moved = true; }
        if (keys['KeyA']) { camera.translateX(-GRID_SIZE); moved = true; }
        if (keys['KeyD']) { camera.translateX(GRID_SIZE); moved = true; }
        if (keys['KeyQ']) { camera.rotation.y += Math.PI / 4; moved = true; }
        if (keys['KeyE']) { camera.rotation.y -= Math.PI / 4; moved = true; }

        if (moved) {
            canMove = false;
            setTimeout(() => canMove = true, 250);
        }
    }

    enemies.forEach((en, i) => {
        en.userData.lastMove++;
        if (en.userData.lastMove > 60) {
            en.position.x += Math.sign(0 - en.position.x) * GRID_SIZE;
            en.position.z += Math.sign(0 - en.position.z) * GRID_SIZE;
            en.userData.lastMove = 0;
        }
        if(en.position.distanceTo(new THREE.Vector3(0,1,0)) < 1.5) {
            scene.remove(en);
            enemies.splice(i, 1);
        }
    });

    if (enemies.length === 0 && gameState === 'wave_active') gameState = 'idle';
    renderer.render(scene, camera);
}
animate();
