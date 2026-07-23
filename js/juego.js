/**
 * --- MÓDULO: Aetricia Engine - Mapas y Terreno ---
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

// --- 0. INITS ---
const RETRO_WIDTH = 320;
const RETRO_HEIGHT = 180;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a050f, 0.015);
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

const propiedadesRecursos = {
    '0006_pasto.png': { modo: 'HORIZONTAL', escala: 1.0, offsetY: 0.01 },
    '0090_camino.png': { modo: 'HORIZONTAL', escala: 1.0, offsetY: 0.01 },
};

const defaultPixelScale = 128; 

// --- 3. SISTEMA DE TERRENO DINÁMICO ---
const grupoTerreno = new THREE.Group();
const grupoRecursos = new THREE.Group();
scene.add(grupoTerreno);
scene.add(grupoRecursos);

const cubes = [];
const sprites = [];
const RANGE = 20; 
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
    if (idx < 0 || idx >= EngineMap.al.length) return 0;
    const val = EngineMap.al[idx];
    const mapaAlturas = { 3: -5, 11: -2, 6: 0, 7: 3, 21: 8 };
    return (mapaAlturas[val] !== undefined ? mapaAlturas[val] : 0) * 0.5;
}

function actualizarTerreno() {
    for (let k = 0; k < cubes.length; k++) {
        cubes[k].visible = false;
        sprites[k].visible = false;
        sprites[k].material.map = null;
    }

    let activeIndex = 0;

    for(let yy = heroe.y - RANGE; yy <= heroe.y + RANGE; yy++) {
        for(let xx = heroe.x - RANGE; xx <= heroe.x + RANGE; xx++) {
            if (xx >= 0 && xx < 1000 && yy >= 0 && yy < 1000) {
                
                const dx = xx - heroe.x;
                const dy = yy - heroe.y;
                if ((dx * dx + dy * dy) > RANGE * RANGE) continue;

                if (activeIndex >= size) break;

                const idx = (yy * 1000) + xx;
                const altura = getAltura(idx);
                
                const currentCube = cubes[activeIndex];
                currentCube.visible = true;
                currentCube.position.set(xx, altura, yy);
                
                const currentSprite = sprites[activeIndex];
                const entId = EngineMap.a[idx];
                
                if (entId > 0 && diccionario[entId]) {
                    currentSprite.visible = true;
                    const nombreArchivo = diccionario[entId];
                    const url = 'assets/bmp/' + nombreArchivo;
                    
                    const props = propiedadesRecursos[nombreArchivo] || { modo: 'VERTICAL', escala: 1.0, offsetY: 0 };

                    if (!texturasCache[url]) {
                        texturasCache[url] = loader.load(url, (tex) => {
                            tex.minFilter = THREE.NearestFilter;
                            tex.magFilter = THREE.NearestFilter;
                            tex.generateMipmaps = false;

                            tex.userData = {
                                width: (tex.image.width / defaultPixelScale) * props.escala,
                                height: (tex.image.height / defaultPixelScale) * props.escala
                            };

                            sprites.forEach(s => {
                                if (s.material.map === tex) {
                                    s.scale.set(tex.userData.width, tex.userData.height, 1);
                                }
                            });
                        }, undefined, () => {});
                    }

                    currentSprite.material.map = texturasCache[url];
                    currentSprite.material.needsUpdate = true;

                    if (texturasCache[url].userData && texturasCache[url].userData.width) {
                        const dat = texturasCache[url].userData;
                        currentSprite.scale.set(dat.width, dat.height, 1);
                    } else {
                        const w = (1 / defaultPixelScale) * props.escala;
                        const h = (1 / defaultPixelScale) * props.escala;
                        currentSprite.scale.set(w, h, 1);
                    }

                    if (props.modo === 'HORIZONTAL') {
                        currentSprite.rotation.set(-Math.PI / 2, 0, 0);
                    }

                    const hSize = (texturasCache[url].userData && texturasCache[url].userData.height) ? texturasCache[url].userData.height : 1;
                    const baseOffsetY = props.modo === 'HORIZONTAL' ? 0.01 : (hSize / 2);
                    const yOffset = baseOffsetY + (props.offsetY || 0);

                    currentSprite.position.set(xx, altura + yOffset, yy);
                } else {
                    currentSprite.visible = false;
                    currentSprite.material.map = null;
                }
                activeIndex++;
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

// --- 5. CONTROLES Y MOVIMIENTO DISCRETO (POR GRILLA) ---
let gridX = heroe.x;
let gridY = heroe.y;
let targetGridX = gridX;
let targetGridY = gridY;

let facingDirection = 0; // 0: Norte (-Z), 1: Este (+X), 2: Sur (+Z), 3: Oeste (-X)
let isMovingGrid = false;
let moveProgress = 1.0; 
const MOVE_DURATION = 0.15; 

let visualCamX = gridX;
let visualCamZ = gridY;
let targetYaw = 0;
let yaw = 0;
let pitch = 0.050;
const ROTATION_SPEED = 10;

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

function intentarMover(dx, dy) {
    if (isMovingGrid) return; 

    let nextX = gridX;
    let nextY = gridY;

    if (dx !== 0) {
        const dirAjustada = (facingDirection + (dx > 0 ? 1 : 3)) % 4;
        if (dirAjustada === 0) nextY--;
        else if (dirAjustada === 1) nextX++;
        else if (dirAjustada === 2) nextY++;
        else if (dirAjustada === 3) nextX--;
    } else if (dy !== 0) {
        const dirAjustada = (facingDirection + (dy < 0 ? 0 : 2)) % 4;
        if (dirAjustada === 0) nextY--;
        else if (dirAjustada === 1) nextX++;
        else if (dirAjustada === 2) nextY++;
        else if (dirAjustada === 3) nextX--;
    }

    if (nextX >= 0 && nextX < 1000 && nextY >= 0 && nextY < 1000) {
        targetGridX = nextX;
        targetGridY = nextY;
        isMovingGrid = true;
        moveProgress = 0.0;
    }
}

window.addEventListener('keydown', (e) => {
    if (isMovingGrid) return;

    switch (e.code) {
        case 'KeyW': case 'ArrowUp': intentarMover(0, -1); break;
        case 'KeyS': case 'ArrowDown': intentarMover(0, 1); break;
        case 'KeyA': case 'ArrowLeft': intentarMover(-1, 0); break;
        case 'KeyD': case 'ArrowRight': intentarMover(1, 0); break;
        case 'KeyQ': 
            facingDirection = (facingDirection + 3) % 4; 
            targetYaw = facingDirection * (Math.PI / 2);
            break;
        case 'KeyE': 
            facingDirection = (facingDirection + 1) % 4; 
            targetYaw = facingDirection * (Math.PI / 2);
            break;
    }
});

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
        updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    window.addEventListener('touchend', () => {
        joystickActive = false;
        joystickVector.x = 0;
        joystickVector.y = 0;
        joystickKnob.style.transform = `translate(0px, 0px)`;
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

    if (!isMovingGrid) {
        if (joystickVector.y < -0.5) intentarMover(0, -1);
        else if (joystickVector.y > 0.5) intentarMover(0, 1);
        else if (joystickVector.x < -0.5) intentarMover(-1, 0);
        else if (joystickVector.x > 0.5) intentarMover(1, 0);
    }
}

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
    actualizarTerreno();
}

iniciarJuego();

// --- 6. BUCLE DE RENDERIZACIÓN Y CICLO DÍA/NOCHE ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    const cicloTiempo = (elapsedTime % 60) / 60; 
    const factorDay = (Math.sin(cicloTiempo * Math.PI * 2 - Math.PI / 2) + 1) / 2;

    const colorNocheAmb = new THREE.Color(0x0f0b15);
    const colorDiaAmb = new THREE.Color(0xdddddd);

    const colorNocheFog = new THREE.Color(0x020104);
    const colorDiaFog = new THREE.Color(0x7a828c);   

    ambientLight.color.copy(colorNocheAmb).lerp(colorDiaAmb, factorDay);
    ambientLight.intensity = THREE.MathUtils.lerp(0.5, 1.8, factorDay);

    scene.fog.color.copy(colorNocheFog).lerp(colorDiaFog, factorDay);
    scene.background.copy(scene.fog.color); 

    const targetTorchIntensity = THREE.MathUtils.lerp(4.0, 0.02, factorDay);
    torchLight.intensity = targetTorchIntensity + Math.sin(elapsedTime * 10) * 0.2 + Math.random() * 0.05;

    yaw += (targetYaw - yaw) * ROTATION_SPEED * delta;
    pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    
    camera.rotation.set(pitch, yaw, 0);
    camera.order = "YXZ";

    // Interpolación de movimiento discreto por grilla
    if (isMovingGrid) {
        moveProgress += delta / MOVE_DURATION;
        if (moveProgress >= 1.0) {
            moveProgress = 1.0;
            gridX = targetGridX;
            gridY = targetGridY;
            isMovingGrid = false;
        }
        visualCamX = THREE.MathUtils.lerp(gridX, targetGridX, moveProgress);
        visualCamZ = THREE.MathUtils.lerp(gridY, targetGridY, moveProgress);
    } else {
        visualCamX = gridX;
        visualCamZ = gridY;
    }

    camera.position.x = visualCamX;
    camera.position.z = visualCamZ;
    camera.position.y = 0.4;

    if (heroe.x !== gridX || heroe.y !== gridY) {
        heroe.x = gridX;
        heroe.y = gridY;
        actualizarTerreno();
    }

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

    torchLight.position.copy(camera.position);
    weaponRig.position.copy(camera.position);
    weaponRig.rotation.copy(camera.rotation);

    if (isMovingGrid) {
        bobbingX = Math.sin(moveProgress * Math.PI * 4) * 0.015;
        bobbingY = Math.cos(moveProgress * Math.PI * 8) * 0.01;
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