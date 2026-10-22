// js/adaptacion.js - Adapta una clase base al perfil del alumno (13 dimensiones)
// =============================================================================
// No se guardan versiones adaptadas: la clase base es una sola y la adaptación
// se calcula al abrirla, aplicando reglas fijas (contenidos/reglas-adaptacion.json).
//
//   perfil  = { lectoescritura: 'extenso', atencion: 'limitado', ... }
//             (las dimensiones que no aparecen se toman como 'tipico')
//   ajustes = calcularAjustes(perfil, reglas, materia)
//             -> { capsulas, texto, voz, letra, ..., motivos: [...] }
//   renderizarClase(clase, contenedor, { ...opciones, ajustes })
//
// Combinación: si dos dimensiones mueven la misma perilla, gana el apoyo mayor.
// Ningún dato del perfil se envía a la IA.
// =============================================================================

const ORDEN_TEXTO = ['completo', 'con_simple', 'simple'];

export const AJUSTES_BASE = {
  capsulas: 'todas',
  texto: 'completo',
  mayusculas: false,
  letra: 0,
  voz: 0,
  voz_sin_auto: false,
  definiciones_abiertas: false,
  opciones: 3,
  pista_previa: false,
  sin_puntaje: false,
  recordar_acumulado: false,
  pausa_cada: 0,
  calmo: false,
  botones_grandes: false,
  anticipar: false,
  mas_alla: false,
  sin_tiempos: false
};

function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function combinar(a, clave, valor) {
  switch (clave) {
    case 'capsulas': return a.capsulas === 'esenciales' || valor === 'esenciales' ? 'esenciales' : 'todas';
    case 'texto': return ORDEN_TEXTO[Math.max(ORDEN_TEXTO.indexOf(a.texto), ORDEN_TEXTO.indexOf(valor))];
    case 'letra':
    case 'voz': return Math.max(a[clave], valor);
    case 'opciones': return Math.min(a.opciones, valor);
    case 'pausa_cada': return a.pausa_cada && valor ? Math.min(a.pausa_cada, valor) : (a.pausa_cada || valor);
    default: return Boolean(a[clave]) || Boolean(valor);
  }
}

export function calcularAjustes(perfil = {}, reglas, materia = '') {
  const ajustes = { ...AJUSTES_BASE, motivos: [] };
  if (!reglas?.dimensiones) return ajustes;
  const nombreGrado = Object.fromEntries((reglas.grados || []).map(g => [g.id, g.nombre]));
  for (const dim of reglas.dimensiones) {
    const grado = perfil[dim.id] || 'tipico';
    if (grado === 'tipico') continue;
    if (dim.solo_materias && !dim.solo_materias.some(m => normalizar(m) === normalizar(materia))) continue;
    const cambios = dim.grados?.[grado] || {};
    const claves = Object.keys(cambios);
    if (!claves.length) continue;
    claves.forEach(k => { if (k in AJUSTES_BASE) ajustes[k] = combinar(ajustes, k, cambios[k]); });
    ajustes.motivos.push({ dimension: dim.nombre, grado: nombreGrado[grado] || grado, perillas: claves, fundamento: dim.fundamento });
  }
  if (ajustes.voz_sin_auto && ajustes.voz > 1) ajustes.voz = 1;
  return ajustes;
}

export function perfilDesdePlantilla(reglas, nivel) {
  return { ...(reglas?.plantillas?.[nivel]?.perfil || {}) };
}

export async function cargarReglas(ruta = 'contenidos/reglas-adaptacion.json') {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error('No se encontraron las reglas de adaptación');
  return r.json();
}

// Descripción breve de cada perilla activa (para el docente y la vista previa)
export function describirAjustes(a) {
  const d = [];
  if (a.capsulas === 'esenciales') d.push('Solo las cápsulas esenciales');
  if (a.texto === 'con_simple') d.push('Versión fácil abierta debajo del texto');
  if (a.texto === 'simple') d.push('Versión fácil como texto principal');
  if (a.mayusculas) d.push('Texto en mayúsculas');
  if (a.letra) d.push(a.letra > 1 ? 'Letra muy grande' : 'Letra grande');
  if (a.voz === 1) d.push('Botón para escuchar cada cápsula');
  if (a.voz === 2) d.push('Lectura en voz alta automática');
  if (a.definiciones_abiertas) d.push('Palabras clave definidas a la vista');
  if (a.opciones === 2) d.push('Preguntas con 2 opciones');
  if (a.pista_previa) d.push('Pista disponible antes de responder');
  if (a.sin_puntaje) d.push('Sin puntaje');
  if (a.recordar_acumulado) d.push('Repaso de lo anterior al empezar cada cápsula');
  if (a.pausa_cada) d.push(`Pausa cada ${a.pausa_cada === 1 ? 'cápsula' : `${a.pausa_cada} cápsulas`}`);
  if (a.calmo) d.push('Modo calmo');
  if (a.botones_grandes) d.push('Botones grandes');
  if (a.anticipar) d.push('Anticipa qué viene en cada paso');
  if (a.mas_alla) d.push('Desafío para ir más allá');
  if (a.sin_tiempos) d.push('Sin tiempos estimados');
  return d;
}
