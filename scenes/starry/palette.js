import * as T from 'three';

// Van Gogh's Starry Night color palette faithfully sampled from the canvas:
export const PALETTE = {
  // Sky blues (deep midnight to pale celestial azure)
  skyDeep: '#0c1830',
  skyPrussian: '#112244',
  skyCobalt: '#1a376e',
  skyRoyal: '#27529c',
  skyAzure: '#3f77cc',
  skyCyan: '#6aa6e8',
  skyPale: '#a8d2fb',
  skyWhite: '#e8f3fe',

  // Moon and stars (radiant golden cadmium and celestial halos)
  moonCore: '#ffe066',
  moonGold: '#f4b024',
  moonOrange: '#e87a15',
  moonHaloInner: '#fff6b3',
  moonHaloMid: '#ffe27a',
  moonHaloOuter: '#bfe0ff',
  starCore: '#ffffff',
  starYellow: '#ffea75',
  starGold: '#f0b429',
  starHaloCyan: '#96ccff',

  // Cypress tree (flame-like dark silhouettes with rich impasto greens and umber)
  cypressBlack: '#0a140d',
  cypressDark: '#112116',
  cypressDeepGreen: '#183321',
  cypressForest: '#22472d',
  cypressOlive: '#2f5b3a',
  cypressHighlight: '#3f724a',
  cypressUmber: '#1a1810',

  // Village of Saint-Rémy (stone, slate, terracotta, warm lamp-lit windows)
  wallStone: '#445163',
  wallSlate: '#323c4a',
  wallPlaster: '#526075',
  roofTerracotta: '#7a3f2b',
  roofRed: '#914d36',
  roofSlate: '#273342',
  roofDark: '#1b232e',
  churchStone: '#4c5c70',
  churchSpire: '#1f2a38',
  windowGlowWarm: '#ffb703',
  windowGlowBright: '#ffdd55',
  windowGlowAmber: '#fb8500',
  chimneyBrick: '#5c382c',
  smokeVoxel: '#6d7f99',

  // Mountains (Alpilles range in deep indigos and crest accents)
  mountainDeep: '#0f1c34',
  mountainShadow: '#162847',
  mountainCobalt: '#1e3860',
  mountainRidge: '#2a4c7e',
  mountainCrest: '#3e659e',

  // Valley & Olive groves & Terraces
  groundDark: '#142220',
  groundOlive: '#243b2f',
  groundOchre: '#423c28',
  oliveDark: '#1b3830',
  oliveMid: '#2c5346',
  oliveLight: '#3f6d5c',
  terraceStone: '#2e3842',
  terraceEdge: '#3d4b58'
};

// Deterministic random generator for reproducible painterly voxel variation
export function seededRandom(seed = 1889) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pickRandom(array, rng = Math.random) {
  return array[Math.floor(rng() * array.length)];
}

export function lerpColor(hexA, hexB, t) {
  const cA = new T.Color(hexA);
  const cB = new T.Color(hexB);
  return '#' + cA.lerp(cB, t).getHexString();
}
