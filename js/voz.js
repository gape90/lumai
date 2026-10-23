// js/voz.js - Voz única de LumAI (la misma en las clases y en los juegos)
// =============================================================================
// - Elige la voz como la clase: es-AR si existe, si no cualquier español.
// - Muestra en pantalla el texto que se está leyendo y va marcando la palabra
//   que suena (usa los eventos "boundary" de la síntesis; si la voz no los da,
//   el texto igual queda visible).
// - Lee en minúsculas: en mayúsculas algunas voces deletrean las palabras.
// =============================================================================

const ID = 'lumai-voz-caption';
let actual = null;   // { utter, spans, onstop }
let timerOcultar = null;

export function vozDisponible() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Voz masculina y lo más natural posible. Las voces "Natural"/"Online" (Edge, Windows 11) son
// neuronales y suenan mucho más reales; después, las voces masculinas en español del sistema.
const VOCES_MASCULINAS = /(tom[aá]s|jorge|[aá]lvaro|gonzalo|lorenzo|mateo|ra[uú]l|gerardo|diego|juan|carlos|pablo|enrique|emilio|alonso|andr[eé]s|sergio|arnau|dar[ií]o|nicol[aá]s|federico|male|hombre)/i;
const VOCES_FEMENINAS = /(elena|helena|laura|sabina|paulina|m[oó]nica|dalia|elvira|paloma|ximena|catalina|camila|valentina|salom[eé]|marisol|luc[ií]a|paula|soledad|sof[ií]a|elsa|irene|mar[ií]a|esperanza|female|mujer)/i;
let vozElegida = null;
export function elegirVoz() {
  if (!vozDisponible()) return null;
  const voces = window.speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang || ''));
  if (!voces.length) return null;
  const puntaje = v => {
    let p = 0;
    if (/^es[-_]AR/i.test(v.lang)) p += 30; else if (/^es[-_](UY|CL|MX|US|419|CO)/i.test(v.lang)) p += 18; else p += 10;
    if (/natural|online|neural|premium|enhanced|mejorad/i.test(v.name)) p += 60;
    if (VOCES_MASCULINAS.test(v.name)) p += 45;
    if (VOCES_FEMENINAS.test(v.name)) p -= 70;
    if (/google/i.test(v.name)) p -= 15;   // la voz de Google en español es femenina
    return p;
  };
  vozElegida = [...voces].sort((a, b) => puntaje(b) - puntaje(a))[0];
  return vozElegida;
}

// En algunos navegadores las voces cargan tarde: se refrescan al estar listas
if (vozDisponible()) window.speechSynthesis.addEventListener?.('voiceschanged', () => elegirVoz());

