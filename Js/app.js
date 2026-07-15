const RETRO_WIDTH = 320;
const RETRO_HEIGHT = 180;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a050f, 0.05); // Neblina oscura de ambiente

const camera = new THREE.PerspectiveCamera(70, RETRO_WIDTH / RETRO_HEIGHT, 0.1, 100);
camera.position.set(0, 1.6, 12); // Altura de los ojos (1.6m)

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(RETRO_WIDTH, RETRO_HEIGHT, false); // "false" evita que ThreeJS altere el style CSS del canvas
document.body.appendChild(renderer.domElement);

// Metemos el canvas dentro de nuestro contenedor de juego controlado por CSS
const container = document.getElementById('game-container');
container.appendChild(renderer.domElement);

// --- 2. ILUMINACIÓN ---
const ambientLight = new THREE.AmbientLight(0x1a1525, 1.2); // Luz de noche azulada
scene.add(ambientLight);

const torchLight = new THREE.PointLight(0xffaa44, 3, 15); // Antorcha cálida parpadeante
torchLight.position.set(0, 3, -2);
scene.add(torchLight);

// --- 3. GEOMETRÍA DEL CASTILLO (LOW-POLY) ---
const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x3d3547 });
const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x221c2b });
const torchMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
const darkIronMaterial = new THREE.MeshLambertMaterial({ color: 0x1c1822 }); // Material complementario oscuro

// Suelo
const floorGeo = new THREE.PlaneGeometry(50, 100);
const floor = new THREE.Mesh(floorGeo, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Función auxiliar para levantar paredes rápidamente
const createWall = (w, h, d, x, y, z) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, y, z);
    scene.add(mesh);
};

// Entrada principal (Fachada)
createWall(6, 8, 2, -5, 4, 0);  // Torre izquierda
createWall(6, 8, 2, 5, 4, 0);   // Torre derecha
createWall(4, 3, 2, 0, 6.5, 0); // Techo del arco

// Pasillo Interior
createWall(1, 6, 15, -2.5, 3, -7.5); // Pared izquierda
createWall(1, 6, 15, 2.5, 3, -7.5);  // Pared derecha
createWall(6, 1, 15, 0, 6, -7.5);    // Techo

// Columnas de la entrada
const colGeo = new THREE.CylinderGeometry(0.3, 0.3, 6, 5); // 5 caras para que se vea low-poly
const col1 = new THREE.Mesh(colGeo, wallMaterial);
col1.position.set(-1.8, 3, 0.5);
const col2 = col1.clone();
col2.position.set(1.8, 3, 0.5);
scene.add(col1, col2);

// Modelo visual de la antorcha
const torchGeo = new THREE.CylinderGeometry(0.1, 0.05, 0.5, 4);
const torch = new THREE.Mesh(torchGeo, torchMaterial);
torch.position.set(0, 3.2, -2);
scene.add(torch);

// --- 3.5. CREACIÓN DE ESPADA Y ESCUDO (Anclados a la Cámara) ---

// Creamos un contenedor (Rig) que se moverá y rotará de forma idéntica a la cámara
const weaponRig = new THREE.Group();
scene.add(weaponRig);

// ESPADA (Mano derecha)
const swordGroup = new THREE.Group();
swordGroup.position.set(0.35, -0.3, -0.6); // Posición inicial abajo a la derecha
swordGroup.rotation.set(0.2, -0.4, -0.2);

// Hoja de la espada (usando geometría de caja tipo muro)
const bladeGeo = new THREE.BoxGeometry(0.04, 0.6, 0.015);
const blade = new THREE.Mesh(bladeGeo, wallMaterial);
blade.position.y = 0.3; // Desplaza el origen a la base para facilitar rotaciones
swordGroup.add(blade);

// Guarda/Cresta de la espada
const guardGeo = new THREE.BoxGeometry(0.15, 0.03, 0.03);
const guard = new THREE.Mesh(guardGeo, darkIronMaterial);
guard.position.y = 0.015;
swordGroup.add(guard);

