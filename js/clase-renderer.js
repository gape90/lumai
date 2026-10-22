// js/clase-renderer.js - Visualizador de clases base de LumAI
// =============================================================================
// Muestra una clase (archivo JSON de contenidos/clases/) DENTRO de la pantalla
// de LumAI, en el contenedor que se le indique (por ejemplo #contenido).
//
// FORMATO DE CADA CLASE (contenidos/clases/<id>.json)
// -----------------------------------------------------------------------------
// Las piezas están separadas a propósito: el prompt de LumAI puede recortar,
// ampliar o reemplazar cada una según el perfil del alumno.
//
//   id, materia, anio, eje, nap        -> datos de catálogo (nap = texto del NAP)
//   titulo                              -> título de la clase
//   nivel_base                          -> siempre "alumno típico de 1.° año"
//   gancho {texto, pregunta?, respuesta?}
//   idea_central                        -> lo que debe sobrevivir a TODA adaptación
//   ideas_clave [{titulo, texto}]       -> 3 a 5, en orden, cada una se entiende sola
//   ejemplo {texto, intercambiable, que_debe_mostrar}
//        intercambiable=true: LumAI puede reemplazarlo por el interés del alumno,
//        siempre que el nuevo ejemplo muestre "que_debe_mostrar"
//   vocabulario [{palabra, definicion}]
//   errores_frecuentes [{error, aclaracion}]
//   para_ir_mas_alla {pregunta, conexion?}   -> para dimensiones en "fortaleza"
//   preguntas_clave [{pregunta, respuesta}]  -> NO se muestran: las usan los juegos
//   idea_central_simple                 -> versión ultra simple y literal (perfiles con más apoyo)
//   ideas_clave[].esencial              -> true: se conserva siempre al recortar
//   lumai {saludo, pasos, idea, cierre} -> frases del robot narrador ({NOMBRE} = nombre del alumno)
//   imagenes [{id, ubicacion, archivo, alt, epigrafe, descripcion}]
//        archivo=null mientras no exista: no se muestra (salvo opciones.mostrarPendientes)
//        descripcion = indicaciones para generar la imagen
//   interactivos [{tipo, ubicacion?, ...}]
//        ubicacion: "inicio" | "idea:N" (después de la idea N, desde 1) | "final"
//        tipos: revelar, pasos, comparar, recta, representaciones, escuchar,
//               texto_anotado, explorar, dato, lupa, clasificar
//        lupa: {imagen (id), titulo, consigna, hallazgos:[{x, y, r, titulo, texto}], cierre}
//              x, y, r en % del ancho/alto de la imagen: el alumno toca la imagen para encontrarlos
//        clasificar: {titulo, consigna, categorias:[...], items:[{nombre, icono, categoria, dato, pista}], cierre}
//        ordenar: {titulo, consigna, items:[textos en el orden correcto], cierre}
//        error: {titulo, consigna, pasos:[{texto, error:true|false, explicacion}]}
//
// FORMATO CÁPSULAS (formato: "capsulas") - microaprendizaje, una cápsula por pantalla
//   mision {texto, resuelta}           -> pregunta que se resuelve al final (hilo de la clase)
//   capsulas [{id, titulo, minutos, esencial, lumai, pose ("saludo"|"idea"),
//              texto (párrafos separados con \n), imagen (id de imagenes[]),
//              ejemplo {texto, intercambiable, que_debe_mostrar}, interactivo {tipo, ...},
//              idea_clave (frase para recordar), chequeo {pregunta, opciones[], correcta, bien, mal}}]
//   La pantalla final junta la misión resuelta, las idea_clave, los interactivos
//   con ubicacion "final" y un repaso opcional (vocabulario, errores, para ir más allá).
//   Para seguir, el alumno tiene que acertar el chequeo (las opciones erradas se tachan).
//   gancho.rotulo                      -> frase que introduce el gancho ("Imaginate esto", "¿Sabías que…?")
//   capsulas[].texto_simple            -> se muestra en "¿Te trabaste?" (ayuda sin docente)
//   capsulas[].presentacion            -> formato visual de la cápsula: ecuacion, contraste, cifra, linea_tiempo
//   capsulas[].ejemplo.mostrar=false   -> el ejemplo queda como dato para adaptar pero no se muestra
//                                         (por ejemplo, cuando una actividad ya lo presenta)
//
// TRABAJO AUTÓNOMO (modo cápsulas)
//   - Las palabras en **negrita** que están en el vocabulario se pueden tocar y muestran su definición.
//   - Cada cápsula tiene "¿Te trabaste?": versión más fácil + botones para preguntarle al asistente.
//   - Al final, el alumno se autoevalúa (lo entendí / más o menos / me costó) y se le sugiere qué repasar.
//   - Los botones del asistente solo aparecen con opciones.asistente = true. Disparan el evento 'lumai:preguntar' (burbujea desde la clase)
//     con detail = {clase, capsula, pregunta, contexto}, y llaman a opciones.alPreguntar(detail)
//     si existe. El asistente de LumAI escucha ese evento. Nunca se incluye el nombre del alumno.
//
// En los textos se puede usar **negrita** y *cursiva*.
//
// OPCIONES de renderizarClase(clase, contenedor, opciones)
//   nombreAlumno        -> reemplaza {NOMBRE} en las frases de LumAI
//   rutaImagenes        -> carpeta de las imágenes del robot (por defecto 'img/')
//   rutaImagenesClase   -> carpeta de las imágenes de las clases (por defecto 'img/clases/')
//   mostrarPendientes   -> true: muestra un recuadro donde falta una imagen (vista previa)
//   mostrarTitulo       -> false: oculta el título (si LumAI ya lo muestra arriba)
//   asistente           -> true: muestra botones para preguntarle al asistente de LumAI (por defecto, no)
//   capsulaInicial      -> número de pantalla para retomar una clase en cápsulas
//
// La clase se dibuja dentro de un Shadow DOM: los estilos de LumAI no la afectan.
//
// IDENTIDAD VISUAL POR MATERIA: cada espacio curricular tiene su tema (paleta, títulos,
// forma y textura), elegido por "materia" o forzado con clase.tema:
//   geografia (cartográfico) · matematica (cuaderno cuadriculado) · lengua (editorial, títulos con serifa)
//   biologia (orgánico) · general (LumAI institucional). Dentro de una clase, todo usa el mismo tema.
//   Además del color, cada materia cambia: cómo se nombran las partes (ROTULOS: Capítulo / Paso /
//   Observación / Parada), la forma del recorrido, el "para recordar" (subrayado / pizarrón /
//   etiqueta de laboratorio / leyenda de mapa), las preguntas y la tipografía.
//   opciones.ajustes -> perillas de adaptación al perfil del alumno (ver js/adaptacion.js
//   y contenidos/reglas-adaptacion.json): capsulas, texto, mayusculas, letra, voz,
//   definiciones_abiertas, opciones, pista_previa, sin_puntaje, recordar_acumulado,
//   pausa_cada, calmo, botones_grandes, anticipar, mas_alla, sin_tiempos.
//   capsulas[].mi_lugar {pregunta, ayuda} -> pregunta abierta para pensar en el propio contexto
//   (no bloquea el avance; solo se registra la cantidad de caracteres, nunca el texto).
//
// USO
//   import { cargarClase, renderizarClase } from './clase-renderer.js';
//   const clase = await cargarClase('mat-1-01');
//   renderizarClase(clase, document.getElementById('contenido'));
// =============================================================================

import { crearMiCarpeta, ESTILOS_CARPETA } from './mi-carpeta.js';
import { hablar, detenerVoz, vozDisponible } from './voz.js';

let ajustesVoz = null;   // perillas del perfil (tamaño de letra, mayúsculas) para el texto que se muestra al leer
const RUTA_CLASES = 'contenidos/clases/';

// ---------------------------------------------------------------------------
// Carga de datos
// ---------------------------------------------------------------------------
export async function cargarClase(id, ruta = RUTA_CLASES) {
  const respuesta = await fetch(`${ruta}${id}.json`);
  if (!respuesta.ok) throw new Error(`No se encontró la clase ${id}`);
  return await respuesta.json();
}

export async function cargarIndice(ruta = 'contenidos/indice.json') {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) throw new Error('No se encontró el índice de clases');
  return await respuesta.json();
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Escapa y aplica **negrita** y saltos de línea
function fmt(texto) {
  return escapar(texto)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function el(tag, clase, html) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (html !== undefined) nodo.innerHTML = html;
  return nodo;
}

function registrar(evento, datos = {}) {
  try {
    if (window.lumaiTracker?.recordCustomEvent) {
      window.lumaiTracker.recordCustomEvent(evento, datos);
    }
  } catch (e) { /* las métricas nunca deben romper la clase */ }
}

let contadorIds = 0;
function idUnico(prefijo) { contadorIds += 1; return `${prefijo}-${contadorIds}`; }

// Botón que muestra/oculta un panel
function crearDesplegable(textoBoton, contenidoHtml, { abierto = false, claseExtra = '', alAbrir } = {}) {
  const caja = el('div', `lc-desplegable ${claseExtra}`);
  const idPanel = idUnico('lc-panel');
  const boton = el('button', 'lc-btn-desplegar', `<span>${textoBoton}</span><span class="lc-flecha" aria-hidden="true">▾</span>`);
  boton.type = 'button';
  boton.setAttribute('aria-expanded', String(abierto));
  boton.setAttribute('aria-controls', idPanel);
  const panel = el('div', 'lc-panel', contenidoHtml);
  panel.id = idPanel;
  panel.hidden = !abierto;
  boton.addEventListener('click', () => {
    const abrir = panel.hidden;
    panel.hidden = !abrir;
    boton.setAttribute('aria-expanded', String(abrir));
    if (abrir && alAbrir) alAbrir();
  });
  caja.append(boton, panel);
  return caja;
}

function leerEnVoz(texto, boton) {
  if (!vozDisponible()) return;
  if (window.speechSynthesis.speaking) { detenerVoz(); boton.textContent = '🔊 Escuchar'; return; }
  boton.textContent = '⏹️ Detener';
  // Misma voz que los juegos; el texto se muestra en pantalla marcando la palabra que suena
  hablar(texto, {
    rate: 0.95,
    ajustes: ajustesVoz,
    onend: () => { boton.textContent = '🔊 Escuchar'; },
    onstop: () => { boton.textContent = '🔊 Escuchar'; }
  });
}

