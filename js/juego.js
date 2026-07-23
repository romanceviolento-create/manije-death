/**
 * --- MÓDULO: Aetricia Engine - Mapas, Terreno, Visión y Ciclo Día/Noche ---
 */

const RETRO_WIDTH = 320;
const RETRO_HEIGHT = 200;
const STEP_DURATION = 0.25;
const HEIGHT_MULTIPLIER = 0.5;
const MAP_SIZE = 1000;

class AetriciaMap {
    constructor() {
        this.a = new Int16Array(MAP_SIZE * MAP_SIZE);   // Terreno y objetos
        this.al = new Int16Array(MAP_SIZE * MAP_SIZE);  // Alturas y relieve
        this.ae = new Int32Array(MAP_SIZE * MAP_SIZE);  // Entidades e ítems
        this.mapaActualID = "1";
        this.norte = "0";
        this.sur = "0";
        this.este = "0";
        this.oeste = "0";
        this.diccionario = {};
        this.texturasCache = {};
        this.puedepasar = ""; 
    }

    async cargarMapa(mapID) {
        this.mapaActualID = mapID.toString();
        console.log(`Iniciando carga del mapa: ${this.mapaActualID}`);

        try {
            await Promise.all([
                this.bmp2mapa(this.mapaActualID, 'terreno'),
                this.bmp2mapa(this.mapaActualID + "a", 'altura')
            ]);

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

    async bmp2mapa(fileName, destinoTipo) {
        const response = await fetch(`assets/mapas/${fileName}.bmp`);
        const buffer = await response.arrayBuffer();
        const view = new DataView(buffer);
        const offset = 1079; // Salto estricto de cabecera BMP + paleta
        const targetArray = (destinoTipo === 'terreno') ? this.a : this.al;

        // Corrección de Vertical Flip: Lectura bottom-to-top adaptada a WebGL
        for (let yy = 999; yy >= 0; yy--) {
            for (let xx = 0; xx < 1000; xx++) {
                const legacyIdx = (999 - yy) * 1000 + xx;
                if (offset + legacyIdx < buffer.byteLength) {
                    let byte = view.getUint8(offset + legacyIdx);
                    if (byte === 215) byte = 6; 
                    targetArray[yy * 1000 + xx] = byte;
                }
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
            else if (v === 151) this.a[i] = 944;
            else if (v === 158) this.a[i] = 936;
        }
    }

    canMove(x, y) {
        if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
        const id = this.a[y * MAP_SIZE + x];
        
        // IDs 6 (pasto base) y 90 (camino) configurados como NO SÓLIDOS (transitables)
        const esTransitable = (id > 900) || (id === 6) || (id === 90);
        
        return esTransitable || (this.puedepasar && this.puedepasar.includes(String.fromCharCode(id)));
    }
}

const EngineMap = new AetriciaMap();

// --- ESTADO GLOBAL Y CONFIGURACIÓN DE ESCENA ---
const heroe = { 
    x: 135, 
    y: 129, 
    yaw: 0, 
    pitch: 0,
    isMoving: false,
    moveProgress: 1.0,
    startCellX: 135,
    startCellY: 129,
    targetCellX: 135,
    targetCellY: 129
};

let propiedadesRecursos = {
    '0006_pasto.png': { modo: 'HORIZONTAL', escala: 1.0, offsetY: 0.01 },
    '0090_camino.png': { modo: 'HORIZONTAL', escala: 1.0, offsetY: 0.01 },
};
const defaultPixelScale = 128;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a050f, 0.05);
scene.background = new THREE.Color(0x0a050f);

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

// --- ILUMINACIÓN & MATERIALES ---
const ambientLight = new THREE.AmbientLight(0x1a1525, 1.2);
scene.add(ambientLight);

const torchLight = new THREE.PointLight(0xffaa44, 3, 15);
torchLight.position.set(0, 3, -2);
scene.add(torchLight);

const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x3d3547 });
const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x221c2b });
const darkIronMaterial = new THREE.MeshLambertMaterial({ color: 0x1c1822 });
const loader = new THREE.TextureLoader();

