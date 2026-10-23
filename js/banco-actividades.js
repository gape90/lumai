// js/banco-actividades.js - Actividades armadas con el contenido de cada clase base
// =============================================================================
// Las clases de contenidos/clases/*.json ya traen todo lo necesario para jugar:
//   - capsulas[].chequeo        -> preguntas de opción múltiple con su respuesta correcta
//   - capsulas[].idea_clave     -> afirmaciones verdaderas
//   - errores_frecuentes        -> afirmaciones falsas (con su aclaración)
//   - preguntas_clave           -> preguntas con respuesta corta
//   - vocabulario               -> "¿Qué es...?" con su definición
//   - banco.palabras            -> palabras de una sola palabra con pista corta (sopa de letras)
// Así los juegos no dependen de que la IA acierte: si hay clase base, se usa esto.
// El nivel de apoyo sale de los ajustes del perfil de 13 dimensiones (adaptacion.js).
// Ningún dato del alumno se envía a ningún lado.
// =============================================================================

import { estadoGlobal } from './config.js';
import { hablar } from './voz.js';

let cache = { id: null, clase: null };

export async function cargarClaseActual() {
  const id = estadoGlobal.claseBase;
  if (!id) return null;
  if (cache.id === id && cache.clase) return cache.clase;
  try {
    const r = await fetch(`contenidos/clases/${id}.json`);
    if (!r.ok) throw new Error(r.status);
    cache = { id, clase: await r.json() };
    return cache.clase;
  } catch (e) {
    console.warn('⚠️ No se pudo leer la clase para armar actividades:', e);
    return null;
  }
}

// ---------------------------------------------------------------- utilidades

