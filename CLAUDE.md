# web_minerva — Minerva · Historia del olivar

Visor hermano de `web_latam` (mismo stack).

## Dónde se entra y dónde vive la aplicación  (2026-09-06)

**`index.html` es la PORTADA**, no la aplicación: es la portada aprobada
`V5_mancha-de-aceite` copiada dentro del visor, con `<meta robots noindex>` y sus
kits de datos en `portada/` (`minerva-evidence.js`). Sus cinco enlaces entran cada
uno por su figura:

| enlace de la portada | destino |
|---|---|
| Atlas | `visor.html?v=atlas` |
| Evidencia | `visor.html?v=evidence` |
| Tendencias | `visor.html?v=trend` |
| Comercio | `visor.html?v=bilateral` |
| Acerca del proyecto | `visor.html?about=1` |

**`visor.html` es LA APLICACIÓN** (el antiguo `index.html`, renombrado por
`06_dev/docs/visores_2026-09/tools/integrar_portada.py`). **Abre directamente en el
atlas: ya no hay ninguna pantalla de bienvenida dentro.** La portada interna —bloque
`.landing` del marcado, `js/landing.js` (arboleda 3D con Three.js, «fresco» CSS,
partículas, cursor propio, barra de progreso y botón «Entrar al atlas») y ~95 líneas
de CSS bajo `/* LANDING / PORTADA */`— se retiró entera el 2026-09-06, porque con la
portada nueva delante eran dos puertas seguidas. Respaldo del estado anterior en
`C:/Work/scratch/checkpoint/visores_2026-09/puerta/web_minerva/`.

El arranque, que antes colgaba del botón «Entrar», ahora es **`js/boot.js`**: precarga
`Data.boot()` (nombres, subnacional, geometría mundial) con el spinner de `#loading`
delante y llama a `App.init()`. `boot.js` lee `?about=1` **antes** de llamar a
`App.init()`, porque `startPermalink()` reescribe la barra de direcciones al terminar
y se lleva por delante cualquier parámetro que el permalink no reconozca.

Reglas al tocar esto:
- **No vuelvas a meter una bienvenida dentro de `visor.html`.** La puerta es la portada.
- Si añades un enlace de entrada en la portada, dale su estado (`?v=…`, vocabulario
  cerrado en `js/permalink.js`) y compruébalo abriéndolo, no solo enlazándolo.
- `abrir_minerva.bat` abre `index.html`, es decir, la portada. Correcto.

## Paleta y estética — la portada manda

El visor sigue la portada aprobada
**`07_temp/portadas_visores_2026-09/minerva/V5_mancha-de-aceite.html`**
(pase de cromo del 2026-09-06; antes seguía la V3, que solo aportó color).
Si esa portada cambia, esto es lo que hay que volver a mirar.

**Cromo** (tokens en `:root` de `css/styles.css`):

| papel | tinta | hoja | oliva osc. | ánfora (acento) | ánfora osc. |
|---|---|---|---|---|---|
| `#F2EEE1` / `#F9F6EC` | `#28311D` | `#4F7A2A` | `#3C4A1C` | `#B05620` | `#8A3F16` |

Filetes = tinta al 22 % (`--border-lt`) y al 44 % (`--border`). Texto secundario
`--ink-2 #4C5738`, terciario `--ink-3 #5F6650` (subido desde `#7D8664`, que se
quedaba en 3,3–3,5:1 sobre el papel; ahora 5,2–5,5:1).

**Cómo se reparte el color** — la regla que hay que respetar al añadir piezas:
- **ánfora `--terra`** = interacción: hover, pestaña activa, barra de la vista
  activa en la barra lateral, filetes superiores de fichas, foco de teclado
  (`:focus-visible{outline:2px solid var(--terra)}`).
- **hoja `--olive`** = marcas calladas: filetes de cita, rama del «Acerca»,
  la cursiva del título del «Acerca».
- **oro `--gold`** = **el aceite, o sea, el dato** (la portada pinta su mancha en
  `rgb(150,106,20)`). Sobrevive solo en marcas que llevan un valor: cintas del
  comercio bilateral, barras de ranking, barras de magnitud, la etiqueta «valor».
  **No usar oro para cromo.**
- La barra lateral, el pie y las pastillas activas son fondo `--rail #1C2A17` con
  tinta crema (`--rail-ink-2`, crema al 62 %: 5,9:1) — no dorada.

