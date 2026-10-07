// js/simple-emoji-processor.js - Procesador inteligente de emojis CON VALIDACIONES ROBUSTAS
// ✅ V7: NO ELIMINA <br> para preservar saltos de línea en perfil N0
// ============================================================================================

import { buscarEmojiPorPalabra } from './activities/emojis-base-datos.js';

/**
 * Clase para procesar texto y agregar emojis contextuales según perfil
 * Implementa umbral de relevancia del 70% y límites por perfil
 * ✅ V7: Preserva <br> tags durante el procesamiento
 */
export class SimpleEmojiProcessor {
  constructor() {
    // ✅ LÍMITES POR PERFIL
    // N0, N1, N2: límite POR ORACIÓN
    // N3: límite EN TODO EL TEXTO
    this.limitesPorPerfil = {
      'N0': 3,  // Máximo 3 emojis POR ORACIÓN
      'N1': 2,  // Máximo 2 emojis por oración
      'N2': 1,  // Máximo 1 emoji por oración
      'N3': 3   // ✅ NUEVO: Máximo 3 emojis EN TODO EL TEXTO
    };
    
    // ✅ UMBRAL DE RELEVANCIA
    this.umbralRelevancia = 70; // Porcentaje mínimo de relevancia
    
    console.log('🎨 SimpleEmojiProcessor inicializado');
    console.log('📊 Límites por perfil:', this.limitesPorPerfil);
    console.log('🎯 Umbral de relevancia:', this.umbralRelevancia + '%');
    console.log('⭐ N3: Máximo 3 emojis en TODO el texto');
  }
  
  /**
   * Procesa texto completo y agrega emojis según perfil
   * ✅ V7: NO elimina <br> tags
   * @param {string} texto - Texto a procesar
   * @param {string} perfil - Nombre del perfil (N0, N1, N2, N3)
   * @returns {string} Texto con emojis agregados
   */
  procesarTextoConEmojis(texto, perfil) {
    console.log(`\n🔄 Procesando texto para perfil ${perfil}...`);
    
    // ✅ VALIDACIÓN: Texto debe ser string válido
    if (!texto || typeof texto !== 'string') {
      console.warn('⚠️ Texto inválido, retornando vacío');
      return '';
    }
    
    const limite = this.limitesPorPerfil[perfil] || 0;
    
    if (limite === 0) {
      console.log(`⭐️ Perfil ${perfil} sin emojis automáticos`);
      return texto;
    }
    
    // ✅ NUEVO: Manejo especial para N3 (límite en TODO el texto, no por oración)
    if (perfil === 'N3') {
      console.log(`📚 Perfil N3: Máximo ${limite} emojis EN TODO EL TEXTO`);
      return this.procesarTextoN3(texto, limite);
    }
    
    console.log(`📝 Límite de emojis: ${limite} por oración`);
    
    try {
      // ✅ V7: NO limpiar HTML aquí para preservar <br>
      // El texto ya viene limpio desde ai-engine.js
      // Solo necesitamos procesar los emojis
      
      // 1. Dividir en oraciones (respetando <br>)
      const oraciones = this.dividirEnOracionesConBR(texto);
      console.log(`📄 Oraciones detectadas: ${oraciones.length}`);
      
      // 2. Procesar cada oración
      const oracionesConEmojis = oraciones.map((oracion, idx) => {
        console.log(`\n  🔍 Procesando oración ${idx + 1}/${oraciones.length}`);
        return this.procesarOracion(oracion, limite, idx + 1);
      });
      
      // 3. Reconstruir texto manteniendo <br>
      const resultado = oracionesConEmojis.join('');
      
      console.log(`✅ Procesamiento completado\n`);
      return resultado;
      
    } catch (error) {
      console.error('❌ Error en procesarTextoConEmojis:', error);
      return texto; // Retornar texto original en caso de error
    }
  }
  
  /**
   * ✅ V7: NUEVA FUNCIÓN - Divide en oraciones respetando <br>
   * @param {string} texto - Texto con posibles <br>
   * @returns {Array} Array de oraciones
   */
  dividirEnOracionesConBR(texto) {
    if (!texto || typeof texto !== 'string') {
      return [];
    }
    
    try {
      // Dividir por <br> primero
      const lineas = texto.split(/<br\s*\/?>/i);
      
      // Cada línea es una oración completa
      return lineas
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .map(l => l + '<br>'); // Agregar <br> al final de cada línea
      
    } catch (error) {
      console.warn('⚠️ Error dividiendo por <br>:', error.message);
      return [texto]; // Retornar texto completo
    }
  }
  
