// ==========================================
// ESTRUCTURA PRINCIPAL DEL JUEGO
// ==========================================

////////////////////////////////////////////////////////////////////////////////////////////// --- INITS ---

const RETRO_WIDTH = 320;
const RETRO_HEIGHT = 180;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a050f, 0.05); // Neblina oscura de ambiente

const camera = new THREE.PerspectiveCamera(70, RETRO_WIDTH / RETRO_HEIGHT, 0.1, 100);
camera.position.set(0, 1.6, 12); // Altura de los ojos (1.6m)

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(RETRO_WIDTH, RETRO_HEIGHT, false); // "false" evita que ThreeJS altere el style CSS del canvas
document.body.appendChild(renderer.domElement);

// --- CORE ---
let isTouching = false;
let lastTouchX = 0;
let lastTouchY = 0;

// Metemos el canvas dentro de nuestro contenedor de juego controlado por CSS
const container = document.getElementById('game-container');
container.appendChild(renderer.domElement);

////////////////////////////////////////////////////////////////////////////////////////////// --- MAPAS ---

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


///////////////////////////////////////////////////////////////////////////////////////////// --- ENTITIES ---

// --- 4. SISTEMA DEL GOBLIN ---

// Materiales del Goblin
const goblinSkinMat = new THREE.MeshLambertMaterial({ color: 0x4a7c59 }); // Verde monstruo
const goblinClothMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 }); // Trapo marrón
const goblinRedEyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Ojos rojos brillantes

let activeGoblin = null; 
const SPAWN_INTERVAL = 60000; // 60000 ms = 1 minuto (bájalo a 5000 para pruebas rápidas)
let lastSpawnTime = 0;

// Función para modelar jerárquicamente un Goblin Low-Poly
function createGoblin3D() {
    const goblinGroup = new THREE.Group();

    // Cuerpo / Torso
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const body = new THREE.Mesh(bodyGeo, goblinClothMat);
    body.position.y = 0.7;
    goblinGroup.add(body);

    // Cabeza (Alargada y orejona)
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const head = new THREE.Mesh(headGeo, goblinSkinMat);
    head.position.set(0, 1.2, 0);
    goblinGroup.add(head);

    // Oreja Izquierda
    const earLGeo = new THREE.BoxGeometry(0.3, 0.1, 0.1);
    const earL = new THREE.Mesh(earLGeo, goblinSkinMat);
    earL.position.set(-0.3, 1.2, 0);
    earL.rotation.z = -0.2;
    goblinGroup.add(earL);

    // Oreja Derecha
    const earR = earL.clone();
    earR.position.x = 0.3;
    earR.rotation.z = 0.2;
    goblinGroup.add(earR);

    // Ojos Rojos
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const eyeL = new THREE.Mesh(eyeGeo, goblinRedEyeMat);
    eyeL.position.set(-0.1, 1.25, 0.18);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;
    goblinGroup.add(eyeL, eyeR);

    // Extremidades inferiores (Piernas simples)
    const legGeo = new THREE.BoxGeometry(0.18, 0.4, 0.18);
    const legL = new THREE.Mesh(legGeo, goblinSkinMat);
    legL.position.set(-0.2, 0.2, 0);
    const legR = legL.clone();
    legR.position.x = 0.2;
    goblinGroup.add(legL, legR);

    // Guardar referencia de las partes para efectos visuales (como parpadear en rojo)
    goblinGroup.userData = {
        life: 3,
        meshes: [body, head, earL, earR, legL, legR],
        isHurt: false,
        hurtTimer: 0
    };

    return goblinGroup;
}

function spawnGoblin() {
    // Si ya hay uno vivo, no spawneamos otro para mantener el duelo simple
    if (activeGoblin) return;

    activeGoblin = createGoblin3D();
    
    // Aparece al fondo del pasillo (z = -15), en la oscuridad total de la neblina
    activeGoblin.position.set(0, 0, -15); 
    scene.add(activeGoblin);
    console.log("¡Un goblin acecha desde la oscuridad!");
}



/////////////////////////////////////////////////////////////////////////////////////////////// --- INVENTORY ---
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



///////////////////////////////////////////////////////////////////////////////////////////// --- COMBATE ---


// --- 5. MECÁNICAS DE ATAQUE Y VARIABLES DE COMBATE (PC) ---


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
//////////////////////////////////////////////////////////////////////////////////////////////// --- MOVIMIENTO ---

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

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
//let isTouching = false;
//let lastTouchX = 0;
//let lastTouchY = 0;

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

// Función que inicia el modo juego (oculta menú y bloquea puntero si es posible)
const iniciarJuego = (e) => {
    if (e) e.preventDefault();
    
    // Solo intentamos bloquear el puntero si estamos en escritorio
    // Android no soporta pointerLock, así que ignoramos el error si falla
    if (document.body.requestPointerLock) {
        document.body.requestPointerLock();
    }
    
    if (instrucciones) instrucciones.style.display = 'none';
};