**Tipografía** (misma hoja de Google Fonts, una sola petición):
**Bodoni Moda** (display: títulos, cifras grandes, el año de la línea de tiempo en
cursiva, la cifra del tooltip) + **Alegreya Sans** (interfaz). `--serif` y `--ff`.
Alegreya Sans corre un punto por debajo de Inter: los tokens `--fs-*` van medio
píxel arriba y los títulos serif un punto arriba con peso 500 (Bodoni es didone,
no aguanta 600 a 15 px). `js/export-png.js` repite estas dos familias a mano para
que el pie del PNG exportado case con la pantalla.

**Contraste — excepción declarada**: `.map-year`, la marca de agua del año sobre
el lienzo, se queda en tinta al 18 % (1,39:1) a propósito. Es decoración: el año
ya se lee en `#tl-year` (12,6:1) y, en escritorio, también en `.map-caption`
(11,7:1). Va con `aria-hidden="true"` y el motivo está escrito junto a la regla
en `css/styles.css`. Si el año dejara de mostrarse en la línea de tiempo, esa
marca pasa a ser texto informativo y hay que subirla a 3:1.

**Esquinas**: `border-radius:0` en toda la interfaz. Las dos únicas excepciones
vivas (asa de la línea de tiempo y punto de dato circular) están declaradas al
final de `css/styles.css`; no añadas más.

**Las escalas de mapa SÍ se tocan — revisadas el 2026-09-06.** Hasta esa fecha
aquí decía que las rampas de datos «no se tocan». El autor levantó esa regla
expresamente para las escalas de mapa («las paletas de los mapas ajustar a
portadas y colores más agradables en general»). Lo que sigue no es una
preferencia estética: es la codificación, y está medida. Antes de cambiar un
solo tono, vuelve a medir con las mismas cifras y demuestra que no empeoras.

Criterio con el que se revisaron, en este orden:
1. **Que discrimine.** Dos valores distintos tienen que verse distintos.
2. **Que conviva con la portada** `V5_mancha-de-aceite`. Si (1) y (2) chocan,
   gana (1).
3. **Que ningún dato se pinte del color de un botón.** El acento de interacción
   es `--terra #B05620`; ninguna rampa se le acerca a menos de 15 dE2000.
4. **Que lo que no es un valor no parezca uno.** Cálido = medido; gris neutro =
   no medido.

Lo que se cambió y con qué medida (CIEDE2000; daltonismo simulado con las
matrices de Machado, Oliveira y Fernandes 2009 al 100 %):

| pieza | antes | después |
|---|---|---|
| `SEQ_COLORS` | L\* 92→22 con escalones de 6,1 a 13,2 | escalera regular L\* 86→18, ΔL\* 8,4–8,6 |
| `AEGEAN_COLORS` | pie pergamino cálido y salto frío, ΔL\* 4,4–10,7 | misma escalera, pizarra egea, ΔL\* 8,1–8,3 |
| `DIV_COLORS` (sin usuarios) | terracota↔oliva: 5 de 7 pasos bajo deuteranopia, a 3,0 dE del acento | oro↔egeo: 7 de 7, a 17,5 dE del acento |
| transformación por defecto | potencia 0,42 | **logarítmica** (la pastilla sigue ofreciendo las dos) |
| `RAMP` de la matriz de evidencia | pergamino→oro→terracota→vino, a **3,4 dE del acento** | la misma `SEQ_COLORS`: una sola familia para «cantidad» |
| `CONF_COL` (fiabilidad) | verde/ámbar/rojo: alta~baja a 5,5 dE bajo deuteranopia | hoja/oro/vino/gris: peor par 16,2 dE |
| opacidad de los puntos de evidencia | 0,42–0,84 (fiabilidad contada dos veces) | 0,88 fija; la fiabilidad se lee solo en el radio |

**Resultado medido — discriminación.** Doce combinaciones de indicador × escala
× año, contando cuántos tonos perceptualmente distintos (dE2000 ≥ 5) salen entre
**todas** las unidades pintadas del mapa: **76 → 118** en total. Los dos casos
que se pedían explícitamente: *mundo · superficie · 2010* de **8 a 13** tonos y
*Andalucía municipios · superficie · 2010* de **8 a 13**. El peor caso del visor,
*España provincias · rendimiento · 2000*, pasa de **2 a 5** (era un mapa de un
solo color: el dominio de todos los años arrastra un valor de 273.530 kg/ha y
con potencia 0,42 el año entero caía en el 3 % bajo de la rampa).

**Resultado medido — daltonismo.** Los mismos doce casos: **72 → 111** bajo
deuteranopia y **72 → 107** bajo protanopia. En la rampa misma, la distancia
mínima entre escalones vecinos bajo protanopia sube de 5,04 a 7,42 dE.

