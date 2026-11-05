/* El gusanito · prototipo arcade
   Vista desde arriba. La cabeza la manejas tú; cada vagón cuelga del de
   adelante con una barra rígida y sus llantas agarran poco de costado, así
   que cuando el chofer zigzaguea el cuerpo se mece y la cola da latigazos.
   Ese deslizamiento lateral es la diversión de los pasajeros… y su miedo. */
(() => {
  'use strict';

  // ─── Ajustes: todo lo que se calibra está aquí ──────────────────────
  const C = {
    // el pueblo es Pujilí de verdad (mapas/pujili.js): px por metro del mapa, y px de calzada por metro de ancho
    // de la calle (más ancha que la real, para que quepa el zigzag), con un mínimo
    escala: 11, anchoCalle: 26, calleMin: 150,
    bordillo: 6,                                       // cuánto se sube a la vereda antes de topar (px)
    redondel: 200, isla: 80, separaRedondel: 1900,     // radio de la calzada del redondel y de su isla; uno por barrio
    acel: 260, freno: 560,                             // la cabeza (la velocidad máxima va por nivel)
    giro: 2.5, giroSuave: 9,
    cabezaL: 78, cabezaA: 46,
    vagonL: 58, vagonA: 44,
    // la cabeza es un carro: gira según el ángulo de las llantas y la distancia entre ejes (radio mínimo),
    // y a mucha velocidad lo limita el agarre. Quieto no gira; en reversa gira al revés.
    ejes: 50, volanteMax: 0.6, agarreCab: 800, reversa: 45,
    // cada vagón es un remolque de dos ejes: la lanza tira del eje delantero, que gira con ella
    lanza: 22, giroEje: 0.7,
    agarre: 6,              // cuánto frenan las llantas el deslizamiento lateral (1/s)
    inercia: 0.975,         // cuánto impulso conserva el eje de atrás de cada vagón: más, la cola se desboca antes
    dobla: 1.1,             // cuánto puede doblar el enganche entre la lanza y el de adelante (rad)
    vagonesMax: Infinity,   // sin tope: lo que limita el largo es que la cola se parte
    asientos: 4,
    aguanta: 1450,          // sacudida (la que siente la gente) que la barra aguanta sin cansarse
    fatiga: 0.6,            // qué tan rápido se cansa cuando la sacudida pasa de lo que aguanta (por segundo, por exceso)
    recupera: 0.25,         // qué tan rápido se recupera una barra que no está forzada

    // empujón de costado que siente el pasajero (px/s²); el miedo y las caídas van por nivel
    divDesde: 120,          // desde aquí ya es divertido
    divLleno: 650,          // desde aquí la diversión ya no sube más rápido
    ritmoDiv: 0.2,          // qué tan rápido se llena la diversión con meneo fuerte (por segundo)
    vidas: 3,               // golpes de frente (vereda, puestos, vallas, islas) que aguanta el gusanito
    minDiv: 0.75,           // diversión mínima del grupo al llegar: si no llega, piden devuelto
    ventana: 12,            // en los últimos segundos de la vuelta ya se pueden bajar (antes, solo al 100 %)
    combustible: 4,         // vueltas que da un tanque lleno
    vuelta: 60,             // segundos de cada vuelta; siempre el mismo tiempo, tenga el largo que tenga
    filaMax: 30,            // cuánta gente cabe en la fila de la estación
    camGiro: 3.5,           // qué tan rápido gira la cámara para seguir a la cabeza (1/s)
    // acelerador: sin pisarlo el gusanito va a su velocidad normal; pisándolo, la máxima sube (× C.turbo) y
    // acelera más fuerte (× C.turboAcel). Sin límite: el riesgo es lo que cuesta
    turbo: 1.3, turboAcel: 1.8,
    // mareo: cada giro completo de la cabeza para el mismo lado (en un redondel o donde sea; el zigzag no suma)
    // cuenta. Desde el giro C.mareoDesde se marean: cada giro más les baja C.mareo de diversión, y mientras
    // están mareados ya nada los divierte. Se les pasa si pasan C.mareoOlvida s sin otro giro completo.
    mareoDesde: 3, mareo: 0.2, mareoOlvida: 10,
    minVuelta: 30,          // aunque lleguen al 100 %, no se bajan antes de estos segundos de vuelta
  };

  // ─── El gusanito crece con la plata, y con cada vagón el juego se pone más bravo ─
  // ganado: plata juntada para enganchar ese vagón · vMax: velocidad máxima · asist: ayuda al manejar (1 = toda, 0 = nada)
  // ritmo: qué tan rápido se divierten · miedo / caida: empujón desde el que se asustan / salen volando
  // danzantes, perros: cuántos hay en el pueblo
  const NIVELES = [
    { vagones: 2, ganado: 0,   vMax: 230, asist: 1,    ritmo: 1.1,  miedo: 1030, caida: Infinity, danzantes: 0, perros: 3 },
    { vagones: 3, ganado: 8,   vMax: 250, asist: 0.8,  ritmo: 1.0,  miedo: 940,  caida: 1260, danzantes: 1, perros: 4 },
    { vagones: 4, ganado: 20,  vMax: 265, asist: 0.6,  ritmo: 0.95, miedo: 860,  caida: 1130, danzantes: 2, perros: 5 },
    { vagones: 5, ganado: 35,  vMax: 285, asist: 0.45, ritmo: 0.9,  miedo: 800,  caida: 1035, danzantes: 3, perros: 6 },
    { vagones: 6, ganado: 55,  vMax: 300, asist: 0.3,  ritmo: 0.85, miedo: 770,  caida: 990,  danzantes: 4, perros: 7 },
    { vagones: 7, ganado: 80,  vMax: 315, asist: 0.15, ritmo: 0.8,  miedo: 750,  caida: 945,  danzantes: 5, perros: 8 },
    { vagones: 8, ganado: 110, vMax: 325, asist: 0,    ritmo: 0.8,  miedo: 725,  caida: 920,  danzantes: 6, perros: 8 },
  ];
  const nivelDe = (vagones) => NIVELES[clamp(vagones - 2, 0, NIVELES.length - 1)];
  // plata juntada que hace falta para el vagón número n (la tabla llega hasta 8; después cada uno cuesta $40 más)
  const precioVagon = (n) => (n <= 8 ? NIVELES[Math.max(0, n - 2)].ganado : 110 + (n - 8) * 40);
  const aguanta = () => C.aguanta * (1 + 0.3 * S.barras);

  const PALETAS = [
    { cuerpo: '#8BD43B', borde: '#E8458B', toldo: ['#F2B33D', '#E8458B', '#5FB4E6', '#8BD43B'] },
    { cuerpo: '#E8458B', borde: '#F2E14B', toldo: ['#7E3592', '#F2E14B', '#E8458B', '#5FB4E6'] },
    { cuerpo: '#4FC9C2', borde: '#7E3592', toldo: ['#E8458B', '#8BD43B', '#F2B33D', '#7E3592'] },
    { cuerpo: '#B46DE0', borde: '#F2B33D', toldo: ['#F2E14B', '#4FC9C2', '#E8458B', '#F2B33D'] },
  ];
  const ROPA = ['#D6382B', '#1B5FAA', '#F2B33D', '#2F7D4A', '#7E3592', '#E8458B', '#F6EBD3', '#24150F'];
  const PELO = ['#24150F', '#3B2416', '#5A3A22', '#111', '#8A5A2B'];
  const PIEL = ['#B97D55', '#C48A60', '#A86B45', '#D19C73'];
  const FRASES_DIV = ['¡Uiii!', '¡Más, más!', '¡Qué chévere!', '¡Bacán!', '¡Otra vuelta!', '¡Jajaja!'];
  const FRASES_MIEDO = ['¡Despacio!', '¡Ayayay!', '¡Mi sombrero!', '¡Cuidado, mijo!'];

  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const lienzo = $('#pueblo');
  const avisos = $('#avisos');
  const ctx = lienzo.getContext('2d');

  // Aleatorio con semilla para que el pueblo sea siempre el mismo
  let semilla = 7;
  const rnd = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const azar = (a, b) => a + Math.random() * (b - a);
  const elige = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const plata = (n) => (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2).replace('.', ',');

  // ─── El pueblo: las calles de verdad ───────────────────────────────
  // Pujilí sacado de OpenStreetMap (mapas/pujili.js, lo escribe tools/mapa.py): metros con x al este y z al sur,
  // desde el Parque Central. Aquí pasa a px con C.escala; el ancho de cada calle va aparte (C.anchoCalle), más
  // ancho que el real para que quepa el zigzag. Solo se maneja por las calles del radio de juego: donde salen de
  // él hay una valla, y la calle sigue de adorno, con sus casas, hasta donde alcanza la vista. Así el pueblo
  // parece no acabarse.
  const MAPA = (window.MAPAS || {}).pujili;
  const E = C.escala;
  const aPx = ([x, z]) => ({ x: x * E, y: z * E });
  const hwDe = (w) => Math.max(C.calleMin, w * C.anchoCalle) / 2; // media calzada
  const caja = (pts, m) => {
    const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
    const x0 = Math.min(...xs) - m, y0 = Math.min(...ys) - m;
    return { x: x0, y: y0, w: Math.max(...xs) + m - x0, h: Math.max(...ys) + m - y0 };
  };
  const centro = (pts) => ({ x: pts.reduce((a, q) => a + q.x, 0) / pts.length, y: pts.reduce((a, q) => a + q.y, 0) / pts.length });
  function enPoligono(x, y, poli) {
    let si = false;
    for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
      const a = poli[i], b = poli[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) si = !si;
    }
    return si;
  }
  // una calle (de juego o de adorno): sus puntos, el largo acumulado y su caja
  function linea(p, w) {
    const pts = p.map(aPx), acum = [0], hw = hwDe(w);
    for (let n = 1; n < pts.length; n++) acum.push(acum[n - 1] + Math.hypot(pts[n].x - pts[n - 1].x, pts[n].y - pts[n - 1].y));
    return { p: pts, acum, L: acum[acum.length - 1], hw, w, caja: caja(pts, hw + 20) };
  }
  // el punto que está a s px del comienzo del tramo, con la dirección de la calle ahí
  function enTramo(t, s) {
    s = clamp(s, 0, t.L);
    let n = 1;
    while (n < t.p.length - 1 && t.acum[n] < s) n++;
    const a = t.p[n - 1], b = t.p[n], l = t.acum[n] - t.acum[n - 1] || 1, f = (s - t.acum[n - 1]) / l;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, ux: (b.x - a.x) / l, uy: (b.y - a.y) / l };
  }
  const nodos = {};
  for (const [id, p] of Object.entries(MAPA.nodos)) nodos[id] = { id, ...aPx(p), tramos: [] };
  // tramos: de cruce a cruce (o hasta la valla del borde)
  const tramos = MAPA.calles.map((c, i) => {
    const t = { i, ...linea(c.p, c.w), a: nodos[c.a], b: nodos[c.b], tipo: c.t, nombre: c.n || null };
    t.salida = t.a.id[0] === 's' || t.b.id[0] === 's';
    t.a.tramos.push(t); t.b.tramos.push(t);
    return t;
  });
  const vistas = MAPA.vistas.map((c) => linea(c.p, c.w)); // las de afuera: solo se ven

  // Rejilla para encontrar rápido lo que hay cerca de un punto: pedazos de calle, redondeles y lo que tapa
  const CELDA = 160, MARGEN = 150;
  const rejilla = new Map();
  const llave = (i, j) => (i + 4096) * 8192 + (j + 4096);
  function celdas(x0, y0, x1, y1, f) {
    for (let i = Math.floor(x0 / CELDA); i <= Math.floor(x1 / CELDA); i++) {
      for (let j = Math.floor(y0 / CELDA); j <= Math.floor(y1 / CELDA); j++) {
        const k = llave(i, j);
        let c = rejilla.get(k);
        if (!c) rejilla.set(k, (c = { segs: [], disco: [], sol: [] }));
        f(c);
      }
    }
  }
  const celdaDe = (x, y) => rejilla.get(llave(Math.floor(x / CELDA), Math.floor(y / CELDA)));
  // cápsula: un segmento con grosor (las calles, las vallas, los puestos, las islas)
  function capsula(ax, ay, bx, by, r, extra) {
    const o = { ax, ay, dx: bx - ax, dy: by - ay, r, ...extra };
    o.l2 = o.dx * o.dx + o.dy * o.dy || 1e-6;
    return o;
  }
  function distCapsula(o, x, y) {
    const t = clamp(((x - o.ax) * o.dx + (y - o.ay) * o.dy) / o.l2, 0, 1);
    return Math.hypot(x - o.ax - o.dx * t, y - o.ay - o.dy * t) - o.r;
  }
  function ponerCalle(l, maneja) {
    for (let n = 1; n < l.p.length; n++) {
      const a = l.p[n - 1], b = l.p[n], m = l.hw + C.bordillo + MARGEN;
      const s = capsula(a.x, a.y, b.x, b.y, l.hw, { maneja, linea: l, s0: l.acum[n - 1] });
      celdas(Math.min(a.x, b.x) - m, Math.min(a.y, b.y) - m, Math.max(a.x, b.x) + m, Math.max(a.y, b.y) + m, (c) => c.segs.push(s));
    }
  }
  function ponerSolido(o) {
    const m = o.r + MARGEN, bx = o.ax + o.dx, by = o.ay + o.dy;
    celdas(Math.min(o.ax, bx) - m, Math.min(o.ay, by) - m, Math.max(o.ax, bx) + m, Math.max(o.ay, by) + m, (c) => c.sol.push(o));
  }
  for (const t of tramos) ponerCalle(t, true);
  for (const v of vistas) ponerCalle(v, false);
  // ¿cae a menos de m del borde de alguna calle (de juego o de adorno) o de un redondel?
  function enCalle(x, y, m) {
    const c = celdaDe(x, y);
    if (!c) return false;
    for (const s of c.segs) if (distCapsula(s, x, y) < m) return true;
    for (const r of c.disco) if (Math.hypot(x - r.x, y - r.y) < r.R + m) return true;
    return false;
  }
  // El pedazo de calle de juego más cercano (si se da ang, solo los que van más o menos para ese lado)
  function calleCerca(x, y, ang) {
    const c = celdaDe(x, y);
    if (!c) return null;
    let mejor = null, md = Infinity;
    for (const s of c.segs) {
      if (!s.maneja) continue;
      const l = Math.sqrt(s.l2), ux = s.dx / l, uy = s.dy / l;
      if (ang !== undefined && Math.abs(ux * Math.cos(ang) + uy * Math.sin(ang)) < 0.7) continue;
      const t = clamp(((x - s.ax) * s.dx + (y - s.ay) * s.dy) / s.l2, 0, 1);
      const qx = s.ax + s.dx * t, qy = s.ay + s.dy * t, d = Math.hypot(x - qx, y - qy);
      if (d < md) { md = d; mejor = { x: qx, y: qy, ux, uy, d, tramo: s.linea, s: s.s0 + t * l }; }
    }
    return mejor;
  }

  // El parque de la estación
  const parque = { n: 'Parque Central', p: MAPA.parque.p.map(aPx) };
  Object.assign(parque, centro(parque.p), { caja: caja(parque.p, 20) });
  parque.r = parque.p.reduce((a, q) => a + Math.hypot(q.x - parque.x, q.y - parque.y), 0) / parque.p.length;
  const enParque = (x, y) => enPoligono(x, y, parque.p);
  // La estación: en la calle recta más larga que bordea el parque, con el parque a la derecha (se sube por la vereda)
  const tramoEstacion = (() => {
    let mejor = null;
    for (const t of tramos) {
      const m = enTramo(t, t.L / 2);
      const recto = Math.hypot(t.p[t.p.length - 1].x - t.p[0].x, t.p[t.p.length - 1].y - t.p[0].y) / t.L > 0.98;
      if (!recto || t.L < 600 || t.salida || Math.hypot(m.x - parque.x, m.y - parque.y) > parque.r + t.hw + 200) continue;
      if (!mejor || t.L > mejor.L) mejor = t;
    }
    return mejor || tramos.reduce((a, t) => (t.L > a.L ? t : a));
  })();
  const tocaEstacion = (t) => t.a === tramoEstacion.a || t.a === tramoEstacion.b || t.b === tramoEstacion.a || t.b === tramoEstacion.b;
  const ESTACION = (() => {
    const t = tramoEstacion, m = enTramo(t, t.L / 2);
    let ux = m.ux, uy = m.uy;
    if (-uy * (parque.x - m.x) + ux * (parque.y - m.y) < 0) { ux = -ux; uy = -uy; } // que el parque quede a la derecha
    const nx = -uy, ny = ux; // de la calle hacia el parque
    return { x: m.x + nx * (t.hw - 40), y: m.y + ny * (t.hw - 40), ang: Math.atan2(uy, ux), ux, uy, nx, ny };
  })();

  // Redondeles: en cruces de cuatro calles, lejos de la estación y uno por barrio (C.separaRedondel entre ellos)
  const redondeles = [];
  {
    const cands = Object.values(nodos).filter((n) => n.tramos.length >= 4 && n.id[0] !== 's' && n.tramos.every((t) => t.L >= 520)
      && Math.hypot(n.x - ESTACION.x, n.y - ESTACION.y) > 1000);
    cands.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)); // de adentro hacia afuera
    for (const n of cands) {
      if (redondeles.some((r) => Math.hypot(r.x - n.x, r.y - n.y) < C.separaRedondel)) continue;
      const r = { x: n.x, y: n.y, R: C.redondel, isla: C.isla, nodo: n };
      redondeles.push(r); n.redondel = r;
      const m = r.R + C.bordillo + MARGEN;
      celdas(r.x - m, r.y - m, r.x + m, r.y + m, (c) => c.disco.push(r));
      ponerSolido(capsula(r.x, r.y, r.x, r.y, r.isla));
    }
  }
  const enRedondel = (x, y, m = 0) => redondeles.some((r) => Math.hypot(x - r.x, y - r.y) < r.R + m);

  // Lugares con nombre: los mercados tienen feria en la calle, y algunos se rotulan en el piso
  const MERCADOS = MAPA.lugares.filter(([, , n]) => /mercado/i.test(n)).map(([x, z, n]) => ({ ...aPx([x, z]), n }));
  const NOMBRES = { 'Iglesia Católica Matriz de Pujilí': 'Iglesia Matriz', 'Mercado Cerrado Comidas': 'Mercado de comidas' };
  const rotulos = [{ x: parque.x, y: parque.y - parque.r * 0.62, t: 'Parque Central' }].concat(MAPA.lugares
    .filter(([, , n]) => n !== 'Mercado' && /mercado|toros|matriz de|danzante/i.test(n))
    .map(([x, z, n]) => ({ ...aPx([x, z]), t: NOMBRES[n] || n })));
  // nombres de las calles, en la vereda a media cuadra (la de la estación ya tiene su boletería)
  const letreros = [];
  for (const t of tramos) {
    if (!t.nombre || t.L < 600 || t === tramoEstacion) continue;
    const m = enTramo(t, t.L / 2), lado = t.i % 2 ? 1 : -1;
    letreros.push({ x: m.x - m.uy * lado * (t.hw + 34), y: m.y + m.ux * lado * (t.hw + 34), t: t.nombre });
  }

  // Calles angostas: puestos de la feria pegados a una vereda (o a las dos), en las calles de los mercados
  const puestos = [];
  {
    const libres = tramos.filter((t) => t !== tramoEstacion && !tocaEstacion(t) && !t.salida && t.L >= 500 && !t.a.redondel && !t.b.redondel);
    const dm = (t) => { const m = enTramo(t, t.L / 2); return Math.min(...MERCADOS.map((q) => Math.hypot(q.x - m.x, q.y - m.y))); };
    const feria = libres.filter((t) => dm(t) < 1300).sort((a, b) => dm(a) - dm(b)).slice(0, 10);
    feria.forEach((t, n) => {
      t.angosta = true;
      const lados = n % 3 === 0 ? [-1, 1] : [rnd() < 0.5 ? -1 : 1];
      const hondo = lados.length > 1 ? clamp(t.hw - 55, 30, 55) : 55;
      for (const lado of lados) {
        for (let k = 1; k < t.p.length; k++) { // un puesto por cada pedazo recto del tramo
          const s0 = Math.max(t.acum[k - 1], 90), s1 = Math.min(t.acum[k], t.L - 90);
          if (s1 - s0 < 120) continue;
          const a = enTramo(t, s0), nx = -a.uy * lado, ny = a.ux * lado, off = t.hw - hondo / 2, r = hondo / 2;
          const ax = a.x + nx * off, ay = a.y + ny * off, bx = ax + a.ux * (s1 - s0), by = ay + a.uy * (s1 - s0);
          puestos.push({ x: ax, y: ay, ang: Math.atan2(a.uy, a.ux), largo: s1 - s0, hondo, lado, caja: caja([{ x: ax, y: ay }, { x: bx, y: by }], hondo + 20) });
          ponerSolido(capsula(ax + a.ux * r, ay + a.uy * r, bx - a.ux * r, by - a.uy * r, r));
        }
      }
    });
  }
  // Vallas del borde: donde una calle sale del radio de juego
  const vallas = [];
  for (const t of tramos) {
    for (const fin of ['a', 'b']) {
      if (t[fin].id[0] !== 's') continue;
      const n = t.p.length, p = fin === 'b' ? t.p[n - 1] : t.p[0], q = fin === 'b' ? t.p[n - 2] : t.p[1];
      const l = Math.hypot(p.x - q.x, p.y - q.y) || 1, ux = (p.x - q.x) / l, uy = (p.y - q.y) / l; // hacia afuera
      const x = p.x - ux * 14, y = p.y - uy * 14, nx = -uy, ny = ux, m = t.hw + 26;
      const v = capsula(x - nx * m, y - ny * m, x + nx * m, y + ny * m, 13, { x, y, ang: Math.atan2(ny, nx), largo: 2 * m, ux, uy });
      vallas.push(v); ponerSolido(v);
    }
  }
  let cierres = []; // calles cerradas de esta vuelta (cambian cada vez que sales)

  // Casas: las de OpenStreetMap y, donde no hay, casitas de teja a lo largo de cada calle (también las de afuera)
  const TEJAS = ['#B5543A', '#C96A43', '#A9472F', '#D07A4E'];
  const edificios = MAPA.edificios.map((e) => {
    const p = e.p.map(aPx);
    return { p, iglesia: e.tipo === 'iglesia', n: e.n, teja: TEJAS[(rnd() * 4) | 0], caja: caja(p, 4), ...centro(p) };
  });
  const verdes = MAPA.verdes.map((v) => ({ p: v.p.map(aPx), campo: v.t === 'campo', caja: caja(v.p.map(aPx), 4) }));
  const OCUPA = 30, ocupado = new Set();
  const llaveO = (x, y) => llave(Math.floor(x / OCUPA), Math.floor(y / OCUPA));
  for (const zona of [...edificios, ...verdes, parque]) {
    const b = zona.caja;
    for (let x = b.x; x <= b.x + b.w; x += OCUPA / 2) for (let y = b.y; y <= b.y + b.h; y += OCUPA / 2) if (enPoligono(x, y, zona.p)) ocupado.add(llaveO(x, y));
  }
  const casas = [];
  for (const l of [...tramos, ...vistas]) {
    for (const lado of [-1, 1]) {
      for (let k = 1; k < l.p.length; k++) {
        const a = l.p[k - 1], b = l.p[k], largo = Math.hypot(b.x - a.x, b.y - a.y);
        if (largo < 60) continue;
        const ux = (b.x - a.x) / largo, uy = (b.y - a.y) / largo, nx = -uy * lado, ny = ux * lado;
        for (let s = rnd() * 30; s < largo - 40;) {
          const w = 70 + rnd() * 70, h = 80 + rnd() * 60, off = l.hw + 18 + h / 2;
          const c = { x: a.x + ux * (s + w / 2) + nx * off, y: a.y + uy * (s + w / 2) + ny * off, ang: Math.atan2(uy, ux), w, h, teja: TEJAS[(rnd() * 4) | 0], horiz: rnd() < 0.5 };
          let cabe = true;
          for (let i = -2; i <= 2 && cabe; i++) {
            for (let j = -2; j <= 2 && cabe; j++) {
              const px = c.x + ux * w * i / 4.4 + nx * h * j / 4.4, py = c.y + uy * w * i / 4.4 + ny * h * j / 4.4;
              if (ocupado.has(llaveO(px, py)) || enCalle(px, py, 12)) cabe = false;
            }
          }
          if (cabe) {
            casas.push(c);
            c.r = Math.hypot(w, h) / 2;
            for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) ocupado.add(llaveO(c.x + ux * w * i / 4.4 + nx * h * j / 4.4, c.y + uy * w * i / 4.4 + ny * h * j / 4.4));
          }
          s += w + 4 + rnd() * 10;
        }
      }
    }
  }
  // Árboles en los patios del medio de las cuadras, y en el parque
  const arboles = [];
  for (let n = 0; n < 2600; n++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * MAPA.vista * E, x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (ocupado.has(llaveO(x, y)) || enCalle(x, y, 40)) continue;
    arboles.push({ x, y, r: 20 + rnd() * 12 });
    ocupado.add(llaveO(x, y));
  }
  parque.arboles = [];
  for (let k = 0; k < parque.p.length; k++) {
    const a = parque.p[k], b = parque.p[(k + 1) % parque.p.length], l = Math.hypot(b.x - a.x, b.y - a.y);
    for (let s = 40; s < l - 40; s += 120) {
      const x = a.x + (b.x - a.x) * s / l, y = a.y + (b.y - a.y) * s / l, d = Math.hypot(parque.x - x, parque.y - y) || 1;
      parque.arboles.push({ x: x + (parque.x - x) / d * 60, y: y + (parque.y - y) / d * 60, r: 28 });
    }
  }
  for (const v of verdes) {
    if (v.campo) continue;
    v.arboles = [];
    for (let n = 0; n < 60; n++) {
      const x = v.caja.x + rnd() * v.caja.w, y = v.caja.y + rnd() * v.caja.h;
      if (enPoligono(x, y, v.p) && !enCalle(x, y, 30)) v.arboles.push({ x, y, r: 22 + rnd() * 12 });
    }
  }

  // Banderines: cruzan las calles, más cerca de la fiesta (el parque)
  const banderines = [];
  for (let k = 0; k < 70; k++) {
    const t = tramos[(rnd() * tramos.length) | 0];
    if (t.L < 300) continue;
    const s = 120 + rnd() * (t.L - 240), m = enTramo(t, s);
    if (Math.hypot(m.x - parque.x, m.y - parque.y) > 2400 && rnd() < 0.7) continue;
    const nx = -m.uy, ny = m.ux, l = t.hw + 10, sesgo = (rnd() - 0.5) * 40;
    banderines.push({ x1: m.x - nx * l, y1: m.y - ny * l, x2: m.x + nx * l + m.ux * sesgo, y2: m.y + ny * l + m.uy * sesgo });
  }

  // ─── Estado ────────────────────────────────────────────────────────
  let S; // estado de la vuelta
  const entrada = { izq: false, der: false, freno: false, turbo: false }; // lo que usa el chofer; se arma cada cuadro
  const teclado = { izq: false, der: false, freno: false, turbo: false };
  const toques = new Map(); // dedo → 'izq' | 'der': media pantalla izquierda gira a la izquierda, la otra a la derecha
  let botonFreno = false, botonTurbo = false;
  const tactil = matchMedia('(pointer: coarse)').matches;
  function armarEntrada() {
    let ti = false, td = false;
    for (const lado of toques.values()) { if (lado === 'izq') ti = true; else td = true; }
    const dosLados = ti && td; // los dos lados a la vez: frena
    entrada.izq = teclado.izq || (ti && !dosLados);
    entrada.der = teclado.der || (td && !dosLados);
    entrada.freno = teclado.freno || botonFreno || dosLados;
    entrada.turbo = teclado.turbo || botonTurbo;
  }

  function nuevoPasajero() {
    return {
      ropa: elige(ROPA), pelo: elige(PELO), piel: elige(PIEL),
      sombrero: Math.random() < 0.3 ? elige(['#F6EBD3', '#24150F', '#D6382B']) : null,
      div: 0, miedo: 0, feliz: false, asustado: false, t: Math.random() * 10,
    };
  }

  function nuevoVagon(x, y, ang, k) {
    const ex = Math.cos(ang) * C.vagonL * 0.28, ey = Math.sin(ang) * C.vagonL * 0.28; // medio paso entre ejes
    return {
      x, y, vx: 0, vy: 0, ang, lat: 0, gir: 0, g: 0, fatiga: 0,
      fx: x + ex, fy: y + ey, rx: x - ex, ry: y - ey, rvx: 0, rvy: 0, lz: ang, // eje delantero, eje trasero, lanza
      pal: PALETAS[(k + 1) % PALETAS.length],
      asientos: new Array(C.asientos).fill(null),
      golpe: 0,
    };
  }

  function reiniciar() {
    // estacionado en la estación del parque, con el parque a la derecha
    const x0 = ESTACION.x + ESTACION.ux * 70 - ESTACION.nx * 16, y0 = ESTACION.y + ESTACION.uy * 70 - ESTACION.ny * 16;
    cierres = [];
    S = {
      plata: 0, viajes: 0, felices: 0, asustados: 0, caidos: 0, choques: 0, seFueron: 0, devueltos: 0,
      vidas: C.vidas, confianza: 100, viajeT: 0, motivo: null, pico: 2, rompiendo: 0,
      decidiendo: false, listos: false, comb: C.combustible, ronda: null, vueltasRedondel: 0, total: 0, barras: 0, parlante: false, luces: false, noche: false,
      corriendo: false, fin: false,
      cab: { x: x0, y: y0, ang: ESTACION.ang, v: 0, giro: 0, golpe: 0, enfriar: 0 },
      vagones: [], caminantes: [], volando: [], textos: [], chispas: [], anuncios: [], seVan: [],
      cam: { x: x0, y: y0, ang: ESTACION.ang }, parando: 0, avisoT: 0, sustoT: 0, ladridoT: 0,
      dif: nivelDe(2),
      // vuelta: segundos que le quedan a la vuelta con los pasajeros (null = no hay vuelta en curso)
      vuelta: null, avisos: {}, primera: true,
      est: { carga: 0, t: 0, llegaT: 0, fila: [] },
      turbo: { activo: false, antes: false, humo: 0 }, giros: 0, giroAcc: 0, giroT: 0,
    };
    for (let k = 0; k < S.dif.vagones; k++) agregarVagon();
    for (let k = 0; k < 12; k++) S.est.fila.push(nuevoPasajero());
    ajustarCaminantes();
    actualizarHud(true);
  }

  function agregarVagon() {
    const n = S.vagones.length;
    const prev = n ? S.vagones[n - 1] : null;
    const ang = prev ? prev.ang : S.cab.ang;
    const ref = prev
      ? { x: prev.x - Math.cos(ang) * C.vagonL / 2, y: prev.y - Math.sin(ang) * C.vagonL / 2 }
      : { x: S.cab.x - Math.cos(ang) * C.cabezaL / 2, y: S.cab.y - Math.sin(ang) * C.cabezaL / 2 };
    const d = C.lanza + C.vagonL * 0.28; // del enganche al centro del vagón
    S.vagones.push(nuevoVagon(ref.x - Math.cos(ang) * d, ref.y - Math.sin(ang) * d, ang, n));
  }

  function ajustarCaminantes() {
    for (const tipo of ['danzante', 'perro']) {
      const quiere = tipo === 'perro' ? S.dif.perros : S.dif.danzantes;
      let hay = S.caminantes.filter((c) => c.tipo === tipo).length;
      for (let intento = 0; hay < quiere && intento < 200; intento++) {
        const c = nuevoCaminante(tipo);
        if (Math.hypot(c.x - S.cab.x, c.y - S.cab.y) < 600) continue;
        S.caminantes.push(c); hay++;
      }
    }
  }

  // Caminantes: los danzantes bailan por el medio de las calles de la fiesta (cerca del parque y la Matriz),
  // de cruce en cruce; los perros pasean pegados a la vereda
  const LARGO_TOTAL = tramos.reduce((a, t) => a + t.L, 0);
  const FIESTA = new Set(tramos.filter((t) => !t.salida && Math.hypot(enTramo(t, t.L / 2).x - parque.x, enTramo(t, t.L / 2).y - parque.y) < 2200));
  function tramoAzar() { // más probable mientras más largo
    let s = Math.random() * LARGO_TOTAL;
    for (const t of tramos) { s -= t.L; if (s <= 0) return t; }
    return tramos[tramos.length - 1];
  }
  function nuevoCaminante(tipo) {
    if (tipo === 'perro') {
      const t = tramoAzar(), m = enTramo(t, Math.random() * t.L), off = (Math.random() < 0.5 ? -1 : 1) * (t.hw - azar(14, 34));
      const c = { tipo, x: m.x - m.uy * off, y: m.y + m.ux * off, ang: azar(-3, 3), t: Math.random() * 9,
        v: azar(55, 80), modo: 'pasea', tm: 0, ruta: [], parado: 0, ladra: 0, enfriar: azar(0, 4), lado: 1 };
      c.px = c.x; c.py = c.y;
      rutaPerro(c);
      return c;
    }
    const tr = elige([...FIESTA]);
    const c = { tipo, tr, s: Math.random() * tr.L, dir: Math.random() < 0.5 ? -1 : 1, off: (Math.random() < 0.5 ? -1 : 1) * azar(10, 50), v: azar(22, 32), t: Math.random() * 9, parado: 0 };
    const m = enTramo(tr, c.s);
    c.x = m.x; c.y = m.y;
    return c;
  }
  // Un perro pasea por la vereda de la calle en la que está: un trecho para un lado o para el otro
  function rutaPerro(c) {
    const q = calleCerca(c.x, c.y);
    if (!q) { c.ruta = []; return; }
    const t = q.tramo, off = (Math.random() < 0.5 ? -1 : 1) * (t.hw - azar(14, 34));
    const p1 = enTramo(t, q.s), p2 = enTramo(t, clamp(q.s + (Math.random() < 0.5 ? -1 : 1) * azar(80, 260), 0, t.L));
    c.ruta = [{ x: p1.x - p1.uy * off, y: p1.y + p1.ux * off }, { x: p2.x - p2.uy * off, y: p2.y + p2.ux * off }];
  }
  // al llegar al cruce, el danzante sigue por otra calle (de preferencia una de la fiesta; nunca hacia el borde)
  function siguienteTramo(c) {
    const nodo = c.s >= c.tr.L ? c.tr.b : c.tr.a;
    const ops = nodo.tramos.filter((t) => t !== c.tr && !t.salida), fiesta = ops.filter((t) => FIESTA.has(t));
    const sig = fiesta.length ? elige(fiesta) : ops.length ? elige(ops) : c.tr;
    if (sig === c.tr) { c.dir = -c.dir; c.s = clamp(c.s, 0, c.tr.L); return; }
    c.tr = sig; c.dir = sig.a === nodo ? 1 : -1; c.s = c.dir > 0 ? 0 : sig.L;
  }

  // ─── Física ────────────────────────────────────────────────────────
  // Lo libre es la calzada de las calles de juego y de los redondeles; todo lo demás es sólido. sdMundo da la
  // distancia con signo al borde (positiva en la calle, negativa afuera): se le restan las islas de los
  // redondeles, los puestos, las vallas del borde y las calles cerradas.
  function sdMundo(x, y) {
    const c = celdaDe(x, y);
    if (!c) return -MARGEN;
    let d = -MARGEN;
    for (const s of c.segs) if (s.maneja) { const q = C.bordillo - distCapsula(s, x, y); if (q > d) d = q; }
    for (const r of c.disco) { const q = r.R + C.bordillo - Math.hypot(x - r.x, y - r.y); if (q > d) d = q; }
    for (const o of c.sol) { const q = distCapsula(o, x, y); if (q < d) d = q; }
    for (const o of cierres) { const q = distCapsula(o, x, y); if (q < d) d = q; }
    return d;
  }
  // Empuja el círculo fuera de lo sólido; devuelve la normal del golpe más fuerte
  function resolver(o, r) {
    if (C.fantasma) return null; // solo para calibrar desde la consola
    let peor = null;
    for (let it = 0; it < 3; it++) {
      const d = sdMundo(o.x, o.y, r + 2);
      if (d >= r) break;
      const e = 0.75;
      let nx = sdMundo(o.x + e, o.y, r + 4) - sdMundo(o.x - e, o.y, r + 4);
      let ny = sdMundo(o.x, o.y + e, r + 4) - sdMundo(o.x, o.y - e, r + 4);
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const p = r - d;
      o.x += nx * p; o.y += ny * p;
      if (!peor || p > peor.p) peor = { nx, ny, p };
    }
    return peor;
  }
  // ¿hay algo sólido a menos de m de este punto?
  const solido = (x, y, m) => sdMundo(x, y, m + 1) < m;
  const vuelta = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // Ayuda al manejar (A = S.dif.asist, 1 = toda, 0 = nada). Nunca te pelea el volante:
  //  · si hay algo delante y no giras, o giras hacia el lado libre, se desvía un poco y frena un poco
  //  · si no giras y vas en una calle, se endereza con la calle y se centra
  function ayudar(k, meta, dt) {
    const A = S.dif.asist;
    if (A <= 0 || C.fantasma || k.v < 30) return;
    const mira = 40 + k.v * 0.45;
    const libre = (da) => { const a = k.ang + da; return !solido(k.x + Math.cos(a) * mira, k.y + Math.sin(a) * mira, C.cabezaA / 2); };
    if (!libre(0)) {
      const der = libre(0.5) || libre(1.1), izq = libre(-0.5) || libre(-1.1);
      const lado = der && izq ? (libre(0.5) ? 1 : -1) : der ? 1 : izq ? -1 : 0;
      if (lado === 0 || (meta !== 0 && lado !== meta)) return; // si giras hacia la pared, te dejo
      k.ang += lado * C.giro * 0.9 * A * dt;
      k.v = Math.max(0, k.v - C.freno * 0.25 * A * dt);
      return;
    }
    if (meta !== 0 || enRedondel(k.x, k.y, 70)) return;
    const q = calleCerca(k.x, k.y, k.ang); // la calle por la que vas (si vas más o menos derecho por ella)
    if (!q) return;
    const sg = q.ux * Math.cos(k.ang) + q.uy * Math.sin(k.ang) < 0 ? -1 : 1;
    const tx = q.x + q.ux * sg * 160, ty = q.y + q.uy * sg * 160;
    k.ang += vuelta(Math.atan2(ty - k.y, tx - k.x) - k.ang) * Math.min(1, 2.5 * A * dt);
  }

  // Acelerador: mientras lo pisas va más rápido; al soltarlo vuelve a su velocidad normal. Frenar le gana.
  function turbo(dt) {
    const T = S.turbo, quiere = entrada.turbo && !entrada.freno;
    if (quiere && !T.antes) sonar('turbo');
    T.antes = quiere;
    T.activo = quiere;
    if (T.activo) {
      // humito por los dos escapes de atrás
      const k = S.cab, fx = Math.cos(k.ang), fy = Math.sin(k.ang);
      if (!quieto && (T.humo -= dt) <= 0) {
        T.humo = 0.05;
        for (const lado of [-1, 1]) {
          const x = k.x - fx * C.cabezaL / 2 - fy * lado * C.cabezaA * 0.4, y = k.y - fy * C.cabezaL / 2 + fx * lado * C.cabezaA * 0.4;
          S.chispas.push({ x, y, vx: -fx * 70 - fy * lado * 30 + azar(-15, 15), vy: -fy * 70 + fx * lado * 30 + azar(-15, 15), vida: 0, dur: 0.45, c: 'rgba(215,215,225,.75)', r: azar(3, 6) });
        }
      }
    }
  }

  function moverCabeza(dt) {
    const k = S.cab;
    const meta = (entrada.izq ? -1 : 0) + (entrada.der ? 1 : 0);
    k.giro += (meta - k.giro) * Math.min(1, C.giroSuave * dt);
    const turbo = S.turbo.activo;
    let vMax = S.dif.vMax * (turbo ? C.turbo : 1);
    // con ayuda, afloja al acercarse a la estación (para que sea fácil parar ahí)
    if (S.dif.asist > 0 && S.est.carga >= 0) {
      const rx = ESTACION.x - k.x, ry = ESTACION.y - k.y, d = Math.hypot(rx, ry);
      if (d < 230 && rx * Math.cos(k.ang) + ry * Math.sin(k.ang) > -40) vMax = Math.min(vMax, S.dif.vMax * (1 - 0.55 * S.dif.asist));
    }
    // en la estación se queda quieto mientras baja y sube la gente (aunque ya no frenes)
    const subiendo = S.parando && S.est.carga > 0 && S.est.carga < 0.6;
    if (entrada.freno && !subiendo && k.v <= 2) k.v = Math.max(-C.reversa, k.v - C.acel * 0.6 * dt); // parado y frenando: reversa
    else if (entrada.freno || subiendo) k.v = Math.max(0, k.v - C.freno * dt);
    else if (k.v < vMax) k.v = Math.min(vMax, k.v + C.acel * (turbo ? C.turboAcel : 1) * dt * (k.v < 0 ? 3 : 1));
    else k.v = Math.max(vMax, k.v - C.freno * 0.3 * dt);
    // el volante siempre responde: parado también se puede girar (a menos velocidad)
    let w = k.v * Math.tan(k.giro * C.volanteMax) / C.ejes; // radio mínimo: ejes / tan(volante)
    const wMax = C.agarreCab / Math.max(Math.abs(k.v), 1);  // a mucha velocidad, lo que aguantan las llantas
    k.ang += clamp(w, -wMax, wMax) * dt;
    ayudar(k, meta, dt);
    const dx = Math.cos(k.ang), dy = Math.sin(k.ang);
    k.x += dx * k.v * dt; k.y += dy * k.v * dt;
    // dos círculos: trompa y cola de la cabeza
    const media = C.cabezaL / 2 - C.cabezaA / 2;
    const frente = { x: k.x + dx * media, y: k.y + dy * media };
    const golpe = resolver(frente, C.cabezaA / 2);
    if (golpe) { k.x += frente.x - (k.x + dx * media); k.y += frente.y - (k.y + dy * media); }
    const atras = { x: k.x - dx * media, y: k.y - dy * media };
    if (resolver(atras, C.cabezaA / 2)) { k.x += atras.x - (k.x - dx * media); k.y += atras.y - (k.y - dy * media); }
    if (golpe) {
      // la pared solo frena lo que va contra ella: el rumbo sigue siendo tuyo, así puedes girar para salir
      const deFrente = Math.max(0, -(dx * golpe.nx + dy * golpe.ny)); // 0 = la roza, 1 = de frente
      const fuerza = deFrente * k.v;
      const umbral = 70 + 160 * S.dif.asist; // con ayuda, los roces no cuentan como choque
      if (fuerza > umbral && k.enfriar <= 0) { estrellar(fuerza, frente.x, frente.y); k.v *= 0.2; }
      else k.v *= 1 - 0.4 * deFrente;
    }
    k.enfriar -= dt;
    k.golpe = Math.max(0, k.golpe - dt * 3);
  }

  function chocar(fuerza, x, y, motivo) {
    const k = S.cab;
    k.enfriar = 0.7; k.golpe = 1; S.choques++;
    const susto = clamp(fuerza / 250, 0.15, 0.5);
    for (const v of S.vagones) for (const p of v.asientos) if (p) { p.miedo += susto; p.div = Math.max(0, p.div - 0.1); }
    texto(x, y - 20, motivo || '¡Pum!', '#fff', 1.2);
    polvo(x, y, 14);
    sonar('choque');
  }

  // Un golpe de frente contra la vereda, un puesto, una valla o una isla: se asusta todo el gusanito, se suelta el
  // último vagón (con su gente, que se cae) y se pierde una vida. Sin vidas, se acaba.
  function estrellar(fuerza, x, y) {
    chocar(fuerza, x, y, '¡Pum!');
    S.listos = false; // con un golpe se les va el gusto
    S.choques++; S.vidas--;
    restarConfianza(8);
    if (S.vagones.length > 2) {
      const v = S.vagones.pop();
      for (const p of v.asientos) if (p) { S.asustados++; S.volando.push({ p, x: v.x, y: v.y, vx: azar(-120, 120), vy: azar(-120, 120), z: 0, vz: 240, t: 0, giro: azar(-8, 8) }); }
      S.dif = nivelDe(S.vagones.length);
      anunciar('¡Se soltó un vagón!', '#FF8A7A', 2.5);
      sonar('caida');
    }
    if (S.vidas > 0 && !S.fin) texto(x, y - 60, '♥'.repeat(S.vidas), '#FFB3A8', 1.6);
    if (S.vidas <= 0) terminar('golpes');
  }

  // La cola se parte cuando una barra se cansa del todo. Mientras más largo el gusanito, más se dobla cada
  // barra y más rápido se cansa: no hay tope, el largo se acaba cuando la cola ya no aguanta.
  function romperSiHaceFalta() {
    if (S.rompiendo > 0 || S.fin) return;
    const i = S.vagones.findIndex((v) => v.fatiga >= 1 || !isFinite(v.x) || !isFinite(v.y));
    if (i < 0) return;
    const cola = S.vagones.slice(i);
    S.vagones = S.vagones.slice(0, i);
    for (const v of cola) {
      if (!isFinite(v.x) || !isFinite(v.y)) continue;
      polvo(v.x, v.y, 12);
      for (const p of v.asientos) if (p) { S.asustados++; S.volando.push({ p, x: v.x, y: v.y, vx: azar(-160, 160), vy: azar(-160, 160), z: 0, vz: 280, t: 0, giro: azar(-8, 8) }); }
    }
    S.dif = nivelDe(S.vagones.length);
    S.rompiendo = 1.4;
    anunciar(`¡Se partió la cola! Llegaste a ${S.pico} vagones`, '#FF8A7A', 3.5);
    sonar('choque');
  }
  function colaAviso() {
    if (S.avisos.cola || S.rompiendo > 0) return;
    if (S.vagones.some((v) => v.fatiga > 0.6)) { S.avisos.cola = true; anunciar('¡La cola está a punto de partirse!', '#FFB3A8', 2.5, true); }
  }

  // Cada vagón es un remolque de dos ejes, como los de verdad: la lanza va del enganche del de adelante al eje
  // delantero, que gira con ella (hasta C.giroEje); el eje de atrás arrastra el cuerpo, conserva parte de su
  // impulso (C.inercia) y sus llantas frenan el deslizamiento de costado. Así el zigzag se propaga y crece un
  // poco hacia la cola.
  function moverVagones(dt) {
    const k = S.cab, wb = C.vagonL * 0.56; // distancia entre ejes
    let hx = k.x - Math.cos(k.ang) * C.cabezaL / 2, hy = k.y - Math.sin(k.ang) * C.cabezaL / 2; // enganche
    let pa = k.ang; // hacia dónde mira el de adelante
    for (const v of S.vagones) {
      const ocx = v.x, ocy = v.y, oang = v.ang, orx = v.rx, ory = v.ry;
      // 1 · la lanza: el eje delantero queda a su largo del enganche, que dobla hasta C.dobla
      let b = Math.atan2(v.fy - hy, v.fx - hx);
      const rel = vuelta(b - (pa + Math.PI));
      if (Math.abs(rel) > C.dobla) b = pa + Math.PI + Math.sign(rel) * C.dobla;
      v.fx = hx + Math.cos(b) * C.lanza; v.fy = hy + Math.sin(b) * C.lanza;
      // 2 · el eje de atrás, con su impulso, sigue al de adelante a la distancia entre ejes
      v.rx += v.rvx * dt * C.inercia; v.ry += v.rvy * dt * C.inercia;
      let c = Math.atan2(v.ry - v.fy, v.rx - v.fx);
      const lz = Math.atan2(hy - v.fy, hx - v.fx); // hacia dónde tira la lanza
      const giroEje = vuelta(c + Math.PI - lz);     // cuánto está girado el eje delantero respecto del cuerpo
      if (Math.abs(giroEje) > C.giroEje) c = lz + Math.sign(giroEje) * C.giroEje - Math.PI;
      v.rx = v.fx + Math.cos(c) * wb; v.ry = v.fy + Math.sin(c) * wb;
      // 3 · choques del cuerpo: se corre el eje de atrás
      let cx = (v.fx + v.rx) / 2, cy = (v.fy + v.ry) / 2;
      const o = { x: cx, y: cy };
      if (resolver(o, C.vagonA / 2 - 2)) {
        v.rx += 2 * (o.x - cx); v.ry += 2 * (o.y - cy);
        const l = Math.hypot(v.rx - v.fx, v.ry - v.fy) || 1;
        v.rx = v.fx + (v.rx - v.fx) / l * wb; v.ry = v.fy + (v.ry - v.fy) / l * wb;
        cx = (v.fx + v.rx) / 2; cy = (v.fy + v.ry) / 2;
        if (v.golpe <= 0 && Math.hypot(v.vx, v.vy) > 120) { v.golpe = 0.6; polvo(cx, cy, 5); for (const p of v.asientos) if (p) p.miedo += 0.08 * (1 - 0.8 * S.dif.asist); }
      }
      v.golpe -= dt;
      v.x = cx; v.y = cy;
      v.ang = Math.atan2(v.fy - v.ry, v.fx - v.rx);
      v.lz = Math.atan2(hy - v.fy, hx - v.fx);
      // velocidades: la del eje de atrás (su impulso) y la del centro (lo que siente la gente)
      v.rvx = (v.rx - orx) / dt; v.rvy = (v.ry - ory) / dt;
      v.vx = (v.x - ocx) / dt; v.vy = (v.y - ocy) / dt;
      const fx = Math.cos(v.ang), fy = Math.sin(v.ang);
      const lonR = v.rvx * fx + v.rvy * fy;
      const latR = (-v.rvx * fy + v.rvy * fx) * Math.exp(-C.agarre * dt); // las llantas de atrás frenan el costado
      v.rvx = fx * lonR - fy * latR; v.rvy = fy * lonR + fx * latR;
      const lon = v.vx * fx + v.vy * fy, lat = -v.vx * fy + v.vy * fx;
      v.lat += (Math.abs(lat) - v.lat) * Math.min(1, dt * 4); // suavizado para medir
      v.latSigno = Math.sign(lat);
      v.gir = vuelta(v.ang - oang) / dt;
      // lo que siente el pasajero: empujón de costado = rapidez × giro, más el deslizamiento
      const g = Math.abs(v.gir * lon) + Math.abs(lat) * C.agarre;
      v.g += (Math.min(g, 4000) - v.g) * Math.min(1, dt * 4); // tope solo para que los números no exploten
      // la barra se cansa mientras la cola la sacude más de lo que aguanta, y se recupera cuando no:
      // si se cansa del todo, la cola se parte
      const exceso = v.g / aguanta() - 1;
      v.fatiga = Math.max(0, (v.fatiga || 0) + (exceso > 0 ? exceso * C.fatiga : -C.recupera) * dt);
      hx = v.x - fx * C.vagonL / 2; hy = v.y - fy * C.vagonL / 2; // enganche de atrás de este vagón
      pa = v.ang;
    }
  }

  // ─── Pasajeros: se divierten con el meneo, se asustan con el latigazo ─
  function pasajeros(dt) {
    const mareados = S.giros >= C.mareoDesde;
    const extra = mareados ? 0 : enRedondel(S.cab.x, S.cab.y, 30) ? 1.5 : 1; // el redondel divierte más; mareados, nada los divierte
    const dil = clamp(1 / (1 + Math.max(0, aBordo() - 4) * 0.08), 0.4, 1); // más gente, más difícil divertirlos
    const lento = Math.abs(S.cab.v) < 30 && S.parando <= 0;
    const d = S.dif;
    const tarde = S.vuelta !== null && S.vuelta < 0;
    S.avisoT -= dt;
    if (!S.listos && !mareados && S.vuelta !== null && (diversion() ?? 0) >= 0.995) {
      S.listos = true;
      anunciar(yaPuedenBajar() ? '¡100 %! Ya están contentos: llévalos a la estación' : `¡100 %! Sigue paseándolos: se bajan desde los ${C.minVuelta} s`, '#F2E14B', 3.5);
    }
    for (const v of S.vagones) {
      const e = v.g;
      for (let s = 0; s < v.asientos.length; s++) {
        const p = v.asientos[s];
        if (!p) continue;
        p.t += dt;
        if (S.listos && !tarde) { p.div = 1; p.miedo = Math.max(0, p.miedo - 0.04 * dt); continue; } // ya ganados
        if (e > C.divDesde) {
          const tramo = Math.min(e, C.divLleno, d.miedo) - C.divDesde;
          p.div += tramo / (C.divLleno - C.divDesde) * C.ritmoDiv * d.ritmo * extra * dil * (S.parlante ? 1.25 : 1) * dt;
        } else p.div -= (lento ? 0.04 : 0.025) * dt; // sin meneo se aburren (y parados, más)
        if (tarde) p.div -= 0.05 * dt;          // ya quieren bajarse
        if (e > d.miedo) p.miedo += (e - d.miedo) / 250 * dt;
        else p.miedo -= 0.04 * dt;
        p.div = clamp(p.div, 0, 1); p.miedo = clamp(p.miedo, 0, 1.2);
        if (!p.feliz && p.div >= 1 && p.miedo < 1) {
          p.feliz = true; texto(v.x, v.y - 30, elige(FRASES_DIV), '#F2E14B', 1.3); confeti(v.x, v.y, 18); sonar('feliz');
        }
        if (!p.asustado && p.miedo >= 1) { p.asustado = true; texto(v.x, v.y - 30, elige(FRASES_MIEDO), '#fff', 1.3); }
      }
      // gritos sueltos para que se sienta el meneo
      if (e > 320 && e < d.miedo && Math.random() < dt * 0.5 && S.avisoT <= 0 && v.asientos.some(Boolean)) {
        texto(v.x, v.y - 24, elige(FRASES_DIV), '#fff', 0.9); S.avisoT = 1.2;
      }
      // salir volando
      if (e > d.caida && Math.random() < dt * (e - d.caida) / 100) {
        const ocupados = v.asientos.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
        if (ocupados.length) {
          const s = elige(ocupados), p = v.asientos[s];
          v.asientos[s] = null;
          const fx = Math.cos(v.ang), fy = Math.sin(v.ang), sg = -Math.sign(v.gir) || 1;
          // sale hacia donde se mecía el vagón
          S.volando.push({ p, x: v.x, y: v.y, vx: v.vx * 0.6 - fy * sg * 160, vy: v.vy * 0.6 + fx * sg * 160, z: 0, vz: 260, t: 0, giro: azar(-8, 8) });
          S.caidos++; S.plata -= 1; restarConfianza(3);
          texto(v.x, v.y - 30, '¡Salió volando! −$1', '#FF8A7A', 1.6);
          sonar('caida');
          for (const o of S.vagones) for (const q of o.asientos) if (q) q.miedo += 0.2;
        }
      }
    }
  }

  const capacidad = () => S.vagones.length * C.asientos;
  function diversion() { let n = 0, d = 0; for (const v of S.vagones) for (const p of v.asientos) if (p) { n++; d += p.div; } return n ? d / n : null; }
  const yaPuedenBajar = () => C.vuelta - S.vuelta >= C.minVuelta; // al 100 %, solo después de un rato de vuelta
  const puedenBajar = () => S.vuelta === null || S.vuelta <= C.ventana || ((diversion() ?? 0) >= 0.995 && yaPuedenBajar());
  const aBordo = () => S.vagones.reduce((n, v) => n + v.asientos.filter(Boolean).length, 0);
  const duracionVuelta = () => C.vuelta;

  // La estación: llega gente a la fila; si el gusanito se demora, se cansan y se van.
  // Al parar ahí, todos se bajan y pagan según lo felices que vienen, y sube la siguiente tanda.
  function restarConfianza(n) {
    S.confianza = Math.max(0, S.confianza - n);
    if (S.confianza <= 0 && !S.fin) terminar('confianza');
  }

  function estacion(dt) {
    const k = S.cab, e = S.est;
    e.t += dt;
    if (aBordo() > 0) S.viajeT += dt; // cuánto dura el viaje de los que van a bordo
    // sin combustible, sin plata para comprarlo y sin nadie a bordo: se acabó
    if (S.vuelta === null && aBordo() === 0 && S.comb <= 0 && S.plata < precioComb()) { terminar('combustible'); return; }
    // llega gente: más o menos una tanda completa cada 30 s; con poca confianza ya no llega tanta
    e.llegaT -= dt;
    if (e.llegaT <= 0 && e.fila.length < C.filaMax) { e.fila.push(nuevoPasajero()); e.llegaT = azar(0.7, 1.3) * 30 / capacidad() / Math.max(0.25, S.confianza / 100); }
    // la vuelta corre; cuando se acaba, avisos y la fila se empieza a ir
    if (S.vuelta !== null) {
      S.vuelta -= dt;
      if (S.vuelta <= 12 && !S.avisos.regresa) { S.avisos.regresa = true; anunciar('¡Regresa a la estación!', '#F2E14B', 3); }
      if (S.vuelta < 0 && !S.fin) {
        if (!S.avisos.tarde) { S.avisos.tarde = true; anunciar('¡Tarde! La fila se está yendo', '#FF8A7A', 3); sonar('tarde'); }
        e.vaT = (e.vaT ?? 1.5) - dt;
        if (e.vaT <= 0 && e.fila.length) {
          e.vaT = 1.6;
          const p = e.fila.shift(); S.seFueron++; restarConfianza(5);
          S.seVan.push({ p, lx: -40, ly: 56, t: 0, dir: Math.random() < 0.5 ? -1 : 1 }); // en la vereda, junto a la fila
          texto(ESTACION.x - 60, ESTACION.y - 50, elige(['¡Ya no espero!', '¡Me voy!', '¡Qué demora!', 'Mejor otro día']), '#FFB3A8', 1.4);
        }
      }
    }
    // ¿paró en la estación?
    const cerca = Math.hypot(ESTACION.x - k.x, ESTACION.y - k.y) < 240 || S.vagones.slice(0, 2).some((v) => Math.hypot(ESTACION.x - v.x, ESTACION.y - v.y) < 150);
    S.parando = 0;
    if (cerca && Math.abs(k.v) < 40) {
      S.parando = 1;
      e.carga += dt;
      if (e.carga >= 0.6) {
        if (puedenBajar()) { e.carga = -99; llegada(); }
        else { e.carga = -1.2; texto(ESTACION.x, ESTACION.y - 40, (diversion() ?? 0) >= 0.995 ? `Aún no: se bajan en ${Math.ceil(C.minVuelta - (C.vuelta - S.vuelta))} s` : `Aún no: faltan ${Math.ceil(S.vuelta - C.ventana)} s, o llega al 100 %`, '#FFB3A8', 1.6); }
      }
    } else if (e.carga > 0) e.carga = Math.max(0, e.carga - dt);
    if (e.carga < -1 && !cerca) e.carga = 0; // ya salió: la próxima vez que pare, cuenta
    for (let n = S.seVan.length - 1; n >= 0; n--) { const q = S.seVan[n]; q.t += dt; q.lx += q.dir * 60 * dt; if (q.t > 3) S.seVan.splice(n, 1); }
  }

  function llegada() {
    limpiarAvisos(); // lo que pasa al llegar reemplaza los avisos de la vuelta
    S.viajeT = 0;
    // 1 · bajan todos. Si la diversión del grupo llega al 75 % o más, pagan según lo felices que bajaron;
    //     si no, piden devuelto (llegues a la hora o no)
    let bajan = 0;
    const subieron = [];
    for (const v of S.vagones) for (let s = 0; s < v.asientos.length; s++) {
      const q = v.asientos[s];
      if (!q) continue;
      v.asientos[s] = null; bajan++;
      if (q.asustado) { S.asustados++; continue; } // asustados no pagan
      subieron.push(q);
    }
    const n = subieron.length;
    const avg = n ? subieron.reduce((a, q) => a + clamp(q.div, 0, 1), 0) / n : 0;
    const pct = Math.round(avg * 100);
    const devolver = n > 0 && avg < C.minDiv;
    let cobro = 0;
    if (!devolver) for (const q of subieron) {
      const f = clamp(q.div, 0, 1);
      if (f >= 0.9) S.felices++;
      let pago = 0.25 + 1.0 * f;
      if (f >= 0.9 && q.miedo < 0.3) pago += 0.25; // propina
      cobro += Math.round(pago * (S.noche ? 1.5 : 1) * 20) / 20;
    }
    if (bajan) {
      S.viajes++;
      S.plata += cobro; S.total += cobro;
      S.ultimo = { pct, cobro, devolver };
      if (cobro > 0) { texto(ESTACION.x, ESTACION.y - 60, '+' + plata(cobro), '#8BD43B', 2); sonar('plata'); }
      if (devolver) {
        S.devueltos += n;
        anunciar(`Piden devuelto: ${pct} % de diversión (mínimo 75 %)`, '#FF8A7A', 3.5);
        restarConfianza(n * 6);
        if (S.fin) return;
      } else if (cobro > 0) {
        anunciar(`${pct >= 99 ? '¡100 %!' : `¡${pct} %!`} Cobraste ${plata(cobro)}${S.noche ? ' de noche' : ''}`, '#8BD43B', 3);
        S.confianza = Math.min(100, S.confianza + 4);
      } else {
        anunciar('Bajaron asustados', '#FFB3A8', 3);
      }
    }
    // 2 · sube la siguiente tanda; con gente arriba se para a decidir antes de salir
    const suben = subirFila();
    if (suben) {
      S.avisos = {};
      texto(ESTACION.x, ESTACION.y - 30, `Subieron ${suben}`, '#fff', 1.4);
      if (S.primera) { S.primera = false; anunciar('Zigzag y redondeles para divertirlos', '#F2E14B', 4); }
      abrirEstacion();
    } else {
      S.vuelta = null;
      if (!S.avisos.vacio) { S.avisos.vacio = true; texto(ESTACION.x, ESTACION.y - 30, 'No hay nadie en la fila', '#fff', 1.4); }
      S.est.carga = -0.4; // vuelve a revisar la fila en un segundo
    }
  }

  function subirFila() {
    let suben = 0;
    for (const v of S.vagones) for (let s = 0; s < v.asientos.length; s++) {
      if (!v.asientos[s] && S.est.fila.length) { v.asientos[s] = S.est.fila.shift(); suben++; }
    }
    return suben;
  }

  // ─── Decidir en la estación: el tiempo se para hasta que digas ¡Vámonos! ─
  const precioComb = () => 10 + 2 * S.vagones.length;
  function abrirEstacion() {
    if (S.fin) return;
    if (S.comb <= 0 && S.plata < precioComb()) { terminar('combustible'); return; }
    S.decidiendo = true; S.corriendo = false; S.vuelta = null; musica(false);
    mostrar('estacion');
    renderTienda();
  }
  function cerrarCalles() {
    const n = Math.min(6, 1 + Math.floor(S.viajes / 2));
    // ni la estación ni lo que llega a ella, ni donde está el gusanito (una cola larga puede ocupar varios tramos)
    const cerca = (t) => { const m = enTramo(t, t.L / 2); return [S.cab, ...S.vagones].some((o) => Math.hypot(o.x - m.x, o.y - m.y) < 320); };
    const candidatas = tramos.filter((t) => t !== tramoEstacion && !tocaEstacion(t) && !t.angosta && !t.salida && t.L >= 400 && !cerca(t));
    // cuántos cruces se alcanzan desde la estación sin pasar por las cerradas: tiene que seguir siendo todos
    const alcanza = (cerradas) => {
      const vistos = new Set([tramoEstacion.a]), cola = [tramoEstacion.a];
      while (cola.length) {
        const nodo = cola.pop();
        for (const t of nodo.tramos) {
          if (cerradas.includes(t)) continue;
          const otro = t.a === nodo ? t.b : t.a;
          if (!vistos.has(otro)) { vistos.add(otro); cola.push(otro); }
        }
      }
      return vistos.size;
    };
    const todos = alcanza([]);
    let elegidas = [];
    for (let intento = 0; intento < 60; intento++) {
      const pool = candidatas.slice(), prueba = [];
      while (prueba.length < n && pool.length) prueba.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
      if (alcanza(prueba) === todos) { elegidas = prueba; break; }
    }
    // la valla cruza la calle a media cuadra
    cierres = elegidas.map((t) => {
      const m = enTramo(t, t.L / 2), nx = -m.uy, ny = m.ux, l = t.hw + 22;
      return capsula(m.x - nx * l, m.y - ny * l, m.x + nx * l, m.y + ny * l, 13, { x: m.x, y: m.y, ang: Math.atan2(ny, nx), largo: 2 * l });
    });
    if (cierres.length) anunciar(`${cierres.length === 1 ? 'Una calle cerrada' : cierres.length + ' calles cerradas'}: busca otro camino`, '#F2E14B', 3, true);
  }
  function salir() {
    if (!S.decidiendo || aBordo() === 0 || S.comb <= 0) return;
    S.comb--; // cada vuelta gasta una vuelta de combustible
    S.decidiendo = false; S.vuelta = duracionVuelta(); S.viajeT = 0; S.est.carga = -99; S.listos = false; S.giros = 0; S.giroAcc = 0; S.giroT = 0;
    cerrarCalles();
    if (S.comb === 1) anunciar('Queda 1 vuelta de combustible: pide más en la estación', '#FFB3A8', 3.5, true);
    if (S.comb === 0) anunciar('Esta es la última vuelta: después hay que pedir combustible', '#FF8A7A', 3.5, true);
    audio(); mostrar(null); S.corriendo = true; musica(true);
  }

  const TIENDA = (() => ({
    combustible: () => ({ ico: '⛽', nombre: 'Combustible', nota: S.comb <= 0 ? '¡Sin combustible no sales!' : `quedan ${S.comb} de ${C.combustible} vueltas`, coste: precioComb(), hecho: S.comb >= C.combustible, listo: 'Lleno', urge: S.comb <= 1 }),
    vagon: () => ({ ico: '🚃', nombre: 'Vagón nuevo', nota: `+4 asientos · la cola más brava`, coste: precioVagon(S.vagones.length + 1) }),
    barras: () => ({ ico: '🔩', nombre: 'Barras reforzadas', nota: `la cola aguanta +30 %${S.barras ? ` (tienes ${S.barras})` : ''}`, coste: 30 * (S.barras + 1) }),
    parlante: () => ({ ico: '🔊', nombre: 'Parlante', nota: 'se divierten más rápido', coste: 60, hecho: S.parlante, listo: 'Ya lo tienes' }),
    luces: () => ({ ico: '💡', nombre: 'Luces', nota: 'juega de noche: cobras ×1,5', coste: 50, hecho: S.luces, listo: 'Ya las tienes' }),
    noche: () => ({ ico: '🌙', nombre: 'De noche', nota: 'cobras ×1,5', coste: 0, libre: true }),
  }))();
  function renderTienda() {
    const ids = ['combustible', 'vagon', 'barras', 'parlante', 'luces'];
    if (S.luces) ids.push('noche');
    $('#tienda').innerHTML = ids.map((id) => {
      const it = TIENDA[id](), falta = !it.libre && !it.hecho && S.plata < it.coste;
      const guarda = reservaComb(id, it), bloqueo = !falta && guarda; // sin combustible, primero se paga el combustible
      const etiqueta = it.libre ? (S.noche ? 'Sí' : 'No') : it.hecho ? '✓ ' + it.listo : falta ? `faltan ${plata(it.coste - S.plata)}` : bloqueo ? 'primero ⛽' : plata(it.coste);
      const clase = 'oferta' + (it.hecho ? ' oferta--hecho' : '') + (it.urge && !it.hecho ? ' oferta--urge' : '') + (it.libre && S.noche ? ' oferta--activa' : '');
      return `<button class="${clase}" type="button" data-item="${id}"${it.hecho || falta || bloqueo ? ' disabled' : ''}><span class="oferta__ico" aria-hidden="true">${it.ico}</span><span class="oferta__nombre">${it.nombre}</span><span class="oferta__nota">${it.nota}</span><span class="oferta__precio">${etiqueta}</span></button>`;
    }).join('');
    $('#est-plata').textContent = plata(S.plata);
    const u = S.ultimo;
    const ultimo = !u ? 'Primera vuelta' : u.devolver ? `Última vuelta: ${u.pct} %, pidieron devuelto` : `Última vuelta: ${u.pct} % · +${plata(u.cobro)}`;
    $('#est-resumen').textContent = `${aBordo()} a bordo · fila ${S.est.fila.length} · ${ultimo}`;
    $('#b-vamonos').disabled = S.comb <= 0 || aBordo() === 0;
    $('#est-vamonos-nota').textContent = S.comb <= 0 ? 'primero compra combustible' : `gasta 1 de combustible (quedan ${S.comb})`;
    actualizarHud(true); // la plata y las fichas de arriba también cambian al comprar
  }
  // sin combustible, nada que te deje sin plata para el combustible (el vagón además lo encarece)
  function reservaComb(id, it) {
    if (S.comb > 0 || id === 'combustible' || it.libre) return false;
    const despues = id === 'vagon' ? 10 + 2 * (S.vagones.length + 1) : precioComb();
    return S.plata - it.coste < despues;
  }
  function comprar(id) {
    const it = TIENDA[id]();
    if (!it.libre) { if (it.hecho || S.plata < it.coste || reservaComb(id, it)) return; S.plata -= it.coste; }
    if (id === 'combustible') { S.comb = C.combustible; sonar('plata'); }
    else if (id === 'vagon') {
      agregarVagon();
      S.dif = nivelDe(S.vagones.length); S.pico = Math.max(S.pico, S.vagones.length);
      ajustarCaminantes();
      const n = subirFila();
      if (S.pico % 5 === 0) anunciar(`¡${S.pico} vagones!`, '#F2E14B', 3);
      texto(S.cab.x, S.cab.y - 50, n ? `¡Vagón nuevo! Subieron ${n}` : '¡Vagón nuevo!', '#F2E14B', 1.8);
      confeti(S.cab.x, S.cab.y, 30);
      sonar('nivel');
    } else if (id === 'barras') { S.barras++; sonar('plata'); }
    else if (id === 'parlante') { S.parlante = true; sonar('feliz'); }
    else if (id === 'luces') { S.luces = true; sonar('feliz'); }
    else if (id === 'noche') { S.noche = !S.noche; }
    renderTienda();
  }

  // Vueltas al redondel: una vuelta completa por dentro de un redondel da puntos extra (de noche, más),
  // salvo con la gente mareada
  function contarRedondel() {
    const k = S.cab;
    const r = redondeles.find((q) => { const d = Math.hypot(k.x - q.x, k.y - q.y); return d > q.isla + 25 && d < q.R - 10; });
    if (!r) { S.ronda = null; return; }
    const a = Math.atan2(k.y - r.y, k.x - r.x);
    if (!S.ronda || S.ronda.r !== r) { S.ronda = { r, last: a, acc: 0 }; return; }
    let d = a - S.ronda.last; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    S.ronda.acc += d; S.ronda.last = a;
    if (Math.abs(S.ronda.acc) >= 2 * Math.PI) {
      S.ronda.acc -= Math.sign(S.ronda.acc) * 2 * Math.PI;
      S.vueltasRedondel++;
      if (S.giros >= C.mareoDesde) return;
      const bono = Math.round((0.5 + 0.1 * aBordo()) * (S.noche ? 1.5 : 1) * 100) / 100;
      S.plata += bono; S.total += bono;
      texto(k.x, k.y - 50, `¡Vuelta al redondel! +${plata(bono)}`, '#F2E14B', 1.8);
      sonar('plata');
    }
  }

  // Mareo: suma lo que gira la cabeza (para un lado suma, para el otro resta: el zigzag se anula). Cada giro
  // completo cuenta; desde el C.mareoDesde la gente se marea y cada giro más les baja la diversión.
  function mareo(dt, giro) {
    if (S.vuelta === null || aBordo() === 0) { S.giros = 0; S.giroAcc = 0; return; }
    S.giroAcc += giro;
    S.giroT += dt;
    if (S.giroT >= C.mareoOlvida) { // un buen rato sin dar la vuelta entera: se les pasa
      if (S.giros >= C.mareoDesde) texto(S.cab.x, S.cab.y - 50, 'Ya se les pasó el mareo', '#fff', 1.6);
      S.giros = 0; S.giroAcc *= 0.5; S.giroT = 0;
    }
    if (Math.abs(S.giroAcc) < 2 * Math.PI) return;
    S.giroAcc -= Math.sign(S.giroAcc) * 2 * Math.PI;
    S.giros++; S.giroT = 0;
    const k = S.cab;
    if (S.giros < C.mareoDesde) { if (S.giros === C.mareoDesde - 1) texto(k.x, k.y - 70, '¡Uy, ya me da vueltas la cabeza!', '#C6F08A', 1.8); return; }
    S.listos = false;
    for (const v of S.vagones) for (const p of v.asientos) if (p) { p.div = Math.max(0, p.div - C.mareo); if (p.div < 1) p.feliz = false; }
    texto(k.x, k.y - 50, elige(['¡Me mareo!', '¡Ya no más vueltas!', '¡Qué mareo!', '¡Bájenme!']), '#C6F08A', 1.8);
    if (S.giros === C.mareoDesde) anunciar('¡Se marean! Deja de dar vueltas un rato', '#C6F08A', 3, true);
    sonar('tarde');
  }

  function caminantes(dt) {
    const k = S.cab;
    S.sustoT -= dt; S.ladridoT -= dt;
    for (const c of S.caminantes) {
      c.t += dt;
      if (c.tipo === 'perro') { perro(c, dt); continue; }
      if (c.parado > 0) { c.parado -= dt; continue; }
      c.s += c.dir * c.v * dt;
      if (c.s < 0 || c.s > c.tr.L) siguienteTramo(c);
      const m = enTramo(c.tr, c.s);
      c.x = m.x; c.y = m.y; c.dx = m.ux * c.dir; c.dy = m.uy * c.dir;
      // ¿lo topa la cabeza?
      let ox = c.x + (c.dy || 0) * c.off, oy = c.y - (c.dx || 0) * c.off;
      for (const r of redondeles) { // rodean la isla del redondel
        const rx = ox - r.x, ry = oy - r.y, rd = Math.hypot(rx, ry) || 1;
        if (rd < r.isla + 30) { ox = r.x + rx / rd * (r.isla + 30); oy = r.y + ry / rd * (r.isla + 30); }
      }
      c.px = ox; c.py = oy;
      if (Math.hypot(ox - k.x, oy - k.y) < 34 + C.cabezaA / 2 && k.enfriar <= 0 && Math.abs(k.v) > 30) {
        k.v = 0;
        S.plata -= 0.5;
        chocar(150, ox, oy, '¡Cuidado con los danzantes! −$0,50');
        c.parado = 1.5;
      }
    }
  }

  // Los perros salen corriendo a ladrarle al gusanito, lo acompañan un rato a su lado y se van.
  // Asustan al chofer (frena de golpe) y a la gente, pero nunca se dejan pisar.
  function perro(c, dt) {
    const k = S.cab;
    const fx = Math.cos(k.ang), fy = Math.sin(k.ang);
    const rx = c.x - k.x, ry = c.y - k.y, d = Math.hypot(rx, ry);
    c.ladra = Math.max(0, c.ladra - dt);
    c.enfriar -= dt;
    let tx, ty, vel;
    if (c.modo === 'pasea') {
      if (k.v > 60 && d < 240 && c.enfriar <= 0) {
        // ¡sale corriendo! se pone del lado en que estaba
        c.modo = 'persigue'; c.tm = azar(1.8, 3.2);
        c.lado = Math.sign(fx * ry - fy * rx) || 1;
        c.ladra = 0.5; c.asusto = false;
      } else if (c.parado > 0) c.parado -= dt; // se sienta un rato
      else {
        const m = c.ruta[0];
        if (!m) { rutaPerro(c); if (Math.random() < 0.4) c.parado = azar(1, 3); }
        else if (Math.hypot(m.x - c.x, m.y - c.y) < 6) c.ruta.shift();
        else { tx = m.x; ty = m.y; vel = c.v; }
      }
    }
    if (c.modo === 'persigue') {
      c.tm -= dt;
      // corre al lado de la cabeza, ladrando
      const lejos = C.cabezaA / 2 + 34;
      tx = k.x - fy * c.lado * lejos + fx * 10; ty = k.y + fx * c.lado * lejos + fy * 10;
      vel = Math.min(320, Math.hypot(tx - c.x, ty - c.y) * 5);
      // cuando llega a la par de la trompa, el chofer se asusta
      if (!c.asusto && d < 110) { c.asusto = true; sustoPerro(c); }
      if (Math.random() < dt * 2.5) { c.ladra = 0.35; if (S.ladridoT <= 0) { S.ladridoT = 0.9; sonar('ladrido'); } }
      if (c.tm <= 0 || k.v < 40) { c.modo = 'huye'; c.tm = azar(1.2, 1.8); }
    }
    if (c.modo === 'huye') {
      c.tm -= dt;
      // se va de costado, lejos de la trompa
      tx = c.x - fy * c.lado * 100 - fx * 30; ty = c.y + fx * c.lado * 100 - fy * 30;
      vel = 200;
      if (c.tm <= 0) { c.modo = 'pasea'; c.enfriar = azar(4, 8); rutaPerro(c); }
    }
    if (tx !== undefined) {
      const mx = tx - c.x, my = ty - c.y, md = Math.hypot(mx, my);
      if (md > 0.5) {
        const paso = Math.min(md, vel * dt);
        c.x += mx / md * paso; c.y += my / md * paso;
        let da = Math.atan2(my, mx) - c.ang;
        while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        c.ang += da * Math.min(1, dt * 10);
      }
    }
    resolver(c, 10);
    apartarDelGusano(c, 12);
    c.px = c.x; c.py = c.y;
  }

  // Empuja algo redondo fuera de la cabeza y los vagones (la cabeza manda: nunca lo pisa)
  function apartarDelGusano(o, r) {
    const k = S.cab, fx = Math.cos(k.ang), fy = Math.sin(k.ang);
    const media = C.cabezaL / 2 - C.cabezaA / 2;
    const cuerpos = [
      { x: k.x + fx * 36, y: k.y + fy * 36, r: 14 },
      { x: k.x + fx * media, y: k.y + fy * media, r: C.cabezaA / 2 },
      { x: k.x - fx * media, y: k.y - fy * media, r: C.cabezaA / 2 },
    ];
    for (const v of S.vagones) cuerpos.push({ x: v.x, y: v.y, r: C.vagonA / 2 + 4 });
    for (let it = 0; it < 2; it++) {
      for (const b of cuerpos) {
        let dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy);
        const min = b.r + r + 3;
        if (d >= min) continue;
        if (d < 0.01) { dx = -fy; dy = fx; d = 1; }
        o.x = b.x + dx / d * min; o.y = b.y + dy / d * min;
      }
    }
  }

  function sustoPerro(c) {
    if (S.sustoT > 0) return;
    S.sustoT = 2;
    const k = S.cab;
    k.v *= 0.6; k.golpe = Math.max(k.golpe, 0.5);
    for (const v of S.vagones) for (const p of v.asientos) if (p) p.miedo += 0.12;
    texto(c.x, c.y, elige(['¡Guau, guau!', '¡Guau!', '¡Grrr… guau!']), '#fff', 1.2);
    sonar('ladrido');
  }

  // ─── Efectos ───────────────────────────────────────────────────────
  function texto(x, y, t, color, dur) { S.textos.push({ x, y, t, color, dur, vida: 0 }); }
  // avisos grandes, fijos arriba en la pantalla (no dependen de hacia dónde mire la cámara)
  // Los avisos van en su propia franja, debajo del marcador (no encima del mapa ni del HUD)
  function anunciar(t, color, dur, chico) {
    const el = document.createElement('div');
    el.className = 'aviso' + (chico ? ' aviso--chico' : '');
    el.style.color = color; el.textContent = t;
    avisos.appendChild(el);
    S.anuncios.push({ el, vida: 0, dur });
    while (S.anuncios.length > 2) { S.anuncios.shift().el.remove(); }
  }
  function limpiarAvisos() { for (const a of S.anuncios) a.el.remove(); S.anuncios.length = 0; }
  function confeti(x, y, n) {
    if (quieto) return;
    for (let k = 0; k < n; k++) S.chispas.push({ x, y, vx: azar(-140, 140), vy: azar(-200, -40), vida: 0, dur: azar(0.8, 1.4), c: elige(['#F2E14B', '#E8458B', '#5FB4E6', '#8BD43B', '#fff']), r: azar(2, 4), confeti: true });
  }
  function polvo(x, y, n) {
    if (quieto) return;
    for (let k = 0; k < n; k++) S.chispas.push({ x, y, vx: azar(-80, 80), vy: azar(-80, 80), vida: 0, dur: azar(0.4, 0.8), c: 'rgba(230,220,200,.8)', r: azar(4, 9) });
  }
  function efectos(dt) {
    for (let n = S.textos.length - 1; n >= 0; n--) { const t = S.textos[n]; t.vida += dt; if (t.vida > t.dur) S.textos.splice(n, 1); }
    for (let n = S.anuncios.length - 1; n >= 0; n--) {
      const a = S.anuncios[n]; a.vida += dt;
      const resto = a.dur - a.vida;
      a.el.style.opacity = Math.min(1, Math.max(0, resto / 0.4));
      if (resto <= 0) { a.el.remove(); S.anuncios.splice(n, 1); }
    }
    for (let n = S.chispas.length - 1; n >= 0; n--) {
      const c = S.chispas[n]; c.vida += dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.confeti) c.vy += 300 * dt; else { c.vx *= 0.92; c.vy *= 0.92; }
      if (c.vida > c.dur) S.chispas.splice(n, 1);
    }
    for (let n = S.volando.length - 1; n >= 0; n--) {
      const f = S.volando[n]; f.t += dt;
      if (f.z > 0 || f.vz > 0) { f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vz -= 700 * dt; if (f.z <= 0) { f.z = 0; f.vz = 0; polvo(f.x, f.y, 8); texto(f.x, f.y - 20, '¡Ay!', '#fff', 1); } }
      if (f.t > 4) S.volando.splice(n, 1);
    }
  }

  // ─── Bucle ─────────────────────────────────────────────────────────
  let ultimo = 0;
  function cuadro(ahora) {
    armarEntrada();
    const real = Math.min(0.25, (ahora - ultimo) / 1000 || 0); // tiempo real, para el reloj
    const dt = Math.min(0.033, real);                            // paso de la física, recortado
    ultimo = ahora;
    if (S.corriendo) {
      const sub = 3, h = dt / sub;
      turbo(dt);
      const ang0 = S.cab.ang;
      for (let s = 0; s < sub; s++) { moverCabeza(h); moverVagones(h); }
      mareo(dt, vuelta(S.cab.ang - ang0));
      pasajeros(dt); estacion(dt); caminantes(dt);
      romperSiHaceFalta(); colaAviso(); contarRedondel();
      if (S.rompiendo > 0 && (S.rompiendo -= dt) <= 0) terminar('partio');
      actualizarHud();
    } else S.turbo.activo = false;
    hudTurbo();
    efectos(dt);
    dibujar(dt);
    requestAnimationFrame(cuadro);
  }

  // ─── Dibujo ────────────────────────────────────────────────────────
  let W = 0, H = 0, dpr = 1, zoom = 1, zoomBase = 1, rapidez = 0; // rapidez: 0 a la velocidad normal, 1 a toda la del turbo
  function medir() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    lienzo.width = W * dpr; lienzo.height = H * dpr;
    zoomBase = clamp(Math.min(W, H) / 560, 0.62, 1.5);
    if (W > H * 1.4) zoomBase = clamp(H / 520, 0.55, 1.5);
    zoom = zoomBase;
    PIVOTE = H > W ? 0.54 : 0.64;
  }
  addEventListener('resize', medir);

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  // La cámara va pegada a la cabeza y gira con ella: la trompa siempre apunta hacia arriba,
  // así ◀ ▶ siempre son izquierda y derecha en la pantalla, vaya hacia donde vaya el gusanito.
  // altura de la pantalla donde va la cabeza: más abajo se ve más camino, más arriba se ve la cola
  // (en el celular vertical los mandos tapan la parte de abajo)
  let PIVOTE = 0.64, piv = 0.64; // piv se acerca a PIVOTE (o más arriba, si estás en la estación)
  let camRot = 0;
  function aPantalla(x, y) {
    const dx = (x - S.cam.x) * zoom, dy = (y - S.cam.y) * zoom;
    const c = Math.cos(camRot), s = Math.sin(camRot);
    return { x: W / 2 + dx * c - dy * s, y: H * piv + dx * s + dy * c };
  }

  function dibujar(dt) {
    const k = S.cab;
    S.cam.x += (k.x - S.cam.x) * Math.min(1, dt * 10);
    S.cam.y += (k.y - S.cam.y) * Math.min(1, dt * 10);
    let da = k.ang - S.cam.ang;
    while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    S.cam.ang += da * Math.min(1, dt * C.camGiro);
    camRot = -Math.PI / 2 - S.cam.ang;
    // acelerando, la cámara se aleja un poco: se ve más camino
    const meta = clamp((k.v - S.dif.vMax) / (S.dif.vMax * (C.turbo - 1)), 0, 1);
    rapidez += (meta - rapidez) * Math.min(1, dt * 3);
    zoom = zoomBase * (quieto ? 1 : 1 - 0.1 * rapidez);
    let sx = 0, sy = 0;
    if (k.golpe > 0 && !quieto) { sx = azar(-6, 6) * k.golpe; sy = azar(-6, 6) * k.golpe; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#5E9E4C'; // patios y huertas: el pasto de atrás de las casas
    ctx.fillRect(0, 0, W, H);
    piv += ((S.decidiendo ? 0.3 : PIVOTE) - piv) * Math.min(1, dt * 4);
    ctx.translate(W / 2 + sx, H * piv + sy);
    ctx.rotate(camRot);
    ctx.scale(zoom, zoom);
    ctx.translate(-S.cam.x, -S.cam.y);
    // lo que cabe en pantalla gire como gire: un cuadrado alrededor de la cabeza
    const R = Math.hypot(W / 2, H * Math.max(piv, 1 - piv)) / zoom + 60;
    const ve = (x, y, w, h) => x + w > S.cam.x - R && x < S.cam.x + R && y + h > S.cam.y - R && y < S.cam.y + R;

    const veC = (c) => ve(c.x, c.y, c.w, c.h);

    // verdes, el parque, los árboles de los patios y las casas
    for (const v of verdes) if (veC(v.caja)) verde(v);
    if (veC(parque.caja)) parqueDibujo();
    for (const a of arboles) if (ve(a.x - a.r, a.y - a.r, 2 * a.r, 2 * a.r)) arbol(a);
    for (const e of edificios) if (veC(e.caja)) edificio(e);
    for (const c of casas) if (ve(c.x - c.r, c.y - c.r, 2 * c.r, 2 * c.r)) teja(c);
    // calles: primero la vereda, encima la calzada y la línea del centro (las de afuera del radio de juego también)
    const lineas = [];
    for (const t of tramos) if (veC(t.caja)) lineas.push(t);
    for (const t of vistas) if (veC(t.caja)) lineas.push(t);
    const rs = redondeles.filter((r) => ve(r.x - r.R - 20, r.y - r.R - 20, 2 * r.R + 40, 2 * r.R + 40));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#CFC6B4'; ctx.fillStyle = '#CFC6B4';
    for (const l of lineas) { ctx.lineWidth = 2 * (l.hw + 14); trazo(l); }
    for (const r of rs) { ctx.beginPath(); ctx.arc(r.x, r.y, r.R + 14, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#56565C'; ctx.fillStyle = '#56565C';
    for (const l of lineas) { ctx.lineWidth = 2 * l.hw; trazo(l); }
    for (const r of rs) { ctx.beginPath(); ctx.arc(r.x, r.y, r.R, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(242,225,75,.5)'; ctx.lineWidth = 3; ctx.setLineDash([22, 22]); ctx.lineCap = 'butt';
    for (const l of lineas) trazo(l);
    ctx.setLineDash([]);
    for (const r of rs) redondel(r);
    for (const p of puestos) if (veC(p.caja)) puesto(p);
    for (const c of vallas) if (ve(c.x - c.largo, c.y - c.largo, 2 * c.largo, 2 * c.largo)) cierre(c, true);
    for (const c of cierres) if (ve(c.x - c.largo, c.y - c.largo, 2 * c.largo, 2 * c.largo)) cierre(c);
    if (ve(ESTACION.x - 420, ESTACION.y - 420, 840, 840)) estacionDibujo();
    // caminantes
    for (const c of S.caminantes) if (c.px !== undefined && ve(c.px - 40, c.py - 40, 80, 80)) caminante(c);
    // caídos en el suelo
    for (const f of S.volando) if (f.z <= 0) persona(f.x, f.y, f.p, 1, f.t * f.giro * 0.1, true);

    // gusanito: sombras, cuerpos, toldos
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    for (const v of S.vagones) sombra(v.x, v.y, v.ang, C.vagonL, C.vagonA);
    sombra(k.x, k.y, k.ang, C.cabezaL, C.cabezaA);
    barras();
    S.vagones.forEach((v, n) => vagon(v, n === S.vagones.length - 1));
    cabeza();

    // volando por el aire
    for (const f of S.volando) if (f.z > 0) persona(f.x, f.y - f.z * 0.6, f.p, 1 + f.z / 200, f.t * f.giro, false);

    // banderines encima de todo
    for (const b of banderines) if (ve(Math.min(b.x1, b.x2) - 20, Math.min(b.y1, b.y2) - 20, Math.abs(b.x2 - b.x1) + 40, Math.abs(b.y2 - b.y1) + 40)) banderin(b);

    // efectos
    for (const c of S.chispas) { ctx.globalAlpha = 1 - c.vida / c.dur; ctx.fillStyle = c.c; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;

    // textos derechos en la pantalla, aunque el pueblo esté girado
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.noche) { // de noche todo se oscurece y las luces de colores alumbran
      ctx.fillStyle = 'rgba(8,8,40,.52)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const luz = (x, y, r, c) => { const q = aPantalla(x, y), g = ctx.createRadialGradient(q.x, q.y, 2, q.x, q.y, r * zoom); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(q.x - r * zoom, q.y - r * zoom, 2 * r * zoom, 2 * r * zoom); };
      luz(k.x, k.y, 110, 'rgba(255,220,120,.55)');
      for (const v of S.vagones) luz(v.x, v.y, 80, 'rgba(255,120,200,.4)');
      luz(ESTACION.x, ESTACION.y, 170, 'rgba(255,230,140,.4)');
      for (const q of redondeles) luz(q.x, q.y, 90, 'rgba(120,220,255,.35)');
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fuente = Math.round(clamp(22 * zoom, 16, 28));
    ctx.font = `900 ${fuente}px Montserrat, "Arial Black", sans-serif`;
    // de regreso, la estación dice dónde parar
    if (S.vuelta !== null && S.vuelta <= 12 && S.est.carga >= 0) {
      const q = aPantalla(ESTACION.x, ESTACION.y), y = q.y - 70 - (quieto ? 0 : Math.abs(Math.sin(S.est.t * 3)) * 8);
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(30,15,40,.85)'; ctx.strokeText('¡Para aquí!', q.x, y);
      ctx.fillStyle = '#F2E14B'; ctx.fillText('¡Para aquí!', q.x, y);
    }
    // nombres de los lugares y de las calles, derechos en la pantalla
    const cerca = (o) => Math.abs(o.x - S.cam.x) < R && Math.abs(o.y - S.cam.y) < R;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,15,40,.5)'; ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = '700 12px Montserrat, sans-serif';
    for (const l of letreros) if (cerca(l)) { const q = aPantalla(l.x, l.y); ctx.strokeText(l.t, q.x, q.y); ctx.fillText(l.t, q.x, q.y); }
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(30,15,40,.6)'; ctx.fillStyle = '#F6EBD3';
    ctx.font = `900 ${Math.round(clamp(18 * zoom, 14, 22))}px Montserrat, sans-serif`;
    for (const l of rotulos) if (cerca(l)) { const q = aPantalla(l.x, l.y); ctx.strokeText(l.t.toUpperCase(), q.x, q.y); ctx.fillText(l.t.toUpperCase(), q.x, q.y); }
    ctx.font = `900 ${fuente}px Montserrat, "Arial Black", sans-serif`;
    const lugares = []; // para que dos textos no caigan uno encima del otro
    for (const t of S.textos) {
      const q = aPantalla(t.x, t.y), w = ctx.measureText(t.t).width;
      let y = q.y - t.vida * 34;
      for (let i = 0; i < 6 && lugares.some((o) => Math.abs(o.x - q.x) < (o.w + w) / 2 && Math.abs(o.y - y) < fuente * 1.1); i++) y -= fuente * 1.1;
      lugares.push({ x: q.x, y, w });
      ctx.globalAlpha = 1 - Math.max(0, t.vida - t.dur * 0.6) / (t.dur * 0.4);
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(30,15,40,.85)'; ctx.strokeText(t.t, q.x, y);
      ctx.fillStyle = t.color; ctx.fillText(t.t, q.x, y);
    }
    ctx.globalAlpha = 1;
    if (rapidez > 0.05 && !quieto) rayas();
    medidorDiversion();
    zonasTactiles();
    // flechas hacia la estación fuera de pantalla
    if (S.corriendo) flechas();
  }

  function trazo(l) {
    ctx.beginPath(); ctx.moveTo(l.p[0].x, l.p[0].y);
    for (let n = 1; n < l.p.length; n++) ctx.lineTo(l.p[n].x, l.p[n].y);
    ctx.stroke();
  }
  function poli(p) {
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
    for (let n = 1; n < p.length; n++) ctx.lineTo(p[n].x, p[n].y);
    ctx.closePath();
  }
  function arbol(a) {
    ctx.fillStyle = '#2F6B33'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 7); ctx.fill();
    ctx.fillStyle = '#3F8A40'; ctx.beginPath(); ctx.arc(a.x - a.r * 0.2, a.y - a.r * 0.2, a.r * 0.68, 0, 7); ctx.fill();
  }
  // Casita de teja, girada como su calle
  function teja(c) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
    const x = -c.w / 2, y = -c.h / 2;
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(x + 4, y + 5, c.w, c.h);
    ctx.fillStyle = c.teja; ctx.fillRect(x, y, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (c.horiz) { for (let yy = y + 10; yy < y + c.h; yy += 10) { ctx.moveTo(x, yy); ctx.lineTo(x + c.w, yy); } }
    else { for (let xx = x + 10; xx < x + c.w; xx += 10) { ctx.moveTo(xx, y); ctx.lineTo(xx, y + c.h); } }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath();
    if (c.horiz) { ctx.moveTo(0, y); ctx.lineTo(0, y + c.h); } else { ctx.moveTo(x, 0); ctx.lineTo(x + c.w, 0); }
    ctx.stroke();
    ctx.restore();
  }
  // Los edificios de OpenStreetMap: techos de teja; las iglesias, blancas y con su cruz
  function edificio(e) {
    poli(e.p);
    ctx.fillStyle = e.iglesia ? '#F4EFE6' : e.teja; ctx.fill();
    ctx.strokeStyle = e.iglesia ? '#B8AE9C' : 'rgba(0,0,0,.22)'; ctx.lineWidth = 3; ctx.stroke();
    if (e.iglesia && e.caja.w * e.caja.h > 30000) {
      ctx.fillStyle = '#B8AE9C'; ctx.fillRect(e.x - 4, e.y - 20, 8, 40); ctx.fillRect(e.x - 14, e.y - 9, 28, 8);
    }
  }
  // Parques y campos que no son el de la estación
  function verde(v) {
    poli(v.p);
    ctx.fillStyle = v.campo ? '#7E9C45' : '#6DB356'; ctx.fill();
    if (v.campo) { // surcos
      const b = v.caja;
      ctx.save(); poli(v.p); ctx.clip();
      ctx.strokeStyle = 'rgba(60,80,30,.35)'; ctx.lineWidth = 6; ctx.beginPath();
      for (let x = b.x - b.h; x < b.x + b.w; x += 26) { ctx.moveTo(x, b.y); ctx.lineTo(x + b.h, b.y + b.h); }
      ctx.stroke(); ctx.restore();
    } else for (const a of v.arboles) arbol(a);
  }

  // El parque de la estación: pasto, caminos, árboles y el kiosco en el medio
  function parqueDibujo() {
    const P = parque;
    poli(P.p); ctx.fillStyle = '#6DB356'; ctx.fill();
    ctx.save(); poli(P.p); ctx.clip();
    ctx.strokeStyle = '#D9CCAE'; ctx.lineWidth = 26; ctx.lineCap = 'butt';
    ctx.beginPath(); // caminos del kiosco a cada lado, y en anillo
    for (let k = 0; k < P.p.length; k++) {
      const a = P.p[k], b = P.p[(k + 1) % P.p.length];
      if (Math.hypot(b.x - a.x, b.y - a.y) < 200) continue;
      ctx.moveTo(P.x, P.y); ctx.lineTo((a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(P.x, P.y, P.r * 0.5, 0, 7); ctx.stroke();
    ctx.restore();
    for (const a of P.arboles) arbol(a);
    // kiosco
    const o = { x: P.x, y: P.y, r: 56 };
    ctx.fillStyle = '#F1ECE2'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#1B5FAA'; ctx.beginPath();
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4 + Math.PI / 8; ctx.lineTo(o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#F2E14B'; ctx.lineWidth = 3; ctx.beginPath();
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4 + Math.PI / 8; ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r); }
    ctx.stroke();
    ctx.fillStyle = '#D6382B'; ctx.beginPath(); ctx.arc(o.x, o.y, 8, 0, 7); ctx.fill();
  }

  // Puestos de la feria en la calle: toldos de colores uno tras otro (hacen la calle angosta)
  function puesto(p) {
    const n = Math.max(1, Math.round(p.largo / 80)), tam = p.largo / n;
    const cols = ['#E8458B', '#F2B33D', '#5FB4E6', '#8BD43B', '#B46DE0', '#D6382B'];
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    for (let k = 0; k < n; k++) {
      const x = k * tam, y = -p.hondo / 2, w = tam - 6, hh = p.hondo;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 4, y + 5, w, hh);
      ctx.fillStyle = '#F1ECE2'; ctx.fillRect(x, y, w, hh);
      const c1 = cols[(k + (p.lado > 0 ? 2 : 0)) % cols.length];
      for (let r = 0; r < 4; r++) { ctx.fillStyle = r % 2 ? '#fff' : c1; ctx.fillRect(x + r * w / 4, y, w / 4 + 0.5, hh); }
    }
    ctx.restore();
  }
  // Calle cerrada: valla de rayas rojas y blancas con conos a los lados. Las del borde del pueblo llevan letrero.
  function cierre(c, borde) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
    const largo = c.largo, ancho = 18;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-largo / 2 + 4, -ancho / 2 + 5, largo, ancho);
    for (let k = 0; k < largo / 18; k++) { ctx.fillStyle = k % 2 ? '#fff' : '#D6382B'; ctx.fillRect(-largo / 2 + k * 18, -ancho / 2, Math.min(18, largo - k * 18), ancho); }
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
      ctx.fillStyle = '#F2B33D'; ctx.beginPath(); ctx.arc(sx * (largo / 2 - 26), sy * 22, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx * (largo / 2 - 26), sy * 22, 3.5, 0, 7); ctx.fill();
    }
    if (borde) { // letrero mirando hacia adentro del pueblo (+y local es hacia adentro)
      ctx.fillStyle = '#F2E14B'; rr(-58, 34, 116, 30, 6); ctx.fill();
      ctx.strokeStyle = '#24150F'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#24150F'; ctx.font = '900 15px Montserrat, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('CERRADO', 0, 49); // se lee derecho al llegar desde adentro
    }
    ctx.restore();
  }

  // Redondel: calzada redonda, carril pintado e isla con flores (la vereda y la calzada van con las calles)
  function redondel(r) {
    ctx.fillStyle = '#56565C'; ctx.beginPath(); ctx.arc(r.x, r.y, r.R, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(242,225,75,.5)'; ctx.lineWidth = 3; ctx.setLineDash([22, 22]);
    ctx.beginPath(); ctx.arc(r.x, r.y, (r.isla + r.R) / 2 + 6, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#CFC6B4'; ctx.beginPath(); ctx.arc(r.x, r.y, r.isla, 0, 7); ctx.fill();
    ctx.fillStyle = '#5E9E4C'; ctx.beginPath(); ctx.arc(r.x, r.y, r.isla - 9, 0, 7); ctx.fill();
    const flores = ['#E8458B', '#F2E14B', '#F6EBD3', '#D6382B', '#7E3592'];
    for (let n = 0; n < 14; n++) { const a = n / 14 * Math.PI * 2; ctx.fillStyle = flores[n % flores.length]; ctx.beginPath(); ctx.arc(r.x + Math.cos(a) * (r.isla - 22), r.y + Math.sin(a) * (r.isla - 22), 6, 0, 7); ctx.fill(); }
    // monumento
    ctx.fillStyle = '#B8B2A6'; ctx.beginPath(); ctx.arc(r.x, r.y, 20, 0, 7); ctx.fill();
    ctx.fillStyle = '#8F897E'; ctx.beginPath(); ctx.arc(r.x, r.y, 11, 0, 7); ctx.fill();
  }

  // La estación: bahía pintada en el carril del lado del parque, boletería y la fila en la vereda.
  // Se dibuja girada como la calle: x hacia donde sale el gusanito, +y hacia el parque.
  function estacionDibujo() {
    const e = S.est, k = S.cab, cerca = Math.hypot(k.x - ESTACION.x, k.y - ESTACION.y) < 500;
    ctx.save(); ctx.translate(ESTACION.x, ESTACION.y); ctx.rotate(ESTACION.ang);
    ctx.strokeStyle = e.carga > 0 ? '#8BD43B' : '#F2E14B'; ctx.lineWidth = 5; ctx.setLineDash([14, 10]);
    rr(-260, -62, 520, 92, 16); ctx.stroke(); ctx.setLineDash([]);
    if (e.carga > 0) { ctx.fillStyle = 'rgba(139,212,59,.35)'; rr(-260, -62, 520 * Math.min(1, e.carga / 0.6), 92, 16); ctx.fill(); }
    ctx.font = '900 26px Montserrat, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(242,225,75,.55)'; ctx.fillText('ESTACIÓN', 0, -40);
    // la fila, en la vereda, hacia atrás de la boletería
    e.fila.forEach((p, i) => {
      const col = i % 16, fila = (i / 16) | 0;
      const brinco = quieto ? 0 : Math.abs(Math.sin(e.t * 5 + i)) * 2.5;
      persona(-40 - col * 19, 52 + fila * 20 + brinco, p, 0.95, 0, false, cerca);
    });
    for (const q of S.seVan) { ctx.globalAlpha = Math.max(0, 1 - q.t / 3); persona(q.lx, q.ly + q.t * 30, q.p, 0.95, 0, false, false); }
    ctx.globalAlpha = 1;
    // boletería con su letrero
    const bx = 10;
    ctx.fillStyle = '#F1ECE2'; rr(bx, 46, 56, 40, 6); ctx.fill();
    for (let n = 0; n < 4; n++) { ctx.fillStyle = ['#E8458B', '#F2E14B', '#8BD43B', '#5FB4E6'][n]; ctx.fillRect(bx + n * 14, 84, 14, 10); }
    ctx.fillStyle = '#E8458B'; rr(bx - 4, 56, 64, 18, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 11px Montserrat, sans-serif';
    ctx.fillText('GUSANITO', bx + 28, 65);
    ctx.restore();
  }

  function persona(x, y, p, esc, rot, tumbado, saluda) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(esc, esc);
    // hombros
    ctx.fillStyle = p.ropa; ctx.beginPath(); ctx.ellipse(0, 3, 10, 7, 0, 0, 7); ctx.fill();
    if (saluda && !quieto) { const a = Math.sin(performance.now() / 120 + x) * 0.6; ctx.strokeStyle = p.piel; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(8 + Math.cos(-1.2 + a) * 10, Math.sin(-1.2 + a) * 10); ctx.stroke(); }
    // cabeza
    ctx.fillStyle = p.piel; ctx.beginPath(); ctx.arc(0, -2, 6, 0, 7); ctx.fill();
    if (p.sombrero) { ctx.fillStyle = p.sombrero; ctx.beginPath(); ctx.arc(0, -3, 8.5, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(0, -3, 4.5, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = p.pelo; ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI, 0); ctx.fill(); }
    if (tumbado) { ctx.strokeStyle = '#F2E14B'; ctx.lineWidth = 1.5; for (let n = 0; n < 3; n++) { const a = performance.now() / 300 + n * 2.1; ctx.beginPath(); ctx.arc(Math.cos(a) * 10, -6 + Math.sin(a) * 4, 2, 0, 7); ctx.stroke(); } }
    ctx.restore();
  }

  function caminante(c) {
    ctx.save(); ctx.translate(c.px, c.py);
    const a = Math.atan2(c.dy || 0, c.dx || 1);
    if (c.tipo === 'perro') {
      ctx.rotate(c.ang);
      const corre = c.modo !== 'pasea';
      const paso = quieto || c.parado > 0 ? 0 : Math.sin(c.t * (corre ? 32 : 14)) * (corre ? 3 : 2);
      if (c.ladra > 0) { // ladridos: rayitas delante del hocico
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        for (const n of [0, 1]) { ctx.beginPath(); ctx.arc(18, 0, 9 + n * 6, -0.6, 0.6); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(2, 3, 14, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8A5A2B'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(13, paso * 0.3, 5.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#5A3A22'; ctx.beginPath(); ctx.ellipse(12, -5, 3, 2, 0.4, 0, 7); ctx.ellipse(12, 5, 3, 2, -0.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#8A5A2B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-19, paso * 2); ctx.stroke();
    } else {
      // tres danzantes en fila, con sus penachos de colores
      ctx.rotate(a);
      for (let n = 0; n < 3; n++) {
        const bx = -n * 26, by = quieto ? 0 : Math.sin(c.t * 5 + n) * 4;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(quieto ? 0 : Math.sin(c.t * 3 + n) * 0.2);
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(3, 3, 13, 0, 7); ctx.fill();
        // penacho: abanico
        const cols = ['#D6382B', '#F2E14B', '#1B5FAA', '#2F7D4A', '#E8458B', '#F6EBD3'];
        for (let r = 0; r < 6; r++) { ctx.fillStyle = cols[r]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 17, Math.PI * 0.55 + r * 0.15 - 0.45, Math.PI * 0.55 + (r + 1) * 0.15 - 0.45 + 0.4); ctx.fill(); }
        ctx.fillStyle = '#F6EBD3'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#B97D55'; ctx.beginPath(); ctx.arc(3, 0, 5, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function sombra(x, y, ang, l, a) {
    ctx.save(); ctx.translate(x + 6, y + 8); ctx.rotate(ang);
    rr(-l / 2, -a / 2, l, a, a / 2.4); ctx.fill(); ctx.restore();
  }

  function barras() {
    const k = S.cab;
    let hx = k.x - Math.cos(k.ang) * C.cabezaL / 2, hy = k.y - Math.sin(k.ang) * C.cabezaL / 2;
    ctx.strokeStyle = '#2A2A2E'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (const v of S.vagones) {
      const fx = v.fx, fy = v.fy; // la lanza llega al eje delantero
      const f = v.fatiga || 0;
      ctx.strokeStyle = f > 0.5 ? '#E8458B' : f > 0.2 ? '#F2B33D' : '#2A2A2E';
      ctx.lineWidth = 5 + 3 * Math.min(1, f);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy); ctx.stroke();
      hx = v.x - Math.cos(v.ang) * C.vagonL / 2; hy = v.y - Math.sin(v.ang) * C.vagonL / 2;
    }
  }

  // las llantas de adelante giran (con el volante en la cabeza, con la lanza en los vagones)
  function llantas(l, a, giro = 0) {
    ctx.fillStyle = '#1C1C1F';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      ctx.save(); ctx.translate(sx * l * 0.28, sy * (a / 2) + (sy < 0 ? -2 : 2));
      if (sx > 0) ctx.rotate(giro);
      rr(-8, -4, 16, 8, 3); ctx.fill(); ctx.restore();
    }
  }

  function vagon(v, ultimo) {
    const l = C.vagonL, a = C.vagonA, t = performance.now() / 1000;
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.ang);
    // ladeo visual: el cuerpo se inclina hacia afuera cuando se mece
    const ladeo = clamp(-Math.sign(v.gir) * v.g / 700, -1, 1);
    llantas(l, a, vuelta((v.lz ?? v.ang) - v.ang));
    ctx.translate(0, ladeo * 3);
    ctx.fillStyle = v.pal.borde; rr(-l / 2, -a / 2, l, a, a / 2.4); ctx.fill();
    ctx.fillStyle = v.pal.cuerpo; rr(-l / 2 + 3, -a / 2 + 3, l - 6, a - 6, a / 2.8); ctx.fill();
    // lunares
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    for (const [px, py] of [[-18, -14], [14, 15], [20, -12], [-10, 16]]) { ctx.beginPath(); ctx.arc(px, py, 2.5, 0, 7); ctx.fill(); }
    // espiral en la cola del último
    if (ultimo) {
      const col = ['#E8458B', '#F2B33D', '#F2E14B', '#8BD43B', '#5FB4E6', '#7E3592'];
      for (let n = 0; n < col.length; n++) { ctx.fillStyle = col[n]; ctx.beginPath(); ctx.ellipse(-l / 2 + 2, 0, 9 - n * 1.3, 17 - n * 2.6, 0, Math.PI / 2, Math.PI * 1.5); ctx.fill(); }
    }
    if (ultimo && S.parlante) { // parlante: una caja con dos bocinas en el centro del último vagón
      ctx.fillStyle = '#24150F'; rr(-5, -7, 10, 14, 2); ctx.fill();
      ctx.fillStyle = '#5FB4E6'; ctx.beginPath(); ctx.arc(0, -3.5, 2.5, 0, 7); ctx.arc(0, 3.5, 2.5, 0, 7); ctx.fill();
    }
    // asientos y gente (2×2)
    const pos = [[10, -9], [10, 9], [-12, -9], [-12, 9]];
    for (let s = 0; s < v.asientos.length; s++) {
      const [px, py] = pos[s];
      ctx.fillStyle = 'rgba(0,0,0,.22)'; rr(px - 9, py - 8, 18, 16, 4); ctx.fill();
      const p = v.asientos[s];
      if (p) {
        // se mecen con el vagón
        const meneo = quieto ? 0 : ladeo * 3 + Math.sin(t * 8 + s) * Math.min(1, v.g / 300) * 1.5;
        ctx.save(); ctx.translate(px, py + meneo); ctx.rotate(Math.PI / 2);
        persona(0, 0, p, 0.85, 0, false, p.feliz || v.g > 320);
        ctx.restore();
        // cara: corazón si feliz, gotita si asustado
        if (p.feliz) { ctx.fillStyle = '#E8458B'; corazon(px + 6, py - 8, 4); }
        else if (p.asustado || p.miedo > 0.6) { ctx.fillStyle = '#9CD6FF'; ctx.beginPath(); ctx.arc(px + 6, py - 8, 3, 0, 7); ctx.fill(); }
        // barrita de diversión
        ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px - 8, py + 8, 16, 3);
        ctx.fillStyle = p.miedo > 0.6 ? '#9CD6FF' : '#F2E14B'; ctx.fillRect(px - 8, py + 8, 16 * p.div, 3);
      }
    }
    ctx.restore();
    // toldo: más arriba, así que se ve más ladeado y medio transparente
    ctx.save(); ctx.translate(v.x - ladeo * Math.sin(v.ang) * 6, v.y + ladeo * Math.cos(v.ang) * 6); ctx.rotate(v.ang);
    toldo(l - 6, a + 8, v.pal.toldo, 0.5);
    ctx.restore();
  }

  // El toldo se ve solo por los bordes, con flecos, para no tapar a la gente
  function toldo(l, a, cols, alfa) {
    const n = cols.length * 2, w = l / n;
    ctx.globalAlpha = alfa * 0.35;
    for (let i = 0; i < n; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-l / 2 + i * w, -a / 2, w + 0.5, a); }
    ctx.globalAlpha = 1;
    for (const sy of [-1, 1]) for (let i = 0; i < n; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-l / 2 + i * w, sy > 0 ? a / 2 - 7 : -a / 2, w + 0.5, 7); }
    // borde ondulado
    for (const sy of [-1, 1]) for (let i = 0; i < n; i++) { ctx.fillStyle = cols[(i + 1) % cols.length]; ctx.beginPath(); ctx.arc(-l / 2 + i * w + w / 2, sy * a / 2, w / 2, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  function corazon(x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r);
    ctx.bezierCurveTo(x - r * 2, y - r * 0.2, x - r * 0.6, y - r * 1.8, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.8, x + r * 2, y - r * 0.2, x, y + r);
    ctx.fill();
  }

  function cabeza() {
    const k = S.cab, l = C.cabezaL, a = C.cabezaA, t = performance.now() / 1000;
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.ang);
    llantas(l, a, k.giro * C.volanteMax);
    // cuerpo: escarabajo verde limón con franja fucsia
    ctx.fillStyle = '#E8458B'; rr(-l / 2, -a / 2, l, a, a / 2); ctx.fill();
    ctx.fillStyle = '#8BD43B'; rr(-l / 2 + 3, -a / 2 + 3, l - 6, a - 6, a / 2.3); ctx.fill();
    // flores y estrellas pintadas
    ctx.fillStyle = '#F2E14B';
    for (const [px, py] of [[-26, -13], [-20, 12]]) estrella(px, py, 4);
    // chofer
    ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(-24, -15, 24, 30, 6); ctx.fill();
    persona(-12, -6, CHOFER, 0.9, Math.PI / 2, false, false);
    // parabrisas
    ctx.fillStyle = '#BFE6FF'; rr(2, -15, 8, 30, 3); ctx.fill();
    // capó con la cara
    ctx.fillStyle = '#9BE04B'; rr(12, -a / 2 + 5, l / 2 - 14, a - 10, 12); ctx.fill();
    // ojos con pestañas
    const parpadeo = !quieto && (t % 4) < 0.12 ? 0.2 : 1;
    for (const sy of [-1, 1]) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(22, sy * 10, 7, 8 * parpadeo, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#24150F'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#1B5FAA'; ctx.beginPath(); ctx.arc(24 + k.giro * 0, sy * 10 + k.giro * 3, 4 * parpadeo, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(25, sy * 10 + k.giro * 3, 2 * parpadeo, 0, 7); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
      for (let n = -2; n <= 2; n++) { const an = n * 0.35; ctx.beginPath(); ctx.moveTo(18 + Math.cos(Math.PI + an) * -1, sy * 10 + sy * 7); ctx.lineTo(16 + n * 2.5, sy * 10 + sy * 12); ctx.stroke(); }
    }
    // labios rojos en la trompa
    ctx.fillStyle = '#D6382B'; ctx.beginPath(); ctx.ellipse(l / 2 - 3, 0, 5, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7A1410'; ctx.fillRect(l / 2 - 4, -10, 2, 20);
    // antenas que se mueven con la vuelta
    for (const sy of [-1, 1]) {
      const bam = quieto ? 0 : Math.sin(t * 6 + sy) * 3 - k.giro * 8;
      ctx.strokeStyle = '#E8458B'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(14, sy * 6); ctx.quadraticCurveTo(30, sy * 22 + bam, 42, sy * 26 + bam); ctx.stroke();
      ctx.fillStyle = '#F2E14B'; ctx.beginPath(); ctx.arc(42, sy * 26 + bam, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#E8458B'; ctx.beginPath(); ctx.arc(43, sy * 26 + bam - 1, 2, 0, 7); ctx.fill();
    }
    // acelerando: llamitas en los dos escapes de atrás
    if (S.turbo.activo) {
      const fl = quieto ? 1 : 0.75 + Math.random() * 0.5;
      for (const sy of [-1, 1]) {
        ctx.fillStyle = '#F2B33D'; ctx.beginPath(); ctx.moveTo(-l / 2 + 2, sy * (a / 2 - 9) - 4); ctx.lineTo(-l / 2 - 16 * fl, sy * (a / 2 - 7)); ctx.lineTo(-l / 2 + 2, sy * (a / 2 - 9) + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFF1A8'; ctx.beginPath(); ctx.moveTo(-l / 2 + 2, sy * (a / 2 - 9) - 2); ctx.lineTo(-l / 2 - 8 * fl, sy * (a / 2 - 8)); ctx.lineTo(-l / 2 + 2, sy * (a / 2 - 9) + 2); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
    // toldo del chofer
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.ang); ctx.translate(-14, 0);
    toldo(40, a + 6, ['#E8458B', '#F2E14B', '#5FB4E6', '#8BD43B'], 0.5);
    ctx.restore();
  }
  const CHOFER = { ropa: '#D6382B', pelo: '#111', piel: '#B97D55', sombrero: null };

  // Rayas de velocidad a los costados de la pantalla mientras va más rápido que lo normal
  function rayas() {
    const t = performance.now() / 1000, banda = Math.min(110, W * 0.16);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const lado = i % 2 ? 1 : -1, x = lado < 0 ? 8 + (i * 53) % banda : W - 8 - (i * 53) % banda;
      const largo = 50 + 50 * rapidez, y = ((t * (700 + i * 23) + i * 197) % (H + largo)) - largo;
      ctx.globalAlpha = 0.35 * rapidez;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + largo); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function estrella(x, y, r) {
    ctx.beginPath();
    for (let n = 0; n < 10; n++) { const a = n * Math.PI / 5 - Math.PI / 2, rr2 = n % 2 ? r / 2.2 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fill();
  }

  function banderin(b) {
    const cols = ['#D6382B', '#F2E14B', '#1B5FAA', '#E8458B', '#8BD43B', '#F6EBD3'];
    const dx = b.x2 - b.x1, dy = b.y2 - b.y1, l = Math.hypot(dx, dy), n = Math.floor(l / 22);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    const ux = dx / l, uy = dy / l, px = -uy, py = ux;
    const t = performance.now() / 1000;
    for (let i = 1; i < n; i++) {
      const x = b.x1 + ux * i * 22, y = b.y1 + uy * i * 22;
      const vaiven = quieto ? 0 : Math.sin(t * 3 + i) * 2;
      ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(x - ux * 7, y - uy * 7); ctx.lineTo(x + ux * 7, y + uy * 7); ctx.lineTo(x + px * (12 + vaiven), y + py * (12 + vaiven)); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Medidor de diversión pegado al gusanito (a la derecha de la cabeza): carita, barra y la marca del 75 %
  function medidorDiversion() {
    if (S.vuelta === null || S.fin || S.decidiendo) return;
    const avg = diversion();
    if (avg === null) return;
    const x = W / 2 + Math.max(58, 70 * zoom), alto = 104, ancho = 12, top = H * piv - alto / 2;
    const col = avg >= 0.995 ? '#F2E14B' : avg >= C.minDiv ? '#8BD43B' : '#F2B33D';
    ctx.fillStyle = 'rgba(20,12,30,.55)'; rr(x - 11, top - 32, ancho + 22, alto + 56, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(x, top, ancho, alto, 6); ctx.fill();
    const hh = Math.max(ancho, alto * avg);
    ctx.fillStyle = col; rr(x, top + alto - hh, ancho, hh, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 5, top + alto * (1 - C.minDiv) - 1, ancho + 10, 2); // 75 %
    // carita: más sonrisa, más diversión
    const fx = x + ancho / 2, fy = top - 16;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(fx, fy, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#24150F'; ctx.beginPath(); ctx.arc(fx - 3.5, fy - 2.5, 1.6, 0, 7); ctx.arc(fx + 3.5, fy - 2.5, 1.6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#24150F'; ctx.lineWidth = 1.8; ctx.beginPath();
    ctx.moveTo(fx - 5, fy + 3); ctx.quadraticCurveTo(fx, fy + 3 + (avg - 0.5) * 9, fx + 5, fy + 3); ctx.stroke();
    ctx.font = '800 12px Montserrat, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText(Math.round(avg * 100) + '%', fx, top + alto + 13);
  }

  // En pantallas táctiles: cada mitad de la pantalla gira para su lado. Se marca la mitad que estás tocando.
  function zonasTactiles() {
    if (!tactil || !S.corriendo) return;
    for (const lado of ['izq', 'der']) {
      const activo = entrada[lado], x0 = lado === 'izq' ? 0 : W / 2;
      if (activo) {
        const g = ctx.createLinearGradient(lado === 'izq' ? 0 : W, 0, W / 2, 0);
        g.addColorStop(0, 'rgba(242,225,75,.22)'); g.addColorStop(1, 'rgba(242,225,75,0)');
        ctx.fillStyle = g; ctx.fillRect(x0, 0, W / 2, H);
      }
      const cx = lado === 'izq' ? 30 : W - 30, cy = H * 0.8, d = lado === 'izq' ? -1 : 1;
      ctx.globalAlpha = activo ? 0.95 : 0.35; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(cx + d * 12, cy); ctx.lineTo(cx - d * 8, cy - 14); ctx.lineTo(cx - d * 8, cy + 14); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Flecha hacia la estación: gira alrededor del gusanito, por fuera del medidor (así no tapa el HUD ni el
  // freno ni la cola). Parpadea cuando ya hay que volver.
  function flechas() {
    if (Math.hypot(ESTACION.x - S.cab.x, ESTACION.y - S.cab.y) < 420) return; // ya está aquí cerca
    const q = aPantalla(ESTACION.x, ESTACION.y), cx = W / 2, cy = H * piv;
    const a = Math.atan2(q.y - cy, q.x - cx), r = Math.min(150, Math.min(W, H) * 0.34);
    // si la estación queda detrás, la flecha se pone a un costado de la cola (sin dejar de apuntarle)
    let b = a; const atras = vuelta(a - Math.PI / 2);
    if (Math.abs(atras) < 0.9) b = Math.PI / 2 + (atras < 0 ? -0.9 : 0.9);
    const ex = cx + Math.cos(b) * r, ey = cy + Math.sin(b) * r;
    const urge = S.vuelta !== null && S.vuelta <= C.ventana;
    const s = urge && !quieto ? 1 + Math.abs(Math.sin(S.est.t * 6)) * 0.25 : 1;
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.scale(s * 1.2, s * 1.2);
    ctx.fillStyle = urge && S.vuelta < 0 ? '#FF8A7A' : '#F2E14B'; ctx.strokeStyle = '#24150F'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -12); ctx.lineTo(-3, 0); ctx.lineTo(-8, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.font = '800 11px Montserrat, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,15,40,.8)'; ctx.fillStyle = '#fff';
    const lx = cx + Math.cos(b) * (r + 30), ly = cy + Math.sin(b) * (r + 30);
    ctx.strokeText('Estación', lx, ly); ctx.fillText('Estación', lx, ly);
  }

  // ─── HUD ───────────────────────────────────────────────────────────
  const h = { objetivo: $('#h-objetivo'), tiempo: $('#h-tiempo-bar'), plata: $('#h-plata'), largo: $('#h-largo'), vueltas: $('#h-vueltas'), comb: $('#h-comb'), vidas: $('#h-vidas') };
  const reloj = (x) => Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
  let hudCache = '';
  function actualizarHud(forzar) {
    const avg = diversion() ?? 0, hay = aBordo() > 0;
    const vt = S.vuelta, seg = vt === null ? -1 : Math.ceil(vt);
    const clave = [S.vagones.length, S.plata.toFixed(2), Math.round(avg * 100), hay, seg, S.est.fila.length, S.vidas, S.viajes, S.comb, S.decidiendo].join('|');
    if (clave === hudCache && !forzar) return;
    hudCache = clave;
    // el objetivo: qué hacer ahora, en pocas palabras
    let txt, clase = '';
    if (S.decidiendo) txt = 'En la estación';
    else if (vt === null) txt = S.est.fila.length ? 'Estaciónate en el parque' : 'Esperando gente en la fila';
    else if (vt < 0) { txt = '¡Tarde! La fila se va'; clase = 'mal'; }
    else if (hay && S.giros >= C.mareoDesde) { txt = `¡Se marean! Sal de las vueltas · ${reloj(seg)}`; clase = 'mal'; }
    else if (hay && avg >= 0.995) { txt = yaPuedenBajar() ? `¡Listos! A la estación · ${reloj(seg)}` : `¡100 %! Sigue paseándolos · ${reloj(seg)}`; clase = 'listo'; }
    else if (vt <= C.ventana) { txt = `¡Vuelve a la estación! · ${reloj(seg)}`; clase = avg >= C.minDiv ? 'bien' : 'mal'; }
    else if (hay && avg >= C.minDiv) { txt = `¡Bien! Sigue así · ${reloj(seg)}`; clase = 'bien'; }
    else txt = `Diviértelos · ${reloj(seg)}`;
    h.objetivo.textContent = txt; h.objetivo.className = 'objetivo ' + clase;
    h.tiempo.style.width = vt === null ? '0%' : (clamp(vt / C.vuelta, 0, 1) * 100) + '%';
    h.tiempo.classList.toggle('poco', vt !== null && vt <= C.ventana);
    h.plata.textContent = plata(S.plata);
    h.largo.textContent = S.vagones.length;
    h.vueltas.textContent = S.viajes;
    h.comb.textContent = '●'.repeat(S.comb) + '○'.repeat(Math.max(0, C.combustible - S.comb));
    h.comb.classList.toggle('mal', S.comb <= 0);
    h.vidas.textContent = '♥'.repeat(S.vidas) + '♡'.repeat(Math.max(0, C.vidas - S.vidas));
  }

  // El botón Acelera se ilumina mientras lo pisas
  const bTurbo = $('#m-turbo');
  let turboCache = null;
  function hudTurbo() {
    if (S.turbo.activo === turboCache) return;
    turboCache = S.turbo.activo;
    bTurbo.classList.toggle('activo', S.turbo.activo);
  }

  // ─── Capas ─────────────────────────────────────────────────────────
  const capas = { inicio: $('#c-inicio'), pausa: $('#c-pausa'), fin: $('#c-fin'), estacion: $('#c-estacion') };
  const hud = $('.hud-juego');
  // Con una capa abierta el HUD queda inerte (ni foco ni clics) y el foco va al botón principal de la
  // capa; así Enter y Espacio siempre hacen lo que dice la capa, y no pausan ni apagan el sonido.
  function mostrar(cual) {
    for (const [k, el] of Object.entries(capas)) el.hidden = k !== cual;
    hud.inert = cual !== null;
    if (cual) (capas[cual].querySelector('[data-foco]') || capas[cual].querySelector('button'))?.focus({ preventScroll: true });
    else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }
  function arrancar() { if (S.corriendo || S.decidiendo) return; audio(); mostrar(null); S.corriendo = true; musica(true); }
  function pausar() { if (!S.corriendo) return; S.corriendo = false; mostrar('pausa'); musica(false); }
  let mejorLargo = 0, mejorVueltas = 0;
  function terminar(motivo) {
    if (S.fin) return;
    S.corriendo = false; S.fin = true; S.decidiendo = false; S.motivo = motivo; musica(false); sonar('fin');
    // dos récords: el gusanito más largo (pico) y más vueltas; en memoria y, si se puede, en el navegador
    const largo = S.pico, vueltas = S.viajes;
    let g1 = 0, g2 = 0;
    try { g1 = +localStorage.getItem('gusanito.largo') || 0; g2 = +localStorage.getItem('gusanito.vueltas') || 0; } catch { /* sin almacenamiento */ }
    mejorLargo = Math.max(mejorLargo, g1, largo);
    mejorVueltas = Math.max(mejorVueltas, g2, vueltas);
    try { localStorage.setItem('gusanito.largo', mejorLargo); localStorage.setItem('gusanito.vueltas', mejorVueltas); } catch { /* sin almacenamiento */ }
    const vagones = (n) => n + (n === 1 ? ' vagón' : ' vagones');
    const vueltasTxt = (n) => n + (n === 1 ? ' vuelta' : ' vueltas');
    $('#fin-kicker').textContent = motivo === 'golpes' ? 'Se acabaron las vidas' : motivo === 'partio' ? 'La cola se partió' : motivo === 'combustible' ? 'Se quedó sin combustible' : 'Nadie quiere subirse';
    $('#t-fin').textContent = vagones(largo);
    $('#fin-frase').textContent = (motivo === 'golpes'
      ? 'De tanto chocar el gusanito se deshizo. '
      : motivo === 'partio' ? 'Creció tanto que la cola ya no aguantó. '
      : motivo === 'combustible' ? 'Ya no alcanzó para otra vuelta: tus vueltas son tu récord. '
      : 'La fila perdió la confianza: esperaron mucho o no se divirtieron. ')
      + (largo >= 8 ? '¡Un gusanito de fiesta de verdad!' : largo >= 5 ? 'Buen largo: la fila te quiso.' : 'La próxima, más vagones: junta más plata.');
    $('#r-viajes').textContent = vueltasTxt(vueltas); $('#r-redondel').textContent = S.vueltasRedondel;
    $('#r-felices').textContent = S.felices; $('#r-sefueron').textContent = S.seFueron; $('#r-devueltos').textContent = S.devueltos;
    $('#r-asustados').textContent = S.asustados; $('#r-caidos').textContent = S.caidos; $('#r-choques').textContent = S.choques;
    $('#r-total').textContent = plata(S.total);
    $('#r-record').textContent = vagones(mejorLargo); $('#r-record-vueltas').textContent = vueltasTxt(mejorVueltas);
    mostrar('fin');
  }
  $('#b-arrancar').addEventListener('click', arrancar);
  $('#b-seguir').addEventListener('click', arrancar);
  $('#b-reiniciar').addEventListener('click', () => { reiniciar(); arrancar(); });
  $('#b-otra').addEventListener('click', () => { reiniciar(); arrancar(); });
  $('#b-pausa').addEventListener('click', pausar);
  $('#b-vamonos').addEventListener('click', salir);
  $('#tienda').addEventListener('click', (e) => { const b = e.target.closest('[data-item]'); if (b && !b.disabled) comprar(b.dataset.item); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); });

  // ─── Mandos ────────────────────────────────────────────────────────
  const teclas = { ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', ArrowDown: 'freno', KeyS: 'freno', Space: 'freno', ArrowUp: 'turbo', KeyW: 'turbo' };
  addEventListener('keydown', (e) => {
    // solo mientras se juega se le quita a la página Espacio y las flechas (en una capa activan botones y desplazan)
    if (teclas[e.code]) { teclado[teclas[e.code]] = true; if (S.corriendo) e.preventDefault(); }
    if (e.repeat) return; // mantener P, Esc o Enter no alterna una y otra vez
    if (e.code === 'Escape' || e.code === 'KeyP') S.corriendo ? pausar() : (!S.fin && capas.pausa.hidden === false && arrancar());
    // Enter sobre un botón ya lo activa el navegador; aquí solo cuando el foco está en otra parte
    if (e.code === 'Enter' && !S.corriendo && !(e.target instanceof HTMLButtonElement)) { if (S.fin) reiniciar(); arrancar(); }
  });
  addEventListener('keyup', (e) => { if (teclas[e.code]) { teclado[teclas[e.code]] = false; if (S.corriendo) e.preventDefault(); } });
  // al perder el foco (otra ventana, o un clic fuera del iframe en una.red) se suelta todo y se pausa
  addEventListener('blur', () => {
    teclado.izq = teclado.der = teclado.freno = teclado.turbo = false; toques.clear(); botonFreno = botonTurbo = false;
    document.querySelectorAll('.mando.activo').forEach((b) => b.classList.remove('activo'));
    pausar();
  });
  // Toques: toda la mitad izquierda de la pantalla gira a la izquierda; la derecha, a la derecha.
  // Si el dedo cruza al otro lado, cambia de lado. Los dos lados a la vez frenan.
  const ladoDe = (x) => (x < innerWidth / 2 ? 'izq' : 'der');
  lienzo.addEventListener('pointerdown', (e) => {
    if (!S.corriendo) return;
    e.preventDefault();
    toques.set(e.pointerId, ladoDe(e.clientX));
    lienzo.setPointerCapture?.(e.pointerId);
  });
  lienzo.addEventListener('pointermove', (e) => { if (toques.has(e.pointerId)) toques.set(e.pointerId, ladoDe(e.clientX)); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) lienzo.addEventListener(ev, (e) => toques.delete(e.pointerId));
  lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
  // el botón Freno (abajo al centro)
  const bFreno = $('#m-freno');
  bFreno.addEventListener('pointerdown', (e) => { e.preventDefault(); botonFreno = true; bFreno.classList.add('activo'); bFreno.setPointerCapture?.(e.pointerId); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bFreno.addEventListener(ev, () => { botonFreno = false; bFreno.classList.remove('activo'); });
  bFreno.addEventListener('contextmenu', (e) => e.preventDefault());
  // el botón Acelera (junto al freno)
  bTurbo.addEventListener('pointerdown', (e) => { e.preventDefault(); botonTurbo = true; bTurbo.setPointerCapture?.(e.pointerId); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bTurbo.addEventListener(ev, () => { botonTurbo = false; });
  bTurbo.addEventListener('contextmenu', (e) => e.preventDefault());

  // ─── Sonido: banda de pueblo de juguete ────────────────────────────
  let ac = null, maestro = null, conSonido = true, musicaOn = false, sigNota = 0, compas = 0;
  function audio() {
    if (ac) { ac.resume?.(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); maestro = ac.createGain(); maestro.gain.value = conSonido ? 0.5 : 0; maestro.connect(ac.destination); } catch { ac = null; }
  }
  function nota(f, t0, dur, tipo, vol) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(maestro); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // Ritmo de sanjuanito en la menor: bajo en los tiempos, melodía pentatónica
  const LA = 220, semi = (n) => LA * Math.pow(2, n / 12);
  const MELODIA = [12, 15, 17, 15, 12, 10, 12, -1, 12, 15, 17, 19, 17, 15, 12, -1, 19, 17, 15, 17, 15, 12, 10, 12, 10, 7, 10, 12, 10, 7, 0, -1];
  const BAJO = [0, 0, -5, -5, -2, -2, -5, 0];
  function compasMusica() {
    if (!ac || !musicaOn) return;
    const corchea = 60 / 132 / 2;
    while (sigNota < ac.currentTime + 0.25) {
      const i = compas % MELODIA.length;
      const m = MELODIA[i];
      if (m >= 0) nota(semi(m), sigNota, corchea * 0.9, 'square', 0.05);
      if (i % 2 === 0) nota(semi(BAJO[(i / 4 | 0) % BAJO.length] - 12), sigNota, corchea * 1.6, 'triangle', 0.18);
      if (i % 4 === 1 || i % 4 === 3) nota(4000, sigNota, 0.03, 'square', 0.015); // platillo
      sigNota += corchea; compas++;
    }
  }
  setInterval(compasMusica, 100);
  function musica(on) { musicaOn = on && !!ac; if (on && ac) sigNota = ac.currentTime + 0.05; }
  function sonar(cual) {
    if (!ac || !conSonido) return;
    const t = ac.currentTime;
    if (cual === 'feliz') { nota(semi(12), t, 0.12, 'triangle', 0.15); nota(semi(19), t + 0.08, 0.2, 'triangle', 0.15); }
    if (cual === 'plata') { nota(semi(24), t, 0.08, 'square', 0.08); nota(semi(31), t + 0.07, 0.25, 'square', 0.08); }
    if (cual === 'sube') nota(semi(7), t, 0.15, 'triangle', 0.12);
    if (cual === 'choque') { nota(70, t, 0.3, 'sawtooth', 0.25); nota(55, t + 0.05, 0.3, 'square', 0.15); }
    if (cual === 'caida') { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.6); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7); o.connect(g); g.connect(maestro); o.start(t); o.stop(t + 0.75); }
    if (cual === 'ladrido') {
      for (const [d, f] of [[0, 540], [0.17, 480]]) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t + d); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + d + 0.09);
        g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.16, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.11);
        o.connect(g); g.connect(maestro); o.start(t + d); o.stop(t + d + 0.13);
      }
    }
    if (cual === 'tarde') [7, 3, 0].forEach((n, i) => nota(semi(n), t + i * 0.16, 0.22, 'square', 0.07));
    if (cual === 'turbo') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.35);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(g); g.connect(maestro); o.start(t); o.stop(t + 0.45);
    }
    if (cual === 'nivel') [0, 4, 7, 12, 16].forEach((n, i) => nota(semi(n + 12), t + i * 0.09, 0.25, 'square', 0.08));
    if (cual === 'fin') [0, 4, 7, 12].forEach((n, i) => nota(semi(n + 12), t + i * 0.12, 0.3, 'triangle', 0.15));
  }
  const bSon = $('#b-sonido');
  bSon.addEventListener('click', () => {
    conSonido = !conSonido; bSon.setAttribute('aria-pressed', String(conSonido));
    bSon.style.opacity = conSonido ? 1 : 0.5;
    if (maestro) maestro.gain.value = conSonido ? 0.5 : 0;
  });

  // ─── Arranque ──────────────────────────────────────────────────────
  medir();
  reiniciar();
  mostrar('inicio');
  requestAnimationFrame((t) => { ultimo = t; cuadro(t); });

  // Para probar y calibrar desde la consola
  window.gusanito = { C, get S() { return S; }, entrada, teclado, agregar: agregarVagon, NIVELES, nivelDe, MAPA, tramos, redondeles, parque, ESTACION, vallas, casas, sdMundo, abrirEstacion, salir, comprar, subirFila, puestos, get cierres() { return cierres; } };
})();
