# El gusanito

El trencito de las fiestas de los pueblos del Ecuador: una cabeza con cara de gusano (casi siempre un
escarabajo transformado, con ojos de pestañas, labios rojos y antenas) que arrastra vagones de fibra de
vidrio con toldos de colores. El chofer zigzaguea y da vueltas para que los vagones se mezan y la gente
grite.

Por ahora es un **prototipo arcade** para probar esa mecánica. Se juega en las **calles de verdad de
Pujilí**, alrededor de su Parque Central. El juego está en la raíz del repo (`index.html`, `gusanito.js` y el
mapa en `mapas/pujili.js`) y se publica en https://quesf-ec.github.io/gusanito/. La página de presentación va
en una.red, no aquí.

## Cómo se juega

- El gusanito arranca **estacionado en la estación del Parque Central**, con 2 vagones. La gente hace fila y se sube.
- **Cada vuelta dura 60 s, siempre lo mismo** (`C.vuelta`), tenga el largo que tenga. Regresa a la estación
  antes de que se acabe. Si te demoras, la fila se cansa y **se va** (cada uno baja la **confianza**).
- **La diversión es lo que cuenta**. Zigzag y **redondeles** (ahí el meneo vale ×1,5). Entre más gente a
  bordo, más cuesta divertirlos: cada pasajero por encima de 4 resta un 8 % de velocidad, hasta un 60 % menos.
- **Para cobrar, el grupo tiene que llegar con 75 % de diversión o más.** Si no, **piden devuelto**, llegues
  a tiempo o no: no pagan y la fila se molesta.
- **Se bajan al final de la vuelta** (en los últimos 12 s, `C.ventana`, o después si llegas tarde), **o antes
  si llegan al 100 %**. Si te estacionas antes, te dice cuántos segundos faltan.
- **Al 100 % ya están contentos**: desde ahí no se aburren (ni al frenar para estacionarte) ni se asustan con el
  meneo. Solo un golpe contra una pared les quita el gusto. Si llegas tarde, sí empiezan a aburrirse.
- **Calles cerradas**: cada vez que sales de la estación se cierran algunas calles con una valla (1 al principio,
  y una más cada dos vueltas, hasta 6). Nunca dejan una esquina sin salida, nunca tocan la estación y nunca caen
  donde está el gusanito: hay que buscar otro camino cada vuelta.
- **Calles angostas**: en las 10 cuadras más cercanas a los mercados hay puestos de la feria pegados a la vereda;
  en 4 de ellas, a las dos veredas, y queda como la mitad del ancho. Por ahí el zigzag tiene que ser fino.
- **El borde del pueblo** está cerrado con vallas que dicen **CERRADO**, pero las calles siguen del otro lado,
  con sus casas: el pueblo no se acaba, solo que por ahí no se pasa.
- Al llegar, pagan según lo felices que bajen ($0,25 si vienen en 0 %, hasta $1,25 felices, más $0,25 de
  propina si además no se asustaron).
- **En la estación decides, y el tiempo se para** hasta que digas **¡Vámonos!**:
  - **Combustible**: cada vuelta gasta una de las 4 vueltas del tanque (●●●●). Llenarlo cuesta
    $10 + $2 por vagón. Sin combustible no sales; sin combustible ni plata, **pierdes**. Si te quedaste sin
    combustible, la tienda no te deja comprar otra cosa que te deje sin plata para llenarlo («primero ⛽»).
  - **Vagón nuevo**: su precio sube con cada vagón ($8, $20, $35…). Más vagones = más gente y más plata
    por vuelta, pero una cola más larga se sacude más. Si hay gente en la fila, sube al nuevo.
  - **Barras reforzadas** ($30, $60…): la cola aguanta más sacudida antes de cansarse.
  - **Parlante con música** ($60): la gente se divierte más rápido; se ve en el último vagón.
  - **Luces de colores** ($50): desbloquean **De noche**. De noche cobras ×1,5 y todo se oscurece con las luces.
