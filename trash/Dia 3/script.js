let mapaBytes = null;
let diccionario = {};
let posX = 0; // Tu posición en el mapa
let posY = 0;

async function iniciarJuego() {
    // 1. Cargar datos (igual que antes)
    const respBin = await fetch('mapas/mapa1.bin');
    mapaBytes = new Uint8Array(await respBin.arrayBuffer());
    
    const respTxt = await fetch('bmp/_recursosi.txt');
    const texto = await respTxt.text();
    texto.split('\n').forEach(linea => {
        const p = linea.split(',');
        if (p.length >= 5) diccionario[parseInt(p[0].trim())] = p[4].trim();
    });

    // 2. Escuchar teclado
    window.addEventListener('keydown', (e) => {
        if (e.key === 'w') posY = Math.max(0, posY - 1);
        if (e.key === 's') posY += 1;
        if (e.key === 'a') posX = Math.max(0, posX - 1);
        if (e.key === 'd') posX += 1;
        dibujarMapa(); // Redibujar al mover
    });

    dibujarMapa();
}

function dibujarMapa() {
    const canvas = document.getElementById('miCanvas');
    const ctx = canvas.getContext('2d');
    const tileSize = 32;
    const offset = 54; 

    // Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 20; x++) {
            // Calculamos la posición en el archivo binario
            let index = offset + ((posY + y) * 1000 + (posX + x));
            let tileId = mapaBytes[index];
            let nombre = diccionario[tileId];

            if (nombre) {
                let img = new Image();
                img.src = 'bmp/' + nombre;
                img.onload = () => ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
    }
}

iniciarJuego();