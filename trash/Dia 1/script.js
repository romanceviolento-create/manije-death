let mapaBytes = null;
let diccionario = {};

async function iniciarJuego() {
    console.log("Iniciando carga de sistema...");

    // 1. Cargar el Diccionario desde bmp/_recursosi.txt
    try {
        const respuestaTxt = await fetch('bmp/_recursosi.txt');
        const texto = await respuestaTxt.text();
        texto.split('\n').forEach(linea => {
            const p = linea.split(',');
            if (p.length >= 5) {
                diccionario[parseInt(p[0].trim())] = p[4].trim();
            }
        });
        console.log("Diccionario cargado. Entradas:", Object.keys(diccionario).length);
    } catch (e) {
        console.error("Error cargando el archivo de texto:", e);
    }

    // 2. Cargar el Mapa Binario desde mapas/mapa1.bin
    try {
        const respuestaBin = await fetch('mapas/mapa1.bin');
        const buffer = await respuestaBin.arrayBuffer();
        mapaBytes = new Uint8Array(buffer);
        console.log("Mapa binario cargado. Tamaño:", mapaBytes.length);
    } catch (e) {
        console.error("Error cargando el mapa binario:", e);
    }

    // 3. Verificación final
    if (mapaBytes && Object.keys(diccionario).length > 0) {
        console.log("¡SISTEMA LISTO! El primer byte es", mapaBytes[0], 
                    "y su imagen es:", diccionario[mapaBytes[0]]);
    }
}

iniciarJuego();