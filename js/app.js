import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// Esto arranca apenas se carga el archivo
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geo = new THREE.BoxGeometry(1,1,1);
const mat = new THREE.MeshBasicMaterial({color: 0x0000ff}); // Cubo azul para diferenciar
const cube = new THREE.Mesh(geo, mat);
scene.add(cube);
camera.position.z = 3;

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.02;
    cube.rotation.y += 0.02;
    renderer.render(scene, camera);
}

// Arrancamos el bucle inmediatamente
animate();
