/**
 * --- MÓDULO: Aetricia Engine - Mapas, Terreno y Ciclo Día/Noche ---
 */
class AetriciaMap {
    constructor() {
        this.a = new Int16Array(1000 * 1000);   // Terreno y objetos (Matriz 'a')
        this.al = new Int16Array(1000 * 1000);  // Alturas y relieve (Matriz 'al')
        this.ae = new Int32Array(1000 * 1000);  // Entidades e ítems (Matriz 'ae')
        this.mapaActualID = "1";
        this.norte = "0";
        this.sur = "0";
        this.este = "0";
        this.oeste = "0";
    }

    async cargarMapa(mapID) {
        this.mapaActualID = mapID.toString();
        console.log(`Iniciando carga del mapa: ${this.mapaActualID}`);

        try {
            await this.bmp2mapa(this.mapaActualID, 'terreno');
            await this.bmp2mapa(this.mapaActualID + "a", 'altura');

            const response = await fetch(`assets/mapas/${this.mapaActualID}.ini`);
            if (response.ok) {
                const data = await response.text();
                const conexiones = data.split('\n').map(linea => linea.trim());
                this.norte = conexiones[0] || "0";
                this.sur = conexiones[1] || "0";
                this.este = conexiones[2] || "0";
                this.oeste = conexiones[3] || "0";
            }

            this.clienteReemplazaTerreno();
            console.log(`Mapa ${this.mapaActualID} cargado exitosamente.`);
        } catch (error) {
            console.warn("Aviso cargando archivos del mapa:", error);
        }
    }

    async bmp2mapa(fileName, destino) {
        const response = await fetch(`assets/mapas/${fileName}.bmp`);
        const buffer = await response.arrayBuffer();
        const view = new DataView(buffer);

        let offset = 1078; 
        let count = 0;
        const targetArray = (destino === 'terreno') ? this.a : this.al;

        for (let y = 0; y < 1000; y++) {
            for (let x = 0; x < 1000; x++) {
                if (offset + count < buffer.byteLength) {
                    let byte = view.getUint8(offset + count);
                    if (byte === 215) byte = 6; 
                    targetArray[y * 1000 + x] = byte;
                }
                count++;
            }
        }
    }

    clienteReemplazaTerreno() {
        for (let i = 0; i < this.a.length; i++) {
            const v = this.a[i];
            if (v === 144) this.a[i] = 930;
            else if (v === 126) this.a[i] = 955;
            else if (v === 83) this.a[i] = 945;
            else if (v === 20) this.a[i] = 935;
        }
    }
}

const EngineMap = new AetriciaMap();

/**
 * --- MÓDULO 1: ESTADO GLOBAL ---
 */
const heroe = { x: 135, y: 129 };
let diccionario = {};
let texturasCache = {};

// --- 0. INITS (320x200) ---
const RETRO_WIDTH = 320;
const RETRO_HEIGHT = 200;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a050f, 0.05);
const sceneBackgroundBase = new THREE.Color(0x0a050f);
scene.background = sceneBackgroundBase;

const camera = new THREE.PerspectiveCamera(45, RETRO_WIDTH / RETRO_HEIGHT, 0.1, 100);
camera.position.set(heroe.x + 0.5, 1.6, heroe.y + 0.5);

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

// --- 1. ILUMINACIÓN & CICLO DÍA/NOCHE ---
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

const propiedadesRecursos = {
    '0006_pasto.png': { modo: 'HORIZONTAL', escala: 1.0, offsetY: 0.01 },
    '0090_camino.png': { modo: 'HORIZONTAL', escala: 1.0, offsetY: 0.01 },
};

const defaultPixelScale = 128; 

// --- 3. SISTEMA DE TERRENO CÓNICO DINÁMICO ---
const grupoTerreno = new THREE.Group();
const grupoRecursos = new THREE.Group();
scene.add(grupoTerreno);
scene.add(grupoRecursos);

const cubes = [];
const sprites = [];
const MAX_BASE_HALF = 25;
const TOTAL_CONE_ROWS = 40;
const maxConeSize = 3000; 

for (let i = 0; i < maxConeSize; i++) {
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), floorMaterial);
    tile.rotation.x = -Math.PI / 2;
    tile.visible = false;
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
    sprite.visible = false;
    grupoRecursos.add(sprite);
    sprites.push(sprite);
}

function getAltura(idx) {
    if (idx < 0 || idx >= EngineMap.al.length) return 0;
    const val = EngineMap.al[idx];
    const mapaAlturas = { 3: -5, 11: -2, 6: 0, 7: 3, 21: 8 };
    return (mapaAlturas[val] !== undefined ? mapaAlturas[val] : 0) * 0.5;
}

