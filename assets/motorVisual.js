// motorVisual.js

const canvas = document.getElementById('miCanvas');
const ctx = canvas.getContext('2d');

// Posición inicial del jugador
let posX = 222;
let posY = 222;

function render() {
    if (!mapaBytes || Object.keys(imagenesCargadas).length === 0) {
        requestAnimationFrame(render);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ajustamos la profundidad: 'profundidad' controla qué tan lejos vemos
    const profundidad = 10; 

    // Dibujamos de atrás hacia adelante (del horizonte al frente)
    for (let d = profundidad; d >= 0; d--) {
        // En cada paso de profundidad, recorremos el ancho de visión
        for (let w = -d; w <= d; w++) {
            
            // Calculamos coordenadas en el mapa basadas en movimiento libre
            let targetX = Math.floor(posX + w);
            let targetY = Math.floor(posY + d);

            if (targetX >= 0 && targetY >= 0 && targetX < MAPA_ANCHO) {
                let byteIndex = offsetReal + (targetY * MAPA_ANCHO) + targetX;
                let id = mapaBytes[byteIndex];

                if (id !== 0 && imagenesCargadas[id]) {
                    // CÁLCULO DE PERSPECTIVA:
                    // Cuanto más grande es 'd', más lejos está (más pequeño en el horizonte)
                    let escala = Math.max(0.01, 1 / (d + 1)); 
                    let tam = 256 * escala; // Tamaño base para los bloques
                    
                    // Ajustamos posición para que converja al centro
                    let xPantalla = (canvas.width / 2) + (w * tam) - (tam / 2);
                    let yPantalla = (canvas.height / 2) - (tam / 2) + (d * 5); 
                    
                    // Si d es grande (horizonte), el tamaño es minúsculo (3-4 píxeles)
                    ctx.drawImage(imagenesCargadas[id], xPantalla, yPantalla, tam, tam);
                }
            }
        }
    }
    
    requestAnimationFrame(render);
}

render();
