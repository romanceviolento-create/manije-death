// motorVisual.js

const canvas = document.getElementById('miCanvas');
const ctx = canvas.getContext('2d');

function render() {
    // Verificación de seguridad de datos
    if (!mapaBytes || typeof mapaBytes === 'undefined' || Object.keys(imagenesCargadas).length === 0) {
        requestAnimationFrame(render);
        return;
    }

    // Limpieza de frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Configuración de vista (Ajustá el radio según tu necesidad de campo visual)
    const radio = 4; 
    const tamCelda = 64; 

    // Bucle de renderizado basado en coordenadas del jugador (posX, posY)
    for (let dy = -radio; dy <= radio; dy++) {
        for (let dx = -radio; dx <= radio; dx++) {
            
            let targetX = Math.floor(posX + dx);
            let targetY = Math.floor(posY + dy);

            // Validar límites de lectura en mapaBytes
            if (targetX >= 0 && targetY >= 0 && targetX < MAPA_ANCHO) {
                let byteIndex = offsetReal + (targetY * MAPA_ANCHO) + targetX;
                let id = mapaBytes[byteIndex];

                // Renderizar solo si el ID existe y tiene imagen asociada (evitamos ID 0)
                if (id !== 0 && imagenesCargadas[id]) {
                    let xPantalla = (dx + radio) * tamCelda;
                    let yPantalla = (dy + radio) * tamCelda;
                    
                    // Dibujo directo sin escalar (plano, según solicitaste)
                    ctx.drawImage(imagenesCargadas[id], xPantalla, yPantalla, tamCelda, tamCelda);
                }
            }
        }
    }
    
    requestAnimationFrame(render);
}

// Inicialización del motor
render();
