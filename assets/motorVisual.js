const motorVisual = {
    dibujar: function(ctx, mapaBytes, posX, posY, imagenesCargadas) {
        const canvasW = ctx.canvas.width;
        const canvasH = ctx.canvas.height;
        
        // Configuraciones de perspectiva
        const filas = 8; // Cuántas filas hacia adelante queremos dibujar
        const puntoFugaY = canvasH * 0.35; // Altura donde convergen las líneas
        
        for (let y = 0; y < filas; y++) {
            // La escala va de 0.1 (lejos) a 1.0 (cerca)
            let escala = (y + 1) / filas; 
            let tileW = 128 * escala; 
            let tileH = 64 * escala;
            
            // Calculamos la posición X para que se estreche hacia el centro
            let centroX = canvasW / 2;
            let anchoTotalFila = (canvasW * 0.5) * escala;
            let inicioX = centroX - (anchoTotalFila / 2);
            
            for (let x = 0; x < 20; x++) {
                let index = 1078 + ((posY + y) * 1000 + (posX + x));
                let tileId = mapaBytes[index] || 0;
                let img = imagenesCargadas[tileId];

                let posX_pantalla = inicioX + (x * (anchoTotalFila / 20));
                let posY_pantalla = puntoFugaY + (y * (canvasH / (filas * 1.5)));

                if (img) {
                    ctx.drawImage(img, posX_pantalla, posY_pantalla, tileW, tileH);
                }
            }
        }
    }
};
