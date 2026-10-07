// ai-engine.js - Motor de IA con límites flexibles y procesador de emojis
// ✅ CORRECCIÓN V6: Preservación de saltos de línea en limpiarHTML
// 1. Mejor detección de saltos de línea con emojis
// 2. Reconstrucción directa con <br> sin conversión intermedia
// 3. ✅ NUEVO: Preservar saltos de línea durante limpieza HTML

import { 
  estadoGlobal, 
  datosSession, 
  perfiles, 
  configuracion,
  parametrosCognitivosBase,
  obtenerNombreAlumno
} from './config.js';

import { SimpleEmojiProcessor } from './simple-emoji-processor.js';

// ============================================================================
// 🔑 CONFIGURACIÓN DE API (V91)
// - El modelo se cambia SOLO en esta línea
// - La clave NO está en el código: se pide una vez y queda guardada en el navegador
// ============================================================================
// gemini-3.1-flash-lite: estable, rápido y económico; Google lo recomienda para tareas
// de alto volumen como las de LumAI (piensa al mínimo por defecto).
// Si alguna vez se necesita más razonamiento, se puede probar "gemini-3.5-flash".
const MODELO_GEMINI = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent`;
const CLAVE_STORAGE_API = "lumai_gemini_api_key";

// Los modelos 3.x "piensan" antes de responder y ese pensamiento consume tokens de salida.
// Con un piso alto evitamos respuestas cortadas o vacías (es un techo, no un gasto fijo).
const MIN_TOKENS_SALIDA = 8192;

function leerClaveGuardada() {
  try { return localStorage.getItem(CLAVE_STORAGE_API) || ""; } catch (e) { return ""; }
}

function guardarClave(clave) {
  try { localStorage.setItem(CLAVE_STORAGE_API, clave); } catch (e) { /* sin almacenamiento */ }
}

export function borrarClaveAPI() {
  try { localStorage.removeItem(CLAVE_STORAGE_API); } catch (e) { /* nada */ }
}

let pedidoDeClaveEnCurso = null;

// Muestra una ventanita para que el docente pegue la clave (una sola vez por computadora)
function pedirClaveAlDocente(mensajeError = "") {
  if (pedidoDeClaveEnCurso) return pedidoDeClaveEnCurso;

  pedidoDeClaveEnCurso = new Promise((resolve) => {
    const fondo = document.createElement("div");
    fondo.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:inherit;";
    fondo.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.3);text-align:center;color:#333;">
        <div style="font-size:2.5em;">🔑</div>
        <h2 style="margin:10px 0;">Clave de LumAI</h2>
        <p style="margin:0 0 15px;">Esta computadora todavía no tiene la clave de la IA. Pedísela a tu docente.</p>
        ${mensajeError ? `<p style="color:#c0392b;margin:0 0 12px;font-weight:600;">${mensajeError}</p>` : ""}
        <input id="lumai-input-clave" type="password" placeholder="Pegá la clave acá" autocomplete="off"
          style="width:100%;box-sizing:border-box;padding:12px;border:2px solid #ccc;border-radius:10px;font-size:1em;margin-bottom:15px;">
        <button id="lumai-btn-clave" style="background:#4facfe;color:#fff;border:none;padding:12px 30px;border-radius:25px;font-size:1em;font-weight:600;cursor:pointer;">Guardar</button>
      </div>`;
    document.body.appendChild(fondo);

    const input = fondo.querySelector("#lumai-input-clave");
    const boton = fondo.querySelector("#lumai-btn-clave");
    input.focus();

    const confirmar = () => {
      const clave = input.value.trim();
      if (!clave) { input.style.borderColor = "#c0392b"; input.focus(); return; }
      guardarClave(clave);
      fondo.remove();
      pedidoDeClaveEnCurso = null;
      resolve(clave);
    };
    boton.addEventListener("click", confirmar);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") confirmar(); });
  });

  return pedidoDeClaveEnCurso;
}

async function obtenerClaveAPI(mensajeError = "") {
  const guardada = leerClaveGuardada();
  if (guardada && !mensajeError) return guardada;
  return await pedirClaveAlDocente(mensajeError);
}

// ============================================================================
// 🛡️ PROTECCIÓN DEL NOMBRE DEL ALUMNO
// El nombre real nunca viaja a la IA: se reemplaza por una marca antes de enviar
// y se vuelve a poner en la computadora al recibir la respuesta.
// ============================================================================
const MARCA_NOMBRE = "{NOMBRE}";
const MARCA_NOMBRE_MAYUS = "{NOMBRE_MAYUS}";

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nombreProtegible() {
  const nombre = (obtenerNombreAlumno() || "").trim();
  if (nombre.length < 2 || nombre.toLowerCase() === "estudiante") return "";
  return nombre;
}

function ocultarNombre(texto) {
  const nombre = nombreProtegible();
  if (!nombre || typeof texto !== "string") return texto;

  // Solo palabras completas (respeta tildes y ñ)
  const borde = (n) => new RegExp(`(?<![\\p{L}\\p{N}])${escaparRegex(n)}(?![\\p{L}\\p{N}])`, "gu");
  const mayus = nombre.toUpperCase();

  let resultado = texto;
  if (mayus !== nombre) resultado = resultado.replace(borde(mayus), MARCA_NOMBRE_MAYUS);
  resultado = resultado.replace(new RegExp(borde(nombre).source, "giu"), MARCA_NOMBRE);

  if (resultado.includes(MARCA_NOMBRE) || resultado.includes(MARCA_NOMBRE_MAYUS)) {
    resultado += `\n\n(Nota: ${MARCA_NOMBRE} y ${MARCA_NOMBRE_MAYUS} representan el nombre del estudiante. Escribilas exactamente así, sin cambiarlas.)`;
  }
  return resultado;
}

function restaurarNombre(texto) {
  const nombre = nombreProtegible() || obtenerNombreAlumno() || "";
  if (typeof texto !== "string") return texto;
  return texto
    .replace(/\{\s*NOMBRE_MAYUS\s*\}/gi, nombre.toUpperCase())
    .replace(/\{\s*NOMBRE\s*\}/gi, nombre);
}

// ✅ Configuración de tokens optimizada por perfil
const tokensSegunPerfil = {
  'N0': 5000,  // Textos muy cortos (2-4 oraciones)
  'N1': 5500,  // Textos cortos (máximo 30 palabras)
  'N2': 6000,  // Textos medianos (80-120 palabras)
  'N3': 7000   // Textos extensos (150+ palabras)
};

// ============================================================================
// 🔧 FUNCIÓN AUXILIAR: Limpiar HTML PRESERVANDO SALTOS DE LÍNEA
// ============================================================================
/**
 * ✅ V6: CORREGIDO - Ahora preserva los saltos de línea (\n) durante la limpieza
 * 
 * PROBLEMA ANTERIOR: Los saltos de línea se perdían durante la limpieza HTML
 * SOLUCIÓN: Convertir temporalmente \n a un marcador, limpiar HTML, y restaurar \n
 */
function limpiarHTML(texto) {
  if (!texto) return '';
  
  // ✅ PASO 1: Proteger saltos de línea convirtiéndolos a un marcador temporal
  // Esto evita que se pierdan durante el procesamiento
  const MARCADOR_SALTO = '___SALTO_DE_LINEA___';
  
  return texto
    .replace(/\n/g, MARCADOR_SALTO)  // ✅ Proteger saltos de línea PRIMERO
    .replace(/<[^>]*>/g, '')          // Eliminar tags HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(new RegExp(MARCADOR_SALTO, 'g'), '\n')  // ✅ Restaurar saltos de línea AL FINAL
    .trim();
}

