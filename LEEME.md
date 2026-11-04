# El gusanito

El trencito de las fiestas de los pueblos del Ecuador: una cabeza con cara de gusano (casi siempre un
escarabajo transformado, con ojos de pestañas, labios rojos y antenas) que arrastra vagones de fibra de
vidrio con toldos de colores. El chofer zigzaguea y da vueltas para que los vagones se mezan y la gente
grite.

Por ahora es un **prototipo arcade** para probar esa mecánica. El juego está en la raíz del repo
(`index.html` y `gusanito.js`) y se publica en https://quesf-ec.github.io/gusanito/. La página de
presentación va en una.red, no aquí.

## Cómo se juega

- El gusanito acelera solo. **← →** (o los botones ◀ ▶ en el celular) para girar, **↓ / espacio / Freno**
  para frenar. **P** o **Esc** para pausar. Con el celular acostado, el freno va a la derecha.
- Frena en una **parada** (círculo amarillo con letrero) para que suba la gente. La primera está justo
  delante, con un letrero de «¡Frena aquí!».
- **Zigzag y vueltas**: el meneo llena la diversión de cada pasajero (la barrita amarilla bajo cada uno).
  Los de atrás sienten más. En la **plaza** vale doble.
- Si te pasas, se asustan (gotita azul) y, con latigazos muy fuertes, **salen volando** (−$1). En el nivel
  1 nadie sale volando.
- Los felices (corazón) se bajan en la siguiente parada y pagan $1, con propina si no se asustaron.
- Chocar contra las casas asusta a todos; topar a los **danzantes** cuesta $0,50.
- Los **perros** salen corriendo a ladrarle al gusanito y lo acompañan un rato a su lado: cuando llegan
  a la par de la trompa, el chofer se asusta y frena de golpe, y la gente se asusta un poco. Pero nunca
  los puedes pisar: siempre se apartan.
- La **cámara gira con la cabeza**: la trompa siempre apunta hacia arriba, así ◀ ▶ siempre son izquierda
  y derecha en la pantalla, vaya hacia donde vaya el gusanito.
- **Niveles**: empiezas con 1:15. Cada nivel pide cierta cantidad de felices (3, 4, 5…); al lograrlo
  ganas tiempo, se engancha un vagón más y todo se pone más bravo. El juego termina cuando se acaba el
  tiempo.

### Cómo sube la dificultad

Todo está en la tabla `NIVELES` al inicio de `gusanito.js`:

| Nivel | Felices | Vagones | Velocidad | Ayuda | Danzantes | Perros | Tiempo extra |
|------:|--------:|--------:|----------:|------:|----------:|-------:|-------------:|
| 1 | 3 | 2 | 160 | 100 % | 0 | 2 | — |
| 2 | 4 | 3 | 180 | 80 % | 1 | 3 | +45 s |
| 3 | 5 | 4 | 200 | 60 % | 2 | 4 | +45 s |
| 4 | 6 | 5 | 220 | 45 % | 3 | 5 | +50 s |
| 5 | 7 | 6 | 235 | 30 % | 4 | 6 | +50 s |
| 6 | 8 | 7 | 250 | 15 % | 5 | 7 | +55 s |
| 7+ | 9, 11, 13… | 8 | 250 | 0 | 6 | 8 | +60 s |

También bajan con el nivel los umbrales de miedo y de caída, y la gente se divierte más rápido al
principio (`ritmo`).

**La ayuda al manejar** (`ayudar()`): si la trompa va a dar contra algo, se desvía hacia el lado libre y
frena un poco; si no tocas ◀ ▶, se endereza con la calle y se va al centro (en la plaza no, para que
puedas dar vueltas); cerca de una parada con gente y asientos libres, afloja. Con ayuda, rozar una pared
no cuenta como choque. Medido con un chofer que gira al azar: 0 choques por minuto en los niveles 1 y 2,
unos 10 por minuto en el 7.

En todos los niveles la pared desvía al gusanito a lo largo de la calle, y con la trompa pegada a una
pared no acelera contra ella, así que siempre se puede girar y salir.

## Cómo está hecho

Todo en `gusanito.js`, en canvas 2D, sin dependencias aparte del sistema de diseño MAL para el
HUD y las capas.

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
