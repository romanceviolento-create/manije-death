import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Esto es lo que hace que Android no lo ignore:
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geo = new THREE.BoxGeometry(1, 1, 1);
const mat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const cube = new THREE.Mesh(geo, mat);
scene.add(cube);

camera.position.z = 3;

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.02;
    cube.rotation.y += 0.02;
    renderer.render(scene, camera);
}

animate();

// Ajuste automático por si rotas el celular
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