// Empuñadura
const hiltGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 4);
const hilt = new THREE.Mesh(hiltGeo, darkIronMaterial);
hilt.position.y = -0.075;
swordGroup.add(hilt);

weaponRig.add(swordGroup);

// ESCUDO (Mano izquierda)
const shieldGroup = new THREE.Group();
shieldGroup.position.set(-0.35, -0.25, -0.5); // Posición inicial abajo a la izquierda
shieldGroup.rotation.set(0.1, 0.4, 0.1);

// Cuerpo del escudo
const shieldPlateGeo = new THREE.BoxGeometry(0.22, 0.3, 0.02);
const shieldPlate = new THREE.Mesh(shieldPlateGeo, wallMaterial);
shieldGroup.add(shieldPlate);

// Refuerzo central del escudo (hierro oscuro)
const shieldBossGeo = new THREE.BoxGeometry(0.06, 0.32, 0.03);
const shieldBoss = new THREE.Mesh(shieldBossGeo, darkIronMaterial);
shieldGroup.add(shieldBoss);

weaponRig.add(shieldGroup);

// ============================================================================
// --- 4. SISTEMA DEL GOBLIN RETRO (OPTIMIZADO) ---
// ============================================================================

// --- VARIABLES GLOBALES DEL GOBLIN ---
let activeGoblin = null; 
let lastSpawnTime = 0;
const SPAWN_INTERVAL = 5000; // 5000 ms = 5 segundos para pruebas rápidas (puedes subirlo a 60000 después)

// --- MATERIALES REUTILIZABLES ---
const goblinSkin    = new THREE.MeshLambertMaterial({ color: 0x7fa963 }); // Verde claro vivo
const leatherVest   = new THREE.MeshLambertMaterial({ color: 0x5c4238 }); // Chaleco marrón oscuro
const pantsColor    = new THREE.MeshLambertMaterial({ color: 0x3e453c }); // Pantalón gris/verde oscuro
const boneColor     = new THREE.MeshLambertMaterial({ color: 0xdfd8c8 }); // Punta de lanza
const woodColor     = new THREE.MeshLambertMaterial({ color: 0x7d5c41 }); // Madera de lanza y escudo
const metalColor    = new THREE.MeshLambertMaterial({ color: 0x4a4a4a }); // Refuerzo de hierro simple
const eyeMat        = new THREE.MeshBasicMaterial({ color: 0xffea6c });   // Ojos amarillos brillantes

// --- GEOMETRÍAS REUTILIZABLES (MEMORIA OPTIMIZADA) ---
const bodyGeo       = new THREE.BoxGeometry(0.5, 0.7, 0.35);
const headGeo       = new THREE.BoxGeometry(0.4, 0.38, 0.38);
const earGeo        = new THREE.BoxGeometry(0.25, 0.08, 0.08);
const eyeGeo        = new THREE.BoxGeometry(0.07, 0.07, 0.07);

// Piernas (Pivote en la parte superior para rotar desde la cadera)
const legGeo        = new THREE.BoxGeometry(0.16, 0.4, 0.16);
legGeo.translate(0, -0.2, 0); 

const bootGeo       = new THREE.BoxGeometry(0.2, 0.15, 0.28);

// Brazos (Pivote en la parte superior para rotar desde el hombro)
const armGeo        = new THREE.BoxGeometry(0.12, 0.5, 0.12);
armGeo.translate(0, -0.25, 0);

// Equipamiento
const staffGeo      = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 4);
const tipGeo        = new THREE.ConeGeometry(0.08, 0.3, 4);
const plateGeo      = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 8);
const centerBossGeo = new THREE.BoxGeometry(0.08, 0.08, 0.06);


