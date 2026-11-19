import * as T from 'three';
import { antWatch, fly, softWatch } from './clocks.js';
import { batch, canvasTexture, ellipsoid, mesh, randomSequence, stroke, surface, tau } from './palette.js';

function sky(world) {
  const texture = canvasTexture((ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#005369');gradient.addColorStop(.35, '#318b96');
    gradient.addColorStop(.7, '#a9c7b3');gradient.addColorStop(1, '#efd49a');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    const random=randomSequence(1931);
    for(let i=0;i<19000;i++) {
      ctx.fillStyle=random()>.5?'#fff2b009':'#173d4008';
      ctx.fillRect(random()*w,random()*h,2+random()*12,1);
    }
  },1024,512);
  // Cylindrical UVs hold the warm horizon at sea level, in every direction.
  const positions=[],uv=[],indices=[],segments=128,rows=32;
  for(let j=0;j<=rows;j++) {
    const angle=-.07+(Math.PI/2+.07)*j/rows;
    for(let i=0;i<=segments;i++) {
      const a=i/segments*tau;
      positions.push(170*Math.sin(a)*Math.cos(angle),170*Math.sin(angle),170*Math.cos(a)*Math.cos(angle));
      uv.push(i/segments,Math.min(1,Math.max(0,angle/.64)));
      const n=j*(segments+1)+i;
      if(j<rows&&i<segments)indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);
    }
  }
  const material=new T.MeshBasicMaterial({map:texture,side:T.BackSide,fog:false});
  const dome=mesh(world,surface(positions,uv,indices),material);
  dome.castShadow=dome.receiveShadow=false;
}

function headland(world, paint) {
  const coast=new T.Group();world.add(coast);
  const positions=[],uv=[],indices=[],colors=[],columns=160,rows=20;
  const base=new T.Color('#b98136'),gray=new T.Color('#52574a'),sun=new T.Color('#dfba60');
  // A long, eroded promontory: the steep seaward wall breaks into vertical gullies.
  for(let j=0;j<=rows;j++) {
    const t=j/rows;
    for(let i=0;i<=columns;i++) {
      const f=i/columns,x=7+f*35;
      const top=.15+6.7*Math.sin(Math.min(1,f*1.8)*Math.PI/2)+.45*Math.sin(f*49)+.20*Math.cos(f*113);
      const crease=Math.sin(f*175+.6*Math.sin(t*9))+.4*Math.cos(f*311+t*4);
      const y=-.25+t*top;
      const z=-32+6*Math.sin(f*2.8)-2.4*t+Math.pow(Math.sin(t*Math.PI),.55)*(.55*crease+.4*Math.sin(f*29));
      positions.push(x,y,z);uv.push(f*9,t*2);
      const color=base.clone().lerp(sun,.25+.32*Math.sin(f*50+.2));
      color.lerp(gray,T.MathUtils.smoothstep(t,.78,.96));
      color.multiplyScalar(.78+.25*Math.sin(f*140+1.4*t)+.08*Math.cos(t*29));
      colors.push(color.r,color.g,color.b);
      const n=j*(columns+1)+i;
      if(j<rows&&i<columns)indices.push(n,n+1,n+columns+1,n+1,n+columns+2,n+columns+1);
    }
  }
  const material=paint('#c29850',{texture:true});material.vertexColors=true;material.side=T.DoubleSide;
  const wall=mesh(coast,surface(positions,uv,indices,colors),material);wall.castShadow=false;
  // A rough plateau closes the cliff behind the ridge, so walking around it reveals volume.
  const capPositions=[],capUV=[],capIndices=[];
  for(let i=0;i<=columns;i++) {
    const k=(rows*(columns+1)+i)*3;
    capPositions.push(positions[k],positions[k+1],positions[k+2],positions[k],positions[k+1]*.68,positions[k+2]-8);
    capUV.push(i/columns*8,0,i/columns*8,2);
    const n=i*2;if(i<columns)capIndices.push(n,n+2,n+1,n+1,n+2,n+3);
  }
  mesh(coast,surface(capPositions,capUV,capIndices),paint('#787358',{texture:true})).castShadow=false;
  const random=randomSequence(88);
  for(let i=0;i<23;i++) {
    const x=8+random()*33,z=-30+4*Math.sin((x-7)/35*2.8)+random()*2;
    const rock=mesh(coast,new T.DodecahedronGeometry(1,0),paint(i%2?'#8a7750':'#bd9b5a'),[x,.12,z]);
    rock.scale.set(.3+random()*.9,.1+random()*.35,.3+random()*.5);rock.rotation.y=random()*tau;
    rock.castShadow=false;
  }
  batch(coast);
  coast.traverse(object=>{object.castShadow=false;});
}

