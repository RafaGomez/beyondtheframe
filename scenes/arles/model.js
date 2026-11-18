import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const files = import.meta.glob('./*.webp', { eager:true, import:'default' });
export async function furnish(world) {
  const loader = new T.TextureLoader(), materials = new Map(), maps = [];
  const textures = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([path,url]) => {
    const tex = await loader.loadAsync(url); tex.colorSpace=T.SRGBColorSpace;
    tex.anisotropy=4; maps.push(tex); return [path.slice(2,-5),tex];
  })));
  const obstacles=[];
  function material(key, tint='#ffffff', u=1,v=1) {
    const id=[key,tint,u,v].join(':'); if(materials.has(id))return materials.get(id);
    let map=textures[key];
    if(map && (u!==1||v!==1)){map=map.clone();map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(u,v);maps.push(map)}
    const m=new T.MeshLambertMaterial({map:map||null,color:tint,side:T.DoubleSide});materials.set(id,m);return m;
  }
  const oak=material('oak'), dark=material('oak','#977448'), straw=material('seat'), blue=material('plaster','#889abc');
  function mesh(parent,geo,mat,x,y,z){const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
  function block(parent,x,y,z,w,h,d,mat,r=0){return mesh(parent,r?new RoundedBoxGeometry(w,h,d,2,r):new T.BoxGeometry(w,h,d),mat,x,y,z)}
  function group(x,y,z,angle=0){const o=new T.Group();o.position.set(x,y,z);o.rotation.y=angle;world.add(o);return o}
  function panel(p,x,y,z,w,h,mat){return mesh(p,new T.PlaneGeometry(w,h),mat,x,y,z)}
  function rod(p,x,y,z,r,h,mat,top=r){return mesh(p,new T.CylinderGeometry(top,r,h,10),mat,x,y,z)}
  function bulb(p,x,y,z,w,h,d,mat){const o=mesh(p,new T.SphereGeometry(1,24,14),mat,x,y,z);o.scale.set(w,h,d);return o}
  function solid(x,z,w,d){obstacles.push([x-w/2,x+w/2,z-d/2,z+d/2])}
  const back=group(0,0,-3.6),left=group(-3.5,0,0,Math.PI/2),right=group(3.5,0,0,-Math.PI/2),front=group(0,0,3.9,Math.PI);
  for(const [p,w,color] of [[back,7,'#f1f2ff'],[left,7.5,'#d4d4ee'],[right,7.5,'#ffffdf'],[front,7,'#dadce7']]){
    block(p,0,1.95,-.05,w,3.9,.1,material('plaster',color,5,3));block(p,0,.07,.015,w,.14,.06,blue);
  }
  block(world,0,3.95,.15,7,.1,7.5,material('plaster','#c8c5c0',4,4));
  for(let i=0;i<19;i++){block(world,-3.5+(i+.5)*7/19,-.053,.15,7/19-.006,.1,7.5,material('boards',['#f6e2d7','#fff4eb','#f1d7c9'][i%3],1,3))}
  world.background=new T.Color('#494b48');
  block(back,-1.18,2.55,.07,1.91,2.06,.12,dark);panel(back,-1.18,2.55,.14,1.83,1.99,material('window'));block(back,-1.18,1.49,.13,2,.09,.22,blue);
  function picture(p,x,y,w,h,key,tilt=0){const f=new T.Group();p.add(f);f.position.set(x,y,.06);f.rotation.z=tilt;block(f,0,0,0,w+.035,h+.035,.06,dark);panel(f,0,0,.034,w,h,material(key))}
  picture(back,1.32,2.58,1.06,.72,'landscape',.018);picture(right,-2.55,2.92,.57,.8,'portrait',-.08);picture(right,-1.57,3.04,.64,.84,'portrait2',.07);picture(right,-2.18,2.03,.42,.56,'drawing',.09);picture(right,-1.19,2.12,.7,.52,'print',-.04);
  for(const [wall,x] of [[left,.65],[right,2.7],[front,.75]]){block(wall,x,1.39,.045,1.24,2.78,.09,blue);panel(wall,x,1.35,.1,1.12,2.64,material('door'));bulb(wall,x+.43,1.14,.15,.048,.048,.048,dark)}
  // Arched panels follow the silhouette of the oak bedstead.
  const bed=group(1.56,0,-.42);solid(1.56,-.42,2.26,3.85);
  for(const z of [-1.83,1.83]){
    const shape=new T.Shape();shape.moveTo(-1,.32);shape.lineTo(1,.32);shape.lineTo(1,1.41);shape.bezierCurveTo(.62,1.30,.38,1.71,-.04,1.67);shape.bezierCurveTo(-.46,1.69,-.72,1.36,-1,1.42);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2});
    const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+1)/2,uv.getY(i)/1.75);
    mesh(bed,g,oak,0,0,z);block(bed,0,.42,z+.12,2.05,.16,.06,oak,.025);
    for(const x of [-1.04,1.04]){block(bed,x,.8,z+.045,.16,1.6,.19,oak,.06);bulb(bed,x,1.57,z+.045,.09,.12,.1,oak)}
  }
  block(bed,0,.54,0,2.15,.28,3.72,oak,.05);block(bed,0,.8,0,2.03,.43,3.62,material('linen','#ffdc85',3,5),.14);
  const blanket=block(bed,0,.96,.42,2.12,.34,2.72,material('red','#ffbbae',5,4),.16);
  const pos=blanket.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,pos.getY(i)+.025*Math.sin(7*x+2*z)+.016*Math.cos(9*z-x))}blanket.geometry.computeVertexNormals();
  for(const x of [-.49,.46]){const pillow=block(bed,x,1.18,-1.36,.94,.27,.68,material('linen','#ffefa8',2,1),.13);pillow.rotation.x=.33;pillow.rotation.z=x*.16}
  function chair(x,z,angle){const c=group(x,0,z,angle);solid(x,z,.81,.81);block(c,0,.53,0,.69,.11,.68,straw,.045);
    for(const a of [-.29,.29])for(const b of [-.28,.28]){const h=b<0?1.34:.52;rod(c,a,h/2,b,.045,h,oak,.053)}
    for(const y of [.22,.36])for(const side of [-.29,.29]){block(c,side,y,0,.048,.05,.58,oak);block(c,0,y-.035,side,.58,.047,.05,oak)}
    for(const y of [.89,1.14,1.29]) block(c,0,y,-.28,.64,.096,.07,oak,.025);
  }
  chair(-2.28,.89,.82);chair(-.16,-2.65,.48);
  const table=group(-2.05,0,-2.3,.055);solid(-2.05,-2.3,1.59,1.02);const cherry=material('oak','#c88466');
  block(table,0,1.03,0,1.55,.105,1,cherry,.04);block(table,0,.86,0,1.31,.28,.8,cherry);block(table,0,.87,.42,1.08,.2,.04,oak,.02);bulb(table,0,.86,.47,.07,.035,.04,dark);
  for(const x of [-.62,.62])for(const z of [-.38,.38])rod(table,x,.48,z,.044,.94,cherry,.068);
  const ceramic=material('plaster','#b0cae2'), cobalt=material('plaster','#465e8e');
  function vessel(x,z,profile,mat){return mesh(table,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),32),mat,x,1.09,z)}
  vessel(-.42,0,[[.09,0],[.14,.04],[.16,.19],[.08,.29],[.07,.36],[.11,.40],[.09,.4],[.065,.34]],ceramic);
  mesh(table,new T.TorusGeometry(.091,.018,10,28),ceramic,-.55,1.32,0).scale.y=1.25;
  vessel(.05,.06,[[.09,0],[.18,.04],[.245,.15],[.24,.17],[.21,.15],[.12,.06],[0,.05]],cobalt);
  vessel(.44,-.13,[[.056,0],[.077,.15],[.066,.15],[.055,.025]],ceramic);
  block(back,1.25,1.98,.09,1.7,.07,.12,oak);for(let i=0;i<4;i++)rod(back,.65+i*.39,2.04,.15,.032,.14,dark);
  function cloth(p,x,y,z,w,h,mat){const g=new T.PlaneGeometry(w,h,28,20),v=g.attributes.position;for(let i=0;i<v.count;i++){let a=v.getX(i),b=v.getY(i);v.setXYZ(i,a*(1-.37*b/h),b+.035*Math.cos(a*19),.045*Math.sin(a*37+b*3)+.06*(.5-b/h))}g.computeVertexNormals();mesh(p,g,mat,x,y,z)}
  cloth(back,.72,1.48,.18,.36,.91,blue);cloth(left,2.46,1.62,.14,.52,1.47,material('linen','#dda45f'));
  picture(left,2.82,2.64,.42,.55,'drawing',.016);
  return {obstacles,dispose(){world.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());maps.forEach(t=>t.dispose())}};
}