let ultimaHeroeX = -999;
let ultimaHeroeY = -999;
let ultimoYawIndex = -999;

function actualizarTerreno(forzar = false) {
    const yawRedondeado = Math.round(yaw * 12); 

    if (!forzar && heroe.x === ultimaHeroeX && heroe.y === ultimaHeroeY && yawRedondeado === ultimoYawIndex) {
        return; 
    }

    ultimaHeroeX = heroe.x;
    ultimaHeroeY = heroe.y;
    ultimoYawIndex = yawRedondeado;

    for (let k = 0; k < cubes.length; k++) {
        cubes[k].visible = false;
        sprites[k].visible = false;
        sprites[k].material.map = null;
    }

    let i = 0;
    
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const currentOriginX = heroe.x;
    const currentOriginY = heroe.y;

    for (let r = 0; r <= TOTAL_CONE_ROWS; r++) {
        let halfWidth = Math.floor(THREE.MathUtils.lerp(2, MAX_BASE_HALF, r / TOTAL_CONE_ROWS));
        if (r === 0) halfWidth = 3; 

        const rowCenterX = currentOriginX + (forwardX * (r > 0 ? r - 1 : 0));
        const rowCenterY = currentOriginY + (forwardZ * (r > 0 ? r - 1 : 0));

        for (let w = -halfWidth; w <= halfWidth; w++) {
            const worldX = Math.floor(rowCenterX + (rightX * w));
            const worldY = Math.floor(rowCenterY + (rightZ * w));

            if (worldX >= 0 && worldX < 1000 && worldY >= 0 && worldY < 1000) {
                const idx = (worldY * 1000) + worldX;
                const altura = getAltura(idx);

                if (i < cubes.length) {
                    cubes[i].visible = true;
                    cubes[i].position.set(worldX + 0.5, altura, worldY + 0.5);

                    const entId = EngineMap.a[idx];
                    if (entId > 0 && diccionario[entId]) {
                        sprites[i].visible = true;
                        const nombreArchivo = diccionario[entId];
                        const url = 'assets/bmp/' + nombreArchivo;

                        const props = propiedadesRecursos[nombreArchivo] || { modo: 'VERTICAL', escala: 1.0, offsetY: 0 };

                        if (!texturasCache[url]) {
                            texturasCache[url] = loader.load(url, (tex) => {
                                tex.minFilter = THREE.NearestFilter;
                                tex.magFilter = THREE.NearestFilter;
                                tex.generateMipmaps = false;

                                const objectMaxWidth = (RETRO_WIDTH / 2) / defaultPixelScale;
                                tex.userData = {
                                    width: objectMaxWidth * props.escala,
                                    height: (tex.image.height / defaultPixelScale) * props.escala
                                };

                                sprites.forEach(s => {
                                    if (s.material.map === tex) {
                                        s.scale.set(tex.userData.width, tex.userData.height, 1);
                                    }
                                });
                            }, undefined, () => {});
                        }

                        sprites[i].material.map = texturasCache[url];
                        sprites[i].material.needsUpdate = true;

                        if (texturasCache[url].userData && texturasCache[url].userData.width) {
                            const dat = texturasCache[url].userData;
                            sprites[i].scale.set(dat.width, dat.height, 1);
                        } else {
                            const defaultW = ((RETRO_WIDTH / 2) / defaultPixelScale) * props.escala;
                            const defaultH = (1 / defaultPixelScale) * props.escala;
                            sprites[i].scale.set(defaultW, defaultH, 1);
                        }

                        if (props.modo === 'HORIZONTAL') {
                            sprites[i].rotation.set(-Math.PI / 2, 0, 0);
                        }

                        const hSize = (texturasCache[url].userData && texturasCache[url].userData.height) ? texturasCache[url].userData.height : 1;
                        const baseOffsetY = props.modo === 'HORIZONTAL' ? 0.01 : (hSize / 2);
                        const yOffset = baseOffsetY + (props.offsetY || 0);

                        sprites[i].position.set(worldX + 0.5, altura + yOffset, worldY + 0.5);
                    }
                    i++;
                }
            }
        }
    }
}

// --- 4. RIG DE ARMAS ---
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

// --- 5. CONTROLES Y MOVIMIENTO POR CASILLAS ---
let yaw = 0;
let pitch = 0;
let targetYaw = 0; 
const ROTATION_SPEED = 5;

let isMoving = false;
let moveProgress = 1.0;
let startCellX = heroe.x;
let startCellY = heroe.y;
let targetCellX = heroe.x;
let targetCellY = heroe.y;
const STEP_DURATION = 0.25; 

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

