const motorVisual = {
    dibujar: function(ctx, mapaBytes, posX, posY, imagenesCargadas) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Vamos a dibujar 3 planos de profundidad: Fondo, Medio y Frente
        // d es la distancia: d=1 (lejos), d=3 (cerca)
        for (let d = 3; d >= 1; d--) {
            // Buscamos el ID del tile en tu mapa binario
            // Usamos posY+d para mirar hacia adelante en tu mapa
            let index = 1078 + ((posY + d) * 1000 + posX);
            let tileId = mapaBytes[index] || 0;
            let img = imagenesCargadas[tileId];

            if (img) {
                // Escala: los objetos lejanos son más pequeños y están centrados
                // Esto crea el efecto de que la torre está al fondo y el campo al frente
                let escala = (d / 3); 
                let ancho = 640 * escala;
                let alto = 384 * escala;
                
                // Calculamos el centro para que no haya diagonales ni desplazamientos raros
                let xPos = (ctx.canvas.width - ancho) / 2;
                let yPos = (ctx.canvas.height - alto) / 2 + (100 * (1 - escala));

                ctx.drawImage(img, xPos, yPos, ancho, alto);
            }
        }
    }
};
