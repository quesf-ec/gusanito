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
- **La diversión es lo que cuenta**. Zigzag y **redondeles** (ahí el meneo vale ×1,5). Pero **al tercer giro completo se marean**
  (`C.mareoDesde`): cuenta todo lo que gira la cabeza para el mismo lado, en un redondel o en cualquier parte
  (el zigzag no suma, porque va para los dos lados). Desde el tercer giro, cada giro más les baja 20 % de
  diversión (`C.mareo`), el redondel no da bono, pierden el 100 % y **mientras están mareados nada los divierte**.
  Se les pasa si están 10 s sin dar otro giro completo (`C.mareoOlvida`). Entre más gente a
  bordo, más cuesta divertirlos: cada pasajero por encima de 4 resta un 8 % de velocidad, hasta un 60 % menos.
- **Combo de zigzag**: cada cambio de lado con buen meneo, si llega antes de 1,8 s del anterior
  (`C.comboVentana`), sube el combo («¡Combo ×3!», con un sonido que sube de tono). Cada nivel hace que se
  diviertan un 20 % más rápido (`C.comboExtra`), hasta 6 niveles. Se corta con un golpe, al ir lento o si tardas
  en cambiar de lado. La diversión base es lenta a propósito (`C.ritmoDiv` 0,05): con zigzag perfecto en una
  recta abierta (sin paredes, 2 vagones, 0,6 s a cada lado), con combos llegó al 100 % en 13,7 s y sin combos
  en 27,2 s.
- **Puntos de fiesta ♪**: durante la vuelta hay 3 en la calle, cerca de la estación (`C.fiestas`). Pasar por uno
  les sube 12 % de diversión a todos (`C.fiestaDiv`) y deja $0,10 de propina por pasajero; aparece otro en otra
  parte. Una flechita rosada apunta al más cercano cuando no se ve en la pantalla.
- **Para cobrar, el grupo tiene que llegar con 75 % de diversión o más.** Si no, **piden devuelto**, llegues
  a tiempo o no: no pagan y la fila se molesta.
- **Se bajan al final de la vuelta** (en los últimos 12 s, `C.ventana`, o después si llegas tarde), **o antes
  si llegan al 100 %**, en cualquier momento. Si te estacionas antes, te dice cuántos segundos faltan.
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
  - **Gasolina** (⛽): se gasta **por km recorrido**. Un tanque lleno da 4 km (`C.tanque`), unas tres vueltas a
    la velocidad normal; cada vagón desde el tercero gasta 8 % más (`C.gasta`) y acelerando, ×1,5. El km cuesta
    $2,50 + $0,50 por vagón. En la estación **tanqueas**: llena el tanque, o si no te alcanza, pone la gasolina que
    alcance con tu plata. Con menos de 0,6 km avisa; **sin gasolina el gusanito se arrastra** a 60 px/s
    (`C.reserva`) hasta la estación. Con menos de 1 km, la tienda no te deja comprar nada que no te deje plata
    para tanquear hasta 1 km («primero ⛽»). Sin gasolina, sin plata y sin nadie a bordo, **pierdes**.
  - **Vagón nuevo**: su precio sube con cada vagón ($8, $20, $35…). Más vagones = más gente y más plata
    por vuelta, pero una cola más larga se sacude más. Si hay gente en la fila, sube al nuevo.
  - **Barras reforzadas** ($30, $60…): la cola aguanta más sacudida antes de cansarse.
  - **Parlante con música** ($60): la gente se divierte más rápido; se ve en el último vagón.
  - **Luces de colores** ($50): desbloquean **De noche**. De noche cobras ×1,5 y todo se oscurece con las luces.
