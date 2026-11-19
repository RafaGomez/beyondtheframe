import * as T from 'three';
import { furnish } from './arles/model.js';
import { walkingControls, walkPad } from './walk.js';
import './arles/room.css';

export async function open(onExit) {
  const renderer = new T.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  const world=new T.Scene(), camera=new T.PerspectiveCamera(72,1,.045,28);
  let model;
  try { model=await furnish(world); } catch(error){ renderer.dispose(); throw error; }
  const host=document.createElement('section');
  host.className='scene arles';
  host.setAttribute('aria-label','La habitación en Arlés');
  host.innerHTML=`<header class="arles-bar"><button data-back>← Galería</button><span>La habitación en Arlés</span><button data-light aria-pressed="false">Luz de tarde</button></header><div class="arles-hud">${walkPad}<span class="walk-hint">WASD o flechas para caminar · Arrastra para mirar</span></div>`;
  host.prepend(renderer.domElement);
  const parent=document.fullscreenElement||document.body;
  parent.append(host);
  const events=new AbortController(),listen=(el,event,fn)=>el.addEventListener(event,fn,{signal:events.signal});
  const sky=new T.HemisphereLight(0xfff5de,0xb2a3ad,1.68);
  const sun=new T.DirectionalLight(0xffe6af,1.45);
  sun.position.set(-2.8,3.65,-2.85);sun.target.position.set(.9,0,.9);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:14});sun.shadow.bias=-.00065;sun.shadow.normalBias=.018;
  // Illuminate the interior without projecting the outer shell onto the furniture.
  world.children.filter(o=>o.isGroup).slice(0,4).forEach(wall=>wall.children[0].castShadow=false);
  world.add(sky,sun,sun.target);
  camera.position.set(-.46,1.70,3.58);camera.rotation.order='YXZ';camera.rotation.set(-.13,-.065,0,'YXZ');
  const pressed=host.querySelector('[data-light]');
  listen(pressed,'click',()=>{const evening=pressed.getAttribute('aria-pressed')==='false';pressed.setAttribute('aria-pressed',String(evening));pressed.textContent=evening?'Luz de mañana':'Luz de tarde';sky.intensity=evening?1.05:1.68;sun.color.set(evening?0xffad69:0xffe6af);sun.position.x=evening?-3.35:-2.8;sun.position.y=evening?2.45:3.65});
  listen(window,'keydown',e=>{if(e.key==='Escape')close()});
  function allowed(x,z){const r=.18;return Math.abs(x)<3.5-r && z> -3.6+r && z<3.9-r && !model.obstacles.some(([l,h,b,f])=>x>l-r&&x<h+r&&z>b-r&&z<f+r)}
  const walk=walkingControls(host,camera,allowed,events.signal);
  let previous=performance.now();
  renderer.setAnimationLoop(now=>{
    walk(Math.min(.05,Math.max(0,(now-previous)/1000)));previous=now;
    renderer.render(world,camera);
  });
  function resize(){renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix()}
  resize();listen(window,'resize',resize);
  const back=host.querySelector('[data-back]');listen(back,'click',close);back.focus();
  function close(){events.abort();renderer.setAnimationLoop(null);model.dispose();sun.shadow.dispose();renderer.dispose();host.remove();onExit();document.querySelector('#enter')?.focus()}
}
