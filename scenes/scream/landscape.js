import * as T from 'three';
import { batch, mesh, stroke, surface } from './materials.js';

const seaLevel = -4.85;
const tau = Math.PI*2;

function firmament(world, paint) {
  const positions=[], uv=[], index=[], colors=[];
  const slices=180, rows=48;
  for(let j=0;j<=rows;j++) {
    const h=-.11+(Math.PI/2+.11)*j/rows;
    const overhead=T.MathUtils.smoothstep(h,.57,1.53);
    for(let i=0;i<=slices;i++) {
      const a=i/slices*tau;
      positions.push(180*Math.sin(a)*Math.cos(h),180*Math.sin(h),-180*Math.cos(a)*Math.cos(h));
      // Four alternating stretches close the painted sky at the azimuth seam.
      const longitude=.5-.5*Math.cos((.18+4*i/slices)*Math.PI);
      const latitude=h<.30?(h+.035)/.395:.335/.395+.145*Math.sin((h-.30)*12);
      uv.push(T.MathUtils.lerp(longitude,.58,overhead),latitude);
      colors.push(1-.65*overhead,1-.49*overhead,1-.16*overhead);
      const n=j*(slices+1)+i;
      if(i<slices && j<rows) index.push(n,n+1,n+slices+1,n+1,n+slices+2,n+slices+1);
    }
  }
  const sky=surface(positions,uv,index);
  sky.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const pigment=paint('#ffffff','sky',true);
  pigment.vertexColors=true;
  pigment.fog=false;
  const dome=mesh(world,sky,pigment);
  dome.renderOrder=-2;
}

function tintedSurface(parent, paint, positions, uv, index, colors, tint, texture) {
  const geometry=surface(positions,uv,index);
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const material=paint(tint,texture);
  material.vertexColors=true;
  return mesh(parent,geometry,material);
}

function distantCoast(world,paint) {
  // The two overlapping skylines stay continuous when the visitor turns around.
  for(let layer=0;layer<2;layer++) {
    const positions=[], uv=[], index=[], colors=[];
    const count=240, bands=9;
    for(let j=0;j<=bands;j++) {
      const f=j/bands;
      for(let i=0;i<=count;i++) {
        const a=i/count*tau, wave=Math.sin(3*a+.7*layer)+.42*Math.sin(7*a+1)+.15*Math.cos(15*a+layer);
        const r=(layer?92:115)+6*wave+7*f;
        const summit=(layer?3.5:7.6)+(layer?2.2:3.3)*wave+1.5*Math.cos(2*a+layer);
        positions.push(Math.sin(a)*r,seaLevel+f*(summit-seaLevel),-Math.cos(a)*r);
        uv.push(i/count*4+f*.034,f);
        const color=new T.Color(layer?'#b5c4ca':'#ddc4cb');
        color.multiplyScalar(.64+.35*f+.16*Math.sin(19*f+wave));
        colors.push(color.r,color.g,color.b);
        const n=j*(count+1)+i;
        if(i<count && j<bands) index.push(n,n+1,n+count+1,n+1,n+count+2,n+count+1);
      }
    }
    tintedSurface(world,paint,positions,uv,index,colors,'#e9e8f4','ridge');
  }
}

