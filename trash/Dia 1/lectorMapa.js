async function leerMapaBinario() {
    try {
        const respuesta = await fetch('mapas/mapa1.bin');
        const buffer = await respuesta.arrayBuffer();
        console.log("Mapa binario cargado. Bytes:", buffer.byteLength);
        return new Uint8Array(buffer);
    } catch (e) {
        console.error("Error leyendo mapa1.bin:", e);
    }
}