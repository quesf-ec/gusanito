/* El gusanito en 3D: el mismo pueblo y el mismo juego, dibujados con three.js.
   gusanito.js sigue llevando toda la lógica y deja los datos en window.gusanitoMundo; aquí solo se dibuja.
   El mundo del juego es plano (x, y en px): en 3D es (x, altura, y). Si no hay WebGL, G3D.listo queda en
   falso y el juego se dibuja en 2D como antes. */
import * as T from 'three';

const M = window.gusanitoMundo;
const G3D = (window.G3D = { listo: false });
const col = (c) => new T.Color(c);

// ─── Mallas hechas a mano: muchos cuadrados y triángulos de colores en una sola pieza ───
class Malla {
  constructor() { this.p = []; this.c = []; }
  tri(a, b, c, color) { for (const v of [a, b, c]) { this.p.push(v[0], v[1], v[2]); this.c.push(color.r, color.g, color.b); } }
  quad(a, b, c, d, color) { this.tri(a, b, c, color); this.tri(a, c, d, color); }
  malla(mat) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.computeVertexNormals();
    return new T.Mesh(g, mat);
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
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = T.SRGBColorSpace;
  escena = new T.Scene();
  escena.background = col('#BFE3F2');
  escena.fog = new T.Fog('#CFE6EC', 1500, 4200);
  camara = new T.PerspectiveCamera(46, 1, 20, 7000);

  // luz: cielo y rebote del suelo, y un sol tibio de tarde que hace las sombras
  cielo = new T.HemisphereLight('#DCEFFF', '#8FA36B', 1.15);
  escena.add(cielo);
  sol = new T.DirectionalLight('#FFE9C4', 2.6);
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 1.5;
  Object.assign(sol.shadow.camera, { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 100, far: 4200 });
  escena.add(sol, sol.target);
  faro = new T.SpotLight('#FFF1C2', 0, 900, 0.5, 0.6, 1.2); // los faros, de noche
  escena.add(faro, faro.target);

  // ─── el suelo, las calles y las veredas ───
  const radio = M.vista * M.E * 1.6;
  const pasto = new T.Mesh(new T.CircleGeometry(radio, 64), new T.MeshStandardMaterial({ color: '#7DB957', roughness: 1 }));
  pasto.rotation.x = -Math.PI / 2; pasto.receiveShadow = true; escena.add(pasto);

  const suelo = new Malla(), GRIS = col('#77767A'), VEREDA = col('#D9D2C4'), BORDE = col('#A9A294'), RAYA = col('#F4F1E8');
  const lineas = [...M.tramos, ...M.vistas];
  for (const l of lineas) cinta(suelo, l.p, l.hw + 20, 3.2, BORDE);
  for (const l of lineas) cinta(suelo, l.p, l.hw + 17, 4, VEREDA);
  for (const r of M.redondeles) { disco(suelo, r.x, r.y, r.R + 20, 3.3, BORDE); disco(suelo, r.x, r.y, r.R + 17, 4.1, VEREDA); }
  // el parque y los otros verdes
  poligono(suelo, M.parque.p, 4.6, col('#8CCB5E'));
  for (const v of M.verdes) poligono(suelo, v.p, 1.2, col(v.campo ? '#A7B85A' : '#8CCB5E'));
  disco(suelo, M.parque.x, M.parque.y, M.parque.r * 0.5 + 16, 4.8, col('#E8C98D'));
  disco(suelo, M.parque.x, M.parque.y, M.parque.r * 0.5 - 16, 4.9, col('#8CCB5E'));
  disco(suelo, M.parque.x, M.parque.y, 70, 5, col('#EFE6D6'));
  const sueloM = suelo.malla(mate()); sueloM.receiveShadow = true; escena.add(sueloM);

  // la calzada va hundida entre las veredas (más abajo que ellas): se dibuja encima con un pelo de ventaja
  const calz = new Malla();
  for (const l of lineas) cinta(calz, l.p, l.hw, 4.6, GRIS);
  for (const r of M.redondeles) disco(calz, r.x, r.y, r.R, 4.7, GRIS);
  const calzM = calz.malla(mate({ roughness: 0.82 })); calzM.receiveShadow = true; escena.add(calzM);
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

