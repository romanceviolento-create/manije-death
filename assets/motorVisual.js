// motorVisual.js

const canvas = document.getElementById('miCanvas');
const ctx = canvas.getContext('2d');

function render() {
    // 1. Verificamos que los datos estén cargados
    if (!mapaBytes || Object.keys(imagenesCargadas).length === 0) {
        requestAnimationFrame(render);
        return;
    }

    // 2. Limpiamos el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Definimos vista de 3x3 celdas centrada en posX, posY
    const radio = 1; 
    const tamCelda = 128; // Ajustado para que 3 celdas entren en los 384px de alto

    for (let dy = -radio; dy <= radio; dy++) {
        for (let dx = -radio; dx <= radio; dx++) {
            
            let targetX = posX + dx;
            let targetY = posY + dy;

            // Fórmula para acceder a tu array de datos
            let byteIndex = offsetReal + (targetY * MAPA_ANCHO) + targetX;
            let id = mapaBytes[byteIndex];

            // Dibujamos la imagen correspondiente si existe
            if (imagenesCargadas[id]) {
                // Centramos visualmente las 3x3 celdas
                let xPantalla = (dx + radio) * tamCelda + (canvas.width/2 - 192);
                let yPantalla = (dy + radio) * tamCelda;
                
                ctx.drawImage(imagenesCargadas[id], xPantalla, yPantalla, tamCelda, tamCelda);
            }
        }
    }

    // Pedimos el siguiente frame
    requestAnimationFrame(render);
}

// Empezamos el bucle
render();
