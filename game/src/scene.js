import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.minDistance = 1.4;
  controls.maxDistance = 7;
  controls.minPolarAngle = Math.PI * 0.28;
  controls.maxPolarAngle = Math.PI * 0.68;
  controls.minAzimuthAngle = -1.3;
  controls.maxAzimuthAngle = 1.3;

  scene.add(new THREE.HemisphereLight('#ffffff', '#c98f8f', 0.45));
  const key = new THREE.DirectionalLight('#fff4ea', 1.9);
  key.position.set(1.8, 2.6, 3.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#dbe8ff', 0.5);
  fill.position.set(-3, 0.5, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#ffd2c2', 1.1);
  rim.position.set(-1.5, 1.5, -3);
  scene.add(rim);

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // 讓整顆頭剛好塞進畫面（直式手機會退遠一點）；side=true 時把頭擺到右側，留位置給標題選單
  function frameFace(side = false) {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const wide = camera.aspect > 1.1;
    const d = Math.max(1.6 / t, 1.0 / (t * camera.aspect)) * (side && wide ? 1.15 : 1);
    const ox = side && wide ? -d * t * camera.aspect * 0.42 : 0;
    const oy = side && !wide ? 0.95 : 0;
    controls.target.set(ox, -0.12 - oy, 0);
    camera.position.set(ox, -0.04 - oy, d);
    controls.update();
  }

  resize();
  addEventListener('resize', resize);
  return { renderer, scene, camera, controls, frameFace };
}