// --- FUNCIÓN DE MODELADO DEL GOBLIN RETRO ---
function createGoblin3D() {
    const goblinGroup = new THREE.Group();
    const meshesToFlash = []; // Para el efecto de daño y parpadeo

    // Función auxiliar para activar sombras y añadir al array de daño
    function setupMesh(mesh, addToFlash = true) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (addToFlash) {
            meshesToFlash.push(mesh);
        }
    }

    // 1. CUERPO
    const body = new THREE.Mesh(bodyGeo, leatherVest);
    body.position.y = 0.8;
    setupMesh(body);
    goblinGroup.add(body);

    // 2. CABEZA Y ROSTRO
    const head = new THREE.Mesh(headGeo, goblinSkin);
    head.position.set(0, 1.25, 0);
    setupMesh(head);
    goblinGroup.add(head);

    // Oreja Izquierda
    const earL = new THREE.Mesh(earGeo, goblinSkin);
    earL.position.set(-0.3, 1.28, -0.05);
    earL.rotation.set(0.1, -0.2, -0.3);
    setupMesh(earL);
    goblinGroup.add(earL);

    // Oreja Derecha
    const earR = earL.clone();
    earR.position.x = 0.3;
    earR.rotation.set(0.1, 0.2, 0.3);
    setupMesh(earR);
    goblinGroup.add(earR);

    // Ojos (No se meten al flash para que sigan viéndose amarillos en el daño)
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1, 1.28, 0.18);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;
    goblinGroup.add(eyeL, eyeR);

    // 3. PIERNAS Y BOTAS
    // Pierna Izquierda
    const legL = new THREE.Mesh(legGeo, pantsColor);
    legL.position.set(-0.18, 0.55, 0); 
    setupMesh(legL);
    goblinGroup.add(legL);

    // Pierna Derecha
    const legR = legL.clone();
    legR.position.x = 0.18;
    setupMesh(legR);
    goblinGroup.add(legR);

    // Botas
    const bootL = new THREE.Mesh(bootGeo, leatherVest);
    bootL.position.set(-0.18, 0.1, 0.04);
    setupMesh(bootL);
    goblinGroup.add(bootL);

    const bootR = bootL.clone();
    bootR.position.x = 0.18;
    setupMesh(bootR);
    goblinGroup.add(bootR);

    // 4. BRAZOS
    // Brazo Izquierdo
    const armL = new THREE.Mesh(armGeo, goblinSkin);
    armL.position.set(-0.32, 1.05, 0.1); 
    armL.rotation.x = -0.3;
    setupMesh(armL);
    goblinGroup.add(armL);

    // Brazo Derecho
    const armR = new THREE.Mesh(armGeo, goblinSkin);
    armR.position.set(0.32, 1.05, 0.1); 
    armR.rotation.x = -0.5;
    setupMesh(armR);
    goblinGroup.add(armR);

    // 5. EQUIPAMIENTO: LANZA RETRO
    const spearGroup = new THREE.Group();
    spearGroup.position.set(0.38, 0.8, 0.15);
    spearGroup.rotation.x = -0.2;

    const staff = new THREE.Mesh(staffGeo, woodColor);
    setupMesh(staff);
    spearGroup.add(staff);

    const tip = new THREE.Mesh(tipGeo, boneColor);
    tip.position.y = 0.9;
    setupMesh(tip);
    spearGroup.add(tip);

    goblinGroup.add(spearGroup);

    // 6. EQUIPAMIENTO: ESCUDO REDONDO
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(-0.45, 0.75, 0.25);
    shieldGroup.rotation.y = 0.4;

    const plate = new THREE.Mesh(plateGeo, woodColor);
    plate.rotation.x = Math.PI / 2;
    setupMesh(plate);
    shieldGroup.add(plate);

    const centerBoss = new THREE.Mesh(centerBossGeo, metalColor);
    centerBoss.position.z = 0.02;
    setupMesh(centerBoss);
    shieldGroup.add(centerBoss);

    goblinGroup.add(shieldGroup);

    // Guardar estado en userData para que las lógicas de daño sigan funcionando intactas
    goblinGroup.userData = {
        life: 3,
        meshes: meshesToFlash,
        isHurt: false,
        hurtTimer: 0
    };

    return goblinGroup;
}

