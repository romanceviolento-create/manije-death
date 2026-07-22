/**
 * --- MÓDULO 1: ESTADO GLOBAL ---
 */
const heroe = { x: 135, y: 129 };
let diccionario = {};
let texturasCache = {};
let mapaBytes = new Uint8Array(2000000);
let mapa1Bytes = new Uint8Array(2000000);

// --- 0. INITS ---
const RETRO_WIDTH = 320;
const RETRO_HEIGHT = 180;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a050f, 0.05);
scene.background = new THREE.Color(0x0a050f);

const camera = new THREE.PerspectiveCamera(70, RETRO_WIDTH / RETRO_HEIGHT, 0.1, 100);
camera.position.set(heroe.x, 1.6, heroe.y);

const canvas = document.createElement('canvas');
canvas.id = "game-canvas";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.display = "block";
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.imageRendering = "pixelated";

const container = document.getElementById('game-container');
if (container) {
    container.appendChild(canvas);
} else {
    document.body.appendChild(canvas);
}

const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true 
});

renderer.setSize(RETRO_WIDTH, RETRO_HEIGHT, false); 
renderer.setPixelRatio(window.devicePixelRatio);

// --- 1. ILUMINACIÓN ---
const ambientLight = new THREE.AmbientLight(0x1a1525, 1.2);
scene.add(ambientLight);

const torchLight = new THREE.PointLight(0xffaa44, 3, 15);
torchLight.position.set(0, 3, -2);
scene.add(torchLight);

// --- 2. MATERIALES BASE ---
const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x3d3547 });
const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x221c2b });
const darkIronMaterial = new THREE.MeshLambertMaterial({ color: 0x1c1822 });
const loader = new THREE.TextureLoader();
const orientaciones = {'6': 'HORIZONTAL', '930': 'VERTICAL', '947': 'VERTICAL'};

// --- 3. SISTEMA DE TERRENO DINÁMICO ---
const grupoTerreno = new THREE.Group();
const grupoRecursos = new THREE.Group();
scene.add(grupoTerreno);
scene.add(grupoRecursos);

const cubes = [];
const sprites = [];
const RANGE = 8;
const size = (RANGE * 2 + 1) * (RANGE * 2 + 1);

for (let i = 0; i < size; i++) {
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), floorMaterial);
    tile.rotation.x = -Math.PI / 2;
    grupoTerreno.add(tile);
    cubes.push(tile);

    const sprite = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1), 
        new THREE.MeshStandardMaterial({
            transparent: true, 
            alphaTest: 0.5, 
            side: THREE.DoubleSide,
            roughness: 0.9
        })
    );
    grupoRecursos.add(sprite);
    sprites.push(sprite);
}

function getAltura(idx) {
    if (idx < 0 || idx >= mapa1Bytes.length) return 0;
    const val = mapa1Bytes[idx];
    const mapaAlturas = { 3: -5, 11: -2, 6: 0, 7: 3, 21: 8 };
    return (mapaAlturas[val] !== undefined ? mapaAlturas[val] : 0) * 0.5;
}

function actualizarTerreno() {
    let i = 0;
    for(let yy = heroe.y - RANGE; yy <= heroe.y + RANGE; yy++) {
        for(let xx = heroe.x - RANGE; xx <= heroe.x + RANGE; xx++) {
            if (xx >= 0 && xx < 1000 && yy >= 0 && yy < 1000) {
                const idx = (yy * 1000) + xx + 1079;
                const altura = getAltura(idx);
                
                cubes[i].visible = true;
                cubes[i].position.set(xx, altura, yy);
                
                const entId = mapaBytes[idx];
                if (entId > 0 && diccionario[entId]) {
                    sprites[i].visible = true;
                    const url = 'assets/bmp/' + diccionario[entId];
                    
                    if (!texturasCache[url]) {
                        texturasCache[url] = loader.load(url, (tex) => {
                            tex.minFilter = THREE.NearestFilter;
                            tex.magFilter = THREE.NearestFilter;
                            tex.generateMipmaps = false;
                        }, undefined, () => {});
                    }

                    sprites[i].material.map = texturasCache[url];
                    sprites[i].material.needsUpdate = true;

                    const modo = orientaciones[entId] || 'VERTICAL';
                    sprites[i].rotation.set(modo === 'HORIZONTAL' ? -Math.PI / 2 : 0, 0, 0);
                    sprites[i].position.set(xx, altura + (modo === 'HORIZONTAL' ? 0.01 : 0.5), yy);
                } else {
                    sprites[i].visible = false;
                    sprites[i].material.map = null;
                }
            } else {
                cubes[i].visible = false;
                sprites[i].visible = false;
                sprites[i].material.map = null;
            }
            i++;
        }
    }
}