  /**
   * ✅ NUEVO V8: Procesa texto N3 con máximo 3 emojis EN TODO EL TEXTO
   * @param {string} texto - Texto completo a procesar
   * @param {number} limiteTotal - Máximo de emojis permitidos en todo el texto
   * @returns {string} Texto con emojis insertados
   */
  procesarTextoN3(texto, limiteTotal) {
    console.log('\n📚 === PROCESAMIENTO ESPECIAL N3 ===');
    console.log(`🎯 Límite: ${limiteTotal} emojis EN TODO EL TEXTO\n`);
    
    try {
      // 1. Limpiar para análisis (sin modificar original)
      const textoParaAnalisis = texto.replace(/<br\s*\/?>/gi, ' ').trim();
      
      // 2. Buscar TODAS las coincidencias en el texto completo
      console.log('🔍 Buscando coincidencias en texto completo...');
      const todasLasCoincidencias = this.buscarCoincidenciasEnTexto(textoParaAnalisis);
      
      if (todasLasCoincidencias.length === 0) {
        console.log('⚠️ No se encontraron coincidencias relevantes');
        return texto;
      }
      
      console.log(`✅ ${todasLasCoincidencias.length} coincidencias encontradas`);
      
      // 3. Filtrar por umbral de relevancia
      const coincidenciasRelevantes = todasLasCoincidencias.filter(c => 
        c.relevancia >= this.umbralRelevancia
      );
      
      if (coincidenciasRelevantes.length === 0) {
        console.log(`⚠️ Ninguna coincidencia supera umbral ${this.umbralRelevancia}%`);
        return texto;
      }
      
      console.log(`✅ ${coincidenciasRelevantes.length} coincidencias relevantes (>${this.umbralRelevancia}%)`);
      
      // 4. Ordenar por relevancia (mayor a menor)
      coincidenciasRelevantes.sort((a, b) => b.relevancia - a.relevancia);
      
      // 5. Seleccionar SOLO los mejores 3 emojis
      const mejoresEmojis = coincidenciasRelevantes.slice(0, limiteTotal);
      
      console.log(`\n🎯 SELECCIONADOS: ${mejoresEmojis.length}/${limiteTotal} emojis`);
      mejoresEmojis.forEach((e, i) => {
        console.log(`   ${i + 1}. "${e.palabra}" → ${e.emoji} (${e.relevancia}% - ${e.tipo})`);
      });
      
      // 6. Insertar emojis en el texto sin duplicar
      let resultado = texto;
      const emojisUsados = new Set();
      
      for (const {palabra, emoji} of mejoresEmojis) {
        if (!emojisUsados.has(emoji) && !resultado.includes(emoji)) {
          resultado = this.insertarEmojiCercaDePalabra(resultado, palabra, emoji);
          emojisUsados.add(emoji);
          console.log(`   ✅ Insertado: ${emoji} cerca de "${palabra}"`);
        }
      }
      
      console.log('\n✅ Procesamiento N3 completado\n');
      return resultado;
      
    } catch (error) {
      console.error('❌ Error en procesarTextoN3:', error);
      return texto;
    }
  }
  
