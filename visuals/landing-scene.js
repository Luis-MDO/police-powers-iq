/* Optional enhancement. This bundle is fetched only on the exam-choice screen. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createScene(host, { paused = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (_) { return null; }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(4.2, 2.6, 7.6);
  camera.lookAt(0, 0.2, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();

  const copper = new THREE.MeshStandardMaterial({ color: 0xc97d49, metalness: 0.9, roughness: 0.25 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xe9af77, metalness: 0.85, roughness: 0.3 });
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x252a25, metalness: 0.65, roughness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xffad6b, metalness: 0.65, roughness: 0.35, transparent: true, opacity: 0.6 });
  const group = new THREE.Group();
  scene.add(group);
  const geometries = new Set();
  function mesh(geometry, material, parent = group) {
    geometries.add(geometry);
    const item = new THREE.Mesh(geometry, material);
    parent.add(item);
    return item;
  }
  function cylinder(top, bottom, height, y, material) {
    const item = mesh(new THREE.CylinderGeometry(top, bottom, height, 48), material);
    item.position.y = y;
    return item;
  }
  function ring(radius, thickness, y, material) {
    const item = mesh(new THREE.TorusGeometry(radius, thickness, 10, 80), material);
    item.rotation.x = Math.PI / 2;
    item.position.y = y;
    return item;
  }
  function rod(from, to, radius, parent) {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
    const delta = end.clone().sub(start);
    const item = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 10), bronze, parent);
    item.position.copy(start.add(end).multiplyScalar(0.5));
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return item;
  }
  // Weighted pedestal, tapered column and a polished beam.
  cylinder(0.79, 0.88, 0.13, -1.12, charcoal);
  cylinder(0.69, 0.78, 0.06, -1.025, copper);
  ring(0.72, 0.018, -1.0, bronze);
  cylinder(0.38, 0.62, 0.13, -0.94, charcoal);
  cylinder(0.095, 0.17, 1.94, 0.07, copper);
  cylinder(0.15, 0.22, 0.09, -0.87, bronze);
  cylinder(0.15, 0.12, 0.07, 0.98, bronze);
  const crown = mesh(new THREE.OctahedronGeometry(0.18), bronze);
  crown.position.y = 1.25;
  const beamGroup = new THREE.Group();
  beamGroup.position.y = 1.02;
  group.add(beamGroup);
  rod([-1.55,0,0],[1.55,0,0],0.045,beamGroup);
  for (const x of [-1.55,1.55]) {
    const end = mesh(new THREE.SphereGeometry(0.085,20,12), copper, beamGroup);
    end.position.x = x;
    const pan = new THREE.Group();
    pan.position.set(x, -1.04, 0);
    beamGroup.add(pan);
    const points = [[0,-0.23],[0.18,-0.22],[0.4,-0.16],[0.59,-0.035],[0.63,0.025]]
      .map(([r,y])=>new THREE.Vector2(r,y));
    const bowl = mesh(new THREE.LatheGeometry(points,64),copper,pan);
    bowl.material.side = THREE.DoubleSide;
    const rim = mesh(new THREE.TorusGeometry(0.63,0.022,10,64),bronze,pan);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.025;
    for (let i=0;i<3;i++) {
      const a=i*Math.PI*2/3;
      rod([0,1.01,0],[Math.cos(a)*0.59,0.035,Math.sin(a)*0.59],0.008,pan);
    }
  }
  const halo = mesh(new THREE.TorusGeometry(2.18,0.012,8,140),glass);
  halo.rotation.set(0.7,0.12,-0.23);
  halo.position.y=0.2;
  const orbit = mesh(new THREE.TorusGeometry(2.48,0.006,6,140),glass);
  orbit.rotation.set(1.08,-0.38,0.4);

  const positions = new Float32Array(180*3);
  // Deterministic positions avoid a different scene on every visit.
  for(let i=0;i<180;i++){
    const a=i*2.39996,r=3+(i%17)*0.65;
    positions[i*3]=Math.cos(a)*r;
    positions[i*3+1]=Math.sin(i*1.7)*5;
    positions[i*3+2]=Math.sin(a)*r;
  }
  const particleGeometry=new THREE.BufferGeometry();
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometries.add(particleGeometry);
  const particleMaterial=new THREE.PointsMaterial({color:0xe9ad70,size:0.055,transparent:true,opacity:0.85,depthWrite:false});
  const particles=new THREE.Points(particleGeometry,particleMaterial);
  scene.add(particles);
  scene.add(new THREE.HemisphereLight(0xffe6c4,0x233128,2));
  const light=new THREE.DirectionalLight(0xffbb77,5);
  light.position.set(-3,4,4);scene.add(light);
  const rimLight=new THREE.DirectionalLight(0xe6f2e5,3);
  rimLight.position.set(3,2,-3);scene.add(rimLight);

  let frame=0, last=0, time=0, alive=true, visible=true;
  let targetX=0,targetY=0;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  function draw(){ if(alive)renderer.render(scene,camera); }
  function resize(){
    if(!alive)return;
    const box=host.getBoundingClientRect();
    if(!box.width||!box.height)return;
    renderer.setSize(box.width,box.height,false);
    camera.aspect=box.width/box.height;
    // Shift the camera framing rather than limiting the artwork to a card.
    camera.setViewOffset(box.width,box.height,-box.width*(box.width>750?.22:.28),box.height*.03,box.width,box.height);
    camera.updateProjectionMatrix();draw();
  }
  function animate(now){
    if(!alive||paused||motion.matches||document.hidden||!visible){frame=0;return}
    frame=requestAnimationFrame(animate);
    if(now-last<33)return;
    const delta=Math.min((now-last)/1000,0.05);last=now;time+=delta;
    group.position.y=Math.sin(time*0.8)*0.16;
    group.rotation.y+=(targetX*0.45+Math.sin(time*.45)*.4-0.2-group.rotation.y)*0.04;
    group.rotation.x+=(targetY*0.14-group.rotation.x)*0.04;
    beamGroup.rotation.z=Math.sin(time*0.9)*0.095;
    particles.rotation.y=time*0.065;
    particles.rotation.x=Math.sin(time*.16)*.15;
    halo.rotation.z=time*.16;
    halo.rotation.y=Math.sin(time*.3)*.55;
    orbit.rotation.z=-time*.12;
    orbit.rotation.x=1.08+Math.sin(time*.4)*.3;
    draw();
  }
  function resume(){
    if(!frame&&alive&&!paused&&!motion.matches&&!document.hidden&&visible){last=performance.now();frame=requestAnimationFrame(animate)}
  }
  function pointer(event){
    if(!fine.matches)return;
    const box=host.getBoundingClientRect();
    targetX=(event.clientX-box.left)/box.width-0.5;
    targetY=(event.clientY-box.top)/box.height-0.5;
  }
  function resetPointer(){targetX=0;targetY=0}
  function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0}else resume()}
  function preference(){if(motion.matches){cancelAnimationFrame(frame);frame=0;draw()}else resume()}
  function lost(event){event.preventDefault();dispose();host.classList.remove('scene-ready')}
  const observer = typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
  observer?.observe(host);
  const intersection=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(!visible){cancelAnimationFrame(frame);frame=0}else resume();
  }):null;
  intersection?.observe(host);
  window.addEventListener('pointermove',pointer);
  document.documentElement.addEventListener('pointerleave',resetPointer);
  renderer.domElement.addEventListener('webglcontextlost',lost);
  document.addEventListener('visibilitychange',visibility);
  motion.addEventListener('change',preference);
  window.addEventListener('resize',resize);
  function dispose(){
    if(!alive)return;alive=false;
    cancelAnimationFrame(frame);observer?.disconnect();intersection?.disconnect();
    window.removeEventListener('pointermove',pointer);document.documentElement.removeEventListener('pointerleave',resetPointer);
    document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',preference);
    window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('webglcontextlost',lost);
    for(const geometry of geometries)geometry.dispose();
    for(const material of [copper,bronze,charcoal,glass,particleMaterial])material.dispose();
    environment.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }
  group.rotation.y=-0.2;
  resize();draw();resume();host.classList.add('scene-ready');
  return { dispose, setPaused(value){paused=value;cancelAnimationFrame(frame);frame=0;if(!paused)resume();draw()} };
}