// --- 4. RIG DE ARMAS (Espada y Escudo) ---
const weaponRig = new THREE.Group();
scene.add(weaponRig);

const swordGroup = new THREE.Group();
swordGroup.position.set(0.35, -0.3, -0.6);
swordGroup.rotation.set(0.2, -0.4, -0.2);

const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.015), wallMaterial);
blade.position.y = 0.3;
swordGroup.add(blade);

const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03), darkIronMaterial);
guard.position.y = 0.015;
swordGroup.add(guard);

const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15, 4), darkIronMaterial);
hilt.position.y = -0.075;
swordGroup.add(hilt);
weaponRig.add(swordGroup);

const shieldGroup = new THREE.Group();
shieldGroup.position.set(-0.35, -0.25, -0.5);
shieldGroup.rotation.set(0.1, 0.4, 0.1);

const shieldPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.02), wallMaterial);
shieldGroup.add(shieldPlate);

const shieldBoss = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.03), darkIronMaterial);
shieldGroup.add(shieldBoss);
weaponRig.add(shieldGroup);

// --- 5. CONTROLES Y MOVIMIENTO ---
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let yaw = 0;
let pitch = 0;
let targetYaw = 0; 
const ROTATION_SPEED = 10;
const MOVE_SPEED = 1.0;

let isTouching = false;
let lastTouchX = 0, lastTouchY = 0;

let shieldActive = false;
let currentShieldDefense = 0;
let bobbingX = 0, bobbingY = 0;

function setShieldState(active) {
    shieldActive = active;
    const shieldOverlay = document.getElementById('shield-overlay');
    const btn = document.getElementById('btn-escudo');

    if (shieldActive) {
        if (shieldOverlay) shieldOverlay.classList.add('shield-active');
        if (btn) { btn.style.backgroundColor = "#ffaa44"; btn.style.color = "#16121e"; }
    } else {
        if (shieldOverlay) shieldOverlay.classList.remove('shield-active');
        if (btn) { btn.style.backgroundColor = "#3f285c"; btn.style.color = "#ffaa44"; }
    }
}

// Eventos de teclado (WASD + Q y E para giros fijos)
window.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveForward = true; break;
        case 'KeyS': case 'ArrowDown': moveBackward = true; break;
        case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
        case 'KeyD': case 'ArrowRight': moveRight = true; break;
        case 'KeyQ': targetYaw += Math.PI / 2; break;
        case 'KeyE': targetYaw -= Math.PI / 2; break;
    }
});

window.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': case 'ArrowUp': moveForward = false; break;
        case 'KeyS': case 'ArrowDown': moveBackward = false; break;
        case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
        case 'KeyD': case 'ArrowRight': moveRight = false; break;
    }
});

canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
        const sensitivity = 0.002;
        yaw -= e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;

        const maxPitch = Math.PI / 2 - 0.05;
        pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
        targetYaw = yaw; // Sincroniza el giro del ratón con el target
    }
});

// Controles Táctiles
window.addEventListener('touchstart', (e) => {
    const target = e.target;
    if (target.classList.contains('interactive') || target.closest('.interactive')) return;
    isTouching = true;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (isTouching) {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;
        yaw -= deltaX * 0.005; 
        pitch -= deltaY * 0.005;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        targetYaw = yaw;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
}, { passive: false });

window.addEventListener('touchend', () => { isTouching = false; });

document.addEventListener('contextmenu', (e) => {
    if (document.pointerLockElement === canvas) e.preventDefault();
});

document.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement !== canvas) return;
    if (e.button === 2) setShieldState(true);
});

document.addEventListener('mouseup', (e) => {
    if (document.pointerLockElement !== canvas) return;
    if (e.button === 2) setShieldState(false);
});

// HUD / Botones Opcionales
const btnEscudoEl = document.getElementById('btn-escudo');
const btnItemsEl = document.getElementById('btn-items');
const healOverlayEl = document.getElementById('heal-overlay');

