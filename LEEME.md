# El gusanito

El trencito de las fiestas de los pueblos del Ecuador: una cabeza con cara de gusano (casi siempre un
escarabajo transformado, con ojos de pestañas, labios rojos y antenas) que arrastra vagones de fibra de
vidrio con toldos de colores. El chofer zigzaguea y da vueltas para que los vagones se mezan y la gente
grite.

Por ahora es un **prototipo arcade** para probar esa mecánica. El juego está en la raíz del repo
(`index.html` y `gusanito.js`) y se publica en https://quesf-ec.github.io/gusanito/. La página de
presentación va en una.red, no aquí.

## Cómo se juega

- El gusanito arranca **estacionado en la estación del parque**, con 2 vagones. La gente hace fila en la
  vereda del parque y se sube.
- Cada **vuelta** tiene su tiempo (45 s, y 4 s más por cada vagón de más). En ese tiempo hay que **hacerlos
  felices**: zigzag y **redondeles** (ahí el meneo vale ×1,5). Si vas recto sin gracia, se aburren un poco.
  Atrás se siente más.
- **Regresa a la estación** y para ahí: todos se bajan y **pagan según su alegría** ($0,25 si vienen
  aburridos, hasta $1,25 felices, más $0,25 de propina si además no se asustaron). Luego sube la siguiente
  tanda de la fila.
- Si **te demoras** más que la vuelta, la gente de la fila se cansa y **se va** (cada uno baja la
  **confianza** de la fila). Los pasajeros también se aburren. A los 12 s del final te avisa y la flecha
  amarilla parpadea.
- Si la vuelta dura **menos de 25 s**, o si alguien baja **aburrido** (alegría menor a 30 %), **piden
  devuelto**: no pagan y la fila se molesta.
- **La plata trae vagones**: al juntar $8, $20, $35, $55, $80 y $110 se engancha otro (hasta 8). Caben 4
  personas más por vagón, pero con cada uno el gusanito va más rápido, la ayuda al manejar baja, la gente
  se asusta y sale volando más fácil, y hay más danzantes y perros.
- **No hay reloj de fiesta y no hay tope de largo.** Mientras más vagones, más se sacude la cola, y el
  gusanito se acaba cuando:
  - **La cola se parte**: cada barra se cansa cuando la sacudida de la cola pasa de lo que aguanta
    (`C.aguanta`), y se recupera cuando no. Si una se cansa del todo, se suelta todo lo de atrás (con su
    gente, que se cae) y se acaba. Medido sin paredes: con 4 u 8 vagones no se partió en 25 s de zigzag;
    con 10 vagones y zigzag amplio la cola llega casi al límite; con 12 y zigzag amplio se partió a los 3,3 s (inercia 0,92). Las barras se ponen rosas y luego amarillas cuando
    se cansan, y aparece el aviso «la cola está a punto de partirse».
  - **Te quedan sin vidas** (♥♥♥): tres golpes contra casas, árboles, el kiosco o el borde. Cada golpe
    **suelta el último vagón** (con su gente, que se cae) y le baja la confianza a la fila. Con dos
    vagones ya no se suelta más.
  - **Nadie quiere subirse**: la confianza de la fila llega a 0 porque la gente se fue esperando, pidió
    devuelto o le fue mal en los golpes. Con poca confianza, la fila casi no llega.
- **La meta es el gusanito más largo.** Lo que cuenta es el **pico**: el mayor número de vagones que
  llegaste a tener, aunque después se haya partido o perdido vagones. Cada 5 vagones nuevos sale un
  aviso. El récord del navegador guarda el pico más alto.
- El gusanito acelera solo. **← →** (o los botones ◀ ▶ en el celular) para girar, **↓ / espacio / Freno**
  para frenar. **P** o **Esc** para pausar. Con el celular acostado, el freno va a la derecha.
- La **cámara gira con la cabeza**: la trompa siempre apunta hacia arriba, así ◀ ▶ siempre son izquierda
  y derecha en la pantalla.
- Topar a los **danzantes** cuesta $0,50 (no quita vidas). Los **perros** salen corriendo a ladrarle al
  gusanito: asustan al chofer y a la gente, pero nunca los puedes pisar.

### El pueblo

5×5 cuadras grandes (560 px) con calles de 210 px. En el centro, el **parque** con su kiosco y la
estación en su lado de abajo. **8 redondeles**: uno en cada esquina del parque y cuatro más en el pueblo.
Las cuadras de alrededor tienen la esquina recortada en curva.

### Cómo sube la dificultad

Todo está en la tabla `NIVELES` al inicio de `gusanito.js`, por cantidad de vagones:

| Vagones | Se engancha al juntar | Velocidad | Ayuda | Danzantes | Perros |
|--------:|----------------------:|----------:|------:|----------:|-------:|
| 2 | (al empezar) | 165 | 100 % | 0 | 3 |
| 3 | $8 | 185 | 80 % | 1 | 4 |
| 4 | $20 | 200 | 60 % | 2 | 5 |
| 5 | $35 | 220 | 45 % | 3 | 6 |
| 6 | $55 | 235 | 30 % | 4 | 7 |
| 7 | $80 | 250 | 15 % | 5 | 8 |
| 8 | $110 | 250 | 0 | 6 | 8 |

Después del 8 no hay tabla: cada vagón nuevo cuesta $40 más (`precioVagon()`), y la velocidad, la ayuda y
la cantidad de danzantes y perros se quedan en el nivel de 8. Los vagones se cuentan con la plata juntada
(lo que se paga, sin descontar devoluciones). No hay tope: `C.vagonesMax` es infinito.

**La ayuda al manejar** (`ayudar()`): si la trompa va a dar contra algo, se desvía hacia el lado libre y
frena un poco; si no tocas ◀ ▶, se endereza con la calle y se centra (en los redondeles no, para que
puedas dar vueltas). Nunca te pelea el volante: si giras hacia la pared, te deja. Cerca de la estación,
afloja. Con ayuda, rozar una pared no cuenta como golpe. En la estación se queda quieto solo mientras
baja y sube la gente.

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
