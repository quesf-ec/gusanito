/* El gusanito en 3D: el mismo pueblo y el mismo juego, dibujados con three.js.
   gusanito.js sigue llevando toda la lógica y deja los datos en window.gusanitoMundo; aquí solo se dibuja.
   El mundo del juego es plano (x, y en px): en 3D es (x, altura, y). Si no hay WebGL, G3D.listo queda en
   falso y el juego se dibuja en 2D como antes. */
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const M = window.gusanitoMundo;
const G3D = (window.G3D = { listo: false });
const col = (c) => new T.Color(c);

// ─── Mallas hechas a mano: muchos cuadrados y triángulos de colores en una sola pieza ───
class Malla {
  constructor() { this.p = []; this.c = []; this.n = []; }
  // con normales propias (na, nb, nc) la superficie se ve curva; sin ellas, la cara es plana
  tri(a, b, c, color, na, nb, nc) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
    let [ca, cb, cc] = Array.isArray(color) ? color : [color, color, color]; // un color, o uno por vértice (degradado)
    if (!na) na = nb = nc = [x, y, z];
    else if (x * na[0] + y * na[1] + z * na[2] < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; [cb, cc] = [cc, cb]; } // que la cara mire hacia su normal
    for (const [v, n, k] of [[a, na, ca], [b, nb, cb], [c, nc, cc]]) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); this.c.push(k.r, k.g, k.b); }
  }
  // c2: el color de arriba (c y d), para degradar de abajo hacia arriba
  quad(a, b, c, d, color, na, nb, nc, nd, c2) {
    if (!c2) { this.tri(a, b, c, color, na, nb, nc); this.tri(a, c, d, color, na, nc, nd); return; }
    this.tri(a, b, c, [color, color, c2], na, nb, nc); this.tri(a, c, d, [color, c2, c2], na, nc, nd);
  }
  malla(mat) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    const uv = new Float32Array(this.p.length / 3 * 2); // la textura va pegada al mundo: una baldosa cada 512 px
    for (let i = 0, j = 0; i < this.p.length; i += 3, j += 2) { uv[j] = this.p[i] / 512; uv[j + 1] = this.p[i + 2] / 512; }
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    return new T.Mesh(g, mat);
  }
}
// bolita y cilindro redondos dentro de una malla
function bolaM(m, x, y, z, r, color, sy = 1) {
  const N = 10, K = 6, P = (i, k) => { const a = i / N * Math.PI * 2, b = k / K * Math.PI, n = [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)]; return [[x + n[0] * r, y + n[1] * r * sy, z + n[2] * r], n]; };
  for (let i = 0; i < N; i++) for (let k = 0; k < K; k++) { const [a, na] = P(i, k), [b, nb] = P(i + 1, k), [c, nc] = P(i + 1, k + 1), [d, nd] = P(i, k + 1); m.quad(a, b, c, d, color, na, nb, nc, nd); }
}
function cil(m, x, z, r, y0, y1, color, r1 = r) {
  const N = 14;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, b = (i + 1) / N * Math.PI * 2, na = [Math.cos(a), 0.15, Math.sin(a)], nb = [Math.cos(b), 0.15, Math.sin(b)];
    m.quad([x + na[0] * r, y0, z + na[2] * r], [x + nb[0] * r, y0, z + nb[2] * r], [x + nb[0] * r1, y1, z + nb[2] * r1], [x + na[0] * r1, y1, z + na[2] * r1], color, na, nb, nb, na);
    m.tri([x, y1, z], [x + na[0] * r1, y1, z + na[2] * r1], [x + nb[0] * r1, y1, z + nb[2] * r1], color, [0, 1, 0], [0, 1, 0], [0, 1, 0]);
  }
}
const mate = (extra) => new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: T.DoubleSide, ...extra });