  /**
   * Procesa una oración individual
   * @param {string} oracion - Oración a procesar
   * @param {number} limiteEmojis - Máximo de emojis permitidos
   * @param {number} numeroOracion - Número de oración (para logs)
   * @returns {string} Oración con emojis
   */
  procesarOracion(oracion, limiteEmojis, numeroOracion) {
    // ✅ VALIDACIÓN: Oración debe ser string válido
    if (!oracion || typeof oracion !== 'string') {
      console.warn(`    ⚠️ Oración ${numeroOracion}: Inválida, omitiendo`);
      return '';
    }
    
    try {
      // Limpiar solo para análisis (sin modificar original)
      const oracionParaAnalisis = oracion.replace(/<br\s*\/?>/gi, ' ').trim();
      
      // Buscar coincidencias en base de datos
      const coincidencias = this.buscarCoincidenciasEnTexto(oracionParaAnalisis);
      
      if (coincidencias.length === 0) {
        console.log(`    ⚠️ Oración ${numeroOracion}: Sin coincidencias relevantes`);
        return oracion;
      }
      
      console.log(`    ✓ Oración ${numeroOracion}: ${coincidencias.length} coincidencias encontradas`);
      
      // Filtrar por umbral de relevancia
      const coincidenciasRelevantes = coincidencias.filter(c => 
        c.relevancia >= this.umbralRelevancia
      );
      
      if (coincidenciasRelevantes.length === 0) {
        console.log(`    ⚠️ Oración ${numeroOracion}: Ninguna coincidencia supera umbral ${this.umbralRelevancia}%`);
        return oracion;
      }
      
      console.log(`    ✓ Oración ${numeroOracion}: ${coincidenciasRelevantes.length} coincidencias relevantes (>${this.umbralRelevancia}%)`);
      
      // Ordenar por relevancia (mayor a menor)
      coincidenciasRelevantes.sort((a, b) => b.relevancia - a.relevancia);
      
      // Tomar solo las mejores según límite
      const mejoresEmojis = coincidenciasRelevantes.slice(0, limiteEmojis);
      
      console.log(`    📌 Oración ${numeroOracion}: Seleccionados ${mejoresEmojis.length}/${limiteEmojis} emojis`);
      mejoresEmojis.forEach((e, i) => {
        console.log(`       ${i + 1}. "${e.palabra}" → ${e.emoji} (${e.relevancia}%)`);
      });
      
      // Insertar emojis sin duplicar
      let resultado = oracion;
      const emojisUsados = new Set();
      
      for (const {palabra, emoji, relevancia} of mejoresEmojis) {
        if (!emojisUsados.has(emoji) && !resultado.includes(emoji)) {
          resultado = this.insertarEmojiCercaDePalabra(resultado, palabra, emoji);
          emojisUsados.add(emoji);
        }
      }
      
      return resultado;
      
    } catch (error) {
      console.error(`    ❌ Error procesando oración ${numeroOracion}:`, error);
      return oracion; // Retornar oración original en caso de error
    }
  }
  
  /**
   * Busca coincidencias de palabras en la base de datos de emojis
   * @param {string} texto - Texto donde buscar
   * @returns {Array} Array de coincidencias con relevancia
   */
  buscarCoincidenciasEnTexto(texto) {
    // ✅ VALIDACIÓN: Texto debe ser string válido
    if (!texto || typeof texto !== 'string') {
      return [];
    }
    
    try {
      const palabras = texto.toLowerCase()
        .replace(/[.,!?;:]/g, ' ')
        .split(/\s+/)
        .filter(p => p.length > 2); // Solo palabras de 3+ letras
      
      const coincidencias = [];
      
      for (const palabra of palabras) {
        const resultados = buscarEmojiPorPalabra(palabra);
        
        if (resultados && resultados.length > 0) {
          for (const resultado of resultados) {
            // Calcular relevancia
            const relevancia = this.calcularRelevancia(palabra, resultado.palabraClave);
            
            if (relevancia >= this.umbralRelevancia) {
              coincidencias.push({
                palabra: palabra,
                palabraClave: resultado.palabraClave,
                emoji: resultado.emoji,
                categoria: resultado.categoria,
                relevancia: relevancia,
                tipo: this.determinarTipoEmoji(resultado.categoria)
              });
            }
          }
        }
      }
      
      // Ordenar: Descriptivos primero, luego emocionales
      coincidencias.sort((a, b) => {
        if (a.tipo !== b.tipo) {
          return a.tipo === 'descriptivo' ? -1 : 1;
        }
        return b.relevancia - a.relevancia;
      });
      
      return coincidencias;
      
    } catch (error) {
      console.warn('⚠️ Error buscando coincidencias:', error.message);
      return [];
    }
  }
  
  /**
   * Calcula la relevancia de una coincidencia
   * @param {string} palabraBuscada - Palabra en el texto
   * @param {string} palabraClave - Palabra en la BBDD
   * @returns {number} Porcentaje de relevancia (0-100)
   */
  calcularRelevancia(palabraBuscada, palabraClave) {
    if (!palabraBuscada || !palabraClave) return 0;
    
    palabraBuscada = palabraBuscada.toLowerCase();
    palabraClave = palabraClave.toLowerCase();
    
    // Coincidencia exacta = 100%
    if (palabraBuscada === palabraClave) return 100;
    
    // Coincidencia por inclusión
    if (palabraBuscada.includes(palabraClave)) return 90;
    if (palabraClave.includes(palabraBuscada)) return 85;
    
    // Coincidencia por similitud (simple)
    const similitud = this.calcularSimilitud(palabraBuscada, palabraClave);
    return Math.round(similitud * 100);
  }
  
