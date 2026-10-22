// js/mi-carpeta.js - "Mi carpeta": el alumno deja registrado lo que aprendió
// =====================================================================================
// Última actividad de la clase. El alumno arma una hoja para estudiar después, aunque no
// pueda usar LumAI. Según las perillas del perfil (estadoGlobal.ajustes) cambia CÓMO escribe:
//   - 'copiar'    (mucho apoyo): el texto modelo está en pantalla, con voz, y el alumno lo copia
//                  de a una frase. LumAI avisa si copió bien, sin marcar errores.
//   - 'completar' (apoyo medio): arranca con una frase ("Hoy aprendí que…") y tiene la pista a mano.
//   - 'libre'     (sin barreras): consignas abiertas, con sus propias palabras.
// La hoja se guarda en este dispositivo (localStorage), se puede imprimir, copiar o bajar como
// texto, y se puede entregar al docente: el evento 'carpeta_entregada' llega al reporte.
// El nombre del alumno solo se usa en la hoja impresa (en el navegador); no viaja a ningún lado.
// =====================================================================================

import { hablar, vozDisponible } from './voz.js';

const CLAVE = 'lumai_carpeta_v1';

const limpiar = t => String(t ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = t => limpiar(t).toLowerCase().replace(/[.,;:!¡¿?"'()]/g, '').replace(/\s+/g, ' ').trim();

function el(tag, clase, html) {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

// ------------------------------------------------------------------ almacenamiento
function leerTodo() {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) { return {}; }
}
function guardarHoja(id, hoja) {
  try { const t = leerTodo(); t[id] = hoja; localStorage.setItem(CLAVE, JSON.stringify(t)); return true; } catch (e) { return false; }
}

// ------------------------------------------------------------------ modo según perfil
export function modoDeCarpeta(aj = {}, dims = null) {
  const apoyos = [aj.texto && aj.texto !== 'completo', aj.letra > 0, aj.voz > 0, aj.pausa_cada > 0, aj.calmo, aj.botones_grandes,
    aj.sin_tiempos, aj.opciones < 3, aj.anticipar, aj.capsulas === 'esenciales'].filter(Boolean).length;
  // Lo que más pesa para escribir es la lectoescritura del perfil: con barrera alta se copia,
  // con barrera moderada o leve se completa (en la moderada la pista ya está a la vista). Las demás perillas solo deciden cuando no hay esa barrera.
  const le = dims && dims.lectoescritura;
  if (le === 'generalizado') return 'copiar';                 // barrera alta: texto modelo en pantalla para copiar
  if (le === 'extenso' || le === 'limitado') return 'completar'; // moderada/leve: frase de arranque y pista
  if (apoyos >= 3) return 'completar';
  if (apoyos >= 1 || !aj.mas_alla) return 'completar';
  return 'libre';
}

// ------------------------------------------------------------------ consignas desde la clase
function armarConsignas(clase, modo, aj) {
  const caps = (clase.capsulas || []).filter(c => c.idea_clave);
  const cant = modo === 'copiar' ? Math.min(3, caps.length) : modo === 'completar' ? Math.min(4, caps.length) : Math.min(3, caps.length);
  // Si hay pocas actividades se toman todas; si hay muchas, se reparten (principio, medio, final)
  let elegidas = caps;
  if (caps.length > cant) {
    elegidas = [];
    for (let i = 0; i < cant; i++) elegidas.push(caps[Math.round(i * (caps.length - 1) / Math.max(1, cant - 1))]);
  }
  const L = [];
  const voc = (clase.vocabulario || []).filter(v => v.palabra && v.definicion);
  const simples = clase.banco?.simples || [];

  if (modo === 'copiar') {
    // Frases cortas para copiar: la primera oración de la idea clave, y las más breves de la clase
    const primera = t => { const x = limpiar(t); const m = x.match(/^.+?[.!?](?=\s|$)/); return m ? m[0] : x; };
    const cortas = caps.map(c => ({ c, f: primera(c.idea_clave) })).sort((a, b) => a.f.length - b.f.length).slice(0, cant);
    cortas.sort((a, b) => caps.indexOf(a.c) - caps.indexOf(b.c))
      .forEach(({ c, f }) => L.push({ tipo: 'idea', titulo: limpiar(c.titulo), consigna: 'Copiá esta frase en tu carpeta', modelo: f }));
    const s = simples[0];
    const sinComo = t => { const x = limpiar(t).replace(/^como vimos,?\s*/i, ''); return x.charAt(0).toUpperCase() + x.slice(1); };
    if (s) L.push({ tipo: 'palabra', titulo: 'Mi palabra nueva', consigna: 'Copiá la palabra nueva y lo que quiere decir', modelo: `${limpiar(s.palabra)}: ${sinComo(s.explicacion || '')}`.replace(/:\s*$/, '') });
    else if (voc[0]) L.push({ tipo: 'palabra', titulo: 'Mi palabra nueva', consigna: 'Copiá la palabra nueva y lo que quiere decir', modelo: `${limpiar(voc[0].palabra)}: ${limpiar(voc[0].definicion)}` });
  } else if (modo === 'completar') {
    elegidas.forEach(c => L.push({ tipo: 'idea', titulo: limpiar(c.titulo), consigna: `Sobre “${limpiar(c.titulo)}”: Hoy aprendí que…`, inicio: 'Hoy aprendí que ', pista: limpiar(c.idea_clave) }));
    if (voc.length) L.push({ tipo: 'palabra', titulo: 'Mi palabra nueva', consigna: 'Elegí una palabra nueva y escribí qué significa.', palabras: voc.slice(0, 5).map(v => ({ palabra: limpiar(v.palabra), pista: limpiar(v.definicion) })) });
    L.push({ tipo: 'ejemplo', titulo: 'Mi ejemplo', consigna: 'Escribí un ejemplo de tu casa, tu barrio o tu escuela.', inicio: 'Un ejemplo es ', pista: '' });
  } else {
    L.push({ tipo: 'idea', titulo: 'Con mis palabras', consigna: `Explicá con tus palabras la idea central de la clase: “${limpiar(clase.titulo)}”.`, pista: limpiar(clase.idea_central_simple || clase.idea_central) });
    if (voc.length) L.push({ tipo: 'palabra', titulo: 'Mi glosario', consigna: 'Elegí 2 palabras clave y definilas sin copiar.', palabras: voc.slice(0, 6).map(v => ({ palabra: limpiar(v.palabra), pista: limpiar(v.definicion) })), cantidad: 2 });
    L.push({ tipo: 'ejemplo', titulo: 'Mi ejemplo', consigna: 'Dá un ejemplo propio donde se vea la idea de la clase.', pista: '' });
    L.push({ tipo: 'pregunta', titulo: 'Mi duda', consigna: '¿Qué te quedó sin entender, o qué te gustaría saber más? Escribí una pregunta para charlar con tu docente.', pista: '' });
    if (aj.mas_alla && clase.para_ir_mas_alla?.pregunta) L.push({ tipo: 'mas_alla', titulo: 'Para ir más allá', consigna: limpiar(clase.para_ir_mas_alla.pregunta), pista: '' });
  }
  return L;
}

// ------------------------------------------------------------------ hoja para imprimir / copiar
export function hojaATexto(hoja, nombre = '') {
  const l = [`MI CARPETA — ${hoja.titulo}`, `${hoja.materia ? hoja.materia + ' · ' : ''}${hoja.fecha || ''}`];
  if (nombre) l.push(`Nombre: ${nombre}`);
  l.push('');
  (hoja.entradas || []).forEach(e => {
    l.push(`${e.titulo}`);
    if (e.palabra) l.push(`Palabra: ${e.palabra}`);
    l.push((e.respuesta || '').trim() || '(sin escribir)');
    l.push('');
  });
  return l.join('\n').trim();
}

function imprimirHoja(hoja, nombre = '') {
  const prev = document.getElementById('lumai-hoja-impresion');
  if (prev) prev.remove();
  const nodo = el('div');
  nodo.id = 'lumai-hoja-impresion';
  nodo.innerHTML = `
    <h1>Mi carpeta: ${esc(hoja.titulo)}</h1>
    <p class="mc-p-meta">${esc(hoja.materia || '')} · ${esc(hoja.fecha || '')}</p>
    <p class="mc-p-nombre">Nombre: ${nombre ? esc(nombre) : '________________________________'}</p>
    ${(hoja.entradas || []).map(e => `<section><h2>${esc(e.titulo)}${e.palabra ? `: ${esc(e.palabra)}` : ''}</h2><p class="mc-p-resp">${esc((e.respuesta || '').trim() || ' ').replace(/\n/g, '<br>')}</p></section>`).join('')}
    <section class="mc-p-correccion"><h2>Corrección del docente</h2>
      <p>☐ Muy bien &nbsp;&nbsp; ☐ Revisar con ayuda &nbsp;&nbsp; ☐ Volver a escribir</p>
      <p class="mc-linea"></p><p class="mc-linea"></p></section>`;
  document.body.appendChild(nodo);
  const limpiarDespues = () => { nodo.remove(); window.removeEventListener('afterprint', limpiarDespues); };
  window.addEventListener('afterprint', limpiarDespues);
  setTimeout(() => { try { window.print(); } catch (e) { limpiarDespues(); } }, 50);
}

function bajarTxt(hoja, nombre) {
  try {
    const blob = new Blob([hojaATexto(hoja, nombre)], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mi-carpeta-${(hoja.id || 'clase')}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return true;
  } catch (e) { return false; }
}

async function copiarTexto(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch (e) { return false; }
}

// ------------------------------------------------------------------ estilos
// La clase vive dentro de un shadow DOM: los estilos del componente se suman a los de la clase
// (ESTILOS_CARPETA); la hoja de impresión va en el documento, así que lleva los suyos aparte.
export const ESTILOS_CARPETA = `
.mc{display:grid;gap:14px}
.mc-intro{margin:0;font-weight:500}
.mc-item{display:grid;gap:8px;background:#fff;border:2px solid var(--lc-borde,#dbe3ec);border-radius:var(--lc-radio,14px);padding:14px 16px}
.mc-item h4{margin:0;font-size:.95rem;color:var(--lc-azul-osc,#003f7d);font-family:var(--lc-fuente-titulos,inherit)}
.mc-consigna{margin:0;font-weight:600}
.mc-modelo{margin:0;padding:12px 14px;border-radius:10px;background:var(--lc-azul-claro,#e8f1fb);border-left:6px solid var(--lc-azul,#00509e);font-size:1.15rem;line-height:1.5;font-weight:600;user-select:text}
.mc-fila{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.mc textarea{width:100%;min-height:70px;resize:vertical;border:2px solid var(--lc-borde,#dbe3ec);border-radius:10px;padding:10px 12px;font:inherit;font-size:1.02rem;color:var(--lc-texto,#1f2a37);background:#fff}
.mc textarea:focus{outline:3px solid #ffbf00;outline-offset:1px;border-color:var(--lc-azul,#00509e)}
.mc-chips{display:flex;flex-wrap:wrap;gap:8px}
.mc-chip{border:2px solid var(--lc-azul,#00509e);background:#fff;color:var(--lc-azul-osc,#003f7d);border-radius:999px;padding:6px 14px;font:inherit;font-weight:600;cursor:pointer}
.mc-chip[aria-pressed="true"]{background:var(--lc-azul,#00509e);color:#fff}
.mc-pista{margin:0;padding:8px 12px;border-radius:8px;background:var(--lc-acento-claro,#fff8e1);border:1px solid var(--lc-acento-borde,#f6dc8c)}
.mc-estado{margin:0;font-weight:600;min-height:1.3em}
.mc-estado.ok{color:var(--lc-verde-osc,#00805b)}
.mc-estado.casi{color:var(--lc-naranja-osc,#c2410c)}
.mc-acciones{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}
.mc-anteriores summary{cursor:pointer;font-weight:600}
.mc-anteriores ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}
.mc-anteriores li{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}
.lc-mayus .mc{text-transform:uppercase}
.lc-mayus .mc textarea{text-transform:uppercase}
.lc-grandes .mc textarea{font-size:1.25rem;min-height:96px}
.lc-letra-1 .mc{font-size:1.1rem}.lc-letra-2 .mc{font-size:1.25rem}
`;

const ESTILOS_IMPRESION = `#lumai-hoja-impresion{display:none}
@media print{
  body>*:not(#lumai-hoja-impresion){display:none!important}
  #lumai-hoja-impresion{display:block!important;font-family:Georgia,serif;color:#000;padding:18mm;font-size:14pt;line-height:1.6}
  #lumai-hoja-impresion h1{font-size:20pt;margin:0 0 4px}
  #lumai-hoja-impresion h2{font-size:13pt;margin:14px 0 4px}
  .mc-p-meta{margin:0;color:#444}
  .mc-p-resp{margin:0;padding:6px 0;border-bottom:1px solid #999;min-height:2.4em;white-space:pre-wrap}
  .mc-p-correccion{margin-top:26px;border:1px solid #000;padding:8px 12px}
  .mc-linea{border-bottom:1px solid #999;height:1.6em;margin:0}
}`;

function inyectarEstilos() {
  if (document.getElementById('mc-estilos')) return;
  const s = document.createElement('style');
  s.id = 'mc-estilos';
  s.textContent = ESTILOS_IMPRESION;
  document.head.appendChild(s);
}

// ------------------------------------------------------------------ componente
export function crearMiCarpeta(clase, { ajustes = {}, dimensiones = null, nombreAlumno = '', registrar = () => {} } = {}) {
  inyectarEstilos();
  const aj = ajustes || {};
  const pistaVisible = !!aj.pista_previa || (dimensiones && dimensiones.lectoescritura === 'extenso');
  const modo = modoDeCarpeta(aj, dimensiones);
  const mayus = t => (aj.mayusculas ? String(t).toUpperCase() : String(t));
  const consignas = armarConsignas(clase, modo, aj);
  const previa = leerTodo()[clase.id];
  const respuestasPrevias = (previa && previa.modo === modo && Array.isArray(previa.entradas)) ? previa.entradas : [];

  const raiz = el('section', 'mc');
  raiz.setAttribute('data-modo', modo);
  const intro = {
    copiar: 'Vamos a armar tu carpeta. Mirá la frase, escuchala y copiala. Así te queda para estudiar.',
    completar: 'Armá tu carpeta con lo que aprendiste. Empezá con la frase que ya está y terminala con tus palabras.',
    libre: 'Armá tu carpeta de estudio con tus propias palabras. Es lo que vas a usar para repasar cuando no tengas LumAI.'
  }[modo];
  raiz.appendChild(el('p', 'mc-intro', esc(mayus(intro))));

  const campos = []; // { entrada, leer() }
  const estadoGlobalHoja = el('p', 'mc-estado');
  estadoGlobalHoja.setAttribute('aria-live', 'polite');

  const hoja = () => ({
    id: clase.id, titulo: limpiar(clase.titulo), materia: limpiar(clase.materia || ''), modo,
    fecha: new Date().toLocaleDateString('es-AR'),
    entradas: campos.map(c => c.leer()),
    entregado: !!(leerTodo()[clase.id]?.entregado)
  });
  let timerGuardado = null;
  const guardar = (aviso = false) => {
    const ok = guardarHoja(clase.id, hoja());
    if (aviso) { estadoGlobalHoja.className = 'mc-estado ' + (ok ? 'ok' : 'casi'); estadoGlobalHoja.textContent = ok ? '💾 Guardado en este dispositivo.' : 'No pude guardar acá. Podés imprimir o copiar tu hoja.'; }
  };
  const guardarPronto = () => { clearTimeout(timerGuardado); timerGuardado = setTimeout(() => guardar(false), 600); };

  consignas.forEach((c, idx) => {
    const previo = respuestasPrevias[idx] || {};
    const item = el('div', 'mc-item');
    item.appendChild(el('h4', '', esc(mayus(c.titulo))));
    item.appendChild(el('p', 'mc-consigna', esc(mayus(c.consigna))));
    const area = document.createElement('textarea');
    area.id = `mc-t-${clase.id}-${idx}`;
    area.setAttribute('aria-label', c.consigna);
    area.value = previo.respuesta || (c.inicio && !previo.respuesta ? c.inicio : '');
    area.rows = modo === 'copiar' ? 3 : 4;
    area.addEventListener('input', () => { guardarPronto(); if (c.modelo) revisarCopia(); });
    let palabraElegida = previo.palabra || '';
    const estado = el('p', 'mc-estado');
    estado.setAttribute('aria-live', 'polite');

    function revisarCopia() {
      const v = norm(area.value), m = norm(c.modelo);
      if (!v) { estado.textContent = ''; estado.className = 'mc-estado'; return; }
      if (v === m) { estado.textContent = '¡Copiaste muy bien! ✅'; estado.className = 'mc-estado ok'; return; }
      if (m.startsWith(v)) { estado.textContent = 'Vas muy bien, seguí. ✍️'; estado.className = 'mc-estado ok'; return; }
      const pm = m.split(' '), pv = v.split(' ');
      let i = 0; while (i < pv.length && pv[i] === pm[i]) i++;
      estado.textContent = pm[i] ? `Casi. Mirá bien la palabra “${mayus(pm[i])}”.` : 'Casi. Mirá otra vez la frase.';
      estado.className = 'mc-estado casi';
    }

    if (c.modelo) {
      item.appendChild(el('p', 'mc-modelo', esc(mayus(c.modelo))));
      const fila = el('div', 'mc-fila');
      if (vozDisponible()) {
        const oir = el('button', 'lc-btn lc-sec lc-btn-chico', '🔊 Escuchar');
        oir.type = 'button';
        oir.addEventListener('click', () => hablar(c.modelo, { ajustes: aj, rate: aj.voz >= 2 ? 0.85 : undefined }));
        fila.appendChild(oir);
      }
      item.appendChild(fila);
    }

    if (c.palabras) {
      const chips = el('div', 'mc-chips');
      const pista = el('p', 'mc-pista');
      pista.hidden = true;
      const marcar = (b, p) => {
        palabraElegida = p.palabra;
        chips.querySelectorAll('.mc-chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        pista.hidden = false;
        pista.textContent = `Pista: ${mayus(p.pista)}`;
        guardarPronto();
      };
      c.palabras.forEach(p => {
        const b = el('button', 'mc-chip', esc(mayus(p.palabra)));
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => marcar(b, p));
        if (p.palabra === palabraElegida) setTimeout(() => marcar(b, p), 0);
        chips.appendChild(b);
      });
      item.append(chips, pista);
    } else if (c.pista && modo !== 'libre' && (pistaVisible || modo === 'completar')) {
      // Con apoyo medio la pista está a un toque; con pista_previa ya está a la vista
      const pista = el('p', 'mc-pista', `💡 ${esc(mayus(c.pista))}`);
      if (!pistaVisible) {
        pista.hidden = true;
        const ver = el('button', 'lc-btn lc-sec lc-btn-chico', '💡 Ver pista');
        ver.type = 'button';
        ver.addEventListener('click', () => { pista.hidden = !pista.hidden; ver.textContent = pista.hidden ? '💡 Ver pista' : '🙈 Ocultar pista'; });
        item.append(ver);
      }
      item.append(pista);
    } else if (c.pista && modo === 'libre') {
      const pista = el('p', 'mc-pista', `💡 ${esc(c.pista)}`);
      pista.hidden = true;
      const ver = el('button', 'lc-btn lc-sec lc-btn-chico', '💡 Necesito una pista');
      ver.type = 'button';
      ver.addEventListener('click', () => { pista.hidden = !pista.hidden; });
      item.append(ver, pista);
    }

    item.append(area, estado);
    campos.push({ leer: () => ({ tipo: c.tipo, titulo: c.titulo, consigna: c.consigna, modelo: c.modelo || '', palabra: palabraElegida, respuesta: area.value.trim() }) });
    raiz.appendChild(item);
    if (c.modelo && area.value) revisarCopia();
  });

  // ---- acciones
  const acciones = el('div', 'mc-acciones');
  const boton = (txt, fn, sec = true) => {
    const b = el('button', `lc-btn${sec ? ' lc-sec' : ''} lc-btn-chico`, txt);
    b.type = 'button'; b.addEventListener('click', fn); acciones.appendChild(b); return b;
  };
  const avisar = (txt, ok = true) => { estadoGlobalHoja.className = 'mc-estado ' + (ok ? 'ok' : 'casi'); estadoGlobalHoja.textContent = txt; };
  const algunoEscrito = () => campos.some(c => { const e = c.leer(); return e.respuesta && e.respuesta !== 'Hoy aprendí que' && e.respuesta !== 'Un ejemplo es'; });

  boton('💾 Guardar en mi carpeta', () => { guardar(true); registrar('carpeta_guardada', { clase: clase.id, modo }); }, false);
  boton('🖨️ Imprimir mi hoja', () => { guardar(false); imprimirHoja(hoja(), nombreAlumno); registrar('carpeta_impresa', { clase: clase.id }); });
  boton('📋 Copiar', async () => { const ok = await copiarTexto(hojaATexto(hoja(), nombreAlumno)); avisar(ok ? '📋 Copiado. Podés pegarlo en tu cuaderno digital o en un mensaje.' : 'No pude copiar. Probá con “Imprimir”.', ok); });
  boton('⬇️ Bajar como archivo', () => { const ok = bajarTxt(hoja(), nombreAlumno); avisar(ok ? '⬇️ Archivo listo en tus descargas.' : 'No pude bajarlo. Probá con “Imprimir”.', ok); });

  const entrega = el('div', 'mc-item');
  entrega.appendChild(el('h4', '', '📨 Para mi docente'));
  entrega.appendChild(el('p', 'mc-consigna', mayus('Cuando termines, entregá tu hoja. Tu docente la va a leer y te la va a corregir.')));
  const entregar = el('button', 'lc-btn lc-btn-chico', '📨 Entregar a mi docente');
  entregar.type = 'button';
  const entregado = el('p', 'mc-estado');
  entregado.setAttribute('aria-live', 'polite');
  const yaEntregado = () => { entregar.textContent = '✅ Entregado (podés volver a entregar si cambiás algo)'; entregado.className = 'mc-estado ok'; };
  if (previa?.entregado) yaEntregado();
  entregar.addEventListener('click', () => {
    if (!algunoEscrito()) { entregado.className = 'mc-estado casi'; entregado.textContent = 'Escribí al menos una parte antes de entregar.'; return; }
    const h = hoja(); h.entregado = true;
    guardarHoja(clase.id, h);
    registrar('carpeta_entregada', {
      clase: clase.id, titulo: h.titulo, modo,
      entradas: h.entradas.map(e => ({ titulo: e.titulo, palabra: e.palabra, modelo: e.modelo.slice(0, 220), respuesta: e.respuesta.slice(0, 600) })).slice(0, 8)
    });
    yaEntregado();
    entregado.textContent = '¡Listo! Tu docente va a recibir tu hoja. 🎉';
  });
  entrega.append(entregar, entregado);

  raiz.append(acciones, estadoGlobalHoja, entrega);

  // ---- hojas de otras clases (para estudiar sin LumAI)
  const otras = Object.entries(leerTodo()).filter(([id]) => id !== clase.id);
  if (otras.length) {
    const d = el('details', 'mc-anteriores');
    d.appendChild(el('summary', '', `📚 Mis hojas anteriores (${otras.length})`));
    const ul = el('ul');
    otras.forEach(([id, h]) => {
      const li = el('li', '', `<span>${esc(h.titulo)} · ${esc(h.fecha || '')}</span>`);
      const fila = el('span', 'mc-fila');
      const imp = el('button', 'lc-btn lc-sec lc-btn-chico', '🖨️'); imp.type = 'button'; imp.setAttribute('aria-label', `Imprimir ${h.titulo}`);
      imp.addEventListener('click', () => imprimirHoja(h, nombreAlumno));
      const bj = el('button', 'lc-btn lc-sec lc-btn-chico', '⬇️'); bj.type = 'button'; bj.setAttribute('aria-label', `Bajar ${h.titulo}`);
      bj.addEventListener('click', () => bajarTxt(h, nombreAlumno));
      fila.append(imp, bj); li.appendChild(fila); ul.appendChild(li);
    });
    d.appendChild(ul);
    raiz.appendChild(d);
  }

  return { nodo: raiz, hayEscrito: algunoEscrito, guardar: () => guardar(false), modo };
}