- **No hay reloj de fiesta y no hay tope de largo.** Mientras más vagones, más se sacude la cola, y el
  gusanito se acaba cuando:
  - **La cola se parte**: cada barra soporta la sacudida de su vagón **más el tirón de todos los que van
    detrás** (`C.tiro`: +14 % por cada vagón de atrás), así que con un gusanito largo las barras de adelante
    son las que sufren, como en un tren de verdad. Mientras pasa de lo que aguanta (`C.aguanta`, más con las
    barras reforzadas) se cansa, y se recupera cuando no. **Raspar una pared rápido también la cansa**
    (`C.raspon`). Si una se cansa del todo, se suelta todo lo de atrás (con su gente) y se acaba. Medido con
    las velocidades nuevas, sin paredes y zigzag amplio (0,9 s a cada lado): con 5 y 6 vagones no se partió
    en 25 s; con 8 se partió a los 6,4 s y con 10, a los 4,3 s. Con 10 y zigzag corto (0,4 s), a los 5,4 s.
  - **Te quedan sin vidas** (♥♥♥): tres golpes **de frente** (casi derecho contra la pared, `C.deFrente`) y
    rápidos contra la vereda, los puestos, una valla o la isla de un redondel. Los roces de costado solo frenan un
    poco y asustan un poquito («¡Uy, rozamos!»). Cada golpe
    **suelta el último vagón** y le baja la confianza a la fila.
  - **Nadie quiere subirse**: la confianza de la fila llega a 0 porque la gente se fue esperando, pidió
    devuelto o le fue mal en los golpes.
  - **Sin gasolina ni plata** para tanquear.
- **Dos récords** (se guardan en el navegador): el **gusanito más largo** (el pico de vagones) y las **más
  vueltas** (viajes a la estación).
- **HUD**: arriba, una barra con el objetivo en pocas palabras («Diviértelos», «¡Bien! Sigue así», «¡Listos! A
  la estación», «¡Vuelve a la estación!», «¡Tarde!») con el tiempo de la vuelta y una rayita que se acaba, y la
  plata. Debajo, fichas chiquitas con vagones 🚃, vueltas 🔁, gasolina ⛽ (en km) y vidas ♥. **La diversión se ve
  junto al gusanito**: una carita (más sonrisa, más diversión) y una barra con la raya blanca del 75 %. La
  flecha de la estación gira alrededor del gusanito (si la estación queda detrás, se pone a un costado de la
  cola). Los avisos salen debajo de las fichas, como mucho dos y de una sola línea.
- **Mandos**: el gusanito acelera solo. En el celular, **toca y mantén la mitad izquierda o derecha de la
  pantalla** para girar (si el dedo cruza al otro lado, cambia el giro). Para frenar, el botón **Freno** abajo
  al centro, o los dos lados a la vez; **si ya estás parado, el freno va en reversa** (despacio). En la
  computadora, **← →** para girar, **↓ / espacio** para frenar o retroceder y **↑ / W** para acelerar. **P** o
  **Esc** para pausar.
- **Acelerador**: el botón **Acelera**, junto al freno, o **↑**. Sin pisarlo, el gusanito va solo a su velocidad
  normal; mientras lo mantienes, la máxima sube un 30 % (`C.turbo`) y acelera más fuerte. No se gasta: lo que
  cuesta es el riesgo. Con más velocidad el mismo zigzag empuja más: divierte más rápido, pero asusta, cansa la
  cola y en las esquinas cuesta más girar. Frenar le gana. Acelerando, la cámara se aleja un poco y hay rayas de
  velocidad y llamitas en los escapes (con «reducir movimiento», sin rayas ni zoom).
- **Gira como los de verdad**: la cabeza es un carro, así que necesita espacio para girar (tiene un radio
  mínimo) y quieto no gira; para salir de una pared, retrocede un poco. Cada vagón es un remolque de dos ejes:
  la lanza tira del eje delantero, que gira con ella (se ven las llantas delanteras girar), y el de atrás sigue.
- **La estación es una bandeja abajo**: arriba se sigue viendo el gusanito estacionado y la fila. Las ofertas
  se deslizan de lado y dicen cuánto falta si no te alcanza; **¡Vámonos!** siempre está a la vista y dice
  cuánta gasolina te queda.
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
- **Las casas**: de OpenStreetMap, solo las iglesias y los edificios grandes con nombre (la Matriz, la Plaza de
  Toros); las demás son casitas de teja que pone el juego a lo largo de cada calle, con árboles en los patios.

Para cambiar de pueblo o de radio: `tools/mapa.py` (ver abajo).