  /**
   * Calcula similitud entre dos palabras
   * @param {string} a - Primera palabra
   * @param {string} b - Segunda palabra
   * @returns {number} Similitud (0-1)
   */
  calcularSimilitud(a, b) {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    
    const maxLen = Math.max(a.length, b.length);
    let coincidencias = 0;
    
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) coincidencias++;
    }
    
    return coincidencias / maxLen;
  }
  
  /**
   * Determina el tipo de emoji
   * @param {string} categoria - Categoría del emoji
   * @returns {string} 'descriptivo' o 'emocional'
   */
  determinarTipoEmoji(categoria) {
    return this.esEmojiDescriptivo(categoria) ? 'descriptivo' : 'emocional';
  }
  
  /**
   * Determina si un emoji es descriptivo
   * @param {string} categoria - Categoría del emoji
   * @returns {boolean}
   */
  esEmojiDescriptivo(categoria) {
    if (!categoria) return false;
    
    const categoriasDescriptivas = [
      'NATURALES', 'MATEMATICAS', 'MUSICA', 'DEPORTES', 
      'SOCIALES', 'ARTE', 'COMUNICACION', 'BIOLOGIA',
      'CIENCIA', 'FISICA', 'GEOGRAFIA', 'HISTORIA',
      'LENGUA', 'QUIMICA', 'TECNOLOGIA'
    ];
    return categoriasDescriptivas.includes(categoria.toUpperCase());
  }
  
  /**
   * Determina si un emoji es emocional
   * @param {string} categoria - Categoría del emoji
   * @returns {boolean}
   */
  esEmojiEmocional(categoria) {
    if (!categoria) return false;
    return categoria.toUpperCase() === 'EXPRESIONES';
  }
  
  /**
   * Inserta emoji cerca de la palabra encontrada
   * @param {string} texto - Texto original
   * @param {string} palabra - Palabra a buscar
   * @param {string} emoji - Emoji a insertar
   * @returns {string} Texto con emoji insertado
   */
  insertarEmojiCercaDePalabra(texto, palabra, emoji) {
    // ✅ VALIDACIÓN
    if (!texto || !palabra || !emoji) {
      return texto;
    }
    
    try {
      // Buscar la palabra (case insensitive)
      const regex = new RegExp(`\\b${palabra}\\b`, 'i');
      const match = texto.match(regex);
      
      if (!match) return texto;
      
      const posicion = match.index + match[0].length;
      
      // Insertar emoji después de la palabra
      return texto.slice(0, posicion) + ' ' + emoji + texto.slice(posicion);
      
    } catch (error) {
      console.warn('⚠️ Error insertando emoji:', error.message);
      return texto;
    }
  }
  
  /**
   * ✅ V7: YA NO SE USA - Mantenido por compatibilidad
   * @deprecated Ahora se usa dividirEnOracionesConBR()
   */
  dividirEnOraciones(texto) {
    if (!texto || typeof texto !== 'string') {
      return [];
    }
    
    try {
      return texto
        .split(/[.!?]+/)
        .map(o => o ? o.trim() : '')
        .filter(o => o && o.length > 0);
    } catch (error) {
      console.warn('⚠️ Error dividiendo en oraciones:', error.message);
      return [texto];
    }
  }
  
  /**
   * ✅ V7: YA NO SE USA - Mantenido por compatibilidad
   * @deprecated El texto ya viene sin HTML desde ai-engine.js
   */
  limpiarHTML(texto) {
    if (!texto || typeof texto !== 'string') {
      return '';
    }
    
    // ✅ V7: Ya no eliminar tags HTML para preservar <br>
    return texto;
  }
}

// Export por defecto
export default SimpleEmojiProcessor;

// Logging
console.log('🎨 simple-emoji-processor.js V8 CON SOPORTE PARA N3');
console.log('✅ Umbral de relevancia: 70%');
console.log('📊 Límites: N0=3/oración, N1=2/oración, N2=1/oración, N3=3/texto');
console.log('🎯 Prioridad: Descriptivos > Emocionales > Ninguno');
console.log('🛡️ Validaciones defensivas implementadas');
console.log('✅ V7: PRESERVA <br> tags para saltos de línea');
console.log('✅ V8: N3 con máximo 3 emojis EN TODO EL TEXTO');