function headland(world,paint,{x,z,rx,rz,height,bearing,seed}) {
  const positions=[],uv=[],index=[],colors=[];
  const slices=108,rings=27;
  function point(a,t) {
    const scallop=1+.21*Math.sin(3*a+seed)+.10*Math.sin(5*a+.7)+.043*Math.cos(11*a+seed);
    const px=Math.cos(a)*rx*scallop*t + rx*.38*(1-t*t);
    const pz=Math.sin(a)*rz*scallop*t + rz*.14*Math.sin(4*t+.7);
    const ridge=(1-t**1.65)**.78;
    const folds=.20*Math.sin(a*3.0+seed+t*4)+.13*Math.cos(5*a+seed-t*3);
    const summit=ridge*(.76+.24*Math.cos(a-seed)*t+folds*t);
    const gullies=.027*t*(Math.sin(23*a+5*t+seed)+.5*Math.cos(43*a-seed));
    return [x+px*Math.cos(bearing)-pz*Math.sin(bearing),seaLevel-.32+height*(summit+gullies),
      z+pz*Math.cos(bearing)+px*Math.sin(bearing)];
  }
  for(let j=0;j<=rings;j++) {
    const t=j/rings;
    for(let i=0;i<=slices;i++) {
      const a=i/slices*tau;
      positions.push(...point(a,t));
      uv.push(i/slices*(rx+rz)*.16+t*.35,t*1.15);
      const color=new T.Color('#91a2ab');
      color.lerp(new T.Color('#bba89b'),T.MathUtils.smoothstep(t,.87,.98));
      color.multiplyScalar(.95+.17*Math.cos(t*43+2*Math.sin(3*a))+.12*Math.sin(a+seed)+.07*Math.cos(7*a+t));
      colors.push(color.r,color.g,color.b);
      const n=j*(slices+1)+i;
      if(j<rings && i<slices) index.push(n,n+1,n+slices+1,n+1,n+slices+2,n+slices+1);
    }
  }
  tintedSurface(world,paint,positions,uv,index,colors,'#ede2dd','rock');
  // Inlets have exposed skerries at the tide line and wind-bent pines above it.
  let state=seed;
  const random=()=>{ state=(Math.imul(1664525,state)+1013904223)>>>0; return state/4294967296; };
  const trees=Math.round((rx+rz)*3.4), stones=Math.round((rx+rz)*2);
  const crown=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),paint('#99a9a2'),trees*2);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.60,1,1,5),paint('#635d5b'),trees);
  const rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),paint('#acaaa8'),stones);
  const piece=new T.Object3D();
  function stamp(objects,i,px,py,pz,w,h,d,yaw,tilt) {
    piece.position.set(px,py,pz);piece.scale.set(w,h,d);piece.rotation.set(0,yaw,tilt);
    piece.updateMatrix();objects.setMatrixAt(i,piece.matrix);
  }
  for(let i=0;i<trees;i++) {
    const a=random()*tau,t=.15+.72*Math.sqrt(random()),[px,py,pz]=point(a,t);
    const h=.36+.94*random()*(1-t*.46),yaw=random()*tau;
    const pigment=new T.Color().lerpColors(new T.Color('#324650'),new T.Color('#737364'),random());
    stamp(trunks,i,px,py+h*.28,pz,h*.053,h*.75,h*.052,yaw,-.11);
    stamp(crown,i*2,px+.05,py+h*.64,pz,h*.32,h*.33,h*.27,yaw,-.24);
    stamp(crown,i*2+1,px+h*.17,py+h*.91,pz,h*.24,h*.32,h*.21,yaw,-.18);
    crown.setColorAt(i*2,pigment);crown.setColorAt(i*2+1,pigment);
  }
  for(let i=0;i<stones;i++) {
    const a=random()*tau,[px,py,pz]=point(a,.91+.09*random());
    const size=.12+.73*random();
    stamp(rocks,i,px,py,pz,size,size*.42,size*.65,random()*tau,random()*.25);
    rocks.setColorAt(i,new T.Color().lerpColors(new T.Color('#737783'),new T.Color('#c2a98d'),random()));
  }
  world.add(crown,trunks,rocks);
}

