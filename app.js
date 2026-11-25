const $ = selector => document.querySelector(selector);
const works = [
  {
    title: 'La habitación en Arlés', artist: 'Vincent van Gogh', year: '1888',
    model: 'Astra 6.2', reasoning: 'High',
    medium: 'ÓLEO SOBRE LIENZO', image: './assets/bedroom.png', load: () => import('./scenes/bedroom.js')
  },
  {
    // Reproduction: https://github.com/jcjohnson/fast-neural-style/blob/master/images/styles/the_scream.jpg
    title: 'El grito', artist: 'Edvard Munch', year: '1893', portrait: true,
    model: 'Astra 6.2', reasoning: 'Xhigh',
    medium: 'TÉMPERA Y ÓLEO SOBRE CARTÓN', image: './assets/scream.webp', load: () => import('./scenes/scream.js')
  },
  {
    title: 'La persistencia de la memoria', artist: 'Salvador Dalí', year: '1931',
    model: 'Sol', reasoning: 'Xhigh',
    medium: 'ÓLEO SOBRE LIENZO', image: './assets/memory.png', load: () => import('./scenes/memory.js')
  },
  {
    title: 'La noche estrellada', artist: 'Vincent van Gogh', year: '1889',
    model: 'Gemini 3.8 Flash', reasoning: 'High',
    medium: 'ÓLEO SOBRE LIENZO', image: './assets/starry.jpg', load: () => import('./scenes/starry-brush.js')
  },
  {
    title: 'Paseo a orillas del mar', artist: 'Joaquín Sorolla', year: '1909', ratio: 980 / 993,
    model: 'Opus 5.5', reasoning: 'Xhigh',
    medium: 'ÓLEO SOBRE LIENZO', image: './assets/paseo.webp', load: () => import('./scenes/paseo.js')
  },
  {
    title: 'Guernica', artist: 'Pablo Picasso', year: '1937', ratio: 1500 / 680, panoramic: true,
    model: 'Gemini 4 Neon', reasoning: 'High',
    medium: 'ÓLEO SOBRE LIENZO', image: './assets/guernica.webp', load: () => import('./scenes/guernica.js')
  }
];

let index=0, drag=0, skip=false, inside=false;
const num=n=>String(n).padStart(2,'0');
const frames=works.map((work,i)=>{
  const frame=document.createElement('button');
  frame.className='work';
  frame.classList.toggle('portrait',Boolean(work.portrait));
  frame.classList.toggle('panoramic',Boolean(work.panoramic));
  frame.classList.toggle('empty',!work.image);
  if(work.ratio) frame.style.aspectRatio=work.ratio;
  if(work.image) {
    const image=new Image();
    image.src=work.image; image.alt=work.title; image.draggable=false;
    frame.append(image);
  } else {
    const mark=document.createElement('em');
    mark.textContent=['I','II','III','IV','V','VI'][i];
    frame.append(mark);
  }
  const plaque=document.createElement('i');
  plaque.className='plaque'; frame.append(plaque);
  frame.setAttribute('aria-label',work.title||'Marco '+num(i+1));
  frame.onclick=()=>{
    if(skip) return;
    if(index===i && work.load) enter();
    else select(i);
  };
  $('#wall').append(frame);
  const dot=document.createElement('button');
  dot.setAttribute('aria-label','Seleccionar obra '+(i+1));
  dot.onclick=()=>select(i); $('#dots').append(dot);
  return frame;
});

function select(i) {
  const total=works.length;
  const mobile=window.matchMedia('(max-width:600px)').matches;
  index=(i+total)%total;
  const work=works[index];
  frames.forEach((frame,j)=>{
    let delta=(j-index+total)%total;
    if(delta>total/2) delta-=total;
    frame.style.visibility=Math.abs(delta)>1?'hidden':'visible';
    frame.style.zIndex=delta===0?'2':'1';
    frame.style.transform='translate(-50%,-50%) translateX('+delta*$('#stage').clientWidth*(mobile?.56:.414)+'px) perspective(850px) rotateY('+(mobile?0:delta*-18)+'deg) scale('+(delta?.79:1)+')';
    $('#dots').children[j].classList.toggle('active',index===j);
  });
  $('#meta').textContent='OBRA '+num(index+1)+' / '+(work.medium||'EN PREPARACIÓN');
  $('#title').textContent=work.title||'Próxima obra';
  $('#artist').textContent=work.artist?work.artist+'   ·   '+work.year:'Marco reservado';
  $('#benchmark').hidden=!work.model;
  $('#benchmark').textContent=work.model?'Modelo: '+work.model+' · Razonamiento: '+work.reasoning:'';
  $('#enter').disabled=!work.load;
  $('#enter').innerHTML=work.load?'Entrar al cuadro <strong>↗</strong>':'Próximamente';
  $('#count').textContent=num(index+1)+' / '+num(total);
}

async function enter() {
  if(inside || !works[index].load) return;
  inside=true;
  try {
    const scene=await works[index].load();
    await scene.open(()=>{inside=false;});
  } catch(error) {
    inside=false;
    alert('No se ha podido abrir la escena 3D. Comprueba que WebGL está disponible.');
    console.error(error);
  }
}
$('#enter').onclick=enter;
$('#prev').onclick=()=>select(index-1);
$('#next').onclick=()=>select(index+1);
$('#help').onclick=()=>$('dialog').showModal();
$('.expand').onclick=()=>document.fullscreenElement?document.exitFullscreen():$('#stage').requestFullscreen();
document.addEventListener('keydown',event=>{
  if(inside || $('dialog').open) return;
  if(event.key==='ArrowLeft') select(index-1);
  if(event.key==='ArrowRight') select(index+1);
});
$('#stage').onpointerdown=event=>{if(!inside) drag=event.clientX;};
$('#stage').onpointerup=event=>{
  if(inside) return;
  const dx=event.clientX-drag;
  if(Math.abs(dx)>35) {
    skip=true; select(index-Math.sign(dx)); setTimeout(()=>{skip=false;},200);
  }
};
new ResizeObserver(()=>select(index)).observe($('#stage'));
select(0);
