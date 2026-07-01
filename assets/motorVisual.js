// motorVisual.js

const canvas = document.getElementById('miCanvas');
const ctx = canvas.getContext('2d');

function render() {
    if (!mapaBytes || Object.keys(imagenesCargadas).length === 0) {
        requestAnimationFrame(render);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- LÓGICA DE PROYECCIÓN 3D ---
    const radioX = 3; 
    const prof = 5; 

    for (let dy = 0; dy < prof; dy++) {
        for (let dx = -radioX; dx <= radioX; dx++) {
            
            let targetX = Math.floor(posX + dx);
            let targetY = Math.floor(posY + dy);

            if (targetX >= 0 && targetY >= 0 && targetX < MAPA_ANCHO) {
                let byteIndex = offsetReal + (targetY * MAPA_ANCHO) + targetX;
                let id = mapaBytes[byteIndex];

                if (id !== 0 && imagenesCargadas[id]) {
                    // Cálculo de perspectiva
                    let escala = 1 / (dy + 1); 
                    let tamActual = 256 * escala; 
                    let xPantalla = (dx * tamActual) + (canvas.width / 2) - (tamActual / 2);
                    let yPantalla = (canvas.height / 2) - (tamActual / 2) + (dy * 20); 
                    
                    ctx.drawImage(imagenesCargadas[id], xPantalla, yPantalla, tamActual, tamActual);
                }
            }
        }
    }
    
    requestAnimationFrame(render);
}

render();
