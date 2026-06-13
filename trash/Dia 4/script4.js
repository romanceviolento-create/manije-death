let mapaBytes = null;
let diccionario = {};
let imagenesCargadas = {};
let posX = 0;
let posY = 0;

async function iniciarJuego() {
    try {
        const [respBin, respTxt] = await Promise.all([
            fetch('mapas/mapa1.bin'),
            fetch('bmp/_recursosi.txt')
        ]);
        
        mapaBytes = new Uint8Array(await respBin.arrayBuffer());
        const texto = await respTxt.text();
        
        texto.split('\n').forEach(linea => {
            const p = linea.split(',');
            if (p.length >= 5) diccionario[parseInt(p[0].trim())] = p[4].trim();
        });

        // Carga forzosa para ver si las imágenes existen
        for (let id in diccionario) {
            let nombre = diccionario[id];
            let img = new Image();
            img.src = 'bmp/' + nombre;
            // Guardamos con ID, no con nombre, para evitar problemas de claves
            img.onload = () => imagenesCargadas[id] = img;
            img.onerror = () => console.log("Error cargando: bmp/" + nombre);
        }

        setTimeout(() => {
            console.log("Iniciando bucle de dibujo...");
            dibujarMapa();
        }, 1000); 

    } catch (err) {
        console.error("Error crítico de carga:", err);
    }
}

function dibujarMapa() {
    const canvas = document.getElementById('miCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    console.log("Dibujando mapa...");

    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 20; x++) {
            let index = 54 + ((posY + y) * 1000 + (posX + x));
            let tileId = mapaBytes[index];
            let img = imagenesCargadas[tileId];

            if (img) {
                // Dibujo simple para ver algo en pantalla
                ctx.drawImage(img, x * 32, y * 32, 32, 32);
            } else {
                // Si no hay imagen, dibujamos un cuadradito gris para saber que el bucle funciona
                ctx.fillStyle = "#333";
                ctx.fillRect(x * 32, y * 32, 32, 32);
            }
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'w') posY = Math.max(0, posY - 1);
    if (e.key === 's') posY += 1;
    if (e.key === 'a') posX = Math.max(0, posX - 1);
    if (e.key === 'd') posX += 1;
    dibujarMapa();
});

iniciarJuego();