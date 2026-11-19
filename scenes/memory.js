import * as T from 'three';
import { walkingControls, walkPad } from './walk.js';
import { pigments } from './memory/palette.js';
import { buildWorld } from './memory/world.js';
import './memory/scene.css';

export async function open(onExit) {
  const renderer=new T.WebGLRenderer({antialias:true});
  const world=new T.Scene(), camera=new T.PerspectiveCamera(48,1,.06,240);
  const host=document.createElement('section');
  host.className='scene memory';host.setAttribute('aria-label','La persistencia de la memoria');
  host.innerHTML=`<header class="memory-bar"><button data-back>← Galería</button>
    <div class="memory-title"><span>La persistencia de la memoria</span><small>Salvador Dalí · 1931</small></div>
    <button data-view>Encuadre original</button></header>
    <div class="memory-hud">${walkPad}<span class="memory-hint">WASD o flechas para caminar · Arrastra para mirar</span></div>`;
  host.prepend(renderer.domElement);
  const events=new AbortController(), palette=pigments();
  const listen=(target,event,fn)=>target.addEventListener(event,fn,{signal:events.signal});
  let closed=false;
  function dispose() {
    events.abort();renderer.setAnimationLoop(null);
    const geometries=new Set(),materials=new Set(),textures=new Set();
    world.traverse(object=>{
      if(object.geometry)geometries.add(object.geometry);
      object.shadow?.dispose();
      for(const material of (Array.isArray(object.material)?object.material:[object.material])) {
        if(!material)continue;
        materials.add(material);
        for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
      }
    });
    geometries.forEach(geometry=>geometry.dispose());
    materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());
    palette.dispose();renderer.dispose();host.remove();
  }
  function close() {
    if(closed)return;
    closed=true;dispose();onExit();document.querySelector('#enter')?.focus();
  }
  const entryPosition=new T.Vector3(),entryRotation=new T.Quaternion();
  function originalView() {
    const portrait=1-T.MathUtils.smoothstep(camera.aspect,.65,1.35);
    camera.position.set(4.5,4.1,12.8+portrait*8);
    camera.lookAt(-.2,1.1,-1.5);
    entryPosition.copy(camera.position);entryRotation.copy(camera.quaternion);
  }
  try {
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
    world.background=new T.Color('#a9c7b3');world.fog=new T.Fog('#b9b89a',80,170);
    const obstacles=buildWorld(world,palette.paint);
    const ambient=new T.HemisphereLight('#e2e9ce','#58452d',2.0);
    const sun=new T.DirectionalLight('#ffe0a2',3.1);
    sun.position.set(-13,12,-10);sun.target.position.set(0,0,1);
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-15,right:15,top:12,bottom:-13,near:.5,far:50});
    sun.shadow.bias=-.00035;sun.shadow.normalBias=.025;sun.shadow.radius=2;
    world.add(ambient,sun,sun.target);
    camera.rotation.order='YXZ';
    (document.fullscreenElement||document.body).append(host);
    let redraw=true;
    function resize() {
      const atEntry=camera.position.equals(entryPosition)&&camera.quaternion.equals(entryRotation);
      const w=host.clientWidth,h=host.clientHeight;
      renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
      if(atEntry)originalView();
      redraw=true;
    }
    resize();originalView();listen(window,'resize',resize);
    function allowed(x,z) {
      return x>-15&&x<18&&z>-19&&z<25&&obstacles.every(o=>x<o.left||x>o.right||z<o.back||z>o.front);
    }
    const walk=walkingControls(host,camera,allowed,events.signal);
    const back=host.querySelector('[data-back]');
    listen(back,'click',close);listen(host.querySelector('[data-view]'),'click',originalView);
    listen(window,'keydown',event=>{if(event.key==='Escape')close();});
    listen(renderer.domElement,'webglcontextrestored',()=>{redraw=true;renderer.shadowMap.needsUpdate=true;});
    back.focus();
    const previousView=new T.Matrix4();let previous=performance.now();
    renderer.setAnimationLoop(now=>{
      walk(T.MathUtils.clamp((now-previous)/1000,0,.06));previous=now;
      camera.updateMatrix();
      if(redraw||!previousView.equals(camera.matrix)) {
        renderer.render(world,camera);previousView.copy(camera.matrix);redraw=false;
      }
    });
  } catch(error) {
    dispose();document.querySelector('#enter')?.focus();throw error;
  }
}