// ---------------------------------------------------------------------------
// Estilos (se inyectan una sola vez, todo con prefijo lc-)
// ---------------------------------------------------------------------------
const ESTILOS = `
.lc-clase{--lc-azul:#00509e;--lc-azul-osc:#003f7d;--lc-azul-claro:#e8f1fb;--lc-naranja:#f97316;--lc-naranja-osc:#c2410c;--lc-naranja-claro:#fff3e8;--lc-verde:#00a676;--lc-verde-osc:#00805b;--lc-verde-claro:#e6f7f1;--lc-texto:#1f2a37;--lc-suave:#5b6675;--lc-borde:#dbe3ec;
  font-family:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--lc-texto);line-height:1.6;text-align:left;max-width:860px;margin:0 auto;font-size:1.02rem}
.lc-clase *{box-sizing:border-box}
.lc-clase p{margin:0 0 .6em}
.lc-clase button{font-family:inherit}
.lc-eje{display:inline-block;background:var(--lc-azul-claro);color:var(--lc-azul);font-size:.78rem;font-weight:600;padding:3px 10px;border-radius:20px;margin-bottom:8px}
.lc-titulo{color:var(--lc-azul);font-size:1.5rem;margin:0 0 16px;line-height:1.25}
.lc-bloque{margin:0 0 22px}
.lc-rotulo{font-size:.8rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--lc-suave);margin:0 0 8px}
.lc-gancho{background:linear-gradient(135deg,var(--lc-azul),#1d74c9);color:#fff;border-radius:16px;padding:22px 24px}
.lc-gancho .lc-rotulo{color:rgba(255,255,255,.8)}
.lc-gancho-texto{font-size:1.18rem;font-weight:500}
.lc-gancho .lc-btn-desplegar{background:rgba(255,255,255,.16);color:#fff;border-color:rgba(255,255,255,.4)}
.lc-gancho .lc-panel{background:rgba(255,255,255,.12);color:#fff;border-color:transparent}
.lc-idea-central{border-left:6px solid var(--lc-naranja);background:var(--lc-naranja-claro);border-radius:0 14px 14px 0;padding:16px 20px;font-size:1.12rem;font-weight:600}
.lc-ideas{display:flex;flex-direction:column;gap:10px}
.lc-desplegable{border-radius:12px}
.lc-btn-desplegar{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left;background:#fff;border:2px solid var(--lc-borde);border-radius:12px;padding:12px 16px;font-size:1rem;font-weight:600;color:var(--lc-azul);cursor:pointer;transition:border-color .2s,background .2s}
.lc-btn-desplegar:hover{border-color:var(--lc-azul);background:var(--lc-azul-claro)}
.lc-btn-desplegar:focus-visible,.lc-clase button:focus-visible,.lc-punto:focus-visible{outline:3px solid var(--lc-naranja);outline-offset:2px}
.lc-btn-desplegar[aria-expanded="true"] .lc-flecha{transform:rotate(180deg)}
.lc-flecha{transition:transform .2s;flex-shrink:0}
.lc-panel{border:2px solid var(--lc-borde);border-top:none;border-radius:0 0 12px 12px;padding:14px 16px;margin-top:-6px;background:#fff}
.lc-numero{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:var(--lc-azul);color:#fff;font-size:.85rem;margin-right:10px;flex-shrink:0}
.lc-btn-desplegar .lc-izq{display:flex;align-items:center}
.lc-acciones{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.lc-btn{background:var(--lc-azul);color:#fff;border:none;border-radius:24px;padding:9px 18px;font-size:.95rem;font-weight:600;cursor:pointer}
.lc-btn:hover{filter:brightness(1.1)}
.lc-btn.lc-sec{background:#fff;color:var(--lc-azul);border:2px solid var(--lc-azul)}
.lc-btn:disabled{opacity:.4;cursor:default}
.lc-tarjeta{background:#fff;border:2px solid var(--lc-borde);border-radius:16px;padding:18px 20px}
.lc-tarjeta h3{color:var(--lc-azul);font-size:1.08rem;margin:0 0 10px}
.lc-consigna{color:var(--lc-suave);font-size:.95rem;margin-bottom:12px}
.lc-ejemplo{background:var(--lc-verde-claro);border-color:transparent}
.lc-ejemplo h3{color:var(--lc-verde)}
.lc-dato{display:flex;gap:12px;align-items:flex-start;background:#fffbe6;border:2px dashed #f2c94c;border-radius:14px;padding:14px 18px}
.lc-dato-icono{font-size:1.6rem;line-height:1}
.lc-vocab{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.lc-carta{position:relative;min-height:110px;border:none;background:transparent;padding:0;cursor:pointer;perspective:800px;text-align:center}
.lc-carta-int{display:grid;width:100%;height:100%;min-height:110px;transition:transform .45s;transform-style:preserve-3d}
.lc-carta[aria-pressed="true"] .lc-carta-int{transform:rotateY(180deg)}
.lc-cara{grid-area:1/1;display:flex;min-height:110px;align-items:center;justify-content:center;padding:12px;border-radius:14px;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.lc-frente{background:var(--lc-azul);color:#fff;font-weight:700;font-size:1.05rem}
.lc-dorso{background:#fff;border:2px solid var(--lc-azul);color:var(--lc-texto);font-size:.9rem;transform:rotateY(180deg)}
@media (prefers-reduced-motion:reduce){.lc-carta-int{transition:none}}
.lc-pasos-cuerpo{min-height:90px}
.lc-pasos-titulo{font-weight:700;color:var(--lc-azul);margin-bottom:4px}
.lc-puntos{display:flex;gap:6px;justify-content:center;margin:12px 0 8px}
.lc-puntito{width:10px;height:10px;border-radius:50%;background:var(--lc-borde)}
.lc-puntito.lc-activo{background:var(--lc-naranja)}
.lc-pasos-nav{display:flex;justify-content:space-between;align-items:center}
.lc-columnas{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.lc-columna{border-radius:12px;padding:12px 14px;background:var(--lc-azul-claro)}
.lc-columna:nth-child(2){background:var(--lc-naranja-claro)}
.lc-columna:nth-child(3){background:var(--lc-verde-claro)}
.lc-columna h4{margin:0 0 8px;font-size:1rem;color:var(--lc-azul)}
.lc-columna ul{margin:0;padding-left:18px}
.lc-columna li{margin-bottom:4px}
.lc-recta svg{width:100%;height:auto;display:block;overflow:visible}
.lc-punto{cursor:pointer}
.lc-punto circle{transition:r .15s}
.lc-punto:hover circle,.lc-punto.lc-sel circle{r:11}
.lc-salida{margin-top:10px;min-height:48px;background:var(--lc-azul-claro);border-radius:12px;padding:10px 14px}
.lc-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.lc-chip{background:#fff;border:2px solid var(--lc-azul);color:var(--lc-azul);border-radius:22px;padding:7px 14px;font-weight:600;cursor:pointer;font-size:.93rem}
.lc-chip[aria-pressed="true"]{background:var(--lc-azul);color:#fff}
.lc-texto-anotado{font-size:1.02rem;line-height:1.9;background:#fafcff;border-radius:12px;padding:14px 16px;border:1px solid var(--lc-borde)}
.lc-seg{border:none;background:none;padding:1px 2px;font:inherit;color:inherit;cursor:pointer;border-bottom:3px solid;border-radius:3px;line-height:inherit;text-align:inherit}
.lc-seg[aria-pressed="true"]{background:rgba(249,115,22,.15)}
.lc-leyenda{display:flex;flex-wrap:wrap;gap:12px;font-size:.85rem;color:var(--lc-suave);margin-top:8px}
.lc-leyenda span::before{content:'';display:inline-block;width:14px;height:4px;margin-right:6px;vertical-align:middle;background:var(--c)}
.lc-texto-oculto{background:#fafcff;border:1px solid var(--lc-borde);border-radius:12px;padding:12px 14px;margin-top:10px}
.lc-mas-alla{background:linear-gradient(135deg,#f5f0ff,#eef5ff);border-color:transparent}
.lc-mas-alla h3{color:#5b3fb5}
.lc-error{background:#fff5f5;border-color:#f6caca}
.lc-error h3{color:#b42318}
.lc-rep-tabla{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:10px 0}
.lc-rep-celda{background:#fff;border:2px solid var(--lc-borde);border-radius:10px;padding:8px;text-align:center}
.lc-rep-celda small{display:block;color:var(--lc-suave);font-size:.75rem}
.lc-rep-celda b{font-size:1.15rem;color:var(--lc-azul)}
.lc-lumai{display:flex;align-items:flex-end;gap:12px;margin:0 0 14px}
.lc-lumai img{width:74px;height:auto;flex-shrink:0;filter:drop-shadow(0 4px 6px rgba(0,0,0,.15))}
.lc-globo{position:relative;background:#fff;border:2px solid var(--lc-azul);border-radius:18px 18px 18px 4px;padding:12px 16px;font-weight:500;box-shadow:0 3px 10px rgba(0,80,158,.1)}
.lc-globo::before{content:'';position:absolute;left:-10px;bottom:10px;border-width:8px 10px 8px 0;border-style:solid;border-color:transparent var(--lc-azul) transparent transparent}
.lc-globo b.lc-quien{display:block;color:var(--lc-azul);font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;margin-bottom:2px}
.lc-figura{margin:0;text-align:center}
.lc-figura img{max-width:100%;height:auto;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.1)}
.lc-figura figcaption{font-size:.88rem;color:var(--lc-suave);margin-top:6px}
.lc-img-pendiente{border:2px dashed #b9c5d3;border-radius:14px;padding:16px;background:#f7f9fc;color:var(--lc-suave);font-size:.88rem;text-align:left}
.lc-img-pendiente b{color:var(--lc-texto)}
@media (max-width:600px){.lc-lumai img{width:56px}}
@media (max-width:600px){.lc-clase{font-size:.98rem}.lc-gancho{padding:18px}.lc-titulo{font-size:1.3rem}}
:host{display:block}
[hidden]{display:none!important}
.lc-clase{letter-spacing:normal}
.lc-clase h2,.lc-clase h3,.lc-clase h4{text-wrap:balance}
/* ---------- Modo cápsulas ---------- */
.lc-modo-capsulas{max-width:780px}
.lc-cap{display:grid;gap:18px;animation:lc-entrar .35s ease}
.lc-cap>*{margin:0}
@keyframes lc-entrar{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes lc-aparecer{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.lc-cap-cab{display:grid;gap:10px;margin:0 0 22px}
.lc-cap-cab .lc-titulo{margin:0}
.lc-cap-cab .lc-eje{justify-self:start;margin:0}
.lc-stepper{display:flex;align-items:center;list-style:none;margin:4px 0 0;padding:0}
.lc-stepper li{flex:1;display:flex;align-items:center;min-width:0}
.lc-stepper li:last-child{flex:0 0 auto}
.lc-stepper li::after{content:'';flex:1;height:3px;margin:0 4px;border-radius:2px;background:var(--lc-borde);transition:background .3s}
.lc-stepper li:last-child::after{display:none}
.lc-paso{width:30px;height:30px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;font-size:.8rem;font-weight:700;background:#fff;border:2px solid var(--lc-borde);color:var(--lc-suave);transition:all .25s}
.lc-stepper li.lc-hecho .lc-paso{background:var(--lc-verde);border-color:var(--lc-verde);color:#fff}
.lc-stepper li.lc-hecho::after{background:var(--lc-verde)}
.lc-stepper li.lc-actual .lc-paso{background:var(--lc-azul);border-color:var(--lc-azul);color:#fff;box-shadow:0 0 0 4px rgba(0,80,158,.16)}
.lc-eyebrow{font-size:.74rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--lc-naranja-osc)}
.lc-cap-intro{display:grid;gap:4px}
.lc-cap-titulo{color:var(--lc-azul-osc);font-size:1.45rem;line-height:1.25;margin:0;outline:none;font-weight:700}
.lc-cap-texto{font-size:1.1rem;line-height:1.75;max-width:62ch}
.lc-cap-texto p{margin:0 0 .65em}
.lc-cap-texto p:last-child{margin:0}
/* LumAI */
.lc-modo-capsulas .lc-lumai{margin:0;align-items:center}
.lc-globo{background:#fff;border:1.5px solid #c9dcf1;border-radius:18px 18px 18px 6px;box-shadow:0 6px 18px rgba(0,63,125,.08)}
.lc-globo::before{border-color:transparent #c9dcf1 transparent transparent}
/* Gancho, misión y agenda */
.lc-gancho{background:radial-gradient(rgba(255,255,255,.12) 1.2px,transparent 1.4px) 0 0/18px 18px,linear-gradient(135deg,var(--lc-azul-osc),var(--lc-azul) 55%,#1d74c9);box-shadow:0 10px 24px rgba(0,63,125,.22)}
.lc-gancho .lc-rotulo{color:#ffd76a;letter-spacing:.09em}
.lc-gancho-texto{margin:0 0 .5em}
.lc-gancho-texto:last-child{margin:0}
.lc-nota{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;border-radius:14px;padding:14px 16px}
.lc-nota-icono{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:1.1rem;background:#fff}
.lc-nota p{margin:0}
.lc-nota .lc-rotulo{margin:0 0 2px}
.lc-mision{background:var(--lc-verde-claro);border:1px solid #bfe9da}
.lc-mision .lc-rotulo{color:var(--lc-verde-osc)}
.lc-cap-clave{background:#fff8e1;border:1px solid #f6dc8c}
.lc-cap-clave .lc-rotulo{color:#a16207}
.lc-cap-clave p{font-weight:600}
.lc-agenda{list-style:none;margin:0;padding:0;display:grid;gap:6px;counter-reset:ag}
.lc-agenda li{counter-increment:ag;display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;padding:8px 12px;border-radius:10px;background:#f6f9fd;font-size:.95rem}
.lc-agenda li::before{content:counter(ag);width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#fff;border:2px solid var(--lc-borde);font-weight:700;font-size:.78rem;color:var(--lc-azul)}
.lc-agenda small{color:var(--lc-suave);font-variant-numeric:tabular-nums}
.lc-tip{font-size:.9rem;color:var(--lc-suave);margin:0}
/* Presentaciones */
.lc-ecuacion{display:flex;align-items:stretch;gap:8px}
.lc-ec-pieza{flex:1 1 0;min-width:0;display:grid;gap:4px;align-content:start;justify-items:center;text-align:center;background:#fff;border:2px solid var(--lc-borde);border-radius:16px;padding:14px 10px;animation:lc-entrar .45s both;animation-delay:calc(var(--i,0) * .18s)}
.lc-ec-icono{font-size:1.8rem;line-height:1.2}
.lc-ec-nombre{font-weight:700;color:var(--lc-azul);line-height:1.25}
.lc-ec-texto{font-size:.84rem;color:var(--lc-suave);line-height:1.4}
.lc-ec-op{align-self:center;font-size:1.5rem;font-weight:800;color:var(--lc-naranja)}
.lc-ec-resultado{background:var(--lc-azul);border-color:var(--lc-azul)}
.lc-ec-resultado .lc-ec-nombre{color:#fff;font-size:1.15rem}
.lc-ec-resultado .lc-ec-texto{color:rgba(255,255,255,.85)}
@media (max-width:620px){.lc-ecuacion{display:grid;grid-template-columns:1fr;gap:6px}.lc-ec-pieza{grid-template-columns:auto 1fr;justify-items:start;text-align:left;column-gap:12px;padding:10px 14px}.lc-ec-icono{grid-row:span 2;font-size:1.6rem}.lc-ec-op{justify-self:center;line-height:1}}
.lc-contraste{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.lc-ct{display:grid;gap:8px;align-content:start;border-radius:16px;padding:16px;background:var(--lc-azul-claro)}
.lc-ct:nth-child(2){background:var(--lc-verde-claro)}
.lc-ct svg{width:100%;height:auto;max-height:86px;display:block}
.lc-ct-etiqueta{font-size:.72rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--lc-suave)}
.lc-ct h4{margin:0;font-size:1.25rem;color:var(--lc-azul-osc)}
.lc-ct:nth-child(2) h4{color:var(--lc-verde-osc)}
.lc-ct p{margin:0}
@media (max-width:520px){.lc-contraste{grid-template-columns:1fr}}
.lc-cifra{display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center;border-radius:18px;padding:20px 22px;color:#fff;background:linear-gradient(135deg,var(--lc-azul-osc),var(--lc-azul));box-shadow:0 10px 24px rgba(0,63,125,.22)}
.lc-cifra-num{font-size:4.4rem;font-weight:800;line-height:.9;letter-spacing:-.03em;color:#ffd76a;font-variant-numeric:tabular-nums}
.lc-cifra-leyenda{font-weight:600;font-size:1.12rem;line-height:1.35}
.lc-cifra-puntos{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.lc-cifra-puntos i{width:11px;height:11px;border-radius:50%;background:rgba(255,255,255,.9);animation:lc-aparecer .3s both;animation-delay:calc(var(--i,0) * .03s)}
.lc-cifra-puntos i.lc-tenue{background:rgba(255,255,255,.28)}
.lc-cifra-nota{font-size:.84rem;opacity:.85;margin-top:8px}
@media (max-width:480px){.lc-cifra{grid-template-columns:1fr;gap:6px}}
.lc-tiempo{list-style:none;margin:0;padding:0;display:grid;gap:0}
.lc-tiempo li{display:grid;grid-template-columns:64px 1fr;gap:14px}
.lc-tiempo-anio{font-weight:800;color:var(--lc-azul);text-align:right;padding-top:1px;font-variant-numeric:tabular-nums}
.lc-tiempo-cuerpo{position:relative;border-left:3px solid var(--lc-borde);padding:0 0 18px 18px}
.lc-tiempo li:last-child .lc-tiempo-cuerpo{padding-bottom:0}
.lc-tiempo-cuerpo::before{content:'';position:absolute;left:-9px;top:4px;width:15px;height:15px;border-radius:50%;background:#fff;border:3px solid var(--lc-azul)}
.lc-tiempo li[data-tipo="conflicto"] .lc-tiempo-cuerpo::before{border-color:#d9480f}
.lc-tiempo li[data-tipo="acuerdo"] .lc-tiempo-cuerpo::before{border-color:var(--lc-verde)}
.lc-tiempo-cuerpo b{display:block;line-height:1.35}
.lc-tiempo-cuerpo span{color:var(--lc-suave);font-size:.93rem}
.lc-tiempo-leyenda{display:flex;flex-wrap:wrap;gap:14px;font-size:.84rem;color:var(--lc-suave);margin-top:12px}
.lc-tiempo-leyenda span::before{content:'';display:inline-block;width:10px;height:10px;border-radius:50%;border:3px solid var(--c);margin-right:6px;vertical-align:-1px}
/* Lupa: analizar una imagen */
.lc-lupa-fig{position:relative;margin:0;border-radius:14px;overflow:hidden;cursor:crosshair;box-shadow:0 4px 14px rgba(0,0,0,.12);user-select:none;-webkit-user-select:none}
.lc-lupa-fig img{display:block;width:100%;height:auto;pointer-events:none}
.lc-hot{position:absolute;aspect-ratio:1;transform:translate(-50%,-50%);border:none;border-radius:50%;padding:0;background:transparent;cursor:crosshair}
.lc-hot:focus-visible{outline:3px dashed var(--lc-naranja);outline-offset:2px}
.lc-hot.lc-encontrado{cursor:default;box-shadow:0 0 0 3px #ffd76a,0 0 0 6px rgba(0,0,0,.28);animation:lc-aparecer-hot .3s both}
@keyframes lc-aparecer-hot{from{opacity:0;scale:.6}to{opacity:1;scale:1}}
.lc-hot.lc-encontrado::after{content:attr(data-n);position:absolute;right:-10px;top:-10px;width:24px;height:24px;border-radius:50%;background:#ffd76a;color:#3b2f00;font-weight:800;font-size:.82rem;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.lc-hot.lc-pista{animation:lc-pulso 1s ease-out 3}
@keyframes lc-pulso{0%{box-shadow:0 0 0 0 rgba(249,115,22,.85)}100%{box-shadow:0 0 0 26px rgba(249,115,22,0)}}
.lc-lupa-msg{position:absolute;transform:translate(-50%,-130%);background:rgba(15,30,50,.88);color:#fff;font-size:.82rem;padding:6px 10px;border-radius:8px;white-space:nowrap;pointer-events:none}
.lc-lupa-barra{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}
.lc-contador{font-weight:700;color:var(--lc-azul);font-size:.92rem;font-variant-numeric:tabular-nums}
.lc-btn-chico{padding:7px 14px;font-size:.88rem}
.lc-hallazgos{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.lc-hallazgos:empty{display:none}
.lc-hallazgos li{display:grid;grid-template-columns:26px 1fr;gap:10px;align-items:start;background:#fffbea;border:1px solid #f6e3a1;border-radius:12px;padding:10px 12px;animation:lc-entrar .3s both;font-size:.96rem}
.lc-n{width:26px;height:26px;border-radius:50%;background:#ffd76a;color:#3b2f00;font-weight:800;font-size:.82rem;display:grid;place-items:center}
.lc-logro{margin-top:10px;background:var(--lc-verde-claro);border-radius:12px;padding:12px 14px;font-weight:600}
/* Clasificar */
.lc-clasif-lista{display:grid;gap:8px}
.lc-clasif-item{display:grid;gap:6px;background:#fff;border:2px solid var(--lc-borde);border-radius:12px;padding:10px 12px;transition:border-color .2s,background .2s}
.lc-clasif-fila{display:flex;align-items:center;justify-content:space-between;gap:8px 12px;flex-wrap:wrap}
.lc-clasif-nombre{font-weight:600}
.lc-clasif-btns{display:flex;gap:6px;flex-wrap:wrap}
.lc-clasif-btns button{background:#fff;border:2px solid var(--lc-azul);color:var(--lc-azul);border-radius:20px;padding:5px 12px;font-weight:600;font-size:.86rem;cursor:pointer}
.lc-clasif-btns button:hover:not(:disabled){background:var(--lc-azul-claro)}
.lc-clasif-btns button:disabled{opacity:.35;cursor:default;text-decoration:line-through}
.lc-clasif-item.lc-ok{border-color:#86d3a5;background:#f2fbf5}
.lc-clasif-badge{font-size:.82rem;font-weight:700;color:#15803d;background:#dcf5e5;border-radius:20px;padding:4px 10px}
.lc-clasif-dato{font-size:.9rem;color:var(--lc-suave)}
.lc-sacudir{animation:lc-sacudir .35s}
@keyframes lc-sacudir{20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
/* Comprobación */
.lc-chequeo{background:#fff;border:2px solid var(--lc-azul);border-radius:18px;box-shadow:0 5px 0 rgba(0,80,158,.12)}
.lc-chequeo h3{font-size:.76rem;letter-spacing:.09em;text-transform:uppercase;color:var(--lc-azul);margin-bottom:6px}
.lc-chequeo>p{font-size:1.06rem;font-weight:600}
.lc-opciones{display:grid;gap:8px;counter-reset:op}
.lc-opcion{display:flex;gap:12px;align-items:center;text-align:left;background:#fff;border:2px solid var(--lc-borde);border-radius:12px;padding:10px 14px;font-size:1rem;cursor:pointer;color:var(--lc-texto);transition:border-color .15s,background .15s}
.lc-opcion::before{counter-increment:op;content:counter(op,upper-alpha);flex-shrink:0;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-weight:700;font-size:.85rem;background:var(--lc-azul-claro);color:var(--lc-azul)}
.lc-opcion:hover:not(:disabled){border-color:var(--lc-azul)}
.lc-opcion:disabled{cursor:default}
.lc-opcion.lc-bien{border-color:#16a34a;background:#effaf3;font-weight:600}
.lc-opcion.lc-bien::before{content:'✓';background:#16a34a;color:#fff}
.lc-opcion.lc-mal{border-color:#efc4c4;background:#fdf4f4;color:#8a5a5a;text-decoration:line-through}
.lc-opcion.lc-mal::before{content:'✕';background:#f6d3d3;color:#9b2c2c}
.lc-devolucion:empty{display:none}
.lc-devolucion{margin-top:10px;border-radius:10px;padding:10px 14px}
.lc-devolucion.lc-bien{background:#effaf3}
.lc-devolucion.lc-mal{background:#fff6e5}
/* Ayuda */
.lc-ayuda .lc-btn-desplegar{border-style:dashed;color:var(--lc-verde-osc);font-size:.95rem;padding:10px 14px}
.lc-ayuda .lc-btn-desplegar:hover{border-color:var(--lc-verde);background:var(--lc-verde-claro)}
.lc-ayuda-acciones{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.lc-termino{border:none;background:none;padding:0 1px;margin:0;font:inherit;font-weight:700;color:var(--lc-azul);border-bottom:2px dotted var(--lc-azul);border-radius:2px;cursor:help;line-height:inherit}
.lc-termino:hover,.lc-termino[aria-expanded="true"]{background:var(--lc-azul-claro)}
.lc-def{background:var(--lc-azul-claro);border-radius:10px;padding:10px 14px;margin:2px 0 12px;font-size:.98rem;line-height:1.5;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;animation:lc-entrar .2s both}
.lc-def span{flex:1 1 220px}
.lc-btn-preguntar{background:#fff;border:2px solid var(--lc-verde);color:var(--lc-verde-osc);border-radius:20px;padding:6px 14px;font-weight:600;font-size:.9rem;cursor:pointer}
/* Cierre */
.lc-logro-cab{display:grid;justify-items:center;text-align:center;gap:6px;padding:22px 18px;border-radius:18px;background:radial-gradient(rgba(255,255,255,.14) 1.2px,transparent 1.4px) 0 0/18px 18px,linear-gradient(135deg,#00805b,var(--lc-verde));color:#fff}
.lc-logro-cab .lc-cap-titulo{color:#fff}
.lc-logro-icono{font-size:2.2rem;line-height:1}
.lc-puntaje{display:inline-block;background:rgba(255,255,255,.18);border-radius:20px;padding:5px 14px;font-weight:600;font-size:.95rem}
.lc-resumen{margin:0;padding-left:22px}
.lc-resumen li{margin-bottom:6px}
.lc-autoeval .lc-chips{margin:0}
.lc-autoeval-resp:empty{display:none}
.lc-autoeval-resp{margin-top:12px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.lc-autoeval-resp p{margin:0}
.lc-repaso{display:flex;flex-direction:column;gap:10px}
/* Navegación */
.lc-cap-nav{position:sticky;bottom:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:10px;margin:26px 0 0;padding:12px 0;background:rgba(255,255,255,.95);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);border-top:1px solid var(--lc-borde)}
.lc-cap-aviso{font-size:.84rem;color:var(--lc-suave);text-align:center;flex:1}
.lc-cap-nav .lc-btn{font-size:1rem;padding:11px 22px;white-space:nowrap;box-shadow:0 3px 0 rgba(0,40,90,.18)}
.lc-cap-nav .lc-btn.lc-sec{box-shadow:none}
.lc-cap-nav .lc-btn:disabled{box-shadow:none}
@media (max-width:600px){.lc-cap-texto{font-size:1.04rem}.lc-cap-titulo{font-size:1.28rem}.lc-cap-nav{flex-wrap:wrap;row-gap:6px}.lc-cap-aviso{order:-1;flex-basis:100%;font-size:.8rem}.lc-cap-aviso:empty{display:none}.lc-cap-nav .lc-btn{padding:10px 18px}.lc-paso{width:26px;height:26px;font-size:.72rem}}
@media (prefers-reduced-motion:reduce){.lc-cap,.lc-ec-pieza,.lc-cifra-puntos i,.lc-hallazgos li,.lc-hot,.lc-def{animation:none!important}}
/* Ordenar */
.lc-orden-listo{margin:0 0 10px;padding:0;list-style:none;display:grid;gap:6px;counter-reset:ord}
.lc-orden-listo:empty{display:none}
.lc-orden-listo li{counter-increment:ord;display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:center;background:var(--lc-azul-claro);border-radius:10px;padding:8px 12px;animation:lc-entrar .25s both}
.lc-orden-listo li::before{content:counter(ord);width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--lc-azul);color:#fff;font-weight:700;font-size:.8rem}
.lc-orden-aviso{font-weight:600;color:var(--lc-azul);font-size:.92rem;margin:0 0 8px}
.lc-orden-aviso:empty{display:none}
.lc-orden-pool{display:grid;gap:6px}
.lc-orden-item{text-align:left;background:#fff;border:2px dashed var(--lc-borde);border-radius:10px;padding:9px 12px;font-size:.98rem;cursor:pointer;color:var(--lc-texto)}
.lc-orden-item:hover{border-color:var(--lc-azul);border-style:solid}
/* Encontrar el error */
.lc-error-lista{display:grid;gap:6px;margin-bottom:4px}
.lc-error-paso{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:center;text-align:left;background:#fff;border:2px solid var(--lc-borde);border-radius:10px;padding:9px 12px;font-size:1rem;cursor:pointer;color:var(--lc-texto);font-variant-numeric:tabular-nums}
.lc-error-paso:hover:not(:disabled){border-color:var(--lc-azul)}
.lc-error-num{width:26px;height:26px;border-radius:6px;display:grid;place-items:center;background:var(--lc-azul-claro);color:var(--lc-azul);font-weight:700;font-size:.8rem}
.lc-error-paso:disabled{cursor:default}
.lc-error-paso.lc-error-ok{border-color:#bfe3cb;background:#f4fbf6;opacity:.8}
.lc-error-paso.lc-error-hallado{border-color:#e4572e;background:#fff1ec;opacity:1}
.lc-error-paso.lc-error-hallado .lc-error-num{background:#e4572e;color:#fff}
/* Cita */
.lc-cita{margin:0;position:relative;padding:20px 22px 18px 26px;border-radius:var(--lc-radio);background:var(--lc-azul-claro);border-left:5px solid var(--lc-azul)}
.lc-cita blockquote{margin:0;font-family:var(--lc-fuente-titulos);font-size:1.16rem;line-height:1.6;color:var(--lc-azul-osc)}
.lc-cita figcaption{margin-top:10px;font-size:.88rem;color:var(--lc-suave)}
/* ---------- Identidad visual por espacio curricular ---------- */
.lc-clase{--lc-fuente-titulos:'Poppins',system-ui,sans-serif;--lc-radio:16px;--lc-acento-claro:#fff8e1;--lc-acento-borde:#f6dc8c;
  --lc-patron:radial-gradient(rgba(255,255,255,.12) 1.2px,transparent 1.4px) 0 0/18px 18px}
.lc-clase[data-tema="geografia"]{--lc-azul:#0b6e8a;--lc-azul-osc:#074e62;--lc-azul-claro:#e2f2f6;--lc-naranja:#d08700;--lc-naranja-osc:#8f5400;--lc-naranja-claro:#fdf3d8;--lc-acento-claro:#fdf3d8;--lc-acento-borde:#efd28c;--lc-borde:#d3e3e8;--lc-radio:14px;
  --lc-patron:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='.13' stroke-width='1.5'%3E%3Cellipse cx='60' cy='70' rx='70' ry='48'/%3E%3Cellipse cx='60' cy='70' rx='50' ry='33'/%3E%3Cellipse cx='60' cy='70' rx='30' ry='19'/%3E%3Cellipse cx='150' cy='150' rx='44' ry='30'/%3E%3Cellipse cx='150' cy='150' rx='24' ry='15'/%3E%3C/g%3E%3C/svg%3E") 0 0/180px 180px}
.lc-clase[data-tema="matematica"]{--lc-azul:#1f4fa8;--lc-azul-osc:#163a7d;--lc-azul-claro:#e8eefb;--lc-naranja:#e8890c;--lc-naranja-osc:#a35a00;--lc-naranja-claro:#fff3df;--lc-acento-claro:#fff3df;--lc-acento-borde:#f3cf94;--lc-borde:#d6deef;--lc-radio:8px;
  --lc-patron:linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px) 0 0/22px 22px,linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px) 0 0/22px 22px}
.lc-clase[data-tema="matematica"] .lc-tarjeta,.lc-clase[data-tema="matematica"] .lc-chequeo{background-image:linear-gradient(#eef2fa 1px,transparent 1px),linear-gradient(90deg,#eef2fa 1px,transparent 1px);background-size:20px 20px}
.lc-clase[data-tema="lengua"]{--lc-azul:#8a2f5c;--lc-azul-osc:#5e1d3e;--lc-azul-claro:#f8ebf2;--lc-naranja:#c4661f;--lc-naranja-osc:#8f4310;--lc-naranja-claro:#fcefe4;--lc-acento-claro:#fcefe4;--lc-acento-borde:#efcaa8;--lc-borde:#ecd9e3;--lc-radio:12px;
  --lc-fuente-titulos:'Lora',Georgia,'Times New Roman',serif;
  --lc-patron:repeating-linear-gradient(0deg,rgba(255,255,255,.08) 0 1px,transparent 1px 30px)}
.lc-clase[data-tema="lengua"] .lc-gancho{position:relative;overflow:hidden}
.lc-clase[data-tema="lengua"] .lc-gancho::after{content:'\\201C';position:absolute;right:14px;top:-26px;font-family:Georgia,serif;font-size:9rem;line-height:1;color:rgba(255,255,255,.12);pointer-events:none}
.lc-clase[data-tema="biologia"]{--lc-azul:#1f7a4d;--lc-azul-osc:#145536;--lc-azul-claro:#e6f4ec;--lc-naranja:#e4572e;--lc-naranja-osc:#a33a18;--lc-naranja-claro:#fdeee8;--lc-acento-claro:#fdeee8;--lc-acento-borde:#f5c6b5;--lc-borde:#d5e8dc;--lc-radio:22px;
  --lc-patron:radial-gradient(circle at 22% 30%,rgba(255,255,255,.12) 0 16px,transparent 17px) 0 0/150px 150px,radial-gradient(circle at 72% 72%,rgba(255,255,255,.09) 0 28px,transparent 29px) 0 0/150px 150px}
.lc-titulo,.lc-cap-titulo,.lc-tarjeta h3,.lc-ct h4,.lc-cifra-leyenda{font-family:var(--lc-fuente-titulos)}
.lc-clase .lc-titulo{color:var(--lc-azul-osc)}
.lc-gancho,.lc-cifra{background:var(--lc-patron),linear-gradient(135deg,var(--lc-azul-osc),var(--lc-azul))}
.lc-gancho,.lc-cifra,.lc-tarjeta,.lc-nota,.lc-ct,.lc-chequeo,.lc-logro-cab{border-radius:var(--lc-radio)}
.lc-cap-clave{background:var(--lc-acento-claro);border-color:var(--lc-acento-borde)}
.lc-cap-clave .lc-rotulo{color:var(--lc-naranja-osc)}
.lc-ct:nth-child(2){background:var(--lc-acento-claro)}
.lc-ct:nth-child(2) h4{color:var(--lc-naranja-osc)}
.lc-logro-cab{background:var(--lc-patron),linear-gradient(135deg,var(--lc-azul-osc),var(--lc-azul))}
.lc-eje{background:var(--lc-azul-claro);color:var(--lc-azul-osc)}
.lc-stepper li.lc-hecho .lc-paso{background:var(--lc-azul-osc);border-color:var(--lc-azul-osc)}
.lc-stepper li.lc-hecho::after{background:var(--lc-azul-osc)}
.lc-stepper li.lc-actual .lc-paso{background:var(--lc-naranja);border-color:var(--lc-naranja);box-shadow:0 0 0 4px var(--lc-naranja-claro)}
.lc-mision{background:var(--lc-azul-claro);border-color:var(--lc-borde)}
.lc-mision .lc-rotulo{color:var(--lc-azul)}
.lc-agenda li{background:var(--lc-azul-claro)}
.lc-tiempo li[data-tipo="acuerdo"] .lc-tiempo-cuerpo::before{border-color:var(--lc-azul)}
/* ---------- Pensá en tu lugar (todas las materias) ---------- */
.lc-lugar{display:grid;gap:10px;border-radius:var(--lc-radio);padding:16px 18px;background:#fff;border:2px dashed var(--lc-naranja)}
.lc-lugar h3{margin:0;font-size:1rem;color:var(--lc-naranja-osc);font-family:var(--lc-fuente-titulos)}
.lc-lugar p{margin:0;font-weight:500}
.lc-lugar textarea{width:100%;min-height:76px;resize:vertical;border:1.5px solid var(--lc-borde);border-radius:10px;padding:10px 12px;font:inherit;font-size:.98rem;color:var(--lc-texto);background:#fff}
.lc-lugar textarea:focus{outline:3px solid var(--lc-naranja-claro);border-color:var(--lc-naranja)}
.lc-lugar small{color:var(--lc-suave);font-size:.82rem}
.lc-lugar-fila{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.lc-lugar-ok{font-weight:600;color:var(--lc-azul)}

/* ========== LENGUA: libro y cuaderno de lectura ========== */
.lc-clase[data-tema="lengua"] .lc-eyebrow{font-family:var(--lc-fuente-titulos);font-style:italic;text-transform:none;letter-spacing:0;font-size:.9rem;font-weight:600}
.lc-clase[data-tema="lengua"] .lc-cap-texto{background:linear-gradient(90deg,transparent 18px,#ecb4c4 18px,#ecb4c4 20px,transparent 20px),#fffdf8;border:1px solid #efe2d6;border-radius:4px;padding:16px 18px 16px 34px;box-shadow:0 1px 0 #efe2d6,0 3px 0 -1px #fffdf8,0 4px 0 -1px #efe2d6}
.lc-clase[data-tema="lengua"] .lc-cap-texto>p:first-child::first-letter{float:left;font-family:var(--lc-fuente-titulos);font-weight:700;font-size:3.2em;line-height:.85;margin:.08em .1em 0 0;color:var(--lc-azul)}
.lc-clase[data-tema="lengua"] .lc-cap-clave{background:transparent;border:none;border-left:4px solid var(--lc-naranja);border-radius:0;padding:4px 0 4px 16px}
.lc-clase[data-tema="lengua"] .lc-cap-clave .lc-nota-icono{background:var(--lc-naranja-claro)}
.lc-clase[data-tema="lengua"] .lc-cap-clave p{display:inline;background:linear-gradient(transparent 52%,#ffd6a8 52%,#ffd6a8 92%,transparent 92%);box-decoration-break:clone;-webkit-box-decoration-break:clone}
.lc-clase[data-tema="lengua"] .lc-tarjeta{background:#fffdf8;border:1px solid #efe2d6;box-shadow:0 1px 0 #efe2d6,0 3px 0 -1px #fffdf8,0 4px 0 -1px #efe2d6}
.lc-clase[data-tema="lengua"] .lc-chequeo{background:#fffdf8;border:1px solid #e3cbd7;border-top:6px solid var(--lc-azul);box-shadow:none}
.lc-clase[data-tema="lengua"] .lc-chequeo h3{font-family:var(--lc-fuente-titulos);text-transform:none;letter-spacing:0;font-size:1rem;font-style:italic}
.lc-clase[data-tema="lengua"] .lc-paso{border-radius:3px 7px 7px 3px;width:26px;height:32px;font-family:var(--lc-fuente-titulos)}
.lc-clase[data-tema="lengua"] .lc-stepper li::after{height:0;border-top:2px dotted var(--lc-borde);background:none}
.lc-clase[data-tema="lengua"] .lc-stepper li.lc-hecho::after{border-top-color:var(--lc-azul-osc);background:none}
.lc-clase[data-tema="lengua"] .lc-lugar{background:#fffdf8;border-style:solid;border-width:1px;border-color:#efe2d6;border-left:4px solid var(--lc-naranja)}
.lc-clase[data-tema="lengua"] .lc-lugar textarea{background:repeating-linear-gradient(#fff 0 27px,#ecd9e3 27px 28px);line-height:28px;padding-top:2px}

/* ========== MATEMÁTICA: cuaderno cuadriculado y pizarrón ========== */
.lc-clase[data-tema="matematica"]{--lc-fuente-numeros:'JetBrains Mono',ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace}
.lc-clase[data-tema="matematica"].lc-modo-capsulas{background-image:linear-gradient(#e9eef8 1px,transparent 1px),linear-gradient(90deg,#e9eef8 1px,transparent 1px);background-size:22px 22px;border-radius:8px;padding:14px}
.lc-clase[data-tema="matematica"] .lc-eyebrow,.lc-clase[data-tema="matematica"] .lc-paso,.lc-clase[data-tema="matematica"] .lc-opcion,.lc-clase[data-tema="matematica"] .lc-error-paso,.lc-clase[data-tema="matematica"] .lc-ec-nombre,.lc-clase[data-tema="matematica"] .lc-orden-item,.lc-clase[data-tema="matematica"] .lc-orden-listo li{font-family:var(--lc-fuente-numeros)}
.lc-clase[data-tema="matematica"] .lc-eyebrow{letter-spacing:.04em}
.lc-clase[data-tema="matematica"] .lc-paso{border-radius:4px}
.lc-clase[data-tema="matematica"] .lc-cap-texto{background:rgba(255,255,255,.85);border-radius:6px;padding:4px 8px;margin:-4px -8px}
.lc-clase[data-tema="matematica"] .lc-cap-clave{background:#21413b;border:8px solid #b07a46;border-radius:6px;color:#f5f1e6;box-shadow:inset 0 0 24px rgba(0,0,0,.35)}
.lc-clase[data-tema="matematica"] .lc-cap-clave .lc-rotulo{color:#ffe08a}
.lc-clase[data-tema="matematica"] .lc-cap-clave .lc-nota-icono{background:rgba(255,255,255,.12)}
.lc-clase[data-tema="matematica"] .lc-cap-clave p{font-family:var(--lc-fuente-numeros);font-weight:500;letter-spacing:.01em}
.lc-clase[data-tema="matematica"] .lc-chequeo{padding-top:0;overflow:hidden;box-shadow:none;border-width:2px}
.lc-clase[data-tema="matematica"] .lc-chequeo h3{background:var(--lc-azul);color:#fff;margin:0 -20px 12px;padding:8px 20px;font-family:var(--lc-fuente-numeros)}
.lc-clase[data-tema="matematica"] .lc-opcion::before{border-radius:4px}
.lc-clase[data-tema="matematica"] .lc-lugar{border-style:dashed;background:#fff}

/* ========== BIOLOGÍA: cuaderno de laboratorio ========== */
.lc-clase[data-tema="biologia"]{--lc-fuente-titulos:'Nunito','Poppins',system-ui,sans-serif}
.lc-clase[data-tema="biologia"] .lc-titulo,.lc-clase[data-tema="biologia"] .lc-cap-titulo{font-weight:800;letter-spacing:-.01em}
.lc-clase[data-tema="biologia"] .lc-paso{border-radius:52% 48% 46% 54% / 55% 45% 55% 45%}
.lc-clase[data-tema="biologia"] .lc-stepper li::after{height:4px;border-radius:4px}
.lc-clase[data-tema="biologia"] .lc-eyebrow::before{content:'🔬 '}
.lc-clase[data-tema="biologia"] .lc-cap-clave{position:relative;background:#fff;border:1px solid #b9d9c4;border-radius:6px;transform:rotate(-.6deg);box-shadow:0 6px 14px rgba(20,85,54,.12);outline:1px dashed #b9d9c4;outline-offset:-7px}
.lc-clase[data-tema="biologia"] .lc-cap-clave::before{content:'';position:absolute;left:50%;top:-7px;width:14px;height:14px;border-radius:50%;background:var(--lc-naranja);box-shadow:0 2px 3px rgba(0,0,0,.3)}
.lc-clase[data-tema="biologia"] .lc-cap-clave .lc-nota-icono{background:var(--lc-azul-claro)}
.lc-clase[data-tema="biologia"] .lc-cap-clave .lc-rotulo{color:var(--lc-azul)}
.lc-clase[data-tema="biologia"] .lc-chequeo{background:var(--lc-azul-claro);border:none;box-shadow:none;border-radius:28px 28px 28px 8px}
.lc-clase[data-tema="biologia"] .lc-tarjeta{border:none;background:#f4faf6;box-shadow:0 1px 0 #d5e8dc}
.lc-clase[data-tema="biologia"] .lc-figura img{border-radius:28px;border:6px solid var(--lc-azul-claro);box-shadow:0 0 0 2px var(--lc-borde)}
.lc-clase[data-tema="biologia"] .lc-lugar{border:none;background:var(--lc-acento-claro);border-radius:28px 8px 28px 28px}

/* ========== GEOGRAFÍA: atlas y hoja de ruta ========== */
.lc-clase[data-tema="geografia"]{--lc-fuente-mapa:'JetBrains Mono',ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace}
.lc-clase[data-tema="geografia"] .lc-eyebrow{font-family:var(--lc-fuente-mapa);letter-spacing:.08em;color:var(--lc-azul)}
.lc-clase[data-tema="geografia"] .lc-eyebrow::before{content:'📍 '}
.lc-clase[data-tema="geografia"] .lc-cap-titulo{text-transform:uppercase;letter-spacing:.03em;font-size:1.25rem}
.lc-clase[data-tema="geografia"] .lc-stepper li::after{height:0;background:none;border-top:3px dashed var(--lc-borde)}
.lc-clase[data-tema="geografia"] .lc-stepper li.lc-hecho::after{border-top-color:var(--lc-naranja);background:none}
.lc-clase[data-tema="geografia"] .lc-paso{border-radius:50% 50% 50% 4px;transform:rotate(-45deg)}
.lc-clase[data-tema="geografia"] .lc-paso{font-size:0}
.lc-clase[data-tema="geografia"] .lc-paso::after{content:attr(data-paso);transform:rotate(45deg);font-size:.78rem}
.lc-clase[data-tema="geografia"] .lc-cap-clave{background:#fff;border:2px solid var(--lc-azul-osc);border-radius:4px;padding-top:30px;position:relative}
.lc-clase[data-tema="geografia"] .lc-cap-clave .lc-rotulo{position:absolute;left:0;right:0;top:0;margin:0;padding:4px 12px;background:var(--lc-azul-osc);color:#fff;font-family:var(--lc-fuente-mapa);font-size:.7rem}
.lc-clase[data-tema="geografia"] .lc-cap-clave .lc-nota-icono{background:var(--lc-acento-claro)}
.lc-clase[data-tema="geografia"] .lc-tarjeta{position:relative;overflow:hidden}
.lc-clase[data-tema="geografia"] .lc-tarjeta::after{content:'';position:absolute;right:0;top:0;border-width:0 22px 22px 0;border-style:solid;border-color:transparent #e8eef0 transparent transparent;box-shadow:-2px 2px 3px rgba(0,0,0,.08)}
.lc-clase[data-tema="geografia"] .lc-chequeo{border:2px solid var(--lc-borde);border-left:8px solid var(--lc-naranja);box-shadow:none}
.lc-clase[data-tema="geografia"] .lc-chequeo h3{font-family:var(--lc-fuente-mapa);color:var(--lc-naranja-osc)}
.lc-clase[data-tema="geografia"] .lc-lugar{border:2px solid var(--lc-azul);border-radius:4px;background:#fff}
/* ---------- Adaptación al perfil (perillas) ---------- */
.lc-letra-1 .lc-cap-cuerpo{zoom:1.12}
.lc-letra-2 .lc-cap-cuerpo{zoom:1.26}
.lc-mayus .lc-cap-texto,.lc-mayus .lc-globo,.lc-mayus .lc-cap-clave p,.lc-mayus .lc-chequeo>p,.lc-mayus .lc-opcion,.lc-mayus .lc-gancho-texto,.lc-mayus .lc-defs{text-transform:uppercase;letter-spacing:.02em}
.lc-grandes .lc-btn,.lc-grandes .lc-opcion,.lc-grandes .lc-chip,.lc-grandes .lc-btn-desplegar,.lc-grandes .lc-clasif-btns button,.lc-grandes .lc-orden-item,.lc-grandes .lc-error-paso{min-height:56px;font-size:1.08rem;padding-top:12px;padding-bottom:12px}
.lc-grandes .lc-opciones,.lc-grandes .lc-clasif-btns,.lc-grandes .lc-chips,.lc-grandes .lc-orden-pool{gap:12px}
.lc-anticipa{margin:0;font-size:.92rem;color:var(--lc-azul-osc);background:var(--lc-azul-claro);border-radius:10px;padding:8px 12px}
.lc-pausa{background:var(--lc-acento-claro);border:1px dashed var(--lc-acento-borde);border-radius:var(--lc-radio);padding:12px 16px}
.lc-pausa p{margin:0}
.lc-acumulado{background:var(--lc-azul-claro);border:1px solid var(--lc-borde)}
.lc-acumulado ul{margin:4px 0 0;padding-left:18px}
.lc-acumulado li{margin-bottom:2px}
.lc-defs{background:var(--lc-azul-claro);border-radius:var(--lc-radio);padding:12px 16px;font-size:.96rem}
.lc-defs ul{margin:6px 0 0;padding-left:18px}
.lc-escuchar-fila{display:flex}
.lc-pista-previa .lc-btn-desplegar{font-size:.92rem;padding:8px 12px;border-style:dashed}
.lc-pista-previa{margin-bottom:10px}
.lc-clase.lc-calmo *,.lc-clase.lc-calmo *::before,.lc-clase.lc-calmo *::after{animation:none!important;transition:none!important}
.lc-clase.lc-calmo{--lc-patron:linear-gradient(transparent,transparent)}
.lc-clase.lc-calmo[data-tema] .lc-gancho,.lc-clase.lc-calmo[data-tema] .lc-cifra,.lc-clase.lc-calmo[data-tema] .lc-logro-cab{background:var(--lc-azul-claro);color:var(--lc-texto);box-shadow:none}
.lc-clase.lc-calmo[data-tema] .lc-gancho .lc-rotulo,.lc-clase.lc-calmo[data-tema] .lc-cifra-num{color:var(--lc-azul)}
.lc-clase.lc-calmo[data-tema] .lc-cifra-puntos i{background:var(--lc-azul)}
.lc-clase.lc-calmo[data-tema] .lc-cifra-puntos i.lc-tenue{background:var(--lc-borde)}
.lc-clase.lc-calmo[data-tema] .lc-logro-cab .lc-cap-titulo{color:var(--lc-azul-osc)}
.lc-clase.lc-calmo[data-tema] .lc-puntaje{background:#fff}
.lc-clase.lc-calmo[data-tema] .lc-cap-clave{background:var(--lc-acento-claro);color:var(--lc-texto);border:1px solid var(--lc-acento-borde);box-shadow:none;transform:none;outline:none}
.lc-clase.lc-calmo[data-tema] .lc-cap-clave .lc-rotulo{color:var(--lc-naranja-osc);position:static;background:none;padding:0}
.lc-clase.lc-calmo[data-tema].lc-modo-capsulas{background-image:none}
.lc-clase.lc-calmo[data-tema] .lc-tarjeta,.lc-clase.lc-calmo[data-tema] .lc-chequeo{background-image:none;box-shadow:none}
.lc-clase.lc-calmo[data-tema] .lc-cap-texto>p:first-child::first-letter{float:none;font-size:inherit;color:inherit;margin:0;font-weight:inherit}
`;