// ============================================================================
// 🔧 FUNCIÓN AUXILIAR: Convertir a mayúsculas preservando emojis
// ============================================================================
function convertirAMayusculas(texto) {
  if (!texto) return '';
  
  // Preservar emojis y convertir solo texto
  return texto.replace(/[^\u{1F300}-\u{1F9FF}]/gu, (char) => 
    char.toUpperCase()
  );
}

// ============================================================================
// 🎯 PROCESAMIENTO ESPECÍFICO PARA PERFIL N0 - FORMATO COMPACTO CON <br>
// ============================================================================
/**
 * ✅ CORRECCIÓN V5: Mejor división y reconstrucción con <br>
 */
function procesarContenidoN0(contenido) {
  console.log('📄 Procesando contenido específico para perfil N0 CON FORMATO COMPACTO V5...');
  
  const perfil = estadoGlobal.perfil;
  
  // 1️⃣ Obtener límites del perfil
  const minOraciones = perfil.adaptaciones_texto.min_oraciones || 2;
  const maxOracionesRecomendado = perfil.adaptaciones_texto.max_oraciones || 4;
  const maxOracionesAbsoluto = perfil.adaptaciones_texto.max_oraciones_absoluto || 5;
  
  const minPalabras = perfil.adaptaciones_texto.min_palabras_por_oracion || 3;
  const maxPalabrasRecomendado = perfil.adaptaciones_texto.max_palabras_por_oracion || 6;
  const maxPalabrasAbsoluto = perfil.adaptaciones_texto.max_palabras_absoluto || 10;
  
  console.log(`📋 Límites RECOMENDADOS: ${minOraciones}-${maxOracionesRecomendado} oraciones, máx ${maxPalabrasRecomendado} palabras`);
  console.log(`📋 Límites ABSOLUTOS: máx ${maxOracionesAbsoluto} oraciones, máx ${maxPalabrasAbsoluto} palabras`);
  
  // ✅ V6: Ahora limpiarHTML preserva los \n gracias a la corrección
  const contenidoCompleto = limpiarHTML(contenido)
    .replace(/\r\n/g, '\n')  // Normalizar saltos de línea Windows
    .replace(/\r/g, '\n')    // Normalizar saltos de línea Mac
    .trim();
  
  if (!contenidoCompleto) {
    console.warn('⚠️ Contenido vacío después de limpieza');
    return contenido;
  }
  
  // 2️⃣ ✅ V5: Dividir en líneas PRIMERO (respetando formato de Gemini)
  let lineas = contenidoCompleto
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  // ✅ V5: Si no hay saltos de línea, usar MEJOR fallback para dividir por puntos
  if (lineas.length === 1) {
    console.log('⚠️ No hay saltos de línea, usando división mejorada por puntos...');
    
    // Dividir por punto + emoji/espacio/mayúscula
    lineas = contenidoCompleto.split(/\.\s*(?=[🎼🎵🎶💧🥤🚿☀️🌍📚✏️🎨🎭🎪🎯🎮🎲🎰🎳🏀⚽🏈🏐🎾🎿⛷️🏂🏄🏊🚴🏇🎪🎡🎢🎠🎭🎬🎤🎧🎼🎹🎸🎺🎻🥁]|\s*[A-ZÁÉÍÓÚÑ¡])/);
    
    // Añadir punto final a cada línea si no lo tiene
    lineas = lineas
      .map(l => {
        l = l.trim();
        if (l && !l.endsWith('.') && !l.endsWith('!') && !l.endsWith('?')) {
          l += '.';
        }
        return l;
      })
      .filter(l => l.length > 0);
    
    console.log(`✅ Texto dividido en ${lineas.length} oraciones usando puntuación`);
  }
  
  console.log(`🔍 Líneas divididas: ${lineas.length}`);
  lineas.forEach((linea, idx) => {
    console.log(`   ${idx + 1}. "${linea}"`);
  });
  
  // 3️⃣ Identificar saludo, cuerpo y cierre
  let saludo = "";
  let cierre = "";
  let cuerpo = [];
  
  // Buscar saludo (primera línea con HOLA o ¡HOLA)
  if (lineas.length > 0 && /\bHOLA\b/i.test(lineas[0])) {
    saludo = lineas[0];
    lineas = lineas.slice(1);
    console.log(`✅ Saludo detectado: "${saludo}"`);
  }
  
  // Buscar cierre (última línea con SIGAMOS/APRENDIENDO/JUNTOS)
  if (lineas.length > 0) {
    const ultimaLinea = lineas[lineas.length - 1];
    if (/\b(SIGAMOS|APRENDIENDO|JUNTOS)\b/i.test(ultimaLinea)) {
      cierre = ultimaLinea;
      lineas = lineas.slice(0, -1);
      console.log(`✅ Cierre detectado: "${cierre}"`);
    }
  }
  
  cuerpo = lineas;
  
  console.log(`📌 Estructura detectada:`);
  console.log(`   - Saludo: ${saludo ? 'SÍ' : 'NO'}`);
  console.log(`   - Cuerpo: ${cuerpo.length} oraciones`);
  console.log(`   - Cierre: ${cierre ? 'SÍ' : 'NO'}`);
  
  // 4️⃣ Validar cantidad mínima de oraciones en el cuerpo
  if (cuerpo.length < minOraciones) {
    console.error(`❌ Solo ${cuerpo.length} oraciones en el cuerpo, mínimo: ${minOraciones}`);
    return contenido; // Retornar original si no cumple mínimo
  }
  
  // 5️⃣ Analizar cada oración del cuerpo
  const oracionesValidadas = [];
  
  cuerpo.forEach((oracion, idx) => {
    const oracionLimpia = oracion.trim();
    
    if (!oracionLimpia) return;
    
    const palabras = oracionLimpia.split(/\s+/).filter(p => p.length > 0);
    const numPalabras = palabras.length;
    
    console.log(`   ${idx + 1}. "${oracionLimpia}" (${numPalabras} palabras)`);
    
    if (numPalabras > maxPalabrasAbsoluto) {
      console.warn(`   ⚠️ Oración ${idx + 1} excede límite ABSOLUTO (${numPalabras} > ${maxPalabrasAbsoluto})`);
    } else if (numPalabras > maxPalabrasRecomendado) {
      console.log(`   ℹ️ Oración ${idx + 1} excede límite recomendado - PERMITIDO por compensación`);
    }
    
    oracionesValidadas.push(oracionLimpia);
  });
  
  console.log(`✅ Oraciones validadas: ${oracionesValidadas.length}`);
  
  // 6️⃣ ✅ V5: Reconstruir DIRECTAMENTE con <br> (sin pasar por \n)
  let resultado = '';
  
  if (saludo) {
    resultado += saludo + '<br>';
  }
  
  // ✅ CAMBIO CLAVE: join directamente con <br>
  resultado += oracionesValidadas.join('<br>');
  
  if (cierre) {
    resultado += '<br>' + cierre;
  }
  
  // 7️⃣ Análisis final de compensación
  const promedioPalabras = oracionesValidadas.reduce((sum, o) => 
    sum + o.split(/\s+/).length, 0
  ) / oracionesValidadas.length;
  
  console.log(`\n📊 ANÁLISIS FINAL:`);
  console.log(`   Oraciones: ${oracionesValidadas.length} (recomendado: ${minOraciones}-${maxOracionesRecomendado})`);
  console.log(`   Promedio palabras/oración: ${promedioPalabras.toFixed(1)} (recomendado: máx ${maxPalabrasRecomendado})`);
  console.log(`   Formato: ${saludo ? 'Saludo + ' : ''}${oracionesValidadas.length} líneas${cierre ? ' + Cierre' : ''}`);
  
  if (oracionesValidadas.length <= maxOracionesRecomendado && promedioPalabras <= maxPalabrasRecomendado) {
    console.log(`   ✅ Dentro de límites recomendados`);
  } else if (oracionesValidadas.length > maxOracionesRecomendado && promedioPalabras <= maxPalabrasRecomendado) {
    console.log(`   ✅ Compensación OK: Más oraciones pero palabras cortas`);
  } else if (oracionesValidadas.length <= maxOracionesRecomendado && promedioPalabras > maxPalabrasRecomendado) {
    console.log(`   ✅ Compensación OK: Oraciones largas pero pocas`);
  } else {
    console.log(`   ⚠️ Ambos límites excedidos - revisar prompt`);
  }
  
  console.log('\n✅ CONTENIDO PROCESADO V5 (CON <br> DIRECTO):\n');
  console.log('┌─────────────────────────────');
  console.log(resultado);
  console.log('└─────────────────────────────\n');
  
  return resultado.trim();
}

