/* El gusanito · prototipo arcade
   Vista desde arriba. La cabeza la manejas tú; cada vagón cuelga del de
   adelante con una barra rígida y sus llantas agarran poco de costado, así
   que cuando el chofer zigzaguea el cuerpo se mece y la cola da latigazos.
   Ese deslizamiento lateral es la diversión de los pasajeros… y su miedo. */
(() => {
  'use strict';

  // ─── Ajustes: todo lo que se calibra está aquí ──────────────────────
  const C = {
    bloque: 380, calle: 190, cols: 5, filas: 5,       // el pueblo
    vMax: 250, acel: 150, freno: 480,                  // la cabeza
    giro: 2.5, giroSuave: 9,
    cabezaL: 78, cabezaA: 46,
    vagonL: 58, vagonA: 44, barra: 16,
    agarre: 6,              // cuánto frenan las llantas el deslizamiento lateral (1/s)
    inercia: 0.92,          // cuánto conserva cada vagón su impulso: con 1 la cola se desboca, con 0.85 ya no se mece
    dobla: 1.0,             // ángulo máximo entre un vagón y el de adelante (rad)
    vagonesIni: 3, vagonesMax: 8, asientos: 4, felicesPorVagon: 8,
    // empujón de costado que siente el pasajero (px/s²)
    divDesde: 120,          // desde aquí ya es divertido
    miedoDesde: 650,        // desde aquí asusta
    caidaDesde: 820,        // desde aquí alguien puede salir volando
    ritmoDiv: 0.2,          // qué tan rápido se llena la diversión con meneo fuerte (por segundo)
    tiempo: 120,
    paradasActivas: 4,
    camGiro: 3.5,           // qué tan rápido gira la cámara para seguir a la cabeza (1/s)
    perros: 8,
  };

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
  const ctx = lienzo.getContext('2d');

  // Aleatorio con semilla para que el pueblo sea siempre el mismo
  let semilla = 7;
  const rnd = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const azar = (a, b) => a + Math.random() * (b - a);
  const elige = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const plata = (n) => (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2).replace('.', ',');

  // ─── El pueblo ─────────────────────────────────────────────────────
  const paso = C.bloque + C.calle;
  const ANCHO = C.cols * C.bloque + (C.cols + 1) * C.calle;
  const ALTO = C.filas * C.bloque + (C.filas + 1) * C.calle;
  const PLAZA = { i: 2, j: 2 };
  const bloques = [];
  const obstaculosRedondos = []; // kiosco y árboles de la plaza
  for (let j = 0; j < C.filas; j++) {
    for (let i = 0; i < C.cols; i++) {
      const x = C.calle + i * paso, y = C.calle + j * paso;
      const esPlaza = i === PLAZA.i && j === PLAZA.j;
      const b = { x, y, w: C.bloque, h: C.bloque, plaza: esPlaza, casas: [] };
      if (!esPlaza) {
        // 3×3 lotes: el del centro es patio con árbol
        const l = C.bloque / 3;
        for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) {
          if (a === 1 && c === 1) { b.patio = { x: x + l, y: y + l, w: l, h: l }; continue; }
          b.casas.push({
            x: x + c * l + 4, y: y + a * l + 4, w: l - 8, h: l - 8,
            teja: ['#B5543A', '#C96A43', '#A9472F', '#D07A4E'][(rnd() * 4) | 0],
            horiz: rnd() < 0.5,
          });
        }
        bloques.push(b);
      } else {
        b.plaza = true;
        PLAZA.b = b;
        const cx = x + C.bloque / 2, cy = y + C.bloque / 2;
        PLAZA.cx = cx; PLAZA.cy = cy;
        obstaculosRedondos.push({ x: cx, y: cy, r: 46, tipo: 'kiosco' });
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          obstaculosRedondos.push({ x: cx + dx * 150, y: cy + dy * 150, r: 22, tipo: 'arbol' });
        }
      }
    }
  }
  const enPlaza = (x, y) => {
    const b = PLAZA.b;
    return x > b.x - 30 && x < b.x + b.w + 30 && y > b.y - 30 && y < b.y + b.h + 30;
  };

  // Sitios posibles para las paradas: a media cuadra, pegadas a la vereda
  const sitiosParada = [];
  for (const b of bloques) {
    const o = 34;
    sitiosParada.push({ x: b.x + b.w / 2, y: b.y - o, ang: 0 });
    sitiosParada.push({ x: b.x + b.w / 2, y: b.y + b.h + o, ang: Math.PI });
    sitiosParada.push({ x: b.x - o, y: b.y + b.h / 2, ang: -Math.PI / 2 });
    sitiosParada.push({ x: b.x + b.w + o, y: b.y + b.h / 2, ang: Math.PI / 2 });
  }

  // Banderines: cruzan algunas calles
  const banderines = [];
  for (let k = 0; k < 26; k++) {
    const vertical = rnd() < 0.5;
    if (vertical) {
      const i = (rnd() * (C.cols + 1)) | 0, j = (rnd() * C.filas) | 0;
      const x0 = i * paso, y = C.calle + j * paso + rnd() * C.bloque;
      banderines.push({ x1: x0 - 6, y1: y, x2: x0 + C.calle + 6, y2: y + (rnd() - 0.5) * 30 });
    } else {
      const j = (rnd() * (C.filas + 1)) | 0, i = (rnd() * C.cols) | 0;
      const y0 = j * paso, x = C.calle + i * paso + rnd() * C.bloque;
      banderines.push({ x1: x, y1: y0 - 6, x2: x + (rnd() - 0.5) * 30, y2: y0 + C.calle + 6 });
    }
  }

  // ─── Estado ────────────────────────────────────────────────────────
  let S; // estado de la vuelta
  const entrada = { izq: false, der: false, freno: false };

  function nuevoPasajero() {
    return {
      ropa: elige(ROPA), pelo: elige(PELO), piel: elige(PIEL),
      sombrero: Math.random() < 0.3 ? elige(['#F6EBD3', '#24150F', '#D6382B']) : null,
      div: 0, miedo: 0, feliz: false, asustado: false, t: Math.random() * 10,
    };
  }

  function nuevoVagon(x, y, ang, k) {
    return {
      x, y, vx: 0, vy: 0, ang, lat: 0, gir: 0, g: 0,
      pal: PALETAS[(k + 1) % PALETAS.length],
      asientos: new Array(C.asientos).fill(null),
      golpe: 0,
    };
  }

  function reiniciar() {
    const x0 = C.calle / 2, y0 = C.calle + paso * 3 + C.bloque / 2;
    S = {
      t: C.tiempo, plata: 0, felices: 0, asustados: 0, caidos: 0, choques: 0,
      corriendo: false, fin: false,
      cab: { x: x0, y: y0, ang: -Math.PI / 2, v: 0, giro: 0, golpe: 0, enfriar: 0 },
      vagones: [], paradas: [], caminantes: [], volando: [], textos: [], chispas: [],
      cam: { x: x0, y: y0, ang: -Math.PI / 2 }, parando: 0, sigCrece: C.felicesPorVagon, avisoT: 0, sustoT: 0, ladridoT: 0,
    };
    for (let k = 0; k < C.vagonesIni; k++) agregarVagon();
    for (let k = 0; k < C.paradasActivas; k++) nuevaParada();
    for (let k = 0; k < 4; k++) S.caminantes.push(nuevoCaminante('danzante'));
    for (let k = 0; k < C.perros; k++) S.caminantes.push(nuevoCaminante('perro'));
    actualizarHud(true);
  }

  function agregarVagon() {
    const n = S.vagones.length;
    const prev = n ? S.vagones[n - 1] : null;
    const ang = prev ? prev.ang : S.cab.ang;
    const ref = prev
      ? { x: prev.x - Math.cos(ang) * C.vagonL / 2, y: prev.y - Math.sin(ang) * C.vagonL / 2 }
      : { x: S.cab.x - Math.cos(ang) * C.cabezaL / 2, y: S.cab.y - Math.sin(ang) * C.cabezaL / 2 };
    const d = C.barra + C.vagonL / 2;
    S.vagones.push(nuevoVagon(ref.x - Math.cos(ang) * d, ref.y - Math.sin(ang) * d, ang, n));
  }

  function nuevaParada() {
    const ocupadas = S.paradas;
    let mejor = null;
    for (let intento = 0; intento < 30; intento++) {
      const s = elige(sitiosParada);
      const lejos = Math.hypot(s.x - S.cab.x, s.y - S.cab.y) > 500;
      const libre = ocupadas.every((p) => Math.hypot(p.x - s.x, p.y - s.y) > 400);
      if (lejos && libre) { mejor = s; break; }
      mejor = s;
    }
    const gente = [];
    const n = 2 + ((Math.random() * 5) | 0);
    for (let k = 0; k < n; k++) gente.push(nuevoPasajero());
    S.paradas.push({ ...mejor, gente, carga: 0, t: 0, nueva: 1 });
  }

  // Caminantes: van de esquina en esquina por el medio de las calles
  function esquinaAzar() {
    return { x: C.calle / 2 + ((Math.random() * (C.cols + 1)) | 0) * paso, y: C.calle / 2 + ((Math.random() * (C.filas + 1)) | 0) * paso };
  }
  function nuevoCaminante(tipo) {
    const e = esquinaAzar();
    if (tipo === 'perro') {
      const c = { tipo, x: e.x + azar(-60, 60), y: e.y + azar(-60, 60), ang: azar(-3, 3), t: Math.random() * 9,
        v: azar(55, 80), modo: 'pasea', tm: 0, ruta: [], parado: 0, ladra: 0, enfriar: azar(0, 4), lado: 1 };
      c.px = c.x; c.py = c.y;
      rutaPerro(c);
      return c;
    }
    const c = { tipo, x: e.x, y: e.y, dest: null, v: azar(22, 32), t: Math.random() * 9, parado: 0 };
    siguienteEsquina(c);
    return c;
  }
  // Un perro pasea: va a la esquina más cercana y de ahí a un punto de la cuadra, pegado a la vereda
  function rutaPerro(c) {
    const ex = clamp(Math.round((c.x - C.calle / 2) / paso), 0, C.cols) * paso + C.calle / 2;
    const ey = clamp(Math.round((c.y - C.calle / 2) / paso), 0, C.filas) * paso + C.calle / 2;
    const op = [];
    if (ex - paso > 0) op.push([-1, 0]);
    if (ex + paso < ANCHO) op.push([1, 0]);
    if (ey - paso > 0) op.push([0, -1]);
    if (ey + paso < ALTO) op.push([0, 1]);
    const [dx, dy] = elige(op), f = azar(0.2, 0.8), lado = (Math.random() < 0.5 ? -1 : 1) * azar(45, 80);
    c.ruta = [
      { x: ex + azar(-40, 40), y: ey + azar(-40, 40) },
      { x: ex + dx * paso * f + dy * lado, y: ey + dy * paso * f + dx * lado },
    ];
  }
  function siguienteEsquina(c) {
    const op = [];
    if (c.x - paso > 0) op.push({ x: c.x - paso, y: c.y });
    if (c.x + paso < ANCHO) op.push({ x: c.x + paso, y: c.y });
    if (c.y - paso > 0) op.push({ x: c.x, y: c.y - paso });
    if (c.y + paso < ALTO) op.push({ x: c.x, y: c.y + paso });
    c.dest = elige(op);
    // se mueven por un carril, no por el centro exacto
    const lado = (Math.random() < 0.5 ? -1 : 1) * azar(10, 50);
    c.off = lado;
  }

  // ─── Física ────────────────────────────────────────────────────────
  function chocaRect(o, r, rect) {
    const px = clamp(o.x, rect.x, rect.x + rect.w), py = clamp(o.y, rect.y, rect.y + rect.h);
    let dx = o.x - px, dy = o.y - py;
    let d = Math.hypot(dx, dy);
    if (d >= r) return null;
    if (d === 0) { // adentro: sal por el borde más cercano
      const izq = o.x - rect.x, der = rect.x + rect.w - o.x, arr = o.y - rect.y, aba = rect.y + rect.h - o.y;
      const m = Math.min(izq, der, arr, aba);
      if (m === izq) return { nx: -1, ny: 0, p: izq + r };
      if (m === der) return { nx: 1, ny: 0, p: der + r };
      if (m === arr) return { nx: 0, ny: -1, p: arr + r };
      return { nx: 0, ny: 1, p: aba + r };
    }
    return { nx: dx / d, ny: dy / d, p: r - d };
  }
  function chocaCirc(o, r, c) {
    const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy) || 1;
    if (d >= r + c.r) return null;
    return { nx: dx / d, ny: dy / d, p: r + c.r - d };
  }
  // Empuja el círculo fuera de lo sólido; devuelve la normal del golpe más fuerte
  function resolver(o, r) {
    if (C.fantasma) return null; // solo para calibrar desde la consola
    let peor = null;
    const prueba = (h) => { if (h) { o.x += h.nx * h.p; o.y += h.ny * h.p; if (!peor || h.p > peor.p) peor = h; } };
    for (const b of bloques) {
      if (Math.abs(o.x - (b.x + b.w / 2)) > b.w / 2 + r + 2 || Math.abs(o.y - (b.y + b.h / 2)) > b.h / 2 + r + 2) continue;
      prueba(chocaRect(o, r, b));
    }
    for (const c of obstaculosRedondos) prueba(chocaCirc(o, r, c));
    // bordes del pueblo
    if (o.x < r) prueba({ nx: 1, ny: 0, p: r - o.x });
    if (o.y < r) prueba({ nx: 0, ny: 1, p: r - o.y });
    if (o.x > ANCHO - r) prueba({ nx: -1, ny: 0, p: o.x - (ANCHO - r) });
    if (o.y > ALTO - r) prueba({ nx: 0, ny: -1, p: o.y - (ALTO - r) });
    return peor;
  }

  function moverCabeza(dt) {
    const k = S.cab;
    const meta = (entrada.izq ? -1 : 0) + (entrada.der ? 1 : 0);
    k.giro += (meta - k.giro) * Math.min(1, C.giroSuave * dt);
    if (entrada.freno) k.v = Math.max(0, k.v - C.freno * dt);
    else if (k.v < C.vMax) k.v = Math.min(C.vMax, k.v + C.acel * dt * (k.v < 0 ? 3 : 1));
    // gira menos cuando va lento, como un carro de verdad
    const efecto = clamp(Math.abs(k.v) / 90, 0, 1) * Math.sign(k.v || 1);
    k.ang += k.giro * C.giro * efecto * dt;
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
      const fuerza = -(dx * golpe.nx + dy * golpe.ny) * k.v; // qué tan de frente
      if (fuerza > 70 && k.enfriar <= 0) chocar(fuerza, frente.x, frente.y);
      // se desliza por la pared y pierde velocidad
      k.v *= fuerza > 70 ? -0.25 : 0.9;
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

  function moverVagones(dt) {
    const k = S.cab;
    let ax = Math.cos(k.ang), ay = Math.sin(k.ang);
    let hx = k.x - ax * C.cabezaL / 2, hy = k.y - ay * C.cabezaL / 2; // enganche
    const d = C.barra + C.vagonL / 2;
    let pa = k.ang; // hacia dónde mira el de adelante
    for (const v of S.vagones) {
      const ox = v.x, oy = v.y, oang = v.ang;
      // inercia: lo que se arrastra del cuadro anterior (menos que 1 para que la cadena no se desboque)
      v.x += v.vx * dt * C.inercia; v.y += v.vy * dt * C.inercia;
      // la barra no se estira ni se encoge, y el enganche no dobla más de C.dobla
      let b = Math.atan2(v.y - hy, v.x - hx);
      let rel = b - (pa + Math.PI);
      while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI;
      if (Math.abs(rel) > C.dobla) b = pa + Math.PI + Math.sign(rel) * C.dobla;
      v.x = hx + Math.cos(b) * d; v.y = hy + Math.sin(b) * d;
      let ex, ey, l;
      const golpe = resolver(v, C.vagonA / 2 - 2);
      if (golpe) {
        ex = v.x - hx; ey = v.y - hy; l = Math.hypot(ex, ey) || 1;
        v.x = hx + ex / l * d; v.y = hy + ey / l * d;
        if (v.golpe <= 0 && Math.hypot(v.vx, v.vy) > 120) { v.golpe = 0.6; polvo(v.x, v.y, 5); for (const p of v.asientos) if (p) p.miedo += 0.08; }
      }
      v.golpe -= dt;
      v.ang = Math.atan2(hy - v.y, hx - v.x);
      // velocidad que salió de la restricción
      v.vx = (v.x - ox) / dt; v.vy = (v.y - oy) / dt;
      // llantas: frenan el deslizamiento de costado, no el de frente
      const fx = Math.cos(v.ang), fy = Math.sin(v.ang);
      const lon = v.vx * fx + v.vy * fy;
      let lat = -v.vx * fy + v.vy * fx;
      lat *= Math.exp(-C.agarre * dt);
      v.vx = fx * lon - fy * lat; v.vy = fy * lon + fx * lat;
      v.lat += (Math.abs(lat) - v.lat) * Math.min(1, dt * 4); // suavizado para medir
      v.latSigno = Math.sign(lat);
      let dang = v.ang - oang; while (dang > Math.PI) dang -= 2 * Math.PI; while (dang < -Math.PI) dang += 2 * Math.PI;
      v.gir = dang / dt;
      // lo que siente el pasajero: empujón de costado = rapidez × giro, más el deslizamiento
      const g = Math.abs(v.gir * lon) + Math.abs(lat) * C.agarre;
      v.g += (Math.min(g, 1300) - v.g) * Math.min(1, dt * 4); // tope: un empujón de pared no lanza a nadie
      hx = v.x - fx * C.vagonL / 2; hy = v.y - fy * C.vagonL / 2;
      pa = v.ang;
    }
  }

  // ─── Pasajeros: se divierten con el meneo, se asustan con el latigazo ─
  function pasajeros(dt) {
    const plaza = enPlaza(S.cab.x, S.cab.y) ? 2 : 1;
    const lento = Math.abs(S.cab.v) < 30 && S.parando <= 0;
    S.avisoT -= dt;
    for (const v of S.vagones) {
      const e = v.g;
      for (let s = 0; s < v.asientos.length; s++) {
        const p = v.asientos[s];
        if (!p) continue;
        p.t += dt;
        if (e > C.divDesde) {
          const tramo = Math.min(e, C.miedoDesde) - C.divDesde;
          p.div += tramo / (C.miedoDesde - C.divDesde) * C.ritmoDiv * plaza * dt;
        } else if (lento) p.div -= 0.015 * dt; // aburrido
        if (e > C.miedoDesde) p.miedo += (e - C.miedoDesde) / 250 * dt;
        else p.miedo -= 0.04 * dt;
        p.div = clamp(p.div, 0, 1); p.miedo = clamp(p.miedo, 0, 1.2);
        if (!p.feliz && p.div >= 1 && p.miedo < 1) {
          p.feliz = true; texto(v.x, v.y - 30, elige(FRASES_DIV), '#F2E14B', 1.3); confeti(v.x, v.y, 18); sonar('feliz');
        }
        if (!p.asustado && p.miedo >= 1) { p.asustado = true; texto(v.x, v.y - 30, elige(FRASES_MIEDO), '#fff', 1.3); }
      }
      // gritos sueltos para que se sienta el meneo
      if (e > 320 && e < C.miedoDesde && Math.random() < dt * 0.5 && S.avisoT <= 0 && v.asientos.some(Boolean)) {
        texto(v.x, v.y - 24, elige(FRASES_DIV), '#fff', 0.9); S.avisoT = 1.2;
      }
      // salir volando
      if (e > C.caidaDesde && Math.random() < dt * (e - C.caidaDesde) / 100) {
        const ocupados = v.asientos.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
        if (ocupados.length) {
          const s = elige(ocupados), p = v.asientos[s];
          v.asientos[s] = null;
          const fx = Math.cos(v.ang), fy = Math.sin(v.ang), sg = -Math.sign(v.gir) || 1;
          // sale hacia donde se mecía el vagón
          S.volando.push({ p, x: v.x, y: v.y, vx: v.vx * 0.6 - fy * sg * 160, vy: v.vy * 0.6 + fx * sg * 160, z: 0, vz: 260, t: 0, giro: azar(-8, 8) });
          S.caidos++; S.plata -= 1;
          texto(v.x, v.y - 30, '¡Salió volando! −$1', '#FF8A7A', 1.6);
          sonar('caida');
          for (const o of S.vagones) for (const q of o.asientos) if (q) q.miedo += 0.2;
        }
      }
    }
  }

  function paradas(dt) {
    const k = S.cab;
    S.parando = 0;
    for (let n = S.paradas.length - 1; n >= 0; n--) {
      const p = S.paradas[n];
      p.t += dt; p.nueva = Math.max(0, p.nueva - dt * 2);
      const cerca = Math.hypot(p.x - k.x, p.y - k.y) < 95 || S.vagones.slice(0, 2).some((v) => Math.hypot(p.x - v.x, p.y - v.y) < 70);
      if (cerca && Math.abs(k.v) < 40) {
        S.parando = 1;
        p.carga += dt;
        if (p.carga >= 0.5) { intercambio(p); p.carga = -99; }
      } else if (p.carga > 0) p.carga = Math.max(0, p.carga - dt);
      if (p.carga < -1 && !cerca) p.carga = 0; // ya puedes volver a parar
      if (p.gente.length === 0 && p.carga >= 0) { S.paradas.splice(n, 1); setTimeout(() => S && !S.fin && nuevaParada(), 1500); }
    }
  }

  function intercambio(p) {
    let cobro = 0, bajan = 0;
    for (const v of S.vagones) for (let s = 0; s < v.asientos.length; s++) {
      const q = v.asientos[s];
      if (!q) continue;
      if (q.feliz) { const pago = 1 + (q.miedo < 0.3 ? 0.25 : 0); cobro += pago; S.felices++; v.asientos[s] = null; bajan++; }
      else if (q.asustado) { S.asustados++; v.asientos[s] = null; bajan++; }
    }
    let suben = 0;
    for (const v of S.vagones) for (let s = 0; s < v.asientos.length; s++) {
      if (!v.asientos[s] && p.gente.length) { v.asientos[s] = p.gente.pop(); suben++; }
    }
    S.plata += cobro;
    if (cobro > 0) { texto(p.x, p.y - 40, '+' + plata(cobro), '#8BD43B', 1.6); sonar('plata'); }
    else if (suben) sonar('sube');
    if (bajan && !cobro) texto(p.x, p.y - 40, 'Se bajaron asustados', '#fff', 1.4);
    if (suben) texto(p.x, p.y - 20, `Subieron ${suben}`, '#fff', 1.2);
    else if (!bajan) texto(p.x, p.y - 20, p.gente.length ? 'No hay asientos' : 'Ya no hay nadie', '#fff', 1.2);
    // crece el gusanito
    while (S.felices >= S.sigCrece && S.vagones.length < C.vagonesMax) {
      S.sigCrece += C.felicesPorVagon;
      agregarVagon();
      const u = S.vagones[S.vagones.length - 1];
      texto(u.x, u.y - 30, '¡El gusanito creció!', '#F2E14B', 2);
      confeti(u.x, u.y, 30);
    }
  }

  function caminantes(dt) {
    const k = S.cab;
    S.sustoT -= dt; S.ladridoT -= dt;
    for (const c of S.caminantes) {
      c.t += dt;
      if (c.tipo === 'perro') { perro(c, dt); continue; }
      if (c.parado > 0) { c.parado -= dt; continue; }
      const dx = c.dest.x - c.x, dy = c.dest.y - c.y, d = Math.hypot(dx, dy);
      if (d < 4) { c.x = c.dest.x; c.y = c.dest.y; siguienteEsquina(c); if (c.tipo === 'perro' && Math.random() < 0.3) c.parado = azar(1, 3); continue; }
      c.x += dx / d * c.v * dt; c.y += dy / d * c.v * dt;
      c.dx = dx / d; c.dy = dy / d;
      // ¿lo topa la cabeza?
      const ox = c.x + (c.dy || 0) * c.off, oy = c.y - (c.dx || 0) * c.off;
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
    const dt = Math.min(0.033, (ahora - ultimo) / 1000 || 0);
    ultimo = ahora;
    if (S.corriendo) {
      const sub = 3, h = dt / sub;
      for (let s = 0; s < sub; s++) { moverCabeza(h); moverVagones(h); }
      pasajeros(dt); paradas(dt); caminantes(dt);
      S.t -= dt;
      if (S.t <= 0) terminar();
      actualizarHud();
    }
    efectos(dt);
    dibujar(dt);
    requestAnimationFrame(cuadro);
  }

  // ─── Dibujo ────────────────────────────────────────────────────────
  let W = 0, H = 0, dpr = 1, zoom = 1;
  function medir() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    lienzo.width = W * dpr; lienzo.height = H * dpr;
    zoom = clamp(Math.min(W, H) / 560, 0.62, 1.5);
    if (W > H * 1.4) zoom = clamp(H / 520, 0.55, 1.5);
    PIVOTE = H > W ? 0.54 : 0.64;
  }
  addEventListener('resize', medir);

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  // La cámara va pegada a la cabeza y gira con ella: la trompa siempre apunta hacia arriba,
  // así ◀ ▶ siempre son izquierda y derecha en la pantalla, vaya hacia donde vaya el gusanito.
  // altura de la pantalla donde va la cabeza: más abajo se ve más camino, más arriba se ve la cola
  // (en el celular vertical los mandos tapan la parte de abajo)
  let PIVOTE = 0.64;
  let camRot = 0;
  function aPantalla(x, y) {
    const dx = (x - S.cam.x) * zoom, dy = (y - S.cam.y) * zoom;
    const c = Math.cos(camRot), s = Math.sin(camRot);
    return { x: W / 2 + dx * c - dy * s, y: H * PIVOTE + dx * s + dy * c };
  }

  function dibujar(dt) {
    const k = S.cab;
    S.cam.x += (k.x - S.cam.x) * Math.min(1, dt * 10);
    S.cam.y += (k.y - S.cam.y) * Math.min(1, dt * 10);
    let da = k.ang - S.cam.ang;
    while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    S.cam.ang += da * Math.min(1, dt * C.camGiro);
    camRot = -Math.PI / 2 - S.cam.ang;
    let sx = 0, sy = 0;
    if (k.golpe > 0 && !quieto) { sx = azar(-6, 6) * k.golpe; sy = azar(-6, 6) * k.golpe; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#3E7A3A';
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2 + sx, H * PIVOTE + sy);
    ctx.rotate(camRot);
    ctx.scale(zoom, zoom);
    ctx.translate(-S.cam.x, -S.cam.y);
    // lo que cabe en pantalla gire como gire: un cuadrado alrededor de la cabeza
    const R = Math.hypot(W / 2, H * Math.max(PIVOTE, 1 - PIVOTE)) / zoom + 60;
    const ve = (x, y, w, h) => x + w > S.cam.x - R && x < S.cam.x + R && y + h > S.cam.y - R && y < S.cam.y + R;

    // calles
    ctx.fillStyle = '#56565C';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    // líneas del centro
    ctx.strokeStyle = 'rgba(242,225,75,.5)'; ctx.lineWidth = 3; ctx.setLineDash([22, 22]);
    ctx.beginPath();
    for (let i = 0; i <= C.cols; i++) { const x = C.calle / 2 + i * paso; ctx.moveTo(x, 0); ctx.lineTo(x, ALTO); }
    for (let j = 0; j <= C.filas; j++) { const y = C.calle / 2 + j * paso; ctx.moveTo(0, y); ctx.lineTo(ANCHO, y); }
    ctx.stroke(); ctx.setLineDash([]);

    // cuadras
    for (const b of bloques) {
      if (!ve(b.x - 14, b.y - 14, b.w + 28, b.h + 28)) continue;
      ctx.fillStyle = '#CFC6B4'; rr(b.x - 14, b.y - 14, b.w + 28, b.h + 28, 12); ctx.fill();
      ctx.fillStyle = '#F1ECE2'; ctx.fillRect(b.x, b.y, b.w, b.h);
      if (b.patio) { ctx.fillStyle = '#5E9E4C'; ctx.fillRect(b.patio.x + 6, b.patio.y + 6, b.patio.w - 12, b.patio.h - 12); ctx.fillStyle = '#2F6B33'; ctx.beginPath(); ctx.arc(b.patio.x + b.patio.w / 2, b.patio.y + b.patio.h / 2, 30, 0, 7); ctx.fill(); }
      for (const c of b.casas) teja(c);
    }
    plaza(ve);

    // paradas
    for (const p of S.paradas) if (ve(p.x - 80, p.y - 80, 160, 160)) parada(p);
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
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fuente = Math.round(clamp(22 * zoom, 16, 28));
    ctx.font = `900 ${fuente}px Montserrat, "Arial Black", sans-serif`;
    for (const t of S.textos) {
      const q = aPantalla(t.x, t.y), y = q.y - t.vida * 34;
      ctx.globalAlpha = 1 - Math.max(0, t.vida - t.dur * 0.6) / (t.dur * 0.4);
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(30,15,40,.85)'; ctx.strokeText(t.t, q.x, y);
      ctx.fillStyle = t.color; ctx.fillText(t.t, q.x, y);
    }
    ctx.globalAlpha = 1;

    // flechas hacia las paradas fuera de pantalla
    if (S.corriendo) flechas();
  }

  function teja(c) {
    ctx.fillStyle = c.teja; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (c.horiz) { for (let y = c.y + 10; y < c.y + c.h; y += 10) { ctx.moveTo(c.x, y); ctx.lineTo(c.x + c.w, y); } }
    else { for (let x = c.x + 10; x < c.x + c.w; x += 10) { ctx.moveTo(x, c.y); ctx.lineTo(x, c.y + c.h); } }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath();
    if (c.horiz) { ctx.moveTo(c.x + c.w / 2, c.y); ctx.lineTo(c.x + c.w / 2, c.y + c.h); } else { ctx.moveTo(c.x, c.y + c.h / 2); ctx.lineTo(c.x + c.w, c.y + c.h / 2); }
    ctx.stroke();
  }

  function plaza(ve) {
    const b = PLAZA.b;
    if (!ve(b.x - 14, b.y - 14, b.w + 28, b.h + 28)) return;
    ctx.fillStyle = '#C9B99A'; rr(b.x - 14, b.y - 14, b.w + 28, b.h + 28, 18); ctx.fill();
    // adoquín
    ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = b.x; x < b.x + b.w; x += 24) { ctx.moveTo(x, b.y - 14); ctx.lineTo(x, b.y + b.h + 14); }
    for (let y = b.y; y < b.y + b.h; y += 24) { ctx.moveTo(b.x - 14, y); ctx.lineTo(b.x + b.w + 14, y); }
    ctx.stroke();
    // jardines en las esquinas
    ctx.fillStyle = '#5E9E4C';
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(PLAZA.cx + dx * 150, PLAZA.cy + dy * 150, 40, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 4; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.arc(PLAZA.cx, PLAZA.cy, 110, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    for (const o of obstaculosRedondos) {
      if (o.tipo === 'kiosco') {
        ctx.fillStyle = '#F1ECE2'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 6, 0, 7); ctx.fill();
        // techo octogonal
        ctx.fillStyle = '#1B5FAA'; ctx.beginPath();
        for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4 + Math.PI / 8; ctx.lineTo(o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#F2E14B'; ctx.lineWidth = 3; ctx.beginPath();
        for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4 + Math.PI / 8; ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r); }
        ctx.stroke();
        ctx.fillStyle = '#D6382B'; ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = '#2F6B33'; ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 10, 0, 7); ctx.fill();
        ctx.fillStyle = '#3F8A40'; ctx.beginPath(); ctx.arc(o.x - 5, o.y - 5, o.r, 0, 7); ctx.fill();
      }
    }
    ctx.font = '900 20px Montserrat, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(36,21,15,.45)';
    ctx.fillText('PLAZA · VUELTAS ×2', PLAZA.cx, b.y + 18);
  }

  function parada(p) {
    const k = S.cab;
    const s = 1 - p.nueva;
    ctx.save(); ctx.translate(p.x, p.y);
    // círculo pintado en la calle
    const pulso = quieto ? 0 : Math.sin(p.t * 4) * 4;
    ctx.strokeStyle = p.carga > 0 ? '#8BD43B' : '#F2E14B'; ctx.lineWidth = 5; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(0, 0, (70 + pulso) * s, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if (p.carga > 0) { ctx.strokeStyle = '#8BD43B'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.carga / 0.5)); ctx.stroke(); }
    ctx.rotate(p.ang);
    // la gente espera en la vereda (hacia "arriba" del ángulo, que es la cuadra)
    const n = p.gente.length;
    for (let i = 0; i < n; i++) {
      const gx = (i - (n - 1) / 2) * 22, gy = 36 + (i % 2) * 8;
      const brinco = quieto ? 0 : Math.abs(Math.sin(p.t * 6 + i)) * 3;
      persona(gx, gy - brinco, p.gente[i], 1, 0, false, Math.hypot(k.x - p.x, k.y - p.y) < 400);
    }
    // letrero
    ctx.fillStyle = '#24150F'; ctx.fillRect(-n * 11 - 18, 30, 4, 22);
    ctx.fillStyle = '#F2E14B'; rr(-n * 11 - 34, 18, 36, 16, 4); ctx.fill();
    ctx.fillStyle = '#24150F'; ctx.font = '800 9px Montserrat, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PARE', -n * 11 - 16, 29);
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
      const fx = v.x + Math.cos(v.ang) * C.vagonL / 2, fy = v.y + Math.sin(v.ang) * C.vagonL / 2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy); ctx.stroke();
      hx = v.x - Math.cos(v.ang) * C.vagonL / 2; hy = v.y - Math.sin(v.ang) * C.vagonL / 2;
    }
  }

  function llantas(l, a) {
    ctx.fillStyle = '#1C1C1F';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) rr(sx * l * 0.28 - 8, sy * (a / 2) - 4 + (sy < 0 ? -2 : 2), 16, 8, 3), ctx.fill();
  }

  function vagon(v, ultimo) {
    const l = C.vagonL, a = C.vagonA, t = performance.now() / 1000;
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.ang);
    // ladeo visual: el cuerpo se inclina hacia afuera cuando se mece
    const ladeo = clamp(-Math.sign(v.gir) * v.g / 700, -1, 1);
    llantas(l, a);
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
    llantas(l, a);
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
    ctx.restore();
    // toldo del chofer
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.ang); ctx.translate(-14, 0);
    toldo(40, a + 6, ['#E8458B', '#F2E14B', '#5FB4E6', '#8BD43B'], 0.5);
    ctx.restore();
  }
  const CHOFER = { ropa: '#D6382B', pelo: '#111', piel: '#B97D55', sombrero: null };

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

  function flechas() {
    for (const p of S.paradas) {
      const q = aPantalla(p.x, p.y);
      if (q.x > 20 && q.x < W - 20 && q.y > 20 && q.y < H - 20) continue;
      const a = Math.atan2(q.y - H * PIVOTE, q.x - W / 2);
      const m = 46;
      const ex = clamp(W / 2 + Math.cos(a) * W, m, W - m), ey = clamp(H / 2 + Math.sin(a) * H, m + 130, H - m - 120);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
      ctx.fillStyle = '#F2E14B'; ctx.strokeStyle = '#24150F'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -12); ctx.lineTo(-3, 0); ctx.lineTo(-8, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = '800 11px Montserrat, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.gente.length + ' ☺', ex - Math.cos(a) * 26, ey - Math.sin(a) * 26 + 4);
    }
  }

  // ─── HUD ───────────────────────────────────────────────────────────
  const h = { tiempo: $('#h-tiempo'), plata: $('#h-plata'), gente: $('#h-gente'), alegria: $('#h-alegria') };
  let hudCache = '';
  function actualizarHud(forzar) {
    const tt = Math.max(0, Math.ceil(S.t));
    let n = 0, cap = 0, div = 0;
    for (const v of S.vagones) for (const p of v.asientos) { cap++; if (p) { n++; div += p.div; } }
    const clave = tt + '|' + S.plata.toFixed(2) + '|' + n + '/' + cap + '|' + Math.round(n ? (div / n) * 100 : 0);
    if (clave === hudCache && !forzar) return;
    hudCache = clave;
    h.tiempo.firstChild.nodeValue = Math.floor(tt / 60) + ':' + String(tt % 60).padStart(2, '0');
    h.plata.firstChild.nodeValue = plata(S.plata);
    h.gente.textContent = `${n}/${cap} a bordo`;
    h.alegria.style.width = (n ? (div / n) * 100 : 0) + '%';
  }

  // ─── Capas ─────────────────────────────────────────────────────────
  const capas = { inicio: $('#c-inicio'), pausa: $('#c-pausa'), fin: $('#c-fin') };
  function mostrar(cual) { for (const [k, el] of Object.entries(capas)) el.hidden = k !== cual; }
  function arrancar() { audio(); mostrar(null); S.corriendo = true; musica(true); }
  function pausar() { if (!S.corriendo) return; S.corriendo = false; mostrar('pausa'); musica(false); }
  function terminar() {
    S.corriendo = false; S.fin = true; musica(false); sonar('fin');
    let record = 0;
    try { record = Math.max(+localStorage.getItem('gusanito.record') || 0, S.plata); localStorage.setItem('gusanito.record', record); } catch { record = S.plata; }
    $('#t-fin').textContent = plata(S.plata);
    $('#fin-frase').textContent = S.caidos > 2 ? 'La gente se divirtió… los que no salieron volando.' : S.felices >= 20 ? '¡El mejor gusanito de las fiestas!' : S.felices >= 8 ? 'Buena vuelta: la gente pide otra.' : 'Haz más zigzag: la gente quiere sentir el meneo.';
    $('#r-felices').textContent = S.felices; $('#r-asustados').textContent = S.asustados; $('#r-caidos').textContent = S.caidos;
    $('#r-choques').textContent = S.choques; $('#r-vagones').textContent = S.vagones.length; $('#r-record').textContent = plata(record);
    mostrar('fin');
  }
  $('#b-arrancar').addEventListener('click', arrancar);
  $('#b-seguir').addEventListener('click', arrancar);
  $('#b-reiniciar').addEventListener('click', () => { reiniciar(); arrancar(); });
  $('#b-otra').addEventListener('click', () => { reiniciar(); arrancar(); });
  $('#b-pausa').addEventListener('click', pausar);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); });

  // ─── Mandos ────────────────────────────────────────────────────────
  const teclas = { ArrowLeft: 'izq', KeyA: 'izq', ArrowRight: 'der', KeyD: 'der', ArrowDown: 'freno', KeyS: 'freno', Space: 'freno' };
  addEventListener('keydown', (e) => {
    if (teclas[e.code]) { entrada[teclas[e.code]] = true; e.preventDefault(); }
    if (e.code === 'Escape' || e.code === 'KeyP') S.corriendo ? pausar() : (!S.fin && capas.pausa.hidden === false && arrancar());
    if (e.code === 'Enter' && !S.corriendo) { if (S.fin) { reiniciar(); } arrancar(); }
  });
  addEventListener('keyup', (e) => { if (teclas[e.code]) { entrada[teclas[e.code]] = false; e.preventDefault(); } });
  addEventListener('blur', () => { entrada.izq = entrada.der = entrada.freno = false; });
  for (const [id, clave] of [['#m-izq', 'izq'], ['#m-der', 'der'], ['#m-freno', 'freno']]) {
    const b = $(id);
    const on = (e) => { e.preventDefault(); entrada[clave] = true; b.classList.add('activo'); b.setPointerCapture?.(e.pointerId); };
    const off = () => { entrada[clave] = false; b.classList.remove('activo'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }

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
  requestAnimationFrame((t) => { ultimo = t; cuadro(t); });

  // Para probar y calibrar desde la consola
  window.gusanito = { C, get S() { return S; }, entrada, agregar: agregarVagon };
})();