- **No hay reloj de fiesta y no hay tope de largo.** Mientras más vagones, más se sacude la cola, y el
  gusanito se acaba cuando:
  - **La cola se parte**: cada barra se cansa cuando la sacudida de la cola pasa de lo que aguanta
    (`C.aguanta`, más con las barras reforzadas), y se recupera cuando no. Si una se cansa del todo, se
    suelta todo lo de atrás (con su gente, que se cae) y se acaba. Medido sin paredes con inercia 0,975 y
    zigzag amplio (0,9 s a cada lado): con 4 vagones no se partió en 25 s; con 6 rozó el límite; con 8 se partió a
    los 7 s y con 10, a los 4,6 s. Con 10 vagones y zigzag corto y rápido (0,4 s) no se partió.
  - **Te quedan sin vidas** (♥♥♥): tres golpes de frente contra la vereda, los puestos, una valla o la isla de
    un redondel. Cada golpe
    **suelta el último vagón** y le baja la confianza a la fila.
  - **Nadie quiere subirse**: la confianza de la fila llega a 0 porque la gente se fue esperando, pidió
    devuelto o le fue mal en los golpes.
  - **Sin combustible ni plata** para salir.
- **Dos récords** (se guardan en el navegador): el **gusanito más largo** (el pico de vagones) y las **más
  vueltas** (viajes a la estación).
- **HUD**: arriba, una barra con el objetivo en pocas palabras («Diviértelos», «¡Bien! Sigue así», «¡Listos! A
  la estación», «¡Vuelve a la estación!», «¡Tarde!») con el tiempo de la vuelta y una rayita que se acaba, y la
  plata. Debajo, fichas chiquitas con vagones 🚃, vueltas 🔁, combustible ⛽ y vidas ♥. **La diversión se ve
  junto al gusanito**: una carita (más sonrisa, más diversión) y una barra con la raya blanca del 75 %. La
  flecha de la estación gira alrededor del gusanito (si la estación queda detrás, se pone a un costado de la
  cola). Los avisos salen debajo de las fichas, como mucho dos y de una sola línea.
- **Mandos**: el gusanito acelera solo. En el celular, **toca y mantén la mitad izquierda o derecha de la
  pantalla** para girar (si el dedo cruza al otro lado, cambia el giro). Para frenar, el botón **Freno** abajo
  al centro, o los dos lados a la vez; **si ya estás parado, el freno va en reversa** (despacio). En la
  computadora, **← →** para girar, **↓ / espacio** para frenar o retroceder y **↑ / W** para el turbo. **P** o
  **Esc** para pausar.
- **Turbo**: el botón **Turbo**, junto al freno, o **↑**. Mientras dura, la velocidad máxima sube un 30 %
  (`C.turbo`) y acelera más fuerte. Con más velocidad el mismo zigzag empuja más: divierte más rápido, pero
  asusta, cansa la cola y en las esquinas cuesta más girar. Sirve también para volver a tiempo. Cada toque dura
  al menos 0,8 s y, si lo mantienes, sigue mientras quede **carga**: una carga llena dura 4 s, se recarga sola
  en 9 s y se llena del todo en la estación. La carga se ve en el mismo botón. Si se agota, hay que esperar a
  que se recargue un poco y volver a tocar. Frenar lo corta. Mientras dura, la cámara se aleja un poco, hay
  rayas de velocidad y llamitas en los escapes (con «reducir movimiento» no hay ni rayas ni zoom).
- **Gira como los de verdad**: la cabeza es un carro, así que necesita espacio para girar (tiene un radio
  mínimo) y quieto no gira; para salir de una pared, retrocede un poco. Cada vagón es un remolque de dos ejes:
  la lanza tira del eje delantero, que gira con ella (se ven las llantas delanteras girar), y el de atrás sigue.
