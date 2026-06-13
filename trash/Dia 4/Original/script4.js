let mapaBytes = null;
let diccionario = {};
let imagenesCargadas = {}; // Aquí guardaremos las imágenes en memoria
let posX = 0;
let posY = 0;

async function iniciarJuego() {
    // 1. Cargar mapa y diccionario
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

    // 2. PRECARRGA DE IMÁGENES (Vital para fluidez)
    const promesas = Object.values(diccionario).map(nombre => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = 'bmp/' + nombre;
            img.onload = () => {
                imagenesCargadas[nombre] = img;
                resolve();
            };
            img.onerror = () => resolve(); // Si falla, sigue sin romper el juego
        });
    });
    await Promise.all(promesas);
    console.log("Sistema cargado y imágenes precargadas.");

    // 3. Controles
    window.addEventListener('keydown', (e) => {
        if (e.key === 'w') posY = Math.max(0, posY - 1);
        if (e.key === 's') posY += 1;
        if (e.key === 'a') posX = Math.max(0, posX - 1);
        if (e.key === 'd') posX += 1;
        dibujarMapa();
    });

    dibujarMapa();
}

function dibujarMapa() {
    const canvas = document.getElementById('miCanvas');
    const ctx = canvas.getContext('2d');
    const tileSize = 32;
    const offset = 54; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujamos de atrás hacia adelante (y de 0 a 11)
    for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 20; x++) {
            let index = offset + ((posY + y) * 1000 + (posX + x));
            let tileId = mapaBytes[index];
            let nombre = diccionario[tileId];

            if (nombre && imagenesCargadas[nombre]) {
                ctx.drawImage(imagenesCargadas[nombre], x * tileSize, y * tileSize);
            }
        }
    }
}

iniciarJuego();