// --- FUNCIÓN DE SPAWN ---
function spawnGoblin() {
    // Si ya hay uno vivo, salimos
    if (activeGoblin) return;

    activeGoblin = createGoblin3D();
    
    // Aparece al fondo del pasillo (z = -15), en la oscuridad total de la neblina
    activeGoblin.position.set(0, 0, -15); 
    scene.add(activeGoblin);
    console.log("¡Un nuevo goblin retro acecha desde la oscuridad!");
}


// ==========================================================
// --- 5. MECÁNICAS DE ATAQUE Y VARIABLES DE COMBATE (PC) ---
// ==========================================================

// DECLARACIÓN ÚNICA DE VARIABLES (Se definen aquí para todo el script)
let isAttacking = false;
let attackTime = -1;         // Declarada una sola vez con su valor inicial
const ATTACK_DURATION = 0.4; // Duración en segundos de la estocada

let shieldActive = false;
let currentShieldDefense = 0; // 0 = Reposo, 1 = Levantado cubriendo pantalla

// Escuchar click para atacar
window.addEventListener('click', () => {
    if (isAttacking) return;
    isAttacking = true;
    attackTime = 0;

    // Intentar golpear al goblin si está en rango
    checkPlayerHit();
});

function checkPlayerHit() {
    if (!activeGoblin) return;

    // Calcular distancia entre la cámara y el goblin
    const distance = camera.position.distanceTo(activeGoblin.position);

    // Rango de golpe cuerpo a cuerpo razonable (ej. 2.5 metros)
    if (distance < 2.5) {
        damageGoblin();
    }
}

function damageGoblin() {
    if (!activeGoblin || activeGoblin.userData.isHurt) return;

    activeGoblin.userData.life -= 1;
    activeGoblin.userData.isHurt = true;
    activeGoblin.userData.hurtTimer = 0.2; // Duración del parpadeo rojo (0.2s)

    // Efecto visual: Cambiar materiales temporalmente a rojo brillante
    const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    activeGoblin.userData.meshes.forEach(mesh => {
        mesh.userData.originalMaterial = mesh.material; // Guardar original
        mesh.material = flashMaterial;
    });

    console.log(`¡Golpeaste al goblin! Vida restante: ${activeGoblin.userData.life}`);

    if (activeGoblin.userData.life <= 0) {
        console.log("¡El goblin ha muerto!");
        // Pequeño delay para que se note el último golpe antes de desaparecer
        setTimeout(() => {
            scene.remove(activeGoblin);
            activeGoblin = null;
        }, 150);
    }
}

// --- 4. CONTROLES DE MOVIMIENTO ---
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let yaw = 0;
let pitch = 0;
const mouseSensitivity = 0.002;

// Variables para la rotación fija por teclado de 90 grados
let targetYaw = 0; 
const ROTATION_SPEED = 10; // Velocidad de la transición de giro


// Eventos de teclado
document.addEventListener('keydown', (e) => {
    if (document.pointerLockElement !== document.body) return;

    switch (e.code) {
        // Movimiento
        case 'KeyW': 
        case 'ArrowUp': 
            moveForward = true; 
            break;
        case 'KeyS': 
        case 'ArrowDown': 
            moveBackward = true; 
            break;
        case 'KeyA': 
        case 'ArrowLeft': 
            moveLeft = true; 
            break;
        case 'KeyD': 
        case 'ArrowRight': 
            moveRight = true; 
            break;
        
        // Rotación rápida de cámara (90 grados)
        case 'KeyQ': 
            targetYaw += Math.PI / 2; // +90 grados en radianes
            break;
        case 'KeyE': 
            targetYaw -= Math.PI / 2; // -90 grados en radianes
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': 
        case 'ArrowUp': 
            moveForward = false; 
            break;
        case 'KeyS': 
        case 'ArrowDown': 
            moveBackward = false; 
            break;
        case 'KeyA': 
        case 'ArrowLeft': 
            moveLeft = false; 
            break;
        case 'KeyD': 
        case 'ArrowRight': 
            moveRight = false; 
            break;
    }
});

