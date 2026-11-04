#!/usr/bin/env python3
"""El pueblo de verdad para el gusanito, sacado de OpenStreetMap.

    python3 tools/mapa.py pujili          # → mapas/pujili.js
    python3 tools/mapa.py --todas

Igual que tools/calles.py de los coches de madera (de ahí sale la manera de
pedir el mapa por teselas a la API de OSM y de pasar lat/lon a metros), pero en
lugar de un trazado arma la red de calles alrededor de un parque:

- **calles**: las vías que se pueden manejar, partidas en tramos de cruce a
  cruce, con su ancho según el tipo. Solo dentro del radio de juego.
- **salidas**: donde una calle cruza el borde del radio de juego. Ahí el juego
  pone una valla: la calle sigue (se ve) pero está cerrada.
- **vistas**: las calles de afuera del radio de juego, hasta el radio de vista,
  para que el pueblo parezca seguir.
- **edificios**, **verdes**, el **parque** (el de la estación) y **lugares** con
  nombre (iglesias, mercado, plazas…), para ubicar zonas distintas.

Todo en metros: x al este, z al sur, desde el centro de la receta. Las teselas
de OSM se guardan en ~/.cache/gusanito-mapa: la segunda vez no se pide nada.

Se escribe como un .js (`MAPAS.pujili = {…}`) para que el juego lo cargue con
una etiqueta <script>, también abriendo index.html directo del disco.
"""
import argparse
import json
import math
import os
import pathlib
import sys
import time
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'mapas'
OSM_API = 'https://api.openstreetmap.org/api/0.6/map.json'
CACHE = pathlib.Path(os.environ.get('XDG_CACHE_HOME', pathlib.Path.home() / '.cache')) / 'gusanito-mapa'
AGENTE = 'gusanito/1 (github.com/quesf-ec/gusanito)'
TESELA = 0.006   # grados por lado de cada tesela (~670 m)
PASO = 5.0       # metros entre puntos de cada tramo

# ancho de la calzada (m) por tipo de vía; lo que no está aquí no se maneja
ANCHO = {'primary': 10, 'secondary': 9, 'tertiary': 8, 'unclassified': 7, 'residential': 7, 'living_street': 6, 'service': 5}

RECETAS = {
    # el Parque Central de Pujilí (Luis Fernando Vivero), frente a la Matriz y al municipio
    'pujili': {'nombre': 'Pujilí', 'centro': (-0.957543, -78.695884), 'juego': 380, 'vista': 560},
}


def pide(url, intentos=4):
    for n in range(intentos):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': AGENTE})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except Exception as err:  # noqa: BLE001 — da igual cuál, se reintenta
            if n == intentos - 1:
                raise
            print(f'  …{err}; otra vez en {2 ** (n + 1)} s', file=sys.stderr)
            time.sleep(2 ** (n + 1))
    return None


class Mapa:
    """Los nodos, vías y relaciones de OSM de las teselas pedidas, juntos."""

    def __init__(self):
        self.nodos, self.vias, self.rels, self.teselas = {}, {}, {}, set()

    def cubre(self, s, o, n, e):
        for i in range(math.floor(s / TESELA), math.floor(n / TESELA) + 1):
            for j in range(math.floor(o / TESELA), math.floor(e / TESELA) + 1):
                if (i, j) not in self.teselas:
                    self.teselas.add((i, j))
                    for el in self._tesela(i, j).get('elements', []):
                        {'node': self.nodos, 'way': self.vias, 'relation': self.rels}.get(el.get('type'), {})[el['id']] = el

    def _tesela(self, i, j):
        CACHE.mkdir(parents=True, exist_ok=True)
        f = CACHE / f'osm_{i}_{j}.json'
        if f.exists():
            return json.loads(f.read_text(encoding='utf-8'))
        s, o, n, e = i * TESELA, j * TESELA, (i + 1) * TESELA, (j + 1) * TESELA
        print(f'  tesela {i},{j}…', file=sys.stderr)
        datos = pide(f'{OSM_API}?bbox={o},{s},{e},{n}')
        f.write_text(json.dumps(datos, separators=(',', ':')), encoding='utf-8')
        time.sleep(1)  # sin prisa: la API es de todos
        return datos

    def geo(self, via):
        return [(self.nodos[r]['lat'], self.nodos[r]['lon']) for r in via.get('nodes', []) if r in self.nodos]

    def contornos(self, rel):
        """Los anillos de fuera de un multipolígono, cosidos si vienen a trozos."""
        trozos = [self.geo(self.vias[m['ref']]) for m in rel.get('members', [])
                  if m.get('type') == 'way' and m.get('role', 'outer') in ('outer', '') and m['ref'] in self.vias]
        trozos = [t for t in trozos if len(t) > 1]
        anillos = []
        while trozos:
            a = trozos.pop(0)
            cambio = True
            while a[0] != a[-1] and cambio:
                cambio = False
                for k, b in enumerate(trozos):
                    if b[0] == a[-1]: a = a + b[1:]
                    elif b[-1] == a[-1]: a = a + b[::-1][1:]
                    elif b[-1] == a[0]: a = b + a[1:]
                    elif b[0] == a[0]: a = b[::-1] + a[1:]
                    else: continue
                    trozos.pop(k); cambio = True
                    break
            if a[0] == a[-1] and len(a) > 3:
                anillos.append(a)
        return anillos