// ============================================================================
// 🎯 PROCESAMIENTO ESPECÍFICO PARA PERFIL N1 - FORMATO COMPACTO CON <br>
// ============================================================================
/**
 * ✅ NUEVO: Procesamiento específico para N1 (similar a N0 pero con límites ajustados)
 */
function procesarContenidoN1(contenido) {
  console.log('📄 Procesando contenido específico para perfil N1 CON FORMATO COMPACTO...');
  
  const perfil = estadoGlobal.perfil;
  
  // 1️⃣ Límites para N1 (ligeramente más flexibles que N0)
  const minOraciones = 3;
  const maxOracionesRecomendado = 5;
  const maxOracionesAbsoluto = 6;
  
  const minPalabras = 4;
  const maxPalabrasRecomendado = 8;
  const maxPalabrasAbsoluto = 12;
  
  console.log(`📋 Límites RECOMENDADOS N1: ${minOraciones}-${maxOracionesRecomendado} oraciones, máx ${maxPalabrasRecomendado} palabras`);
  console.log(`📋 Límites ABSOLUTOS N1: máx ${maxOracionesAbsoluto} oraciones, máx ${maxPalabrasAbsoluto} palabras`);
  
  // ✅ Limpiar y normalizar
  const contenidoCompleto = limpiarHTML(contenido)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  
  if (!contenidoCompleto) {
    console.warn('⚠️ Contenido vacío después de limpieza');
    return contenido;
  }
  
  // 2️⃣ Dividir en líneas
  let lineas = contenidoCompleto
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  // Fallback: dividir por puntos si no hay saltos de línea
  if (lineas.length === 1) {
    console.log('⚠️ No hay saltos de línea, usando división mejorada por puntos...');
    lineas = contenidoCompleto.split(/\.\s*(?=[🎼🎵🎶💧🥤🚿☀️🌍📚✏️🎨🎭🎪🎯🎮🎲🎰🎳🏀⚽🏈🏐🎾🎿⛷️🏂🏄🏊🚴🏇🎪🎡🎢🎠🎭🎬🎤🎧🎼🎹🎸🎺🎻🥁]|\s*[A-ZÁÉÍÓÚÑ¡])/);
    lineas = lineas
      .map(l => {
        l = l.trim();
        if (l && !l.endsWith('.') && !l.endsWith('!') && !l.endsWith('?')) {
          l += '.';
        }
        return l;
      })
      .filter(l => l.length > 0);
    console.log(`✅ Texto dividido en ${lineas.length} oraciones usando puntuación`);
  }
  
  console.log(`📝 Líneas divididas N1: ${lineas.length}`);
  lineas.forEach((linea, idx) => {
    console.log(`   ${idx + 1}. "${linea}"`);
  });
  
  // 3️⃣ Identificar estructura
  let saludo = "";
  let cierre = "";
  let cuerpo = [];
  
  if (lineas.length > 0 && /\bHOLA\b/i.test(lineas[0])) {
    saludo = lineas[0];
    lineas = lineas.slice(1);
    console.log(`✅ Saludo detectado: "${saludo}"`);
  }
  
  if (lineas.length > 0) {
    const ultimaLinea = lineas[lineas.length - 1];
    if (/\b(SIGAMOS|APRENDIENDO|JUNTOS)\b/i.test(ultimaLinea)) {
      cierre = ultimaLinea;
      lineas = lineas.slice(0, -1);
      console.log(`✅ Cierre detectado: "${cierre}"`);
    }
  }
  
  cuerpo = lineas;
  
  console.log(`📌 Estructura N1 detectada:`);
  console.log(`   - Saludo: ${saludo ? 'SÍ' : 'NO'}`);
  console.log(`   - Cuerpo: ${cuerpo.length} oraciones`);
  console.log(`   - Cierre: ${cierre ? 'SÍ' : 'NO'}`);
  
  // 4️⃣ Validar cantidad mínima
  if (cuerpo.length < minOraciones) {
    console.error(`❌ Solo ${cuerpo.length} oraciones en el cuerpo N1, mínimo: ${minOraciones}`);
    return contenido;
  }
  
  // 5️⃣ Analizar oraciones
  const oracionesValidadas = [];
  
  cuerpo.forEach((oracion, idx) => {
    const oracionLimpia = oracion.trim();
    if (!oracionLimpia) return;
    
    const palabras = oracionLimpia.split(/\s+/).filter(p => p.length > 0);
    const numPalabras = palabras.length;
    
    console.log(`   ${idx + 1}. "${oracionLimpia}" (${numPalabras} palabras)`);
    
    if (numPalabras > maxPalabrasAbsoluto) {
      console.warn(`   ⚠️ Oración ${idx + 1} excede límite ABSOLUTO N1 (${numPalabras} > ${maxPalabrasAbsoluto})`);
    } else if (numPalabras > maxPalabrasRecomendado) {
      console.log(`   ℹ️ Oración ${idx + 1} excede límite recomendado N1 - PERMITIDO por compensación`);
    }
    
    oracionesValidadas.push(oracionLimpia);
  });
  
  console.log(`✅ Oraciones N1 validadas: ${oracionesValidadas.length}`);
  
  // 6️⃣ Reconstruir con <br>
  let resultado = '';
  
  if (saludo) {
    resultado += saludo + '<br>';
  }
  
  resultado += oracionesValidadas.join('<br>');
  
  if (cierre) {
    resultado += '<br>' + cierre;
  }
  
  // 7️⃣ Análisis final
  const promedioPalabras = oracionesValidadas.reduce((sum, o) => 
    sum + o.split(/\s+/).length, 0
  ) / oracionesValidadas.length;
  
  console.log(`\n📊 ANÁLISIS FINAL N1:`);
  console.log(`   Oraciones: ${oracionesValidadas.length} (recomendado: ${minOraciones}-${maxOracionesRecomendado})`);
  console.log(`   Promedio palabras/oración: ${promedioPalabras.toFixed(1)} (recomendado: máx ${maxPalabrasRecomendado})`);
  console.log(`   Formato: ${saludo ? 'Saludo + ' : ''}${oracionesValidadas.length} líneas${cierre ? ' + Cierre' : ''}`);
  
  if (oracionesValidadas.length <= maxOracionesRecomendado && promedioPalabras <= maxPalabrasRecomendado) {
    console.log(`   ✅ Dentro de límites recomendados N1`);
  } else if (oracionesValidadas.length > maxOracionesRecomendado && promedioPalabras <= maxPalabrasRecomendado) {
    console.log(`   ✅ Compensación OK: Más oraciones pero palabras cortas`);
  } else if (oracionesValidadas.length <= maxOracionesRecomendado && promedioPalabras > maxPalabrasRecomendado) {
    console.log(`   ✅ Compensación OK: Oraciones largas pero pocas`);
  } else {
    console.log(`   ⚠️ Ambos límites excedidos - revisar prompt`);
  }
  
  console.log('\n✅ CONTENIDO N1 PROCESADO (CON <br> DIRECTO):\n');
  console.log('┌─────────────────────────────');
  console.log(resultado);
  console.log('└─────────────────────────────\n');
  
  return resultado.trim();
}