  // ─── casas: paredes de colores, techo de teja a dos aguas, ventanas que de noche se encienden ───
  const casas = new Malla(), vent = new Malla(), VID = col('#6FA3C8'), ZOC = col('#8C7B6C');
  const pared = (a, b, y0, y1, color, conVentanas) => {
    casas.quad([a.x, y0, a.y], [b.x, y0, b.y], [b.x, y1, b.y], [a.x, y1, a.y], color);
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (!conVentanas || l < 44) return;
    // un pelo afuera de la pared, hacia donde mira
    const n = Math.floor(l / 44), dx = (b.x - a.x) / l, dy = (b.y - a.y) / l;
    for (const sg of [1, -1]) for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n * l, x = a.x + dx * t - dy * sg * 0.8, z = a.y + dy * t + dx * sg * 0.8;
      for (const [za, zb] of y1 - y0 > 64 ? [[0.22, 0.44], [0.6, 0.84]] : [[0.3, 0.72]]) {
        vent.quad([x - dx * 7, y0 + (y1 - y0) * za, z - dy * 7], [x + dx * 7, y0 + (y1 - y0) * za, z + dy * 7], [x + dx * 7, y0 + (y1 - y0) * zb, z + dy * 7], [x - dx * 7, y0 + (y1 - y0) * zb, z - dy * 7], VID);
      }
    }
  };
  for (const c of M.casas) {
    const [p0, p1, p2, p3] = c.p, P = col(c.pared), R = col(c.techo), R2 = col(c.techo).multiplyScalar(0.82), h = c.alto * 1.25 + 14, cumbre = h + 26;
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    for (const [a, b] of [[p0, p1], [p1, p2], [p2, p3], [p3, p0]]) { pared(a, b, 4, h, P, true); casas.quad([a.x, 4, a.y], [b.x, 4, b.y], [b.x, 12, b.y], [a.x, 12, a.y], ZOC); }
    const v = (q, y) => [q.x, y, q.y];
    // alero: el techo sale un poco de la pared
    const al = (q) => ({ x: c.x + (q.x - c.x) * 1.1, y: c.y + (q.y - c.y) * 1.1 });
    const [e0, e1, e2, e3] = [p0, p1, p2, p3].map(al);
    if (c.w >= c.h) {
      const r0 = mid(e3, e0), r1 = mid(e1, e2);
      casas.quad(v(e0, h - 2), v(e1, h - 2), v(r1, cumbre), v(r0, cumbre), R); casas.quad(v(r0, cumbre), v(r1, cumbre), v(e2, h - 2), v(e3, h - 2), R2);
      casas.tri(v(p3, h), v(p0, h), v(mid(p3, p0), cumbre - 2), P); casas.tri(v(p1, h), v(p2, h), v(mid(p1, p2), cumbre - 2), P);
    } else {
      const r0 = mid(e0, e1), r1 = mid(e2, e3);
      casas.quad(v(e1, h - 2), v(e2, h - 2), v(r1, cumbre), v(r0, cumbre), R); casas.quad(v(e3, h - 2), v(e0, h - 2), v(r0, cumbre), v(r1, cumbre), R2);
      casas.tri(v(p0, h), v(p1, h), v(mid(p0, p1), cumbre - 2), P); casas.tri(v(p2, h), v(p3, h), v(mid(p2, p3), cumbre - 2), P);
    }
  }
  for (const e of M.edificios) {
    const h = e.iglesia ? 150 : 90, P = col(e.pared), R = col(e.techo);
    for (let i = 0; i < e.p.length; i++) pared(e.p[i], e.p[(i + 1) % e.p.length], 4, h, P, !e.iglesia);
    poligono(casas, e.p, h, R);
    if (e.iglesia && e.grande > 30000) { // torre con su punta
      caja(casas, e.cx, e.cy, 0, 60, 60, h, h + 110, P);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, b = a + Math.PI / 2; casas.tri([e.cx + Math.cos(a) * 46, h + 110, e.cy + Math.sin(a) * 46], [e.cx + Math.cos(b) * 46, h + 110, e.cy + Math.sin(b) * 46], [e.cx, h + 190, e.cy], col('#B5543A')); }
    }
  }
  const casasM = casas.malla(mate({ roughness: 0.85 })); casasM.castShadow = casasM.receiveShadow = true; escena.add(casasM);
  ventanas = vent.malla(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.1, side: T.DoubleSide, emissive: '#FFD27A', emissiveIntensity: 0 }));
  escena.add(ventanas);

  // ─── árboles: tronco y dos copas, en instancias ───
  const arb = M.arboles.filter((a) => Math.hypot(a.x - M.ESTACION.x, a.y - M.ESTACION.y) > 420 || M.ESTACION.nx * (a.x - M.ESTACION.x) + M.ESTACION.ny * (a.y - M.ESTACION.y) > 170), tr = new T.InstancedMesh(new T.CylinderGeometry(4, 6, 1, 6), new T.MeshStandardMaterial({ color: '#7A5236', roughness: 1 }), arb.length);
  const copa = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), arb.length * 2);
  const O = new T.Object3D();
  arb.forEach((a, i) => {
    const h = a.alto + 24;
    O.position.set(a.x, h / 2, a.y); O.scale.set(1, h, 1); O.rotation.set(0, 0, 0); O.updateMatrix(); tr.setMatrixAt(i, O.matrix);
    O.position.set(a.x, h + a.r * 0.5, a.y); O.scale.set(a.r * 0.95, a.r * 0.9, a.r * 0.95); O.rotation.set(0, i, 0); O.updateMatrix(); copa.setMatrixAt(i * 2, O.matrix); copa.setColorAt(i * 2, col(a.c1));
    O.position.set(a.x - a.r * 0.25, h + a.r * 1.05, a.y - a.r * 0.2); O.scale.setScalar(a.r * 0.62); O.updateMatrix(); copa.setMatrixAt(i * 2 + 1, O.matrix); copa.setColorAt(i * 2 + 1, col(a.c2));
  });
  tr.castShadow = copa.castShadow = true; copa.receiveShadow = true; escena.add(tr, copa);

  // ─── lo de la calle: islas de los redondeles, kiosco, puestos, vallas, estación, banderines ───
  const cosas = new Malla();
  for (const r of M.redondeles) {
    for (let i = 0; i < 24; i++) { // bordillo de la isla
      const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2, p = (t) => [r.x + Math.cos(t) * r.isla, r.y + Math.sin(t) * r.isla];
      const [ax, az] = p(a), [bx, bz] = p(b);
      cosas.quad([ax, 4, az], [bx, 4, bz], [bx, 14, bz], [ax, 14, az], col('#C9886B'));
    }
    disco(cosas, r.x, r.y, r.isla, 14, col('#8CCB5E'));
    caja(cosas, r.x, r.y, 0.4, 30, 30, 14, 70, col('#C9C2B4')); caja(cosas, r.x, r.y, 0.4, 16, 16, 70, 110, col('#A9A294'));
    const flores = ['#E8458B', '#F2E14B', '#F6EBD3', '#D6382B', '#7E3592'];
    for (let n = 0; n < 14; n++) { const a = n / 14 * Math.PI * 2; caja(cosas, r.x + Math.cos(a) * (r.isla - 22), r.y + Math.sin(a) * (r.isla - 22), a, 12, 12, 14, 22, col(flores[n % 5])); }
  }
  { // kiosco del parque: base, columnas y techo azul en punta
    const x = M.parque.x, z = M.parque.y;
    disco(cosas, x, z, 62, 12, col('#EFE6D6'));
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4; caja(cosas, x + Math.cos(a) * 50, z + Math.sin(a) * 50, a, 6, 6, 12, 80, col('#FFFFFF')); }
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4 - Math.PI / 8, b = a + Math.PI / 4; cosas.tri([x + Math.cos(a) * 66, 80, z + Math.sin(a) * 66], [x + Math.cos(b) * 66, 80, z + Math.sin(b) * 66], [x, 130, z], col(n % 2 ? '#2F7FD0' : '#4C9BE6')); }
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

