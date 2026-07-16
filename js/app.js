const RETRO_WIDTH = 320;
const RETRO_HEIGHT = 180;

// FORZAMOS el renderizado para móviles
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas,
    antialias: false,
    preserveDrawingBuffer: true // Esto ayuda en algunos Androids viejos
});

renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

// Solo un cubo verde para testear
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

function render() {
    requestAnimationFrame(render);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}
render();