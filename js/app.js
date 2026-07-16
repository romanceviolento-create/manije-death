import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const boton = document.getElementById('instrucciones');

boton.addEventListener('click', () => {
    boton.style.display = 'none';
    iniciarJuego();
});

function iniciarJuego() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const geo = new THREE.BoxGeometry(1,1,1);
    const mat = new THREE.MeshBasicMaterial({color: 0xff0000});
    const cube = new THREE.Mesh(geo, mat);
    scene.add(cube);
    camera.position.z = 3;

    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.05;
        renderer.render(scene, camera);
    }
    animate();
}
