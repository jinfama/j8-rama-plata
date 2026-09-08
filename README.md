# Minerva · Historia del olivar

Visor interactivo de la historia del olivar, del gesto mítico de Atenea al comercio
mundial del aceite. Estética hermana de `web_latam` (mismo stack, identidad propia:
mármol/pergamino · oro de Minerva · verde olivo · terracota; tipografía Fraunces + Inter).

**La entrada es `index.html`, la portada «mancha de aceite»** (2026-09-06): un mapa del
Mediterráneo donde la evidencia arqueológica se extiende con el tiempo, y cinco enlaces que
llevan cada uno a su figura del visor. La aplicación vive en **`visor.html`** y abre
directamente sobre el atlas: la antigua portada interna (arboleda 3D + «fresco», `js/landing.js`
y el bloque `.landing`) se retiró para no poner dos puertas seguidas.

## Cómo abrirlo  ⚠️ requiere servidor local
Los navegadores bloquean los módulos ES6 y el `fetch` de los JSON al abrir el `index.html`
con doble clic (`file://`). Ábrelo así:
- **Doble clic en `abrir_minerva.bat`** (lanza el servidor y abre el navegador), o
- `python -m http.server 8848` en esta carpeta → `http://127.0.0.1:8848/index.html`
  (la portada; la aplicación sola está en `http://127.0.0.1:8848/visor.html`).

## Cuatro capas (una por fuente de datos)

| Vista | Fuente | Contenido |
|---|---|---|
| **Atlas subnacional** | `D:/data/agriculture/olivar/01_tabular` | Superficie/producción/rendimiento a escala **provincial** (España 1860–2023, 51 prov.) y **municipal** (Andalucía **1580**–2010, 785 mun., desde el Catastro de Ensenada). Marca observado vs. estimado. |
| **Evidencia** | `.../olivar/02_evidence` | 10.456 registros arqueológicos georreferenciados (polen, ánforas, prensas, macrorrestos, textos, epigrafía, genética, isótopos, iconografía). Mapa por tipo + galería documentada con referencia y método de datación. |
| **Tendencias mundiales** | `D:/data/whep_lab/whep_lab_balanced` | Coropleta animada mundial (1850–2024): superficie, producción, rendimiento y comercio directo de aceituna/aceite. |
| **Flujos bilaterales** | `D:/data/trade/comtrade` (DB3) | Cintas exportador→importador de aceite de oliva y derivados, 1962–2024. |

## Stack
HTML + CSS + módulos ES6 nativos (sin bundler). D3 v7 + topojson-client (CDN).
Fuentes Fraunces + Inter (Google Fonts). Sin frameworks, sin npm.

## Estructura
```
index.html            PORTADA — la puerta de entrada (mancha de aceite)
portada/              kits de datos que usa la portada (minerva-evidence.js)
visor.html            LA APLICACIÓN — abre directamente en el atlas
css/styles.css        sistema de diseño
js/
  boot.js             arranque de visor.html (carga datos → App.init)
  app.js              controlador (sidebar, topbar, timeline, rail, about)
  state.js            store pub/sub
  data-loader.js      fetch + caché de payloads y geometría
  utils.js mapkit.js tip.js   utilidades compartidas
  about.js
  views/{atlas,evidence,trend,bilateral}.js
data/                 payloads JSON precomputados + geometría (NO editar a mano)
build/                scripts Python de generación (NO desplegar)
img/earth.png         textura del globo
```

## Regenerar los datos
Requiere el Python global (`C:/Users/jinfa/AppData/Local/Programs/Python/Python312/python.exe`)
con pandas/pyarrow/pycountry. Desde `build/`:
```
python _names.py            # iso3 ↔ nombres Natural Earth  -> data/geo_names.json
python build_geo.py         # geometría (mundo, ES prov, AND muni)
python build_subnational.py # data/subnational.json
python build_evidence.py    # data/evidence.json
python build_whep.py        # data/trend.json
python build_comtrade.py    # data/bilateral.json  (recorre 63 shards)
```

## Servir en local
```
python -m http.server 8848
# http://127.0.0.1:8848/index.html   portada
# http://127.0.0.1:8848/visor.html   aplicación (también ?v=evidence|trend|bilateral, ?about=1)
```

## Procedencia
El visor separa **observación** de **estimación**: trazo discontinuo en los mapas y semitono
en las celdas marcan los valores interpolados/modelados/proxy frente a los observados. Los
valores anómalos se señalan, no se corrigen en silencio.

Datos de investigación de Juan Infante-Amate y colaboradores (Universidad de Granada), sobre
los proyectos *olivar*, *whep_lab* y *comtrade*. Cita y DOI Zenodo: próximamente.