def metros(lat0, lon0):
    kx, kz = 111320 * math.cos(math.radians(lat0)), 110540
    return lambda lat, lon: ((lon - lon0) * kx, -(lat - lat0) * kz)


def r1(v):
    return round(v, 1)


def remuestrea(pts):
    """Un punto cada PASO metros como mucho, sin perder las esquinas."""
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        l = math.hypot(b[0] - a[0], b[1] - a[1])
        n = max(1, math.ceil(l / PASO))
        for k in range(1, n + 1):
            out.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    return out


def corte(a, b, r):
    """Dónde cruza el segmento a→b la circunferencia de radio r (centro en 0)."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    A, B, C = dx * dx + dz * dz, 2 * (a[0] * dx + a[1] * dz), a[0] ** 2 + a[1] ** 2 - r * r
    disc = max(0.0, B * B - 4 * A * C)
    for t in sorted([(-B - math.sqrt(disc)) / (2 * A), (-B + math.sqrt(disc)) / (2 * A)]):
        if 0 <= t <= 1:
            return (a[0] + dx * t, a[1] + dz * t)
    return b


def simplifica(pts, tol=0.3):
    """Douglas-Peucker: quita los puntos que no cambian el trazado más de tol metros."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dz = b[0] - a[0], b[1] - a[1]
    l = math.hypot(dx, dz) or 1e-9
    k, dmax = 0, -1
    for i in range(1, len(pts) - 1):
        d = abs((pts[i][0] - a[0]) * dz - (pts[i][1] - a[1]) * dx) / l
        if d > dmax:
            k, dmax = i, d
    if dmax <= tol:
        return [a, b]
    return simplifica(pts[:k + 1], tol)[:-1] + simplifica(pts[k:], tol)


def poligono(geo, proy):
    pts = [proy(a, b) for a, b in geo]
    return pts[:-1] if len(pts) > 1 and pts[0] == pts[-1] else pts


def dentro(p, poli):
    x, z, si = p[0], p[1], False
    for (x1, z1), (x2, z2) in zip(poli, poli[1:] + poli[:1]):
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1 + 1e-12) + x1:
            si = not si
    return si


