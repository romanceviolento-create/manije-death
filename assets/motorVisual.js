// motorVisual.js

const canvas = document.getElementById('miCanvas');
const ctx = canvas.getContext('2d');

// Variables de estado del jugador (ajustalas según tu inicio en 222, 222)
let posX = 222;
let posY = 222;
let playerAngle = 0; // Ángulo inicial del jugador

function castRay(x, y, angulo) {
    let dist = 0;
    let step = 0.05; // Precisión del rayo
    let curX = x;
    let curY = y;

    // Avanzamos el rayo hasta chocar con algo
    while (dist < 20) { // Distancia máxima de visión
        curX += Math.cos(angulo) * step;
        curY += Math.sin(angulo) * step;
        dist += step;

        let mapX = Math.floor(curX);
        let mapY = Math.floor(curY);

        // Si encontramos un muro (ID distinto de 0)
        if (mapaBytes[offsetReal + (mapY * MAPA_ANCHO) + mapX] !== 0) {
            return dist;
        }
    }
    return 20; // Si no choca con nada
}

function render() {
    if (!mapaBytes) { requestAnimationFrame(render); return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let fov = Math.PI / 3; // Campo de visión
    let numRays = canvas.width;

    for (let i = 0; i < numRays; i++) {
        let angulo = (playerAngle - fov / 2) + (i / numRays) * fov;
        let dist = castRay(posX, posY, angulo);

        // Corregir efecto ojo de pez
        dist *= Math.cos(angulo - playerAngle);

        // Calcular altura de la columna (distancia inversa)
        let altura = canvas.height / (dist + 0.1);

        // Dibujar columna
        ctx.fillStyle = `rgb(0, ${Math.min(255, altura * 2)}, 0)`; // Color según distancia
        ctx.fillRect(i, (canvas.height - altura) / 2, 1, altura);
    }

    requestAnimationFrame(render);
}

render();