// 2. CAPTURA DEL CURSOR (Pointer Lock API)
const instrucciones = document.getElementById('instrucciones');

if (instrucciones) {
    instrucciones.addEventListener('click', () => {
        document.body.requestPointerLock();
    });
}

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body) {
        if (instrucciones) instrucciones.style.display = 'none';
    } else {
        if (instrucciones) instrucciones.style.display = 'block';
    }
});

// 3. MOVIMIENTO DE CÁMARA CON EL MOUSE
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== document.body) return;

    yaw -= e.movementX * mouseSensitivity;
    pitch -= e.movementY * mouseSensitivity;

    // Bloqueo de ángulo vertical para no dar vuelta la cabeza
    pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));

    camera.rotation.set(0, 0, 0);
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.order = "YXZ"; // Clave para mantener el horizonte estable al rotar
});

// 4. CONTROLES DE COMBATE (RATÓN - CLIC IZQUIERDO Y DERECHO)

// Desactivar el menú contextual del clic derecho para que no moleste al defenderse
document.addEventListener('contextmenu', (e) => {
    if (document.pointerLockElement === document.body) {
        e.preventDefault();
    }
});

// Detectar clics del mouse (Atacar y Defender)
document.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement !== document.body) return;

    if (e.button === 0) {
        // Clic Izquierdo -> ATACAR
        triggerAtaque();
    } else if (e.button === 2) {
        // Clic Derecho -> DEFENDER (Activar escudo)
        setShieldState(true);
    }
});

document.addEventListener('mouseup', (e) => {
    if (document.pointerLockElement !== document.body) return;

    if (e.button === 2) {
        // Soltar Clic Derecho -> BAJAR ESCUDO
        setShieldState(false);
    }
});

// --- FUNCIONES REUTILIZABLES DE COMBATE ---


// ==========================================
// --- 5. MECÁNICAS DE ATAQUE Y ESCUDO ---
// ==========================================

// Función para iniciar la animación de ataque
function triggerAtaque() {
    if (attackTime >= 0) return; // Si ya está atacando, ignorar

    // Efecto visual de sacudida en la interfaz (CSS)
    if (container) {
        container.classList.remove('shake-effect');
        void container.offsetWidth; // Truco de reflujo para reiniciar la animación CSS
        container.classList.add('shake-effect');
    }

    attackTime = 0; // Inicia la animación en el bucle principal (animate)
}

// Esta función se llama automáticamente en el bucle principal a mitad de la estocada
function checkPlayerHit() {
    if (!activeGoblin) return;

    // Calcular distancia entre la cámara y el goblin
    const distance = camera.position.distanceTo(activeGoblin.position);

    // Rango de golpe cuerpo a cuerpo (2.5 metros es ideal para este pasillo)
    if (distance < 2.5) {
        damageGoblin();
    }
}

function damageGoblin() {
    // Si no hay goblin o ya está herido (parpadeando en rojo), ignorar
    if (!activeGoblin || activeGoblin.userData.isHurt) return;

    activeGoblin.userData.life -= 1;
    activeGoblin.userData.isHurt = true;
    activeGoblin.userData.hurtTimer = 0.2; // 0.2 segundos de parpadeo rojo

    // Guardar materiales originales y pintar al goblin de rojo brillante
    const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    activeGoblin.userData.meshes.forEach(mesh => {
        mesh.userData.originalMaterial = mesh.material;
        mesh.material = flashMaterial;
    });

    console.log(`¡Impacto! Vida del goblin: ${activeGoblin.userData.life}/3`);

    // Comprobar si muere
    if (activeGoblin.userData.life <= 0) {
        console.log("¡Goblin exterminado!");
        
        // Lo removemos de la escena tras un leve retraso para que se note el último parpadeo rojo
        setTimeout(() => {
            if (activeGoblin) {
                scene.remove(activeGoblin);
                activeGoblin = null; // Queda libre para que el spawner cree otro al minuto
            }
        }, 200);
    }
}