**Resultado medido — «sin dato» y «cero».** Antes había cinco pares por debajo
de 5 dE, y dos eran graves: `cero` y el pie de la rampa estaban a **2,11 dE**
(un municipio sin olivar se veía igual que el que menos olivar tenía) y en
Tendencias `cero` y `sin dato` eran literalmente **el mismo color**. Ahora los
tres valores conviven con el papel, el lienzo y el pie de la rampa **sin ningún
par por debajo de 5** (el más ajustado, `tierra inerte`↔`pie de rampa`, 5,55).
Tendencias distingue por fin el cero medido del hueco de datos.

**La leyenda dice lo que el mapa hace.** Era una fila de ocho bloques sobre un
relleno continuo, con número solo en los extremos, y los bloques estaban
repartidos por índice de rampa mientras el mapa reparte por logaritmo. Ahora es
la rampa misma, muestreada del mismo objeto de escala con el que se pinta
(`sc.at(t)` en `js/utils.js`), con las marcas de valor en la posición que esa
escala les da de verdad, el nombre de la transformación escrito, y las tres
categorías que no son valores con su muestra. La promesa de «trazo discontinuo =
estimación» tampoco se cumplía: `.region.est` no tenía regla de estilo. Ahora la
tiene, y solo se enciende cuando distingue algo; cuando el 100 % de las celdas
del año son estimaciones (España provincias siempre lo es), la leyenda lo dice
con palabras y el mapa se queda limpio.

**Contraste sobre píxeles reales** (`06_dev/docs/visores_2026-09/tools/contraste_pixel.py`,
escritorio y móvil): `.legend-title` 7,14:1 · `.legend-labels`, `.legend-note`,
`.legend-keys` y `.legend-foot` 5,56:1 · `.map-caption strong` 12,2:1 ·
`#tl-year` 12,55:1. El rótulo «Media 50 %» dentro de la barra de fiabilidad
estaba en crema sobre oro, **2,24:1**; ahora la tinta se elige según su propio
segmento y da **5,61:1** (el verde de «alta» ya pasaba, 4,69:1). En la matriz
de evidencia la cifra sobre su celda pasa de
2,51:1 a 3,43:1 en el peor punto de la rampa (y 3,96:1 medido sobre las celdas
reales de la página servida); como sigue por debajo del 4,5:1 de la WCAG para
10,5 px, la cifra lleva además halo del color contrario (`.mx-val`,
`paint-order:stroke`), que es lo que la separa del fondo.

**Lo que NO se consiguió, y por qué.** El tipo «Ánforas» de la capa Evidencia
está pintado en `#B85C20`, a **2,70 dE2000 del acento de interacción**
`--terra #B05620`: la segunda categoría más numerosa (1.916 puntos) lleva el
color de «hover / pestaña activa / foco». No se cambió porque esos trece colores
**son los de la portada aprobada**, salen de `data/evidence.json` (que se
regenera desde `build/`) y los repite `portada/minerva-evidence.js`, o sea que
moverlo obliga a tocar los tres sitios y a re-aprobar la portada. Si se decide
cambiarlo, el arreglo mínimo es llevar Ánforas a un ladrillo más profundo
(h≈40°, L\*≈42) y sincronizar los tres ficheros. Bajo deuteranopia quedan además
dos pares por debajo de 5 dE entre los trece tipos —Genética~Isótopos (2,6) y
Polen~Ánforas (3,6)—, por la misma razón: son los tonos de la portada.

**Dos cosas que la paleta no puede arreglar, y que son de datos, no de color.**
1. *El dominio lo fija un valor atípico.* `seqScale` toma el mínimo y el máximo
   de **todos** los años (a propósito: así el color de un territorio significa lo
   mismo en 1860 y en 2010). Pero `es_prov/production` tiene un máximo de
   91,9 M t frente a un p99 de 3,0 M, y `es_prov/yield` un máximo de 273.530 kg/ha
   frente a un p99 de 62.482: casi con seguridad son errores de unidad en la
   fuente, y se comen media rampa. Con logaritmo el mapa ya se lee, pero
   *Producción · provincias* sigue siendo el más plano del visor. **Se probó**
   recortar el dominio en el p99 y **se descartó**. La medida, sobre diez casos y
   con la rampa anterior: potencia 65 → 96 tonos al recortar, logaritmo 100 → 109.
   O sea que el recorte da menos que el logaritmo solo, y a cambio introduce
   exactamente el defecto que se venía a corregir —saturación por arriba: España,
   Italia y Grecia acabarían en el mismo tono—. El arreglo está en el dato.
