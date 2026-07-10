const motorVisual = {
    // Esta función toma el mapa plano y lo dibuja "inclinado" para que parezca 3D
    dibujar: function(ctx, mapaBytes, posX, posY, imagenesCargadas) {
        const tileW = 64; // Ancho del tile en pantalla
        const tileH = 32; // Altura del tile en pantalla (esto da la inclinación)
        
        // Dibujamos desde atrás hacia adelante (de arriba a abajo en el mapa)
        for (let y = 0; y < 12; y++) {
            for (let x = 0; x < 20; x++) {
                let index = 1078 + ((posY + y) * 1000 + (posX + x));
                let tileId = mapaBytes[index] || 0;
                let img = imagenesCargadas[tileId];

                // Fórmula matemática para convertir coordenadas (x,y) a pantalla (iso)
                // Esto hace que el tile se vea desplazado en diagonal
                let screenX = (x - y) * (tileW / 2) + 320;
                let screenY = (x + y) * (tileH / 2) + 50;

                if (img) {
                    ctx.drawImage(img, screenX, screenY, tileW, tileH);
                }
            }
        }
    }
};
