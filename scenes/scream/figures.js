import * as T from 'three';
import { batch, ellipsoid, loft, mesh, stroke, surface } from './materials.js';

function mask(figure, paint) {
  // Trace the jaw, temples and crown on the reproduction. The front UVs follow that
  // drawing even where the sockets sink into the face and the nose projects out.
  const contour = [
    [500,311,317,.030], [497,304,324,.069], [488,300,329,.086],
    [477,297,331,.099], [463,292,334,.104], [451,283,340,.122],
    [437,276,348,.145], [423,273,352,.153], [408,274,353,.151],
    [396,280,349,.138], [386,287,342,.117], [379,297,332,.088],
    [375,306,323,.055], [374,313,316,.012]
  ];
  const curve = new T.CatmullRomCurve3(contour.map(([y,l,r]) => new T.Vector3(l,y,r)));
  function relief(x,y) {
    const bump = (cx,cy,w,h) => Math.exp(-(((x-cx)/w)**2 + ((y-cy)/h)**2));
    const mouth = Math.hypot((x-313)/6.4,(y-467)/15);
    return .064*bump(310,435,5,17) + .043*bump(308,440,8,5)
      - .030*(bump(291,422,9,8)+bump(331,422,9,8))
      + .020*(bump(291,424,4,4)+bump(331,424,4,4))
      + .017*(bump(291,414,11,4)+bump(332,414,11,4))
      + .025*(bump(282,440,9,9)+bump(342,439,9,9))
      + .018*Math.exp(-(((mouth-1)/.23)**2)) - .074*Math.exp(-(mouth**4))
      + .017*bump(315,489,10,5);
  }
  const segments = 96, rings = 80, positions = [], uv = [], indices = [[],[]];
  for (let j=0;j<=rings;j++) {
    const t=j/rings, row=curve.getPoint(t), at=t*(contour.length-1), k=Math.floor(at);
    const depth=T.MathUtils.lerp(contour[k][3],contour[Math.min(k+1,contour.length-1)][3],at-k);
    for (let i=0;i<=segments;i++) {
      const angle=i/segments*Math.PI*2 - Math.PI/2, front=i<=segments/2;
      const x=(row.x+row.z)/2 + Math.sin(angle)*(row.z-row.x)/2;
      const cos=Math.cos(angle);
      const z=.050 + depth*cos + (front ? Math.pow(Math.max(0,cos),.7)*relief(x,row.y) : .035*cos);
      positions.push((x-314)*.0048,1.415+(500-row.y)*.0045,z);
      if (front) uv.push((x-264)/100,1-(row.y-371)/135);
      else uv.push(.1+(i/segments-.5)*1.65,t);
      const n=j*(segments+1)+i;
      if (i<segments && j<rings) indices[i<segments/2?0:1].push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);
    }
  }
  const geometry=surface(positions,uv,indices.flat());
  geometry.addGroup(0,indices[0].length,0);
  geometry.addGroup(indices[0].length,indices[1].length,1);
  mesh(figure,geometry,[paint('#fff9e9','face'),paint('#e3d5ac','skin')]);
}

function raisedHand(figure, paint, side) {
  const skin=paint('#f0e4cb','skin'), light=paint('#fff0d1','skin');
  const sleeve=paint('#b4b4c3','coat'), cuff=paint('#474541');
  function strand(material, points, radii) {
    return stroke(figure,material,points.map(([x,y,z])=>[side*x,y,z]),radii);
  }
  // Elbows hang below the shoulders. Wrists double back up to the jaw.
  strand(sleeve,[[.19,1.32,-.015],[.255,1.21,.025],[.32,.925,.105],[.302,.865,.16],
    [.255,1.04,.22],[.184,1.285,.21]],[.092,.095,.084,.080,.076,.062]);
  // Nest an elliptical cuff over both sleeve and wrist so the joint stays closed in profile.
  const cuffShape=ellipsoid(figure,cuff,[side*.185,1.28,.211],[.067,.034,.067]);
  cuffShape.rotation.z=-side*.18;
  strand(skin,[[.181,1.268,.213],[.168,1.39,.183],[.150,1.516,.143],[.166,1.625,.103]],
    [.045,.040,.044,.045]);
  const palm=ellipsoid(figure,skin,[side*.166,1.639,.093],[.043,.097,.052]);
  palm.rotation.z=-side*.15;
  // The fingertips spread over the temples. The thumb bends inwards under the cheekbone.
  for (let i=0;i<4;i++) {
    const z=.146-i*.026, tip=[1.820,1.854,1.837,1.801][i];
    strand(i===0?light:skin,[[.164+i*.004,1.655,z],[.185+i*.003,1.712,z-.003],
      [.193+i*.002,tip-.034,z-.013],[.182+i*.002,tip,z-.025]],
      [.014,.014,.011,.004]);
  }
  strand(light,[[.148,1.615,.116],[.143,1.637,.142],[.125,1.653,.152],[.120,1.677,.151]],
    [.018,.019,.013,.004]);
}

export function screamingFigure(paint) {
  const figure=new T.Group();
  const robe=paint('#a0adc3','coat'), folds=paint('#727d8f','coat');
  loft(figure,robe,[
    [.035,-.094,-.02,.176,.121],[.13,-.097,-.01,.19,.132],[.39,-.116,.0,.175,.122],
    [.71,-.063,.018,.188,.139],[.96,.01,.007,.213,.143],[1.17,.029,-.010,.232,.148],
    [1.29,.012,-.024,.226,.126],[1.37,.002,-.026,.148,.105],[1.395,0,-.014,.073,.076]
  ],.080);
  const skin=paint('#dbceab','skin');
  loft(figure,skin,[[1.275,-.003,.050,.045,.042],[1.34,.002,.048,.082,.061],
    [1.43,.004,.048,.082,.075],[1.5,-.009,.043,.075,.072]]);
  for (const side of [-1,1]) {
    stroke(figure,folds,[[.176*side,1.31,.054],[.093*side,1.24,.114],[.024,1.13,.148]],
      [.021,.018,.004]);
    const shoe=ellipsoid(figure,paint('#2d292a'),[side*.10-.094,.047,.052],[.069,.046,.133]);
    shoe.rotation.y=side*.10;
  }
  mask(figure,paint);
  raisedHand(figure,paint,-1);
  raisedHand(figure,paint,1);
  batch(figure);
  return figure;
}