function inyectarEstilos() {
  if (document.querySelector('style[data-lc-estilos]')) return;
  const estilo = document.createElement('style');
  estilo.setAttribute('data-lc-estilos', '');
  estilo.textContent = ESTILOS + ESTILOS_CARPETA;
  document.head.appendChild(estilo);
}

// ---------------------------------------------------------------------------
// Interactivos
// ---------------------------------------------------------------------------
function tarjeta(titulo, consigna) {
  const t = el('div', 'lc-tarjeta');
  if (titulo) t.appendChild(el('h3', '', fmt(titulo)));
  if (consigna) t.appendChild(el('p', 'lc-consigna', fmt(consigna)));
  return t;
}

const INTERACTIVOS = {
  // Pregunta para pensar antes de ver la respuesta
  revelar(d, ctx) {
    const t = tarjeta(d.titulo || '🤔 Pensalo antes de seguir');
    t.appendChild(el('p', '', fmt(d.pregunta)));
    if (d.pista) t.appendChild(crearDesplegable('💡 Necesito una pista', `<p>${fmt(d.pista)}</p>`));
    const separador = el('div'); separador.style.height = '8px'; t.appendChild(separador);
    t.appendChild(crearDesplegable('👀 Ver la respuesta', `<p>${fmt(d.respuesta)}</p>`,
      { alAbrir: () => registrar('clase_revelar', { clase: ctx.id, pregunta: d.pregunta }) }));
    return t;
  },

  // Secuencia paso a paso
  pasos(d, ctx) {
    const t = tarjeta(d.titulo, d.consigna);
    const cuerpo = el('div', 'lc-pasos-cuerpo'); cuerpo.setAttribute('aria-live', 'polite');
    const puntos = el('div', 'lc-puntos');
    const nav = el('div', 'lc-pasos-nav');
    const ant = el('button', 'lc-btn lc-sec', '← Anterior'); ant.type = 'button';
    const contador = el('span', 'lc-consigna');
    const sig = el('button', 'lc-btn', 'Siguiente →'); sig.type = 'button';
    nav.append(ant, contador, sig);
    let i = 0;
    const pintar = () => {
      const p = d.pasos[i];
      cuerpo.innerHTML = `<div class="lc-pasos-titulo">${fmt(p.titulo)}</div><p>${fmt(p.texto)}</p>`;
      puntos.innerHTML = d.pasos.map((_, k) => `<span class="lc-puntito${k === i ? ' lc-activo' : ''}"></span>`).join('');
      contador.textContent = `Paso ${i + 1} de ${d.pasos.length}`;
      ant.disabled = i === 0; sig.disabled = i === d.pasos.length - 1;
    };
    ant.addEventListener('click', () => { if (i > 0) { i--; pintar(); } });
    sig.addEventListener('click', () => { if (i < d.pasos.length - 1) { i++; pintar(); registrar('clase_paso', { clase: ctx.id, paso: i + 1 }); } });
    t.append(cuerpo, puntos, nav);
    pintar();
    return t;
  },

  // Columnas para comparar
  comparar(d) {
    const t = tarjeta(d.titulo, d.consigna);
    const cols = el('div', 'lc-columnas');
    d.columnas.forEach(c => {
      cols.appendChild(el('div', 'lc-columna',
        `<h4>${fmt(c.nombre)}</h4><ul>${c.puntos.map(p => `<li>${fmt(p)}</li>`).join('')}</ul>`));
    });
    t.appendChild(cols);
    if (d.conclusion) {
      const s = el('div'); s.style.height = '10px'; t.appendChild(s);
      t.appendChild(crearDesplegable(d.boton_conclusion || '🔗 ¿Qué tienen en común?', `<p>${fmt(d.conclusion)}</p>`));
    }
    return t;
  },

  // Recta numérica interactiva (modo "explorar" o "distancia")
  recta(d, ctx) {
    const t = tarjeta(d.titulo, d.consigna);
    const caja = el('div', 'lc-recta');
    const salida = el('div', 'lc-salida', `<span class="lc-consigna">${d.modo === 'distancia' ? 'Tocá dos puntos para medir la distancia entre ellos.' : 'Tocá un punto de la recta.'}</span>`);
    salida.setAttribute('aria-live', 'polite');
    caja.appendChild(dibujarRecta(d, (seleccion) => {
      if (d.modo === 'distancia') {
        if (seleccion.length === 1) {
          salida.innerHTML = `Elegiste <b>${fmt(seleccion[0].etiqueta)}</b>. Ahora tocá otro punto.`;
        } else if (seleccion.length === 2) {
          const [a, b] = seleccion;
          const dist = Math.abs(a.valor - b.valor);
          const distTxt = Number.isInteger(dist) ? dist : dist.toLocaleString('es-AR');
          salida.innerHTML = `Entre <b>${fmt(a.etiqueta)}</b> y <b>${fmt(b.etiqueta)}</b> hay <b>${distTxt} ${escapar(d.unidad || 'unidades')}</b> de distancia. ` +
            `<br><span class="lc-consigna">Contá los saltos de uno en uno: la distancia nunca es negativa.</span>`;
          registrar('clase_recta_distancia', { clase: ctx.id, a: a.valor, b: b.valor });
        }
      } else if (seleccion.length) {
        const p = seleccion[seleccion.length - 1];
        salida.innerHTML = `<b>${fmt(p.etiqueta)}</b>${p.nota ? ': ' + fmt(p.nota) : ''}`;
        registrar('clase_recta_punto', { clase: ctx.id, valor: p.valor });
      }
    }));
    caja.appendChild(salida);
    t.appendChild(caja);
    return t;
  },

  // Un mismo número en distintas representaciones
  representaciones(d, ctx) {
    const t = tarjeta(d.titulo, d.consigna);
    const chips = el('div', 'lc-chips');
    const detalle = el('div', 'lc-salida'); detalle.setAttribute('aria-live', 'polite');
    const zonaRecta = el('div', 'lc-recta');
    const min = d.min ?? 0, max = d.max ?? 2;
    const mostrar = (n, boton) => {
      chips.querySelectorAll('.lc-chip').forEach(b => b.setAttribute('aria-pressed', 'false'));
      boton.setAttribute('aria-pressed', 'true');
      const celdas = [['Fracción', n.fraccion], ['Decimal', n.decimal], ['Porcentaje', n.porcentaje], ['Notación científica', n.cientifica]]
        .filter(([, v]) => v)
        .map(([k, v]) => `<div class="lc-rep-celda"><small>${k}</small><b>${escapar(v)}</b></div>`).join('');
      detalle.innerHTML = `<div class="lc-rep-tabla">${celdas}</div>${n.contexto ? `<p>${fmt(n.contexto)}</p>` : ''}`;
      zonaRecta.innerHTML = '';
      if (typeof n.valor === 'number' && n.valor >= min && n.valor <= max) {
        zonaRecta.appendChild(dibujarRecta({ min, max, marcas: d.marcas ?? 0.5, puntos: [{ valor: n.valor, etiqueta: n.fraccion || n.decimal }] }, () => {}, true));
      }
      registrar('clase_representacion', { clase: ctx.id, numero: n.nombre });
    };
    d.numeros.forEach(n => {
      const b = el('button', 'lc-chip', escapar(n.nombre)); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => mostrar(n, b));
      chips.appendChild(b);
    });
    t.append(chips, detalle, zonaRecta);
    detalle.innerHTML = '<span class="lc-consigna">Elegí un número para verlo de todas sus formas.</span>';
    return t;
  },

  // Texto para escuchar (síntesis de voz) con preguntas
  escuchar(d, ctx) {
    const t = tarjeta(d.titulo || '🎧 Escuchá con atención', d.consigna);
    const acciones = el('div', 'lc-acciones');
    const bVoz = el('button', 'lc-btn', '🔊 Escuchar'); bVoz.type = 'button';
    bVoz.addEventListener('click', () => { leerEnVoz(d.texto, bVoz); registrar('clase_escuchar', { clase: ctx.id }); });
    if (!('speechSynthesis' in window)) bVoz.disabled = true;
    acciones.appendChild(bVoz);
    t.appendChild(acciones);
    t.appendChild(el('div', '', '<div style="height:8px"></div>'));
    t.appendChild(crearDesplegable('📄 Ver el texto escrito', `<p>${fmt(d.texto)}</p>`));
    (d.preguntas || []).forEach((p, k) => {
      t.appendChild(el('div', '', '<div style="height:8px"></div>'));
      t.appendChild(crearDesplegable(`${k + 1}. ${fmt(p.pregunta)}`, `<p>${fmt(p.respuesta)}</p>`));
    });
    return t;
  },

  // Texto con partes marcadas que se pueden tocar
  texto_anotado(d, ctx) {
    const t = tarjeta(d.titulo, d.consigna);
    const colores = ['#00509e', '#f97316', '#2d8a82', '#8b5cf6', '#d63384'];
    const etiquetas = [...new Set(d.segmentos.filter(s => s.etiqueta).map(s => s.etiqueta))];
    const colorDe = (e) => colores[etiquetas.indexOf(e) % colores.length];
    const caja = el('div', 'lc-texto-anotado');
    const salida = el('div', 'lc-salida', '<span class="lc-consigna">Tocá las partes subrayadas.</span>');
    salida.setAttribute('aria-live', 'polite');
    d.segmentos.forEach(s => {
      if (!s.etiqueta) {
        s.texto.split('\n').forEach((parte, k) => {
          if (k) caja.appendChild(document.createElement('br'));
          caja.appendChild(document.createTextNode(parte));
        });
        return;
      }
      const b = el('button', 'lc-seg', escapar(s.texto)); b.type = 'button';
      b.style.borderBottomColor = colorDe(s.etiqueta);
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        caja.querySelectorAll('.lc-seg').forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        salida.innerHTML = `<b style="color:${colorDe(s.etiqueta)}">${escapar(s.etiqueta)}</b>: ${fmt(s.nota || '')}`;
        registrar('clase_anotacion', { clase: ctx.id, etiqueta: s.etiqueta });
      });
      caja.appendChild(b);
    });
    const leyenda = el('div', 'lc-leyenda', etiquetas.map(e => `<span style="--c:${colorDe(e)}">${escapar(e)}</span>`).join(''));
    t.append(caja, leyenda, salida);
    return t;
  },

  // Elementos para explorar uno por uno
  explorar(d, ctx) {
    const t = tarjeta(d.titulo, d.consigna);
    const chips = el('div', 'lc-chips');
    const salida = el('div', 'lc-salida', '<span class="lc-consigna">Elegí uno para ver más.</span>');
    salida.setAttribute('aria-live', 'polite');
    d.elementos.forEach(e => {
      const b = el('button', 'lc-chip', `${e.icono ? escapar(e.icono) + ' ' : ''}${escapar(e.nombre)}`); b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        chips.querySelectorAll('.lc-chip').forEach(x => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        salida.innerHTML = `<b>${fmt(e.nombre)}</b><p style="margin:4px 0 0">${fmt(e.texto)}</p>`;
        registrar('clase_explorar', { clase: ctx.id, elemento: e.nombre });
      });
      chips.appendChild(b);
    });
    t.append(chips, salida);
    return t;
  },

  // Analizar una imagen: encontrar los datos escondidos tocándola
  lupa(d, ctx) {
    const t = tarjeta(d.titulo || '🔍 Mirá con lupa', d.consigna);
    const img = ctx.imagenes?.[d.imagen];
    if (!img?.archivo) {
      t.appendChild(el('div', 'lc-img-pendiente', `🖼️ <b>Falta la imagen ${escapar(d.imagen)}</b> para esta actividad.`));
      return t;
    }
    const fig = el('figure', 'lc-lupa-fig');
    const foto = document.createElement('img');
    foto.src = `${ctx.opciones?.rutaImagenesClase ?? 'img/clases/'}${img.archivo}`;
    foto.alt = img.alt || '';
    foto.draggable = false;
    fig.appendChild(foto);
    const msg = el('div', 'lc-lupa-msg');
    msg.hidden = true;
    fig.appendChild(msg);
    const lista = el('ol', 'lc-hallazgos');
    lista.setAttribute('aria-live', 'polite');
    const contador = el('span', 'lc-contador');
    const logro = el('div', 'lc-logro', `🏆 ${fmt(d.cierre || '¡Encontraste todas las pistas!')}`);
    logro.hidden = true;
    const total = d.hallazgos.length;
    let encontrados = 0, fallos = 0, tMsg;
    const actualizar = () => { contador.textContent = `🔍 Encontraste ${encontrados} de ${total}`; };
    const bPista = el('button', 'lc-btn lc-sec lc-btn-chico', '💡 Dame una pista');
    bPista.type = 'button';
    const hots = d.hallazgos.map((h, k) => {
      const b = el('button', 'lc-hot');
      b.type = 'button';
      const escala = ctx.ajustes?.botones_grandes ? 1.5 : 1;
      Object.assign(b.style, { left: `${h.x}%`, top: `${h.y}%`, width: `${(h.r || 6) * 2 * escala}%` });
      b.setAttribute('aria-label', `Posible pista ${k + 1}`);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (b.classList.contains('lc-encontrado')) return;
        encontrados += 1;
        b.classList.remove('lc-pista');
        b.classList.add('lc-encontrado');
        b.dataset.n = encontrados;
        b.setAttribute('aria-label', `Pista ${encontrados}: ${h.titulo}`);
        lista.appendChild(el('li', '', `<span class="lc-n">${encontrados}</span><div><b>${fmt(h.titulo)}</b><br>${fmt(h.texto)}</div>`));
        actualizar();
        registrar('clase_lupa_hallazgo', { clase: ctx.id, hallazgo: h.titulo, numero: encontrados });
        if (encontrados === total) {
          logro.hidden = false;
          bPista.hidden = true;
          registrar('clase_lupa_completa', { clase: ctx.id, fallos });
        }
      });
      fig.appendChild(b);
      return b;
    });
    fig.addEventListener('click', (e) => {
      if (e.target.closest('.lc-hot')) return;
      fallos += 1;
      const r = fig.getBoundingClientRect();
      const x = Math.min(80, Math.max(20, ((e.clientX - r.left) / r.width) * 100));
      const y = Math.max(14, ((e.clientY - r.top) / r.height) * 100);
      msg.textContent = 'Acá no hay pista. ¡Seguí buscando!';
      Object.assign(msg.style, { left: `${x}%`, top: `${y}%` });
      msg.hidden = false;
      clearTimeout(tMsg);
      tMsg = setTimeout(() => { msg.hidden = true; }, 1300);
    });
    bPista.addEventListener('click', () => {
      const proxima = hots.find(b => !b.classList.contains('lc-encontrado'));
      if (!proxima) return;
      proxima.classList.remove('lc-pista');
      void proxima.offsetWidth;
      proxima.classList.add('lc-pista');
      registrar('clase_lupa_pista', { clase: ctx.id });
    });
    const barra = el('div', 'lc-lupa-barra');
    barra.append(contador, bPista);
    actualizar();
    t.append(fig, barra, lista, logro);
    return t;
  },

  // Clasificar elementos en categorías (un toque por elemento)
  clasificar(d, ctx) {
    const t = tarjeta(d.titulo || '🗂️ Clasificá', d.consigna);
    const contador = el('div', 'lc-contador');
    const lista = el('div', 'lc-clasif-lista');
    const logro = el('div', 'lc-logro', `🏆 ${fmt(d.cierre || '¡Clasificaste todo!')}`);
    logro.hidden = true;
    const items = d.items.map(it => ({ ...it }));
    for (let k = items.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [items[k], items[j]] = [items[j], items[k]];
    }
    let bien = 0, errores = 0;
    const actualizar = () => { contador.textContent = `${bien} de ${items.length} clasificados`; };
    items.forEach(it => {
      const caja = el('div', 'lc-clasif-item');
      const fila = el('div', 'lc-clasif-fila', `<span class="lc-clasif-nombre">${it.icono ? `${escapar(it.icono)} ` : ''}${fmt(it.nombre)}</span>`);
      const botones = el('div', 'lc-clasif-btns');
      const dato = el('div', 'lc-clasif-dato');
      dato.hidden = true;
      d.categorias.forEach(cat => {
        const b = el('button', '', escapar(cat));
        b.type = 'button';
        b.addEventListener('click', () => {
          if (cat === it.categoria) {
            caja.classList.add('lc-ok');
            botones.replaceWith(el('span', 'lc-clasif-badge', `✓ ${escapar(cat)}`));
            dato.innerHTML = it.dato ? fmt(it.dato) : '';
            dato.hidden = !it.dato;
            bien += 1;
            actualizar();
            registrar('clase_clasificar', { clase: ctx.id, elemento: it.nombre, correcto: true });
            if (bien === items.length) { logro.hidden = false; registrar('clase_clasificar_completo', { clase: ctx.id, errores }); }
          } else {
            errores += 1;
            b.disabled = true;
            caja.classList.remove('lc-sacudir');
            void caja.offsetWidth;
            caja.classList.add('lc-sacudir');
            dato.innerHTML = `🤔 ${fmt(it.pista || 'Mirá de nuevo.')}`;
            dato.hidden = false;
            registrar('clase_clasificar', { clase: ctx.id, elemento: it.nombre, correcto: false });
          }
        });
        botones.appendChild(b);
      });
      fila.appendChild(botones);
      caja.append(fila, dato);
      lista.appendChild(caja);
    });
    actualizar();
    t.append(contador, el('div', '', '<div style="height:8px"></div>'), lista, logro);
    return t;
  },

  // Ordenar una secuencia: se toca el elemento que va en cada lugar
  ordenar(d, ctx) {
    const t = tarjeta(d.titulo || '🔢 Ordená', d.consigna);
    const listo = el('ol', 'lc-orden-listo');
    const pool = el('div', 'lc-orden-pool');
    const aviso = el('div', 'lc-orden-aviso');
    aviso.setAttribute('aria-live', 'polite');
    const logro = el('div', 'lc-logro', `🏆 ${fmt(d.cierre || '¡Lo ordenaste perfecto!')}`);
    logro.hidden = true;
    const mezcla = d.items.map((texto, i) => ({ texto, i }));
    for (let k = mezcla.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [mezcla[k], mezcla[j]] = [mezcla[j], mezcla[k]];
    }
    if (mezcla.every((m, k) => m.i === k) && mezcla.length > 1) mezcla.push(mezcla.shift());
    let siguiente = 0, errores = 0;
    const pintarAviso = () => {
      aviso.textContent = siguiente < d.items.length ? `¿Qué va en el lugar ${siguiente + 1}?` : '';
    };
    mezcla.forEach(m => {
      const b = el('button', 'lc-orden-item', fmt(m.texto));
      b.type = 'button';
      b.addEventListener('click', () => {
        if (m.i === siguiente) {
          b.remove();
          listo.appendChild(el('li', '', fmt(m.texto)));
          siguiente += 1;
          pintarAviso();
          if (siguiente === d.items.length) { logro.hidden = false; registrar('clase_ordenar_completo', { clase: ctx.id, errores }); }
        } else {
          errores += 1;
          b.classList.remove('lc-sacudir');
          void b.offsetWidth;
          b.classList.add('lc-sacudir');
          aviso.textContent = `Ese no va en el lugar ${siguiente + 1}. Probá con otro.`;
        }
      });
      pool.appendChild(b);
    });
    pintarAviso();
    t.append(listo, aviso, pool, logro);
    return t;
  },

  // Encontrar el paso equivocado de una resolución o de un razonamiento
  error(d, ctx) {
    const t = tarjeta(d.titulo || '🕵️ Encontrá el error', d.consigna);
    const lista = el('div', 'lc-error-lista');
    const salida = el('div', 'lc-devolucion');
    salida.setAttribute('aria-live', 'polite');
    let intentos = 0, resuelto = false;
    d.pasos.forEach((p, k) => {
      const b = el('button', 'lc-error-paso', `<span class="lc-error-num">${k + 1}</span><span>${fmt(p.texto)}</span>`);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (resuelto) return;
        intentos += 1;
        if (p.error) {
          resuelto = true;
          b.classList.add('lc-error-hallado');
          lista.querySelectorAll('button').forEach(x => { x.disabled = true; });
          salida.className = 'lc-devolucion lc-bien';
          salida.innerHTML = `🎯 ${fmt(p.explicacion || '¡Lo encontraste!')}`;
          registrar('clase_error_hallado', { clase: ctx.id, intentos });
        } else {
          b.classList.add('lc-error-ok');
          b.disabled = true;
          salida.className = 'lc-devolucion lc-mal';
          salida.innerHTML = `✔️ ${fmt(p.explicacion || 'Este paso está bien. Seguí buscando.')}`;
        }
      });
      lista.appendChild(b);
    });
    t.append(lista, salida);
    return t;
  },

  // Dato curioso
  dato(d) {
    return el('div', 'lc-dato', `<span class="lc-dato-icono" aria-hidden="true">${escapar(d.icono || '✨')}</span><div><b>¿Sabías que…?</b><br>${fmt(d.texto)}</div>`);
  }
};