- **La estación es una bandeja abajo**: arriba se sigue viendo el gusanito estacionado y la fila. Las ofertas
  se deslizan de lado y dicen cuánto falta si no te alcanza; **¡Vámonos!** siempre está a la vista y dice
  cuánto combustible gasta.
- La **cámara gira con la cabeza**: la trompa siempre apunta hacia arriba, así ◀ ▶ siempre son izquierda
  y derecha en la pantalla.
- Topar a los **danzantes** cuesta $0,50 (no quita vidas). Los **perros** salen corriendo a ladrarle al
  gusanito: asustan al chofer y a la gente, pero nunca los puedes pisar.

### El pueblo: Pujilí de verdad

El mapa es **Pujilí**, sacado de OpenStreetMap: 10 km de calles en un radio de juego de 380 m alrededor del
**Parque Central** (Luis Fernando Vivero), frente a la **Iglesia Matriz**. Se dibuja a 11 px por metro
(`C.escala`), así que las cuadras de unos 80 m miden unos 900 px. Las calles son más anchas que las reales
para que quepa el zigzag: 26 px por cada metro de calzada (`C.anchoCalle`), con un mínimo de 150. Una
residencial de 7 m queda en 182 px y una secundaria de 9 m, en 234.

- **La estación** está en la calle recta más larga que bordea el parque (la Rafael Morales, 810 px), con el
  parque a la derecha del gusanito: la fila espera en la vereda del parque. La bahía mide 520 px.
- **Zonas**: la Matriz y el parque, con los danzantes, que bailan en las calles de la fiesta (a menos de 200 m
  del parque); los **mercados** (Sucre, Ropa, Comidas al norte; Papas, Granos y Lana al sur), con la feria en la
  calle; la **Plaza de Toros** al este. Los nombres de los lugares y de las calles se leen en el piso.
- **Redondeles**: los de verdad no existen, así que el juego los pone en los cruces de cuatro calles, lejos de la
  estación, **uno por barrio** (a 1900 px como mínimo entre ellos, `C.separaRedondel`). Salen 7.
- **El borde**: donde una calle sale del radio de juego hay una valla (30 en total). Del otro lado la calle sigue
  dibujada hasta 560 m, con casas y árboles, para que el pueblo parezca seguir.
- **Las casas**: las que están en OpenStreetMap (346, con la Matriz y la Plaza de Toros) y, donde no hay,
  casitas de teja a lo largo de cada calle (unas 1200), con árboles en los patios del medio de las cuadras.

Para cambiar de pueblo o de radio: `tools/mapa.py` (ver abajo).

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
HUD y las capas. El mapa está en `mapas/pujili.js`.

- **Las paredes** son distancias con signo (`sdMundo()`): lo libre es la calzada de las calles de juego y de
  los redondeles (cada pedazo de calle es una cápsula); se le restan las islas, los puestos, las vallas del borde
  y las calles cerradas. Una rejilla de 160 px (`celdas()`) guarda qué hay cerca de cada punto, así que cada
  consulta mira solo unos pocos pedazos. Todo lo redondo choca contra eso con la misma función.
- **La ayuda al manejar** busca el pedazo de calle más cercano que va para donde vas (`calleCerca()`) y te
  centra en él; las calles cerradas se eligen sobre el grafo de cruces y tramos, sin dejar ningún cruce sin
  salida desde la estación.
- **Al tocar una pared** el gusanito se desliza por ella, pero el rumbo sigue siendo tuyo: la pared solo
  empuja y frena lo que va contra ella. Antes la pared también cambiaba el rumbo hacia su línea, y eso
  dejaba la trompa pegada sin poder girar para salir.
- **La cola y su fatiga**: cada barra mide la sacudida que le llega (`v.g`, la misma que siente la gente).
  Mientras pasa de `C.aguanta`, se cansa (`v.fatiga`); cuando llega a 1, `romperSiHaceFalta()` parte la
  cola y `terminar('partio')` acaba la partida con el pico. `C.inercia` (el impulso que conserva el eje de
  atrás) es el mando de lo inestable: con los remolques de dos ejes, 0,92 casi no se mece (12 vagones apenas
  llegan a 820 de sacudida), 0,96 crece poco y 0,985 ya se parte con 8 vagones a los 3,9 s. El valor actual,
  0,975, deja el peligro entre 6 y 10 vagones. Es el primer número que moveré si quieres más o menos riesgo.
