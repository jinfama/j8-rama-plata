// ════════ Acerca / metodología ════════
import { OLIVE_BRANCH } from './utils.js?v=20260908b';

export function renderAbout(el) {
  el.innerHTML = `
  <h1>Minerva · <em>Historia del olivar</em></h1>
  <p class="about-lead">Cuenta la leyenda que Atenea —Minerva para los romanos— ganó el patronazgo de Atenas al hacer brotar el primer olivo. Este atlas recorre los ocho mil años que van de aquel gesto mítico al comercio mundial del aceite, cruzando la evidencia arqueológica con las estadísticas modernas.</p>
  <div class="about-branch">${OLIVE_BRANCH}</div>

  <div class="about-grid">
    <div class="about-card"><div class="k">Evidencia</div><div class="v">10.456</div><div class="d">registros arqueológicos, palinológicos, epigráficos y literarios georreferenciados.</div></div>
    <div class="about-card"><div class="k">Recorrido temporal</div><div class="v">8.000<span style="font-size:14px"> años</span></div><div class="d">del polen prehistórico a los censos del siglo XXI.</div></div>
    <div class="about-card"><div class="k">Comercio bilateral</div><div class="v">1962–2024</div><div class="d">flujos país a país de aceite de oliva (UN Comtrade · DB3).</div></div>
    <div class="about-card"><div class="k">Series de país</div><div class="v">169</div><div class="d">países con superficie, producción, rendimiento y comercio directo.</div></div>
  </div>

  <h2>Las cuatro capas</h2>
  <div class="about-sources">
    <div class="about-src"><div class="t">① Atlas subnacional — series históricas del olivar</div><div class="m">Superficie, producción, rendimiento y <b>% de olivar</b> a tres escalas: <b>mundial por regiones</b> (692 regiones admin-1 de 53 países, 1960–2026, unidas por un crosswalk oficial código↔geometría), <b>provincial</b> (España, 1860–2023, 51 provincias) y <b>municipal</b> (Andalucía, 1580–2010, 785 municipios; desde el Catastro de Ensenada). Fuente: proyecto <em>olivar · 01_tabular</em> (NUTS, Natural Earth, geoBoundaries, INE, FAOSTAT, GEHR, catastros históricos). El trazo discontinuo marca las celdas estimadas frente a las observadas.</div></div>
    <div class="about-src"><div class="t">② Evidencia arqueológica e histórica</div><div class="m">Corpus de 10.456 registros: polen, ánforas olearias, prensas y almazaras, macrorrestos, fuentes literarias, epigrafía, genética, isótopos e iconografía. Cada registro conserva su referencia bibliográfica, su método de datación (radiocarbono, tipológica, estratigráfica, textual…) y su fiabilidad. Fuente: <em>olivar · 02_evidence</em> (CEIPAC, OXREP, PANGAEA, GBIF, BRAIN y otros).</div></div>
    <div class="about-src"><div class="t">③ Tendencias mundiales</div><div class="m">Panel país–año balanceado (1850–2024) de superficie, producción, rendimiento y comercio directo de aceituna y aceite. Fuente: <em>WHEP balanced</em> (armonización de FAOSTAT, anuarios históricos y fuentes académicas). Las celdas interpoladas o proyectadas se distinguen de las observadas.</div></div>
    <div class="about-src"><div class="t">④ Flujos bilaterales del aceite</div><div class="m">Matriz exportador→importador de aceite de oliva y derivados (1962–2024), reconstruida desde UN Comtrade y armonizada a códigos FAO. Fuente: <em>trade/comtrade · DB3</em>. La dirección canónica es el registro de exportación; el grosor de cada cinta es proporcional al valor exportado en dólares.</div></div>
  </div>

  <h2>Procedencia y honestidad del dato</h2>
  <p>El criterio del visor es separar <b>observación</b> de <b>estimación</b>. Cuando una fuente estadística proporciona un valor, se preserva como observado; cuando el valor procede de una interpolación, una extrapolación, un modelo o un <em>proxy</em>, se marca como estimación (trazo discontinuo en los mapas, semitono en las celdas). Los valores anómalos se señalan, nunca se corrigen en silencio.</p>
  <p style="color:var(--ink-3);font-size:12.5px">Datos de investigación de Juan Infante-Amate y colaboradores · Universidad de Granada. Construido sobre los proyectos <em>olivar</em>, <em>whep_lab</em> y <em>comtrade</em>. Cita sugerida y DOI Zenodo: próximamente.</p>
  `;
}
