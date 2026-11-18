import * as T from 'three';
import { furnish } from './arles/model.js';
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
  host.innerHTML=`<header class="arles-bar"><button data-back>← Galería</button><span>La habitación en Arlés</span><button data-light aria-pressed="false">Luz de tarde</button></header><div class="arles-hud"><div class="walk-pad" aria-label="Caminar"><button data-key="KeyW" aria-label="Avanzar">↑</button><button data-key="KeyA" aria-label="Paso a la izquierda">←</button><button data-key="KeyS" aria-label="Retroceder">↓</button><button data-key="KeyD" aria-label="Paso a la derecha">→</button></div><span class="walk-hint">WASD o flechas para caminar · Arrastra para mirar</span></div>`;
  host.prepend(renderer.domElement);
  const parent=document.fullscreenElement||document.body;
  parent.append(host);
  const events=new AbortController(),listen=(el,event,fn)=>el.addEventListener(event,fn,{signal:events.signal});
  const canvas=renderer.domElement,keys=new Set();
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
  let drag=null;
  listen(canvas,'pointerdown',e=>{if(drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
  listen(canvas,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;
    camera.rotation.y-=(e.clientX-drag.x)*.004;camera.rotation.x=T.MathUtils.clamp(camera.rotation.x-(e.clientY-drag.y)*.004,-1.38,1.38);drag.x=e.clientX;drag.y=e.clientY});
  listen(canvas,'lostpointercapture',()=>drag=null);
  const codes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);
  listen(window,'keydown',e=>{if(e.key==='Escape'){close();return}if(codes.has(e.code)){e.preventDefault();keys.add(e.code)}});
  listen(window,'keyup',e=>keys.delete(e.code));
  listen(window,'blur',()=>keys.clear());
  for(const button of host.querySelectorAll('[data-key]')){
    listen(button,'pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key)});
    listen(button,'lostpointercapture',()=>keys.delete(button.dataset.key));
  }
  function allowed(x,z){const r=.18;return Math.abs(x)<3.5-r && z> -3.6+r && z<3.9-r && !model.obstacles.some(([l,h,b,f])=>x>l-r&&x<h+r&&z>b-r&&z<f+r)}
  const active=(a,b)=>Number(keys.has(a)||keys.has(b));
  let previous=performance.now();
  renderer.setAnimationLoop(now=>{
    const dt=Math.min(.05,Math.max(0,(now-previous)/1000));previous=now;
    const strafe=active('KeyD','ArrowRight')-active('KeyA','ArrowLeft'),forward=active('KeyW','ArrowUp')-active('KeyS','ArrowDown');
    const yaw=camera.rotation.y, step=1.85*dt/Math.max(1,Math.hypot(strafe,forward));
    const pos=camera.position,x=pos.x+(Math.cos(yaw)*strafe-Math.sin(yaw)*forward)*step,z=pos.z-(Math.sin(yaw)*strafe+Math.cos(yaw)*forward)*step;
    if(allowed(x,pos.z))pos.x=x;if(allowed(pos.x,z))pos.z=z;
    renderer.render(world,camera);
  });
  function resize(){renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix()}
  resize();listen(window,'resize',resize);
  const back=host.querySelector('[data-back]');listen(back,'click',close);back.focus();
  function close(){events.abort();renderer.setAnimationLoop(null);model.dispose();sun.shadow.dispose();renderer.dispose();host.remove();onExit();document.querySelector('#enter')?.focus()}
}