function ripples(world,paint) {
  // Small tapered reflections establish the surface scale against the broad painted currents.
  const positions=[],uv=[],indices=[],colors=[];
  let state=11;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  for(let i=0;i<2400;i++) {
    const x=random()*75-12,z=random()*103-70,length=.21+random()**2*2.5;
    const width=.020+random()*.065,phase=random()*tau;
    const color=new T.Color(random()>.28?'#b7cbd0':'#526794');
    if(Math.abs(z+29+4*Math.sin(x*.13)+9*Math.sin(x*.052+.5))<8) color.set('#f7d896');
    const first=positions.length/3;
    for(let j=0;j<=4;j++) {
      const t=j/4;
      const bend=.082*Math.sin(phase+t*2.9)+t*.24*Math.sin(.24*x+z*.14);
      const half=width*(.02+Math.sin(t*Math.PI));
      for(const side of [-1,1]) {
        positions.push(x+length*t,seaLevel+.012,z+bend+side*half);
        uv.push(t,(side+1)/2);
        colors.push(color.r,color.g,color.b);
      }
      const n=first+2*j;
      if(j<4) indices.push(n,n+1,n+2,n+2,n+1,n+3);
    }
  }
  const geometry=surface(positions,uv,indices);
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const material=paint('#fffcf6',null,true);
  Object.assign(material,{vertexColors:true,transparent:true,opacity:.31,depthWrite:false});
  mesh(world,geometry,material);
}

function nearBank(world,paint) {
  const positions=[],uv=[],index=[],colors=[];
  const rows=100, columns=22;
  for(let j=0;j<=rows;j++) {
    const z=j/rows*104-62;
    const end=T.MathUtils.smoothstep(Math.abs(z+11),33,46);
    const edge=-1.9+end*13+.6*Math.sin(z*.24)+.3*Math.cos(z*.63);
    for(let i=0;i<=columns;i++) {
      const x=edge+2-i*1.6;
      const slope=T.MathUtils.smoothstep(i,0,4);
      const h=seaLevel-.6+slope*(6.48+Math.max(0,i-3)*.48+.6*Math.sin(z*.25+i*.4));
      positions.push(x,h,z);
      uv.push(z*.062,i*.19+.24*Math.cos(z*.15));
      const color=new T.Color().lerpColors(new T.Color('#a5937e'),new T.Color('#536052'),slope);
      colors.push(color.r,color.g,color.b);
      const n=j*(columns+1)+i;
      if(i<columns && j<rows) index.push(n,n+1,n+columns+1,n+1,n+columns+2,n+columns+1);
    }
  }
  tintedSurface(world,paint,positions,uv,index,colors,'#e9dbcc','rock');
}

function sailboat(world,paint,x,z,angle,scale,underSail) {
  const boat=new T.Group(); world.add(boat);boat.position.set(x,seaLevel+.035,z);boat.rotation.y=angle;
  boat.scale.setScalar(scale);
  const tar=paint('#473b3c'),canvas=paint('#d9bd86'), rope=paint('#514649');
  const hull=new T.Shape();
  hull.moveTo(0,2);hull.bezierCurveTo(.30,1.56,.73,.51,.58,-.96);
  hull.quadraticCurveTo(.48,-1.75,0,-1.82);hull.quadraticCurveTo(-.48,-1.75,-.58,-.96);
  hull.bezierCurveTo(-.73,.51,-.30,1.56,0,2);
  const shell=mesh(boat,new T.ExtrudeGeometry(hull,{depth:.19,bevelEnabled:true,bevelSize:.070,bevelThickness:.07,bevelSegments:2}),tar);
  shell.rotation.x=-Math.PI/2;
  mesh(boat,new T.CylinderGeometry(.020,.038,2.94,8),rope,0,1.58,.12);
  for(const end of [-1.65,1.78]) stroke(boat,rope,[[0,2.89,.12],[0,1.53,end*.48],[0,.24,end]],[.012,.011,.012],5);
  if(underSail) {
    const sail=surface([0,.58,.16, .18,.70,1.5, .17,1.27,.85, 0,2.73,.15],[0,0,1,0,.6,.5,0,1],[0,1,2,0,2,3]);
    canvas.side=T.DoubleSide; mesh(boat,sail,canvas);
  }
  batch(boat);
}