const brillo = (color, extra) => new T.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.05, ...extra }); // fibra de vidrio pintada
function ruedas(g, largo, ancho) {
  const geo = new T.CylinderGeometry(9, 9, 8, 14), mat = new T.MeshStandardMaterial({ color: '#1C1C1F', roughness: 0.9 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const r = new T.Mesh(geo, mat); r.rotation.x = Math.PI / 2; r.position.set(sx * largo * 0.28, 13, sz * (ancho / 2 + 1)); r.castShadow = true; g.add(r); }
}
function toldo(g, largo, ancho, colores, x = 0, alto = 62) {
  const t = new T.Mesh(new T.BoxGeometry(largo, 4, ancho), new T.MeshStandardMaterial({ map: tela(colores), roughness: 0.7, transparent: true, opacity: 0.5, depthWrite: false }));
  t.position.set(x, alto, 0); t.renderOrder = 2; g.add(t);
  const geo = new T.CylinderGeometry(1.4, 1.4, alto - 28, 6), mat = new T.MeshStandardMaterial({ color: '#F4F1E8', metalness: 0.4, roughness: 0.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new T.Mesh(geo, mat); p.position.set(x + sx * (largo / 2 - 4), 28 + (alto - 28) / 2, sz * (ancho / 2 - 4)); g.add(p); }
}
function cabeza() {
  const g = new T.Group(), C = M.C;
  const cuerpo = new T.Mesh(new T.SphereGeometry(1, 28, 18), brillo('#8BD43B')); cuerpo.scale.set(C.cabezaL / 2, 19, C.cabezaA / 2); cuerpo.position.y = 26; cuerpo.castShadow = true;
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
  const tina = new T.Mesh(new T.CapsuleGeometry(C.vagonA / 2 - 3, C.vagonL - C.vagonA, 6, 18), brillo(v.pal.cuerpo)); tina.rotation.z = Math.PI / 2; tina.scale.set(0.5, 1, 1); tina.position.y = 25;
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
  sol.color.set(noche ? '#9FB4FF' : '#FFE9C4'); sol.intensity = noche ? 1.1 : 2.6;
  cielo.intensity = noche ? 0.75 : 1.15; cielo.color.set(noche ? '#7C8FD6' : '#DCEFFF');
  escena.background.set(noche ? '#141C3A' : '#BFE3F2'); escena.fog.color.set(noche ? '#1A2244' : '#CFE6EC');
  ventanas.material.emissiveIntensity = noche ? 2.4 : 0;
  sol.target.position.set(k.x, 0, k.y); sol.position.set(k.x - 900, 1500, k.y - 1100);
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