// Dibuja una recta numérica en SVG. onSeleccion recibe la lista de puntos elegidos.
function dibujarRecta(d, onSeleccion, soloLectura = false) {
  const NS = 'http://www.w3.org/2000/svg';
  const ancho = 640, alto = 110, margen = 30, y = 70;
  const min = d.min, max = d.max;
  const x = (v) => margen + ((v - min) / (max - min)) * (ancho - 2 * margen);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Recta numérica de ${min} a ${max}`);
  const linea = document.createElementNS(NS, 'line');
  Object.entries({ x1: margen - 12, x2: ancho - margen + 12, y1: y, y2: y, stroke: '#1f2a37', 'stroke-width': 2 }).forEach(([k, v]) => linea.setAttribute(k, v));
  svg.appendChild(linea);
  const flecha = document.createElementNS(NS, 'path');
  flecha.setAttribute('d', `M${ancho - margen + 12},${y} l-8,-5 v10 z`);
  flecha.setAttribute('fill', '#1f2a37');
  svg.appendChild(flecha);
  const paso = d.marcas || 1;
  const cantidad = Math.round((max - min) / paso);
  const etiquetarCada = Math.max(1, Math.ceil(cantidad / 20));
  for (let k = 0; k <= cantidad; k++) {
    const v = +(min + k * paso).toFixed(6);
    const marca = document.createElementNS(NS, 'line');
    Object.entries({ x1: x(v), x2: x(v), y1: y - (v === 0 ? 9 : 6), y2: y + (v === 0 ? 9 : 6), stroke: v === 0 ? '#f97316' : '#1f2a37', 'stroke-width': v === 0 ? 3 : 1.5 }).forEach(([a, b]) => marca.setAttribute(a, b));
    svg.appendChild(marca);
    if (k % etiquetarCada === 0) {
      const txt = document.createElementNS(NS, 'text');
      Object.entries({ x: x(v), y: y + 26, 'text-anchor': 'middle', 'font-size': 13, fill: '#5b6675' }).forEach(([a, b]) => txt.setAttribute(a, b));
      txt.textContent = Number.isInteger(v) ? String(v) : v.toLocaleString('es-AR');
      svg.appendChild(txt);
    }
  }
  const seleccion = [];
  (d.puntos || []).forEach((p) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'lc-punto');
    if (!soloLectura) {
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${p.etiqueta}, valor ${p.valor}`);
    }
    const c = document.createElementNS(NS, 'circle');
    Object.entries({ cx: x(p.valor), cy: y, r: 8, fill: p.valor < 0 ? '#2d8a82' : '#00509e', stroke: '#fff', 'stroke-width': 2 }).forEach(([a, b]) => c.setAttribute(a, b));
    const txt = document.createElementNS(NS, 'text');
    Object.entries({ x: x(p.valor), y: y - 16, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: '#1f2a37' }).forEach(([a, b]) => txt.setAttribute(a, b));
    txt.textContent = p.corta || p.etiqueta;
    // Zona invisible que cubre el punto y su etiqueta: más fácil de tocar con el dedo
    const zona = document.createElementNS(NS, 'rect');
    Object.entries({ x: x(p.valor) - 22, y: y - 32, width: 44, height: 46, fill: 'transparent' }).forEach(([a, b]) => zona.setAttribute(a, b));
    g.append(zona, c, txt);
    if (!soloLectura) {
      const elegir = () => {
        if (d.modo === 'distancia') {
          if (seleccion.length >= 2) { seleccion.length = 0; svg.querySelectorAll('.lc-punto').forEach(n => n.classList.remove('lc-sel')); }
          if (!seleccion.includes(p)) { seleccion.push(p); g.classList.add('lc-sel'); }
        } else {
          svg.querySelectorAll('.lc-punto').forEach(n => n.classList.remove('lc-sel'));
          seleccion.length = 0; seleccion.push(p); g.classList.add('lc-sel');
        }
        onSeleccion([...seleccion]);
      };
      g.addEventListener('click', elegir);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(); } });
    }
    svg.appendChild(g);
  });
  return svg;
}

