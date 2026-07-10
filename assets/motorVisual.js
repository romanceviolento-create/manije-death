const motorVisual = {
    dibujar: function(ctx, mapaBytes, posX, posY, imagenesCargadas) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Dibujamos capas de profundidad (de lejos a cerca)
        // d es la distancia: d=1 es lo más lejano, d=6 es lo que tienes justo delante
        for (let d = 6; d >= 1; d--) {
            // El índice en tu archivo .bmp (mirando hacia adelante en el eje Y)
            let index = 1078 + ((posY + d) * 1000 + posX);
            let tileId = mapaBytes[index] || 0;
            let img = imagenesCargadas[tileId];

            // Calculamos el tamaño: más lejos = más pequeño, más cerca = más grande
            let escala = (d / 6); 
            let ancho = 640 * escala;
            let alto = 384 * escala;

            // Centramos la imagen en el canvas
            let xPos = (ctx.canvas.width - ancho) / 2;
            let yPos = (ctx.canvas.height - alto) / 2;

            if (img) {
                ctx.drawImage(img, xPos, yPos, ancho, alto);
            }
        }
    }
};