export function companion(paint, bowler) {
  const person=new T.Group();
  const coat=paint(bowler?'#b09a83':'#87a6bc','coat');
  const felt=paint(bowler?'#332d2c':'#343940'), seam=paint('#4d4846');
  const boots=paint('#2c2a2a'), skin=paint('#d6ac87','skin'), hair=paint('#473931');
  const trouser=paint(bowler?'#727275':'#686d77','coat');
  for (const s of [-1,1]) {
    const stride=(bowler?.084:-.111)*s;
    stroke(person,trouser,[[s*.082,.88,0],[s*.091,.52,stride*1.1],[s*.098,.15,stride]],
      [.091,.078,.054],14);
    ellipsoid(person,boots,[s*.098,.076,stride+.044],[.070,.072,.135]);
  }
  const hem=bowler?.46:.60;
  loft(person,coat,[[hem,0,-.022,.224,.145],[hem+.1,0,-.013,.214,.137],
    [.90,.006,-.005,.154,.108],[1.12,0,0,.169,.117],[1.28,-.005,-.012,.205,.128],
    [1.35,0,-.012,.173,.107],[1.396,0,.003,.103,.081],[1.408,0,.004,.071,.067]],.031);
  const binding=paint(bowler?'#474440':'#46515b');
  // A centre vent and shaped back seams give each coat a silhouette from the bridge approach.
  for(const side of [-1,1]) {
    stroke(person,binding,[[side*.144,1.32,-.088],[side*.103,1.16,-.109],[side*.084,.96,-.102],
      [side*.098,.80,-.118],[side*.134,hem+.022,-.143]],[.006,.005,.005,.004,.002]);
  }
  stroke(person,binding,[[-.007,.84,-.118],[-.016,.70,-.148],[-.035,hem+.014,-.162]],[.010,.009,.003]);
  if (bowler) stroke(person,binding,[[-.142,.96,-.055],[0,.946,-.124],[.141,.96,-.055]],[.013,.020,.013]);
  for (const s of [-1,1]) {
    const swing=s*(bowler?.097:-.077);
    const handX=bowler && s===1?.124:.200, handZ=bowler && s===1?-.138:swing*1.2;
    stroke(person,coat,[[s*.152,1.324,-.008],[s*.205,1.234,-.012],[s*.223,1.05,swing*.54],
      [s*handX,.883,handZ]],[.067,.080,.068,.052],14);
    ellipsoid(person,skin,[s*handX,.852,handZ],[.040,.063,.035]);
    stroke(person,seam,[[s*.085,1.399,.070],[s*.143,1.319,.085],[s*.091,1.29,.113],[s*.020,1.13,.123]],
      [.011,.017,.013,.004]);
  }
  for (let i=0;i<4;i++) ellipsoid(person, felt,[.015,1.10-i*.112,.121],[.012,.012,.008]);
  const head=new T.Group(); person.add(head); head.position.set(0,1.385,-.008); head.rotation.y=bowler?.23:-.34;
  loft(head,skin,[[0,0,0,.062,.058],[.071,0,.012,.067,.069],[.105,0,.028,.066,.073],
    [.163,0,.011,.089,.087],[.222,0,.003,.093,.09],[.275,0,0,.081,.078],[.303,0,0,.040,.042]]);
  ellipsoid(head,hair,[0,.187,-.050],[.093,.110,.066]);
  for (const s of [-1,1]) {
    stroke(head,hair,[[s*.055,.229,-.082],[s*.079,.183,-.067],[s*.065,.115,-.074]],
      [.020,.017,.006]);
  }
  for (const s of [-1,1]) {
    ellipsoid(head,skin,[s*.087,.166,0],[.018,.029,.020]);
    stroke(head,hair,[[s*.020,.195,.091],[s*.045,.202,.082],[s*.065,.193,.067]],[.004,.007,.002]);
    ellipsoid(head,felt,[s*.040,.187,.086],[.011,.004,.004]);
  }
  ellipsoid(head,skin,[0,.169,.089],[.017,.032,.024]);
  stroke(head,hair,[[-.028,.132,.095],[0,.137,.102],[.028,.132,.095]],[.002,.006,.002]);
  ellipsoid(head, felt,[0,.254,.003],[bowler?.126:.138,.018,.126]);
  loft(head,felt,[[.252,0,0,.098,.091],[.277,0,0,.100,.094],
    [.331,0,0,.088,.083],[bowler?.361:.337,0,0,.065,.062],[bowler?.371:.339,0,0,.003,.003]]);
  loft(head,seam,[[.263,0,0,.101,.095],[.276,0,0,.101,.095]]);
  const collar=bowler?paint('#5b4a45'):paint('#555962');
  loft(person,collar,[[1.357,0,-.013,.118,.105],[1.392,0,-.016,.113,.105],
    [1.454,0,-.014,.082,.085],[1.474,0,-.016,.080,.077]]);
  if (!bowler) stroke(person,collar,[[.067,1.437,-.052],[.095,1.35,-.080],[.110,1.253,-.111]],
    [.024,.027,.011]);
  batch(person);
  return person;
}