// ---------------------------------------------------------------------------
// Render principal
// ---------------------------------------------------------------------------
const FRASES_LUMAI = {
  saludo: '¡Hola, {NOMBRE}! Soy LumAI y hoy vamos a descubrir algo nuevo juntos. Arranquemos con una pregunta.',
  idea: 'Prestá atención, porque esto es lo más importante de toda la clase:',
  pasos: 'Ahora vamos paso a paso. Abrí cada parte cuando estés listo.',
  cierre: '¡Muy bien! Ya conocés lo esencial. Cuando quieras, pasamos a las actividades.'
};

function crearLumai(texto, pose, opciones) {
  const nombre = (opciones.nombreAlumno || '').trim();
  const frase = texto.replace(/,?\s*\{NOMBRE\}/g, nombre ? `, ${nombre}` : '').replace(/\{NOMBRE\}/g, nombre);
  const ruta = opciones.rutaImagenes ?? 'img/';
  const caja = el('div', 'lc-lumai');
  const img = document.createElement('img');
  img.src = `${ruta}${pose === 'idea' ? '4' : '3'}.png`;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.onerror = () => { img.remove(); };
  caja.append(img, el('div', 'lc-globo', `<b class="lc-quien">LumAI</b>${fmt(frase)}`));
  return caja;
}

