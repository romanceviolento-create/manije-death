// motorVisual.js (Versión Corregida para Pasillo Pseudo-3D)

const motorVisual = {
    // Genera el mundo interpretando el mapaBytes como un pasillo
    generarMundo: function(mapaBytes, ancho, alto) {
        let segmentos = [];
        // 'alto' (y) es la profundidad, de 0 (lejos) a alto-1 (cerca)
        for (let y = 0; y < alto; y++) {
            // La distancia aumenta con 'y'. Usamos un factor para exagerar la perspectiva.
            let profundidad = (alto - y) * 200; 

            for (let x = 0; x < ancho; x++) {
                let index = offsetReal + ((posY + y) * MAPA_ANCHO + (posX + x));
                let tileId = mapaBytes[index];

                // Definimos las posiciones del mundo 3D:
                // - x: Desplazamiento horizontal (-10 a +10)
                // - y: Altura del suelo (0) o pared (100, 200...)
                // - z: Profundidad (Calculada arriba)

                // --- PARED IZQUIERDA ---
                segmentos.push({
                    world: { x: -800, y: 0, z: profundidad }, // x=-800 es el borde izquierdo
                    tileId: tileId,
                    tipo: 'pared'
                });

                // --- PARED DERECHA ---
                segmentos.push({
                    world: { x: 800, y: 0, z: profundidad }, // x=800 es el borde derecho
                    tileId: tileId,
                    tipo: 'pared'
                });

                // --- SUELO (Opcional, para dar contexto) ---
                segmentos.push({
                    world: { x: (x - ancho/2) * 160, y: -150, z: profundidad }, // y=-150 es bajo la cámara
                    tileId: tileId, // Usamos el mismo tileId (agua) para el suelo
                    tipo: 'suelo'
                });
            }
        }
        return segmentos;
    },

    // La función dibujar no cambia mucho, solo ajustamos el tamaño según el tipo
    dibujar: function(ctx, segmentos, camera, width, height) {
        segmentos.sort((a, b) => b.camera.z - a.camera.z);

        segmentos.forEach(p => {
            camera.project(p, 0, false, width, height);

            if (p.screen.scale > 0) {
                let img = imagenesCargadas[p.tileId];
                if (img) {
                    let baseSize = (p.tipo === 'pared') ? 800 : 160; // Las paredes deben ser más grandes
                    let size = baseSize * p.screen.scale;
                    
                    // Centramos el dibujo en la proyección
                    ctx.drawImage(img, p.screen.x - size/2, p.screen.y - size/2, size, size);
                }
            }
        });
    }
};