function landscape(world,paint) {
  sky(world);
  const groundGeometry=new T.PlaneGeometry(180,100,100,65);
  groundGeometry.rotateX(-Math.PI/2);groundGeometry.translate(0,-.04,28);
  const p=groundGeometry.attributes.position,colors=[];
  const near=new T.Color('#393426'),far=new T.Color('#9b762f');
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i);
    const color=near.clone().lerp(far,T.MathUtils.smoothstep(-z,-3,23));
    color.multiplyScalar(.94+.045*Math.sin(x*.63+z*.31)+.027*Math.sin(x*4+z*1.3));
    colors.push(color.r,color.g,color.b);
    // UVs tile the fine oil grain without changing the broad dusk-to-light gradient.
    groundGeometry.attributes.uv.setXY(i,x*.18,z*.18);
  }
  groundGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const earth=paint('#c4aa7f',{texture:true});earth.vertexColors=true;
  mesh(world,groundGeometry,earth).castShadow=false;
  const seaTexture=canvasTexture((ctx,w,h)=>{
    const gradient=ctx.createLinearGradient(0,0,0,h);
    gradient.addColorStop(0,'#a4c5b7');gradient.addColorStop(.55,'#6ba6a2');gradient.addColorStop(1,'#267b84');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    const random=randomSequence(92);
    for(let i=0;i<2400;i++) {
      ctx.fillStyle=i%3?'#e4e2b810':'#244e5c12';
      ctx.fillRect(random()*w,random()*h,random()*65+4,.5);
    }
  },1024,512);
  const seaMaterial=new T.MeshBasicMaterial({map:seaTexture,color:'#cbdac9'});
  const sea=mesh(world,new T.PlaneGeometry(240,150),seaMaterial,[0,-.10,-75]);
  sea.rotation.x=-Math.PI/2;sea.castShadow=sea.receiveShadow=false;
  // The near-left turquoise terrace is a quiet, hard-edged counterpoint to the soft clocks.
  mesh(world,new T.BoxGeometry(11,.22,7),paint('#3b8988',{texture:true}),[-9,.02,-13]);
  headland(world,paint);
  ellipsoid(world,paint('#3a3b30'),[7,.03,-18],[.38,.09,.18]);
  ellipsoid(world,paint('#b8b5a0'),[7.25,.07,-18],[.10,.08,.08]);
}

function oliveTree(parent,paint) {
  const tree=new T.Group();parent.add(tree);tree.position.set(-3.65,1.26,-.8);
  const bark=paint('#777963',{texture:true}),dark=paint('#3b4439'),light=paint('#999780');
  stroke(tree,bark,[[0,0,0],[.15,.36,.04],[.2,1.05,.0],[.15,1.8,-.02],[.10,2.6,-.07],[.12,3.36,-.09]],
    [.34,.25,.18,.15,.16,.13],18);
  stroke(tree,bark,[[.17,1.72,0],[.65,1.94,-.03],[1.2,2.23,-.09],[1.85,2.3,-.04],[2.5,2.27,0],[3.12,2.30,.02]],
    [.14,.13,.11,.085,.063,.027],14);
  stroke(tree,dark,[[.64,1.96,-.06],[1.14,2.29,-.07],[1.18,2.59,-.08],[1.58,2.97,-.04]],
    [.075,.065,.045,.008],10);
  for(const side of [-1,1])stroke(tree,bark,[[.10,.22,.01],[side*.27,.08,.11],[side*.65,.02,.22]],
    [.18,.10,.006],10);
  // Long olive-grey strands carry around the trunk and into the branch.
  for(let i=0;i<15;i++) {
    const angle=i/15*tau,dx=Math.cos(angle),dz=Math.sin(angle);
    stroke(tree,i%3?dark:light,[[dx*.28,.08,dz*.22],[.18+dx*.19,.65,dz*.15],
      [.17+dx*.145,1.5,dz*.13],[.1+dx*.13,2.5,-.07+dz*.13],[.12+dx*.12,3.33,-.09+dz*.12]],
      [.013,.009,.008,.006,.003],5);
  }
  for(let i=0;i<4;i++)stroke(tree,i%2?dark:light,[[.27,1.85,.07+i*.025],[1.0,2.22,.03+i*.025],
    [1.8,2.26,.025+i*.020],[2.9,2.28,.025+i*.012]],[.01,.009,.007,.002],5);
  ellipsoid(tree,dark,[.12,3.36,-.09],[.13,.025,.13]);
  batch(tree);
}