// ============================================================================
// 🎯 PROCESAMIENTO ESPECÍFICO PARA PERFIL N2 - FORMATO CON PÁRRAFOS
// ============================================================================
/**
 * ✅ NUEVO: Procesamiento específico para N2 con párrafos separados
 */
function procesarContenidoN2(contenido) {
  console.log('📄 Procesando contenido específico para perfil N2 CON FORMATO DE PÁRRAFOS...');
  
  // ✅ Limpiar y normalizar
  const contenidoCompleto = limpiarHTML(contenido)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  
  if (!contenidoCompleto) {
    console.warn('⚠️ Contenido vacío después de limpieza');
    return contenido;
  }
  
  // Dividir en párrafos (separados por líneas vacías o saltos simples)
  let parrafos = contenidoCompleto
    .split(/\n\n+/)  // Dividir por dobles saltos de línea
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  // Si no hay párrafos múltiples, intentar dividir por saltos simples
  if (parrafos.length === 1) {
    console.log('⚠️ No hay dobles saltos de línea, intentando con saltos simples...');
    parrafos = contenidoCompleto
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
  
  console.log(`📝 Párrafos detectados: ${parrafos.length}`);
  parrafos.forEach((parrafo, idx) => {
    console.log(`   ${idx + 1}. "${parrafo.substring(0, 50)}${parrafo.length > 50 ? '...' : ''}"`);
  });
  
  // Reconstruir con <br><br> entre párrafos para crear espacios visuales
  const resultado = parrafos.join('<br><br>');
  
  console.log('\n✅ CONTENIDO N2 PROCESADO (CON PÁRRAFOS SEPARADOS):\n');
  console.log('┌─────────────────────────────');
  console.log(resultado);
  console.log('└─────────────────────────────\n');
  
  return resultado.trim();
}

// ============================================================================
// 🎯 PROCESAMIENTO ESPECÍFICO PARA PERFIL N3 - FORMATO ACADÉMICO CON PÁRRAFOS
// ============================================================================
/**
 * ✅ NUEVO: Procesamiento específico para N3 con párrafos organizados
 */
function procesarContenidoN3(contenido) {
  console.log('📄 Procesando contenido específico para perfil N3 CON FORMATO ACADÉMICO...');
  
  // ✅ Limpiar y normalizar
  const contenidoCompleto = limpiarHTML(contenido)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  
  if (!contenidoCompleto) {
    console.warn('⚠️ Contenido vacío después de limpieza');
    return contenido;
  }
  
  // Dividir en párrafos (separados por líneas vacías o saltos simples)
  let parrafos = contenidoCompleto
    .split(/\n\n+/)  // Dividir por dobles saltos de línea
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  // Si no hay párrafos múltiples, intentar dividir por saltos simples
  if (parrafos.length === 1) {
    console.log('⚠️ No hay dobles saltos de línea, intentando con saltos simples...');
    parrafos = contenidoCompleto
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
  
  console.log(`📝 Párrafos N3 detectados: ${parrafos.length}`);
  parrafos.forEach((parrafo, idx) => {
    const palabras = parrafo.split(/\s+/).length;
    console.log(`   ${idx + 1}. "${parrafo.substring(0, 60)}${parrafo.length > 60 ? '...' : ''}" (${palabras} palabras)`);
  });
  
  // Reconstruir con <br><br> entre párrafos para crear espacios visuales
  const resultado = parrafos.join('<br><br>');
  
  console.log('\n✅ CONTENIDO N3 PROCESADO (FORMATO ACADÉMICO CON PÁRRAFOS):\n');
  console.log('┌─────────────────────────────');
  console.log(resultado);
  console.log('└─────────────────────────────\n');
  
  return resultado.trim();
}

// ============================================================================
// 🤖 LLAMADA A LA API DE GEMINI
// ============================================================================
export async function llamarGeminiAPI(prompt, maxTokens = 1000) {
  console.log('1. Iniciando llamada a la API de Gemini...');
  
  // Tracking del inicio de la llamada
  if (window.lumaiTracker) {
    window.lumaiTracker.recordCustomEvent('gemini_api_call_started', {
      promptLength: prompt.length,
      maxTokens: maxTokens,
      timestamp: new Date().toISOString()
    });
  }
  
  const requestBody = {
    contents: [{
      parts: [{
        text: ocultarNombre(prompt)
      }]
    }],
    generationConfig: {
      // Google recomienda NO fijar temperature/topP/topK en los modelos 3.x
      maxOutputTokens: Math.max(maxTokens, MIN_TOKENS_SALIDA)
    }
  };
  
  console.log('2. Realizando fetch a la URL de Gemini...');
  
  try {
    const tiempoInicio = Date.now();
    
    let claveAPI = await obtenerClaveAPI();
    let response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': claveAPI
      },
      body: JSON.stringify(requestBody)
    });

    // 🔑 Clave inválida o vencida: se borra y se pide una nueva (un solo reintento)
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      const detalle = await response.clone().text();
      if (/API key|API_KEY|PERMISSION_DENIED|UNAUTHENTICATED/i.test(detalle)) {
        console.warn('🔑 La clave guardada no es válida. Se pide una nueva.');
        borrarClaveAPI();
        claveAPI = await obtenerClaveAPI('La clave anterior no funcionó. Probá con otra.');
        response = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': claveAPI },
          body: JSON.stringify(requestBody)
        });
      }
    }
    
    const tiempoTranscurrido = Date.now() - tiempoInicio;
    console.log(`3. Respuesta recibida en ${tiempoTranscurrido}ms. Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('4. Error en la respuesta de Gemini:', errorText);
      
      // Tracking del error
      if (window.lumaiTracker) {
        window.lumaiTracker.recordCustomEvent('gemini_api_call_error', {
          status: response.status,
          error: errorText,
          timestamp: new Date().toISOString()
        });
      }
      
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    console.log('4. Respuesta exitosa. Procesando contenido...');
    
    const data = await response.json();
    
    // Tracking del éxito
    if (window.lumaiTracker) {
      window.lumaiTracker.recordCustomEvent('gemini_api_call_success', {
        responseTime: tiempoTranscurrido,
        tokensUsed: maxTokens,
        timestamp: new Date().toISOString()
      });
    }
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('5. Estructura de respuesta inválida:', data);
      throw new Error('Respuesta de Gemini con estructura inválida');
    }
    
    // Se juntan solo las partes de texto (los modelos 3.x pueden agregar partes internas)
    const partes = data.candidates[0].content.parts || [];
    const texto = restaurarNombre(
      partes.filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join('')
    );
    
    if (!texto || texto.trim().length === 0) {
      console.error('6. Texto vacío en la respuesta de Gemini');
      throw new Error('Respuesta de Gemini vacía');
    }
    
    console.log('8. Contenido extraído de Gemini exitosamente.');
    return texto;
    
  } catch (error) {
    console.error('ERROR en llamarGeminiAPI:', error);
    
    // Tracking del error
    if (window.lumaiTracker) {
      window.lumaiTracker.recordCustomEvent('gemini_api_call_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    throw error;
  }
}

// ============================================================================
// 📝 GENERAR PROMPT PERSONALIZADO
// ============================================================================
function generarPromptEducativoMejorado(perfil) {
  const tema = estadoGlobal.tema || 'el tema seleccionado';
  const materia = estadoGlobal.materia || 'la materia';
  const nombreAlumno = obtenerNombreAlumno();
  const perfilNombre = perfil.nombre_visible;
  
  // ✅ Incluir MATERIA en el contexto
  const contextoMateria = `en la materia "${materia}"`;
  
  if (perfilNombre === 'N0') {
    // ========================================
    // PROMPT PARA PERFIL N0 - FORMATO COMPACTO V4
    // ========================================
    
    return `Eres LUMAI, un tutor educativo experto especializado en estudiantes NO ALFABETIZADOS.

🎯 CONTEXTO:
- Estudiante: ${nombreAlumno}
- Tema: "${tema}" ${contextoMateria}
- Perfil: N0 (estudiantes más vulnerables, NO alfabetizados)

🎯 LÍMITES RECOMENDADOS (ideales):
- 2-4 oraciones COMPLETAS
- 3-6 palabras por oración
- Emojis: máximo 3 por oración (solo los MÁS relevantes)

⚠️ FLEXIBILIDAD PERMITIDA (sistema de compensación):
Si una oración necesita más de 6 palabras para completar la idea:
- ✅ Puedes usar hasta 10 palabras máximo
- ✅ PERO compensa reduciendo el número de oraciones a 2-3

Si necesitas más de 4 oraciones:
- ✅ Puedes usar hasta 5 oraciones máximo
- ✅ PERO compensa con oraciones MÁS CORTAS (3-5 palabras)

📋 ESTRUCTURA OBLIGATORIA - FORMATO COMPACTO:

**LÍNEA 1: Saludo**
¡HOLA ${nombreAlumno.toUpperCase()}!

**LÍNEAS 2-5: Explicación (una oración completa por línea)**
[ORACIÓN 1 CON PUNTO]. [EMOJI OPCIONAL]
[ORACIÓN 2 CON PUNTO]. [EMOJI OPCIONAL]
[ORACIÓN 3 CON PUNTO]. [EMOJI OPCIONAL]

**ÚLTIMA LÍNEA: Cierre (SIN nombre del alumno)**
¡SIGAMOS APRENDIENDO JUNTOS!

🎨 EMOJIS:
- Solo usa emojis si son REALMENTE relevantes al tema
- Máximo 3 emojis por oración
- Coloca el emoji AL FINAL de la oración, DESPUÉS del punto
- Si el tema no tiene emojis claros, NO uses emojis genéricos

📊 EJEMPLO PERFECTO (tema: pentagrama en música):

¡HOLA LUCAS!
EL PENTAGRAMA ES UN DIBUJO CON CINCO LÍNEAS. 🎼
AHÍ ESCRIBIMOS LAS NOTAS MUSICALES. 🎵
LAS NOTAS VAN EN LAS LÍNEAS Y ESPACIOS. 🎶
¡SIGAMOS APRENDIENDO JUNTOS!

📊 EJEMPLO PERFECTO (tema: agua):

¡HOLA LUCAS!
EL AGUA ES MUY IMPORTANTE. 💧
LA USAMOS PARA BEBER. 🥤
TAMBIÉN NOS BAÑAMOS CON AGUA LIMPIA. 🚿
¡SIGAMOS APRENDIENDO JUNTOS!

⚠️ REGLAS CRÍTICAS DE FORMATO:
1. TODO EN MAYÚSCULAS
2. UNA ORACIÓN POR LÍNEA (presiona Enter después de cada oración)
3. SIN LÍNEAS VACÍAS entre el saludo y la explicación
4. SIN LÍNEAS VACÍAS entre las oraciones
5. SIN LÍNEAS VACÍAS entre la última oración y el cierre
6. PUNTO (.) al final de cada oración
7. Emoji DESPUÉS del punto (opcional)
8. El saludo va en la PRIMERA línea
9. La explicación empieza en la SEGUNDA línea
10. El cierre va en la ÚLTIMA línea
11. El cierre es SIEMPRE: ¡SIGAMOS APRENDIENDO JUNTOS! (sin el nombre del alumno)

❌ INCORRECTO (con líneas vacías):
¡HOLA LUCAS!

EL PENTAGRAMA TIENE CINCO LÍNEAS...

¡SIGAMOS APRENDIENDO JUNTOS!

✅ CORRECTO (formato compacto, sin líneas vacías):
¡HOLA LUCAS!
EL PENTAGRAMA TIENE CINCO LÍNEAS...
¡SIGAMOS APRENDIENDO JUNTOS!

🎯 SISTEMA DE COMPENSACIÓN:
1. Si oración larga (7-10 pal.) → Reducir a 2-3 oraciones totales
2. Si más oraciones (5) → Mantenerlas cortas (3-5 pal.)
3. NUNCA exceder ambos límites a la vez

⚠️ OTRAS REGLAS CRÍTICAS:
- Vocabulario EXTREMADAMENTE SIMPLE (palabras que un niño de 6-8 años entienda)
- CADA oración debe tener SENTIDO COMPLETO por sí sola
- Una sola idea clave por explicación
- NUNCA uses metáforas o abstracciones
- NUNCA cortes una idea a la mitad

GENERA AHORA la explicación sobre "${tema}" ${contextoMateria} SIGUIENDO EXACTAMENTE ESTE FORMATO COMPACTO (sin líneas vacías):`;
  }
  
  if (perfilNombre === 'N1') {
    // ========================================
    // PROMPT PARA PERFIL N1 - FORMATO COMPACTO (IGUAL QUE N0)
    // ========================================
    
    return `Eres LUMAI, un tutor educativo experto especializado en estudiantes con BAJO nivel cognitivo.

🎯 CONTEXTO:
- Estudiante: ${nombreAlumno}
- Tema: "${tema}" ${contextoMateria}
- Perfil: N1 (estudiantes con dificultades cognitivas en nivel BAJO)

🎯 LÍMITES RECOMENDADOS (ideales):
- 3-5 oraciones COMPLETAS
- 4-8 palabras por oración
- Emojis: máximo 3 por oración (solo los MÁS relevantes)

⚠️ FLEXIBILIDAD PERMITIDA (sistema de compensación):
Si una oración necesita más de 8 palabras para completar la idea:
- ✅ Puedes usar hasta 12 palabras máximo
- ✅ PERO compensa reduciendo el número de oraciones a 3-4

Si necesitas más de 5 oraciones:
- ✅ Puedes usar hasta 6 oraciones máximo
- ✅ PERO compensa con oraciones MÁS CORTAS (4-6 palabras)

📋 ESTRUCTURA OBLIGATORIA - FORMATO COMPACTO:

**LÍNEA 1: Saludo**
¡HOLA ${nombreAlumno.toUpperCase()}!

**LÍNEAS 2-6: Explicación (una oración completa por línea)**
[ORACIÓN 1 CON PUNTO]. [EMOJI OPCIONAL]
[ORACIÓN 2 CON PUNTO]. [EMOJI OPCIONAL]
[ORACIÓN 3 CON PUNTO]. [EMOJI OPCIONAL]
[ORACIÓN 4 CON PUNTO]. [EMOJI OPCIONAL]

**ÚLTIMA LÍNEA: Cierre (SIN nombre del alumno)**
¡SIGAMOS APRENDIENDO JUNTOS!

🎨 EMOJIS:
- Solo usa emojis si son REALMENTE relevantes al tema
- Máximo 3 emojis por oración
- Coloca el emoji AL FINAL de la oración, DESPUÉS del punto
- Si el tema no tiene emojis claros, NO uses emojis genéricos

📊 EJEMPLO PERFECTO (tema: pentagrama en música):

¡HOLA LUCAS!
EL PENTAGRAMA ES UN DIBUJO CON CINCO LÍNEAS HORIZONTALES. 🎼
EN EL PENTAGRAMA ESCRIBIMOS LAS NOTAS MUSICALES. 🎵
LAS NOTAS VAN EN LAS LÍNEAS Y EN LOS ESPACIOS. 🎶
ASÍ PODEMOS LEER Y TOCAR MÚSICA. 🎹
¡SIGAMOS APRENDIENDO JUNTOS!

📊 EJEMPLO PERFECTO (tema: el agua):

¡HOLA LUCAS!
EL AGUA ES MUY IMPORTANTE PARA LA VIDA. 💧
LA USAMOS PARA BEBER Y COCINAR ALIMENTOS. 🥤
TAMBIÉN NOS BAÑAMOS CON AGUA LIMPIA Y FRESCA. 🚿
SIN AGUA NO PODRÍAMOS VIVIR NI CRECER. 🌊
¡SIGAMOS APRENDIENDO JUNTOS!

⚠️ REGLAS CRÍTICAS DE FORMATO:
1. TODO EN MAYÚSCULAS
2. UNA ORACIÓN POR LÍNEA (presiona Enter después de cada oración)
3. SIN LÍNEAS VACÍAS entre el saludo y la explicación
4. SIN LÍNEAS VACÍAS entre las oraciones
5. SIN LÍNEAS VACÍAS entre la última oración y el cierre
6. PUNTO (.) al final de cada oración
7. Emoji DESPUÉS del punto (opcional)
8. El saludo va en la PRIMERA línea
9. La explicación empieza en la SEGUNDA línea
10. El cierre va en la ÚLTIMA línea
11. El cierre es SIEMPRE: ¡SIGAMOS APRENDIENDO JUNTOS! (sin el nombre del alumno)

❌ INCORRECTO (con líneas vacías):
¡HOLA LUCAS!

EL PENTAGRAMA TIENE CINCO LÍNEAS...

¡SIGAMOS APRENDIENDO JUNTOS!

✅ CORRECTO (formato compacto, sin líneas vacías):
¡HOLA LUCAS!
EL PENTAGRAMA TIENE CINCO LÍNEAS...
¡SIGAMOS APRENDIENDO JUNTOS!

🎯 SISTEMA DE COMPENSACIÓN:
1. Si oración larga (9-12 pal.) → Reducir a 3-4 oraciones totales
2. Si más oraciones (6) → Mantenerlas cortas (4-6 pal.)
3. NUNCA exceder ambos límites a la vez

⚠️ OTRAS REGLAS CRÍTICAS:
- Vocabulario SIMPLE (palabras que un niño de 8-10 años entienda)
- CADA oración debe tener SENTIDO COMPLETO por sí sola
- Una idea principal por explicación
- Evita metáforas complejas, usa lenguaje concreto
- NUNCA cortes una idea a la mitad

GENERA AHORA la explicación sobre "${tema}" ${contextoMateria} SIGUIENDO EXACTAMENTE ESTE FORMATO COMPACTO (sin líneas vacías):`;
  }
  
  if (perfilNombre === 'N2') {
    // ========================================
    // PROMPT PARA PERFIL N2 - CON FORMATO DE PÁRRAFOS
    // ========================================
    
    return `Eres LUMAI, un tutor guía experto.

El estudiante ${nombreAlumno} requiere soporte moderado. Características:

- **Lectoescritura:** Oraciones hasta 12-15 palabras, vocabulario claro
- **Texto:** 80-120 palabras total
- **Emojis:** Máximo 1 emoji por oración (SOLO si es muy relevante al contenido)
- **Memoria y Atención:** 2-3 párrafos cortos con saltos de línea entre ellos
- **Procesamiento:** Ritmo estándar, conectores claros
- **Autonomía:** Fomenta curiosidad con preguntas retóricas
- **Regulación Emocional:** Tono positivo de apoyo
- **Razonamiento:** Conecta ideas claramente, causa-efecto explícito

📋 ESTRUCTURA OBLIGATORIA CON FORMATO VISUAL:

**PÁRRAFO 1: Saludo amigable**
¡Hola ${nombreAlumno}! [emoji opcional]

**PÁRRAFO 2: Introducción (1-2 oraciones explicando el tema)**
[Oración 1 sobre el tema]. [Oración 2 ampliando la idea].

**PÁRRAFO 3: Desarrollo con ejemplo concreto**
[Explicación del concepto con ejemplo práctico que el alumno pueda entender]. [Emoji opcional].

**PÁRRAFO 4: Cierre motivador**
[Frase de cierre positiva animando a seguir aprendiendo]. [Emoji opcional]

⚠️ REGLAS CRÍTICAS DE FORMATO:
1. Cada párrafo en una LÍNEA SEPARADA (presiona Enter después de cada párrafo)
2. LÍNEA VACÍA entre cada párrafo para separar visualmente
3. NO uses mayúsculas (texto normal con mayúscula inicial)
4. Máximo 1 emoji por oración y solo si es MUY relevante
5. Oraciones de 8-15 palabras máximo
6. Vocabulario claro y accesible

📊 EJEMPLO PERFECTO (tema: pentagrama en música):

¡Hola Lucas! 👋

El pentagrama es un conjunto de cinco líneas horizontales donde escribimos la música. Imagina que son cinco pisos de un edificio. 🎶

Las notas se colocan sobre las líneas o entre ellas, en los espacios. Cada línea y cada espacio representan un sonido diferente. Las notas más altas van arriba y las más bajas van abajo.

¡Así podemos leer y escribir canciones! Sigue explorando y pronto podrás crear tus propias melodías. 🎵

📊 EJEMPLO PERFECTO (tema: el agua):

¡Hola Lucas! 👋

El agua es uno de los elementos más importantes para la vida. La encontramos en ríos, lagos y mares. 💧

Usamos el agua para beber, cocinar y bañarnos. Las plantas y los animales también necesitan agua para vivir. Sin agua, no podríamos existir.

¡Cuidar el agua es cuidar nuestro planeta! Cada vez que ahorras agua, estás ayudando al medio ambiente. 🌍

⚠️ MUY IMPORTANTE:
- Debe haber UNA LÍNEA VACÍA entre cada párrafo
- No pongas todo el texto seguido
- La estructura visual con espacios entre párrafos es OBLIGATORIA

Genera AHORA la explicación sobre "${tema}" ${contextoMateria} SIGUIENDO EXACTAMENTE ESTE FORMATO CON PÁRRAFOS SEPARADOS POR LÍNEAS VACÍAS.`;
  }
  
  if (perfilNombre === 'N3') {
    // ========================================
    // PROMPT PARA PERFIL N3 - FORMATO ORGANIZADO CON PÁRRAFOS
    // ========================================
    
    return `Eres LUMAI, un tutor académico avanzado.

El estudiante ${nombreAlumno} tiene capacidades cognitivas plenas. Características:

- **Texto:** 150+ palabras, análisis profundo
- **Emojis:** Máximo 3 emojis en TODO el texto (úsalos estratégicamente, solo si aportan valor)
- **Profundidad:** Análisis complejo, múltiples perspectivas
- **Vocabulario:** Técnico y disciplinar
- **Razonamiento:** Abstracción, inferencia, pensamiento crítico
- **Estructura:** Párrafos bien organizados con saltos de línea

📋 ESTRUCTURA OBLIGATORIA CON FORMATO VISUAL:

**PÁRRAFO 1: Introducción contextual (2-3 oraciones)**
[Presenta el tema y su relevancia en el contexto general de la materia]

**PÁRRAFO 2: Desarrollo profundo - Conceptos clave (3-4 oraciones)**
[Explica los conceptos principales con profundidad y relaciones entre ellos]

**PÁRRAFO 3: Desarrollo - Aplicaciones o ejemplos complejos (3-4 oraciones)**
[Proporciona ejemplos avanzados, aplicaciones prácticas o casos de estudio]

**PÁRRAFO 4: Cierre reflexivo (2-3 oraciones)**
[Plantea una pregunta de reflexión, conexiones interdisciplinares o invita al análisis crítico]

⚠️ REGLAS CRÍTICAS DE FORMATO:
1. Cada párrafo en una LÍNEA SEPARADA (presiona Enter después de cada párrafo)
2. LÍNEA VACÍA entre cada párrafo para separar visualmente
3. Texto normal con mayúscula inicial (NO todo en mayúsculas)
4. Máximo 3 emojis en TODA la explicación (no por párrafo, sino en total)
5. Los emojis deben ser estratégicos y relevantes al contenido académico
6. Oraciones complejas y bien estructuradas
7. Vocabulario técnico apropiado al nivel

📊 EJEMPLO PERFECTO (tema: fotosíntesis en biología):

La fotosíntesis es el proceso bioquímico fundamental mediante el cual las plantas convierten la energía lumínica en energía química. Este mecanismo no solo sustenta la vida vegetal, sino que constituye la base de prácticamente todas las cadenas tróficas terrestres y acuáticas. 🌱

El proceso ocurre en dos fases distintas: las reacciones lumínicas, que se producen en los tilacoides y generan ATP y NADPH, y el ciclo de Calvin, que tiene lugar en el estroma del cloroplasto y fija el dióxido de carbono para sintetizar glucosa. La eficiencia del proceso depende de variables como la intensidad lumínica, la concentración de CO₂ y la temperatura ambiental.

Las aplicaciones del conocimiento sobre fotosíntesis son vastas en campos como la agricultura de precisión, donde se optimizan las condiciones de cultivo, y en biotecnología, donde se investiga la fotosíntesis artificial para desarrollar biocombustibles sostenibles. Incluso en astrofísica se estudian estos principios para evaluar la posibilidad de vida en exoplanetas. 🔬

¿Cómo podríamos aplicar los principios de la fotosíntesis para diseñar soluciones innovadoras frente al cambio climático? La respuesta puede encontrarse en la intersección entre biología, ingeniería y ciencias ambientales. 💡

📊 EJEMPLO PERFECTO (tema: Revolución Industrial):

La Revolución Industrial, iniciada en Inglaterra a mediados del siglo XVIII, representa una transformación radical en las estructuras económicas, sociales y tecnológicas de la humanidad. Este proceso de industrialización no solo modificó los métodos de producción, sino que reconfiguró por completo las dinámicas demográficas y las relaciones laborales. 🏭

El factor determinante fue la convergencia de múltiples innovaciones tecnológicas: la máquina de vapor de James Watt, el telar mecánico, la aplicación del coque en la metalurgia del hierro. Estas innovaciones generaron un efecto multiplicador que transformó sectores como el textil, la minería y el transporte. La mecanización permitió una producción masiva que superaba ampliamente la capacidad artesanal previa.

Las consecuencias sociales fueron profundas y ambivalentes. Surgió una nueva clase trabajadora urbana que enfrentaba condiciones laborales extremas, lo que eventualmente condujo al nacimiento de movimientos obreros y teorías económicas alternativas como el socialismo. Simultáneamente, se expandió una burguesía industrial con poder económico creciente que desafió las estructuras aristocráticas tradicionales.

¿Qué paralelos podemos establecer entre la Revolución Industrial del siglo XVIII y la actual revolución digital? Analizar estas similitudes nos ayuda a comprender mejor los desafíos socioeconómicos contemporáneos. 📚

⚠️ MUY IMPORTANTE:
- Debe haber UNA LÍNEA VACÍA entre cada párrafo
- Máximo 3 emojis en TODA la explicación (no más)
- Vocabulario académico y técnico
- Análisis profundo y crítico
- La estructura visual con espacios entre párrafos es OBLIGATORIA

Genera AHORA la explicación sobre "${tema}" ${contextoMateria} SIGUIENDO EXACTAMENTE ESTE FORMATO ACADÉMICO CON PÁRRAFOS SEPARADOS.`;
  }
  
  // Fallback (no debería llegar aquí)
  return `Eres LUMAI, un tutor educativo. Explica "${tema}" ${contextoMateria} de forma clara.`;
}

// ============================================================================
// 🎯 GENERAR EXPLICACIÓN EDUCATIVA PRINCIPAL
// ============================================================================
export async function generateExplanation(tema, materia, perfil) {
  console.log('🚀 Iniciando generación de explicación educativa CON PROCESADOR DE EMOJIS...');
  
  // Tracking del inicio
  if (window.lumaiTracker) {
    window.lumaiTracker.recordCustomEvent('explanation_generation_started', {
      tema: tema,
      materia: materia,
      perfil: perfil.nombre_visible,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // 1️⃣ Generar prompt personalizado
    const promptCompleto = generarPromptEducativoMejorado(perfil);
    
    console.log('📤 Enviando prompt a Gemini...');
    
    // 2️⃣ Llamar a Gemini API
    const perfilNombre = perfil.nombre_visible;
    const maxTokens = tokensSegunPerfil[perfilNombre] || 5000;
    
    console.log(`⚡ Usando ${maxTokens} tokens para perfil ${perfilNombre}`);
    
    let respuestaBase = await llamarGeminiAPI(promptCompleto, maxTokens);
    
    console.log('\n🔥 ===== RESPUESTA RAW DE GEMINI =====');
    console.log(respuestaBase);
    console.log('🔥 ===== FIN RESPUESTA RAW =====\n');
    
    // 3️⃣ Limpiar HTML (✅ V6: Ahora preserva saltos de línea)
    console.log('🧹 Limpiando respuesta HTML...');
    respuestaBase = limpiarHTML(respuestaBase);
    
    console.log('\n🔥 ===== DESPUÉS DE LIMPIAR HTML =====');
    console.log(respuestaBase);
    console.log('🔥 ===== FIN =====\n');
    
    // 4️⃣ Procesar emojis con SimpleEmojiProcessor
    console.log('\n🎨 ===== INICIANDO PROCESAMIENTO DE EMOJIS =====');
    const procesadorEmojis = new SimpleEmojiProcessor();
    const explicacionConEmojis = procesadorEmojis.procesarTextoConEmojis(
      respuestaBase,
      perfilNombre
    );
    console.log('🎨 ===== PROCESAMIENTO DE EMOJIS COMPLETADO =====\n');
    
    // 5️⃣ Aplicar procesamiento específico por perfil
    let explicacionFinal = explicacionConEmojis;
    
    if (perfilNombre === 'N0') {
      console.log('🎯 Aplicando procesamiento especial para N0 CON FORMATO COMPACTO V5...');
      explicacionFinal = procesarContenidoN0(explicacionConEmojis);
    } else if (perfilNombre === 'N1') {
      console.log('🎯 Aplicando procesamiento especial para N1 CON FORMATO COMPACTO...');
      explicacionFinal = procesarContenidoN1(explicacionConEmojis);
    } else if (perfilNombre === 'N2') {
      console.log('🎯 Aplicando procesamiento especial para N2 CON PÁRRAFOS...');
      explicacionFinal = procesarContenidoN2(explicacionConEmojis);
    } else if (perfilNombre === 'N3') {
      console.log('🎯 Aplicando procesamiento especial para N3 CON FORMATO ACADÉMICO...');
      explicacionFinal = procesarContenidoN3(explicacionConEmojis);
    }
    
    // 6️⃣ Convertir a mayúsculas si es necesario
    if (perfil.requiere_mayusculas) {
      console.log('🔠 Convirtiendo a mayúsculas...');
      explicacionFinal = convertirAMayusculas(explicacionFinal);
    }
    
    // 7️⃣ Tracking del éxito
    if (window.lumaiTracker) {
      window.lumaiTracker.recordCustomEvent('explanation_generation_success', {
        contentLength: explicacionFinal.length,
        perfil: perfilNombre,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Explicación educativa generada CON FORMATO COMPACTO V6.');
    
    return explicacionFinal;
    
  } catch (error) {
    console.error('❌ Error generando explicación:', error);
    
    // Tracking del error
    if (window.lumaiTracker) {
      window.lumaiTracker.recordCustomEvent('explanation_generation_error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // Retornar contenido de respaldo
    return generarContenidoFallback(tema, perfil);
  }
}

// ============================================================================
// 🆘 CONTENIDO DE RESPALDO (FALLBACK)
// ============================================================================
function generarContenidoFallback(tema, perfil) {
  console.warn('⚠️ Generando contenido de respaldo...');
  
  const nombreAlumno = obtenerNombreAlumno();
  
  if (perfil.nombre_visible === 'N0') {
    return `¡HOLA ${nombreAlumno.toUpperCase()}!<br>HOY VAMOS A APRENDER SOBRE ${tema.toUpperCase()}.<br>ES MUY IMPORTANTE.<br>¡SIGAMOS APRENDIENDO JUNTOS!`;
  }
  
  return `Hola ${nombreAlumno}, hoy vamos a aprender sobre ${tema}. 
Este tema es muy importante y te ayudará a entender mejor la materia.`;
}

// ============================================================================
// 💬 RESPONDER PREGUNTAS EDUCATIVAS (CHAT)
// ============================================================================
export async function responderPreguntaEducativa(pregunta, contexto, perfil) {
  console.log('💬 Respondiendo pregunta educativa...');
  
  const nombreAlumno = obtenerNombreAlumno();
  const perfilNombre = perfil.nombre_visible;
  
  // Límites de palabras para respuestas del chat
  const limitesPalabrasChat = {
    'N0': 15,
    'N1': 30,
    'N2': 60,
    'N3': 100
  };
  
  const limitePalabras = limitesPalabrasChat[perfilNombre] || 60;
  
  const promptChat = `Eres LUMAI, un tutor educativo experto.

CONTEXTO PREVIO (explicación dada):
"${contexto}"

PREGUNTA DEL ESTUDIANTE ${nombreAlumno}:
"${pregunta}"

PERFIL: ${perfilNombre}
LÍMITE: Máximo ${limitePalabras} palabras

INSTRUCCIONES:
- Responde de forma clara y directa
- Usa el contexto previo como referencia
- Adapta el vocabulario al perfil ${perfilNombre}
${perfilNombre === 'N0' || perfilNombre === 'N1' ? '- TODO EN MAYÚSCULAS' : ''}
${perfilNombre === 'N0' ? '- Oraciones MUY CORTAS (máx 6 palabras)' : ''}
- Sé amable y motivador

Responde AHORA:`;
  
  try {
    const respuesta = await llamarGeminiAPI(promptChat, 1000);
    
    // Limpiar y procesar
    let respuestaLimpia = limpiarHTML(respuesta);
    
    // Aplicar mayúsculas si es necesario
    if (perfil.requiere_mayusculas) {
      respuestaLimpia = convertirAMayusculas(respuestaLimpia);
    }
    
    return respuestaLimpia;
    
  } catch (error) {
    console.error('❌ Error respondiendo pregunta:', error);
    return perfilNombre === 'N0' || perfilNombre === 'N1'
      ? `LO SIENTO ${nombreAlumno.toUpperCase()}, NO ENTENDÍ. ¿PODÉS PREGUNTARLO DE OTRA FORMA?`
      : `Lo siento ${nombreAlumno}, hubo un error. ¿Podrías reformular tu pregunta?`;
  }
}

// ============================================================================
// 📊 SÍNTESIS DE VOZ (Web Speech API)
// ============================================================================
export function activarSintesisVoz(texto) {
  console.log('📊 Activando síntesis de voz...');
  
  if (!('speechSynthesis' in window)) {
    console.warn('⚠️ Síntesis de voz no soportada en este navegador');
    return;
  }
  
  // Limpiar texto para voz (eliminar <br> y HTML)
  const textoLimpio = texto
    .replace(/<br\s*\/?>/gi, ' ')  // Convertir <br> a espacio
    .replace(/<[^>]*>/g, '')        // Eliminar HTML
    .replace(/[^\w\sáéíóúüñ.,!?]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!textoLimpio) {
    console.warn('⚠️ Texto vacío para síntesis de voz');
    return;
  }
  
  // Detener cualquier síntesis previa
  window.speechSynthesis.cancel();
  
  // Crear utterance
  const utterance = new SpeechSynthesisUtterance(textoLimpio);
  utterance.lang = 'es-AR'; // Español Argentina
  
  // Velocidad según perfil
  const velocidadesPorPerfil = {
    "N0": 0.5,  // Muy lento
    "N1": 0.6,  // Lento
    "N2": 0.7,  // Normal
    "N3": 0.8   // Normal-rápido
  };
  
  const perfilNombre = estadoGlobal.perfil?.nombre_visible || 'N2';
  utterance.rate = velocidadesPorPerfil[perfilNombre] || 0.7;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;
  
  // Eventos
  utterance.onstart = () => {
    console.log('📊 Síntesis de voz iniciada');
    
    if (window.lumaiTracker) {
      window.lumaiTracker.recordCustomEvent('voice_synthesis_started', {
        textLength: textoLimpio.length,
        profile: perfilNombre,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  utterance.onend = () => {
    console.log('✅ Síntesis de voz completada');
    
    if (window.lumaiTracker) {
      window.lumaiTracker.recordCustomEvent('voice_synthesis_completed', {
        timestamp: new Date().toISOString()
      });
    }
  };
  
  utterance.onerror = (event) => {
    console.error('❌ Error en síntesis de voz:', event);
    
    if (window.lumaiTracker) {
      window.lumaiTracker.recordCustomEvent('voice_synthesis_error', {
        error: event.error,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // Iniciar síntesis
  window.speechSynthesis.speak(utterance);
  console.log('Síntesis de voz configurada correctamente');
}

export function detenerSintesisVoz() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    console.log('🔇 Síntesis de voz detenida');
  }
}

// ============================================================================
// 📢 LOG DE CARGA DEL MÓDULO
// ============================================================================
console.log('🤖 ai-engine.js V9 - TODOS LOS PERFILES CON FORMATO OPTIMIZADO');
console.log('✅ Procesador de emojis: Control programático total');
console.log('🎯 Límites emojis: N0=3/oración, N1=3/oración, N2=1/oración, N3=3/texto');
console.log('✅ Formato N0: 2-4 oraciones (hasta 5), 3-6 palabras (hasta 10) - TODO EN MAYÚSCULAS');
console.log('✅ Formato N1: 3-5 oraciones (hasta 6), 4-8 palabras (hasta 12) - TODO EN MAYÚSCULAS');
console.log('✅ Formato N2: 80-120 palabras, 2-4 párrafos CON saltos de línea - Texto normal');
console.log('✅ Formato N3: 150+ palabras, 4+ párrafos CON saltos de línea - Texto académico');
console.log('✅ N0 y N1: Sin líneas vacías entre oraciones, formato compacto con <br>');
console.log('✅ N2 y N3: Con líneas vacías entre párrafos, formato <br><br>');
console.log('✅ V9: Todos los perfiles con formato visual organizado');
