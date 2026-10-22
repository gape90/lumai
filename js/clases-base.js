// js/clases-base.js - Busca si hay una clase base para la materia y el tema elegidos
// =============================================================================
// Las clases base (contenidos/clases/*.json) son explicaciones fijas de 1.° año
// (NAP) en formato de cápsulas. Si el tema que escribió el alumno coincide con
// una de ellas, LumAI la muestra en lugar de pedirle la explicación a la IA.
//
// La coincidencia se busca por materia (exacta) y por tema: el título de la
// clase o alguna de sus palabras_clave (contenidos/indice.json).
// Solo se usan en Ciclo Básico, porque son clases de 1.° año.
// =============================================================================

import { cargarIndice, cargarClase } from './clase-renderer.js';

export function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Devuelve la entrada del índice que mejor coincide, o null
export function elegirClase(indice, materia, tema) {
  const m = normalizarTexto(materia);
  const t = normalizarTexto(tema);
  if (!t || t.length < 3) return null;
  let mejor = null;
  let puntaje = 0;
  for (const c of indice.clases || []) {
    if (normalizarTexto(c.materia) !== m) continue;
    if (normalizarTexto(c.titulo) === t) return c;
    for (const clave of [c.titulo, ...(c.palabras_clave || [])]) {
      const k = normalizarTexto(clave);
      if (k.length < 3) continue;
      const coincide = t.includes(k) || (t.length >= 5 && k.includes(t));
      const p = coincide ? Math.min(k.length, t.length) : 0;
      if (p > puntaje) { puntaje = p; mejor = c; }
    }
  }
  return mejor;
}

export function esCicloBasico(ciclo) {
  const c = normalizarTexto(ciclo);
  return !c || c.includes('basico');
}

// Busca y carga la clase base. Nunca lanza error: si algo falla, devuelve null
// y LumAI sigue con la explicación generada por IA.
export async function buscarClaseBase({ materia, tema, ciclo }) {
  try {
    if (!esCicloBasico(ciclo)) return null;
    const indice = await cargarIndice();
    const entrada = elegirClase(indice, materia, tema);
    return entrada ? await cargarClase(entrada.id) : null;
  } catch (error) {
    console.warn('⚠️ No se pudieron consultar las clases base:', error);
    return null;
  }
}