### Cómo sube la dificultad

Todo está en la tabla `NIVELES` al inicio de `gusanito.js`, por cantidad de vagones:

| Vagones | Precio del vagón (en la estación) | Velocidad | Ayuda | Danzantes | Perros |
|--------:|----------------------------------:|----------:|------:|----------:|-------:|
| 2 | (al empezar) | 230 | 100 % | 0 | 3 |
| 3 | $8 | 250 | 80 % | 1 | 4 |
| 4 | $20 | 265 | 60 % | 2 | 5 |
| 5 | $35 | 285 | 45 % | 3 | 6 |
| 6 | $55 | 300 | 30 % | 4 | 7 |
| 7 | $80 | 315 | 15 % | 5 | 8 |
| 8 | $110 | 325 | 0 | 6 | 8 |

Las velocidades son px/s sin acelerar; con el acelerador, un 30 % más. Para que siga siendo manejable a esa
velocidad, el agarre de la cabeza es 800 (`C.agarreCab`), la barra aguanta 1450 (`C.aguanta`) y el miedo y las
caídas empiezan un 15 % más arriba que antes. Estos tres valores aún no están medidos con las velocidades
nuevas: las mediciones de la cola de más abajo son de antes.

Después del 8 no hay tabla: cada vagón nuevo cuesta $40 más (`precioVagon()`), y la velocidad, la ayuda y
la cantidad de danzantes y perros se quedan en el nivel de 8. El precio se **gasta**: no es un umbral que
se cruza solo. No hay tope: `C.vagonesMax` es infinito.

**Para que no se atasque**: si la trompa queda apretada contra una pared casi sin avanzar (0,35 s), el
gusanito da solo una marcha atrás corta con el volante al revés y sale girando hacia el lado con más espacio
(«¡Marcha atrás!», `ladoLibre()`). Eso funciona en todos los niveles. Además, la parte de la ayuda que esquiva
mira más lejos, gira más fuerte y siempre ayuda al menos un 35 %, aunque ya no haya ayuda para centrarse.

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

## La estética

Un pueblo de juguete: colores pastel, todo redondito y con volumen. Las casas, las iglesias y los árboles
tienen altura (`volumen()`, `arbol3d()`): la vista es desde arriba pero un poco inclinada (`C.inclina`), así que
lo alto se corre hacia arriba de la pantalla, se ven las paredes que miran a la cámara, con sus ventanas, y el
techo de teja a dos aguas encima. Se dibujan de lo más lejano a lo más cercano, y todas las sombras caen para
el mismo lado. El gusanito también tiene volumen: las llantas abajo y la carrocería y el toldo más arriba.
Las calles tienen vereda clara, bordillo, línea blanca y pasos de cebra en los cruces, y el parque, caminos de
arena con borde de ladrillo y el kiosco con su techo en punta.

El HUD y los menús van en paneles crema con borde dorado, botones gorditos con sombra abajo (se hunden al
apretarlos) y la letra redondita Fredoka (Google Fonts).

De OpenStreetMap quedan solo las iglesias y los edificios grandes con nombre (como la Plaza de Toros),
achicados hasta que no toquen las calles, que en el juego son más anchas que las reales. Las casas comunes
las pone el juego a lo largo de cada calle.

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
- **La cola y su fatiga**: cada barra mide la sacudida que le llega (`v.g`, la misma que siente la gente),
  multiplicada por el tirón de los vagones de atrás. Mientras pasa de `C.aguanta`, se cansa (`v.fatiga`);
  cuando llega a 1, `romperSiHaceFalta()` parte la cola y `terminar('partio')` acaba la partida con el pico.
- **Sin latigazo**: los vagones son remolques como los de verdad, así que el meneo **se apaga hacia la cola**
  en vez de crecer. Antes, con `C.inercia` 0,975 y `C.agarre` 6, un zigzag amplio con 6 vagones sacudía el
  último el doble que el primero (1146 → 2375). Ahora, con inercia 0,9 y agarre 14, va de 1181 a 894. Si
  quieres más latigazo, sube `C.inercia` o baja `C.agarre`.
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
