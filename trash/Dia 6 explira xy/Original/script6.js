let mapaImagen = new Image();
let imagenesCargadas = {};
let diccionario = {};
let posX = 0;
let posY = 0;

async function iniciarJuego() {
    // 1. Cargar el diccionario y mapear colores a archivos
    const respTxt = await fetch('bmp/_recursosi.txt');
    const texto = await respTxt.text();
    texto.split('\n').forEach(linea => {
        const p = linea.split(',');
        if (p.length >= 5) {
            // Asumimos que el ID del tile es el índice de color (puedes ajustar esto)
            diccionario[parseInt(p[0].trim())] = p[4].trim();
        }
    });

    // 2. Cargar todas las imágenes
    for (let id in diccionario) {
        let img = new Image();
        img.src = 'bmp/' + diccionario[id];
        img.onload = () => imagenesCargadas[id] = img;
    }

    // 3. Cargar el mapa de colores (Heightmap)
    mapaImagen.src = 'mapas/mapa1.bmp';
    mapaImagen.onload = () => {
        console.log("Mapa cargado. Tamaño:", mapaImagen.width, "x", mapaImagen.height);
        dibujarMapa();
    };
}

function dibujarMapa() {
    const canvas = document.getElementById('miCanvas');
    const ctx = canvas.getContext('2d');
    
    // Crear un canvas temporal para leer los píxeles
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = mapaImagen.width;
    tempCanvas.height = mapaImagen.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(mapaImagen, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 20; x++) {
            // Leer el color del pixel en el mapa (R,G,B)
            let pixel = tCtx.getImageData(posX + x, posY + y, 1, 1).data;
            let r = pixel[0], g = pixel[1], b = pixel[2];

            // --- LÓGICA DE DETECCIÓN DE TERRENO ---
            // Aquí asignamos un ID según el color del mapa
            let tileId = 1; // Default: tierra
            if (b > 150) tileId = 2;       // Azul = Agua
            if (r > 100 && b > 100) tileId = 3; // Violeta = Especial/Molino

            let img = imagenesCargadas[tileId];
            if (img) {
                ctx.drawImage(img, x * 32, y * 32, 32, 32);
            } else {
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x * 32, y * 32, 32, 32);
            }
        }
    }

    // HUD de Posición
    ctx.fillStyle = "white";
    ctx.fillText(`X: ${posX} Y: ${posY}`, 10, 20);
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'w') posY = Math.max(0, posY - 1);
    if (e.key === 's') posY += 1;
    if (e.key === 'a') posX = Math.max(0, posX - 1);
    if (e.key === 'd') posX += 1;
    dibujarMapa();
});

iniciarJuego();