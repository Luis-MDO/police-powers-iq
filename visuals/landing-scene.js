/* Optional enhancement. This bundle is fetched only on the exam-choice screen at tablet width and wider. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Short facts that rise out of the book: the legislation and decisions the midterm covers.
// Titles name the source; each second line is a plain-language summary, not quoted text.
const FACTS = [
  ['Charter s. 7', 'Life, liberty and security of the person'],
  ['Charter s. 8', 'Secure against unreasonable search or seizure'],
  ['Charter s. 9', 'Not to be arbitrarily detained or imprisoned'],
  ['Charter s. 10(b)', 'Retain and instruct counsel without delay'],
  ['Charter s. 24(2)', 'Excluding evidence that would bring justice into disrepute'],
  ['Criminal Code s. 494', 'Arrest without warrant by any person'],
  ['Criminal Code s. 495', 'Arrest without warrant by a peace officer'],
  ['Criminal Code s. 487', 'Search warrant issued on information on oath'],
  ['Criminal Code s. 489', 'Seizing things not named in a warrant'],
  ['Criminal Code s. 529.3', 'Entering a dwelling to arrest in exigent circumstances'],
  ['RICE · study mnemonic', 'Repetition · Identity · Court · Evidence — s. 495(2)'],
  ['Hunter v. Southam (1984)', 'Warrantless searches are presumptively unreasonable'],
  ['R. v. Storrey (1990)', 'Arrest requires reasonable and probable grounds'],
  ['R. v. Feeney (1997)', 'Warrantless home entry to arrest is generally prohibited'],
  ['R. v. Caslake (1998)', 'Search incident to a lawful arrest'],
  ['R. v. Grant (2009)', 'Defines detention and the s. 24(2) test'],
];
const THEMES = {
  dark: { fog: 0x0f0d0a, stone: 0x2a2620, floor: 0x0a0907, line: 0xc99a4a, factTitle: '#ffd38a', factLine: '#f6ead2', factShadow: 'rgba(0,0,0,.75)', beam: 0xffd27a, additive: true, exposure: 1.05, bokeh: 0.5, shaft: 0.55 },
  light: { fog: 0xf3efe7, stone: 0xcdbfa7, floor: 0xbfae94, line: 0xa8741f, factTitle: '#8a4a0c', factLine: '#4f3418', factShadow: 'rgba(255,248,235,.9)', beam: 0xf0a640, additive: false, exposure: 0.85, bokeh: 0.3, shaft: 0.22 },
};
const FLOOR = -1.35, W = 1.5, D = 2.05, H = 0.2, PAGE_Y = 0.05 + H;
// Intro timeline in seconds: the cover opens, pages turn, light rises, then the scales appear.
const OPEN = [0.5, 1.7], FLIPS = 6, LIGHT = [2.4, 3.4], SCALES = [2.9, 4.1], REVEAL = 3.9, END = 5.4;

const clamp = (value, from, to) => Math.min(1, Math.max(0, (value - from) / (to - from)));
const smooth = t => t * t * (3 - 2 * t);
const outBack = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const bulge = u => 0.1 * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.3 * u);
function random(seed) {
  // Deterministic layout avoids a different scene on every visit.
  return () => { seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function canvas(width, height, paint) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  paint(element.getContext('2d'), width, height);
  return element;
}
function wrap(context, text, x, y, width, lineHeight) {
  let line = '';
  for (const word of text.split(' ')) {
    if (context.measureText(line + word).width > width && line) { context.fillText(line, x, y); y += lineHeight; line = ''; }
    line += word + ' ';
  }
  context.fillText(line, x, y);
  return y + lineHeight;
}
function paper(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#e9d7b0');
  gradient.addColorStop(0.12, '#f7ecd3');
  gradient.addColorStop(0.88, '#f7ecd3');
  gradient.addColorStop(1, '#e4cfa4');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}
function bars(context, x, y, width, until, seed) {
  // Unreadable placeholder lines: page texture without inventing legal text.
  const rand = random(seed);
  context.fillStyle = '#6b5638';
  context.globalAlpha = 0.5;
  for (; y < until; y += 26) context.fillRect(x, y, width * (0.72 + rand() * 0.28), 8);
  context.globalAlpha = 1;
}
// Page headings and the two quoted sections are verbatim statutory text.
function statutePage(side) {
  return canvas(512, 700, (context, width, height) => {
    paper(context, width, height);
    context.fillStyle = '#3a2410';
    context.textAlign = 'left';
    if (side < 0) {
      context.font = 'bold 30px Georgia, serif';
      wrap(context, 'CANADIAN CHARTER OF RIGHTS AND FREEDOMS', 48, 74, 420, 38);
      context.font = 'italic 26px Georgia, serif';
      context.fillText('Legal Rights', 48, 200);
      context.font = '25px Georgia, serif';
      let y = wrap(context, '8. Everyone has the right to be secure against unreasonable search or seizure.', 48, 250, 420, 34);
      y = wrap(context, '9. Everyone has the right not to be arbitrarily detained or imprisoned.', 48, y + 16, 420, 34);
      bars(context, 48, y + 20, 420, 660, 3);
    } else {
      context.font = 'bold 34px Georgia, serif';
      context.fillText('CRIMINAL CODE', 48, 80);
      context.font = 'italic 24px Georgia, serif';
      wrap(context, 'Arrest without Warrant and Release from Custody', 48, 130, 420, 32);
      let y = 230;
      for (const heading of ['494 Arrest without warrant by any person', '495 Arrest without warrant by peace officer', '487 Information for search warrant']) {
        context.font = 'bold 23px Georgia, serif';
        context.fillText(heading, 48, y);
        bars(context, 48, y + 26, 420, y + 120, y);
        y += 150;
      }
    }
  });
}
function plainPage(seed) {
  return canvas(256, 350, (context, width, height) => { paper(context, width, height); bars(context, 24, 40, 208, 320, seed); });
}
function coverArt() {
  return canvas(512, 700, (context, width, height) => {
    const gradient = context.createRadialGradient(256, 300, 40, 256, 350, 420);
    gradient.addColorStop(0, '#7a2a1f');
    gradient.addColorStop(1, '#3d120d');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#d9a64e';
    context.lineWidth = 6;
    context.strokeRect(28, 28, width - 56, height - 56);
    context.lineWidth = 2;
    context.strokeRect(44, 44, width - 88, height - 88);
    context.fillStyle = '#e8bb63';
    context.textAlign = 'center';
    context.font = 'bold 44px Georgia, serif';
    context.fillText('POLICE', 256, 470);
    context.fillText('POWERS', 256, 524);
    context.font = 'italic 24px Georgia, serif';
    context.fillText('Canadian police law', 256, 580);
    context.beginPath();
    context.moveTo(256, 150); context.lineTo(256, 360);
    context.moveTo(150, 200); context.lineTo(362, 200);
    context.moveTo(196, 380); context.lineTo(316, 380);
    context.lineWidth = 7;
    context.stroke();
    for (const x of [150, 362]) { context.beginPath(); context.arc(x, 265, 46, 0, Math.PI); context.fill(); }
  });
}

export function createScene(host, { paused = false, intro = false, onReveal = () => {} } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (_) { return null; }
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const rand = random(23);
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0, 0.05);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 90);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, fine ? 1.5 : 1.1));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();

  const disposables = new Set([environment]);
  const keep = item => (disposables.add(item), item);
  const texture = element => { const item = keep(new THREE.CanvasTexture(element)); item.colorSpace = THREE.SRGBColorSpace; item.anisotropy = 4; return item; };
  function mesh(geometry, material, parent) {
    const item = new THREE.Mesh(keep(geometry), material);
    parent.add(item);
    return item;
  }
  const glowTexture = keep(new THREE.CanvasTexture(canvas(64, 64, context => {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, '#ffffffff');
    gradient.addColorStop(0.3, '#ffffff77');
    gradient.addColorStop(1, '#ffffff00');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  })));
  const gold = keep(new THREE.MeshStandardMaterial({ color: 0xffc35a, metalness: 1, roughness: 0.2, emissive: 0x3a2200, emissiveIntensity: 0.5 }));
  const leather = keep(new THREE.MeshStandardMaterial({ color: 0x5b1d16, roughness: 0.55, metalness: 0.1 }));
  const cover = keep(new THREE.MeshStandardMaterial({ map: texture(coverArt()), roughness: 0.5, metalness: 0.2 }));
  const paperEdge = keep(new THREE.MeshStandardMaterial({ color: 0xd9bf8c, roughness: 0.95, envMapIntensity: 0.35, emissive: 0x3a2408, emissiveIntensity: 0.25 }));
  const stone = keep(new THREE.MeshStandardMaterial({ metalness: 0.12, roughness: 0.6, flatShading: true }));
  const floorMaterial = keep(new THREE.MeshStandardMaterial({ metalness: 0.65, roughness: 0.28 }));
  const lineMaterial = keep(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.22 }));

  // The open book: each half pivots on the spine, and the left half starts closed over the right.
  const book = new THREE.Group();
  book.position.set(0, FLOOR, 0.35);
  // Slightly oversized, like a lectern bible beneath the scales.
  book.scale.setScalar(1.3);
  scene.add(book);
  const hinge = PAGE_Y + 0.02;
  const halves = [-1, 1].map(side => {
    const half = new THREE.Group(), inner = new THREE.Group();
    half.position.y = side < 0 ? hinge : 0;
    inner.position.y = side < 0 ? -hinge : 0;
    half.add(inner);
    book.add(half);
    const board = new THREE.Mesh(keep(new THREE.BoxGeometry(W + 0.08, 0.05, D + 0.14)), side < 0 ? [leather, leather, leather, cover, leather, leather] : leather);
    board.position.set(side * (W + 0.08) / 2, 0.025, 0);
    inner.add(board);
    const profile = new THREE.Shape();
    profile.moveTo(0, 0.05);
    profile.lineTo(side * W, 0.05);
    profile.lineTo(side * W, PAGE_Y);
    for (let i = 24; i >= 0; i--) profile.lineTo(side * W * i / 24, PAGE_Y + bulge(i / 24));
    mesh(new THREE.ExtrudeGeometry(profile, { depth: D, bevelEnabled: false }).translate(0, 0, -D / 2), paperEdge, inner);
    const surface = new THREE.PlaneGeometry(W, D, 24, 1).rotateX(-Math.PI / 2).translate(side * W / 2, 0, 0);
    const position = surface.attributes.position;
    for (let i = 0; i < position.count; i++) position.setY(i, PAGE_Y + bulge(Math.abs(position.getX(i)) / W) + 0.004);
    surface.computeVertexNormals();
    mesh(surface, keep(new THREE.MeshStandardMaterial({ map: texture(statutePage(side)), color: 0xf0d6a2, roughness: 0.9, envMapIntensity: 0.35, emissive: 0x6b3d0c, emissiveIntensity: 0.12 })), inner);
    return half;
  });

  // Loose pages bend as they turn from right to left.
  const SEGMENTS = 28, profileX = new Float32Array(SEGMENTS + 1), profileY = new Float32Array(SEGMENTS + 1);
  const pages = Array.from({ length: FLIPS }, (_, n) => {
    const geometry = keep(new THREE.PlaneGeometry(W, D, SEGMENTS, 1).rotateX(-Math.PI / 2));
    const material = keep(new THREE.MeshStandardMaterial({ map: texture(plainPage(n + 7)), color: 0xf0d6a2, roughness: 0.9, envMapIntensity: 0.35, side: THREE.DoubleSide }));
    const page = new THREE.Mesh(geometry, material);
    page.position.y = PAGE_Y + 0.008 + n * 0.002;
    page.visible = false;
    book.add(page);
    const columns = Float32Array.from({ length: geometry.attributes.position.count }, (_, i) => Math.round((geometry.attributes.position.getX(i) + W / 2) / W * SEGMENTS));
    return { page, columns };
  });
  function turn({ page, columns }, progress) {
    page.visible = progress > 0.001 && progress < 0.999;
    if (!page.visible) return;
    const angle = Math.PI * progress, bend = -1.1 * Math.sin(Math.PI * progress), rest = 1 - Math.sin(Math.PI * progress);
    let x = 0, y = 0;
    for (let j = 0; j <= SEGMENTS; j++) {
      profileX[j] = x;
      profileY[j] = y + bulge(j / SEGMENTS) * rest;
      const phi = angle + bend * j / SEGMENTS;
      x += Math.cos(phi) * W / SEGMENTS;
      y += Math.sin(phi) * W / SEGMENTS;
    }
    const position = page.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) { position.setX(i, profileX[columns[i]]); position.setY(i, profileY[columns[i]]); }
    position.needsUpdate = true;
    page.geometry.computeVertexNormals();
  }

  // Gold scales standing in the gutter of the book.
  const scales = new THREE.Group();
  const scalesY = FLOOR + PAGE_Y * 1.3;
  scales.position.y = scalesY;
  scene.add(scales);
  const lathe = (points, segments = 48) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  mesh(lathe([[0, 0], [0.34, 0], [0.34, 0.05], [0.27, 0.08], [0.25, 0.14], [0.15, 0.18], [0.1, 0.24], [0, 0.24]]), gold, scales);
  const knops = [[0.5, 0.05], [1.1, 0.035], [1.75, 0.03], [2.25, 0.04]];
  const column = [];
  for (let y = 0.24; y <= 2.32; y += 0.02) column.push([0.045 + knops.reduce((sum, [c, a]) => sum + a * Math.exp(-Math.pow((y - c) / 0.06, 2)), 0), y]);
  mesh(lathe([[0, 0.24], ...column, [0, 2.32]], 32), gold, scales);
  mesh(new THREE.SphereGeometry(0.07, 20, 12), gold, scales).position.y = 2.42;
  mesh(new THREE.ConeGeometry(0.055, 0.32, 20), gold, scales).position.y = 2.64;
  const beamGroup = new THREE.Group();
  beamGroup.position.y = 2.3;
  scales.add(beamGroup);
  const beam = mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.7, 16), gold, beamGroup);
  beam.rotation.z = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.12, 0.016, 10, 40), gold, beamGroup);
  for (const side of [-1, 1]) {
    const scroll = mesh(new THREE.TorusGeometry(0.13, 0.013, 8, 24, Math.PI), gold, beamGroup);
    scroll.position.set(side * 0.75, 0.02, 0);
    mesh(new THREE.SphereGeometry(0.05, 16, 10), gold, beamGroup).position.x = side * 1.35;
  }
  const linkGeometry = keep(new THREE.TorusGeometry(0.026, 0.007, 5, 10));
  const hangers = [-1, 1].map(side => {
    const hanger = new THREE.Group();
    hanger.position.x = side * 1.35;
    beamGroup.add(hanger);
    const links = new THREE.InstancedMesh(linkGeometry, gold, 3 * 16);
    hanger.add(links);
    const dummy = new THREE.Object3D(), top = new THREE.Vector3(0, -0.05, 0), up = new THREE.Vector3(0, 1, 0);
    for (let c = 0; c < 3; c++) {
      const a = c * Math.PI * 2 / 3 + 0.4, bottom = new THREE.Vector3(Math.cos(a) * 0.4, -1.22, Math.sin(a) * 0.4);
      const direction = bottom.clone().sub(top).normalize();
      for (let i = 0; i < 16; i++) {
        dummy.position.lerpVectors(top, bottom, (i + 0.5) / 16);
        dummy.quaternion.setFromUnitVectors(up, direction).multiply(new THREE.Quaternion().setFromAxisAngle(up, i % 2 ? Math.PI / 2 : 0));
        dummy.scale.set(1, 1.7, 1);
        dummy.updateMatrix();
        links.setMatrixAt(c * 16 + i, dummy.matrix);
      }
    }
    const pan = new THREE.Group();
    pan.position.y = -1.25;
    hanger.add(pan);
    mesh(lathe([[0, -0.13], [0.16, -0.125], [0.32, -0.08], [0.43, -0.01], [0.45, 0.02]], 56), gold, pan).material.side = THREE.DoubleSide;
    mesh(new THREE.TorusGeometry(0.45, 0.014, 8, 56), gold, pan).rotation.x = Math.PI / 2;
    return hanger;
  });

  // Holy light rising from the pages: a soft shaft, a glow and a fountain of sparks.
  const shaftMaterial = keep(new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uIntensity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform vec3 uColor;uniform float uIntensity,uTime;varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){float core=pow(abs(dot(vNormal,vView)),2.5);float fall=pow(1.-vUv.y,1.7);gl_FragColor=vec4(uColor,core*fall*uIntensity*(.85+.15*sin(uTime*1.3+vUv.y*7.)));}',
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
  const shaft = mesh(new THREE.CylinderGeometry(1.9, 0.8, 6.2, 48, 1, true), shaftMaterial, scene);
  shaft.position.set(0, FLOOR + PAGE_Y * 1.3 + 3.1, 0.35);
  const glowMaterial = keep(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffd27a, transparent: true, depthWrite: false, opacity: 0 }));
  const glow = new THREE.Sprite(glowMaterial);
  glow.position.set(0, FLOOR + PAGE_Y * 1.3 + 0.25, 0.35);
  glow.scale.set(5, 2.4, 1);
  scene.add(glow);
  const sparkCount = fine ? 360 : 200;
  const sparkSeeds = Array.from({ length: sparkCount }, () => [rand(), 0.08 + rand() * 0.14, rand() * Math.PI * 2, 0.4 + rand() * 1.3, 2 + rand() * 3]);
  const sparkGeometry = keep(new THREE.BufferGeometry());
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sparkCount * 3), 3));
  sparkGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sparkCount * 4), 4));
  const sparkMaterial = keep(new THREE.PointsMaterial({ map: glowTexture, size: 0.08, vertexColors: true, transparent: true, depthWrite: false }));
  scene.add(new THREE.Points(sparkGeometry, sparkMaterial));
  const sparkColor = new THREE.Color(0xffcf73);

  // Background: warm bokeh, a distant colonnade with candles, and a polished floor running towards the viewer.
  const bokehMaterials = [0.35, 0.7, 1.2].map((size, layer) => {
    const count = 40 - layer * 10, positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) positions.set([(rand() - 0.5) * 30, FLOOR + rand() * 9, -7 - rand() * 24], i * 3);
    const geometry = keep(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = keep(new THREE.PointsMaterial({ map: glowTexture, color: 0xffb95c, size, transparent: true, depthWrite: false, fog: false }));
    const points = new THREE.Points(geometry, material);
    points.userData.layer = layer;
    scene.add(points);
    return material;
  });
  const bokehLayers = scene.children.filter(child => child.isPoints && child.userData.layer !== undefined);
  const COLUMNS = 11;
  const shafts = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.42, 0.48, 8, 20)), stone, COLUMNS * 2);
  const bases = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1.3, 0.4, 1.3)), stone, COLUMNS * 2);
  scene.add(shafts, bases);
  const placer = new THREE.Object3D();
  const flames = [];
  const candleMaterial = keep(new THREE.MeshStandardMaterial({ color: 0xf2e6cf, roughness: 0.7, emissive: 0x3a1c00, emissiveIntensity: 0.4 }));
  const flameMaterial = keep(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffa94a, transparent: true, depthWrite: false }));
  for (let i = 0; i < COLUMNS; i++) for (const [n, side] of [[0, -1], [1, 1]]) {
    const z = 1 - i * 4.5, x = side * 7.2;
    for (const [instances, y] of [[shafts, FLOOR + 0.4 + 4], [bases, FLOOR + 0.2]]) {
      placer.position.set(x, y, z);
      placer.updateMatrix();
      instances.setMatrixAt(i * 2 + n, placer.matrix);
    }
    if (i < 6) {
      const height = 0.3 + rand() * 0.35;
      const candle = mesh(new THREE.CylinderGeometry(0.07, 0.07, height, 12), candleMaterial, scene);
      candle.position.set(x - side * 0.85, FLOOR + height / 2, z + 0.5);
      const flame = new THREE.Sprite(flameMaterial);
      flame.position.set(candle.position.x, FLOOR + height + 0.12, candle.position.z);
      flame.scale.set(0.35, 0.5, 1);
      flame.userData.phase = rand() * 10;
      scene.add(flame);
      flames.push(flame);
    }
  }
  const floor = mesh(new THREE.PlaneGeometry(60, 120), floorMaterial, scene);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR, -30);
  const lines = [];
  for (let x = -8; x <= 8; x += 1.6) lines.push(x, FLOOR + 0.01, 12, x, FLOOR + 0.01, -60);
  for (let z = 12; z > -60; z -= 2.25) lines.push(-8, FLOOR + 0.01, z, 8, FLOOR + 0.01, z);
  const lineGeometry = keep(new THREE.BufferGeometry());
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  scene.add(new THREE.LineSegments(lineGeometry, lineMaterial));

  // Facts rise out of the light, drift outwards and towards the viewer, then fade.
  const factCards = FACTS.map(([title, line]) => {
    const element = canvas(1024, 256, () => {});
    return { title, line, element, map: texture(element) };
  });
  function paintFacts(theme) {
    for (const { title, line, element, map } of factCards) {
      const context = element.getContext('2d');
      context.clearRect(0, 0, 1024, 256);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.shadowColor = theme.factShadow;
      context.shadowBlur = 18;
      context.fillStyle = theme.factTitle;
      context.font = 'italic bold 66px Georgia, "Times New Roman", serif';
      context.fillText(title, 512, 92);
      context.fillStyle = theme.factLine;
      context.font = '46px Georgia, "Times New Roman", serif';
      context.fillText(line, 512, 176, 1000);
      map.needsUpdate = true;
    }
  }
  const factOrigin = new THREE.Vector3(0, FLOOR + PAGE_Y * 1.3 + 0.35, 0.35);
  let nextFact = 0;
  // Lane end points (x, height above the pages), launched in this order a quarter-cycle apart.
  const LANES = [[1.55, 1.0], [-0.45, 1.4], [1.15, 1.95], [-0.15, 2.4]];
  const floaterCount = LANES.length;
  const floaters = Array.from({ length: floaterCount }, (_, n) => {
    const sprite = new THREE.Sprite(keep(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0 })));
    sprite.renderOrder = 5;
    scene.add(sprite);
    return { sprite, lane: n, offset: n / floaterCount, last: 1, end: new THREE.Vector3(), size: 0.4 };
  });
  function launch(floater) {
    floater.sprite.material.map = factCards[nextFact++ % factCards.length].map;
    floater.sprite.material.needsUpdate = true;
    // Each floater keeps its own lane over the book and scales, so captions never overlap or reach the headline.
    const [x, y] = LANES[floater.lane];
    floater.end.set(x + (rand() - 0.5) * 0.2, factOrigin.y + y + (rand() - 0.5) * 0.15, factOrigin.z + 1.1 + rand() * 0.5);
    floater.size = 0.38 + rand() * 0.05;
  }
  scene.add(new THREE.HemisphereLight(0xffe6c4, 0x1d1a14, 1.2));
  const key = new THREE.DirectionalLight(0xffc98a, 3.2);
  key.position.set(-4, 6, 6);
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xdfe8ff, 1.6);
  rimLight.position.set(3, 3, -5);
  scene.add(rimLight);
  const heart = new THREE.PointLight(0xffc066, 0, 9, 1.4);
  heart.position.set(0, FLOOR + 1.2, 0.4);
  scene.add(heart);

  let shaftStrength = 0.55;
  function applyTheme() {
    const theme = THEMES[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
    const blending = theme.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    fog.color.set(theme.fog);
    stone.color.set(theme.stone);
    floorMaterial.color.set(theme.floor);
    lineMaterial.color.set(theme.line);
    shaftMaterial.uniforms.uColor.value.set(theme.beam);
    shaftStrength = theme.shaft;
    for (const material of [shaftMaterial, glowMaterial, sparkMaterial, flameMaterial, ...bokehMaterials]) { material.blending = blending; material.needsUpdate = true; }
    for (const material of bokehMaterials) material.opacity = theme.bokeh;
    paintFacts(theme);
    renderer.toneMappingExposure = theme.exposure;
    draw();
  }

  let frame = 0, last = 0, time = 0, clock = intro && !paused ? 0 : END, revealed = false, alive = true, visible = true, budget = 32, distance = 8.4;
  let targetX = 0, targetY = 0, lift = 0;
  const goal = new THREE.Vector3(), focus = new THREE.Vector3(), aim = new THREE.Vector3();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function draw() { if (alive) renderer.render(scene, camera); }
  function compose(delta, blend) {
    if (clock < END) clock = Math.min(END, clock + delta);
    if (!revealed && clock >= REVEAL) { revealed = true; onReveal(); }
    time += delta;
    const open = smooth(clamp(clock, ...OPEN));
    halves[0].rotation.z = -Math.PI + open * (Math.PI - 0.05);
    halves[1].rotation.z = 0.05;
    pages.forEach((page, n) => {
      const start = OPEN[1] - 0.2 + n * 0.2;
      // After the intro, one page at a time lifts slightly and settles back.
      const idle = clock >= END && n === Math.floor(time / 6) % FLIPS ? 0.12 * Math.pow(Math.sin(Math.PI * (time % 6) / 6), 2) : 0;
      turn(page, clock < END ? smooth(clamp(clock, start, start + 0.85)) : idle);
    });
    const light = smooth(clamp(clock, ...LIGHT));
    const pulse = 0.88 + 0.12 * Math.sin(time * 1.1);
    shaftMaterial.uniforms.uIntensity.value = shaftStrength * light * pulse;
    shaftMaterial.uniforms.uTime.value = time;
    glowMaterial.opacity = 0.9 * light * pulse;
    heart.intensity = 22 * light * pulse;
    const sparks = sparkGeometry.attributes.position, colors = sparkGeometry.attributes.color;
    sparkSeeds.forEach(([offset, speed, angle, radius, height], i) => {
      const life = (time * speed + offset) % 1, r = 0.15 + life * radius, a = angle + life * 2.2;
      sparks.setXYZ(i, Math.cos(a) * r * 1.6, FLOOR + PAGE_Y * 1.3 + 0.05 + life * height, 0.35 + Math.sin(a) * r * 0.8);
      colors.setXYZW(i, sparkColor.r, sparkColor.g, sparkColor.b, Math.sin(Math.PI * life) * light);
    });
    sparks.needsUpdate = colors.needsUpdate = true;
    const rise = clamp(clock, ...SCALES);
    scales.scale.setScalar(Math.max(0.001, outBack(rise)));
    scales.position.y = scalesY - (1 - smooth(rise)) * 0.7 + Math.sin(time * 0.7) * 0.03 * rise;
    scales.rotation.y = Math.sin(time * 0.22) * 0.22;
    beamGroup.rotation.z = Math.sin(time * 0.6) * 0.045;
    for (const hanger of hangers) hanger.rotation.z = -beamGroup.rotation.z;
    bokehLayers.forEach((layer, i) => { layer.position.x = Math.sin(time * 0.05 + i * 2) * 0.6; layer.position.y = Math.sin(time * 0.07 + i) * 0.2; });
    for (const flame of flames) flame.scale.set(0.32 + 0.05 * Math.sin(time * 9 + flame.userData.phase), 0.5 + 0.08 * Math.sin(time * 7 + flame.userData.phase), 1);
    const settle = clamp(clock, 3.4, 4.6);
    for (const floater of floaters) {
      const t = (time / 13 + floater.offset) % 1;
      if (t < floater.last) launch(floater);
      floater.last = t;
      const travel = Math.pow(t, 0.75);
      floater.sprite.position.lerpVectors(factOrigin, floater.end, travel);
      floater.sprite.position.y += Math.sin(time * 0.8 + floater.offset * 6) * 0.05;
      const grow = floater.size * (0.35 + 0.65 * smooth(Math.min(1, t * 3)));
      floater.sprite.scale.set(grow * 4, grow, 1);
      floater.sprite.material.opacity = settle * 0.95 * Math.min(1, Math.max(0, t - 0.04) / 0.14, (1 - t) / 0.3);
    }
    // The camera descends from above the closed book to face the scales.
    const intro = smooth(clamp(clock, 0, 4.6));
    goal.set(targetX * 1.1, THREE.MathUtils.lerp(4.2, 1.9, intro) + lift * 1.4 - targetY * 0.4, THREE.MathUtils.lerp(distance + 2.2, distance, intro) - lift * 1.2);
    camera.position.lerp(goal, blend);
    focus.set(targetX * 0.3, THREE.MathUtils.lerp(FLOOR + 0.2, 0.1, intro) - lift * 0.4, 0);
    aim.lerp(focus, blend);
    camera.lookAt(aim);
  }
  function resize() {
    if (!alive) return;
    const box = host.getBoundingClientRect();
    if (!box.width || !box.height) return;
    renderer.setSize(box.width, box.height, false);
    camera.aspect = box.width / box.height;
    // Landscape layouts keep text on the left, so the book moves right.
    const shift = box.width / box.height > 1.2 ? (box.width > 1100 ? 0.24 : 0.15) : 0;
    camera.setViewOffset(box.width, box.height, -box.width * shift, box.height * 0.02, box.width, box.height);
    camera.updateProjectionMatrix();
    budget = fine && box.width >= 1100 ? 15 : 32;
    // Portrait tablets stack the copy over the scene, so the camera stands further back.
    distance = camera.aspect < 1 ? 11.5 : 8.4;
    if (paused || motion.matches) compose(0, 1);
    draw();
  }
  function animate(now) {
    if (!alive || paused || motion.matches || document.hidden || !visible) { frame = 0; return; }
    frame = requestAnimationFrame(animate);
    if (now - last < budget) return;
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    compose(delta, 1 - Math.pow(0.9, delta * 60));
    draw();
  }
  function resume() {
    if (!frame && alive && !paused && !motion.matches && !document.hidden && visible) { last = performance.now(); frame = requestAnimationFrame(animate); }
  }
  function pointer(event) {
    if (!fine) return;
    targetX = event.clientX / innerWidth - 0.5;
    targetY = event.clientY / innerHeight - 0.5;
  }
  function resetPointer() { targetX = 0; targetY = 0; }
  function scroll() { lift = Math.min(scrollY / Math.max(innerHeight, 1), 1.2); }
  function visibility() { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else resume(); }
  function preference() { if (motion.matches) { cancelAnimationFrame(frame); frame = 0; skip(); } else resume(); }
  function lost(event) { event.preventDefault(); dispose(); host.classList.remove('scene-ready'); }
  function skip() { if (clock < END) { clock = END; compose(0, 1); } draw(); }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(host);
  const intersection = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; } else resume();
  }) : null;
  intersection?.observe(host);
  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('pointermove', pointer);
  document.documentElement.addEventListener('pointerleave', resetPointer);
  window.addEventListener('scroll', scroll, { passive: true });
  renderer.domElement.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', preference);
  window.addEventListener('resize', resize);
  function dispose() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(frame);
    observer?.disconnect(); intersection?.disconnect(); themeObserver.disconnect();
    window.removeEventListener('pointermove', pointer);
    document.documentElement.removeEventListener('pointerleave', resetPointer);
    window.removeEventListener('scroll', scroll);
    document.removeEventListener('visibilitychange', visibility);
    motion.removeEventListener('change', preference);
    window.removeEventListener('resize', resize);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    for (const item of disposables) item.dispose();
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  }
  scroll();
  applyTheme();
  resize();
  compose(0, 1);
  camera.position.copy(goal);
  aim.copy(focus);
  camera.lookAt(aim);
  draw(); resume();
  host.classList.add('scene-ready');
  return { dispose, skip, setPaused(value) { paused = value; cancelAnimationFrame(frame); frame = 0; if (!paused) resume(); draw(); } };
}