// --- POOLING DE MALLAS (TERRENO Y RECURSOS) ---
const grupoTerreno = new THREE.Group();
const grupoRecursos = new THREE.Group();
scene.add(grupoTerreno);
scene.add(grupoRecursos);

const cubes = [];
const sprites = [];
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
    return (mapaAlturas[val] !== undefined ? mapaAlturas[val] : 0) * HEIGHT_MULTIPLIER;
}

// --- ACTUALIZACIÓN DE VISIÓN CÓNICA CORREGIDA ---
function actualizarTerreno() {
    for (let k = 0; k < cubes.length; k++) {
        cubes[k].visible = false;
        sprites[k].visible = false;
        sprites[k].material.map = null;
    }

    let i = 0;
    const viewDist = 22; // Radio de visión
    const halfFov = 0.5;  // Ancho del cono de visión en radianes

    const originX = Math.floor(camera.position.x);
    const originY = Math.floor(camera.position.z);

    for (let dz = -viewDist; dz <= viewDist; dz++) {
        for (let dx = -viewDist; dx <= viewDist; dx++) {
            if (i >= maxConeSize) break;

            const worldX = originX + dx;
            const worldY = originY + dz;

            if (worldX >= 0 && worldX < MAP_SIZE && worldY >= 0 && worldY < MAP_SIZE) {
                const distSq = dx * dx + dz * dz;
                
                if (distSq <= viewDist * viewDist) {
                    const angleToTile = Math.atan2(-dx, -dz);
                    let angleDiff = heroe.yaw - angleToTile;

                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    if (Math.abs(angleDiff) <= halfFov || distSq <= 9) {
                        const idx = (worldY * MAP_SIZE) + worldX;
                        const altura = getAltura(idx);

                        cubes[i].visible = true;
                        cubes[i].position.set(worldX + 0.5, altura, worldY + 0.5);

                        const entId = EngineMap.a[idx];
                        if (entId > 0 && EngineMap.diccionario[entId]) {
                            sprites[i].visible = true;
                            const nombreArchivo = EngineMap.diccionario[entId];
                            const url = 'assets/bmp/' + nombreArchivo;
                            const props = propiedadesRecursos[nombreArchivo] || { modo: 'VERTICAL', escala: 1.0, offsetY: 0 };

                            if (!EngineMap.texturasCache[url]) {
                                EngineMap.texturasCache[url] = loader.load(url, (tex) => {
                                    tex.minFilter = THREE.NearestFilter;
                                    tex.magFilter = THREE.NearestFilter;
                                    tex.generateMipmaps = false;

                                    const objectMaxWidth = (RETRO_WIDTH / 2) / defaultPixelScale;
                                    tex.userData = {
                                        width: objectMaxWidth * props.escala,
                                        height: (tex.image.height / defaultPixelScale) * props.escala
                                    };
                                });
                            }

                            const cachedTex = EngineMap.texturasCache[url];
                            sprites[i].material.map = cachedTex;
                            sprites[i].material.needsUpdate = true;

                            // Guardar el modo en el sprite para controlar su rotación correctamente
                            sprites[i].userData.modo = props.modo;

                            if (cachedTex && cachedTex.userData && cachedTex.userData.width) {
                                sprites[i].scale.set(cachedTex.userData.width, cachedTex.userData.height, 1);
                            } else {
                                sprites[i].scale.set(0.1, 0.1, 1);
                            }

                            if (props.modo === 'HORIZONTAL') {
                                sprites[i].rotation.set(-Math.PI / 2, 0, 0);
                            }

                            const hSize = (cachedTex && cachedTex.userData) ? cachedTex.userData.height : 1;
                            const baseOffsetY = props.modo === 'HORIZONTAL' ? 0.01 : (hSize / 2);
                            sprites[i].position.set(worldX + 0.5, altura + baseOffsetY + (props.offsetY || 0), worldY + 0.5);
                        }
                        i++;
                    }
                }
            }
        }
    }
}

// --- RIG DE ARMAS ---
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