function dreamer(world,paint) {
  const dream=new T.Group();world.add(dream);dream.position.set(.65,0,1.0);dream.rotation.y=-.18;
  const outline=new T.CatmullRomCurve3([
    [-1.82,0,.75],[-1.50,0,1.38],[-.80,0,1.52],[-.30,0,1.08],[.22,0,.82],
    [.72,0,.96],[1.38,0,.74],[2.05,0,.24],[3.15,0,-.37],[2.27,0,-.45],
    [1.30,0,-.76],[.35,0,-.95],[-.40,0,-.60],[-.76,0,-.08],[-1.4,0,.12]
  ].map(p=>new T.Vector3(...p)),true,'catmullrom',.35);
  const segments=128,rings=48,positions=[],uv=[],indices=[],colors=[];
  const pale=new T.Color('#c9bda4'),shade=new T.Color('#81796d');
  for(let j=0;j<=rings;j++) {
    const r=j/rings;
    for(let i=0;i<=segments;i++) {
      const edge=outline.getPoint(i/segments),x=edge.x*r,z=edge.z*r;
      // A raised brow and long taper grow out of the same continuous skin.
      const brow=.38*Math.exp(-(((x+.75)/.75)**2+((z-.50)/.75)**2));
      const ridge=.40*Math.exp(-(((x-.55)/.65)**2+((z+.10)/.7)**2));
      const y=.05+(1-r*r)**.72*(.53+brow+ridge);
      positions.push(x,y,z);uv.push(x*.7,z*.7);
      const color=pale.clone().lerp(shade,.22+.22*Math.sin(i/segments*tau+1));
      colors.push(color.r,color.g,color.b);
      const n=j*(segments+1)+i;
      if(j<rings&&i<segments)indices.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2);
    }
  }
  const skin=paint('#d8cdbb',{texture:true});skin.vertexColors=true;skin.side=T.DoubleSide;
  mesh(dream,surface(positions,uv,indices,colors),skin);
  const nose=paint('#b5ab93',{texture:true});
  const tip=ellipsoid(dream,nose,[-1.60,.18,.80],[.32,.17,.37]);tip.rotation.y=-.32;
  ellipsoid(dream,paint('#504c3c'),[-1.65,.135,1.02],[.10,.065,.10]);
  const lash=paint('#65523a'),crease=paint('#84705b');
  stroke(dream,crease,[[-1.3,.48,.58],[-1.03,.68,.61],[-.67,.77,.69],[-.30,.70,.72],[.02,.56,.70]],
    [.018,.022,.022,.018,.005],8);
  for(let i=0;i<31;i++) {
    const t=i/30,x=-1.29+1.25*t,y=.49+.27*Math.sin(t*Math.PI),z=.59+.13*Math.sin(t*Math.PI/2);
    const length=.28+.33*Math.sin(t*Math.PI);
    stroke(dream,lash,[[x,y,z],[x-.08,y-.09,z+length*.45],[x-.17,y-.28,z+length]],
      [.005,.004,.001],4);
  }
  // A folded lower lip curls underneath the sleeping profile.
  stroke(dream,nose,[[-1.45,.12,1.2],[-1.1,.19,1.48],[-.75,.16,1.4],[-.63,.07,1.18]],
    [.08,.10,.075,.013],12);
  softWatch(dream,paint,[.48,.83,.04],[
    [0,-.44,.88],[0,-.04,.48],[0,.10,-.03],[0,-.02,-.49],[0,-.22,-.80]
  ],false,-.23,.97);
  batch(dream);
}

export function buildWorld(world,paint) {
  landscape(world,paint);
  const table=new T.Group();world.add(table);
  const ochre=paint('#977039',{texture:true});
  mesh(table,new T.BoxGeometry(3.8,1.26,4.6),ochre,[-3.45,.59,1.05]);
  mesh(table,new T.BoxGeometry(3.84,.055,4.64),paint('#b58c4b',{texture:true}),[-3.45,1.245,1.05]);
  oliveTree(world,paint);
  const gold=softWatch(world,paint,[-2.8,1.31,2.65],[
    [0,-1.03,.84],[0,-.55,.80],[0,-.06,.56],[0,.035,-.09],[0,.02,-.90]
  ],true,.03,1.03);
  antWatch(world,paint,[-4.34,1.30,2.63]);
  fly(gold,paint,[-.2,.07,-.32]);
  softWatch(world,paint,[-1.73,3.61,-.77],[
    [0,-1.58,.24],[0,-.97,.19],[0,-.42,.08],[0,.035,-.12],[0,-.24,-.45]
  ],false,-.04,.93);
  dreamer(world,paint);
  return [
    // Inflated bounds include the overhanging enamel and the sleeping profile.
    {left:-5.65,right:-1.24,back:-1.65,front:3.85},
    {left:-1.6,right:4.25,back:-.25,front:3.0}
  ];
}