const limpiar = t => String(t ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const mezclar = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const primeraOracion = t => { const s = limpiar(t); const m = s.match(/^.+?[.!?](?=\s|$)/); return m ? m[0] : s; };
const minuscula1 = t => t.charAt(0).toLowerCase() + t.slice(1);
const mayuscula1 = t => t.charAt(0).toUpperCase() + t.slice(1);
// Restaura las tildes de una palabra del banco usando las formas que aparecen en el texto de la clase
function conTildes(palabra, clase) {
  const k = clave(palabra);
  const formas = {};
  (JSON.stringify(clase).match(/[\p{L}]+/gu) || []).forEach(w => {
    if (clave(w) === k) formas[w.toLowerCase()] = (formas[w.toLowerCase()] || 0) + 1;
  });
  const conAcento = Object.entries(formas).filter(([w]) => /[áéíóúüñ]/.test(w)).sort((a, b) => b[1] - a[1])[0];
  const elegida = conAcento ? conAcento[0] : palabra.toLowerCase();
  return mayuscula1(elegida);
}
const clave = t => limpiar(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function unicos(lista, f = x => x) {
  const visto = new Set();
  return lista.filter(x => { const k = clave(f(x)); if (visto.has(k)) return false; visto.add(k); return true; });
}

// Cuánto apoyo necesita el alumno, según las perillas del perfil (null si no hay perfil calculado)
export function ajustesActuales() {
  return estadoGlobal.ajustes || null;
}

export function nivelDeApoyo() {
  const a = ajustesActuales();
  if (!a) return null;
  const apoyos = [
    a.capsulas === 'esenciales', a.texto !== 'completo', a.letra > 0, a.voz > 0, a.pausa_cada > 0,
    a.calmo, a.botones_grandes, a.sin_puntaje, a.sin_tiempos, a.opciones < 3, a.pista_previa, a.anticipar
  ].filter(Boolean).length;
  if (apoyos >= 3) return 'bajo';       // mucho apoyo: pocas actividades, más tiempo, menos opciones
  if (apoyos >= 1 || !a.mas_alla) return 'medio';
  return 'alto';                         // sin barreras y con "ir más allá"
}

// Retoca la configuración de un juego según las perillas del perfil
export function ajustarConfiguracion(config) {
  const a = ajustesActuales();
  const c = { ...config };
  if (!a) return c;
  if (a.sin_tiempos) {
    if ('tiempoRespuesta' in c) c.tiempoRespuesta = 0;     // 0 = sin límite
    if ('velocidad' in c) c.velocidad = Math.min(c.velocidad, 0.5);
    if ('velocidadMundo' in c) c.velocidadMundo = Math.round(c.velocidadMundo * 0.8);
  }
  if (a.opciones && 'opciones' in c) c.opciones = Math.min(c.opciones, Math.max(2, a.opciones));
  return c;
}

// ------------------------------------------------------------------- piezas

function hechosVerdaderos(clase) {
  const lista = [];
  (clase.capsulas || []).forEach(c => {
    const t = limpiar(c.idea_clave);
    if (t.length >= 20 && t.length <= 150) lista.push({ enunciado: t, respuesta: true, explicacion: 'Está en la clase: ' + t });
  });
  (clase.vocabulario || []).forEach(v => {
    const d = primeraOracion(v.definicion);
    if (d.length >= 15 && d.length <= 130) {
      lista.push({ enunciado: `${limpiar(v.palabra)}: ${minuscula1(d)}`, respuesta: true, explicacion: `Así se define ${limpiar(v.palabra)} en la clase.` });
    }
  });
  return unicos(lista, x => x.enunciado);
}

function hechosFalsos(clase) {
  return unicos((clase.errores_frecuentes || [])
    .map(e => ({ enunciado: limpiar(e.error), respuesta: false, explicacion: limpiar(e.aclaracion) }))
    .filter(e => e.enunciado.length >= 10 && e.enunciado.length <= 150), x => x.enunciado);
}

const esNumero = t => /^[−\-+]?\d[\d.,]*\s*(%|°C|°)?$/.test(limpiar(t));

function preguntasConOpciones(clase) {
  // { pregunta, correcta, incorrectas[], tipo } - los distractores son siempre del mismo tipo
  // que la respuesta correcta (número / frase corta / definición), para que ninguno sea absurdo
  // ni una segunda respuesta correcta.
  const items = [];
  (clase.capsulas || []).forEach(c => {
    const q = c.chequeo;
    if (!q || !Array.isArray(q.opciones) || q.opciones.length < 2) return;
    items.push({
      pregunta: limpiar(q.pregunta),
      correcta: limpiar(q.opciones[q.correcta]),
      incorrectas: q.opciones.filter((_, i) => i !== q.correcta).map(limpiar),
      origen: 'chequeo'
    });
  });

  const claves = [];
  (clase.preguntas_clave || []).forEach(p => {
    const r = limpiar(p.respuesta);
    if (r.length > 0 && r.length <= 55) claves.push({ pregunta: limpiar(p.pregunta), correcta: r, tipo: esNumero(r) ? 'num' : 'frase' });
  });
  const defs = (clase.vocabulario || []).map(v => ({ pregunta: `¿Qué es «${limpiar(v.palabra)}»?`, correcta: primeraOracion(v.definicion), tipo: 'def' }))
    .filter(v => v.correcta.length >= 10 && v.correcta.length <= 90);

  [...claves, ...defs].forEach((p, i, todo) => {
    const mismos = todo.filter((o, j) => j !== i && o.tipo === p.tipo && clave(o.correcta) !== clave(p.correcta)).map(o => o.correcta);
    const pozo = unicos(mismos);
    // las respuestas "frase" repiten la definición de otra pregunta: se evitan los que contienen la correcta
    const seguros = pozo.filter(r => !clave(r).includes(clave(p.correcta)) && !clave(p.correcta).includes(clave(r)));
    if (seguros.length >= 2) items.push({ ...p, incorrectas: seguros.slice(0, 8), origen: 'clave' });
  });
  return unicos(items, x => x.pregunta);
}

// ----------------------------------------------------------------- tipos de juego

export async function hayBanco() {
  const c = await cargarClaseActual();
  return Boolean(c);
}

// Devuelve las actividades del tipo pedido, o null si no hay banco para el tema
export async function actividadesDelBanco(tipo, config = {}) {
  const clase = await cargarClaseActual();
  if (!clase) return null;
  const opcionesMax = Math.max(2, config.opciones || 3);

  switch (tipo) {
    case 'verdadero-falso': {
      const n = config.cantidadPreguntas || 4;
      const cortos = l => { if (ajustesActuales()?.texto !== 'simple') return l; const c = l.filter(x => x.enunciado.length <= 75); return c.length >= Math.ceil(n / 2) ? c : l; };
      const v = mezclar(cortos(hechosVerdaderos(clase))), f = mezclar(cortos(hechosFalsos(clase)));
      const nF = Math.min(f.length, Math.floor(n / 2)), nV = n - nF;
      const lista = mezclar([...v.slice(0, nV), ...f.slice(0, nF)]);
      return lista.length >= Math.min(3, n) ? lista : null;
    }
    case 'multiple-choice': {
      const n = config.cantidadPreguntas || 4;
      const lista = preguntasConOpciones(clase).slice(0, n * 2);
      const elegidas = [...lista.filter(x => x.origen === 'chequeo'), ...mezclar(lista.filter(x => x.origen !== 'chequeo'))].slice(0, n);
      if (elegidas.length < Math.min(3, n)) return null;
      return elegidas.map(q => {
        const incorrectas = mezclar(q.incorrectas).slice(0, opcionesMax - 1);
        const opciones = mezclar([q.correcta, ...incorrectas]);
        return { pregunta: q.pregunta, opciones, respuesta_correcta: opciones.indexOf(q.correcta) };
      });
    }
    case 'basketball':
    case 'race': {
      const n = config.cantidadPreguntas || 4;
      // preguntas con respuesta corta (para que entre en una pelota o un carril)
      const base = [];
      (clase.banco?.palabras || []).forEach(p => base.push({ pregunta: `¿Qué palabra corresponde? ${limpiar(p.pista)}`, correcta: conTildes(limpiar(p.palabra), clase) }));
      preguntasConOpciones(clase).filter(q => q.correcta.length <= 30).forEach(q => base.push(q));
      const palabrasBanco = unicos((clase.banco?.palabras || []).map(p => conTildes(limpiar(p.palabra), clase)));
      const elegidas = mezclar(unicos(base, x => x.pregunta)).slice(0, n);
      if (elegidas.length < Math.min(3, n)) return null;
      return elegidas.map(q => {
        // palabras del banco -> otras palabras del banco; el resto, sus propios distractores
        const propias = q.incorrectas || palabrasBanco;
        const inc = unicos(propias.filter(r => clave(r) !== clave(q.correcta))).slice(0, 9);
        return tipo === 'basketball'
          ? { pregunta: q.pregunta, respuesta_correcta: q.correcta, respuestas_incorrectas: inc }
          : { pregunta: q.pregunta, correcta: q.correcta, incorrectas: inc.slice(0, 3) };
      });
    }
    case 'sopa-de-letras': {
      const n = config.cantidadPalabras || 4;
      const lista = (clase.banco?.palabras || []).map(p => ({ palabra: limpiar(p.palabra).toUpperCase(), pista: limpiar(p.pista) }))
        .filter(p => /^[A-ZÑ]+$/.test(p.palabra) && p.palabra.length >= 4 && p.palabra.length <= (config.gridSize || 10) - 1);
      // palabras más cortas primero cuando hay mucho apoyo (grilla chica)
      const elegidas = mezclar(lista).slice(0, n);
      return elegidas.length >= Math.min(3, n) ? elegidas : null;
    }
    case 'puente-palabras': {
      const n = config.cantidadPares || 4;
      const l = mezclar((clase.banco?.simples || []).map(x => ({ palabra: x.palabra, emoji: x.emoji })));
      return l.length >= Math.min(3, n) ? l.slice(0, n) : null;
    }
    case 'aventura-silabas': {
      const n = config.palabrasPorRonda || 5;
      const l = mezclar(clase.banco?.simples || []);
      return l.length >= Math.min(3, n) ? l.slice(0, n).map(x => ({ palabra: x.palabra, silabas: x.silabas, emoji: x.emoji, explicacion: x.explicacion || '' })) : null;
    }
    case 'exploradores-sonido': {
      const n = config.maxFrases || 4;
      const l = (clase.banco?.frases || []).map(f => limpiar(f).toUpperCase());
      return l.length >= Math.min(2, n) ? l.slice(0, n) : null;
    }
    default:
      return null;
  }
}

// Cuando no hay clase base y la IA no respondió bien: no se inventan preguntas sin sentido,
// se avisa y se deja reintentar.
export function errorSinContenido(causa) {
  const e = new Error('SIN_CONTENIDO: la IA no devolvió una actividad válida' + (causa?.message ? ` (${causa.message})` : ''));
  e.code = 'SIN_CONTENIDO';
  return e;
}

// ------------------------------------------------- perillas visuales en los juegos
// letra / mayúsculas / botones grandes / entorno calmo / sin puntaje, igual que en las clases.
let observador = null;

export function aplicarPerillasAJuego() {
  const a = ajustesActuales();
  const cont = document.getElementById('actividades');
  if (!a || !cont) return;

  let st = document.getElementById('lumai-perillas-juego');
  if (!st) { st = document.createElement('style'); st.id = 'lumai-perillas-juego'; document.head.appendChild(st); }
  const zoom = [1, 1.2, 1.4][Math.min(a.letra || 0, 2)];
  const reglas = [];
  if (zoom > 1) reglas.push(`#actividades { zoom: ${zoom}; }`);
  if (a.mayusculas) reglas.push(`#actividades button, #actividades [class*="pregunta"], #actividades [class*="question"] { text-transform: uppercase; }`);
  if (a.botones_grandes) reglas.push(`#actividades button { min-height: 64px; min-width: 120px; font-size: 1.15em !important; }`);
  if (a.calmo) reglas.push(`#actividades *, #actividades *::before, #actividades *::after { animation: none !important; transition: none !important; }`);
  st.textContent = reglas.join('\n');

  if (observador) observador.disconnect();
  observador = null;
  const tareas = [];

  if (a.sin_puntaje) {
    tareas.push(() => cont.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && /^\s*Puntaje\s*:?/i.test(el.textContent)) el.style.display = 'none';
      else if (el.children.length <= 2 && /Puntaje\s*:/i.test(el.textContent) && el.textContent.length < 40) {
        el.querySelectorAll('span,b,strong').forEach(h => { if (/Puntaje|^\d+$/.test(h.textContent.trim())) h.style.display = 'none'; });
        if (/^\s*Puntaje\s*:\s*\d+\s*$/i.test(el.textContent)) el.style.display = 'none';
      }
    }));
  }
  if (a.voz > 0) tareas.push(() => lecturaEnVoz(cont, a));

  if (tareas.length) {
    const correr = () => tareas.forEach(t => { try { t(); } catch (e) { /* no frena el juego */ } });
    observador = new MutationObserver(correr);
    observador.observe(cont, { childList: true, subtree: true, characterData: true });
    correr();
  }
}

