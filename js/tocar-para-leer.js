// js/tocar-para-leer.js - "Tocá y te leo" para los perfiles que necesitan más apoyo
// =============================================================================
// En lugar de botones de "Escuchar", el alumno toca (con el dedo o el mouse) cualquier
// recuadro de la clase y LumAI lo lee en voz alta, con voz natural y pausas.
//   - Recuadros de texto: un toque y se lee.
//   - Botones y opciones: el PRIMER toque lee lo que dice; el SEGUNDO toque lo hace.
// Los juegos tienen su propio lector y no usan esto.
// =============================================================================

import { hablarNatural, detenerVoz, vozDisponible } from './voz.js';

// ¿Este perfil usa "tocá y te leo"? (voz activada y muchos apoyos a la vez)
export function usaTocarParaLeer(a) {
  if (!a || !vozDisponible() || !(a.voz >= 1)) return false;
  const apoyos = [a.capsulas === 'esenciales', a.texto !== 'completo', a.letra > 0, a.voz > 0, a.pausa_cada > 0, a.calmo,
    a.botones_grandes, a.sin_puntaje, a.sin_tiempos, a.opciones < 3, a.pista_previa, a.anticipar].filter(Boolean).length;
  return apoyos >= 3;
}

export const SECTORES_LECTURA = [
  // recuadros y dibujos completos
  '.lc-lectura-ayuda', '.lc-globo', '.lc-problema', '.lc-ejemplo', '.lc-cap-clave', '.lc-dato', '.lc-devolucion', '.lc-salida', '.lc-mision',
  '.lc-ec-pieza', '.lc-ct', '.lc-cifra', '.lc-tiempo li', '.lc-columna', '.lc-clasif-dato', '.lc-pasos-cuerpo', '.lc-lupa-msg',
  '.lc-logro', '.lc-orden-aviso', '.lc-leyenda', '.lc-lugar-ok', '.lc-aviso-ia', '.lc-problema-fb', '.lc-fb-bien', '.lc-fb-mal',
  '.lc-consigna', '.lc-cap-titulo', '.lc-tip', '.lc-eyebrow', '.lc-contador', '.lc-defs li', '.lc-resumen li',
  '.mc-consigna', '.mc-nota', '.mc-modelo', '.mc-pista', '.mc-estado',
  // cualquier texto de la clase
  'p', 'li', 'h3', 'h4', 'h5', 'figcaption', 'blockquote', 'td', 'th', 'dt', 'dd'
].join(',');

const ACCIONES = 'button, a[href], [role="button"], summary, .lc-opcion, .lc-chip, .mc-chip';

// Qué decir después de leer un botón, según lo que hace
function pistaDeAccion(b) {
  const t = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase();
  const c = b.classList;
  if (c.contains('lc-btn-desplegar')) return b.getAttribute('aria-expanded') === 'true' ? 'Tocá otra vez para cerrarlo.' : 'Tocá otra vez para abrirlo.';
  if (c.contains('lc-orden-item')) return 'Tocá otra vez para ubicarlo.';
  if (c.contains('lc-opcion')) return 'Tocá otra vez para elegir esta respuesta.';
  if (c.contains('lc-error-paso')) return 'Tocá otra vez si creés que acá está el error.';
  if (c.contains('lc-termino')) return 'Tocá otra vez para ver qué significa.';
  if (c.contains('lc-hot') || c.contains('lc-seg')) return 'Tocá otra vez para ver más.';
  if (b.closest('.lc-clasif-btns')) return 'Tocá otra vez para elegirla.';
  if (c.contains('lc-chip') || c.contains('mc-chip')) return 'Tocá otra vez para elegirla.';
  if (/siguiente|empezar|terminar|seguir/.test(t)) return 'Tocá otra vez para seguir.';
  if (/volver/.test(t)) return 'Tocá otra vez para volver.';
  if (/listo/.test(t)) return 'Tocá otra vez para guardar.';
  if (/enviar/.test(t)) return 'Tocá otra vez para enviar.';
  if (/ponemos a prueba|actividades/.test(t)) return 'Tocá otra vez para empezar.';
  if (/finalizar/.test(t)) return 'Tocá otra vez para terminar la clase.';
  if (/pista|respuesta|ver /.test(t)) return 'Tocá otra vez para verla.';
  if (/escuchar/.test(t)) return 'Tocá otra vez para escucharlo.';
  return 'Tocá otra vez para hacerlo.';
}

function textoDe(n) {
  // Se lee el texto visible, sin rótulos decorativos (el "LumAI" del globo, íconos ocultos)
  let t;
  if (n.tagName === 'BUTTON' && !n.innerText.trim() && n.getAttribute('aria-label')) t = n.getAttribute('aria-label');
  else {
    const copia = n.cloneNode(true);
    copia.querySelectorAll('.lc-quien, [aria-hidden="true"]').forEach(x => x.remove());
    copia.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:pre-line';
    (n.parentNode || document.body).appendChild(copia);
    t = copia.innerText;
    copia.remove();
  }
  t = String(t || '').replace(/^\s*[A-D]\s*\n/, '');   // la letra de la opción (A, B, C) no se lee
  return t.trim();
}