// Evento para mouse (PC)
if (instrucciones) {
    instrucciones.addEventListener('click', iniciarJuego);
}

// Evento para táctil (Móvil)
if (instrucciones) {
    instrucciones.addEventListener('touchstart', iniciarJuego, { passive: false });
}

// Escucha cuando el estado de bloqueo cambia
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body) {
        if (instrucciones) instrucciones.style.display = 'none';
    } else {
        // Solo mostramos el menú si no estamos en móvil (donde el cursor no existe)
        if (instrucciones && !isMobile) {
            instrucciones.style.display = 'block';
        }
    }
});


// CONTROL MOUSE (PC)
document.addEventListener('mousemove', (e) => {
    // Solo si no es móvil y el puntero está bloqueado
    if (!isMobile && document.pointerLockElement === document.body) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
    }
});

// --- CONTROL TÁCTIL (Móvil) ---
window.addEventListener('touchstart', (e) => {
    // Solo activamos si es dispositivo móvil y no toca un botón
    const target = e.target;
    if (isMobile && !target.closest('.interactive')) {
        isTouching = true;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (isMobile && isTouching) {
        e.preventDefault(); 
        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;
        
        yaw -= deltaX * 0.005; 
        pitch -= deltaY * 0.005;
        
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    // Evitamos scroll en la página mientras jugamos
    if (isTouching) {
        e.preventDefault(); 
        
        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;
        
        // Ajusta sensibilidad: 0.005 es más suave que 0.01 para dispositivos móviles
        yaw -= deltaX * 0.005; 
        pitch -= deltaY * 0.005;
        
        // Limitar la inclinación vertical para que no se dé la vuelta completa
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
    }
}, { passive: false });

window.addEventListener('touchend', () => { 
    isTouching = false; 
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

//////////////////////////////////////////////////////////////////////////////////////////////////// --- GUI ---
// ==========================================
// --- 6. ASIGNACIÓN DE EVENTOS DE BOTONES ---
// ==========================================

const containerEl = document.getElementById('game-container');
const healOverlayEl = document.getElementById('heal-overlay');
const shieldOverlayEl = document.getElementById('shield-overlay');
const btnAtaqueEl = document.getElementById('btn-ataque');
const btnEscudoEl = document.getElementById('btn-escudo');
const btnItemsEl = document.getElementById('btn-items');

// Función de ayuda para prevenir ejecución doble
const preventDefault = (e) => {
    e.preventDefault();
    e.stopPropagation();
};

// BOTÓN DE ATAQUE
if (btnAtaqueEl) {
    const actionAtaque = (e) => {
        preventDefault(e);
        // Efecto CSS
        containerEl.classList.remove('shake-effect');
        void containerEl.offsetWidth; 
        containerEl.classList.add('shake-effect'); // Corregido: faltaba .classList

        // Lógica 3D
        if (typeof triggerAtaque === 'function') triggerAtaque();
        if (typeof attackTime !== 'undefined' && attackTime < 0) attackTime = 0;
    };

    btnAtaqueEl.addEventListener('click', actionAtaque);
    btnAtaqueEl.addEventListener('touchstart', actionAtaque, { passive: false });
}

// BOTÓN DE ESCUDO
if (btnEscudoEl) {
    // Eventos táctiles para mantener presionado
    btnEscudoEl.addEventListener('touchstart', (e) => {
        preventDefault(e);
        setShieldState(true);
    }, { passive: false });

    btnEscudoEl.addEventListener('touchend', (e) => {
        preventDefault(e);
        setShieldState(false);
    }, { passive: false });

    // Click para toggles de escritorio
    btnEscudoEl.addEventListener('click', (e) => {
        preventDefault(e);
        setShieldState(!shieldActive);
    });
}

// BOTÓN DE ITEMS
if (btnItemsEl) {
    const actionItems = (e) => {
        preventDefault(e);
        if (healOverlayEl) {
            healOverlayEl.classList.remove('flash-effect');
            void healOverlayEl.offsetWidth; 
            healOverlayEl.classList.add('flash-effect');
        }
    };
    btnItemsEl.addEventListener('click', actionItems);
    btnItemsEl.addEventListener('touchstart', actionItems, { passive: false });
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
 /////////////////////////////////////////////////////////////////////////////////// --- MAIN --
  
// --- 5. BUCLE DE RENDERIZACIÓN UNIFICADO ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // ==========================================
   // 1. CONTROL DEL JUGADOR Y MOVIMIENTO (UNIFICADO)
// ==========================================

// 1.1 ROTACIÓN (Calculada tanto por Mouse como por Touch)
yaw += (targetYaw - yaw) * ROTATION_SPEED * delta;
pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));

camera.rotation.set(pitch, yaw, 0); 
camera.order = "YXZ"; 

// 1.2 MOVIMIENTO (Físicas, ahora siempre activas)
// Fricción suave
velocity.x -= velocity.x * 10.0 * delta;
velocity.z -= velocity.z * 10.0 * delta;

// Dirección según teclas
direction.z = Number(moveForward) - Number(moveBackward);
direction.x = Number(moveRight) - Number(moveLeft);
direction.normalize();

const playerSpeed = 40.0;
if (moveForward || moveBackward) velocity.z -= direction.z * playerSpeed * delta;
if (moveLeft || moveRight) velocity.x -= direction.x * playerSpeed * delta;

// Desplazamiento relativo a la mirada (yaw)
camera.position.x += (velocity.x * Math.cos(yaw) + velocity.z * Math.sin(yaw)) * delta;
camera.position.z += (velocity.z * Math.cos(yaw) - velocity.x * Math.sin(yaw)) * delta;

// Límites del mapa
camera.position.x = Math.max(-10, Math.min(10, camera.position.x));
camera.position.z = Math.max(-20, Math.min(25, camera.position.z));
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
        attackTime += delta;
        const progress = attackTime / ATTACK_DURATION;
// --- ANIMACIÓN ESPADA (Estocada clásica) ---
    if (attackTime >= 0) {
        const previousProgress = attackTime / ATTACK_DURATION;
        attackTime += delta;
        const progress = attackTime / ATTACK_DURATION;

        // DETECCIÓN DE GOLPE: Justo cuando la espada se extiende al máximo (30% de la animación)
        if (previousProgress < 0.3 && progress >= 0.3) {
            checkPlayerHit();
        }

        if (progress > 1.0) {
            // Fin de la animación, regresa al reposo
            attackTime = -1;
            swordGroup.position.set(0.35, -0.3, -0.6);
            swordGroup.rotation.set(0.2, -0.4, -0.2);
        } else {
            // Fase de estocada rápida (0.0 a 0.3) y retorno lento (0.3 a 1.0)
            let zOffset, rotX, rotY;
            if (progress < 0.3) {
                const p = progress / 0.3; // Escala de 0 a 1
                zOffset = THREE.MathUtils.lerp(-0.6, -0.9, p); // Estira hacia adelante
                rotX = THREE.MathUtils.lerp(0.2, -0.5, p);     // Apunta hacia abajo
                rotY = THREE.MathUtils.lerp(-0.4, -0.1, p);
            } else {
                const p = (progress - 0.3) / 0.7; // Retorno lento
                zOffset = THREE.MathUtils.lerp(-0.9, -0.6, p); // Regresa
                rotX = THREE.MathUtils.lerp(-0.5, 0.2, p);
                rotY = THREE.MathUtils.lerp(-0.1, -0.4, p);
            }
            swordGroup.position.set(0.35 - (progress * 0.15), -0.3 + (progress * 0.05), zOffset);
            swordGroup.rotation.set(rotX, rotY, -0.2);
        }
    } else {
        // En reposo, solo tiene el sutil vaivén (bobbing) si caminas
        swordGroup.position.set(0.35 + bobbingX, -0.3 + bobbingY, -0.6);
    }
        if (progress > 1.0) {
            // Fin de la animación
            attackTime = -1;
            swordGroup.position.set(0.35, -0.3, -0.6);
            swordGroup.rotation.set(0.2, -0.4, -0.2);
        } else {
            // Fase de estocada rápida (0.0 a 0.3) y retorno lento (0.3 a 1.0)
            let zOffset, rotX, rotY;
            if (progress < 0.3) {
                const p = progress / 0.3; // Escala a un rango entre 0 - 1
                zOffset = THREE.MathUtils.lerp(-0.6, -0.9, p); // Lanza hacia adelante
                rotX = THREE.MathUtils.lerp(0.2, -0.5, p);     // Inclina la punta abajo
                rotY = THREE.MathUtils.lerp(-0.4, -0.1, p);
            } else {
                const p = (progress - 0.3) / 0.7; // Escala de retorno entre 0 - 1
                zOffset = THREE.MathUtils.lerp(-0.9, -0.6, p); // Vuelve a su sitio
                rotX = THREE.MathUtils.lerp(-0.5, 0.2, p);
                rotY = THREE.MathUtils.lerp(-0.1, -0.4, p);
            }
            swordGroup.position.set(0.35 - (progress * 0.15), -0.3 + (progress * 0.05), zOffset);
            swordGroup.rotation.set(rotX, rotY, -0.2);
        }
    } else {
        // En reposo, solo tiene el sutil vaivén (bobbing) si estás caminando
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