// Verdadero/falso y opción múltiple: si el perfil activa la voz, se lee la consigna (y las opciones) en voz alta
// con el texto en pantalla, y queda un botón para volver a escucharla. La voz nunca dice cuál es la correcta.
let ultimaLeida = '';
function lecturaEnVoz(cont, a) {
  const el = cont.querySelector('#vf-statement, #mc-question');
  if (!el) return;
  const overlay = cont.querySelector('.vf-overlay, .mc-overlay');
  const overlayVisible = overlay && getComputedStyle(overlay).display !== 'none';
  const pregunta = el.textContent.trim().replace(/…$/, '');
  if (!pregunta || overlayVisible) return;

  const opciones = [...cont.querySelectorAll('.mc-option')].map(o => o.textContent.trim().replace(/^([A-D])\)\s*/, '$1: ').replace(/[.…]+$/, ''));
  const texto = opciones.length ? `${pregunta} ${opciones.join('. ')}` : pregunta;
  const esVF = el.id === 'vf-statement';
  const textoVF = esVF ? `Verdadero o falso: ${pregunta}` : texto;

  // botón para repetir (una vez por pregunta)
  let boton = cont.querySelector('#lumai-btn-escuchar');
  if (!boton) {
    boton = document.createElement('button');
    boton.id = 'lumai-btn-escuchar';
    boton.type = 'button';
    boton.textContent = '🔊 Escuchar';
    boton.style.cssText = 'margin:8px auto;display:block;padding:10px 20px;font-size:1.05rem;font-weight:700;border:none;border-radius:24px;background:#00509e;color:#fff;cursor:pointer';
    el.insertAdjacentElement('afterend', boton);
    boton.addEventListener('click', () => {
      const e2 = cont.querySelector('#vf-statement, #mc-question');
      const ops = [...cont.querySelectorAll('.mc-option')].map(o => o.textContent.trim().replace(/^([A-D])\)\s*/, '$1: ').replace(/[.…]+$/, ''));
      const q = e2 ? e2.textContent.trim().replace(/…$/, '') : '';
      hablar(e2?.id === 'vf-statement' ? `Verdadero o falso: ${q}` : [q, ...ops].join('. '), { ajustes: a, rate: 0.95 });
    });
  }

  const clave2 = texto;
  if (clave2 !== ultimaLeida) {
    ultimaLeida = clave2;
    if (!a.voz_sin_auto) hablar(textoVF.replace(/ ([A-D]): /g, '. $1: '), { ajustes: a, rate: 0.95 });
  }
}

