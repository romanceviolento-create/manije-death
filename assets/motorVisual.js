function render() {
    if (!mapaBytes || Object.keys(imagenesCargadas).length === 0) {
        requestAnimationFrame(render);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ajustamos la lógica de 3x3 para aplicar perspectiva
    const radio = 1;
    const baseTam = 128; 

    for (let dy = -radio; dy <= radio; dy++) {
        // Cálculo de escala por profundidad (dy)
        // dy = -1 (lejos), 0 (medio), 1 (cerca)
        let escala = 1 - (dy * 0.3); // Ajustá 0.3 para más o menos efecto
        let tamActual = baseTam * escala;

        for (let dx = -radio; dx <= radio; dx++) {
            let targetX = posX + dx;
            let targetY = posY + dy;

            let byteIndex = offsetReal + (targetY * MAPA_ANCHO) + targetX;
            let id = mapaBytes[byteIndex];

            if (imagenesCargadas[id]) {
                // Cálculo de posición con perspectiva
                // El ancho se desplaza para simular la "diagonal"
                let xPantalla = (dx * tamActual) + (canvas.width / 2 - tamActual / 2);
                let yPantalla = (dy * (baseTam * 0.8)) + (canvas.height / 2 - tamActual / 2);
                
                ctx.drawImage(imagenesCargadas[id], xPantalla, yPantalla, tamActual, tamActual);
            }
        }
    }

    requestAnimationFrame(render);
}
