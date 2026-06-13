let mapaBytes = null;
let imagenesCargadas = {};
let diccionario = {};
let posX = 0;
let posY = 0;
const offsetReal = 1078; // El que detectamos

async function iniciarJuego() {
    try {
        const [respBin, respTxt] = await Promise.all([
            fetch('mapas/mapa.bmp'), 
            fetch('bmp/_recursosi.txt')
        ]);
        
        const arrayBuffer = await respBin.arrayBuffer();
        mapaBytes = new Uint8Array(arrayBuffer);
        
        const texto = await respTxt.text();
        texto.split('\n').forEach(linea => {
            const p = linea.split(',');
            if (p.length >= 5) diccionario[parseInt(p[0].trim())] = p[4].trim();
        });

        for (let id in diccionario) {
            let img = new Image();
            img.src = 'bmp/' + diccionario[id];
            img.onload = () => imagenesCargadas[id] = img;
        }

        setTimeout(dibujarMapa, 500); 
    } catch (err) { console.error("Error:", err); }
}

function dibujarMapa() {
    const canvas = document.getElementById('miCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ajustamos ancho a 1000 según tu configuración previa
    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 20; x++) {
            // El índice debe saltar el offset y moverse por la matriz
            let index = offsetReal + ((posY + y) * 1000 + (posX + x));
            
            let tileId = mapaBytes[index] || 0;
            let img = imagenesCargadas[tileId];

            if (img) {
                ctx.drawImage(img, x * 32, y * 32, 32, 32);
            } else {
                ctx.fillStyle = "#111";
                ctx.fillRect(x * 32, y * 32, 32, 32);
                ctx.fillStyle = "white";
                ctx.font = "10px Arial";
                ctx.fillText(tileId, x * 32 + 5, y * 32 + 20);
            }
        }
    }
    // HUD de posición
    ctx.fillStyle = "lime";
    ctx.fillText(`X:${posX} Y:${posY}`, 10, 20);
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'w') posY = Math.max(0, posY - 1);
    if (e.key === 's') posY += 1;
    if (e.key === 'a') posX = Math.max(0, posX - 1);
    if (e.key === 'd') posX += 1;
    dibujarMapa();
});

iniciarJuego();