// ------------------------------------------------------ juegos de lectoescritura (N0)
// Cantidades según el apoyo que necesita el alumno y su sentido numérico.
export function configurarJuegoN0(tipo, config) {
  const apoyo = nivelDeApoyo();
  const a = ajustesActuales();
  if (!apoyo || !a) return config;                   // sin perfil de 13 dimensiones: no se toca
  const c = { ...config };
  const i = { bajo: 0, medio: 1, alto: 2 }[apoyo];
  if (tipo === 'aventura-silabas') c.palabrasPorRonda = [3, 4, 5][i];
  if (tipo === 'puente-palabras') c.cantidadPares = [3, 4, 5][i];
  if (tipo === 'exploradores-sonido') c.maxFrases = [2, 3, 4][i];
  if (tipo === 'supermercado') {
    c.maxProductos = [3, 4, 5][i];
    const num = (estadoGlobal.perfilDimensiones || {}).sentido_numerico;
    const tope = { generalizado: 5, extenso: 8, limitado: 12 }[num];
    c.maxCantidad = Math.min(c.maxCantidad, tope || c.maxCantidad, [6, 10, 20][i]);
  }
  // los juegos con burbujas o tiempo: más lentos si el perfil lo pide
  c.factorTiempo = a.sin_tiempos ? 2 : (a.calmo || apoyo === 'bajo') ? 1.4 : 1;
  return c;
}