def receta_a_json(id_, rec):
    lat0, lon0 = rec['centro']
    proy = metros(lat0, lon0)
    gr = (rec['vista'] + 80) / 110540
    mapa = Mapa()
    mapa.cubre(lat0 - gr, lon0 - gr, lat0 + gr, lon0 + gr)
    R, V = rec['juego'], rec['vista']

    # ── calles: vías manejables, partidas en cada cruce
    usos, vias = {}, []
    for w in mapa.vias.values():
        t = w.get('tags', {})
        h = t.get('highway')
        if h not in ANCHO or t.get('area') == 'yes' or t.get('access') in ('private', 'no'):
            continue
        if h == 'service' and t.get('service') in ('parking_aisle', 'driveway', 'drive-through'):
            continue
        ns = [n for n in w.get('nodes', []) if n in mapa.nodos]
        if len(ns) < 2:
            continue
        vias.append((ns, h, t.get('name')))
        for n in ns:
            usos[n] = usos.get(n, 0) + 1
    xy = {n: proy(mapa.nodos[n]['lat'], mapa.nodos[n]['lon']) for ns, _, _ in vias for n in ns}
    piezas = []
    for ns, h, nombre in vias:
        cortes = [0] + [i for i in range(1, len(ns) - 1) if usos[ns[i]] > 1] + [len(ns) - 1]
        for a, b in zip(cortes, cortes[1:]):
            piezas.append({'a': str(ns[a]), 'b': str(ns[b]), 't': h, 'n': nombre, 'w': ANCHO[h], 'p': [xy[n] for n in ns[a:b + 1]]})

    # ── se corta en el radio de juego: adentro se maneja, afuera solo se ve
    calles, vistas, salidas, nodos, ns_sal = [], [], [], {}, 0
    for pz in piezas:
        pts = remuestrea(pz['p'])
        trozo, extremo_a, fuera = [], pz['a'], []
        for k, p in enumerate(pts):
            adentro = math.hypot(*p) <= R
            if adentro:
                if fuera:  # vuelve a entrar: termina un trozo de afuera y empieza uno de adentro en el borde
                    c = corte(fuera[-1], p, R); fuera.append(c)
                    vistas.append({'t': pz['t'], 'w': pz['w'], 'p': fuera}); fuera = []
                    ns_sal += 1; extremo_a = f's{ns_sal}'; nodos[extremo_a] = c
                    salidas.append([c[0], c[1], -c[0] / R, -c[1] / R, pz['w']])
                    trozo = [c]
                trozo.append(p)
            else:
                if trozo:  # sale: termina el trozo de adentro en el borde
                    c = corte(trozo[-1], p, R); trozo.append(c)
                    ns_sal += 1; fin = f's{ns_sal}'; nodos[fin] = c
                    salidas.append([c[0], c[1], c[0] / R, c[1] / R, pz['w']])
                    calles.append({**pz, 'a': extremo_a, 'b': fin, 'p': trozo}); trozo = []
                    fuera = [c]
                fuera.append(p)
        if trozo:
            nodos[extremo_a] = nodos.get(extremo_a, trozo[0]); nodos[pz['b']] = trozo[-1]
            calles.append({**pz, 'a': extremo_a, 'b': pz['b'], 'p': trozo})
        if fuera:
            vistas.append({'t': pz['t'], 'w': pz['w'], 'p': fuera})
    for c in calles:
        nodos.setdefault(c['a'], c['p'][0]); nodos.setdefault(c['b'], c['p'][-1])
    vistas = [v for v in vistas if len(v['p']) > 1 and min(math.hypot(*p) for p in v['p']) <= V]
    for v in vistas:
        v['p'] = [p for p in v['p'] if math.hypot(*p) <= V + 40] or v['p'][:2]

    # ── solo la red conectada más grande (lo demás se ve pero no se maneja)
    vecinos = {}
    for c in calles:
        vecinos.setdefault(c['a'], set()).add(c['b']); vecinos.setdefault(c['b'], set()).add(c['a'])
    grupos, vistos = [], set()
    for n in vecinos:
        if n in vistos:
            continue
        g, cola = {n}, [n]
        vistos.add(n)
        while cola:
            for m in vecinos[cola.pop()]:
                if m not in vistos:
                    vistos.add(m); g.add(m); cola.append(m)
        grupos.append(g)
    red = max(grupos, key=len)
    vistas += [{'t': c['t'], 'w': c['w'], 'p': c['p']} for c in calles if c['a'] not in red]
    calles = [c for c in calles if c['a'] in red]
    salidas = [s for s in salidas if any(math.hypot(s[0] - c['p'][0][0], s[1] - c['p'][0][1]) < 0.5 or math.hypot(s[0] - c['p'][-1][0], s[1] - c['p'][-1][1]) < 0.5 for c in calles)]
    nodos = {k: v for k, v in nodos.items() if k in red}

    # ── edificios, verdes y el parque de la estación
    edificios, verdes, parque = [], [], None
    def tipo_verde(t):
        if t.get('place') == 'square' or (t.get('highway') == 'pedestrian' and t.get('area') == 'yes'):
            return 'plaza'
        if t.get('leisure') in ('park', 'garden', 'playground', 'pitch') or t.get('landuse') in ('grass', 'meadow', 'recreation_ground', 'village_green', 'cemetery') or t.get('natural') == 'grassland':
            return 'parque'
        if t.get('landuse') in ('forest', 'farmland', 'orchard') or t.get('natural') in ('wood', 'scrub'):
            return 'campo'
        return None
    def anillos(el):
        if el['type'] == 'way':
            g = mapa.geo(el)
            return [g] if len(g) > 3 and g[0] == g[-1] else []
        return mapa.contornos(el) if el.get('tags', {}).get('type') == 'multipolygon' else []
    candidatos = []
    for el in [*mapa.vias.values(), *mapa.rels.values()]:
        t = el.get('tags', {})
        for an in anillos(el):
            pts = poligono(an, proy)
            if len(pts) < 3:
                continue
            cx, cz = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
            if math.hypot(cx, cz) > V:
                continue
            if t.get('building', 'no') != 'no':
                igl = t.get('building') in ('church', 'cathedral', 'chapel') or t.get('amenity') == 'place_of_worship'
                e = {'p': [[r1(x), r1(z)] for x, z in pts], 'tipo': 'iglesia' if igl else 'casa'}
                if t.get('name'):
                    e['n'] = t['name']
                edificios.append(e)
            else:
                tv = tipo_verde(t)
                if tv:
                    v = {'t': tv, 'p': [[r1(x), r1(z)] for x, z in pts]}
                    verdes.append(v)
                    if t.get('leisure') == 'park' or tv == 'plaza':
                        candidatos.append((0 if dentro((0, 0), pts) else math.hypot(cx, cz), v, t.get('name')))
    if candidatos:
        _, v, nombre = min(candidatos, key=lambda c: c[0])
        verdes.remove(v)
        parque = {'n': nombre or 'Parque', 'p': v['p']}

    # ── lugares con nombre, para las zonas
    lugares, vistos = [], set()
    for el in [*mapa.nodos.values(), *mapa.vias.values(), *mapa.rels.values()]:
        t = el.get('tags') or {}
        nombre = t.get('name')
        tipo = next((t[k] for k in ('amenity', 'leisure', 'place', 'tourism', 'historic', 'shop') if k in t), None)
        if not nombre or nombre in vistos or tipo not in ('place_of_worship', 'marketplace', 'townhall', 'park', 'square', 'school', 'museum', 'attraction', 'monument', 'supermarket', 'library', 'hospital'):
            continue
        if el['type'] == 'node':
            c = proy(el['lat'], el['lon'])
        else:
            g = mapa.geo(el) if el['type'] == 'way' else [p for a in mapa.contornos(el) for p in a]
            if not g:
                continue
            c = proy(sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g))
        if math.hypot(*c) > R + 60:
            continue
        vistos.add(nombre)
        lugares.append([r1(c[0]), r1(c[1]), nombre, tipo])

    datos = {
        'id': id_, 'nombre': rec['nombre'], 'origen': [lat0, lon0], 'radio': R, 'vista': V,
        'nodos': {k: [r1(v[0]), r1(v[1])] for k, v in nodos.items()},
        'calles': [{'a': c['a'], 'b': c['b'], 't': c['t'], **({'n': c['n']} if c['n'] else {}), 'w': c['w'], 'p': [[r1(x), r1(z)] for x, z in simplifica(c['p'])]} for c in calles],
        'salidas': [[r1(a), r1(b), round(c, 3), round(d, 3), w] for a, b, c, d, w in salidas],
        'vistas': [{'t': v['t'], 'w': v['w'], 'p': [[r1(x), r1(z)] for x, z in simplifica(v['p'])]} for v in vistas],
        'edificios': edificios, 'verdes': verdes, 'parque': parque, 'lugares': lugares,
    }
    SALIDA.mkdir(exist_ok=True)
    f = SALIDA / f'{id_}.js'
    texto = json.dumps(datos, ensure_ascii=False, separators=(',', ':'))
    f.write_text(f'// {rec["nombre"]}, de OpenStreetMap (© colaboradores de OpenStreetMap, ODbL). Lo escribe tools/mapa.py.\n'
                 f'(window.MAPAS = window.MAPAS || {{}})[{json.dumps(id_)}] = {texto};\n', encoding='utf-8')
    print(f'{f.relative_to(RAIZ)}: {len(calles)} tramos, {len(nodos)} cruces, {len(salidas)} salidas, '
          f'{len(edificios)} edificios, {len(verdes)} verdes, parque: {parque and parque["n"]}, {len(lugares)} lugares '
          f'({f.stat().st_size // 1024} KB)')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--todas', action='store_true')
    a = ap.parse_args()
    ids = list(RECETAS) if a.todas else a.ids
    if not ids:
        ap.error(f'¿cuál? {", ".join(RECETAS)}')
    for id_ in ids:
        receta_a_json(id_, RECETAS[id_])


if __name__ == '__main__':
    main()