function aOracion(t) {
  const min = String(t).toLowerCase();
  return min.replace(/(^\s*|[.!?¿¡]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}

function limpiarTexto(t) {
  return String(t || '').replace(/<[^>]*>/g, ' ').replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
}

function estilos() {
  if (document.getElementById(ID + '-css')) return;
  const st = document.createElement('style');
  st.id = ID + '-css';
  st.textContent = `
  #${ID}{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;width:min(820px,calc(100vw - 24px));
    background:#0f2744;color:#fff;border-radius:16px;padding:14px 18px 14px 18px;box-shadow:0 10px 30px rgba(0,0,0,.35);
    font-family:'Poppins',system-ui,sans-serif;display:flex;gap:12px;align-items:flex-start}
  #${ID} .vz-icono{font-size:1.4rem;line-height:1.4}
  #${ID} .vz-texto{flex:1;font-size:1.15rem;line-height:1.55;font-weight:500}
  #${ID} .vz-texto.vz-mayus{text-transform:uppercase}
  #${ID} .vz-p{padding:1px 2px;border-radius:6px;transition:background .12s,color .12s}
  #${ID} .vz-p.vz-ya{color:#9fb6d3}
  #${ID} .vz-p.vz-ahora{background:#ffd23f;color:#1a1a1a}
  #${ID} .vz-parar{background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:10px;padding:6px 10px;font-size:1rem;cursor:pointer}
  #${ID} .vz-parar:hover{background:rgba(255,255,255,.28)}`;
  document.head.appendChild(st);
}

function mostrarTexto(texto, estadoGlobalAjustes) {
  estilos();
  let caja = document.getElementById(ID);
  if (!caja) {
    caja = document.createElement('div');
    caja.id = ID;
    caja.setAttribute('role', 'status');
    caja.setAttribute('aria-live', 'off');
    document.body.appendChild(caja);
  }
  const zoom = [1, 1.2, 1.45][Math.min(estadoGlobalAjustes?.letra || 0, 2)];
  caja.innerHTML = '<span class="vz-icono" aria-hidden="true">🔊</span><div class="vz-texto"></div><button class="vz-parar" type="button" aria-label="Detener la voz">⏹</button>';
  const cont = caja.querySelector('.vz-texto');
  if (estadoGlobalAjustes?.mayusculas) cont.classList.add('vz-mayus');
  cont.style.fontSize = `${1.15 * zoom}rem`;
  caja.querySelector('.vz-parar').addEventListener('click', () => detenerVoz());
  const spans = [];
  const re = /\S+/g; let m;
  let ultimo = 0;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) cont.appendChild(document.createTextNode(texto.slice(ultimo, m.index)));
    const s = document.createElement('span');
    s.className = 'vz-p'; s.textContent = m[0];
    cont.appendChild(s);
    spans.push({ el: s, ini: m.index, fin: m.index + m[0].length });
    ultimo = m.index + m[0].length;
  }
  return spans;
}

function ocultarTexto() {
  if (timerOcultar) { clearTimeout(timerOcultar); timerOcultar = null; }
  document.getElementById(ID)?.remove();
}

export function detenerVoz() {
  if (!vozDisponible()) return;
  cadenaNatural++;
  const a = actual;
  actual = null;
  try { window.speechSynthesis.cancel(); } catch (e) { /* sin voz */ }
  if (a?.timer) clearTimeout(a.timer);
  ocultarTexto();
  a?.onstop?.();
}

// hablar(texto, { onend, rate, mostrar, ajustes })
//   mostrar: true (por defecto) muestra el texto en pantalla mientras suena
//   ajustes: perillas del perfil (letra, mayúsculas) para el tamaño del texto
export function hablar(texto, opciones = {}) {
  const { onend, onstop, rate = 0.95, mostrar = true, ajustes = null } = opciones;
  const limpio = aOracion(limpiarTexto(texto));
  if (!limpio) { onend?.(); return; }

  // Cancela lo anterior sin disparar su callback de "fin"
  if (vozDisponible()) { try { window.speechSynthesis.cancel(); } catch (e) { /* sin voz */ } }
  if (actual?.timer) clearTimeout(actual.timer);
  if (timerOcultar) { clearTimeout(timerOcultar); timerOcultar = null; }
  actual = null;

  const spans = mostrar ? mostrarTexto(limpio, ajustes) : [];

  // Sin voz en este navegador: el texto queda visible un tiempo razonable
  if (!vozDisponible()) {
    const espera = Math.max(2500, limpio.length * 60);
    const ref = { onstop, timer: setTimeout(() => { if (actual === ref) { actual = null; ocultarTexto(); } onend?.(); }, espera) };
    actual = ref;
    return;
  }

  const u = new SpeechSynthesisUtterance(limpio);
  u.lang = 'es-AR';
  const voz = elegirVoz();
  if (voz) u.voice = voz;
  u.rate = rate;

  const ref = { utter: u, spans, onstop, timer: null };
  actual = ref;

  let ultimoIdx = -1;
  u.onboundary = (e) => {
    if (actual !== ref || !spans.length) return;
    if (e.name && e.name !== 'word') return;
    const i = spans.findIndex(s => e.charIndex >= s.ini && e.charIndex < s.fin + 1);
    if (i < 0 || i === ultimoIdx) return;
    ultimoIdx = i;
    spans.forEach((s, k) => { s.el.classList.toggle('vz-ahora', k === i); s.el.classList.toggle('vz-ya', k < i); });
  };
  const terminar = () => {
    if (actual !== ref) return;
    if (ref.timer) { clearTimeout(ref.timer); ref.timer = null; }
    actual = null;
    spans.forEach(s => { s.el.classList.remove('vz-ahora'); s.el.classList.add('vz-ya'); });
    timerOcultar = setTimeout(ocultarTexto, 1200);
    onend?.();
  };
  u.onend = terminar;
  // Si el navegador no tiene voces (o no arranca), el juego no debe quedarse esperando:
  // sin "start" en 3 segundos se trata como sin voz y se deja el texto visible un rato.
  let empezo = false;
  u.onstart = () => { empezo = true; };
  ref.timer = setTimeout(() => {
    if (empezo || actual !== ref) return;
    try { window.speechSynthesis.cancel(); } catch (e) { /* sin voz */ }
    ref.timer = setTimeout(terminar, Math.max(2500, limpio.length * 60));
  }, 3000);
  u.onerror = (e) => { if (e.error === 'canceled' || e.error === 'interrupted') return; terminar(); };
  window.speechSynthesis.speak(u);
}