// una cinta plana a lo largo de una línea (calle o vereda), con las puntas y los codos redondos
function cinta(m, pts, ancho, y, color) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / l * ancho, ny = (b.x - a.x) / l * ancho;
    m.quad([a.x + nx, y, a.y + ny], [a.x - nx, y, a.y - ny], [b.x - nx, y, b.y - ny], [b.x + nx, y, b.y + ny], color);
  }
  for (const q of pts) disco(m, q.x, q.y, ancho, y, color, 14);
}
function disco(m, x, z, r, y, color, n = 28) {
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
    m.tri([x, y, z], [x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(b) * r, y, z + Math.sin(b) * r], color);
  }
}
function caja(m, cx, cz, ang, largo, ancho, y0, y1, color, tapa = color) {
  const ux = Math.cos(ang) * largo / 2, uz = Math.sin(ang) * largo / 2, nx = -Math.sin(ang) * ancho / 2, nz = Math.cos(ang) * ancho / 2;
  const P = [[cx - ux - nx, cz - uz - nz], [cx + ux - nx, cz + uz - nz], [cx + ux + nx, cz + uz + nz], [cx - ux + nx, cz - uz + nz]];
  for (let i = 0; i < 4; i++) { const a = P[i], b = P[(i + 1) % 4]; m.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], color); }
  m.quad([P[0][0], y1, P[0][1]], [P[1][0], y1, P[1][1]], [P[2][0], y1, P[2][1]], [P[3][0], y1, P[3][1]], tapa);
}
function poligono(m, pts, y, color) {
  const tris = T.ShapeUtils.triangulateShape(pts.map((q) => new T.Vector2(q.x, q.y)), []);
  for (const [a, b, c] of tris) m.tri([pts[a].x, y, pts[a].y], [pts[b].x, y, pts[b].y], [pts[c].x, y, pts[c].y], color);
}
function pintura(base, manchas, n, rmin, rmax, granos = 0) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  let sem = 11; const r = () => ((sem = (sem * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const px = r() * 256, py = r() * 256, rad = rmin + r() * (rmax - rmin);
    x.fillStyle = manchas[(r() * manchas.length) | 0];
    for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { x.beginPath(); x.ellipse(px + dx, py + dy, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, 7); x.fill(); } // se repite sin costura
  }
  for (let i = 0; i < granos; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.07)'; x.fillRect(r() * 256, r() * 256, 2, 2); }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// la carrocería pintada a mano, como los gusanitos de verdad: más clara arriba, con lunares y florcitas
function pintado(color, borde) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, color); g.addColorStop(1, color);
  x.fillStyle = color; x.fillRect(0, 0, 256, 128); x.globalAlpha = 0.35; x.fillStyle = g; x.fillRect(0, 0, 256, 128); x.globalAlpha = 1;
  let sem = 5; const r = () => ((sem = (sem * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const px = r() * 256, py = 10 + r() * 108;
    if (i % 3) { x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.arc(px, py, 3 + r() * 3, 0, 7); x.fill(); }
    else { x.fillStyle = borde; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(px + Math.cos(k * 1.257) * 5, py + Math.sin(k * 1.257) * 5, 3.4, 0, 7); x.fill(); } x.fillStyle = '#FFE36E'; x.beginPath(); x.arc(px, py, 2.6, 0, 7); x.fill(); }
  }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace;
  return t;
}
function tela(colores, rep = 2) { // tela de rayas para los toldos
  const c = document.createElement('canvas'); c.width = 64; c.height = 8;
  const x = c.getContext('2d');
  colores.forEach((k, i) => { x.fillStyle = k; x.fillRect(i * 64 / colores.length, 0, 64 / colores.length + 1, 8); });
  const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.repeat.x = rep; t.colorSpace = T.SRGBColorSpace;
  return t;
}

let renderer, escena, camara, sol, cielo, ventanas, faro;
const din = {}; // lo que se mueve
const AQUI = new T.Vector3(), V = new T.Vector3();

function construir() {
  const lienzo = document.getElementById('pueblo3d');
  renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  renderer.toneMapping = T.NeutralToneMapping || T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = T.SRGBColorSpace;
  escena = new T.Scene();
  escena.background = col('#BFE3F2');
  escena.fog = new T.Fog('#CFE6EC', 1500, 4200);
  camara = new T.PerspectiveCamera(46, 1, 20, 7000);
  const pm = new T.PMREMGenerator(renderer);
  escena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; escena.environmentIntensity = 0.28;

  // luz: cielo y rebote del suelo, y un sol tibio de tarde que hace las sombras
  cielo = new T.HemisphereLight('#EAF4FF', '#D9C9A0', 0.8);
  escena.add(cielo);
  sol = new T.DirectionalLight('#FFE7BF', 2.0);
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0012; sol.shadow.normalBias = 5; sol.shadow.radius = 4; sol.shadow.blurSamples = 12;
  Object.assign(sol.shadow.camera, { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 100, far: 4200 });
  escena.add(sol, sol.target);
  const relleno = new T.DirectionalLight('#CFE4FF', 0.7); relleno.position.set(600, 500, 800); escena.add(relleno); // luz de relleno, sin sombra
  faro = new T.SpotLight('#FFF1C2', 0, 900, 0.5, 0.6, 1.2); // los faros, de noche
  escena.add(faro, faro.target);

  // ─── el suelo, las calles y las veredas ───
  const radio = M.vista * M.E * 1.6;
  const pasto = new T.Mesh(new T.CircleGeometry(radio, 64), new T.MeshStandardMaterial({ roughness: 1, map: pintura('#9BD472', ['rgba(140,205,95,.55)', 'rgba(176,226,128,.5)', 'rgba(120,190,90,.4)', 'rgba(200,232,140,.35)'], 90, 14, 46) }));
  pasto.material.map.repeat.set(radio * 2 / 620, radio * 2 / 620);
  pasto.rotation.x = -Math.PI / 2; pasto.receiveShadow = true; escena.add(pasto);

  const suelo = new Malla(), GRIS = col('#97A2AE'), VEREDA = col('#EEF0F2'), BORDE = col('#C5CCD4'), RAYA = col('#FFFFFF');
  const lineas = [...M.tramos, ...M.vistas];
  for (const l of lineas) cinta(suelo, l.p, l.hw + 20, 3.2, BORDE);
  for (const l of lineas) cinta(suelo, l.p, l.hw + 17, 4, VEREDA);
  for (const r of M.redondeles) { disco(suelo, r.x, r.y, r.R + 20, 3.3, BORDE); disco(suelo, r.x, r.y, r.R + 17, 4.1, VEREDA); }
  // el parque y los otros verdes
  poligono(suelo, M.parque.p, 2.4, col('#B4E583')); // más abajo que la vereda y la calzada: si se montan, no parpadea
  for (const v of M.verdes) poligono(suelo, v.p, 1.2, col(v.campo ? '#C9DB7A' : '#B4E583'));
  disco(suelo, M.parque.x, M.parque.y, M.parque.r * 0.5 + 16, 4.8, col('#F4DDB0'));
  disco(suelo, M.parque.x, M.parque.y, M.parque.r * 0.5 - 16, 4.9, col('#B4E583'));
  disco(suelo, M.parque.x, M.parque.y, 70, 5, col('#EFE6D6'));
  const sueloM = suelo.malla(mate({ map: pintura('#FFFFFF', ['rgba(214,220,226,.5)', 'rgba(255,255,255,.6)', 'rgba(226,222,212,.45)'], 60, 10, 34, 500) })); sueloM.receiveShadow = true; escena.add(sueloM);

  // la calzada va hundida entre las veredas (más abajo que ellas): se dibuja encima con un pelo de ventaja
  const calz = new Malla();
  for (const l of lineas) cinta(calz, l.p, l.hw, 4.6, GRIS);
  for (const r of M.redondeles) disco(calz, r.x, r.y, r.R, 4.7, GRIS);
  const calzM = calz.malla(mate({ roughness: 0.95, map: pintura('#FFFFFF', ['rgba(226,230,236,.35)', 'rgba(246,248,250,.4)', 'rgba(214,220,228,.3)'], 40, 20, 60, 1800) })); calzM.receiveShadow = true; escena.add(calzM);
  // rayas del centro y pasos de cebra
  const rayas = new Malla();
  for (const l of lineas) {
    for (let i = 1; i < l.p.length; i++) {
      const a = l.p[i - 1], b = l.p[i], len = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      for (let s = 40; s < len - 40; s += 56) caja(rayas, a.x + ux * (s + 13), a.y + uy * (s + 13), Math.atan2(uy, ux), 26, 4, 4.9, 5.2, RAYA);
    }
  }
  for (const t of M.tramos) {
    if (t.L < 520) continue;
    for (const fin of [0, 1]) {
      const nodo = fin ? t.b : t.a;
      if (nodo.tramos.length < 3 || nodo.redondel) continue;
      const m = M.enTramo(t, fin ? t.L - t.hw - 40 : t.hw + 40), ang = Math.atan2(m.uy, m.ux);
      for (let y = -t.hw + 20; y < t.hw - 16; y += 26) caja(rayas, m.x - m.uy * y, m.y + m.ux * y, ang, 34, 14, 4.9, 5.2, RAYA);
    }
  }
  const rayasM = rayas.malla(mate({ roughness: 0.7 })); rayasM.receiveShadow = true; escena.add(rayasM);

  // ─── casas: esquinas redondas, zócalo, ventanas con marco y un techo abombado, como de arcilla ───
  const casas = new Malla(), vent = new Malla(), VID = col('#8CC6E8'), MARCO = col('#FFFFFF');
  const PARED = ['#FFF4E0', '#FFE1D6', '#FDEFC2', '#DDF1E4', '#DCEBFA', '#FBD9E6', '#EDE3F7'].map(col);
  const TECHO = ['#F08A6B', '#F4A07A', '#E8775F', '#F6B26B', '#7FB3D9', '#86CDB9'].map(col);
  const ventana = (ax, az, bx, bz, nx, nz, y0, y1) => { // ventanas con marco blanco sobre un tramo recto de pared
    const l = Math.hypot(bx - ax, bz - az), n = Math.floor(l / 46);
    if (n < 1) return;
    const dx = (bx - ax) / l, dz = (bz - az) / l, N = [nx, 0.2, nz];
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n * l, x = ax + dx * t, z = az + dz * t;
      for (const [za, zb] of y1 - y0 > 70 ? [[0.2, 0.42], [0.58, 0.82]] : [[0.3, 0.72]]) {
        const ya = y0 + (y1 - y0) * za, yb = y0 + (y1 - y0) * zb;
        const q = (m, w, e, off, color) => m.quad([x - dx * w + nx * off, ya - e, z - dz * w + nz * off], [x + dx * w + nx * off, ya - e, z + dz * w + nz * off], [x + dx * w + nx * off, yb + e, z + dz * w + nz * off], [x - dx * w + nx * off, yb + e, z - dz * w + nz * off], color, N, N, N, N);
        q(casas, 10, 3, 0.6, MARCO); q(vent, 7, 0, 1.2, VID);
      }
    }
  };
  let nCasa = 0;
  for (const c of M.casas) {
    nCasa++;
    const P = PARED[(nCasa * 7) % PARED.length], R = TECHO[(nCasa * 5) % TECHO.length], ZOC = P.clone().multiplyScalar(0.8);
    const h = c.alto * 1.25 + 14, hw = c.w / 2, hh = c.h / 2, r = Math.min(16, hw / 2, hh / 2), sube = 30;
    // el contorno: cuatro esquinas redondas
    const o = [];
    for (let q = 0; q < 4; q++) for (let k = 0; k <= 2; k++) {
      const a = (q + k / 2) * Math.PI / 2, lu = [1, -1, -1, 1][q] * (hw - r) + Math.cos(a) * r, lv = [1, 1, -1, -1][q] * (hh - r) + Math.sin(a) * r;
      o.push({ lu, lv, nx: c.ux * Math.cos(a) + c.nx * Math.sin(a), nz: c.uy * Math.cos(a) + c.ny * Math.sin(a) });
    }
    const pt = (q, esc, y) => [c.x + (c.ux * q.lu + c.nx * q.lv) * esc, y, c.y + (c.uy * q.lu + c.ny * q.lv) * esc];
    const nrm = (q, arriba) => { const k = 1 - arriba; return [q.nx * k, arriba, q.nz * k]; };
    const anillo = (e0, y0, e1, y1, color, u0, u1, c2) => { for (let i = 0; i < o.length; i++) { const a = o[i], b = o[(i + 1) % o.length]; casas.quad(pt(a, e0, y0), pt(b, e0, y0), pt(b, e1, y1), pt(a, e1, y1), color, nrm(a, u0), nrm(b, u0), nrm(b, u1), nrm(a, u1), c2); } };
    const claro = (k, f) => k.clone().lerp(col('#FFFFFF'), f), oscuro = (k, f) => k.clone().multiplyScalar(f);
    anillo(1.015, 4, 1.015, 13, ZOC, 0, 0);
    anillo(1, 13, 1, h, oscuro(P, 0.8), 0, 0, claro(P, 0.25));
    anillo(1.08, h, 1.08, h + 6, R.clone().multiplyScalar(0.9), 0, 0.2);       // el filo del techo
    anillo(1.08, h + 6, 0.74, h + sube * 0.7, oscuro(R, 0.86), 0.45, 0.6, R);
    anillo(0.74, h + sube * 0.7, 0.34, h + sube, R, 0.7, 0.9, claro(R, 0.22));
    for (let i = 0; i < o.length; i++) casas.tri([c.x, h + sube + 2, c.y], pt(o[i], 0.34, h + sube), pt(o[(i + 1) % o.length], 0.34, h + sube), claro(R, 0.22), [0, 1, 0], nrm(o[i], 0.9), nrm(o[(i + 1) % o.length], 0.9));
    // ventanas en los cuatro lados rectos
    for (const [su, sv] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = c.ux * su + c.nx * sv, nz = c.uy * su + c.ny * sv, tx = su ? c.nx : c.ux, tz = su ? c.ny : c.uy, medio = su ? hh - r : hw - r, fuera = su ? hw : hh;
      const cx = c.x + nx * fuera, cz = c.y + nz * fuera;
      ventana(cx - tx * medio, cz - tz * medio, cx + tx * medio, cz + tz * medio, nx, nz, 13, h);
    }
  }
  for (const e of M.edificios) {
    const h = e.iglesia ? 150 : 90, P = col(e.iglesia ? '#FFFBF3' : '#FDEFC2'), R = col(e.iglesia ? '#F4A07A' : '#7FB3D9');
    for (let i = 0; i < e.p.length; i++) {
      const a = e.p[i], b = e.p[(i + 1) % e.p.length];
      casas.quad([a.x, 4, a.y], [b.x, 4, b.y], [b.x, h, b.y], [a.x, h, a.y], P.clone().multiplyScalar(0.78), undefined, undefined, undefined, undefined, P);
      const fa = { x: e.cx + (a.x - e.cx) * 1.04, y: e.cy + (a.y - e.cy) * 1.04 }, fb = { x: e.cx + (b.x - e.cx) * 1.04, y: e.cy + (b.y - e.cy) * 1.04 };
      casas.quad([fa.x, h, fa.y], [fb.x, h, fb.y], [fb.x, h + 10, fb.y], [fa.x, h + 10, fa.y], R);
    }
    poligono(casas, e.p.map((q) => ({ x: e.cx + (q.x - e.cx) * 1.04, y: e.cy + (q.y - e.cy) * 1.04 })), h + 10, R);
    if (e.iglesia && e.grande > 30000) { // torre redonda con su cúpula
      cil(casas, e.cx, e.cy, 34, h, h + 100, P);
      bolaM(casas, e.cx, h + 100, e.cy, 38, col('#F08A6B'), 0.9);
      cil(casas, e.cx, e.cy, 3, h + 130, h + 160, col('#F6C445'));
    }
  }
  const casasM = casas.malla(mate({ roughness: 0.95 })); casasM.castShadow = casasM.receiveShadow = true; escena.add(casasM);
  ventanas = vent.malla(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, side: T.DoubleSide, emissive: '#FFD27A', emissiveIntensity: 0 }));
  escena.add(ventanas);

  // ─── árboles: tronco gordito y copas de bolas suaves; los de cerca, más redondos ───
  const E0 = M.ESTACION;
  const arb = M.arboles.filter((a) => Math.hypot(a.x - E0.x, a.y - E0.y) > 420 || E0.nx * (a.x - E0.x) + E0.ny * (a.y - E0.y) > 170);
  const VERDES = [['#7CCB62', '#A2E07A'], ['#6FC06A', '#93D97B'], ['#F5A553', '#FBC27A'], ['#EFD45C', '#F8E68A'], ['#8AD3A0', '#B0E6BC']];
  const O = new T.Object3D(), matCopa = new T.MeshStandardMaterial({ roughness: 1 });
  const tr = new T.InstancedMesh(new T.CylinderGeometry(5, 8, 1, 8), new T.MeshStandardMaterial({ color: '#B98A62', roughness: 1 }), arb.length);
  const cerca = arb.filter((a) => Math.hypot(a.x, a.y) < M.radio * 0.6), lejos = arb.filter((a) => Math.hypot(a.x, a.y) >= M.radio * 0.6);
  arb.forEach((a, i) => { const h = a.alto * 0.7 + 18; a.h3 = h; O.position.set(a.x, h / 2, a.y); O.scale.set(1, h, 1); O.rotation.set(0, 0, 0); O.updateMatrix(); tr.setMatrixAt(i, O.matrix); });
  tr.castShadow = true; escena.add(tr);
  for (const [lista, detalle] of [[cerca, 2], [lejos, 1]]) {
    const copa = new T.InstancedMesh(new T.IcosahedronGeometry(1, detalle), matCopa, lista.length * 3);
    lista.forEach((a, i) => {
      const k = VERDES[Math.floor(Math.abs(a.x * 7 + a.y * 3)) % (Math.abs(Math.round(a.x)) % 4 ? 2 : 5)], h = a.h3, r = a.r;
      const pon = (j, x, y, z, e, c) => { O.position.set(a.x + x, y, a.y + z); O.scale.set(e, e * 0.92, e); O.updateMatrix(); copa.setMatrixAt(i * 3 + j, O.matrix); copa.setColorAt(i * 3 + j, col(c)); };
      pon(0, 0, h + r * 0.55, 0, r, k[0]); pon(1, -r * 0.5, h + r * 0.95, -r * 0.35, r * 0.7, k[1]); pon(2, r * 0.5, h + r * 0.75, r * 0.3, r * 0.62, k[0]);
    });
    copa.castShadow = copa.receiveShadow = true; escena.add(copa);
  }

  // ─── lo de la calle: islas de los redondeles, kiosco, puestos, vallas, estación, banderines ───
  const cosas = new Malla();
  for (const r of M.redondeles) {
    for (let i = 0; i < 24; i++) { // bordillo de la isla
      const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2, p = (t) => [r.x + Math.cos(t) * r.isla, r.y + Math.sin(t) * r.isla];
      const [ax, az] = p(a), [bx, bz] = p(b);
      cosas.quad([ax, 4, az], [bx, 4, bz], [bx, 14, bz], [ax, 14, az], col('#F2B79A'));
    }
    disco(cosas, r.x, r.y, r.isla, 14, col('#B4E583'));
    cil(cosas, r.x, r.y, 20, 14, 26, col('#E9E3D6')); cil(cosas, r.x, r.y, 11, 26, 84, col('#F4EFE6'), 8); bolaM(cosas, r.x, 96, r.y, 15, col('#F6C445'));
    const flores = ['#E8458B', '#F2E14B', '#F6EBD3', '#D6382B', '#7E3592'];
    for (let n = 0; n < 14; n++) { const a = n / 14 * Math.PI * 2; bolaM(cosas, r.x + Math.cos(a) * (r.isla - 22), 17, r.y + Math.sin(a) * (r.isla - 22), 8, col(flores[n % 5]), 0.8); }
  }
  { // kiosco del parque: base, columnas y techo azul en punta
    const x = M.parque.x, z = M.parque.y;
    disco(cosas, x, z, 62, 12, col('#EFE6D6'));
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4; cil(cosas, x + Math.cos(a) * 50, z + Math.sin(a) * 50, 4, 12, 80, col('#FFFFFF')); }
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4 - Math.PI / 8, b = a + Math.PI / 4; cosas.tri([x + Math.cos(a) * 66, 80, z + Math.sin(a) * 66], [x + Math.cos(b) * 66, 80, z + Math.sin(b) * 66], [x, 130, z], col(n % 2 ? '#6FB1E8' : '#8CC6F0')); }
  }
  const TOLDOS = ['#E8458B', '#F2B33D', '#5FB4E6', '#8BD43B', '#B46DE0', '#D6382B'];
  for (const p of M.puestos) { // puestos de la feria: mesa y toldo de color
    const n = Math.max(1, Math.round(p.largo / 80)), tam = p.largo / n, ux = Math.cos(p.ang), uy = Math.sin(p.ang);
    for (let k = 0; k < n; k++) {
      const cx = p.x + ux * (k + 0.5) * tam, cz = p.y + uy * (k + 0.5) * tam;
      caja(cosas, cx, cz, p.ang, tam - 14, p.hondo - 10, 4.6, 26, col('#EFE6D6'));
      caja(cosas, cx, cz, p.ang, tam - 6, p.hondo, 52, 58, col(TOLDOS[(k + (p.lado > 0 ? 2 : 0)) % 6]));
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) caja(cosas, cx + ux * sx * (tam / 2 - 6) - uy * sy * (p.hondo / 2 - 4), cz + uy * sx * (tam / 2 - 6) + ux * sy * (p.hondo / 2 - 4), p.ang, 3, 3, 4.6, 52, col('#F4F1E8'));
    }
  }
  for (const v of M.vallas) valla(cosas, v);
  { // la estación: bahía pintada, boletería
    const E = M.ESTACION, A = E.ang, P = (lx, ly) => [E.x + E.ux * lx + E.nx * ly, E.y + E.uy * lx + E.ny * ly], AM = col('#F2E14B');
    for (const [lx, ly, la, an] of [[0, -62, 520, 5], [0, 30, 520, 5], [-260, -16, 5, 92], [260, -16, 5, 92]]) { const [x, z] = P(lx, ly); caja(cosas, x, z, A, la, an, 4.9, 5.3, AM); }
    const [bx, bz] = P(38, 66);
    caja(cosas, bx, bz, A, 56, 40, 4.6, 56, col('#FFF6E3')); caja(cosas, bx, bz, A, 66, 50, 56, 64, col('#E8458B'));
  }
  const cosasM = cosas.malla(mate({ roughness: 0.8 })); cosasM.castShadow = cosasM.receiveShadow = true; escena.add(cosasM);
  // banderines de un poste a otro
  const ban = new Malla(), BAN = ['#D6382B', '#F2E14B', '#1B5FAA', '#E8458B', '#8BD43B', '#F6EBD3'];
  for (const b of M.banderines) {
    const dx = b.x2 - b.x1, dy = b.y2 - b.y1, l = Math.hypot(dx, dy), n = Math.floor(l / 26), ux = dx / l, uy = dy / l;
    for (const [x, z] of [[b.x1, b.y1], [b.x2, b.y2]]) caja(ban, x, z, 0, 4, 4, 4, 112, col('#8C7B6C'));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = b.x1 + dx * t, z = b.y1 + dy * t, y = 108 - Math.sin(t * Math.PI) * 14;
      ban.tri([x - ux * 9, y, z - uy * 9], [x + ux * 9, y, z + uy * 9], [x, y - 20, z], col(BAN[i % 6]));
    }
  }
  const banM = ban.malla(mate({ roughness: 0.6 })); banM.castShadow = true; escena.add(banM);

  // ─── lo que se mueve ───
  din.cabeza = cabeza(); escena.add(din.cabeza);
  din.vagones = [];
  din.cierres = Array.from({ length: 8 }, () => { const m = new Malla(); valla(m, { x: 0, y: 0, ang: 0, largo: 260 }); const o = m.malla(mate()); o.castShadow = true; o.visible = false; escena.add(o); return o; });
  // gente de la fila, perros, danzantes, caídos: bolitas en instancias
  din.gente = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), new T.MeshStandardMaterial({ roughness: 0.8 }), 400);
  din.gente.castShadow = true; din.gente.frustumCulled = false; escena.add(din.gente);
  din.fiestas = Array.from({ length: 4 }, () => {
    const g = new T.Group();
    const aro = new T.Mesh(new T.TorusGeometry(70, 5, 8, 40), new T.MeshStandardMaterial({ color: '#F2E14B', emissive: '#F2B33D', emissiveIntensity: 0.7 })); aro.rotation.x = Math.PI / 2; aro.position.y = 8;
    const nota = new T.Mesh(new T.OctahedronGeometry(20), new T.MeshStandardMaterial({ color: '#E8458B', emissive: '#E8458B', emissiveIntensity: 0.5, roughness: 0.3 }));
    g.add(aro, nota); g.nota = nota; g.visible = false; escena.add(g); return g;
  });
}