2. *Un total absoluto en un coropleto dibuja también el tamaño de la unidad.*
   `area` (ha) y `production` (t) son totales: Jaén sale oscura en parte por ser
   grande. Lo correcto para el mapa sería una razón —`share` (% de la superficie
   del territorio), que ya existe pero solo en la escala mundial, o producción
   por hectárea de territorio, que el ranking lateral ya calcula con el botón
   «Por superficie»—. **No se cambió** el valor de entrada del mapa: es una
   decisión de contenido, no de color, y cambiarla sin avisar rompería la lectura
   de quien ya usa el atlas. Si se aborda, lo barato es llevar la pastilla
   «Total / Por superficie» del ranking también al mapa y dejar que el lector
   elija; el resto de la escala ya está preparado (`seqScale` se recalcula sola).

**Lo que sigue sin ser cromo**: las mallas de frontera (`rgba(120,96,54,…)`) y
`LAND_STROKE`. El mobiliario del mapa (`LAND_BG`, `NODATA`, `ZERO_COL`) sí es
codificación y vive a la vez en `js/utils.js` y como tokens `--land-bg`,
`--map-nodata`, `--map-zero` en `css/styles.css`: si cambias uno, cambia el otro.

**Resuelto el 2026-09-06**: la portada interna del visor (`.landing`, escena 3D del
olivar + «fresco»), que seguía en noche y oro de la identidad anterior, ya no existe.
No se recoloreó: se retiró, y su papel lo hace la V5 como `index.html`. Con ella se
fueron los tokens `--night` y el uso de `--gold-pale` (el token sigue declarado en la
familia del oro, sin usuarios).

## Reglas para agentes
- **Permalink a prueba de URL editada a mano** — `js/permalink.js` valida contra
  vocabulario cerrado los campos que la interfaz ofrece como pastillas o pestañas
  (`v`, `scale`, `rank`, `dir`, `met`, `st`, `ev`); lo que no encaja se ignora y el
  campo se queda en su defecto. Los vocabularios que dependen del payload (`ind`,
  `tind`, `item`, `terr`) no se pueden comprobar ahí y los normaliza su vista
  (`atlas.js`, `trend.js`, `bilateral.js`) al arrancar. Esa normalización
  pregunta por **propiedad propia** (`Object.prototype.hasOwnProperty.call`,
  el helper `has()` de cada vista): los diccionarios del payload salen de
  `JSON.parse` y con `obj[k]` a secas un `?ind=__proto__`, `?tind=toString`
  o `?item=constructor` contestaba «sí existe» por la cadena de prototipos y
  se colaba hasta el bucle de pintado. Si añades un parámetro, añade también
  su defensa, y no la escribas como una comprobación de verdad.
- **NO frameworks ni npm** — módulos ES6 nativos, D3 + topojson + Three.js por CDN.
- **NO editar `data/*.json` a mano** — se generan desde `build/*.py` con el Python global.
- **NO desplegar `build/`** ni scripts Python.
- Idioma: español (interfaz), inglés (código/comentarios).
- Geometría reutilizada de visores hermanos: mundo (web_latam), provincias España
  (web_spain_municipal), municipios Andalucía (web_andalusia). El geojson de Andalucía es
  **UTF-8** (no latin-1).

## Cuatro capas / fuentes
1. Atlas subnacional  ← `olivar/01_tabular` (España prov. + Andalucía mun., histórico)
2. Evidencia          ← `olivar/02_evidence` (olive_evidence_master, 10.456 filas)
3. Tendencias mundiales ← `whep_lab/whep_lab_balanced/data/final` (crops + trade_direct)
4. Flujos bilaterales ← `trade/comtrade/data/final/db3_unified_by_year` (item_code 261 aceite)

## Estado
- [x] Portada externa `V5_mancha-de-aceite` como `index.html`; aplicación en `visor.html`
      sin puerta interna (2026-09-06). 4 vistas funcionales, About, timeline.
- [x] Evidencia con cuatro sub-pestañas (2026-09-05): Mapa · Espacio × Tiempo · Tipo × Región ·
      Fuentes / QA, con descarga CSV propia por sub-pestaña. Lógica de agregación portada del atlas
      de cobertura del proyecto (`olivar/figures/_code/build_coverage_atlas.py`), reescrita en D3 vanilla.
- [ ] Fijar cita/DOI Zenodo. Pendiente: cobertura de las series tabulares (Atlas/Tendencias),
      y regenerar `data/evidence.json` con el maestro actual (11.407 filas frente a las 10.456 del
      payload publicado) — decisión de datos, no de interfaz.
