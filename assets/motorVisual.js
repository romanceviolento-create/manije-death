const motorVisual = {
    dibujar: function(ctx, mapaBytes, posX, posY, imagenesCargadas) {
        const canvasW = ctx.canvas.width;
        const canvasH = ctx.canvas.height;

        // Dibujamos de atrás hacia adelante para dar profundidad
        for (let y = 11; y >= 0; y--) {
            let escala = 0.5 + (y * 0.1); 
            let ancho = 64 * escala;
            let alto = 32 * escala;
            
            // Calculamos la posición para que converja al centro
            let xOffset = (canvasW / 2) - (ancho / 2) + ((y - 6) * 50); 
            let yOffset = (y * 30) + (canvasH / 3);

            for (let x = 0; x < 20; x++) {
                let index = 1078 + ((posY + y) * 1000 + (posX + x));
                let tileId = mapaBytes[index] || 0;
                let img = imagenesCargadas[tileId];

                let posX_pantalla = xOffset + (x * (ancho * 0.5));
                
                if (img) {
                    ctx.drawImage(img, posX_pantalla, yOffset, ancho, alto);
                }
            }
        }
    }
};