function valla(m, v) { // valla de rayas rojas y blancas con sus patas
  const n = Math.max(2, Math.round(v.largo / 26)), tam = v.largo / n, ux = Math.cos(v.ang), uy = Math.sin(v.ang);
  for (let k = 0; k < n; k++) caja(m, v.x + ux * ((k + 0.5) * tam - v.largo / 2), v.y + uy * ((k + 0.5) * tam - v.largo / 2), v.ang, tam, 7, 30, 52, col(k % 2 ? '#FFFFFF' : '#D6382B'));
  for (const s of [-1, 1]) {
    caja(m, v.x + ux * s * (v.largo / 2 - 14), v.y + uy * s * (v.largo / 2 - 14), v.ang, 6, 26, 4.6, 34, col('#8C7B6C'));
    for (const t of [-1, 1]) { const x = v.x + ux * s * (v.largo / 2 - 30) - uy * t * 26, z = v.y + uy * s * (v.largo / 2 - 30) + ux * t * 26; caja(m, x, z, 0, 16, 16, 4.6, 8, col('#F2B33D')); caja(m, x, z, 0, 9, 9, 8, 34, col('#F28A3D')); }
  }
}

// vinilo suave: mate, con un velo claro en los bordes (sheen) que lo hace ver blandito y no de plástico
const brillo = (color, extra) => new T.MeshPhysicalMaterial({ color, roughness: 0.78, metalness: 0, sheen: 0.5, sheenRoughness: 0.6, sheenColor: col(color).lerp(col('#FFFFFF'), 0.5), envMapIntensity: 0.6, ...extra });
function ruedas(g, largo, ancho) {
  const geo = new T.SphereGeometry(10, 14, 10), mat = new T.MeshStandardMaterial({ color: '#4A4458', roughness: 0.9 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const r = new T.Mesh(geo, mat); r.scale.z = 0.55; r.position.set(sx * largo * 0.28, 12, sz * (ancho / 2 + 1)); r.castShadow = true; g.add(r); }
}
function toldo(g, largo, ancho, colores, x = 0, alto = 62) {
  // un almohadón de rayas, redondeado, sobre postes finos
  const r = ancho / 2, geo = largo > ancho ? new T.CapsuleGeometry(r, largo - ancho, 6, 16) : new T.SphereGeometry(r, 16, 12);
  const t = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tela(colores, 1), roughness: 0.9, transparent: true, opacity: 0.62, depthWrite: false }));
  t.rotation.z = Math.PI / 2; t.scale.set(0.16, 1, 1); t.position.set(x, alto, 0); t.renderOrder = 2; g.add(t);
  const pg = new T.CylinderGeometry(1.6, 1.6, alto - 28, 6), mat = new T.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new T.Mesh(pg, mat); p.position.set(x + sx * (largo / 2 - 8), 28 + (alto - 28) / 2, sz * (ancho / 2 - 6)); g.add(p); }
}
function cabeza() {
  const g = new T.Group(), C = M.C;
  const cuerpo = new T.Mesh(new T.SphereGeometry(1, 28, 18), brillo('#FFFFFF', { map: pintado('#8BD43B', '#E8458B') })); cuerpo.material.map.repeat.set(2, 1); cuerpo.scale.set(C.cabezaL / 2, 19, C.cabezaA / 2); cuerpo.position.y = 26; cuerpo.castShadow = true;
  const franja = new T.Mesh(new T.SphereGeometry(1, 28, 18), brillo('#E8458B')); franja.scale.set(C.cabezaL / 2 + 1, 9, C.cabezaA / 2 + 1); franja.position.y = 18;
  g.add(cuerpo, franja);
  for (const s of [-1, 1]) { // ojos con pestañas, antenas
    const ojo = new T.Mesh(new T.SphereGeometry(8, 16, 12), brillo('#FFFFFF', { roughness: 0.15 })); ojo.position.set(24, 40, s * 11);
    const iris = new T.Mesh(new T.SphereGeometry(4.6, 12, 10), brillo('#1B5FAA', { roughness: 0.1 })); iris.position.set(30, 41, s * 11);
    const pup = new T.Mesh(new T.SphereGeometry(2.4, 10, 8), brillo('#111111')); pup.position.set(33.5, 41.5, s * 11);
    const ant = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 30, 6), brillo('#E8458B')); ant.position.set(16, 58, s * 14); ant.rotation.set(s * 0.35, 0, -0.35);
    const bola = new T.Mesh(new T.SphereGeometry(5, 12, 10), brillo('#F2E14B', { emissive: '#F2B33D', emissiveIntensity: 0.3 })); bola.position.set(21, 73, s * 19);
    g.add(ojo, iris, pup, ant, bola);
  }
  const labios = new T.Mesh(new T.SphereGeometry(1, 14, 10), brillo('#D6382B')); labios.scale.set(5, 4, 13); labios.position.set(C.cabezaL / 2 - 2, 24, 0); g.add(labios);
  const chofer = new T.Mesh(new T.SphereGeometry(7, 12, 10), new T.MeshStandardMaterial({ color: '#B97D55' })); chofer.position.set(-10, 48, -7); g.add(chofer);
  const camisa = new T.Mesh(new T.SphereGeometry(9, 12, 10), new T.MeshStandardMaterial({ color: '#D6382B' })); camisa.position.set(-10, 37, -7); g.add(camisa);
  ruedas(g, C.cabezaL, C.cabezaA);
  toldo(g, 44, C.cabezaA + 6, ['#E8458B', '#F2E14B', '#5FB4E6', '#8BD43B'], -14, 70);
  return g;
}
function vagon(v) {
  const g = new T.Group(), C = M.C;
  const base = new T.Mesh(new T.CapsuleGeometry(C.vagonA / 2, C.vagonL - C.vagonA, 6, 18), brillo(v.pal.borde)); base.rotation.z = Math.PI / 2; base.scale.set(0.42, 1, 1); base.position.y = 20; base.castShadow = true;
  const tina = new T.Mesh(new T.CapsuleGeometry(C.vagonA / 2 - 3, C.vagonL - C.vagonA, 6, 18), brillo('#FFFFFF', { map: pintado(v.pal.cuerpo, v.pal.borde) })); tina.rotation.z = Math.PI / 2; tina.scale.set(0.5, 1, 1); tina.position.y = 25;
  g.add(base, tina);
  ruedas(g, C.vagonL, C.vagonA);
  toldo(g, C.vagonL - 6, C.vagonA + 8, v.pal.toldo);
  g.gente = [[10, -9], [10, 9], [-12, -9], [-12, 9]].map(([x, z]) => {
    const p = new T.Group();
    const cuerpo = new T.Mesh(new T.SphereGeometry(8, 10, 8), new T.MeshStandardMaterial({ roughness: 0.8 })); cuerpo.position.y = 36; cuerpo.scale.y = 1.15;
    const cara = new T.Mesh(new T.SphereGeometry(6, 10, 8), new T.MeshStandardMaterial({ roughness: 0.7 })); cara.position.y = 49;
    const pelo = new T.Mesh(new T.SphereGeometry(6.4, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ roughness: 1 })); pelo.position.y = 50;
    p.add(cuerpo, cara, pelo); p.position.set(x, 0, z); p.partes = [cuerpo, cara, pelo]; g.add(p); return p;
  });
  g.rotation.order = 'YXZ';
  return g;
}

