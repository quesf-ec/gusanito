# El gusanito

El trencito de las fiestas de los pueblos del Ecuador: una cabeza con cara de gusano (casi siempre un
escarabajo transformado, con ojos de pestañas, labios rojos y antenas) que arrastra vagones de fibra de
vidrio con toldos de colores. El chofer zigzaguea y da vueltas para que los vagones se mezan y la gente
grite.

Por ahora es un **prototipo arcade** para probar esa mecánica. El juego está en la raíz del repo
(`index.html` y `gusanito.js`) y se publica en https://quesf-ec.github.io/gusanito/. La página de
presentación va en una.red, no aquí.

## Cómo se juega

- El gusanito arranca **estacionado en la estación del parque**, con 2 vagones. La gente hace fila y se sube.
- **Cada vuelta dura 60 s, siempre lo mismo** (`C.vuelta`), tenga el largo que tenga. Regresa a la estación
  antes de que se acabe. Si te demoras, la fila se cansa y **se va** (cada uno baja la **confianza**).
- **La diversión es lo que cuenta**. Zigzag y **redondeles** (ahí el meneo vale ×1,5). Entre más gente a
  bordo, más cuesta divertirlos: cada pasajero por encima de 4 resta un 8 % de velocidad, hasta un 60 % menos.
- **Para cobrar, el grupo tiene que llegar con 75 % de diversión o más.** Si no, **piden devuelto**, llegues
  a tiempo o no: no pagan y la fila se molesta. Con **100 %** (todos al tope) puedes estacionarte antes de
  que se acabe la vuelta, y cobras.
- Al llegar, pagan según lo felices que bajen ($0,25 si vienen en 0 %, hasta $1,25 felices, más $0,25 de
  propina si además no se asustaron).
- **En la estación decides, y el tiempo se para** hasta que digas **¡Vámonos!**:
  - **Combustible**: cada vuelta gasta una de las 4 vueltas del tanque (●●●●). Llenarlo cuesta
    $10 + $2 por vagón. Sin combustible no sales; sin combustible ni plata, se acaba la partida.
  - **Vagón nuevo**: su precio sube con cada vagón ($8, $20, $35…). Más vagones = más gente y más plata
    por vuelta, pero una cola más larga se sacude más. Si hay gente en la fila, sube al nuevo.
  - **Barras reforzadas** ($30, $60…): la cola aguanta más sacudida antes de cansarse.
  - **Parlante con música** ($60): la gente se divierte más rápido; se ve en el último vagón.
  - **Luces de colores** ($50): desbloquean **De noche**. De noche cobras ×1,5 y todo se oscurece con las luces.
- **No hay reloj de fiesta y no hay tope de largo.** Mientras más vagones, más se sacude la cola, y el
  gusanito se acaba cuando:
  - **La cola se parte**: cada barra se cansa cuando la sacudida de la cola pasa de lo que aguanta
    (`C.aguanta`, más con las barras reforzadas), y se recupera cuando no. Si una se cansa del todo, se
    suelta todo lo de atrás (con su gente, que se cae) y se acaba. Medido sin paredes con inercia 0,92: con
    4 u 8 vagones no se partió en 25 s de zigzag; con 10 y zigzag amplio llegó casi al límite; con 12 y zigzag
    amplio se partió a los 3,3 s.
  - **Te quedan sin vidas** (♥♥♥): tres golpes contra casas, árboles, el kiosco o el borde. Cada golpe
    **suelta el último vagón** y le baja la confianza a la fila.
  - **Nadie quiere subirse**: la confianza de la fila llega a 0 porque la gente se fue esperando, pidió
    devuelto o le fue mal en los golpes.
  - **Sin combustible ni plata** para salir.
- **Dos récords** (se guardan en el navegador): el **gusanito más largo** (el pico de vagones) y las **más
  vueltas** (viajes a la estación).