if (btnEscudoEl) {
    btnEscudoEl.addEventListener('click', () => setShieldState(!shieldActive));
    btnEscudoEl.addEventListener('touchstart', (e) => { e.preventDefault(); setShieldState(true); }, { passive: false });
    btnEscudoEl.addEventListener('touchend', (e) => { e.preventDefault(); setShieldState(false); }, { passive: false });
}

if (btnItemsEl && healOverlayEl) {
    btnItemsEl.addEventListener('click', () => {
        healOverlayEl.classList.remove('flash-effect');
        void healOverlayEl.offsetWidth; 
        healOverlayEl.classList.add('flash-effect');
    });
}

// Carga asincrónica de mapas
async function cargarMapas() {
    try {
        const [b1, b2, txt] = await Promise.all([
            fetch('assets/mapas/mapa1.bmp').then(r => r.ok ? r.arrayBuffer() : new ArrayBuffer(0)),
            fetch('assets/mapas/mapa.bmp').then(r => r.ok ? r.arrayBuffer() : new ArrayBuffer(0)),
            fetch('assets/bmp/recursosi.txt').then(r => r.ok ? r.text() : "")
        ]);
        
        if (b1.byteLength > 0) mapa1Bytes = new Uint8Array(b1);
        if (b2.byteLength > 0) mapaBytes = new Uint8Array(b2);
        
        if (txt) {
            txt.split('\n').forEach(linea => {
                const p = linea.split(',');
                if (p.length >= 5) diccionario[parseInt(p[0].trim())] = p[4].trim();
            });
        }
    } catch (e) {
        console.warn("Aviso cargando archivos:", e);
    }
    actualizarTerreno();
}

cargarMapas();

// --- 6. BUCLE DE RENDERIZACIÓN ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Interpolación suave del giro (Yaw con Q/E o Mouse)
    yaw += (targetYaw - yaw) * ROTATION_SPEED * delta;
    pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    
    camera.rotation.set(pitch, yaw, 0);
    camera.order = "YXZ";

    // Movimiento fluido con inercia (Quake-like)
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * MOVE_SPEED * 10 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * MOVE_SPEED * 10 * delta;

    camera.position.x += (velocity.x * Math.cos(yaw) + velocity.z * Math.sin(yaw)) * delta;
    camera.position.z += (velocity.z * Math.cos(yaw) - velocity.x * Math.sin(yaw)) * delta;
    camera.position.y = 0.4; //altura de camara

    // Actualizar coordenadas del héroe en base a la cámara
    heroe.x = Math.floor(camera.position.x);
    heroe.y = Math.floor(camera.position.z);
    actualizarTerreno();

    // Luz de antorcha dinámica vinculada a la cámara
    torchLight.intensity = 2.5 + Math.sin(elapsedTime * 10) * 0.4 + Math.random() * 0.1;
    torchLight.position.copy(camera.position);

    // Sincronizar rig de armas con la cámara
    weaponRig.position.copy(camera.position);
    weaponRig.rotation.copy(camera.rotation);

    // Efecto de movimiento (Head Bobbing) al caminar
    const isMoving = (moveForward || moveBackward || moveLeft || moveRight);
    if (isMoving) {
        bobbingX = Math.sin(elapsedTime * 12) * 0.015;
        bobbingY = Math.cos(elapsedTime * 24) * 0.01;
    } else {
        bobbingX = 0;
        bobbingY = 0;
    }

    // Animación de Escudo
    const targetDefense = shieldActive ? 1.0 : 0.0;
    currentShieldDefense += (targetDefense - currentShieldDefense) * 12 * delta;

    shieldGroup.position.x = THREE.MathUtils.lerp(-0.35, -0.05, currentShieldDefense) + bobbingX;
    shieldGroup.position.y = THREE.MathUtils.lerp(-0.25, -0.05, currentShieldDefense) + bobbingY;
    shieldGroup.position.z = THREE.MathUtils.lerp(-0.5, -0.35, currentShieldDefense);
    shieldGroup.rotation.y = THREE.MathUtils.lerp(0.4, 0.9, currentShieldDefense);
    shieldGroup.rotation.x = THREE.MathUtils.lerp(0.1, 0.2, currentShieldDefense);

    // Espada estática con leve balanceo al caminar
    swordGroup.position.set(0.35 + bobbingX, -0.3 + bobbingY, -0.6);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = RETRO_WIDTH / RETRO_HEIGHT;
    camera.updateProjectionMatrix();
});

animate();