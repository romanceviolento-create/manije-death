let mapaBytes = null;
let imagenesCargadas = {};
let diccionario = {};
let posX = 0;
let posY = 0;
const offsetReal = 1078; 
const MAPA_ANCHO = 1000;

async function iniciarJuego() {
    try {
        const [respBin, respTxt] = await Promise.all([
            fetch('assets/mapas/mapa.bmp'), 
            fetch('assets/bmp/recursosi.txt?v=1') 
        ]);
        
        if (!respBin.ok) throw new Error("No se pudo cargar el mapa");
        if (!respTxt.ok) throw new Error("No se pudo cargar el archivo de recursos");
        
        const arrayBuffer = await respBin.arrayBuffer();
        mapaBytes = new Uint8Array(arrayBuffer);
        
        const texto = await respTxt.text();
        texto.split('\n').forEach(linea => {
            const p = linea.split(',');
            if (p.length >= 5) diccionario[parseInt(p[0].trim())] = p[4].trim();
        });

        for (let id in diccionario) {
            let img = new Image();
            img.src = 'assets/bmp/' + diccionario[id];
            img.onload = () => {
                imagenesCargadas[id] = img;
                dibujarMapa();
            };
        }

        configurarControles();
        setTimeout(dibujarMapa, 500);
    } catch (err) { console.error(err); }
}

function dibujarMapa() {
    const canvas = document.getElementById('miCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!mapaBytes) return;

    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 20; x++) {
            // El cálculo original que funciona en tu Windows
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
    
    // Visor de coordenadas para depurar en móvil
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("X: " + posX + " Y: " + posY, 20, 40);
}

function configurarControles() {
    const canvas = document.getElementById('miCanvas');
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        // Coordenadas relativas al canvas escalado
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const midX = rect.width / 2;
        const midY = rect.height / 2;

        // Lógica de navegación que ya te funcionaba
        if (y < midY && x > (rect.width/4) && x < (rect.width*0.75)) posY = Math.max(0, posY - 1);
        else if (y > midY && x > (rect.width/4) && x < (rect.width*0.75)) posY += 1;
        else if (x < midX && y > (rect.height/4) && y < (rect.height*0.75)) posX = Math.max(0, posX - 1);
        else if (x > midX && y > (rect.height/4) && y < (rect.height*0.75)) posX += 1;
        
        dibujarMapa(); // Forzamos el redibujado
    }, {passive: false});

    window.addEventListener('keydown', (e) => {
        if (e.key === 'w') posY = Math.max(0, posY - 1);
        if (e.key === 's') posY += 1;
        if (e.key === 'a') posX = Math.max(0, posX - 1);
        if (e.key === 'd') posX += 1;
        dibujarMapa();
    });
}

iniciarJuego();
