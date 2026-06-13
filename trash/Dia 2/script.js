let mapaBytes = null;
let diccionario = {};
let imagenesCargadas = {};

async function iniciarJuego() {
    const canvas = document.getElementById('miCanvas');
    const ctx = canvas.getContext('2d');

    // 1. Cargar el Diccionario
    const respuestaTxt = await fetch('bmp/_recursosi.txt');
    const texto = await respuestaTxt.text();
    texto.split('\n').forEach(linea => {
        const p = linea.split(',');
        if (p.length >= 5) diccionario[parseInt(p[0].trim())] = p[4].trim();
    });

    // 2. Cargar el Mapa (saltando los 54 bytes del encabezado BMP)
    const respuestaBin = await fetch('mapas/mapa1.bin');
    const buffer = await respuestaBin.arrayBuffer();
    mapaBytes = new Uint8Array(buffer);
    const offset = 54; 

    // 3. Precargar imágenes
    for (let id in diccionario) {
        let nombre = diccionario[id];
        let img = new Image();
        img.src = 'bmp/' + nombre;
        imagenesCargadas[id] = img;
    }

    // 4. Dibujar
    console.log("Dibujando...");
    let inicioX = 0; // Ajusta estos números para moverte por el mapa
    let inicioY = 0;
    let tileSize = 32;

    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 20; x++) {
            let indexEnMapa = offset + ((inicioY + y) * 1000 + (inicioX + x));
            let tileId = mapaBytes[indexEnMapa];
            let img = imagenesCargadas[tileId];

            if (img) {
                ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
    }
}

iniciarJuego();