function crearImagen(d, opciones) {
  const ruta = opciones.rutaImagenesClase ?? 'img/clases/';
  if (d.archivo) {
    const fig = el('figure', 'lc-figura');
    const img = document.createElement('img');
    img.src = `${ruta}${d.archivo}`;
    img.alt = d.alt || '';
    img.loading = 'lazy';
    img.onerror = () => { fig.remove(); };
    fig.appendChild(img);
    if (d.epigrafe) fig.appendChild(el('figcaption', '', fmt(d.epigrafe)));
    return fig;
  }
  if (opciones.mostrarPendientes) {
    return el('div', 'lc-img-pendiente', `🖼️ <b>Imagen pendiente (${escapar(d.id)})</b><br>${fmt(d.descripcion || '')}`);
  }
  return null;
}

function crearVocabulario(lista, ctx) {
  const grilla = el('div', 'lc-vocab');
  lista.forEach(v => {
    const carta = el('button', 'lc-carta',
      `<div class="lc-carta-int"><div class="lc-cara lc-frente">${escapar(v.palabra)}</div><div class="lc-cara lc-dorso">${fmt(v.definicion)}</div></div>`);
    carta.type = 'button';
    carta.setAttribute('aria-pressed', 'false');
    carta.setAttribute('aria-label', `${v.palabra}. Tocá para ver la definición`);
    carta.addEventListener('click', () => {
      const girada = carta.getAttribute('aria-pressed') === 'true';
      carta.setAttribute('aria-pressed', String(!girada));
      if (!girada) registrar('clase_vocabulario', { clase: ctx.id, palabra: v.palabra });
    });
    grilla.appendChild(carta);
  });
  return grilla;
}

function parrafos(texto) {
  return String(texto || '').split(/\n+/).filter(Boolean).map(p => `<p>${fmt(p)}</p>`).join('');
}

// Pregunta de comprobación: hay que acertar para seguir; las opciones erradas se tachan
// Cómo se nombran las partes de la clase en cada materia (la estructura es la misma)
const ROTULOS = {
  general:    { capsula: 'Actividad', recordar: 'Para recordar', iconoRecordar: '📌', chequeo: '✅ ¿Lo entendiste?', mision: 'Tu misión', iconoMision: '🎯', resuelta: 'La respuesta a tu misión', recorrido: '🗺️ El recorrido', resumen: '📌 Lo que te llevás', lugar: '📍 Pensá en tu lugar' },
  lengua:     { capsula: 'Capítulo', recordar: 'Subrayá esto', iconoRecordar: '🖍️', chequeo: 'Pregunta de lectura', mision: 'Tu desafío de hoy', iconoMision: '📖', resuelta: 'Desafío resuelto', recorrido: '📑 Índice', resumen: '🖍️ Lo que subrayaste', lugar: '✍️ Escribí desde tu lugar' },
  matematica: { capsula: 'Paso', recordar: 'La regla', iconoRecordar: '📐', chequeo: 'Resolvé', mision: 'El problema de hoy', iconoMision: '🧮', resuelta: 'Problema resuelto', recorrido: '🧮 Plan de trabajo', resumen: '📐 Las reglas de hoy', lugar: '📍 Los números de tu lugar' },
  biologia:   { capsula: 'Observación', recordar: 'Hallazgo', iconoRecordar: '🔬', chequeo: '🧪 Comprobá', mision: 'Tu investigación', iconoMision: '🧪', resuelta: 'Conclusión de la investigación', recorrido: '📓 Bitácora', resumen: '🔬 Tus hallazgos', lugar: '🌿 Observá a tu alrededor' },
  geografia:  { capsula: 'Parada', recordar: 'Leyenda', iconoRecordar: '🧭', chequeo: 'Ubicate', mision: 'Tu expedición', iconoMision: '🗺️', resuelta: 'Expedición cumplida', recorrido: '🗺️ Hoja de ruta', resumen: '🧭 La leyenda del día', lugar: '📍 Tu lugar en el mapa' }
};

// Pregunta abierta para que el alumno piense en su propio contexto (no bloquea ni se envía)
function crearMiLugar(d, ctx, idCapsula) {
  const t = el('div', 'lc-lugar', `<h3>${escapar(ctx.rotulos.lugar)}</h3><p>${fmt(d.pregunta)}</p>`);
  const id = idUnico('lc-lugar');
  const area = document.createElement('textarea');
  area.id = id;
  area.setAttribute('aria-label', d.pregunta.replace(/\*/g, ''));
  area.placeholder = d.ayuda || 'Escribí tu respuesta acá…';
  const fila = el('div', 'lc-lugar-fila', '<small>Es para vos: no hay respuestas correctas.</small>');
  const listo = el('button', 'lc-btn lc-sec lc-btn-chico', 'Listo');
  listo.type = 'button';
  const ok = el('span', 'lc-lugar-ok');
  ok.setAttribute('aria-live', 'polite');
  listo.addEventListener('click', () => {
    const largo = area.value.trim().length;
    ok.textContent = largo ? '¡Gracias! Lo que pasa en tu lugar también es parte de lo que aprendés.' : 'Si querés, pensalo un momento y escribilo.';
    if (largo) registrar('clase_mi_lugar', { clase: ctx.id, capsula: idCapsula, caracteres: largo });
  });
  fila.append(listo);
  t.append(area, fila, ok);
  return t;
}

function crearChequeo(ch, ctx, idCapsula, alAcertar) {
  const t = el('div', 'lc-tarjeta lc-chequeo');
  t.appendChild(el('h3', '', escapar(ctx.rotulos?.chequeo || '✅ ¿Lo entendiste?')));
  t.appendChild(el('p', '', fmt(ch.pregunta)));
  const aj = ctx.ajustes || {};
  let opciones = ch.opciones.map((texto, i) => ({ texto, i }));
  if (aj.opciones === 2 && opciones.length > 2) {
    opciones = [opciones[ch.correcta], opciones.find(o => o.i !== ch.correcta)];
  }
  const pista = ch.pista || (ctx.ideas?.[idCapsula] ? `Repasá lo que acabás de leer: ${ctx.ideas[idCapsula]}` : '');
  if (aj.pista_previa && pista) {
    t.appendChild(crearDesplegable('💡 Ver una pista antes de responder', `<p>${fmt(pista)}</p>`,
      { claseExtra: 'lc-pista-previa', alAbrir: () => registrar('clase_pista_previa', { clase: ctx.id, capsula: idCapsula }) }));
  }
  for (let k = opciones.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [opciones[k], opciones[j]] = [opciones[j], opciones[k]];
  }
  const lista = el('div', 'lc-opciones');
  const devolucion = el('div', 'lc-devolucion');
  devolucion.setAttribute('aria-live', 'polite');
  let intentos = 0;
  opciones.forEach(o => {
    const b = el('button', 'lc-opcion', fmt(o.texto));
    b.type = 'button';
    b.addEventListener('click', () => {
      intentos += 1;
      if (o.i === ch.correcta) {
        b.classList.add('lc-bien');
        lista.querySelectorAll('button').forEach(x => { x.disabled = true; });
        devolucion.className = 'lc-devolucion lc-bien';
        devolucion.innerHTML = `🎉 ${fmt(ch.bien || '¡Muy bien!')}`;
        registrar('clase_chequeo', { clase: ctx.id, capsula: idCapsula, titulo: ctx.titulos?.[idCapsula], intentos, primera: intentos === 1 });
        alAcertar(intentos === 1, intentos);
      } else {
        b.classList.add('lc-mal');
        b.disabled = true;
        devolucion.className = 'lc-devolucion lc-mal';
        devolucion.innerHTML = `🤔 ${fmt(ch.mal || 'Casi. Probá con otra opción.')}`;
      }
    });
    lista.appendChild(b);
  });
  t.append(lista, devolucion);
  return t;
}

function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Busca una palabra del vocabulario (acepta plurales: "dependencias" -> "Dependencia")
function buscarTermino(texto, vocabulario) {
  const n = normalizar(texto);
  return (vocabulario || []).find(v => {
    const m = normalizar(v.palabra);
    return n === m || (n.startsWith(m) && n.length - m.length <= 3) || (m.startsWith(n) && m.length - n.length <= 2);
  });
}

// ---------------------------------------------------------------------------
// Formatos de presentación de una cápsula (varían para que no sea monótono)
//   ecuacion     {piezas:[{icono,nombre,texto}], resultado:{icono,nombre,texto}, operador:"+", igual:"="}
//   contraste    {lados:[{etiqueta,nombre,dibujo:"linea"|"zona",texto}]}
//   cifra        {numero, leyenda, puntos (cantidad de puntitos), destacados (cuántos resaltar), nota}
//   linea_tiempo {hitos:[{anio,titulo,texto,tipo:"conflicto"|"acuerdo"}], leyenda:{conflicto,acuerdo}}
//   cita         {texto, fuente}   -> un fragmento destacado (poema, relato, frase)
// ---------------------------------------------------------------------------
const DIBUJOS = {
  linea: '<svg viewBox="0 0 200 80" aria-hidden="true"><rect x="6" y="14" width="84" height="52" rx="8" fill="#cfe2f6"/><rect x="110" y="14" width="84" height="52" rx="8" fill="#ffe1c7"/><line x1="100" y1="4" x2="100" y2="76" stroke="#00509e" stroke-width="4" stroke-dasharray="7 5" stroke-linecap="round"/></svg>',
  zona: '<svg viewBox="0 0 200 80" aria-hidden="true"><rect x="6" y="14" width="84" height="52" rx="8" fill="#cfe2f6"/><rect x="110" y="14" width="84" height="52" rx="8" fill="#ffe1c7"/><rect x="66" y="6" width="68" height="68" rx="12" fill="#00a676" fill-opacity=".22"/><line x1="100" y1="6" x2="100" y2="74" stroke="#00509e" stroke-width="2" stroke-dasharray="4 4" stroke-opacity=".45"/><circle cx="82" cy="30" r="5" fill="#00805b"/><circle cx="118" cy="50" r="5" fill="#00805b"/><circle cx="94" cy="58" r="5" fill="#00805b"/><circle cx="110" cy="26" r="5" fill="#00805b"/><path d="M74 46h14m-4-4 4 4-4 4M126 36h-14m4-4-4 4 4 4" stroke="#00805b" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
};

function crearPresentacion(p) {
  if (p.tipo === 'ecuacion') {
    const caja = el('div', 'lc-ecuacion');
    const pieza = (pz, extra, i) => {
      const n = el('div', `lc-ec-pieza ${extra}`, `<span class="lc-ec-icono" aria-hidden="true">${escapar(pz.icono || '')}</span><span class="lc-ec-nombre">${fmt(pz.nombre)}</span><span class="lc-ec-texto">${fmt(pz.texto || '')}</span>`);
      n.style.setProperty('--i', i);
      return n;
    };
    p.piezas.forEach((pz, k) => {
      if (k) caja.appendChild(el('span', 'lc-ec-op', escapar(p.operador || '+')));
      caja.appendChild(pieza(pz, '', k));
    });
    caja.appendChild(el('span', 'lc-ec-op', escapar(p.igual || '=')));
    caja.appendChild(pieza(p.resultado, 'lc-ec-resultado', p.piezas.length));
    return caja;
  }
  if (p.tipo === 'contraste') {
    const caja = el('div', 'lc-contraste');
    p.lados.forEach(l => caja.appendChild(el('div', 'lc-ct',
      `${DIBUJOS[l.dibujo] || ''}${l.etiqueta ? `<span class="lc-ct-etiqueta">${escapar(l.etiqueta)}</span>` : ''}<h4>${fmt(l.nombre)}</h4><p>${fmt(l.texto)}</p>`)));
    return caja;
  }
  if (p.tipo === 'cifra') {
    const destacados = p.destacados ?? p.puntos;
    const puntos = Array.from({ length: p.puntos || 0 }, (_, i) => `<i style="--i:${i}"${i >= destacados ? ' class="lc-tenue"' : ''}></i>`).join('');
    return el('div', 'lc-cifra',
      `<div class="lc-cifra-num">${escapar(p.numero)}</div><div><div class="lc-cifra-leyenda">${fmt(p.leyenda)}</div>${puntos ? `<div class="lc-cifra-puntos" aria-hidden="true">${puntos}</div>` : ''}${p.nota ? `<div class="lc-cifra-nota">${fmt(p.nota)}</div>` : ''}</div>`);
  }
  if (p.tipo === 'cita') {
    return el('figure', 'lc-cita', `<blockquote>${parrafos(p.texto)}</blockquote>${p.fuente ? `<figcaption>${fmt(p.fuente)}</figcaption>` : ''}`);
  }
  if (p.tipo === 'linea_tiempo') {
    const caja = el('div', 'lc-tarjeta');
    if (p.titulo) caja.appendChild(el('h3', '', fmt(p.titulo)));
    caja.appendChild(el('ol', 'lc-tiempo', p.hitos.map(h =>
      `<li data-tipo="${escapar(h.tipo || '')}"><span class="lc-tiempo-anio">${escapar(h.anio)}</span><div class="lc-tiempo-cuerpo"><b>${fmt(h.titulo)}</b>${h.texto ? `<span>${fmt(h.texto)}</span>` : ''}</div></li>`).join('')));
    if (p.leyenda) {
      caja.appendChild(el('div', 'lc-tiempo-leyenda',
        Object.entries(p.leyenda).map(([tipo, txt]) => `<span style="--c:${tipo === 'conflicto' ? '#d9480f' : 'var(--lc-azul)'}">${escapar(txt)}</span>`).join('')));
    }
    return caja;
  }
  console.warn(`Presentación desconocida: ${p.tipo}`);
  return null;
}

function notaConIcono(clase, icono, rotulo, html) {
  return el('div', `lc-nota ${clase}`, `<span class="lc-nota-icono" aria-hidden="true">${icono}</span><div><div class="lc-rotulo">${rotulo}</div>${html}</div>`);
}

