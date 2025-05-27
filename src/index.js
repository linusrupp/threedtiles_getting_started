import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TileLoader, OGC3DTile } from '@jdultra/threedtiles';

console.log('🚀 3D Tiles Loading...');

// Basic Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const domContainer = document.getElementById("screen");
domContainer.style = "position: absolute; height:100%; width:100%; left: 0px; top:0px;";
document.body.appendChild(domContainer);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 80000);
camera.position.set(-20, 15, -30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
domContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// Basic lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.16);
directionalLight.position.set(1, 1, 0.15);
scene.add(directionalLight);

// 3D Tiles setup
const tileLoader = new TileLoader({
    renderer: renderer,
    maxCachedItems: 1000
    // No callbacks - let's see the raw content
});

// Check what the terrain layer.json contains
fetch("https://3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/layer.json")
    .then(response => response.json())
    .then(data => {
        console.log('🏔️ Terrain layer.json structure:', data);
        console.log('🏔️ Available properties:', Object.keys(data));
    })
    .catch(error => console.error('Failed to fetch terrain layer.json:', error));

// Load Swiss 3D objects (back to what was working)
const ogc3DTiles = new OGC3DTile({
    url: "https://3d.geo.admin.ch/ch.swisstopo.swisstlm3d.3d/v1/tileset.json",
    geometricErrorMultiplier: 0.5,
    loadOutsideView: true,
    tileLoader: tileLoader, 
    centerModel: true,
    renderer: renderer,
    
    onLoadCallback: (tileset) => {
        console.log('✅ 3D Objects tileset loaded');
        
        // Auto-position camera based on 3D objects tileset
        if (ogc3DTiles.boundingVolume?.box) {
            const box = ogc3DTiles.boundingVolume.box;
            const center = [box[0], box[1], box[2]];
            const size = Math.sqrt(box[3]*box[3] + box[4]*box[4] + box[5]*box[5]) * 2;
            
            const distance = size * 0.5;
            camera.position.set(
                center[0] + distance,
                center[1] + distance * 0.5,
                center[2] + distance
            );
            camera.lookAt(center[0], center[1], center[2]);
            controls.target.set(center[0], center[1], center[2]);
            controls.update();
        }
    }
});

// Swiss coordinate system rotation
ogc3DTiles.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI * -0.5);
scene.add(ogc3DTiles);

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
function animate() {
    requestAnimationFrame(animate);
    
    try {
        ogc3DTiles.update(camera);
        tileLoader.update();
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Tile update error:', error);
        }
    }
    
    renderer.render(scene, camera);
}

animate();