window.addEventListener('keydown', (e) => {
    if (isMoving) return; 

    let dx = 0;
    let dz = 0;

    switch (e.code) {
        case 'KeyW': case 'ArrowUp':
            dx = -Math.round(Math.sin(yaw));
            dz = -Math.round(Math.cos(yaw));
            break;
        case 'KeyS': case 'ArrowDown':
            dx = Math.round(Math.sin(yaw));
            dz = Math.round(Math.cos(yaw));
            break;
        case 'KeyA': case 'ArrowLeft':
            dx = -Math.round(Math.cos(yaw));
            dz = Math.round(Math.sin(yaw));
            break;
        case 'KeyD': case 'ArrowRight':
            dx = Math.round(Math.cos(yaw));
            dz = -Math.round(Math.sin(yaw));
            break;
        case 'KeyQ': 
            targetYaw += Math.PI / 2; 
            return;
        case 'KeyE': 
            targetYaw -= Math.PI / 2; 
            return;
        default:
            return;
    }

    if (dx !== 0 || dz !== 0) {
        startCellX = heroe.x;
        startCellY = heroe.y;
        targetCellX = startCellX + dx;
        targetCellY = startCellY + dz;

        if (targetCellX >= 0 && targetCellX < 1000 && targetCellY >= 0 && targetCellY < 1000) {
            isMoving = true;
            moveProgress = 0.0;
        }
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
        targetYaw = yaw;
    }
});

window.addEventListener('touchstart', (e) => {
    const target = e.target;
    if (target.classList.contains('interactive') || target.closest('.interactive') || target.closest('#joystick-container')) return;
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

const joystickContainer = document.getElementById('joystick-container');
const joystickKnob = document.getElementById('joystick-knob');

let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickVector = { x: 0, y: 0 };
const maxJoystickRadius = 35;

if (joystickContainer && joystickKnob) {
    joystickContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        const rect = joystickContainer.getBoundingClientRect();
        joystickCenter.x = rect.left + rect.width / 2;
        joystickCenter.y = rect.top + rect.height / 2;
        
        const touch = e.touches[0];
        updateJoystickPosition(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            updateJoystickPosition(touch.clientX, touch.clientY);
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        let stillTouching = false;
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const dx = touch.clientX - joystickCenter.x;
            const dy = touch.clientY - joystickCenter.y;
            if (Math.hypot(dx, dy) < 100) stillTouching = true;
        }
        
        if (!stillTouching && joystickActive) {
            joystickActive = false;
            joystickVector.x = 0;
            joystickVector.y = 0;
            joystickKnob.style.transform = `translate(0px, 0px)`;
        }
    });
}

function updateJoystickPosition(clientX, clientY) {
    let dx = clientX - joystickCenter.x;
    let dy = clientY - joystickCenter.y;
    const distance = Math.hypot(dx, dy);

    if (distance > maxJoystickRadius) {
        dx = (dx / distance) * maxJoystickRadius;
        dy = (dy / distance) * maxJoystickRadius;
    }

    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joystickVector.x = dx / maxJoystickRadius;
    joystickVector.y = dy / maxJoystickRadius;

    if (!isMoving && (Math.abs(joystickVector.x) > 0.5 || Math.abs(joystickVector.y) > 0.5)) {
        let dxStep = 0;
        let dzStep = 0;
        if (Math.abs(joystickVector.y) > Math.abs(joystickVector.x)) {
            const forwardSign = joystickVector.y < 0 ? 1 : -1;
            dxStep = -forwardSign * Math.round(Math.sin(yaw));
            dzStep = -forwardSign * Math.round(Math.cos(yaw));
        } else {
            const rightSign = joystickVector.x > 0 ? 1 : -1;
            dxStep = rightSign * Math.round(Math.cos(yaw));
            dzStep = -rightSign * Math.round(Math.sin(yaw));
        }

        if (dxStep !== 0 || dzStep !== 0) {
            startCellX = heroe.x;
            startCellY = heroe.y;
            targetCellX = startCellX + dxStep;
            targetCellY = startCellY + dzStep;
            if (targetCellX >= 0 && targetCellX < 1000 && targetCellY >= 0 && targetCellY < 1000) {
                isMoving = true;
                moveProgress = 0.0;
            }
        }
    }
}

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