// Función para cambiar el estado del escudo (subido/bajado)
function setShieldState(active) {
    shieldActive = active;
    const shieldOverlay = document.getElementById('shield-overlay');
    const btn = document.getElementById('btn-escudo');

    if (shieldActive) {
        if (shieldOverlay) shieldOverlay.classList.add('shield-active');
        if (btn) {
            btn.style.backgroundColor = "#ffaa44";
            btn.style.color = "#16121e";
        }
    } else {
        if (shieldOverlay) shieldOverlay.classList.remove('shield-active');
        if (btn) {
            btn.style.backgroundColor = "#3f285c";
            btn.style.color = "#ffaa44";
        }
    }
}

// ==========================================
// --- 6. ASIGNACIÓN DE EVENTOS DE BOTONES ---
// ==========================================

const btnAtaque = document.getElementById('btn-ataque');
const btnEscudo = document.getElementById('btn-escudo');

// BOTÓN DE ATAQUE (Círculo Grande)
if (btnAtaque) {
    btnAtaque.addEventListener('click', (e) => {
        e.preventDefault();
        triggerAtaque();
    });
    btnAtaque.addEventListener('touchstart', (e) => {
        e.preventDefault();
        triggerAtaque();
    }, { passive: false });
}

// BOTÓN DE ESCUDO (Círculo Chico)
if (btnEscudo) {
    btnEscudo.addEventListener('touchstart', (e) => {
        e.preventDefault();
        setShieldState(true);
    }, { passive: false });

    btnEscudo.addEventListener('touchend', (e) => {
        e.preventDefault();
        setShieldState(false);
    }, { passive: false });

    btnEscudo.addEventListener('click', (e) => {
        e.preventDefault();
        setShieldState(!shieldActive);
    });
}

// BOTÓN DE ITEMS
const btnItems = document.getElementById('btn-items');
if (btnItems) {
    const triggerItems = (e) => {
        e.preventDefault();
        const overlay = document.getElementById('heal-overlay');
        if (overlay) {
            overlay.classList.remove('flash-effect');
            void overlay.offsetWidth; 
            overlay.classList.add('flash-effect');
        }
    };
    btnItems.addEventListener('click', triggerItems);
    btnItems.addEventListener('touchstart', triggerItems, { passive: false });
}

// ==========================================
// --- ANIMACIONES DE COMBATE Y CONTROLES ---
// ==========================================

// Obtener referencias a los elementos del DOM una sola vez (Definiciones limpias de duplicados)
const containerEl = document.getElementById('game-container');
const healOverlayEl = document.getElementById('heal-overlay');
const shieldOverlayEl = document.getElementById('shield-overlay');
const btnAtaqueEl = document.getElementById('btn-ataque');
const btnEscudoEl = document.getElementById('btn-escudo');
const btnItemsEl = document.getElementById('btn-items');

// 2. EVENT LISTENERS UNIFICADOS

// Botón de Ataque: Activa la sacudida de pantalla (CSS) e inicia la animación de la espada (3D)
if (btnAtaqueEl) {
    btnAtaqueEl.addEventListener('click', () => {
        // Efecto CSS de sacudida
        containerEl.classList.remove('shake-effect');
        void containerEl.offsetWidth; // Truco de reflow para reiniciar la animación
        containerEl.add('shake-effect');

        // Lógica de animación 3D de la espada
        if (attackTime < 0) {
            attackTime = 0; 
        }
    });
}

// Botón de Escudo: Enciende el overlay azul (CSS), cambia el estilo del botón y activa la guardia (3D)
if (btnEscudoEl) {
    btnEscudoEl.addEventListener('click', () => {
        shieldActive = !shieldActive; // Alterna el estado (true/false)

        if (shieldActive) {
            // Activar visuales (CSS)
            shieldOverlayEl.classList.add('shield-active');
            btnEscudoEl.style.backgroundColor = "#ffaa44";
            btnEscudoEl.style.color = "#16121e";
        } else {
            // Desactivar visuales (CSS)
            shieldOverlayEl.classList.remove('shield-active');
            btnEscudoEl.style.backgroundColor = "#3f285c";
            btnEscudoEl.style.color = "#ffaa44";
        }
    });
}