function renderizarCapsulas(clase, destino, opciones) {
  const frases = { ...FRASES_LUMAI, ...(clase.lumai || {}) };
  const imagenes = Object.fromEntries((clase.imagenes || []).map(d => [d.id, d]));
  const rotulos = ROTULOS[temaDe(clase)] || ROTULOS.general;
  const aj = { ...(opciones.ajustes || {}) };
  ajustesVoz = aj;
  // Con 'esenciales' quedan solo las cápsulas marcadas como esenciales (nunca menos de 2)
  let capsulas = clase.capsulas;
  if (aj.capsulas === 'esenciales') {
    const esenciales = capsulas.filter(c => c.esencial !== false);
    if (esenciales.length >= 2) capsulas = esenciales;
  }
  const idDe = (c, k) => c.id || `c${k + 1}`;
  const ctx = {
    id: clase.id, imagenes, opciones, rotulos, ajustes: aj,
    titulos: Object.fromEntries(capsulas.map((c, k) => [idDe(c, k), c.titulo])),
    ideas: Object.fromEntries(capsulas.map((c, k) => [idDe(c, k), String(c.idea_clave || '').replace(/\*+/g, '')]))
  };
  const conAsistente = opciones.asistente === true;
  const raiz = el('article', 'lc-clase lc-modo-capsulas');
  if (aj.calmo) raiz.classList.add('lc-calmo');
  if (aj.botones_grandes) raiz.classList.add('lc-grandes');
  if (aj.mayusculas) raiz.classList.add('lc-mayus');
  if (aj.letra) raiz.classList.add(`lc-letra-${Math.min(aj.letra, 2)}`);
  raiz.setAttribute('data-clase', clase.id || '');
  raiz.setAttribute('data-tema', temaDe(clase));
  cargarFuentes(temaDe(clase));

  // Asistente de LumAI (apagado por defecto: opciones.asistente = true lo muestra)
  const preguntar = (detalle) => {
    const datos = { clase: clase.id, materia: clase.materia, ...detalle };
    registrar('clase_pregunta_asistente', { clase: clase.id, capsula: datos.capsula || null });
    raiz.dispatchEvent(new CustomEvent('lumai:preguntar', { bubbles: true, composed: true, detail: datos }));
    if (typeof opciones.alPreguntar === 'function') opciones.alPreguntar(datos);
  };
  const botonPreguntar = (etiqueta, detalle) => {
    const b = el('button', 'lc-btn-preguntar', etiqueta);
    b.type = 'button';
    b.addEventListener('click', () => preguntar(detalle));
    return b;
  };

  const bloque = (nodo) => { const b = el('div', 'lc-bloque'); b.appendChild(nodo); return b; };
  const ponerImagen = (id, dest) => {
    const d = imagenes[id]; if (!d) return;
    const nodo = crearImagen(d, opciones); if (nodo) dest.appendChild(bloque(nodo));
  };
  const ponerInteractivo = (d, dest) => {
    const fabrica = INTERACTIVOS[d.tipo];
    if (!fabrica) { console.warn(`Interactivo desconocido: ${d.tipo}`); return; }
    dest.appendChild(bloque(fabrica(d, ctx)));
  };

  // Palabras del vocabulario que se pueden tocar dentro del texto
  const activarTerminos = (caja, capId) => {
    caja.querySelectorAll('strong').forEach(s => {
      const v = buscarTermino(s.textContent, clase.vocabulario);
      if (!v) return;
      const b = el('button', 'lc-termino', s.innerHTML);
      b.type = 'button';
      b.setAttribute('aria-expanded', 'false');
      b.title = 'Tocá para ver qué significa';
      s.replaceWith(b);
      b.addEventListener('click', () => {
        const parrafo = b.closest('p') || caja;
        const abierta = parrafo.nextElementSibling;
        const yaEstaba = abierta?.classList.contains('lc-def') && abierta.dataset.palabra === v.palabra;
        caja.querySelectorAll('.lc-def').forEach(d => d.remove());
        caja.querySelectorAll('.lc-termino').forEach(x => x.setAttribute('aria-expanded', 'false'));
        if (yaEstaba) return;
        const def = el('div', 'lc-def', `<span><b>${escapar(v.palabra)}:</b> ${fmt(v.definicion)}</span>`);
        def.dataset.palabra = v.palabra;
        def.setAttribute('role', 'note');
        if (conAsistente) {
          def.appendChild(botonPreguntar('💬 Preguntale a LumAI', { capsula: capId, pregunta: `¿Qué significa "${v.palabra}"? Explicámelo con otro ejemplo.`, contexto: v.definicion }));
        }
        parrafo.after(def);
        b.setAttribute('aria-expanded', 'true');
        registrar('clase_termino', { clase: ctx.id, capsula: capId, palabra: v.palabra });
      });
    });
  };

  const totalMin = capsulas.reduce((s, c) => s + (c.minutos || 2), 0);
  const conChequeo = capsulas.filter(c => c.chequeo).length;
  const pantallas = [];
  let aciertos = 0;

  // Encabezado: eje, título y recorrido
  const cab = el('div', 'lc-cap-cab');
  if (opciones.mostrarTitulo !== false) {
    if (clase.eje) cab.appendChild(el('div', 'lc-eje', escapar(clase.eje)));
    cab.appendChild(el('h2', 'lc-titulo', fmt(clase.titulo)));
  }
  const stepper = el('ol', 'lc-stepper');
  stepper.setAttribute('aria-label', 'Recorrido de la clase');
  cab.appendChild(stepper);
  raiz.appendChild(cab);

  // Portada
  const portada = el('section', 'lc-cap');
  portada.appendChild(crearLumai(frases.saludo, 'saludo', opciones));
  if (clase.gancho?.texto) {
    const g = el('div', 'lc-gancho');
    g.appendChild(el('div', 'lc-rotulo', escapar(clase.gancho.rotulo || 'Para arrancar')));
    g.appendChild(el('p', 'lc-gancho-texto', fmt(clase.gancho.texto)));
    if (clase.gancho.pregunta) g.appendChild(el('p', 'lc-gancho-texto', `<b>${fmt(clase.gancho.pregunta)}</b>`));
    portada.appendChild(g);
  }
  (clase.imagenes || []).filter(d => d.ubicacion === 'inicio').forEach(d => ponerImagen(d.id, portada));
  if (clase.mision?.texto) portada.appendChild(notaConIcono('lc-mision', rotulos.iconoMision, escapar(rotulos.mision), `<p>${fmt(clase.mision.texto)}</p>`));
  const agenda = el('div', 'lc-tarjeta');
  agenda.appendChild(el('h3', '', aj.sin_tiempos ? escapar(rotulos.recorrido) : `${escapar(rotulos.recorrido)} · unos ${totalMin} minutos`));
  agenda.appendChild(el('ol', 'lc-agenda', capsulas.map(c => `<li><span>${fmt(c.titulo)}</span>${aj.sin_tiempos ? '' : `<small>${c.minutos || 2} min</small>`}</li>`).join('')));
  portada.appendChild(agenda);
  if (clase.vocabulario?.length) {
    portada.appendChild(el('p', 'lc-tip', '💡 Las palabras <span class="lc-termino" style="cursor:default">subrayadas así</span> se pueden tocar para ver qué significan. Si algo no se entiende, cada actividad tiene ayuda.'));
  }
  pantallas.push({ nodo: portada, tipo: 'portada', lista: true, paso: '▶' });

  // Cápsulas
  capsulas.forEach((c, k) => {
    const capId = idDe(c, k);
    const s = el('section', 'lc-cap');
    s.setAttribute('data-capsula', capId);
    if (aj.pausa_cada && k > 0 && k % aj.pausa_cada === 0) {
      s.appendChild(el('div', 'lc-pausa', '<p>☕ <b>Momento de pausa.</b> Estirate, respirá hondo y seguí cuando quieras.</p>'));
    }
    if (c.lumai) s.appendChild(crearLumai(c.lumai, c.pose || 'saludo', opciones));
    const intro = el('div', 'lc-cap-intro');
    intro.appendChild(el('div', 'lc-eyebrow', `${escapar(rotulos.capsula)} ${k + 1} de ${capsulas.length}${aj.sin_tiempos ? '' : ` · ${c.minutos || 2} min`}`));
    const h = el('h3', 'lc-cap-titulo', fmt(c.titulo));
    h.tabIndex = -1;
    intro.appendChild(h);
    s.appendChild(intro);
    if (aj.anticipar) {
      const despues = capsulas[k + 1] ? `Después viene «${capsulas[k + 1].titulo}».` : 'Después viene el cierre de la clase.';
      s.appendChild(el('p', 'lc-anticipa', `📍 Estás en la parte ${k + 1} de ${capsulas.length}. ${c.interactivo ? 'Primero leés, después hay una actividad y al final una pregunta.' : 'Primero leés y al final hay una pregunta.'} ${despues}`));
    }
    if (aj.recordar_acumulado && k > 0) {
      const previas = capsulas.slice(0, k).filter(x => x.idea_clave).map(x => `<li>${fmt(x.idea_clave)}</li>`).join('');
      if (previas) s.appendChild(notaConIcono('lc-acumulado', '🧠', 'Hasta ahora aprendiste', `<ul>${previas}</ul>`));
    }
    // Texto según el perfil: completo, completo con la versión fácil abierta, o versión fácil primero
    const usarSimple = aj.texto === 'simple' && c.texto_simple;
    let textoParaVoz = usarSimple ? c.texto_simple : c.texto;
    if (usarSimple) {
      s.appendChild(el('div', 'lc-cap-texto', parrafos(c.texto_simple)));
      const completo = crearDesplegable('📖 Leer la explicación completa', parrafos(c.texto),
        { alAbrir: () => registrar('clase_texto_completo', { clase: ctx.id, capsula: capId }) });
      activarTerminos(completo.querySelector('.lc-panel'), capId);
      s.appendChild(completo);
    } else if (c.texto) {
      const texto = el('div', 'lc-cap-texto', parrafos(c.texto));
      activarTerminos(texto, capId);
      s.appendChild(texto);
    }
    if (aj.definiciones_abiertas) {
      const vistas = new Set();
      const defs = [...String(c.texto || '').matchAll(/\*\*(.+?)\*\*/g)]
        .map(m => buscarTermino(m[1], clase.vocabulario))
        .filter(v => v && !vistas.has(v.palabra) && vistas.add(v.palabra));
      if (defs.length) s.appendChild(el('div', 'lc-defs', `<b>📚 Palabras de esta parte</b><ul>${defs.map(v => `<li><b>${escapar(v.palabra)}:</b> ${fmt(v.definicion)}</li>`).join('')}</ul>`));
    }
    let leer = null;
    if (aj.voz >= 1) {
      const fila = el('div', 'lc-escuchar-fila');
      const bVoz = el('button', 'lc-btn lc-sec lc-btn-chico', '🔊 Escuchar');
      bVoz.type = 'button';
      // La voz lee siempre la explicación completa (aunque en pantalla se muestre primero la versión fácil)
      const paraLeer = [c.titulo, c.texto || textoParaVoz, c.idea_clave].filter(Boolean).join('. ').replace(/\*+/g, '').replace(/\n+/g, ' ');
      leer = () => leerEnVoz(paraLeer, bVoz);
      bVoz.addEventListener('click', () => { leer(); registrar('clase_escuchar', { clase: ctx.id, capsula: capId }); });
      if (!('speechSynthesis' in window)) bVoz.disabled = true;
      fila.appendChild(bVoz);
      intro.appendChild(fila);
    }
    if (c.presentacion) { const pr = crearPresentacion(c.presentacion); if (pr) s.appendChild(pr); }
    if (c.imagen) ponerImagen(c.imagen, s);
    if (c.ejemplo?.texto && c.ejemplo.mostrar !== false) {
      const ej = el('div', 'lc-tarjeta lc-ejemplo', `<h3>🔎 Un ejemplo real</h3>${parrafos(c.ejemplo.texto)}`);
      activarTerminos(ej, capId);
      s.appendChild(ej);
    }
    if (c.interactivo) ponerInteractivo(c.interactivo, s);
    if (c.mi_lugar) s.appendChild(crearMiLugar(c.mi_lugar, ctx, capId));
    if (c.idea_clave) s.appendChild(notaConIcono('lc-cap-clave', rotulos.iconoRecordar, escapar(rotulos.recordar), `<p>${fmt(c.idea_clave)}</p>`));

    if (aj.mas_alla && k === capsulas.length - 1 && clase.para_ir_mas_alla?.pregunta) {
      const mas = clase.para_ir_mas_alla;
      s.appendChild(el('div', 'lc-tarjeta lc-mas-alla', `<h3>🚀 Desafío para ir más allá</h3><p>${fmt(mas.pregunta)}</p>${mas.conexion ? `<p><b>🔗 Conexión:</b> ${fmt(mas.conexion)}</p>` : ''}`));
    }

    // Ayuda para seguir sin docente (si el texto principal ya es el fácil, no hace falta)
    if ((c.texto_simple && !usarSimple) || conAsistente) {
      const ayuda = crearDesplegable(aj.texto === 'con_simple' ? '🙋 Más fácil' : '🙋 ¿Te trabaste? Leelo más fácil',
        c.texto_simple ? `<p>${fmt(c.texto_simple)}</p>` : '',
        { abierto: aj.texto === 'con_simple', claseExtra: 'lc-ayuda', alAbrir: () => registrar('clase_ayuda', { clase: ctx.id, capsula: capId, titulo: c.titulo }) });
      if (conAsistente) {
        const contexto = String(c.texto || '').replace(/\*+/g, '');
        const acciones = el('div', 'lc-ayuda-acciones');
        acciones.append(
          botonPreguntar('💬 Preguntale a LumAI', { capsula: capId, pregunta: null, contexto }),
          botonPreguntar('🔁 Pedile otro ejemplo', { capsula: capId, pregunta: `Dame otro ejemplo sobre: ${c.titulo}`, contexto })
        );
        ayuda.querySelector('.lc-panel').appendChild(acciones);
      }
      s.appendChild(ayuda);
    }

    const pantalla = { nodo: s, tipo: 'capsula', id: capId, numero: k + 1, titulo: c.titulo, intentos: 0, lista: !c.chequeo, paso: String(k + 1), leer };
    if (c.chequeo) {
      s.appendChild(crearChequeo(c.chequeo, ctx, capId, (primera, intentos) => {
        pantalla.intentos = intentos;
        if (primera) aciertos += 1;
        pantalla.lista = true;
        actualizarNav();
      }));
    }
    pantallas.push(pantalla);
  });

  // Mi carpeta: el alumno deja por escrito lo que aprendió (se adapta al perfil)
  if (opciones.carpeta !== false && capsulas.some(c => c.idea_clave)) {
    const sc = el('section', 'lc-cap');
    sc.appendChild(crearLumai('Ahora armá tu carpeta: lo que escribas te queda para estudiar, aunque no estés con LumAI.', 'idea', opciones));
    const h = el('h3', 'lc-cap-titulo', '📒 Mi carpeta');
    h.tabIndex = -1;
    sc.appendChild(h);
    const carpeta = crearMiCarpeta(clase, { ajustes: aj, dimensiones: opciones.dimensiones || null, nombreAlumno: (opciones.nombreAlumno || '').trim(), registrar });
    sc.appendChild(carpeta.nodo);
    pantallas.push({ nodo: sc, tipo: 'carpeta', lista: true, paso: '📒', leer: null });
  }

  // Cierre
  const cierre = el('section', 'lc-cap');
  cierre.appendChild(crearLumai(frases.cierre, 'idea', opciones));
  const cabCierre = el('div', 'lc-logro-cab', '<span class="lc-logro-icono" aria-hidden="true">🏁</span>');
  const hCierre = el('h3', 'lc-cap-titulo', '¡Misión cumplida!');
  hCierre.tabIndex = -1;
  cabCierre.appendChild(hCierre);
  const puntaje = el('span', 'lc-puntaje');
  if (conChequeo && !aj.sin_puntaje) cabCierre.appendChild(puntaje);
  cierre.appendChild(cabCierre);
  if (clase.mision?.resuelta) cierre.appendChild(notaConIcono('lc-mision', rotulos.iconoMision, escapar(rotulos.resuelta), `<p>${fmt(clase.mision.resuelta)}</p>`));
  const ideas = capsulas.filter(c => c.idea_clave);
  if (ideas.length) {
    const t = el('div', 'lc-tarjeta', `<h3>${escapar(rotulos.resumen)}</h3>`);
    t.appendChild(el('ol', 'lc-resumen', ideas.map(c => `<li>${fmt(c.idea_clave)}</li>`).join('')));
    cierre.appendChild(t);
  }

  // Autoevaluación: el alumno decide qué repasar
  const autoeval = el('div', 'lc-tarjeta lc-autoeval', '<h3>🪞 ¿Cómo te fue con esta clase?</h3>');
  const chips = el('div', 'lc-chips');
  const respuesta = el('div', 'lc-autoeval-resp');
  respuesta.setAttribute('aria-live', 'polite');
  const masDificil = () => pantallas.filter(p => p.tipo === 'capsula' && p.intentos > 1).sort((a, b) => b.intentos - a.intentos)[0];
  const botonVolver = (p) => {
    const b = el('button', 'lc-btn lc-sec lc-btn-chico', `↩ Volver a "${fmt(p.titulo)}"`);
    b.type = 'button';
    b.addEventListener('click', () => mostrar(pantallas.indexOf(p)));
    return b;
  };
  [['entendi', '😊 Lo entendí'], ['mas_o_menos', '😐 Más o menos'], ['me_costo', '😟 Me costó']].forEach(([valor, etiqueta]) => {
    const b = el('button', 'lc-chip', etiqueta);
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      chips.querySelectorAll('.lc-chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      registrar('clase_autoevaluacion', { clase: ctx.id, respuesta: valor, aciertos, preguntas: conChequeo });
      respuesta.innerHTML = '';
      const dificil = masDificil();
      if (valor === 'entendi') {
        respuesta.appendChild(el('p', '', '¡Genial! Ya estás listo para las actividades. Si querés, antes repasá las palabras clave.'));
      } else if (valor === 'mas_o_menos') {
        respuesta.appendChild(el('p', '', `Está muy bien darse cuenta. Repasá las palabras clave de abajo${dificil ? ' y volvé a la actividad donde más dudaste.' : '.'}`));
        if (dificil) respuesta.appendChild(botonVolver(dificil));
      } else {
        respuesta.appendChild(el('p', '', 'Gracias por decirlo: así se aprende. Volvé a mirar la actividad con calma y abrí "¿Te trabaste?" para leerla más fácil.'));
        respuesta.appendChild(botonVolver(dificil || pantallas[1]));
        if (conAsistente) respuesta.appendChild(botonPreguntar('💬 Preguntale a LumAI', { capsula: null, pregunta: `Me costó entender la clase "${clase.titulo}". ¿Me la explicás de otra forma?`, contexto: clase.idea_central || '' }));
      }
    });
    chips.appendChild(b);
  });
  autoeval.append(chips, respuesta);
  cierre.appendChild(autoeval);
  (clase.interactivos || []).filter(d => (d.ubicacion || 'final') === 'final').forEach(d => ponerInteractivo(d, cierre));
  const repaso = el('div', 'lc-repaso');
  if (clase.vocabulario?.length) {
    const d = crearDesplegable('📚 Repasar las palabras clave', '', { alAbrir: () => registrar('clase_repaso', { clase: ctx.id, parte: 'vocabulario' }) });
    d.querySelector('.lc-panel').appendChild(crearVocabulario(clase.vocabulario, ctx));
    repaso.appendChild(d);
  }
  if (clase.errores_frecuentes?.length) {
    repaso.appendChild(crearDesplegable('⚠️ Cuidado con estas trampas',
      clase.errores_frecuentes.map(e => `<p>❌ "${fmt(e.error)}"<br>✅ ${fmt(e.aclaracion)}</p>`).join(''),
      { alAbrir: () => registrar('clase_repaso', { clase: ctx.id, parte: 'errores' }) }));
  }
  if (clase.para_ir_mas_alla?.pregunta) {
    const mas = clase.para_ir_mas_alla;
    repaso.appendChild(crearDesplegable('🚀 Para ir más allá',
      `<p>${fmt(mas.pregunta)}</p>${mas.conexion ? `<p><b>🔗 Conexión:</b> ${fmt(mas.conexion)}</p>` : ''}`,
      { alAbrir: () => registrar('clase_repaso', { clase: ctx.id, parte: 'mas_alla' }) }));
  }
  if (repaso.children.length) {
    const r = el('div', 'lc-cap-intro');
    r.append(el('div', 'lc-eyebrow', 'Si querés, repasá'), repaso);
    cierre.appendChild(r);
  }
  pantallas.push({ nodo: cierre, tipo: 'cierre', lista: true, paso: '★' });

  // Recorrido y navegación
  stepper.innerHTML = pantallas.map((p, i) => {
    const nombre = p.tipo === 'portada' ? 'Inicio' : (p.tipo === 'cierre' ? 'Cierre' : (p.tipo === 'carpeta' ? 'Mi carpeta' : `${rotulos.capsula} ${p.numero}`));
    return `<li><span class="lc-paso" title="${nombre}" aria-label="${nombre}" data-paso="${p.paso}">${p.paso}</span></li>`;
  }).join('');
  const cuerpo = el('div', 'lc-cap-cuerpo');
  pantallas.forEach(p => { p.nodo.hidden = true; cuerpo.appendChild(p.nodo); });
  raiz.appendChild(cuerpo);
  const nav = el('div', 'lc-cap-nav');
  const atras = el('button', 'lc-btn lc-sec', '← Volver'); atras.type = 'button';
  const aviso = el('span', 'lc-cap-aviso');
  aviso.setAttribute('aria-live', 'polite');
  const siguiente = el('button', 'lc-btn', 'Siguiente →'); siguiente.type = 'button';
  nav.append(atras, aviso, siguiente);
  raiz.appendChild(nav);

  let actual = 0;
  let desde = Date.now();
  let completada = false;

  function actualizarNav() {
    const p = pantallas[actual];
    const ultima = actual === pantallas.length - 1;
    atras.style.visibility = actual === 0 ? 'hidden' : 'visible';
    siguiente.hidden = ultima;
    siguiente.disabled = !p.lista;
    siguiente.textContent = actual === 0 ? 'Empezar →' : (actual === pantallas.length - 2 ? 'Terminar →' : 'Siguiente →');
    aviso.textContent = p.lista ? '' : 'Respondé la pregunta para seguir';
    [...stepper.children].forEach((li, i) => {
      li.className = i < actual ? 'lc-hecho' : (i === actual ? 'lc-actual' : '');
      li.firstChild.textContent = i < actual ? '✓' : pantallas[i].paso;
      li.firstChild.dataset.paso = li.firstChild.textContent;
      if (i === actual) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }

  function mostrar(i, mover = true) {
    const anterior = pantallas[actual];
    if (mover && anterior.tipo === 'capsula') {
      registrar('clase_capsula_tiempo', { clase: ctx.id, capsula: anterior.id, titulo: anterior.titulo, segundos: Math.round((Date.now() - desde) / 1000) });
    }
    try { if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel(); } catch (e) { /* sin voz */ }
    pantallas.forEach((p, k) => { p.nodo.hidden = k !== i; });
    actual = i;
    desde = Date.now();
    const p = pantallas[i];
    if (p.tipo === 'capsula') registrar('clase_capsula_vista', { clase: ctx.id, capsula: p.id, numero: p.numero });
    raiz.dispatchEvent(new CustomEvent('lumai:capsula', { bubbles: true, composed: true, detail: p.tipo === 'capsula' ? { id: p.id, numero: p.numero, titulo: p.titulo } : null }));
    if (mover && p.tipo === 'capsula' && aj.voz >= 2 && p.leer) setTimeout(p.leer, 300);
    if (p.tipo === 'cierre') {
      puntaje.textContent = `⭐ ${aciertos} de ${conChequeo} preguntas bien a la primera`;
      if (!completada) { completada = true; registrar('clase_completada', { clase: ctx.id, aciertos, preguntas: conChequeo }); }
    }
    actualizarNav();
    if (mover) {
      if (raiz.getBoundingClientRect().top < 0) raiz.scrollIntoView({ block: 'start', behavior: 'smooth' });
      const titulo = p.nodo.querySelector('.lc-cap-titulo');
      if (titulo) titulo.focus({ preventScroll: true });
    }
  }

  atras.addEventListener('click', () => { if (actual > 0) mostrar(actual - 1); });
  siguiente.addEventListener('click', () => { if (pantallas[actual].lista && actual < pantallas.length - 1) mostrar(actual + 1); });

  destino.appendChild(raiz);
  mostrar(Math.min(opciones.capsulaInicial || 0, pantallas.length - 1), false);
  registrar('clase_mostrada', { clase: ctx.id, titulo: clase.titulo, materia: clase.materia, formato: 'capsulas', capsulas: capsulas.length, preguntas: conChequeo });
  const activos = Object.keys(aj).filter(k => k !== 'motivos' && aj[k] && aj[k] !== 'todas' && aj[k] !== 'completo' && !(k === 'opciones' && aj[k] === 3));
  if (activos.length) {
    // Solo se registra QUÉ se adaptó, no las dimensiones del alumno: el reporte guarda
    // el nombre, y el perfil no debe quedar junto a él.
    registrar('clase_adaptada', {
      clase: ctx.id,
      perillas: Object.fromEntries(activos.map(k => [k, aj[k]])),
      capsulas_base: clase.capsulas.length
    });
  }
  return raiz;
}

// Crea un contenedor aislado (Shadow DOM) para que los estilos de LumAI
// (por ejemplo "#contenido * { font-size: 115% }") no deformen la clase.
const TEMAS_POR_MATERIA = [['geograf', 'geografia'], ['matem', 'matematica'], ['lengua', 'lengua'], ['literat', 'lengua'], ['biolog', 'biologia']];
function temaDe(clase) {
  if (clase.tema) return clase.tema;
  const m = normalizar(clase.materia);
  return (TEMAS_POR_MATERIA.find(([clave]) => m.includes(clave)) || [null, 'general'])[1];
}

// Tipografía de títulos de Lengua (se carga una sola vez en la página)
const FUENTES_POR_TEMA = {
  lengua: 'Lora:ital,wght@0,600;0,700;1,600',
  matematica: 'JetBrains+Mono:wght@500;700',
  biologia: 'Nunito:wght@700;800',
  geografia: 'JetBrains+Mono:wght@500;700'
};
function cargarFuentes(tema) {
  const familia = FUENTES_POR_TEMA[tema];
  if (!familia || document.querySelector(`link[data-lc-fuente="${tema}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${familia}&display=swap`;
  link.setAttribute('data-lc-fuente', tema);
  document.head.appendChild(link);
}

function montar(contenedor) {
  contenedor.innerHTML = '';
  const host = el('div', 'lc-host');
  contenedor.appendChild(host);
  if (host.attachShadow) {
    const sombra = host.attachShadow({ mode: 'open' });
    const estilo = document.createElement('style');
    estilo.textContent = ESTILOS + ESTILOS_CARPETA;
    sombra.appendChild(estilo);
    return sombra;
  }
  inyectarEstilos();
  return host;
}

export function renderizarClase(clase, contenedor, opciones = {}) {
  if (!clase || !contenedor) throw new Error('renderizarClase necesita una clase y un contenedor');
  const destino = montar(contenedor);
  if (clase.formato === 'capsulas' && clase.capsulas?.length) return renderizarCapsulas(clase, destino, opciones);
  const frases = { ...FRASES_LUMAI, ...(clase.lumai || {}) };
  const ctx = { id: clase.id, imagenes: Object.fromEntries((clase.imagenes || []).map(d => [d.id, d])), opciones };
  const raiz = el('article', 'lc-clase');
  raiz.setAttribute('data-clase', clase.id || '');
  raiz.setAttribute('data-tema', temaDe(clase));
  cargarFuentes(temaDe(clase));

  // Interactivos agrupados por ubicación
  const porUbicacion = {};
  (clase.imagenes || []).forEach(d => {
    const clave = d.ubicacion || 'final';
    (porUbicacion[clave] = porUbicacion[clave] || []).push({ ...d, tipo: '__imagen' });
  });
  (clase.interactivos || []).forEach(d => {
    const clave = d.ubicacion || 'final';
    (porUbicacion[clave] = porUbicacion[clave] || []).push(d);
  });
  const ponerInteractivos = (clave, destino) => {
    (porUbicacion[clave] || []).forEach(d => {
      if (d.tipo === '__imagen') {
        const nodo = crearImagen(d, opciones);
        if (nodo) { const b = el('div', 'lc-bloque'); b.appendChild(nodo); destino.appendChild(b); }
        return;
      }
      const fabrica = INTERACTIVOS[d.tipo];
      if (!fabrica) { console.warn(`Interactivo desconocido: ${d.tipo}`); return; }
      const b = el('div', 'lc-bloque'); b.appendChild(fabrica(d, ctx)); destino.appendChild(b);
    });
  };

  // Encabezado
  if (opciones.mostrarTitulo !== false) {
    const cab = el('div', 'lc-bloque');
    if (clase.eje) cab.appendChild(el('div', 'lc-eje', escapar(clase.eje)));
    cab.appendChild(el('h2', 'lc-titulo', fmt(clase.titulo)));
    raiz.appendChild(cab);
  }

  // LumAI saluda
  raiz.appendChild(crearLumai(frases.saludo, 'saludo', opciones));

  // Gancho
  if (clase.gancho) {
    const g = el('div', 'lc-bloque lc-gancho');
    g.appendChild(el('div', 'lc-rotulo', escapar(clase.gancho.rotulo || 'Para arrancar')));
    g.appendChild(el('p', 'lc-gancho-texto', fmt(clase.gancho.texto)));
    if (clase.gancho.pregunta) {
      g.appendChild(el('p', '', `<b>${fmt(clase.gancho.pregunta)}</b>`));
      if (clase.gancho.respuesta) g.appendChild(crearDesplegable('Ver qué pasa', `<p>${fmt(clase.gancho.respuesta)}</p>`));
    }
    raiz.appendChild(g);
  }
  ponerInteractivos('inicio', raiz);

  // Idea central
  if (clase.idea_central) {
    const b = el('div', 'lc-bloque');
    b.appendChild(crearLumai(frases.idea, 'idea', opciones));
    b.appendChild(el('div', 'lc-rotulo', '💡 La idea en una frase'));
    b.appendChild(el('div', 'lc-idea-central', fmt(clase.idea_central)));
    raiz.appendChild(b);
  }

  // Ideas clave + interactivos intercalados
  if (clase.ideas_clave?.length) {
    const b = el('div', 'lc-bloque');
    b.appendChild(crearLumai(frases.pasos, 'saludo', opciones));
    b.appendChild(el('div', 'lc-rotulo', '🧩 Paso a paso'));
    const lista = el('div', 'lc-ideas');
    clase.ideas_clave.forEach((idea, k) => {
      lista.appendChild(crearDesplegable(
        `<span class="lc-izq"><span class="lc-numero">${k + 1}</span>${fmt(idea.titulo)}</span>`,
        `<p>${fmt(idea.texto)}</p>`,
        { abierto: k === 0, alAbrir: () => registrar('clase_idea_abierta', { clase: ctx.id, idea: k + 1 }) }
      ));
      ponerInteractivos(`idea:${k + 1}`, lista);
    });
    b.appendChild(lista);
    raiz.appendChild(b);
  }

  // Ejemplo
  if (clase.ejemplo?.texto) {
    const b = el('div', 'lc-bloque');
    const t = el('div', 'lc-tarjeta lc-ejemplo', `<h3>🔎 Un ejemplo de todos los días</h3><p>${fmt(clase.ejemplo.texto)}</p>`);
    b.appendChild(t); raiz.appendChild(b);
  }

  ponerInteractivos('final', raiz);

  // Errores frecuentes
  if (clase.errores_frecuentes?.length) {
    const b = el('div', 'lc-bloque');
    const t = el('div', 'lc-tarjeta lc-error', '<h3>⚠️ Cuidado con estas trampas</h3>');
    clase.errores_frecuentes.forEach((e, k) => {
      if (k) t.appendChild(el('div', '', '<div style="height:8px"></div>'));
      t.appendChild(crearDesplegable(`❌ "${fmt(e.error)}"`, `<p>✅ ${fmt(e.aclaracion)}</p>`));
    });
    b.appendChild(t); raiz.appendChild(b);
  }

  // Vocabulario (tarjetas que se dan vuelta)
  if (clase.vocabulario?.length) {
    const b = el('div', 'lc-bloque');
    b.appendChild(el('div', 'lc-rotulo', '📚 Palabras clave (tocá cada tarjeta)'));
    b.appendChild(crearVocabulario(clase.vocabulario, ctx)); raiz.appendChild(b);
  }

  // Para ir más allá
  if (clase.para_ir_mas_alla?.pregunta) {
    const b = el('div', 'lc-bloque');
    const t = el('div', 'lc-tarjeta lc-mas-alla', `<h3>🚀 Para ir más allá</h3><p>${fmt(clase.para_ir_mas_alla.pregunta)}</p>`);
    if (clase.para_ir_mas_alla.conexion) {
      t.appendChild(crearDesplegable('🔗 Conexión con otra materia', `<p>${fmt(clase.para_ir_mas_alla.conexion)}</p>`));
    }
    b.appendChild(t); raiz.appendChild(b);
  }

  // LumAI despide la clase
  raiz.appendChild(crearLumai(frases.cierre, 'saludo', opciones));

  destino.appendChild(raiz);
  registrar('clase_mostrada', { clase: ctx.id, materia: clase.materia });
  return raiz;
}

// Texto plano de la clase completa (útil para el prompt de adaptación y la lectura en voz alta)
export function claseATexto(clase) {
  const partes = [clase.titulo, clase.gancho?.texto, clase.gancho?.pregunta, clase.mision?.texto, clase.idea_central];
  (clase.ideas_clave || []).forEach(i => partes.push(`${i.titulo}. ${i.texto}`));
  (clase.capsulas || []).forEach(c => partes.push(`${c.titulo}. ${c.texto}`, c.ejemplo?.texto, c.idea_clave));
  if (clase.ejemplo?.texto) partes.push(clase.ejemplo.texto);
  if (clase.mision?.resuelta) partes.push(clase.mision.resuelta);
  return partes.filter(Boolean).join('\n\n').replace(/\*\*/g, '');
}
