let mapaBytes = null;
let diccionario = {};
let imagenesCargadas = {};
let posX = 0;
let posY = 0;

async function iniciarJuego() {
    try {
        // Cambiamos a mapa1.bmp
        const [respBin, respTxt] = await Promise.all([
            fetch('mapas/mapa1.bmp'), 
            fetch('bmp/_recursosi.txt')
        ]);
        
        const arrayBuffer = await respBin.arrayBuffer();
        
        // Saltamos los primeros 54 bytes (cabecera del BMP)
        // Esto es vital: si el archivo es un BMP real, los datos empiezan después del byte 54
        mapaBytes = new Uint8Array(arrayBuffer, 54);
        
        console.log("Mapa BMP cargado. Bytes disponibles:", mapaBytes.length);
        
        const texto = await respTxt.text();
        texto.split('\n').forEach(linea => {
            const p = linea.split(',');
            if (p.length >= 5) diccionario[parseInt(p[0].trim())] = p[4].trim();
        });

        for (let id in diccionario) {
            let nombre = diccionario[id];
            let img = new Image();
            img.src = 'bmp/' + nombre;
            img.onload = () => imagenesCargadas[id] = img;
        }

        setTimeout(() => {
            console.log("Sistema listo. Dibujando...");
            dibujarMapa();
        }, 1000); 

    } catch (err) {
        console.error("Error al cargar:", err);
    }
}

function dibujarMapa() {
    const canvas = document.getElementById('miCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujamos una pequeña grilla de prueba
    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 20; x++) {
            // Calculamos el índice con el nuevo array de datos
            let index = (posY + y) * 1000 + (posX + x);
            
            // Si el índice supera el tamaño del archivo, paramos
            if (index >= mapaBytes.length) continue;

            let tileId = mapaBytes[index];
            let img = imagenesCargadas[tileId];

            if (img) {
                ctx.drawImage(img, x * 32, y * 32, 32, 32);
            } else {
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