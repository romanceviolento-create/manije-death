let mapaBytes = null;
let imagenesCargadas = {};
let diccionario = {};
let posX = 0;
let posY = 0;
let intervaloMovimiento = null;

const offsetReal = 1078; 
const MAPA_ANCHO = 1000;

async function iniciarJuego() {
    try {
        // Carga de archivos (recursosi.txt sin guion bajo para evitar bloqueo de Jekyll)
        const [respBin, respTxt] = await Promise.all([
            fetch('assets/mapas/mapa.bmp'), 
            fetch('assets/bmp/recursosi.txt?v=1') 
        ]);
        
        if (!respBin.ok) throw new Error("No se pudo cargar el mapa (.bmp)");
        if (!respTxt.ok) throw new Error("No se pudo cargar el archivo de recursos (.txt)");
        
        const arrayBuffer = await respBin.arrayBuffer();
        mapaBytes = new Uint8Array(arrayBuffer);
        
        const texto = await respTxt.text();
        texto.split('\n').forEach(linea => {
            const p = linea.split(',');
            if (p.length >= 5) diccionario[parseInt(p[0].trim())] = p[4].trim();
        });

        // Cargamos imágenes
        for (let id in diccionario) {
            let img = new Image();
            img.src = 'assets/bmp/' + diccionario[id];
            img.onload = () => {
                imagenesCargadas[id] = img;
                dibujarMapa();
            };
            img.onerror = () => console.error("Error al cargar imagen: " + img.src);
        }

        configurarControles();
        setTimeout(dibujarMapa, 500);
    } catch (err) { 
        console.error("Error al cargar:", err); 
    }
}

function dibujarMapa() {
    const canvas = document.getElementById('miCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!mapaBytes) return;

    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 20; x++) {
            let index = offsetReal + ((posY + y) * MAPA_ANCHO + (posX + x));
            let tileId = mapaBytes[index] || 0;
            let img = imagenesCargadas[tileId];

            if (img) {
                ctx.drawImage(img, x * 32, y * 32, 32, 32);
            } else {
                ctx.fillStyle = "#111";
                ctx.fillRect(x * 32, y * 32, 32, 32);
            }
        }
    }
}

function configurarControles() {
    const canvas = document.getElementById('miCanvas');
    
    // Lógica de movimiento para móvil
    const procesarToque = (e) => {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        const dx = touchX - (rect.width / 2);
        const dy = touchY - (rect.height / 2);

        // Zona muerta (10% del ancho) para evitar movimientos involuntarios al tocar el centro
        if (Math.abs(dx) < rect.width * 0.1 && Math.abs(dy) < rect.height * 0.1) return;

        if (Math.abs(dy) > Math.abs(dx)) {
            if (dy < 0) posY = Math.max(0, posY - 1); // Arriba
            else posY += 1; // Abajo
        } else {
            if (dx < 0) posX = Math.max(0, posX - 1); // Izquierda
            else posX += 1; // Derecha
        }
        dibujarMapa();
    };

    // Eventos táctiles
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!intervaloMovimiento) {
            procesarToque(e);
            intervaloMovimiento = setInterval(() => procesarToque(e), 150);
        }
    }, {passive: false});

    const limpiarMovimiento = () => {
        clearInterval(intervaloMovimiento);
        intervaloMovimiento = null;
    };

    canvas.addEventListener('touchend', limpiarMovimiento);
    canvas.addEventListener('touchcancel', limpiarMovimiento);

    // Controles de teclado para PC
    window.addEventListener('keydown', (e) => {
        if (e.key === 'w') posY = Math.max(0, posY - 1);
        if (e.key === 's') posY += 1;
        if (e.key === 'a') posX = Math.max(0, posX - 1);
        if (e.key === 'd') posX += 1;
        dibujarMapa();
    });
}

// Iniciar
iniciarJuego();
