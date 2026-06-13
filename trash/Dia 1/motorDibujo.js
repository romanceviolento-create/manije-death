async function arrancarJuego() {
    // Aquí unimos las piezas
    const mapa = await leerMapaBinario();
    const diccionario = await crearDiccionario();

    if (!mapa || !diccionario) return; // Si algo falló, nos detenemos aquí

    const canvas = document.getElementById('miCanvas');
    const ctx = canvas.getContext('2d');
    
    // Ejemplo de dibujo
    const indice = mapa[0]; // Primer byte
    const archivo = diccionario[indice];
    
    console.log("Dibujando el byte 0:", indice, "con la imagen:", archivo);
    
    // Aquí iría tu lógica de ctx.drawImage usando 'archivo'
}

arrancarJuego();