// Botón de Pociones/Items: Activa un destello verde en pantalla (CSS)
if (btnItemsEl) {
    btnItemsEl.addEventListener('click', () => {
        // Reiniciar y ejecutar animación de destello verde
        healOverlayEl.classList.remove('flash-effect');
        void healOverlayEl.offsetWidth; // Reflow
        healOverlayEl.classList.add('flash-effect');
    });
}

// --- 5. BUCLE DE RENDERIZACIÓN UNIFICADO ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // ==========================================
    // 1. CONTROL DEL JUGADOR Y MOVIMIENTO (PC)
    // ==========================================
    if (document.pointerLockElement === document.body) {

        // Interpolación (Lerp) de rotación rápida de cámara (Q / E)
        yaw += (targetYaw - yaw) * ROTATION_SPEED * delta;

        // Aplicamos las rotaciones calculadas a la cámara
        camera.rotation.set(0, 0, 0);
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
        camera.order = "YXZ"; 

        // Fricción suave para detenernos progresivamente al caminar
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const playerSpeed = 40.0; 

        if (moveForward || moveBackward) velocity.z -= direction.z * playerSpeed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * playerSpeed * delta;

        // Desplazamiento relativo a la mirada del jugador (solo plano XZ)
        const camRotation = yaw;
        camera.position.x += (velocity.x * Math.cos(camRotation) + velocity.z * Math.sin(camRotation)) * delta;
        camera.position.z += (velocity.z * Math.cos(camRotation) - velocity.x * Math.sin(camRotation)) * delta;

        // Límites del mapa para no salirnos del suelo
        camera.position.x = Math.max(-10, Math.min(10, camera.position.x));
        camera.position.z = Math.max(-20, Math.min(25, camera.position.z));
    }

    // ==========================================
    // 2. SISTEMA DE ILUMINACIÓN (Antorcha parpadeante)
    // ==========================================
    torchLight.intensity = 2.5 + Math.sin(elapsedTime * 10) * 0.4 + Math.random() * 0.1;

    // ==========================================
    // 3. SPAWNER Y COMPORTAMIENTO DEL GOBLIN (IA / Daño)
    // ==========================================
    
    // Temporizador para aparición del Goblin (Cada 1 minuto)
    const currentTimeMs = Date.now();
    if (currentTimeMs - lastSpawnTime >= SPAWN_INTERVAL) {
        spawnGoblin();
        lastSpawnTime = currentTimeMs;
    }

    if (activeGoblin) {
        // El goblin camina lentamente hacia la posición actual del jugador en el eje Z
        const goblinSpeed = 1.5; // Metros por segundo
        if (activeGoblin.position.z < camera.position.z - 0.8) {
            activeGoblin.position.z += goblinSpeed * delta;
        } else {
            // El goblin llegó al jugador: hace temblar las armas/rig como ataque
            weaponRig.position.y = camera.position.y - 0.1 + Math.sin(elapsedTime * 20) * 0.05; 
        }

        // Recuperación de daño (Restaurar color original del goblin tras parpadear en rojo)
        if (activeGoblin.userData.isHurt) {
            activeGoblin.userData.hurtTimer -= delta;
            if (activeGoblin.userData.hurtTimer <= 0) {
                activeGoblin.userData.isHurt = false;
                activeGoblin.userData.meshes.forEach(mesh => {
                    mesh.material = mesh.userData.originalMaterial; // Restaurar material original
                });
            }
        }
    }

    // ==========================================
    // 4. ANIMACIÓN Y RIGGING DE ARMAS (Espada y Escudo)
    // ==========================================
    
    // El contenedor copia exactamente la posición y orientación del jugador
    weaponRig.position.copy(camera.position);
    weaponRig.rotation.copy(camera.rotation);

    // Animación de balanceo al caminar (Bobbing)
    const isMoving = (moveForward || moveBackward || moveLeft || moveRight) && (document.pointerLockElement === document.body);
    let bobbingX = 0;
    let bobbingY = 0;
    if (isMoving) {
        bobbingX = Math.sin(elapsedTime * 12) * 0.015;
        bobbingY = Math.cos(elapsedTime * 24) * 0.01;
    }

    // --- ANIMACIÓN ESCUDO (Interpolación / Lerp) ---
    // Si shieldActive es true, sube al centro para cubrirnos. Si no, baja al lateral.
    const targetDefense = shieldActive ? 1.0 : 0.0;
    currentShieldDefense += (targetDefense - currentShieldDefense) * 12 * delta; // Transición suave

    shieldGroup.position.x = THREE.MathUtils.lerp(-0.35, -0.05, currentShieldDefense) + bobbingX;
    shieldGroup.position.y = THREE.MathUtils.lerp(-0.25, -0.05, currentShieldDefense) + bobbingY;
    shieldGroup.position.z = THREE.MathUtils.lerp(-0.5, -0.35, currentShieldDefense);
    shieldGroup.rotation.y = THREE.MathUtils.lerp(0.4, 0.9, currentShieldDefense);
    shieldGroup.rotation.x = THREE.MathUtils.lerp(0.1, 0.2, currentShieldDefense);

 
    // --- ANIMACIÓN ESPADA (Estocada clásica) ---
    if (attackTime >= 0) {
        // 1. Guardamos el progreso anterior antes de actualizar el tiempo
        const previousProgress = attackTime / ATTACK_DURATION;
        
        // 2. Avanzamos el tiempo de la animación
        attackTime += delta;
        const progress = attackTime / ATTACK_DURATION;

        // 3. DETECCIÓN DE GOLPE: Justo cuando cruza el 30% (extensión máxima)
        if (previousProgress < 0.3 && progress >= 0.3) {
            checkPlayerHit();
        }

        // 4. Controlar el ciclo de la animación
        if (progress > 1.0) {
            // Fin de la animación: Regresar por completo al reposo
            attackTime = -1;
            swordGroup.position.set(0.35, -0.3, -0.6);
            swordGroup.rotation.set(0.2, -0.4, -0.2);
        } else {
            // Interpolación de movimiento (Estocada)
            let zOffset, rotX, rotY;
            if (progress < 0.3) {
                // Ida rápida hacia adelante (0.0 a 0.3)
                const p = progress / 0.3; 
                zOffset = THREE.MathUtils.lerp(-0.6, -0.9, p); 
                rotX = THREE.MathUtils.lerp(0.2, -0.5, p);     
                rotY = THREE.MathUtils.lerp(-0.4, -0.1, p);
            } else {
                // Retorno lento a la posición inicial (0.3 a 1.0)
                const p = (progress - 0.3) / 0.7; 
                zOffset = THREE.MathUtils.lerp(-0.9, -0.6, p); 
                rotX = THREE.MathUtils.lerp(-0.5, 0.2, p);
                rotY = THREE.MathUtils.lerp(-0.1, -0.4, p);
            }
            
            // Aplicar la posición y rotación calculada a la espada
            swordGroup.position.set(0.35 - (progress * 0.15), -0.3 + (progress * 0.05), zOffset);
            swordGroup.rotation.set(rotX, rotY, -0.2);
        }
    } else {
        // En reposo: La espada acompaña el vaivén (bobbing) del jugador al caminar
        swordGroup.position.set(0.35 + bobbingX, -0.3 + bobbingY, -0.6);
    }

    renderer.render(scene, camera);
}

// Adaptación de tamaño manteniendo la proporción pixelada
window.addEventListener('resize', () => {
    camera.aspect = RETRO_WIDTH / RETRO_HEIGHT;
    camera.updateProjectionMatrix();
});

// Iniciar juego spawneando el primer Goblin de inmediato al cargar la página
spawnGoblin();

// Arrancar el bucle
animate();