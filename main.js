import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 120);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

let branches = [];
let leaves = [];

//CONSTANTS
const maxDepth = 14; // how many recusions # DON'T PUT ABOVE 15, it will crash page
const lengthFactor = 0.95; // % of how much each child branch's length from parent
const maxRadius = 100; // length of each branch
const initialLength = 15; // initial stem length

function initTree() {
  const start = new THREE.Vector3(0, -40, 0);
  const end = new THREE.Vector3(0, -40 + initialLength, 0);
  branches.push({ start, end, hue: 0.3 });
  leaves.push({ start, end, hue: 0.3, depth: 1 });
}

function growOneIteration() {
  const newLeaves = [];
  leaves.forEach((leaf) => {
    const { start, end, hue, depth } = leaf;
    const length = end.clone().sub(start).length();
    if (depth >= maxDepth) return;
    const childCount = 3;
    for (let i = 0; i < childCount; i++) {
      const deltaAngleX = (Math.random() - 0.5) * (Math.PI / 2.5);
      const deltaAngleY = (Math.random() - 0.5) * (Math.PI / 2.5);
      const dir = end.clone().sub(start).normalize();
      const angleY = Math.asin(dir.y);
      const angleX = Math.atan2(dir.z, dir.x);
      const newAngleY = angleY + deltaAngleY;
      const newAngleX = angleX + deltaAngleX;
      const childLength = length * lengthFactor;
      const newEnd = new THREE.Vector3(
        end.x + childLength * Math.cos(newAngleY) * Math.cos(newAngleX),
        end.y + childLength * Math.sin(newAngleY),
        end.z + childLength * Math.cos(newAngleY) * Math.sin(newAngleX)
      );
      const newHue = (hue + 0.05 + Math.random() * 0.05) % 1;
      branches.push({ start: end.clone(), end: newEnd, hue: newHue });
      newLeaves.push({ start: end.clone(), end: newEnd, hue: newHue, depth: depth + 1 });
    }
  });
  leaves = newLeaves;
}

let treeGeometry = new THREE.BufferGeometry();
const treeMaterial = new THREE.LineBasicMaterial({
  vertexColors: true,
  linewidth: 2,
  transparent: true,
  opacity: 0.9,
});
const tree = new THREE.LineSegments(treeGeometry, treeMaterial);
tree.frustumCulled = false;
scene.add(tree);

function rebuildGeometry() {
  const vertices = [];
  const colors = [];
  branches.forEach(({ start, end, hue }) => {
    vertices.push(start, end);
    const startColor = new THREE.Color().setHSL(hue, 1, 0.5);
    const endColor = new THREE.Color().setHSL((hue + 0.1) % 1, 1, 0.7);
    colors.push(startColor, endColor);
  });
  const newGeometry = new THREE.BufferGeometry().setFromPoints(vertices);
  newGeometry.computeBoundingSphere();
  newGeometry.computeBoundingBox();
  const colorArray = new Float32Array(colors.length * 3);
  for (let i = 0; i < colors.length; i++) {
    colorArray[i * 3 + 0] = colors[i].r;
    colorArray[i * 3 + 1] = colors[i].g;
    colorArray[i * 3 + 2] = colors[i].b;
  }
  newGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
  treeGeometry.dispose();
  tree.geometry = newGeometry;
  treeGeometry = newGeometry;
}

function getCurrentRadius() {
  if (!tree.geometry.boundingSphere) return 0;
  return tree.geometry.boundingSphere.radius;
}

initTree();
rebuildGeometry();

function animate() {
  requestAnimationFrame(animate);
  const radius = getCurrentRadius();
  if (radius < maxRadius && leaves.length > 0) {
    growOneIteration();
    rebuildGeometry();
  }
  tree.rotation.y += 0.003;
  tree.position.y = Math.sin(Date.now() * 0.001) * 2;
  controls.update();
  composer.render();
}
animate();

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
});