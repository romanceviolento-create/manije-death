// motorVisual.js (Lógica de Dungeon Crawler por Grilla)

function render() {
    if (!mapaBytes || Object.keys(imagenesCargadas).length === 0) {
        requestAnimationFrame(render);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujamos de mayor a menor profundidad (de atrás hacia adelante)
    for (let dy = 4; dy >= 0; dy--) { 
        for (let dx = -2; dx <= 2; dx++) {
            
            let targetX = Math.floor(posX + dx);
            let targetY = Math.floor(posY + dy);

            if (targetX >= 0 && targetY >= 0 && targetX < MAPA_ANCHO) {
                let byteIndex = offsetReal + (targetY * MAPA_ANCHO) + targetX;
                let id = mapaBytes[byteIndex];

                if (id !== 0 && imagenesCargadas[id]) {
                    // CÁLCULO DE PROFUNDIDAD:
                    // dy=4 es el horizonte (fondo), dy=0 es lo que tenés en frente
                    let escala = 0.5 + (dy * 0.2); // Más chico cuanto más lejos
                    let tamActual = 128 * escala;
                    
                    // La posición X e Y se comprimen hacia el centro del canvas (punto de fuga)
                    let xPantalla = (canvas.width / 2) + (dx * tamActual) - (tamActual / 2);
                    let yPantalla = (canvas.height / 2) - (tamActual / 2) + (dy * 20);
                    
                    ctx.drawImage(imagenesCargadas[id], xPantalla, yPantalla, tamActual, tamActual);
                }
            }
        }
    }
    requestAnimationFrame(render);
}
