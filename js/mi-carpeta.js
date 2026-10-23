// js/mi-carpeta.js - "Mi carpeta": el alumno deja por escrito lo que aprendió
// =====================================================================================
// Última actividad de la clase. El alumno escribe cada parte en pantalla, aprieta "Listo" y
// LumAI la guarda (y la revisa). Después puede pasarla a su carpeta de papel. Al final decide
// si envía sus respuestas al docente: recién ahí llegan al reporte (evento 'carpeta_entregada').
// Cómo escribe depende del perfil (lectoescritura y perillas de estadoGlobal.ajustes):
//   - 'copiar'    (barrera alta): la frase modelo está en pantalla, con voz; la copia en el cuadro.
//   - 'completar' (barrera moderada o leve): el cuadro ya trae el comienzo de la oración; la pista está a mano.
//   - 'libre'     (sin barrera): consignas abiertas, con sus palabras.
// El nombre del alumno no se usa acá.
// =====================================================================================

import { hablar, vozDisponible } from './voz.js';

const CLAVE = 'lumai_carpeta_v1';

const limpiar = t => String(t ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Explica en qué se diferencia la copia de la frase modelo (acentos, palabras que faltan o cambian)
function diferenciasCopia(texto, modelo) {
  const sinAc = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const pal = t => limpiar(t).replace(/[.,;:!¡¿?"'()«»]/g, ' ').split(/\s+/).filter(Boolean);
  const a = pal(texto), m = pal(modelo);
  const avisos = [];
  const acentos = [];
  let i = 0, j = 0;
  while (j < m.length && avisos.length + acentos.length < 4) {
    const w = a[i], mw = m[j];
    if (w !== undefined && w.toLowerCase() === mw.toLowerCase()) { i++; j++; continue; }
    if (w !== undefined && sinAc(w).toLowerCase() === sinAc(mw).toLowerCase()) {
      const k = [...mw].findIndex((ch, x) => ch.toLowerCase() !== ([...w][x] || '').toLowerCase());
      acentos.push(k >= 0 && /[áéíóúÁÉÍÓÚ]/.test([...mw][k]) ? `«${mw}» lleva acento en la «${[...mw][k]}»` : `«${mw}» se escribe sin acento`);
      i++; j++; continue;
    }
    if (a[i + 1] !== undefined && sinAc(a[i + 1]).toLowerCase() === sinAc(mw).toLowerCase()) { avisos.push(`sobra la palabra «${w}»`); i++; continue; }
    if (w === undefined || (m[j + 1] !== undefined && sinAc(w).toLowerCase() === sinAc(m[j + 1]).toLowerCase())) { avisos.push(`falta la palabra «${mw}»`); j++; continue; }
    avisos.push(`escribiste «${w}» y en la frase dice «${mw}»`); i++; j++;
  }
  if (j >= m.length && i < a.length && avisos.length < 4) avisos.push(`sobra «${a.slice(i).join(' ')}» al final`);
  const todo = [...acentos, ...avisos];
  return todo.length ? todo.join('; ') : '';
}

const norm = t => limpiar(t).toLowerCase().replace(/[.,;:!¡¿?"'()]/g, '').replace(/\s+/g, ' ').trim();

function el(tag, clase, html) {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

// ------------------------------------------------------------------ almacenamiento (en este dispositivo)
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
  // con barrera moderada o leve se completa (en la moderada la pista ya está a la vista).
  const le = dims && dims.lectoescritura;
  if (le === 'generalizado') return 'copiar';
  if (le === 'extenso' || le === 'limitado') return 'completar';
  if (apoyos >= 1 || !aj.mas_alla) return 'completar';
  return 'libre';
}

// ------------------------------------------------------------------ consignas desde la clase
function armarConsignas(clase, modo, aj) {
  const caps = (clase.capsulas || []).filter(c => c.idea_clave);
  const cant = modo === 'completar' ? Math.min(4, caps.length) : Math.min(3, caps.length);
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
    const cortas = caps.map(c => ({ c, f: primera(c.texto_simple || c.idea_clave) })).sort((a, b) => a.f.length - b.f.length).slice(0, cant);
    cortas.sort((a, b) => caps.indexOf(a.c) - caps.indexOf(b.c))
      .forEach(({ c, f }) => L.push({ tipo: 'idea', titulo: limpiar(c.titulo), consigna: 'Copiá esta frase en tu carpeta:', modelo: f }));
    const s = simples[0];
    const sinComo = t => { const x = limpiar(t).replace(/^como vimos,?\s*/i, ''); return x.charAt(0).toUpperCase() + x.slice(1); };
    if (s) L.push({ tipo: 'palabra', titulo: 'Mi palabra nueva', consigna: 'Copiá en tu carpeta la palabra nueva y lo que quiere decir:', modelo: `${limpiar(s.palabra)}: ${sinComo(s.explicacion || '')}`.replace(/:\s*$/, '') });
    else if (voc[0]) L.push({ tipo: 'palabra', titulo: 'Mi palabra nueva', consigna: 'Copiá en tu carpeta la palabra nueva y lo que quiere decir:', modelo: `${limpiar(voc[0].palabra)}: ${limpiar(voc[0].definicion)}` });
  } else if (modo === 'completar') {
    elegidas.forEach(c => L.push({ tipo: 'idea', titulo: limpiar(c.titulo), consigna: 'Completá esta oración en tu carpeta:', inicio: `Sobre “${limpiar(c.titulo)}”: aprendí que `, pista: limpiar(c.idea_clave) }));
    if (voc.length) L.push({ tipo: 'palabra', titulo: 'Mi palabra nueva', consigna: 'Elegí una palabra nueva y escribí en tu carpeta qué significa:', palabras: voc.slice(0, 5).map(v => ({ palabra: limpiar(v.palabra), pista: limpiar(v.definicion) })) });
    L.push({ tipo: 'ejemplo', titulo: 'Mi ejemplo', consigna: 'Escribí en tu carpeta un ejemplo de tu casa, tu barrio o tu escuela:', inicio: 'Un ejemplo es ', pista: '' });
  } else {
    L.push({ tipo: 'idea', titulo: 'Con mis palabras', consigna: `Escribí en tu carpeta, con tus palabras, la idea central de la clase “${limpiar(clase.titulo)}”:`, pista: limpiar(clase.idea_central_simple || clase.idea_central) });
    if (voc.length) L.push({ tipo: 'palabra', titulo: 'Mi glosario', consigna: 'Elegí una palabra clave y escribí en tu carpeta qué significa, sin copiar:', palabras: voc.slice(0, 6).map(v => ({ palabra: limpiar(v.palabra), pista: limpiar(v.definicion) })) });
    L.push({ tipo: 'ejemplo', titulo: 'Mi ejemplo', consigna: 'Escribí en tu carpeta un ejemplo propio donde se vea la idea de la clase:', pista: '' });
    L.push({ tipo: 'pregunta', titulo: 'Mi duda', consigna: 'Escribí en tu carpeta una pregunta: algo que te quedó sin entender o que te gustaría saber más:', pista: '' });
    if (aj.mas_alla && clase.para_ir_mas_alla?.pregunta) L.push({ tipo: 'mas_alla', titulo: 'Para ir más allá', consigna: `${limpiar(clase.para_ir_mas_alla.pregunta)} Escribí tu respuesta en tu carpeta:`, pista: '' });
  }
  return L;
}

// ------------------------------------------------------------------ estilos del componente (van dentro del shadow DOM de la clase)
export const ESTILOS_CARPETA = `
.mc{display:grid;gap:14px}
.mc-intro{display:grid;gap:6px;padding:14px 16px;border-radius:var(--lc-radio,14px);background:var(--lc-azul-claro,#e8f1fb);border:1px solid var(--lc-borde,#dbe3ec)}
.mc-intro p{margin:0}
.mc-pasos{margin:0;padding-left:22px;display:grid;gap:4px}
.mc-intro .mc-grande{font-weight:700;font-size:1.05rem}
.mc-item{display:grid;gap:8px;background:#fff;border:2px solid var(--lc-borde,#dbe3ec);border-radius:var(--lc-radio,14px);padding:14px 16px}
.mc-item.mc-hecho{border-color:var(--lc-verde,#00a676)}
.mc-item h4{margin:0;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:var(--lc-azul-osc,#003f7d);font-family:var(--lc-fuente-titulos,inherit)}
.mc-nota{margin:0;font-size:.92rem;font-weight:600}
.mc-consigna{margin:0;font-weight:700;font-size:1.05rem}
.mc-modelo{margin:0;padding:12px 14px;border-radius:10px;background:var(--lc-azul-claro,#e8f1fb);border-left:6px solid var(--lc-azul,#00509e);font-size:1.15rem;line-height:1.5;font-weight:600;user-select:text}
.mc-fila{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.mc textarea{width:100%;box-sizing:border-box;min-height:84px;resize:vertical;border:2px solid var(--lc-borde,#dbe3ec);border-radius:10px;padding:10px 12px;font:inherit;font-size:1.02rem;color:var(--lc-texto,#1f2a37);background:#fff}
.mc textarea:focus{outline:3px solid #ffbf00;outline-offset:1px;border-color:var(--lc-azul,#00509e)}
.mc-chips{display:flex;flex-wrap:wrap;gap:8px}
.mc-chip{border:2px solid var(--lc-azul,#00509e);background:#fff;color:var(--lc-azul-osc,#003f7d);border-radius:999px;padding:6px 14px;font:inherit;font-weight:600;cursor:pointer}
.mc-chip[aria-pressed="true"]{background:var(--lc-azul,#00509e);color:#fff}
.mc-pista{margin:0;padding:8px 12px;border-radius:8px;background:var(--lc-acento-claro,#fff8e1);border:1px solid var(--lc-acento-borde,#f6dc8c)}
.mc-estado{margin:0;font-weight:600;min-height:1.3em}
.mc-estado.ok{color:var(--lc-verde-osc,#00805b)}
.mc-estado.casi{color:var(--lc-naranja-osc,#c2410c)}
.mc-envio{display:grid;gap:8px;padding:14px 16px;border-radius:var(--lc-radio,14px);background:#fff;border:2px dashed var(--lc-azul,#00509e)}
.mc-envio p{margin:0}
.lc-mayus .mc{text-transform:uppercase}
.lc-mayus .mc textarea{text-transform:uppercase}
.lc-grandes .mc textarea{font-size:1.25rem;min-height:104px}
.lc-letra-1 .mc{font-size:1.1rem}.lc-letra-2 .mc{font-size:1.25rem}
`;

// ------------------------------------------------------------------ componente
// corregir({tipo, consigna, respuesta, referencia}) -> Promise<{ok, mensaje}>  (la pasa la clase; usa la IA)
export function crearMiCarpeta(clase, { ajustes = {}, dimensiones = null, registrar = () => {}, corregir = null, sinBotonEscuchar = false } = {}) {
  const aj = ajustes || {};
  const pistaVisible = !!aj.pista_previa || (dimensiones && dimensiones.lectoescritura === 'extenso');
  const modo = modoDeCarpeta(aj, dimensiones);
  const mayus = t => (aj.mayusculas ? String(t).toUpperCase() : String(t));
  const consignas = armarConsignas(clase, modo, aj);
  const previa = leerTodo()[clase.id];
  const previas = (previa && previa.modo === modo && Array.isArray(previa.entradas)) ? previa.entradas : [];

  const raiz = el('section', 'mc');
  raiz.setAttribute('data-modo', modo);
  const intro = el('div', 'mc-intro');
  intro.innerHTML = `
    <p class="mc-grande">${esc(mayus('Ahora vamos a trabajar en la carpeta de la clase.'))}</p>
    <p><b>${esc(mayus('Primero, preguntale a tu docente'))}</b> ${esc(mayus('si tenés que escribir las actividades solo en la carpeta o también acá, en la pantalla.'))}</p>
    <p>${esc(mayus('Si también lo tenés que hacer en la pantalla, seguí estos pasos:'))}</p>
    <ol class="mc-pasos"><li>${esc(mayus('Escribí cada parte acá, en la pantalla.'))}</li><li>${esc(mayus('Apretá “Listo”: LumAI la guarda.'))}</li><li>${esc(mayus('Después escribilo en tu carpeta.'))}</li></ol>`;
  raiz.appendChild(intro);

  const campos = []; // { leer(), hecho() }
  const hoja = () => ({ id: clase.id, titulo: limpiar(clase.titulo), materia: limpiar(clase.materia || ''), modo, fecha: new Date().toLocaleDateString('es-AR'), entradas: campos.map(c => c.leer()) });
  let timer = null;
  const guardarPronto = () => { clearTimeout(timer); timer = setTimeout(() => guardarHoja(clase.id, hoja()), 500); };

  consignas.forEach((c, idx) => {
    const previo = previas[idx] || {};
    const item = el('div', 'mc-item');
    item.appendChild(el('h4', '', esc(mayus(c.titulo))));
    item.appendChild(el('p', 'mc-consigna', esc(mayus(c.consigna))));
    if (c.tipo === 'palabra') item.appendChild(el('p', 'mc-nota', esc(mayus('Todas las palabras nuevas, escribilas en tu carpeta.'))));

    const area = document.createElement('textarea');
    area.id = `mc-t-${clase.id}-${idx}`;
    area.setAttribute('aria-label', c.consigna);
    area.value = previo.respuesta || c.inicio || '';
    area.rows = modo === 'copiar' ? 3 : 4;
    const estado = el('p', 'mc-estado');
    estado.setAttribute('aria-live', 'polite');

    let palabraElegida = previo.palabra || '';
    let hecho = !!previo.hecho;
    let intentos = 0;
    const historial = Array.isArray(previo.historial) ? previo.historial.slice(-10) : [];
    const anotarIntento = (texto, resultado, mensaje) => {
      const reg = { n: historial.length + 1, respuesta: texto.slice(0, 500), resultado, mensaje: String(mensaje || '').slice(0, 200), hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) };
      historial.push(reg);
      guardarHoja(clase.id, hoja());
      registrar('carpeta_intento', { clase: clase.id, modo, indice: idx, titulo: c.titulo, ...reg });
    };
    const listo = el('button', 'lc-btn lc-btn-chico', '✅ Listo');
    listo.type = 'button';
    if (hecho) { item.classList.add('mc-hecho'); estado.className = 'mc-estado ok'; estado.textContent = '💾 Guardado en LumAI.'; }

    area.addEventListener('input', () => {
      hecho = false; item.classList.remove('mc-hecho'); guardarPronto();
      if (c.modelo) {
        const v = norm(area.value), m = norm(c.modelo);
        if (!v) { estado.textContent = ''; return; }
        if (v === m) { estado.textContent = '¡Copiaste muy bien! ✅'; estado.className = 'mc-estado ok'; }
        else if (m.startsWith(v)) { estado.textContent = 'Vas muy bien, seguí. ✍️'; estado.className = 'mc-estado ok'; }
        else {
          const pm = m.split(' '), pv = v.split(' ');
          let i = 0; while (i < pv.length && pv[i] === pm[i]) i++;
          estado.textContent = pm[i] ? `Casi. Mirá bien la palabra “${mayus(pm[i])}”.` : 'Casi. Mirá otra vez la frase.';
          estado.className = 'mc-estado casi';
        }
      }
    });

    if (c.modelo) {
      item.appendChild(el('p', 'mc-modelo', esc(mayus(c.modelo))));
      if (vozDisponible() && !sinBotonEscuchar) {
        const oir = el('button', 'lc-btn lc-sec lc-btn-chico', '🔊 Escuchar');
        oir.type = 'button';
        oir.addEventListener('click', () => hablar(c.modelo, { ajustes: aj, rate: aj.voz >= 2 ? 0.85 : undefined }));
        item.appendChild(el('div', 'mc-fila')).appendChild(oir);
      }
    }

    if (c.palabras) {
      const chips = el('div', 'mc-chips');
      const pista = el('p', 'mc-pista');
      pista.hidden = true;
      const marcar = (b, p, inicial = false) => {
        const anterior = palabraElegida;
        palabraElegida = p.palabra;
        chips.querySelectorAll('.mc-chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        pista.hidden = false;
        pista.textContent = `Pista: ${mayus(p.pista)}`;
        // El cuadro arranca con la palabra elegida, salvo que el alumno ya haya escrito algo propio
        const v = area.value.trim();
        if (!inicial && (!v || v === `${anterior}:`)) area.value = `${p.palabra}: `;
        guardarPronto();
      };
      c.palabras.forEach(p => {
        const b = el('button', 'mc-chip', esc(mayus(p.palabra)));
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => marcar(b, p));
        if (p.palabra === palabraElegida) setTimeout(() => marcar(b, p, true), 0);
        chips.appendChild(b);
      });
      item.append(chips, pista);
    } else if (c.pista && modo !== 'libre') {
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

    const aceptar = (revision) => {
      hecho = true;
      item.classList.add('mc-hecho');
      const h = hoja();
      guardarHoja(clase.id, h);
      const e = h.entradas[idx];
      registrar('carpeta_parte', { clase: clase.id, modo, indice: idx, titulo: e.titulo, respuesta: e.respuesta.slice(0, 600), revision });
    };
    listo.addEventListener('click', async () => {
      const texto = area.value.trim();
      const vacio = texto.replace(/[^\p{L}]/gu, '').length < 3 || (c.inicio && norm(texto) === norm(c.inicio));
      if (vacio) { estado.className = 'mc-estado casi'; estado.textContent = mayus('Escribí tu respuesta en el cuadro y después apretá Listo.'); return; }
      intentos += 1;
      // Si ya recibió la devolución y corrigió, LumAI solo guarda (sin otra devolución)
      if (intentos >= 2) {
        anotarIntento(texto, 'corregido_por_alumno', '');
        aceptar('corregido_por_alumno');
        estado.className = 'mc-estado ok';
        estado.textContent = mayus('💾 LumAI guardó tu respuesta. Ahora pasala a tu carpeta.');
        return;
      }
      if (c.modelo) {
        // Copia: se avisa si faltó algo, pero a la segunda vez se guarda igual
        const igual = norm(texto) === norm(c.modelo);
        anotarIntento(texto, igual ? 'copia_ok' : 'copia_con_diferencias', '');
        if (!igual && intentos < 2) {
          const dif = diferenciasCopia(texto, c.modelo);
          estado.className = 'mc-estado casi';
          estado.textContent = mayus(dif ? `Casi. Revisá: ${dif}. Corregilo y apretá Listo otra vez.` : 'Casi. Mirá bien la frase y corregí lo que falta. Después apretá Listo otra vez.');
          return;
        }
        aceptar(igual ? 'copia_ok' : 'copia_con_diferencias');
        estado.className = 'mc-estado ok'; estado.textContent = mayus(igual ? '💾 ¡Perfecto! Guardado en LumAI. Ahora copialo en tu carpeta.' : '💾 Guardado en LumAI. Copialo en tu carpeta.');
        return;
      }
      listo.disabled = true;
      estado.className = 'mc-estado'; estado.textContent = '🤖 LumAI está leyendo lo que escribiste…';
      let r;
      try { r = corregir ? await corregir({ tipo: c.tipo, consigna: c.consigna, respuesta: texto, referencia: c.pista || '' }) : { ok: true, mensaje: '', sinRevision: true }; }
      catch (e) { r = { ok: true, mensaje: '', sinRevision: true }; }
      listo.disabled = false;
      anotarIntento(texto, r.sinRevision ? 'sin_ia' : (r.ok ? 'ok' : 'reescribir'), r.mensaje);
      if (r.ok || intentos >= 2) {
        aceptar(r.sinRevision ? 'sin_ia' : (r.ok ? 'ok' : 'con_observaciones'));
        estado.className = 'mc-estado ok';
        estado.textContent = `💾 Guardado en LumAI. ${r.mensaje || ''} Ahora pasalo a tu carpeta.`.replace(/\s+/g, ' ');
      } else {
        estado.className = 'mc-estado casi';
        estado.textContent = `✏️ ${r.mensaje || 'Probá escribirlo de nuevo.'} Corregilo y apretá Listo otra vez.`;
      }
    });

    const filaListo = el('div', 'mc-fila');
    filaListo.appendChild(listo);
    item.append(area, filaListo, estado);
    campos.push({
      leer: () => {
        const r = area.value.trim();
        const conLetras = r.replace(/[^\p{L}]/gu, '').length >= 3 && !(c.inicio && norm(r) === norm(c.inicio)) && !(palabraElegida && norm(r) === norm(`${palabraElegida}:`));
        const completa = conLetras && (!c.modelo || norm(r) === norm(c.modelo));
        return { tipo: c.tipo, titulo: c.titulo, consigna: c.consigna, modelo: c.modelo || '', palabra: palabraElegida, respuesta: r, hecho, completa, historial: historial.slice(-10) };
      },
      hecho: () => hecho
    });
    raiz.appendChild(item);
  });

  // ---- enviar al docente (recién acá las respuestas llegan al reporte)
  const envio = el('div', 'mc-envio');
  envio.appendChild(el('p', 'mc-consigna', esc(mayus('¿Querés enviar tus respuestas a tu docente?'))));
  envio.appendChild(el('p', '', `<small>${esc(mayus('Las partes que apretaste “Listo” ya quedaron guardadas en LumAI. Si las enviás, tu docente las va a ver en su reporte.'))}</small>`));
  const fila = el('div', 'mc-fila');
  const si = el('button', 'lc-btn lc-btn-chico', '📨 Sí, enviar');
  const no = el('button', 'lc-btn lc-sec lc-btn-chico', 'Ahora no');
  si.type = 'button'; no.type = 'button';
  const resultado = el('p', 'mc-estado');
  resultado.setAttribute('aria-live', 'polite');
  si.addEventListener('click', () => {
    // Se envía siempre; si algo quedó sin escribir, incompleto o sin "Listo", se le avisa al alumno
    const entradas = campos.map(c => c.leer());
    const problemas = entradas.filter(e => !e.completa || !e.hecho).map(e => e.titulo);
    const h = hoja();
    registrar('carpeta_entregada', {
      clase: clase.id, titulo: h.titulo, modo,
      entradas: entradas.map(e => ({ titulo: e.titulo, palabra: e.palabra, modelo: e.modelo.slice(0, 220), respuesta: e.respuesta.slice(0, 600), guardada: e.hecho, completa: e.completa, intentos: (e.historial || []).slice(-6) })).slice(0, 8)
    });
    if (problemas.length) {
      resultado.className = 'mc-estado casi';
      resultado.textContent = mayus(`Se enviaron a tu docente. Ojo: ${problemas.join(', ')} ${problemas.length === 1 ? 'quedó' : 'quedaron'} sin terminar. Si la${problemas.length === 1 ? '' : 's'} completás, apretá “Listo” y enviá de nuevo.`);
    } else {
      resultado.className = 'mc-estado ok';
      resultado.textContent = mayus('¡Listo! Tus respuestas van a llegar a tu docente. 🎉');
    }
  });
  no.addEventListener('click', () => { resultado.className = 'mc-estado'; resultado.textContent = mayus('Está bien. Quedaron guardadas en LumAI y las podés mostrar a tu docente cuando quieras.'); });
  fila.append(si, no);
  envio.append(fila, resultado);
  raiz.appendChild(envio);

  return { nodo: raiz, modo };
}
