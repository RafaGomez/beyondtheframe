import * as T from 'three';

// Authentic color palette sampled directly from Van Gogh's "The Starry Night" (1889, MoMA)
export const PALETTE = {
  // Deep midnight and celestial sky
  skyUltramarine: '#0a1630',
  skyPrussian: '#0e1f3d',
  skyMidnight: '#122b54',
  skyCobalt: '#1a3c75',
  skyRoyal: '#24529c',
  skyCerulean: '#3272be',
  skyAzure: '#4c92db',
  skyCyan: '#78b5ee',
  skyMist: '#afd4f7',
  skyPaleGold: '#faecc2',
  skyWhite: '#f0f6ff',

  // Radiant Moon & Stars (Cadmium yellows, lemon zinc, radiant whites, aureoles)
  moonWhite: '#fffae8',
  moonLemon: '#fff275',
  moonGold: '#f7be23',
  moonCadmium: '#ea861a',
  moonDeepOrange: '#d45a0f',
  moonHaloLemon: '#fffaad',
  moonHaloGold: '#fedb60',
  moonHaloCyan: '#a8d8ff',

  starCore: '#ffffff',
  starLemon: '#fff885',
  starGold: '#f5c02b',
  starWarmAmber: '#f0931d',
  starHaloAzure: '#9ad0ff',
  starHaloTeal: '#6eb8d4',

  // Towering Cypress tree (vertical twisting flame tongues, deep spruce, olive, umber)
  cypressBlack: '#060d08',
  cypressDarkSpruce: '#0b1b11',
  cypressDeepGreen: '#132c1c',
  cypressForest: '#1b3d27',
  cypressOlive: '#2b5434',
  cypressUmber: '#252115',
  cypressBronze: '#3a331c',
  cypressHighlight: '#487240',
  cypressMoonlit: '#628e50',

  // The Alpilles mountain range (undulating indigo ridges and moonlit crests)
  mountainDeep: '#0c162b',
  mountainShadow: '#13213d',
  mountainIndigo: '#1b2d52',
  mountainCobalt: '#253f70',
  mountainRidge: '#345794',
  mountainCrest: '#527ebc',
  mountainMist: '#7ca6d8',

  // Village of Saint-Rémy (quaint cottages, stone walls, slate, terracotta, gothic church spire)
  wallStone: '#3d4b5e',
  wallSlate: '#2c3746',
  wallPlaster: '#50637c',
  wallDark: '#1d2530',
  roofTerracotta: '#82412b',
  roofRedOchre: '#9a4e34',
  roofSlateBlue: '#253242',
  roofDarkSlate: '#19222c',
  churchStone: '#43546a',
  churchSpire: '#1a2330',
  churchRoof: '#2e3d50',
  windowGlowBright: '#ffea6c',
  windowGlowWarm: '#ffb31a',
  windowGlowAmber: '#f27802',
  windowGlowFlame: '#e05307',
  chimneyBrick: '#5a3526',

  // Valley & Olive Groves & Foreground Terrace
  terraceStone: '#2d3742',
  terracePaving: '#3d4752',
  terraceEdge: '#4d5966',
  terraceOchre: '#524933',
  groundDark: '#121f1a',
  groundOlive: '#1f3828',
  groundOchre: '#3e3924',
  oliveDark: '#183329',
  oliveMid: '#284f3e',
  oliveLight: '#3f6d54',
  oliveSilver: '#58876c'
};

// Deterministic seeded random number generator
export function createRNG(seed = 188905) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pickRandom(array, rng = Math.random) {
  return array[Math.floor(rng() * array.length)];
}

export function lerpHex(hexA, hexB, t) {
  const cA = new T.Color(hexA);
  const cB = new T.Color(hexB);
  return '#' + cA.lerp(cB, t).getHexString();
}

export function varyColor(hex, hueVar = 0.02, satVar = 0.05, lightVar = 0.06, rng = Math.random) {
  const color = new T.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.h = (hsl.h + (rng() - 0.5) * hueVar + 1) % 1;
  hsl.s = T.MathUtils.clamp(hsl.s + (rng() - 0.5) * satVar, 0, 1);
  hsl.l = T.MathUtils.clamp(hsl.l + (rng() - 0.5) * lightVar, 0, 1);
  color.setHSL(hsl.h, hsl.s, hsl.l);
  return color;
}
