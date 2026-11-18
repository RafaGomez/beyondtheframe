import * as T from 'three';

// A separate pointer owns the view and each touch button, so looking and walking
// can happen together. The scene supplies its own walkable area.
export function walkingControls(host, camera, allowed, signal) {
  const canvas = host.querySelector('canvas');
  const listen = (target, type, handler) => target.addEventListener(type, handler, { signal });
  const codes = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);
  const keyboard = new Set(), touches = new Map();
  let drag = null;
  listen(canvas,'pointerdown',event => {
    if (drag) return;
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas,'pointermove',event => {
    if (drag?.id !== event.pointerId) return;
    camera.rotation.y -= (event.clientX-drag.x)*.004;
    camera.rotation.x = T.MathUtils.clamp(camera.rotation.x-(event.clientY-drag.y)*.004,-1.38,1.38);
    drag.x=event.clientX; drag.y=event.clientY;
  });
  listen(canvas,'lostpointercapture',() => { drag=null; });
  listen(window,'keydown',event => {
    if (codes.has(event.code)) {
      event.preventDefault(); keyboard.add(event.code);
    }
  });
  listen(window,'keyup',event => keyboard.delete(event.code));
  listen(window,'blur',() => { keyboard.clear(); touches.clear(); drag=null; });
  for (const button of host.querySelectorAll('[data-key]')) {
    listen(button,'pointerdown',event => {
      event.preventDefault(); button.setPointerCapture(event.pointerId);
      touches.set(event.pointerId,button.dataset.key);
    });
    listen(button,'lostpointercapture',event => touches.delete(event.pointerId));
  }
  function active(code,arrow) {
    return keyboard.has(code) || keyboard.has(arrow) || Array.from(touches.values()).includes(code);
  }
  return dt => {
    const strafe=Number(active('KeyD','ArrowRight'))-Number(active('KeyA','ArrowLeft'));
    const forward=Number(active('KeyW','ArrowUp'))-Number(active('KeyS','ArrowDown'));
    if (!strafe && !forward) return;
    const yaw=camera.rotation.y,step=1.85*dt/Math.hypot(strafe,forward);
    const p=camera.position;
    const x=p.x+(Math.cos(yaw)*strafe-Math.sin(yaw)*forward)*step;
    const z=p.z-(Math.sin(yaw)*strafe+Math.cos(yaw)*forward)*step;
    if (allowed(x,p.z)) p.x=x;
    if (allowed(p.x,z)) p.z=z;
  };
}

export const walkPad = `<div class="walk-pad" role="group" aria-label="Caminar">
  <button data-key="KeyW" aria-label="Avanzar">↑</button>
  <button data-key="KeyA" aria-label="Paso a la izquierda">←</button>
  <button data-key="KeyS" aria-label="Retroceder">↓</button>
  <button data-key="KeyD" aria-label="Paso a la derecha">→</button>
</div>`;