// --- CONTROLES Y MOVIMIENTO ---
window.addEventListener('keydown', (e) => {
    if (heroe.isMoving) return;

    let dx = 0;
    let dz = 0;

    switch (e.code) {
        case 'KeyW': case 'ArrowUp':
            dx = -Math.round(Math.sin(heroe.yaw));
            dz = -Math.round(Math.cos(heroe.yaw));
            break;
        case 'KeyS': case 'ArrowDown':
            dx = Math.round(Math.sin(heroe.yaw));
            dz = Math.round(Math.cos(heroe.yaw));
            break;
        case 'KeyA': case 'ArrowLeft':
            dx = -Math.round(Math.cos(heroe.yaw));
            dz = Math.round(Math.sin(heroe.yaw));
            break;
        case 'KeyD': case 'ArrowRight':
            dx = Math.round(Math.cos(heroe.yaw));
            dz = -Math.round(Math.sin(heroe.yaw));
            break;
        case 'KeyQ':
            heroe.yaw += Math.PI / 2;
            return;
        case 'KeyE':
            heroe.yaw -= Math.PI / 2;
            return;
        default:
            return;
    }

    if (dx !== 0 || dz !== 0) {
        const nx = heroe.x + dx;
        const ny = heroe.y + dz;

        if (EngineMap.canMove(nx, ny)) {
            heroe.startCellX = heroe.x;
            heroe.startCellY = heroe.y;
            heroe.targetCellX = nx;
            heroe.targetCellY = ny;
            heroe.isMoving = true;
            heroe.moveProgress = 0.0;
        }
    }
});

canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
        const sensitivity = 0.002;
        heroe.yaw -= e.movementX * sensitivity;
        heroe.pitch -= e.movementY * sensitivity;

        const maxPitch = Math.PI / 2 - 0.05;
        heroe.pitch = Math.max(-maxPitch, Math.min(maxPitch, heroe.pitch));
    }
});

// --- INICIALIZACIÓN ---
async function iniciarJuego() {
    await EngineMap.cargarMapa("1");
    try {
        const txtRes = await fetch('assets/bmp/recursosi.txt');
        if (txtRes.ok) {
            const txt = await txtRes.text();
            txt.split('\n').forEach(linea => {
                const p = linea.split(',');
                if (p.length >= 5) EngineMap.diccionario[parseInt(p[0].trim())] = p[4].trim();
            });
        }
    } catch (e) {
        console.warn("Aviso cargando diccionario:", e);
    }

    camera.position.set(heroe.x + 0.5, 1.6, heroe.y + 0.5);
    actualizarTerreno();
}

iniciarJuego();

// --- BUCLE DE RENDERIZACIÓN ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    camera.rotation.set(heroe.pitch, heroe.yaw, 0);
    camera.order = "YXZ";

    if (heroe.isMoving) {
        heroe.moveProgress += delta / STEP_DURATION;
        if (heroe.moveProgress >= 1.0) {
            heroe.moveProgress = 1.0;
            heroe.isMoving = false;
            heroe.x = heroe.targetCellX;
            heroe.y = heroe.targetCellY;
        }
    }

    const currentX = THREE.MathUtils.lerp(heroe.startCellX, heroe.targetCellX, heroe.moveProgress) + 0.5;
    const currentZ = THREE.MathUtils.lerp(heroe.startCellY, heroe.targetCellY, heroe.moveProgress) + 0.5;
    
    const currentAlt = getAltura(Math.floor(currentZ) * MAP_SIZE + Math.floor(currentX));
    camera.position.set(currentX, 0.4 + currentAlt, currentZ);

    actualizarTerreno();

    // Rotación controlada de sprites: Los horizontales se quedan en el piso, los verticales miran a la cámara
    sprites.forEach(sprite => {
        if (sprite.visible) {
            if (sprite.userData && sprite.userData.modo === 'HORIZONTAL') {
                sprite.rotation.set(-Math.PI / 2, 0, 0);
            } else {
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

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = RETRO_WIDTH / RETRO_HEIGHT;
    camera.updateProjectionMatrix();
});

animate();