async function iniciarJuego() {
    await EngineMap.cargarMapa("1");
    try {
        const txtRes = await fetch('assets/bmp/recursosi.txt');
        if (txtRes.ok) {
            const txt = await txtRes.text();
            txt.split('\n').forEach(linea => {
                const p = linea.split(',');
                if (p.length >= 5) diccionario[parseInt(p[0].trim())] = p[4].trim();
            });
        }
    } catch (e) {
        console.warn("Aviso cargando diccionario:", e);
    }
    
    // Forzamos la posición inicial al cargar para respetar la celda de origen
    startCellX = heroe.x;
    startCellY = heroe.y;
    targetCellX = heroe.x;
    targetCellY = heroe.y;
    camera.position.set(heroe.x + 0.5, 1.6, heroe.y + 0.5);

    actualizarTerreno(true);
}

iniciarJuego();

// --- 6. BUCLE DE RENDERIZACIÓN ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    yaw += (targetYaw - yaw) * ROTATION_SPEED * delta;
    pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    
    camera.rotation.set(pitch, yaw, 0);
    camera.order = "YXZ";

    if (isMoving) {
        moveProgress += delta / STEP_DURATION;
        if (moveProgress >= 1.0) {
            moveProgress = 1.0;
            isMoving = false;
            heroe.x = targetCellX;
            heroe.y = targetCellY;
        }
    }

    const currentX = THREE.MathUtils.lerp(startCellX, targetCellX, moveProgress) + 0.5;
    const currentZ = THREE.MathUtils.lerp(startCellY, targetCellY, moveProgress) + 0.5;
    
    camera.position.x = currentX;
    camera.position.z = currentZ;
    camera.position.y = 0.4;

    // Sincronización continua de la celda actual sin perder la referencia
    heroe.x = Math.floor(camera.position.x);
    heroe.y = Math.floor(camera.position.z);
    
    actualizarTerreno();

    sprites.forEach(sprite => {
        if (sprite.visible) {
            const entId = EngineMap.a[Math.floor(sprite.position.z) * 1000 + Math.floor(sprite.position.x)];
            const nombreArchivo = diccionario[entId];
            const props = propiedadesRecursos[nombreArchivo] || { modo: 'VERTICAL' };
            
            if (props.modo !== 'HORIZONTAL') {
                sprite.quaternion.copy(camera.quaternion);
            }
        }
    });

    // --- CICLO DÍA / NOCHE ---
    const cicloTiempo = (elapsedTime % 60) / 60; 
    const anguloSol = cicloTiempo * Math.PI * 2;
    const factorDia = Math.sin(anguloSol); 

    const colorAmbiente = new THREE.Color();
    const colorCielo = new THREE.Color();

    if (factorDia > 0) {
        colorAmbiente.setHSL(0.12, 0.4, THREE.MathUtils.lerp(0.15, 0.45, factorDia));
        colorCielo.setHSL(0.6, 0.3, THREE.MathUtils.lerp(0.05, 0.25, factorDia));
        torchLight.intensity = THREE.MathUtils.lerp(3.0, 1.0, factorDia);
    } else {
        colorAmbiente.setHSL(0.7, 0.2, 0.08);
        colorCielo.setHSL(0.7, 0.3, 0.02);
        torchLight.intensity = 3.5 + Math.sin(elapsedTime * 10) * 0.4;
    }

    ambientLight.color.copy(colorAmbiente);
    scene.background.copy(colorCielo);
    scene.fog.color.copy(colorCielo);

    torchLight.position.copy(camera.position);

    weaponRig.position.copy(camera.position);
    weaponRig.rotation.copy(camera.rotation);

    if (isMoving) {
        bobbingX = Math.sin(elapsedTime * 15) * 0.02;
        bobbingY = Math.cos(elapsedTime * 30) * 0.015;
    } else {
        bobbingX = 0;
        bobbingY = 0;
    }

    const targetDefense = shieldActive ? 1.0 : 0.0;
    currentShieldDefense += (targetDefense - currentShieldDefense) * 12 * delta;

    shieldGroup.position.x = THREE.MathUtils.lerp(-0.35, -0.05, currentShieldDefense) + bobbingX;
    shieldGroup.position.y = THREE.MathUtils.lerp(-0.25, -0.05, currentShieldDefense) + bobbingY;
    shieldGroup.position.z = THREE.MathUtils.lerp(-0.5, -0.35, currentShieldDefense);
    shieldGroup.rotation.y = THREE.MathUtils.lerp(0.4, 0.9, currentShieldDefense);
    shieldGroup.rotation.x = THREE.MathUtils.lerp(0.1, 0.2, currentShieldDefense);

    swordGroup.position.set(0.35 + bobbingX, -0.3 + bobbingY, -0.6);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = RETRO_WIDTH / RETRO_HEIGHT;
    camera.updateProjectionMatrix();
});

animate();