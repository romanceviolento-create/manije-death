// motorVisual.js

const motorVisual = {
    // Definimos el mundo basado en tu mapaBytes
    generarMundo: function(mapaBytes, ancho, alto) {
        let segmentos = [];
        for (let y = 0; y < alto; y++) {
            for (let x = 0; x < ancho; x++) {
                let index = offsetReal + (y * MAPA_ANCHO + x);
                segmentos.push({
                    world: { x: (x - ancho / 2) * 100, y: 0, z: (alto - y) * 100 },
                    camera: { x: 0, y: 0, z: 0 },
                    screen: { x: 0, y: 0, scale: 0 },
                    tileId: mapaBytes[index]
                });
            }
        }
        return segmentos;
    },

    dibujar: function(ctx, segmentos, camera, width, height) {
        // Ordenamos por Z para que lo lejos se dibuje primero (Painter's Algorithm)
        segmentos.sort((a, b) => b.camera.z - a.camera.z);

        segmentos.forEach(p => {
            // Proyección 3D usando tu clase Camera
            camera.project(p, 0, false, width, height);

            // Solo dibujamos si está frente a la cámara
            if (p.screen.scale > 0) {
                let img = imagenesCargadas[p.tileId];
                if (img) {
                    let size = 100 * p.screen.scale;
                    ctx.drawImage(img, p.screen.x - size/2, p.screen.y - size/2, size, size);
                }
            }
        });
    }
};
