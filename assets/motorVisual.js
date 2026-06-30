const canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = 600;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

function dibujarEntorno() {
    // Si todavía no se cargaron las imágenes, esperamos
    if (Object.keys(imagenesCargadas).length === 0) {
        requestAnimationFrame(dibujarEntorno);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const radio = 1; // Un radio de 1 es una vista de 3x3
    const celdaSize = 200; // Tamaño de cada imagen en pantalla

    for (let dy = -radio; dy <= radio; dy++) {
        for (let dx = -radio; dx <= radio; dx++) {
            
            let targetX = posX + dx;
            let targetY = posY + dy;

            // Fórmula para sacar el índice del byte
            let byteIndex = offsetReal + (targetY * MAPA_ANCHO) + targetX;
            let id = mapaBytes[byteIndex];

            // Si hay imagen para ese ID, la dibujamos
            if (imagenesCargadas[id]) {
                let xPantalla = (dx + radio) * celdaSize;
                let yPantalla = (dy + radio) * celdaSize;
                ctx.drawImage(imagenesCargadas[id], xPantalla, yPantalla, celdaSize, celdaSize);
            }
        }
    }
}

// Arrancamos
dibujarEntorno();
