async function crearDiccionario() {
    try {
        const respuesta = await fetch('bmp/_recursosi.txt');
        const texto = await respuesta.text();
        let dict = {};
        texto.split('\n').forEach(linea => {
            const p = linea.split(',');
            if (p.length >= 5) dict[parseInt(p[0].trim())] = p[4].trim();
        });
        console.log("Diccionario creado. Entradas:", Object.keys(dict).length);
        return dict;
    } catch (e) {
        console.error("Error leyendo _recursosi.txt:", e);
    }
}