export function landscape(world,paint) {
  firmament(world,paint);
  distantCoast(world,paint);
  const water=mesh(world,new T.PlaneGeometry(220,220),paint('#ffffff','water',true),0,seaLevel,0);
  water.rotation.x=-Math.PI/2;
  ripples(world,paint);
  for (const island of [
    {x:45,z:-7,rx:12,rz:25,height:5.8,bearing:-.28,seed:1},
    {x:30,z:-49,rx:15,rz:5,height:3.4,bearing:.21,seed:3},
    {x:-9,z:-57,rx:19,rz:6,height:4.7,bearing:.16,seed:6},
    {x:23,z:35,rx:15,rz:14,height:8.1,bearing:.62,seed:8}
  ]) headland(world,paint,island);
  nearBank(world,paint);
  sailboat(world,paint,12.2,-26,-1.16,1.10,true);
  sailboat(world,paint,16,-31,-1.28,.88,false);
  sailboat(world,paint,30,16,.57,.90,false);
}

export const deck={left:-2.9,right:1.84,back:-26,front:11};

export function bridge(world,paint) {
  const structure=new T.Group();world.add(structure);
  const wood=['#eee0c1','#dac9ac','#e1cfb4','#ccbfad','#dfccc7'].map(c=>paint(c,'timber'));
  const rail=paint('#ad977c','timber'), edge=paint('#ffc88e','timber'), tar=paint('#644944','timber');
  const iron=paint('#4d423a');
  const start=-58, end=31, width=deck.right-deck.left;
  function timber(x,y,z,w,h,d,material,vertical=false,offset=0) {
    const geometry=new T.BoxGeometry(w,h,d);
    const p=geometry.attributes.position, uv=geometry.attributes.uv;
    for(let i=0;i<p.count;i++) {
      const a=p.getX(i),b=p.getY(i),c=p.getZ(i);
      const cross=Math.abs(geometry.attributes.normal.getX(i))>.5?b:a;
      uv.setXY(i,(vertical?a+c:cross)*3.6+offset,(vertical?b:c)*.31+offset);
    }
    return mesh(structure,geometry,material,x,y,z);
  }
  function bolt(x,y,z,side) {
    const pin=mesh(structure,new T.CylinderGeometry(.026,.026,.012,8),iron,x,y,z);
    if(side) pin.rotation.z=Math.PI/2;
  }
  // Long boards, offset butt joints, and a second structural layer beneath the deck.
  timber((deck.left+deck.right)/2,-.17,(start+end)/2,width+.04,.21,end-start,tar);
  const boards=16,w=width/boards;
  for(let i=0;i<boards;i++) {
    const x=deck.left+(i+.5)*w;
    let z=start;
    for(let j=0;z<end;j++) {
      const length=Math.min(end-z,j===0?1+(i*1.37)%3.9:4.4+.49*Math.sin(i*19+j*3));
      timber(x,-.040,z+length/2,w-.009,.08,length-.012,wood[(i*3+j)%wood.length],false,i*.53+j*.7);
      if(z>deck.back-2 && z<deck.front+2) {
        bolt(x-w*.29,.002,z+.059,false);
        bolt(x+w*.29,.002,z+.059,false);
      }
      z+=length;
    }
  }
  for(let z=start;z<end;z+=2.76) {
    timber(deck.right,.009,z,.165,2.18,.17,rail,true,z*.43);
    timber(deck.right,1.10,z,.182,.059,.19,edge);
    if(z>deck.back-3 && z<deck.front+3) {
      bolt(deck.right-.089,.90,z,true);bolt(deck.right-.089,.46,z,true);
    }
    if(Math.round((z-start)/2.76)%2===0)
      timber(deck.right-.2,-2.98,z,.29,5.93,.32,tar,true);
  }
  for(let z=start;z<end;z+=6.9) {
    const length=Math.min(6.9,end-z);
    timber(deck.right-.08,.94,z+length/2,.125,.155,length-.012,rail,false,z*.31);
    timber(deck.right-.08,1.027,z+length/2,.155,.042,length-.015,edge,false,z*.3);
    timber(deck.right-.075,.51,z+length/2,.11,.16,length-.018,tar,false,z*.26);
  }
  timber(deck.left,.065,(start+end)/2,.135,.13,end-start,rail);
  batch(structure);
  structure.traverse(o=>{ if(o.isMesh) o.receiveShadow=true; });
}