let ancho = 0, alto = 0, altoCam = 0;
G3D.render = function (f) {
  const { S, W, H, dpr, dt } = f, k = S.cab;
  if (W !== ancho || H !== alto) { ancho = W; alto = H; renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); camara.aspect = W / H; camara.fov = W > H ? 40 : 50; camara.updateProjectionMatrix(); }
  // la cámara va detrás y arriba de la cabeza, mirando un poco adelante; en la estación sube para verse sobre la bandeja
  const a = S.cam.ang, fx = Math.cos(a), fz = Math.sin(a), vert = H > W;
  const meta = S.decidiendo ? 1 : 0; altoCam += (meta - altoCam) * Math.min(1, dt * 3);
  const atras = (vert ? 400 : 520) * (1 + 0.12 * f.rapidez), arriba = (vert ? 900 : 640) * (1 + 0.1 * f.rapidez), adelante = (vert ? 120 : 160) - 430 * altoCam;
  camara.position.set(S.cam.x - fx * atras + f.sx, arriba + 120 * altoCam, S.cam.y - fz * atras + f.sy);
  camara.lookAt(S.cam.x + fx * adelante, 20, S.cam.y + fz * adelante);
  // sol de tarde o luna; la sombra sigue a la cabeza
  const noche = S.noche;
  sol.color.set(noche ? '#9FB4FF' : '#FFE7BF'); sol.intensity = noche ? 1.1 : 2.0;
  cielo.intensity = noche ? 0.75 : 0.8; cielo.color.set(noche ? '#7C8FD6' : '#EAF4FF'); escena.environmentIntensity = noche ? 0.1 : 0.28;
  escena.background.set(noche ? '#141C3A' : '#BFE3F2'); escena.fog.color.set(noche ? '#1A2244' : '#CFE6EC');
  ventanas.material.emissiveIntensity = noche ? 2.4 : 0;
  sol.target.position.set(k.x, 0, k.y); sol.position.set(k.x - 1500, 1150, k.y - 800);
  faro.intensity = noche ? 9000 : 0; faro.decay = 1.3;
  faro.position.set(k.x + Math.cos(k.ang) * 30, 40, k.y + Math.sin(k.ang) * 30); faro.target.position.set(k.x + Math.cos(k.ang) * 400, 0, k.y + Math.sin(k.ang) * 400);

  // gusanito
  const C = M.C, t = performance.now() / 1000;
  din.cabeza.position.set(k.x, 0, k.y); din.cabeza.rotation.order = 'YXZ';
  din.cabeza.rotation.set(-k.giro * Math.min(1, k.v / 250) * 0.09, -k.ang, 0);
  while (din.vagones.length < S.vagones.length) { const g = vagon(S.vagones[din.vagones.length]); escena.add(g); din.vagones.push(g); }
  din.vagones.forEach((g, i) => {
    const v = S.vagones[i];
    g.visible = !!v;
    if (!v) return;
    const ladeo = Math.max(-1, Math.min(1, -Math.sign(v.gir) * v.g / 700));
    g.position.set(v.x, 0, v.y); g.rotation.set(ladeo * 0.14, -v.ang, 0);
    g.gente.forEach((p, s) => {
      const q = v.asientos[s];
      p.visible = !!q;
      if (!q) return;
      if (p.de !== q) { p.de = q; p.partes[0].material.color.set(q.ropa); p.partes[1].material.color.set(q.piel); p.partes[2].material.color.set(q.sombrero || q.pelo); }
      p.position.y = f.quieto ? 0 : Math.abs(Math.sin(t * 9 + s * 1.7)) * Math.min(1, v.g / 300) * 5; // saltan con el meneo
    });
  });
  // calles cerradas de esta vuelta
  din.cierres.forEach((o, i) => { const c = f.cierres[i]; o.visible = !!c; if (c) { o.position.set(c.x, 0, c.y); o.rotation.y = -c.ang; o.scale.x = c.largo / 260; } });
  // puntos de fiesta
  din.fiestas.forEach((g, i) => { const p = S.fiestas[i]; g.visible = !!p; if (p) { g.position.set(p.x, 0, p.y); g.rotation.y = p.t; g.nota.position.y = 60 + Math.abs(Math.sin(p.t * 4)) * 26; } });
  // la gente suelta: fila, los que se van, perros, danzantes y los que salieron volando
  let n = 0; const G = din.gente, O = new T.Object3D(), tmp = new T.Color();
  const bola = (x, y, z, r, color) => { if (n >= 400) return; O.position.set(x, y, z); O.scale.setScalar(r); O.updateMatrix(); G.setMatrixAt(n, O.matrix); G.setColorAt(n, tmp.set(color)); n++; };
  const persona = (x, z, p, salto = 0) => { bola(x, 16 + salto, z, 8, p.ropa); bola(x, 30 + salto, z, 6, p.piel); };
  const E = M.ESTACION, loc = (lx, ly) => [E.x + E.ux * lx + E.nx * ly, E.y + E.uy * lx + E.ny * ly];
  S.est.fila.forEach((p, i) => { const [x, z] = loc(-40 - (i % 16) * 19, 52 + ((i / 16) | 0) * 20); persona(x, z, p, f.quieto ? 0 : Math.abs(Math.sin(S.est.t * 5 + i)) * 3); });
  for (const q of S.seVan) { const [x, z] = loc(q.lx, q.ly + q.t * 30); persona(x, z, q.p); }
  for (const q of S.volando) persona(q.x, q.y, q.p, q.z * 0.8);
  for (const c of S.caminantes) {
    if (c.px === undefined) continue;
    if (c.tipo === 'perro') { const ux = Math.cos(c.ang), uz = Math.sin(c.ang); bola(c.px, 9, c.py, 7, '#8A5A2B'); bola(c.px + ux * 9, 13, c.py + uz * 9, 5, '#8A5A2B'); bola(c.px - ux * 8, 9, c.py - uz * 8, 5.5, '#7A4E25'); }
    else for (let j = 0; j < 3; j++) { // danzantes con su penacho
      const x = c.px - (c.dx || 0) * j * 26, z = c.py - (c.dy || 0) * j * 26, s = f.quieto ? 0 : Math.abs(Math.sin(c.t * 5 + j)) * 6;
      bola(x, 16 + s, z, 9, '#F6EBD3'); bola(x, 31 + s, z, 6, '#B97D55'); bola(x, 44 + s, z, 9, ['#D6382B', '#F2E14B', '#1B5FAA'][j]);
    }
  }
  G.count = n; G.instanceMatrix.needsUpdate = true; if (G.instanceColor) G.instanceColor.needsUpdate = true;

  renderer.render(escena, camara);
};

// dónde cae en la pantalla un punto del mundo (lo usa el juego para los textos, las flechas y las chispas)
G3D.aPantalla = function (x, y, h = 20) {
  V.set(x, h, y).applyMatrix4(camara.matrixWorldInverse);
  if (V.z > -5) return { x: ancho / 2 + V.x * 4, y: alto * 3, atras: true }; // detrás de la cámara: abajo de la pantalla
  V.applyMatrix4(camara.projectionMatrix);
  return { x: (V.x + 1) / 2 * ancho, y: (1 - V.y) / 2 * alto };
};

try {
  if (!M) throw new Error('sin mundo');
  construir();
  G3D.listo = true;
  document.documentElement.classList.add('con-3d');
} catch (err) {
  console.warn('Sin 3D, el pueblo se dibuja en 2D:', err);
}