// raiz: donde escuchar los toques (la clase o el documento)
// opciones: { acciones: selector de botones (opcional), sectores: selector de recuadros (opcional), registrar }
export function activarTocarParaLeer(raiz, opciones = {}) {
  const selAcciones = opciones.acciones || ACCIONES;
  const selSectores = opciones.sectores === undefined ? SECTORES_LECTURA : opciones.sectores;
  let armado = null, armadoCuando = 0, leyendo = null;

  const marcar = (n) => {
    if (leyendo && leyendo !== n) leyendo.classList.remove('lc-leyendo');
    leyendo = n;
    if (n) n.classList.add('lc-leyendo');
  };
  const desarmar = () => { if (armado) armado.classList.remove('lc-armado'); armado = null; };
  const leer = (n, texto) => {
    marcar(n);
    hablarNatural(texto, { onend: () => { if (leyendo === n) { n.classList.remove('lc-leyendo'); leyendo = null; } } });
    opciones.registrar?.();
  };

  // Al entrar a un cuadro para escribir, se lee lo que ya tiene escrito (por ejemplo, el comienzo de una frase)
  raiz.addEventListener('focusin', (e) => {
    const campo = e.composedPath ? e.composedPath()[0] : e.target;
    if (!campo || !/^(TEXTAREA|INPUT)$/.test(campo.tagName) || (raiz !== document && !raiz.contains(campo))) return;
    const v = String(campo.value || '').trim();
    desarmar();
    leer(campo, v ? `Cuadro para escribir. Ya dice: ${v}. Completalo con tus palabras.` : 'Cuadro para escribir. Escribí acá tu respuesta.');
  });

  raiz.addEventListener('click', (e) => {
    const destino = e.composedPath ? e.composedPath()[0] : e.target;
    const base = destino && destino.nodeType === 1 ? destino : e.target;
    const accion = base.closest?.(selAcciones);
    if (accion && (raiz.contains?.(accion) || raiz === document)) {
      if (accion.closest('.lc-lectura-ayuda')) return;
      // Segundo toque sobre el mismo botón: se hace la acción
      if (armado === accion && Date.now() - armadoCuando < 15000) { desarmar(); detenerVoz(); return; }
      // Primer toque: solo se lee
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      desarmar();
      armado = accion; armadoCuando = Date.now();
      accion.classList.add('lc-armado');
      const texto = textoDe(accion);
      leer(accion, `${texto}.\n${pistaDeAccion(accion)}`);
      return;
    }
    if (!selSectores) return;
    const sector = base.closest?.(selSectores);
    if (sector && !base.closest('textarea, input, select') && !sector.closest('[data-no-leer]') && (raiz === document || raiz.contains(sector))) {
      desarmar();
      const texto = textoDe(sector);
      if (texto.length >= 2) leer(sector, texto);
    }
  }, true);
}

// Las devoluciones de LumAI se leen solas: el alumno que casi no lee igual se entera de qué le respondieron.
// Se observan los recuadros donde aparecen (respuesta a una opción, corrección de lo escrito, pistas,
// respuestas que se abren) y, cuando cambian, se leen en voz alta.
const DEVOLUCIONES = '.lc-devolucion, .lc-salida, .lc-lugar-ok, .mc-estado, .lc-problema-fb, .lc-logro, .lc-orden-aviso, .lc-lupa-msg, .lc-autoeval-resp, .lc-clasif-dato, .lc-pasos-cuerpo';

export function activarLecturaDeDevoluciones(raiz) {
  let ultimaEscritura = 0, timer = null, pendiente = null;
  const ultimos = new WeakMap();
  raiz.addEventListener('input', () => { ultimaEscritura = Date.now(); }, true);
  const leerLuego = (n) => {
    pendiente = n;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const nodo = pendiente; pendiente = null;
      if (!nodo || nodo.closest('[hidden]')) return;
      const texto = textoDe(nodo);
      if (texto.length < 2) return;
      const previo = ultimos.get(nodo);
      if (previo && previo.texto === texto && Date.now() - previo.t < 4000) return;
      ultimos.set(nodo, { texto, t: Date.now() });
      raiz.querySelectorAll('.lc-leyendo').forEach(x => x.classList.remove('lc-leyendo'));
      nodo.classList.add('lc-leyendo');
      hablarNatural(texto, { onend: () => nodo.classList.remove('lc-leyendo') });
    }, 180);
  };
  const obs = new MutationObserver((registros) => {
    if (Date.now() - ultimaEscritura < 900) return;   // mientras escribe no se lee cada aviso
    for (const r of registros) {
      const base = r.target.nodeType === 1 ? r.target : r.target.parentElement;
      if (!base) continue;
      if (r.type === 'attributes') {
        // un panel que se abre ("Ver la respuesta", "Necesito una pista")
        if (base.classList.contains('lc-panel') && !base.hidden) { leerLuego(base); return; }
        continue;
      }
      const fb = base.closest(DEVOLUCIONES);
      if (fb && raiz.contains(fb)) { leerLuego(fb); return; }
    }
  });
  obs.observe(raiz, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
  return obs;
}

export const ESTILOS_TOCAR = `
.lc-modo-tocar :is(${SECTORES_LECTURA}):not([data-no-leer] *){cursor:pointer;border-radius:8px;transition:background-color .15s,box-shadow .15s}
.lc-modo-tocar :is(${SECTORES_LECTURA}):not([data-no-leer] *):hover{box-shadow:0 0 0 2px rgba(242,201,76,.8)}
.lc-leyendo{box-shadow:0 0 0 3px #f2c94c !important;background-color:rgba(242,201,76,.16) !important;border-radius:8px}
.lc-armado{box-shadow:0 0 0 4px #f59e0b, 0 0 0 9px rgba(245,158,11,.25) !important}
.lc-lectura-ayuda{display:flex;gap:10px;align-items:center;margin:0 0 14px;padding:10px 14px;border-radius:14px;background:#fff8dc;border:1.5px solid #f2c94c;color:#1e3a5f;font-weight:600;font-size:.95rem}
.lc-lectura-ayuda span{font-size:1.4rem}
`;