// ---------------------------------------------------------------- lectura natural (tocar para escuchar)
// Prepara el texto para que se entienda al oírlo: sin emojis ni símbolos, con signos dichos en palabras,
// y lo lee oración por oración con un pequeño silencio entre cada una.
export function textoParaVoz(t) {
  let x = limpiarTexto(String(t || '').replace(/\s*\n+\s*/g, '. '))
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ')
    .replace(/_{2,}/g, ', espacio en blanco, ')
    .replace(/\s=\s/g, ' es igual a ')
    .replace(/−\s?/g, ' menos ')
    .replace(/\s[–—-]\s/g, ', ')
    .replace(/(^|\s)\+(?=\s)/g, '$1más')
    .replace(/(^|[\s(])-(?=\d)/g, '$1 menos ')
    .replace(/(^|[\s(])\+(?=\d)/g, '$1 más ')
    .replace(/°\s?C\b/g, ' grados')
    .replace(/°/g, ' grados')
    .replace(/(\d)\s?%/g, '$1 por ciento')
    .replace(/(\d)\s?\/\s?(\d)/g, '$1 sobre $2')
    .replace(/[→⟶➜]/g, ', ')
    .replace(/[«»"“”]/g, '')
    .replace(/\s*[()]\s*/g, ', ')
    .replace(/\s*;\s*/g, '. ')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\s+([,.:!?])/g, '$1')
    .replace(/([,.:])(?:\s*[,.:])+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (x && !/[.!?…]$/.test(x)) x += '.';
  return aOracion(x);
}

let cadenaNatural = 0;
export function hablarNatural(texto, opciones = {}) {
  const { onend, rate = 0.95, pausa = 280 } = opciones;
  if (!vozDisponible()) { onend?.(); return; }
  detenerVoz();
  const frases = (textoParaVoz(texto).match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []).map(f => f.trim()).filter(Boolean);
  if (!frases.length) { onend?.(); return; }
  const id = ++cadenaNatural;
  const voz = elegirVoz();
  const decir = (i) => {
    if (id !== cadenaNatural) return;
    if (i >= frases.length) { onend?.(); return; }
    const u = new SpeechSynthesisUtterance(frases[i]);
    u.lang = voz?.lang || 'es-AR';
    if (voz) u.voice = voz;
    u.rate = rate;
    let siguio = false;
    const seguir = () => { if (siguio) return; siguio = true; setTimeout(() => decir(i + 1), pausa); };
    u.onend = seguir;
    u.onerror = (e) => { if (e.error === 'canceled' || e.error === 'interrupted') return; seguir(); };
    window.speechSynthesis.speak(u);
  };
  decir(0);
}

export function detenerNatural() { cadenaNatural++; try { window.speechSynthesis.cancel(); } catch (e) { /* sin voz */ } }