- **Golpes y confianza**: un golpe fuerte (`estrellar()`) quita una vida, suelta el último vagón y baja la
  confianza. Los golpes de frente cuentan; los roces no. `restarConfianza()` es el único lugar donde se
  decide que la fila se va: si llega a 0, se acaba la partida.
- **La cabeza** es un carro con modelo de bicicleta: gira a `velocidad × tan(volante) / ejes` (`C.ejes`,
  `C.volanteMax`: un radio mínimo de unos 70 px), y a mucha velocidad lo limita el agarre (`C.agarreCab`).
  Quieta no gira; con el freno parada retrocede hasta `C.reversa`, y en reversa gira al revés, como un carro.
  La cámara la sigue pegada y gira con ella (`C.camGiro`); en el celular vertical la cabeza va más arriba
  para que los mandos no tapen la cola, y en la estación sube más para que se vea por encima de la bandeja.
- **Cada vagón** es un remolque de dos ejes (`moverVagones()`): la lanza (`C.lanza`) va del enganche del de
  adelante al eje delantero, y el enganche dobla hasta `C.dobla`. El eje delantero gira con la lanza hasta
  `C.giroEje`; el de atrás conserva parte de su impulso (`C.inercia`) y sus llantas frenan el deslizamiento de
  costado (`C.agarre`). Por eso el zigzag del chofer se propaga y crece hacia la cola.
- **Lo que siente el pasajero** es el empujón de costado: rapidez del vagón × lo que gira, más el
  deslizamiento. Entre `C.divDesde` y `C.miedoDesde` divierte, más arriba asusta y sobre `C.caidaDesde`
  alguien puede salir volando.
- **Los perros** pasean por la vereda de su calle; si el gusanito pasa rápido cerca, salen corriendo a su
  lado, ladran, y luego se van de costado. Después de moverse, `apartarDelGusano()` los empuja fuera de
  la cabeza y los vagones, así que nunca quedan debajo.

Todos los ajustes están en el objeto `C` al inicio del archivo. Desde la consola del navegador,
`gusanito.C` y `gusanito.S` dejan cambiarlos y mirar el estado en vivo; `gusanito.C.fantasma = true`
apaga los choques, que sirve para calibrar.


## El mapa: `tools/mapa.py`

```sh
python3 tools/mapa.py pujili      # vuelve a escribir mapas/pujili.js
```

Pide las calles a la API de OpenStreetMap por teselas, igual que `tools/calles.py` del repo de los coches de
madera (de ahí salen la manera de pedirlas y de pasar latitud y longitud a metros), y guarda las teselas en
`~/.cache/gusanito-mapa`, así que la segunda vez no pide nada. Cada receta (`RECETAS`) tiene el centro, el radio
de juego y el radio de vista. Escribe:

- **calles**: los tramos de cruce a cruce que se manejan, con su ancho según el tipo de vía. Solo la red
  conectada más grande dentro del radio de juego.
- **salidas**: donde una calle cruza el borde del radio de juego (ahí el juego pone las vallas).
- **vistas**: las calles de afuera, hasta el radio de vista, que solo se dibujan.
- **edificios**, **verdes**, el **parque** de la estación y los **lugares** con nombre (iglesias, mercados,
  plazas).

Se guarda como `.js` y no como `.json` para que `index.html` lo cargue con una etiqueta `<script>`, también
abriéndolo directo del disco. Los datos son © colaboradores de OpenStreetMap, con licencia ODbL.

## Para probarlo

```sh
python3 -m http.server
# y abrir http://localhost:8000/
```
