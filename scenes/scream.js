import * as T from 'three';
import { walkingControls, walkPad } from './walk.js';
import { loadPaint } from './scream/materials.js';
import { bridge, deck, landscape } from './scream/landscape.js';
import { companion, screamingFigure } from './scream/figures.js';
import './scream/scene.css';

export async function open(onExit) {
  const renderer=new T.WebGLRenderer({antialias:true});
  const world=new T.Scene(), camera=new T.PerspectiveCamera(54,1,.045,260);
  const host=document.createElement('section');
  host.className='scene scream'; host.setAttribute('aria-label','El grito');
  host.innerHTML=`<header class="scream-bar"><button data-back>← Galería</button><span>El grito</span>
    <button data-view>Encuadre original</button></header>
    <div class="scream-hud">${walkPad}<span>WASD o flechas para caminar · Arrastra para mirar</span></div>`;
  host.prepend(renderer.domElement);
  const events=new AbortController(), obstacles=[];
  let pigments, closed=false;
  function dispose() {
    events.abort(); renderer.setAnimationLoop(null);
    world.traverse(object=>{object.geometry?.dispose();object.shadow?.dispose();if(object.isInstancedMesh)object.dispose();});
    pigments?.dispose(); renderer.dispose(); host.remove();
  }
  function close() {
    if (closed) return;
    closed=true; dispose(); onExit(); document.querySelector('#enter')?.focus();
  }
  const entryPosition=new T.Vector3(),entryRotation=new T.Quaternion();
  function originalView() {
    // Stay closer to the railing in portrait so the distant walkers fit beside the face.
    const width=T.MathUtils.smoothstep(camera.aspect,.67,1.45);
    const x=T.MathUtils.lerp(.12,-.70,width),z=T.MathUtils.lerp(3.70,3.60,width);
    const halfWidth=Math.atan(camera.aspect*Math.tan(T.MathUtils.degToRad(camera.fov/2)));
    const faceBearing=Math.atan2(.78-x,z-1.08),walkerBearing=Math.atan2(-.85-x,z+6.9);
    const yaw=Math.min(faceBearing,walkerBearing+halfWidth-.06);
    camera.position.set(x,2.17,z);
    camera.rotation.set(-.145,-yaw,0,'YXZ');
    entryPosition.copy(camera.position);entryRotation.copy(camera.quaternion);
  }
  function place(figure,x,z,yaw,scale,radius) {
    figure.position.set(x,0,z); figure.rotation.y=yaw; figure.scale.setScalar(scale);
    figure.traverse(object=>{if(object.isMesh) object.castShadow=true;});
    world.add(figure); obstacles.push({x,z,radius});
  }
  function allowed(x,z) {
    const margin=.23;
    return x>deck.left+margin && x<deck.right-margin && z>deck.back && z<deck.front
      && obstacles.every(o=>(x-o.x)**2+(z-o.z)**2>(margin+o.radius)**2);
  }
  try {
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFShadowMap;
    renderer.shadowMap.autoUpdate=false;
    renderer.shadowMap.needsUpdate=true;
    pigments=await loadPaint();
    const {paint}=pigments;
    world.background=new T.Color('#ce9473');
    world.fog=new T.FogExp2('#8e88a0',.0058);
    landscape(world,paint); bridge(world,paint);
    place(screamingFigure(paint),.78,1.08,-.53,1,.30);
    place(companion(paint,true),-.85,-6.9,2.35,1.04,.24);
    place(companion(paint,false),.18,-8.05,-2.93,.99,.24);
    const ambient=new T.HemisphereLight('#fff0de','#c6c9dc',1.74);
    const sun=new T.DirectionalLight('#ffe4bf',1.38);
    sun.position.set(-7,10,5);sun.target.position.set(0,0,-2);
    sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
    Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:32});
    sun.shadow.bias=-.0004;sun.shadow.normalBias=.015;
    world.add(ambient,sun,sun.target);
    (document.fullscreenElement || document.body).append(host);
    const walk=walkingControls(host,camera,allowed,events.signal);
    const listen=(target,event,fn)=>target.addEventListener(event,fn,{signal:events.signal});
    let redraw=true;
    function resize() {
      redraw=true;
      const atEntry=camera.position.equals(entryPosition) && camera.quaternion.equals(entryRotation);
      const {clientWidth:w,clientHeight:h}=host;
      renderer.setSize(w,h);camera.aspect=w/h;
      camera.fov=T.MathUtils.lerp(65,54,T.MathUtils.smoothstep(camera.aspect,.67,1.45));
      camera.updateProjectionMatrix();
      if(atEntry) originalView();
    }
    resize();listen(window,'resize',resize);
    const back=host.querySelector('[data-back]');
    listen(back,'click',close);listen(host.querySelector('[data-view]'),'click',originalView);
    listen(window,'keydown',event=>{if(event.key==='Escape')close();});
    listen(renderer.domElement,'webglcontextrestored',()=>{redraw=true;renderer.shadowMap.needsUpdate=true;});
    back.focus();
    const previousView=new T.Matrix4();
    let previous=performance.now();
    renderer.setAnimationLoop(now=>{
      walk(T.MathUtils.clamp((now-previous)/1000,0,.06));previous=now;
      camera.updateMatrix();
      if (redraw || !previousView.equals(camera.matrix)) {
        renderer.render(world,camera);
        previousView.copy(camera.matrix);redraw=false;
      }
    });
  } catch (error) {
    dispose();document.querySelector('#enter')?.focus();throw error;
  }
}