- **HUD**: arriba, una franja con vagones, vueltas, combustible, plata y vidas. Debajo, el estado: qué pasa
  ahora, cuánto falta para volver, la barra de diversión (la marca blanca es el 75 %) y qué hacer. Los avisos
  salen en su propia franja, debajo de ese estado.
- El gusanito acelera solo. **← →** (o los botones ◀ ▶ en el celular) para girar, **↓ / espacio / Freno**
  para frenar. **P** o **Esc** para pausar. Con el celular acostado, el freno va a la derecha.
- La **cámara gira con la cabeza**: la trompa siempre apunta hacia arriba, así ◀ ▶ siempre son izquierda
  y derecha en la pantalla.
- Topar a los **danzantes** cuesta $0,50 (no quita vidas). Los **perros** salen corriendo a ladrarle al
  gusanito: asustan al chofer y a la gente, pero nunca los puedes pisar.

### El pueblo

5×5 cuadras grandes (560 px) con calles de 210 px. El **parque** ocupa dos cuadras de largo (560 × 1330 px),
con el kiosco en el centro y la **estación** en su lado de abajo, con una bahía de 520 px para estacionar.
Hay **como mucho un redondel por cuadra**: se eligen solos en las esquinas (`redondeles`), ninguno toca el
parque, y las cuadras de alrededor tienen la esquina recortada en curva. Los caminantes y los perros no
cruzan el parque.

### Cómo sube la dificultad

Todo está en la tabla `NIVELES` al inicio de `gusanito.js`, por cantidad de vagones:

| Vagones | Precio del vagón (en la estación) | Velocidad | Ayuda | Danzantes | Perros |
|--------:|----------------------------------:|----------:|------:|----------:|-------:|
| 2 | (al empezar) | 165 | 100 % | 0 | 3 |
| 3 | $8 | 185 | 80 % | 1 | 4 |
| 4 | $20 | 200 | 60 % | 2 | 5 |
| 5 | $35 | 220 | 45 % | 3 | 6 |
| 6 | $55 | 235 | 30 % | 4 | 7 |
| 7 | $80 | 250 | 15 % | 5 | 8 |
| 8 | $110 | 250 | 0 | 6 | 8 |

Después del 8 no hay tabla: cada vagón nuevo cuesta $40 más (`precioVagon()`), y la velocidad, la ayuda y
la cantidad de danzantes y perros se quedan en el nivel de 8. El precio se **gasta**: no es un umbral que
se cruza solo. No hay tope: `C.vagonesMax` es infinito.

**La ayuda al manejar** (`ayudar()`): si la trompa va a dar contra algo, se desvía hacia el lado libre y
frena un poco; si no tocas ◀ ▶, se endereza con la calle y se centra (en los redondeles no, para que
puedas dar vueltas). Nunca te pelea el volante: si giras hacia la pared, te deja. Cerca de la estación,
afloja. Con ayuda, rozar una pared no cuenta como golpe. En la estación se queda quieto solo mientras
baja y sube la gente.

## Referencias (benchmark)

Juegos con mecánicas parecidas que sirvieron de referencia. Lo que tomamos y lo que no:

- **Mini Metro** (tener capacidad y mejoras entre semanas): la partida se pausa para decidir mejoras, en
  lugar de seguir sola. Así sale la tienda en la estación. Fuente: [Mini Metro en TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/MiniMetro) y [reseña en PocketGamer](https://www.pocketgamer.com/mini-metro/review/). Las mejoras y las capacidades de los vagones vienen de notas de versiones antiguas: no lo verifiqué en la versión actual.
- **Slither.io** (la longitud es el puntaje, y más largo = más difícil de manejar): el largo es el récord y
  el peligro sube con él. Fuente: [wiki de Slither.io: Length](https://slitherio-archive.fandom.com/wiki/Length?oldid=1438). Es una wiki de fans, no documentación oficial.
- **RollerCoaster Tycoon** (la gente abandona si espera mucho): de ahí sale la confianza de la fila. Fuente:
  [wiki de RCT: visitantes y personal](https://rct.fandom.com/wiki/Guests_and_Staff). No encontré una fórmula
  exacta de la paciencia.
- **Crazy Taxi** (pagar según el tiempo y los trayectos): no confirmé en las fuentes que la propina baje con
  el tiempo, así que no lo usamos. Referencia general: [Crazy Taxi en Wikipedia](https://en.wikipedia.org/wiki/Crazy_Taxi).

## Cómo está hecho

Todo en `gusanito.js`, en canvas 2D, sin dependencias aparte del sistema de diseño MAL para el
HUD y las capas.

- **Las paredes** son distancias con signo (`sdMundo()`): cuadras con las esquinas comidas por los
  redondeles, islas y el borde del pueblo. Todo lo redondo choca contra eso con la misma función.
- **Al tocar una pared** el gusanito se desliza por ella, pero el rumbo sigue siendo tuyo: la pared solo
  empuja y frena lo que va contra ella. Antes la pared también cambiaba el rumbo hacia su línea, y eso
  dejaba la trompa pegada sin poder girar para salir.
- **La cola y su fatiga**: cada barra mide la sacudida que le llega (`v.g`, la misma que siente la gente).
  Mientras pasa de `C.aguanta`, se cansa (`v.fatiga`); cuando llega a 1, `romperSiHaceFalta()` parte la
  cola y `terminar('partio')` acaba la partida con el pico. `C.inercia` es el mando de lo inestable: con 0,92 (el valor actual) la cola crece sin tope pero se
  aguanta hasta unos 10 vagones; con 0,95, con 12 vagones se partió en 2,5 a 3,9 s (sin paredes). Es el primer número
  que moveré si quieres más o menos riesgo.
- **Golpes y confianza**: un golpe fuerte (`estrellar()`) quita una vida, suelta el último vagón y baja la
  confianza. Los golpes de frente cuentan; los roces no. `restarConfianza()` es el único lugar donde se
  decide que la fila se va: si llega a 0, se acaba la partida.
- **La cabeza** es un carro simple: acelera sola, gira menos cuando va lento. La cámara la sigue
  pegada y gira con ella (`C.camGiro`); en el celular vertical la cabeza va más arriba para que los
  mandos no tapen la cola.
- **Cada vagón** cuelga del de adelante con una barra de largo fijo que no dobla más de `C.dobla`.
  Conserva parte de su impulso (`C.inercia`) y sus llantas frenan el deslizamiento de costado
  (`C.agarre`). Por eso el zigzag del chofer se propaga y crece un poco hacia la cola.
- **Lo que siente el pasajero** es el empujón de costado: rapidez del vagón × lo que gira, más el
  deslizamiento. Entre `C.divDesde` y `C.miedoDesde` divierte, más arriba asusta y sobre `C.caidaDesde`
  alguien puede salir volando.
- **Los perros** pasean de esquina en esquina; si el gusanito pasa rápido cerca, salen corriendo a su
  lado, ladran, y luego se van de costado. Después de moverse, `apartarDelGusano()` los empuja fuera de
  la cabeza y los vagones, así que nunca quedan debajo.

Todos los ajustes están en el objeto `C` al inicio del archivo. Desde la consola del navegador,
`gusanito.C` y `gusanito.S` dejan cambiarlos y mirar el estado en vivo; `gusanito.C.fantasma = true`
apaga los choques, que sirve para calibrar.

Valores medidos con 3 vagones a toda velocidad (empujón promedio, de la cabeza a la cola):
zigzag de 0,4 s ≈ 430–450, vuelta cerrada ≈ 500–650, zigzag lento ≈ 200. Con `inercia` en 1 la cadena
se desboca (cada vagón casi duplica al anterior); con 0,85 la cola ya casi no se mece.

## Para probarlo

```sh
python3 -m http.server
# y abrir http://localhost:8000/
```
