// js/activities/activity-sopa-de-letras.js - Nueva Lógica Pedagógica con Gramática Perfeccionada + DEBUG + CORRECCIONES
// ===============================================================================================================

import { estadoGlobal, generarPromptHibrido } from '../config.js';
import { llamarGeminiAPI } from '../ai-engine.js';

// IMPORTACIONES PARA NUEVA LÓGICA PEDAGÓGICA
import { 
    completarRespuesta, 
    completarActividadCompleta,
    extraerPalabrasClave
} from '../activities-manager.js';

let gameInstance = null;

// ==================== CONFIGURACIÓN ADAPTATIVA ====================
function obtenerConfiguracionSopa() {
    const nivel = estadoGlobal.perfil.dimensiones.razonamiento_logico;
    const configuraciones = {
        "bajo": { 
            gridSize: 10, 
            allowDiagonal: false, 
            allowReverse: false, 
            cantidadPalabras: 3,
            descripcion: "Básico - Grid 10x10, solo horizontal/vertical" 
        },
        "medio": { 
            gridSize: 12, 
            allowDiagonal: false, 
            allowReverse: true, 
            cantidadPalabras: 4,
            descripcion: "Intermedio - Grid 12x12, + dirección reversa" 
        },
        "alto": { 
            gridSize: 14, 
            allowDiagonal: true, 
            allowReverse: true, 
            cantidadPalabras: 5,
            descripcion: "Avanzado - Grid 14x14, + diagonales y reversa" 
        }
    };
    return configuraciones[nivel] || configuraciones["medio"];
}

// ==================== VALIDACIÓN DE COHERENCIA DE PISTAS ====================

function validarCoherenciaPista(palabra, pista) {
    if (!palabra || !pista) return false;
    
    const palabraLower = palabra.toLowerCase();
    const pistaLower = pista.toLowerCase();
    
    // DETECTAR FRAGMENTOS INCOHERENTES
    const fragmentosIncoherentes = [
        /música sonidos/i,      // "música sonidos" es incoherente
        /líneas notas/i,        // "líneas notas" es incoherente  
        /sonidos música/i,      // "sonidos música" es incoherente
        /notas líneas/i,        // "notas líneas" es incoherente
        /pentagrama música/i,   // "pentagrama música" es redundante
        /música pentagrama/i    // "música pentagrama" es incoherente
    ];
    
    // VERIFICAR SI CONTIENE FRAGMENTOS INCOHERENTES
    for (const fragmento of fragmentosIncoherentes) {
        if (fragmento.test(pistaLower)) {
            console.warn(`FRAGMENTO INCOHERENTE DETECTADO: "${pista}" contiene patrón inválido`);
            return false;
        }
    }
    
    // VALIDACIONES ESPECÍFICAS POR PALABRA
    if (palabraLower.includes('pentagrama')) {
        return pistaLower.includes('línea') || pistaLower.includes('música') || pistaLower.includes('notación');
    }
    
    if (palabraLower.includes('notas')) {
        return pistaLower.includes('sonido') || pistaLower.includes('musical') || pistaLower.includes('símbolo') || pistaLower.includes('representan');
    }
    
    if (palabraLower.includes('clave')) {
        return pistaLower.includes('símbolo') || pistaLower.includes('musical') || pistaLower.includes('altura');
    }
    
    // VALIDACIÓN GENERAL: La pista debe ser una oración coherente
    const esOracionCompleta = pistaLower.includes(' ') && 
                             !pistaLower.startsWith(' ') && 
                             !pistaLower.endsWith(' ') &&
                             pistaLower.length > 5;
    
    return esOracionCompleta;
}

// ==================== GENERADOR DE PISTAS COHERENTES FALLBACK ====================

function generarPistaCoherente(palabra) {
    const palabraLower = palabra.toLowerCase();
    const perfilNivel = estadoGlobal.perfil.dimensiones.comprension_lectora;
    
    const pistasCoherentes = {
        'pentagrama': {
            'bajo': ['cinco líneas para música', 'líneas donde van notas', 'sistema de cinco líneas'],
            'medio': ['conjunto de cinco líneas paralelas', 'sistema utilizado en notación musical'],
            'alto': ['sistema compuesto por cinco líneas paralelas utilizado en la notación musical', 'conjunto de líneas y espacios donde se escriben las notas musicales']
        },
        'notas': {
            'bajo': ['sonidos musicales escritos', 'símbolos de música'],
            'medio': ['símbolos que representan sonidos musicales', 'elementos de la notación musical'],
            'alto': ['símbolos que representan sonidos musicales con altura y duración específicas', 'elementos fundamentales de la notación musical escritos en el pentagrama']
        },
        'clave': {
            'bajo': ['símbolo musical importante', 'signo del pentagrama'],
            'medio': ['símbolo que indica la altura musical', 'determina la posición de las notas'],
            'alto': ['símbolo colocado al inicio del pentagrama que determina la altura de las notas musicales', 'elemento fundamental que establece la referencia tonal en la notación musical']
        },
        'compás': {
            'bajo': ['organiza el tiempo musical', 'divide la música'],
            'medio': ['organiza el tiempo en la música', 'divide la música en partes iguales'],
            'alto': ['sistema que organiza y divide el tiempo musical en unidades regulares', 'estructura que indica la cantidad de tiempos en cada medida musical']
        },
        'melodía': {
            'bajo': ['sucesión de sonidos musicales', 'línea principal musical'],
            'medio': ['sucesión organizada de sonidos musicales', 'línea principal de una canción'],
            'alto': ['sucesión coherente y organizada de sonidos musicales que forman una línea melódica', 'secuencia de notas musicales organizadas que constituyen la parte principal de una composición']
        }
    };
    
    // BUSCAR PISTA ESPECÍFICA
    for (const [concepto, pistasPorNivel] of Object.entries(pistasCoherentes)) {
        if (palabraLower.includes(concepto)) {
            const pistasNivel = pistasPorNivel[perfilNivel] || pistasPorNivel['medio'];
            const pistaAleatoria = pistasNivel[Math.floor(Math.random() * pistasNivel.length)];
            console.log(`GENERADA PISTA COHERENTE para ${palabra}: "${pistaAleatoria}"`);
            return pistaAleatoria;
        }
    }
    
    // FALLBACK GENERAL ADAPTADO POR NIVEL
    const fallbacks = {
        'bajo': `concepto de ${estadoGlobal.tema || 'la materia'}`,
        'medio': `elemento importante de ${estadoGlobal.tema || 'la materia educativa'}`,
        'alto': `concepto fundamental relacionado con ${estadoGlobal.tema || 'el contenido educativo específico'}`
    };
    
    return fallbacks[perfilNivel] || fallbacks['medio'];
}

// ==================== FUNCIONES DE CORRECCIÓN GRAMATICAL AVANZADAS + DEBUG ====================

function corregirGramaticaPista(pista) {
    if (!pista || typeof pista !== 'string') return pista;
    
    // DEBUG: Log inicial
    const pistaOriginal = pista.trim();
    console.log(`DEBUG CORRECCIÓN GRAMATICAL:`);
    console.log(`   Pista original: "${pistaOriginal}"`);
    
    let pistaCorregida = pistaOriginal;
    
    // NUEVAS CORRECCIONES ESPECÍFICAS PARA FRAGMENTOS INCOHERENTES
    const correccionesIncoherentes = [
        { patron: /música sonidos/gi, reemplazo: 'símbolos que representan sonidos musicales' },
        { patron: /sonidos música/gi, reemplazo: 'elementos de la música' },
        { patron: /líneas notas/gi, reemplazo: 'líneas donde se escriben las notas' },
        { patron: /notas líneas/gi, reemplazo: 'notas escritas en líneas' },
        { patron: /pentagrama música/gi, reemplazo: 'pentagrama utilizado en música' },
        { patron: /música pentagrama/gi, reemplazo: 'música escrita en pentagrama' }
    ];
    
    // APLICAR CORRECCIONES DE FRAGMENTOS INCOHERENTES
    let seCorrigieroIncoherencias = false;
    for (const {patron, reemplazo} of correccionesIncoherentes) {
        if (patron.test(pistaCorregida)) {
            console.log(`CORRIGIENDO FRAGMENTO INCOHERENTE:`);
            console.log(`   Antes: "${pistaCorregida}"`);
            pistaCorregida = pistaCorregida.replace(patron, reemplazo);
            console.log(`   Después: "${pistaCorregida}"`);
            seCorrigieroIncoherencias = true;
        }
    }
    
    // Lista de sustantivos que son típicamente singulares en contexto educativo
    const sustantivosSingulares = [
        'pentagrama', 'sistema solar', 'ciclo del agua', 'fotosíntesis',
        'respiración', 'digestión', 'circulación', 'esqueleto',
        'corazón', 'cerebro', 'hígado', 'estómago',
        'arte rupestre', 'renacimiento', 'revolución industrial'
    ];
    
    // Lista de sustantivos que son típicamente plurales
    const sustantivosPlurales = [
        'dibujos', 'pinturas', 'animales', 'plantas', 'personas',
        'notas musicales', 'líneas', 'símbolos', 'colores',
        'sonidos', 'instrumentos', 'obras'
    ];
    
    // Función auxiliar para detectar si un sustantivo debe ser singular
    function debeSerSingular(sustantivo) {
        const sustantivoLower = sustantivo.toLowerCase().trim();
        
        for (const sing of sustantivosSingulares) {
            if (sustantivoLower.includes(sing)) {
                return true;
            }
        }
        
        if (sustantivoLower === 'pentagrama' || sustantivoLower === 'pentagramas') {
            return true;
        }
        
        return false;
    }
    
    // DEBUG: Verificar si es una pista relacionada con pentagrama
    const esRelacionadoConPentagrama = pistaOriginal.toLowerCase().includes('pentagrama') || 
                                      pistaOriginal.toLowerCase().includes('línea') ||
                                      pistaOriginal.toLowerCase().includes('cinco');
    
    if (esRelacionadoConPentagrama) {
        console.log(`PENTAGRAMA DETECTADO: "${pistaOriginal}"`);
    }
    
    // MEJORAS CONTEXTUALES ESPECÍFICAS PARA PISTAS
    const mejoras_contextuales = [
        // Música
        { patron: /sistema de la cinco líneas para música/i, reemplazo: 'sistema compuesto por cinco líneas utilizado para la música' },
        { patron: /sistema de cinco líneas para música/i, reemplazo: 'sistema compuesto por cinco líneas utilizado para la música' },
        { patron: /sirve para escribir notas/i, reemplazo: 'sirve para escribir notas musicales' },
        { patron: /donde se escriben notas/i, reemplazo: 'donde se escriben las notas musicales' },
        
        // DEBUG: Nuevos patrones específicos para pentagrama
        { patron: /^cinco líneas$/i, reemplazo: 'conjunto compuesto por cinco líneas' },
        { patron: /cinco líneas para música/i, reemplazo: 'conjunto de cinco líneas utilizado para la música' },
        { patron: /líneas música/i, reemplazo: 'conjunto de líneas utilizado para la música' },
        
        // Arte rupestre
        { patron: /tipo de pinturas en cuevas/i, reemplazo: 'tipo de arte prehistórico realizado en cuevas' },
        { patron: /pinturas de personas antiguas/i, reemplazo: 'arte realizado por personas en la prehistoria' },
        
        // Correcciones de fragmentos comunes
        { patron: /^para ([a-záéíóúñü]+)/i, reemplazo: 'se usa para $1' },
        { patron: /^donde ([a-záéíóúñü]+)/i, reemplazo: 'lugar donde $1' },
        { patron: /^como ([a-záéíóúñü]+)/i, reemplazo: 'manera como $1' },
    ];
    
    // DEBUG: Aplicar mejoras contextuales con logging
    for (const {patron, reemplazo} of mejoras_contextuales) {
        if (patron.test(pistaCorregida)) {
            console.log(`APLICANDO MEJORA CONTEXTUAL:`);
            console.log(`   Patrón: ${patron}`);
            console.log(`   Antes: "${pistaCorregida}"`);
            pistaCorregida = pistaCorregida.replace(patron, reemplazo);
            console.log(`   Después: "${pistaCorregida}"`);
        }
    }
    
    // ===== CORRECCIONES ESPECÍFICAS DE GRAMÁTICA =====
    
    // 1. **MEJORADO**: "sirve para X" → hacer más específico y gramaticalmente correcto
    const antesServir = pistaCorregida;
    pistaCorregida = pistaCorregida.replace(
        /sirve para ([^.]+)/gi,
        (match, complemento) => {
            const complementoLimpio = complemento.trim();
            
            console.log(`PROCESANDO "sirve para": "${complemento}"`);
            
            // Casos específicos conocidos
            if (complementoLimpio.includes('pentagrama') || complementoLimpio.includes('música')) {
                return 'se utiliza para escribir música';
            }
            if (complementoLimpio.includes('notas')) {
                return 'sirve para escribir notas musicales';
            }
            if (complementoLimpio.includes('dibujo') || complementoLimpio.includes('pintar')) {
                return 'se usa para crear arte';
            }
            
            // Si ya tiene artículo, mantenerlo
            if (/^(el|la|los|las)\s/i.test(complementoLimpio)) {
                return `sirve para ${complementoLimpio}`;
            }
            
            // Decidir artículo apropiado
            if (debeSerSingular(complementoLimpio)) {
                const sustantivoSingular = complementoLimpio.replace(/s$/, '');
                return `sirve para el ${sustantivoSingular}`;
            } else if (complementoLimpio.endsWith('s') || sustantivosPlurales.some(p => complementoLimpio.includes(p))) {
                return `sirve para los ${complementoLimpio}`;
            } else {
                return `sirve para el ${complementoLimpio}`;
            }
        }
    );
    
    if (antesServir !== pistaCorregida) {
        console.log(`CORRECCIÓN "sirve para" aplicada: "${antesServir}" → "${pistaCorregida}"`);
    }
    
    // 2. "se usa para X" → mejorar descripción
    pistaCorregida = pistaCorregida.replace(
        /se usa para ([^.]+)/gi,
        (match, complemento) => {
            const complementoLimpio = complemento.trim();
            
            // Casos específicos más descriptivos
            if (complementoLimpio.includes('música') || complementoLimpio.includes('musical')) {
                return 'se utiliza en la notación musical';
            }
            if (complementoLimpio.includes('notas')) {
                return 'se usa para representar notas musicales';
            }
            
            if (/^(el|la|los|las)\s/i.test(complementoLimpio)) {
                return `se usa para ${complementoLimpio}`;
            }
            
            if (debeSerSingular(complementoLimpio)) {
                const sustantivoSingular = complementoLimpio.replace(/s$/, '');
                return `se usa para el ${sustantivoSingular}`;
            } else if (complementoLimpio.endsWith('s')) {
                return `se usa para los ${complementoLimpio}`;
            } else {
                return `se usa para el ${complementoLimpio}`;
            }
        }
    );
    
    // 3. "sistema de X" → mejorar a "sistema compuesto por X"
    const antesSistema = pistaCorregida;
    pistaCorregida = pistaCorregida.replace(
        /sistema de ([^.]+)/gi,
        (match, complemento) => {
            const complementoLimpio = complemento.trim();
            
            console.log(`PROCESANDO "sistema de": "${complemento}"`);
            
            // Casos específicos mejorados
            if (complementoLimpio.includes('líneas') || complementoLimpio.includes('línea')) {
                return 'sistema compuesto por líneas paralelas';
            }
            if (complementoLimpio.includes('cinco')) {
                return 'sistema compuesto por cinco elementos';
            }
            if (complementoLimpio.includes('música') || complementoLimpio.includes('musical')) {
                return 'sistema utilizado en la notación musical';
            }
            
            // Corrección general
            if (!/^(el|la|los|las)\s/i.test(complementoLimpio)) {
                if (complementoLimpio.endsWith('s')) {
                    return `sistema compuesto por ${complementoLimpio}`;
                } else {
                    return `sistema compuesto por ${complementoLimpio}`;
                }
            }
            return `sistema compuesto por ${complementoLimpio}`;
        }
    );
    
    if (antesSistema !== pistaCorregida) {
        console.log(`CORRECCIÓN "sistema de" aplicada: "${antesSistema}" → "${pistaCorregida}"`);
    }
    
    // 4. "tiene X líneas" → "está compuesto por X líneas"
    pistaCorregida = pistaCorregida.replace(
        /tiene (\d+) línea(?:s)?/gi,
        (match, numero) => {
            const num = parseInt(numero);
            return num === 1 ? `está compuesto por ${numero} línea` : `está compuesto por ${numero} líneas`;
        }
    );
    
    // 5. **NUEVO**: Patrones específicos para mejorar descripciones educativas
    const mejorasDescriptivas = [
        // Pentagrama específico
        { patron: /pentagrama para música/i, reemplazo: 'sistema de notación musical compuesto por cinco líneas' },
        { patron: /cinco líneas para música/i, reemplazo: 'sistema de cinco líneas paralelas usado en música' },
        
        // Arte rupestre
        { patron: /pinturas en cuevas/i, reemplazo: 'manifestaciones artísticas prehistóricas en cuevas' },
        { patron: /arte de personas antiguas/i, reemplazo: 'expresiones artísticas de civilizaciones prehistóricas' },
        
        // Conceptos generales
        { patron: /^tipo de ([a-záéíóúñü\s]+)/i, reemplazo: 'modalidad específica de $1' },
        { patron: /^forma de ([a-záéíóúñü\s]+)/i, reemplazo: 'manera particular de $1' },
    ];
    
    mejorasDescriptivas.forEach(mejora => {
        pistaCorregida = pistaCorregida.replace(mejora.patron, mejora.reemplazo);
    });
    
    // 6. Correcciones específicas conocidas
    pistaCorregida = pistaCorregida.replace(/pentagramas/gi, 'pentagrama');
    pistaCorregida = pistaCorregida.replace(/los pentagrama/gi, 'el pentagrama');
    pistaCorregida = pistaCorregida.replace(/las pentagrama/gi, 'el pentagrama');
    
    // 7. "conjunto de X" → "conjunto compuesto por X"
    const antesConjunto = pistaCorregida;
    pistaCorregida = pistaCorregida.replace(
        /conjunto de ([^.]+)/gi,
        (match, complemento) => {
            const complementoLimpio = complemento.trim();
            console.log(`PROCESANDO "conjunto de": "${complemento}"`);
            return `conjunto compuesto por ${complementoLimpio}`;
        }
    );
    
    if (antesConjunto !== pistaCorregida) {
        console.log(`CORRECCIÓN "conjunto de" aplicada: "${antesConjunto}" → "${pistaCorregida}"`);
    }
    
    // 8. Mejorar fragmentos incompletos
    const fragmentosMejorados = [
        { patron: /^se utiliza$/i, reemplazo: 'se utiliza en el ámbito educativo' },
        { patron: /^sirve$/i, reemplazo: 'sirve como herramienta educativa' },
        { patron: /^sistema$/i, reemplazo: 'sistema organizativo' },
    ];
    
    fragmentosMejorados.forEach(fragmento => {
        pistaCorregida = pistaCorregida.replace(fragmento.patron, fragmento.reemplazo);
    });
    
    // 9. Capitalizar primera letra si no está
    pistaCorregida = pistaCorregida.charAt(0).toUpperCase() + pistaCorregida.slice(1);
    
    // 10. Limpiar espacios múltiples
    pistaCorregida = pistaCorregida.replace(/\s+/g, ' ').trim();
    
    // DEBUG: Log final con indicación de corrección de incoherencias
    console.log(`RESULTADO FINAL: "${pistaCorregida}"`);
    console.log(`CAMBIÓ: ${pistaOriginal !== pistaCorregida ? 'SÍ' : 'NO'}`);
    if (seCorrigieroIncoherencias) {
        console.log(`SE CORRIGIERON INCOHERENCIAS GRAMATICALES`);
    }
    
    if (esRelacionadoConPentagrama) {
        console.log(`RESULTADO PENTAGRAMA: "${pistaOriginal}" → "${pistaCorregida}"`);
    }
    
    return pistaCorregida;
}

function corregirGramaticaPalabra(palabra) {
    if (!palabra || typeof palabra !== 'string') return palabra;
    
    let palabraCorregida = palabra.trim().toUpperCase();
    
    // Correcciones específicas de palabras
    const correccionesPalabras = [
        ['PENTAGRAMAS', 'PENTAGRAMA'],
        ['SISTEMASOLARES', 'SISTEMASOLAR'],
        ['ARTERUPESTRES', 'ARTERUPESTRE'],
        ['MUSICALES', 'MUSICA'],
        ['SONIDOS', 'SONIDO']
    ];
    
    correccionesPalabras.forEach(([incorrecto, correcto]) => {
        if (palabraCorregida === incorrecto) {
            palabraCorregida = correcto;
        }
    });
    
    return palabraCorregida;
}

// ==================== GENERACIÓN DE ACTIVIDADES CON IA + DEBUG ====================
export async function generarActividad() {
    console.log("Generando actividad Sopa de Letras con IA...");
    
    try {
        const config = obtenerConfiguracionSopa();
        console.log(`Configuración para ${estadoGlobal.perfil.nombre_visible}: ${config.descripcion}`);
        
        const actividadesIA = await generarPalabrasConIA();
        
        if (actividadesIA && actividadesIA.length >= config.cantidadPalabras) {
            console.log("Palabras generadas exitosamente con IA");
            return {
                tipo: "sopa-de-letras",
                actividades: actividadesIA.slice(0, config.cantidadPalabras),
                configuracion: config,
                instrucciones: "Encuentra las palabras ocultas en el tablero"
            };
        } else {
            console.warn("IA generó pocas palabras, usando fallback");
            throw new Error("Palabras insuficientes de IA");
        }
        
    } catch (error) {
        console.error("Error generando con IA:", error);
        return generarActividadesFallback();
    }
}

async function generarPalabrasConIA() {
    const adaptaciones = obtenerAdaptacionesSegunPerfil();
    const explicacion = estadoGlobal.explicacionGenerada;
    const config = obtenerConfiguracionSopa();
    const cantidadRequerida = config.cantidadPalabras;
    
    console.log(`GENERANDO PALABRAS CON IA - Perfil: ${estadoGlobal.perfil.nombre_visible}`);
    
    const prompt = `
Eres un experto en educación inclusiva creando palabras para "Sopa de Letras" para ${estadoGlobal.perfil.nombre_visible}.

PERFIL DEL ESTUDIANTE: ${estadoGlobal.perfil.nombre_visible}
${adaptaciones}

EXPLICACIÓN EDUCATIVA:
"""${explicacion}"""

REGLAS CRÍTICAS PARA PISTAS COHERENTES Y ESPECÍFICAS:

## EJEMPLOS OBLIGATORIOS DE PISTAS CORRECTAS:
- PENTAGRAMA → "conjunto de cinco líneas paralelas"
- NOTAS → "símbolos que representan sonidos musicales"
- CLAVE → "símbolo que indica la altura musical"
- COMPÁS → "organiza el tiempo en la música"
- MELODÍA → "sucesión de sonidos musicales"

## REGLAS GRAMATICALES OBLIGATORIAS:
- La pista DEBE ser una descripción completa y coherente
- NO usar fragmentos como "música sonidos" o "líneas notas"
- SÍ usar oraciones completas: "símbolos musicales escritos en el pentagrama"
- Cada pista debe hacer sentido gramaticalmente en español

## PATRONES CORRECTOS:
✅ CORRECTO: "símbolos que representan sonidos musicales" (para NOTAS)
❌ INCORRECTO: "música sonidos" (incoherente)

✅ CORRECTO: "conjunto de cinco líneas paralelas" (para PENTAGRAMA)  
❌ INCORRECTO: "cinco líneas música" (incompleto)

✅ CORRECTO: "organiza el tiempo musical" (para COMPÁS)
❌ INCORRECTO: "tiempo música" (incoherente)

## LÍMITES DE PALABRAS POR NIVEL:
- **N1: MÁXIMO 6 PALABRAS** por pista (ejemplo: "sonidos musicales que se escriben")
- **N2: MÁXIMO 8 PALABRAS** por pista (ejemplo: "símbolos que representan sonidos musicales en el pentagrama")
- **N3: SIN LÍMITE** pero mantener claridad

## VERIFICACIÓN OBLIGATORIA ANTES DE GENERAR:
1. ¿La pista describe correctamente la palabra?
2. ¿Es gramaticalmente correcta en español?
3. ¿Tiene sentido semántico completo?
4. ¿Evita fragmentos confusos como "música sonidos"?
5. ¿Respeta el límite de palabras para el nivel?

## REGLAS ESPECIALES PARA NIVEL N1 (MÁXIMO 6 PALABRAS):
- NOTAS → "sonidos musicales que se escriben" (5 palabras)
- PENTAGRAMA → "cinco líneas para escribir música" (5 palabras)
- CLAVE → "símbolo musical muy importante" (4 palabras)

## REGLAS ESPECIALES PARA NIVEL N2 (MÁXIMO 8 PALABRAS):
- NOTAS → "símbolos que representan sonidos musicales escritos" (6 palabras)
- PENTAGRAMA → "conjunto de cinco líneas paralelas para música" (7 palabras)
- CLAVE → "símbolo que indica la altura de notas" (7 palabras)

INSTRUCCIONES CRÍTICAS:
- Genera EXACTAMENTE ${cantidadRequerida} pares de "palabra":"pista" basados 100% en la explicación
- La "palabra" debe ser un concepto CLAVE de la explicación educativa
- La "pista" DEBE ser gramaticalmente correcta y semánticamente coherente
- VERIFICAR 3 VECES que cada pista sea una descripción válida de la palabra
- NO generar fragmentos incoherentes como "música sonidos"
- RESPETAR LÍMITES DE PALABRAS POR NIVEL

FORMATO DE RESPUESTA (JSON):
\`\`\`json
[
${Array.from({length: cantidadRequerida}, (_, i) => 
  `  {
    "palabra": "CONCEPTO${i+1}",
    "pista": "Descripción completa y coherente del concepto ${i+1}"
  }`).join(',\n')}
]
\`\`\`

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional
- TRIPLE verificación de coherencia gramatical y semántica
- Evitar completamente fragmentos como "música sonidos", "líneas notas"
- Usar descripciones completas y educativamente precisas
- RESPETAR ESTRICTAMENTE LOS LÍMITES DE PALABRAS
`;

    try {
        const respuesta = await llamarGeminiAPI(prompt, 3000, 0.7);
        
        // ✅ LIMPIEZA DE JSON MEJORADA PARA GEMINI 2.5
        let jsonLimpio = respuesta
            .replace(/```json\n?/gi, "")
            .replace(/```\n?/g, "")
            .replace(/^[^[{]*/, "")  // ✅ Elimina TODO antes del primer [ o {
            .replace(/[^\]}]*$/, "")  // ✅ Elimina TODO después del último ] o }
            .trim();
        
        // DEBUG: Log de respuesta de IA
        console.log(`RESPUESTA BRUTA DE IA:`);
        console.log(jsonLimpio.substring(0, 500) + (jsonLimpio.length > 500 ? '...' : ''));
        
        const actividades = JSON.parse(jsonLimpio);
        
        if (Array.isArray(actividades) && actividades.length >= cantidadRequerida) {
            console.log(`Generadas ${actividades.length} palabras para perfil ${estadoGlobal.perfil.dimensiones.razonamiento_logico}`);
            
            // DEBUG: Log de actividades antes de corrección
            actividades.forEach((act, index) => {
                console.log(`ACTIVIDAD ${index + 1} GENERADA POR IA:`);
                console.log(`   Palabra: "${act.palabra}"`);
                console.log(`   Pista: "${act.pista}"`);
                
                // VALIDACIÓN DE COHERENCIA Y LÍMITE DE PALABRAS
                if (validarCoherenciaPista(act.palabra, act.pista)) {
                    console.log(`PISTA COHERENTE para ${act.palabra}`);
                } else {
                    console.warn(`PISTA INCOHERENTE para ${act.palabra}: "${act.pista}"`);
                }
                
                const cantidadPalabras = act.pista ? act.pista.split(' ').length : 0;
                const perfil = estadoGlobal.perfil.dimensiones.comprension_lectora;
                const limite = perfil === 'bajo' ? 6 : perfil === 'medio' ? 8 : 999;
                
                if (cantidadPalabras <= limite) {
                    console.log(`LÍMITE RESPETADO: ${cantidadPalabras}/${limite} palabras`);
                } else {
                    console.warn(`LÍMITE EXCEDIDO: ${cantidadPalabras}/${limite} palabras`);
                }
            });
            
            // APLICAR CORRECCIÓN CON VALIDACIÓN ADICIONAL
            const actividadesCorregidas = actividades.slice(0, cantidadRequerida).map((actividad, index) => {
                console.log(`\nPROCESANDO ACTIVIDAD ${index + 1}:`);
                
                const palabraCorregida = corregirGramaticaPalabra(actividad.palabra || `CONCEPTO${Date.now()}`);
                let pistaCorregida = corregirGramaticaPista(actividad.pista || "Encuentra esta palabra relacionada con el tema");
                
                // VALIDACIÓN FINAL Y CORRECCIÓN DE PISTAS INCOHERENTES
                if (!validarCoherenciaPista(palabraCorregida, pistaCorregida)) {
                    console.warn(`CORRIGIENDO PISTA INCOHERENTE para ${palabraCorregida}`);
                    pistaCorregida = generarPistaCoherente(palabraCorregida);
                }
                
                console.log(`RESULTADO ACTIVIDAD ${index + 1}:`);
                console.log(`   Palabra final: "${palabraCorregida}"`);
                console.log(`   Pista final: "${pistaCorregida}"`);
                
                return {
                    palabra: palabraCorregida,
                    pista: pistaCorregida
                };
            });
            
            return actividadesCorregidas;
        } else {
            throw new Error(`IA generó solo ${actividades.length} palabras, se requieren ${cantidadRequerida}`);
        }
        
    } catch (error) {
        console.error("Error procesando respuesta de IA:", error);
        throw error;
    }
}

// FUNCIÓN CORREGIDA - obtenerAdaptacionesSegunPerfil() con nuevos límites
function obtenerAdaptacionesSegunPerfil() {
    const perfil = estadoGlobal.perfil;
    const nivel = perfil.dimensiones.comprension_lectora;
    
    const adaptacionesPorNivel = {
        "bajo": `
ADAPTACIONES ESPECIALES PARA N1:
- Palabras MUY SIMPLES de 3-5 letras
- Pistas CLARAS: MÁXIMO 6 PALABRAS
- Vocabulario de primaria (evitar "sistema", "compuesto", "utiliza")
- EJEMPLOS CORRECTOS:
  * PENTAGRAMA → "cinco líneas para escribir música" (5 palabras)
  * PENTAGRAMA → "líneas donde van las notas" (5 palabras)
  * NOTAS → "sonidos musicales que se escriben" (5 palabras)
- EVITAR COMPLETAMENTE: descripciones largas, contexto adicional, gramática compleja
- PRIORIDAD MÁXIMA: CLARIDAD y SIMPLICIDAD
- LÍMITE ESTRICTO: MÁXIMO 6 PALABRAS POR PISTA`,

        "medio": `
ADAPTACIONES MODERADAS PARA N2:
- Palabras de 4-7 letras  
- Pistas claras: MÁXIMO 8 PALABRAS
- Vocabulario accesible pero preciso
- Puede usar algunos términos técnicos básicos
- EJEMPLOS CORRECTOS:
  * PENTAGRAMA → "conjunto de cinco líneas paralelas para música" (7 palabras)
  * NOTAS → "símbolos que representan sonidos musicales escritos" (6 palabras)
- LÍMITE ESTRICTO: MÁXIMO 8 PALABRAS POR PISTA`,

        "alto": `
ADAPTACIONES AVANZADAS PARA N3:
- Palabras de 5-8 letras
- Pistas pueden ser elaboradas y técnicas
- Vocabulario específico de la materia
- Gramática compleja permitida
- Sin límite estricto de palabras, pero mantener claridad
- EJEMPLOS CORRECTOS:
  * PENTAGRAMA → "sistema compuesto por cinco líneas paralelas utilizado en la notación musical"
  * NOTAS → "símbolos que representan sonidos musicales con altura y duración específicas"`
    };
    
    return adaptacionesPorNivel[nivel] || adaptacionesPorNivel["medio"];
}

// ==================== EXTRACCIÓN DE PALABRAS CLAVE DESDE LA EXPLICACIÓN ====================
function extraerPalabrasClaveDeHTML(html) {
    if (!html) {
        console.warn('No hay explicación HTML para extraer palabras');
        return [];
    }
    
    // Limpiar HTML
    const textoLimpio = html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .toLowerCase()
        .replace(/[^\wáéíóúñü\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Stop words expandidas + verbos comunes
    const stopWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
        'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para', 'sin',
        'y', 'o', 'u', 'e', 'que', 'como', 'es', 'son', 'está', 'están',
        'su', 'sus', 'mi', 'mis', 'tu', 'tus', 'se', 'le', 'lo', 'me',
        'más', 'muy', 'tan', 'también', 'pero', 'si', 'no',
        
        // ✅ VERBOS A FILTRAR (expandido)
        'tiene', 'tienen', 'tengo', 'tener', 'tenía', 'tenían',
        'vive', 'viven', 'vivir', 'vivía', 'vivían',
        'hace', 'hacen', 'hacer', 'hacemos', 'hacía', 'hacían',
        'escribe', 'escriben', 'escribir', 'escribimos', 'escribía', 'escribían',
        'sube', 'suben', 'subir', 'subía', 'subían',
        'baja', 'bajan', 'bajar', 'bajaba', 'bajaban',
        'sabe', 'saben', 'saber', 'sabemos', 'sabía', 'sabían',
        'puede', 'pueden', 'poder', 'podemos', 'podía', 'podían',
        'debe', 'deben', 'deber', 'debemos', 'debía', 'debían',
        'sirve', 'sirven', 'servir', 'servía', 'servían',
        'usa', 'usan', 'usar', 'usaba', 'usaban',
        'utiliza', 'utilizan', 'utilizar', 'utilizaba', 'utilizaban',
        'forma', 'forman', 'formar', 'formaba', 'formaban',
        'crea', 'crean', 'crear', 'creaba', 'creaban',
        'representa', 'representan', 'representar', 'representaba', 'representaban',
        
        // ✅ DETERMINANTES Y PRONOMBRES
        'cada', 'otro', 'otra', 'otros', 'otras',
        'este', 'esta', 'estos', 'estas',
        'ese', 'esa', 'esos', 'esas',
        'aquel', 'aquella', 'aquellos', 'aquellas',
        'cual', 'cuales', 'quien', 'quienes',
        
        // Palabras adicionales a evitar
        'adelante', 'seguimos', 'siguen', 'seguir', 'siguiente'
    ]);
    
    // Contar frecuencia de palabras
    const palabras = textoLimpio.split(/\s+/);
    const frecuencia = {};
    
    palabras.forEach(palabra => {
        // Filtrar palabras muy cortas o stop words
        if (palabra.length <= 2 || stopWords.has(palabra)) {
            return;
        }
        
        // ✅ FILTRO ADICIONAL: Terminaciones verbales
        if (palabra.endsWith('mos') ||    // escribimos, hacemos
            palabra.endsWith('ís') ||     // podéis
            palabra.endsWith('en') ||     // viven, tienen
            palabra.endsWith('ía') ||     // tenía, vivía
            palabra.endsWith('ían') ||    // tenían, vivían
            palabra.endsWith('er') ||     // tener, hacer
            palabra.endsWith('ir') ||     // vivir, escribir
            palabra.endsWith('ar')) {     // bajar, tocar
            return;
        }
        
        frecuencia[palabra] = (frecuencia[palabra] || 0) + 1;
    });
    
    // Ordenar por frecuencia y tomar las 15 más relevantes
    const palabrasClave = Object.entries(frecuencia)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(entry => entry[0]);
    
    console.log(`📊 Palabras clave extraídas: ${palabrasClave.join(', ')}`);
    return palabrasClave;
}

function generarActividadesFallback() {
    console.log("🔄 Generando actividad Sopa de Letras con fallback INTELIGENTE");
    
    const config = obtenerConfiguracionSopa();
    const tema = estadoGlobal.tema || 'el tema';
    const explicacion = estadoGlobal.explicacionGenerada || '';
    const cantidadRequerida = config.cantidadPalabras;
    
    // ✅ EXTRAER PALABRAS CLAVE REALES DE LA EXPLICACIÓN
    const palabrasClave = extraerPalabrasClaveDeHTML(explicacion);
    
    if (palabrasClave.length < cantidadRequerida) {
        console.warn(`⚠️ Solo se extrajeron ${palabrasClave.length} palabras, se requieren ${cantidadRequerida}`);
    }
    
    const palabrasGeneradas = [];
    
    for (let i = 0; i < cantidadRequerida; i++) {
        let palabra, pista;
        
        if (i < palabrasClave.length) {
            // ✅ USAR PALABRA REAL EXTRAÍDA
            const palabraClave = palabrasClave[i];
            palabra = palabraClave.toUpperCase();
            
            // ✅ GENERAR PISTA COHERENTE
            const temaLower = tema.toLowerCase();
            const palabraLower = palabraClave.toLowerCase();
            
            // Si la palabra ES el tema
            if (palabraLower === temaLower) {
                pista = `¿Qué aprendimos sobre ${palabraClave}?`;
            } else {
                // Si NO es el tema
                pista = `Concepto relacionado con ${tema}`;
            }
            
            console.log(`📝 Palabra ${i + 1}: "${palabra}" - Pista: "${pista}"`);
        } else {
            // ❌ FALLBACK GENÉRICO (solo si no hay suficientes palabras)
            palabra = `CONCEPTO${i + 1}`;
            pista = `Concepto educativo número ${i + 1} relacionado con ${tema}`;
            console.warn(`⚠️ Usando fallback genérico para palabra ${i + 1}`);
        }
        
        palabrasGeneradas.push({ palabra, pista });
    }
    
    console.log(`✅ Generadas ${palabrasGeneradas.length} palabras con fallback inteligente`);
    
    return {
        tipo: "sopa-de-letras",
        actividades: palabrasGeneradas,
        configuracion: config,
        instrucciones: "Encuentra las palabras ocultas en el tablero",
        esFallback: true
    };
}

// ==================== RENDERIZADO ====================
export async function renderizar() {
    console.log("Renderizando actividad Sopa de Letras...");
    
    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (!actividadesEl) {
        console.error("Elemento de actividades no encontrado");
        return;
    }
    
    const config = estadoGlobal.actividadActual.configuracion || obtenerConfiguracionSopa();
    const cantidadPalabras = estadoGlobal.actividadActual.actividades.length;
    const esFallback = estadoGlobal.actividadActual.esFallback || false;
    
    // Crear contenedor para el juego
    actividadesEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #00509e; margin-bottom: 15px;">Sopa de Letras</h2>
            <p style="margin-bottom: 10px; color: #666;">
                <strong>Instrucciones:</strong> Encuentra las palabras ocultas en el tablero
            </p>
            <div id="sopa-game-container" style="margin: 20px auto; max-width: 600px;"></div>
        </div>
    `;
    
    const palabras = estadoGlobal.actividadActual.actividades;
    gameInstance = new SopaDeLetrasGame('sopa-game-container', palabras, config);
    
    // Resetear contadores para nueva sesión
    gameInstance.resetearContadores();
    
    // Callbacks corregidos para LUMAI
    gameInstance.setCallbacks(
        (palabra, progreso) => {
            console.log('Callback: Palabra encontrada en Sopa de Letras');
        },
        
        (palabra, progreso) => {
            console.log('Callback: Palabra no encontrada en Sopa de Letras');
        },
        
        (actividad_dominada) => {
            console.log(`CALLBACK JUEGO COMPLETADO:`);
            console.log(`Actividad dominada: ${actividad_dominada}`);
            
            if (actividad_dominada) {
                // ACTIVIDAD DOMINADA - Encontró todas las palabras
                console.log(`LLAMANDO completarActividadCompleta(true) - ACTIVIDAD DOMINADA`);
                setTimeout(() => {
                    completarActividadCompleta(true);
                }, 800);
            } else {
                // 3 errores acumulados - Continuar en rotación
                console.log(`LLAMANDO completarActividadCompleta(false) - CONTINUAR EN ROTACIÓN`);
                setTimeout(() => {
                    completarActividadCompleta(false);
                }, 800);
            }
        }
    );
    
    console.log(`Sopa de Letras renderizada - ${cantidadPalabras} palabras con lógica pedagógica y gramática perfeccionada`);
}

function crearHTMLJuego(config) {
    return `
        <style>
            .sopa-game {
                background: linear-gradient(135deg, #2c3e50, #3498db);
                color: #ecf0f1;
                font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                border-radius: 18px;
                overflow: hidden;
                max-width: 500px; /* REDUCIDO: era 600px, ahora 500px */
                margin: 0 auto;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            
            .sopa-hud {
                display: flex;
                gap: 12px; /* REDUCIDO: era 16px, ahora 12px */
                align-items: center;
                justify-content: center;
                background: rgba(44, 62, 80, 0.9);
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding: 8px; /* REDUCIDO: era 12px, ahora 8px */
            }
            
            .sopa-hud strong { color: #fff; }
            
            .sopa-content {
                padding: 15px; /* REDUCIDO: era 20px, ahora 15px */
            }
            
            .sopa-pista {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 10px; /* REDUCIDO: era 12px, ahora 10px */
                padding: 12px; /* REDUCIDO: era 16px, ahora 12px */
                text-align: center;
                font-size: 16px; /* REDUCIDO: era 18px, ahora 16px */
                font-weight: 600;
                margin-bottom: 15px; /* REDUCIDO: era 20px, ahora 15px */
                color: #fff;
                line-height: 1.3; /* REDUCIDO: era 1.4, ahora 1.3 */
                min-height: 40px; /* REDUCIDO: era 50px, ahora 40px */
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .sopa-tablero {
                display: grid;
                grid-template-columns: repeat(${config.gridSize}, 1fr);
                gap: 2px; /* REDUCIDO 25% ADICIONAL: era 3px, ahora 2px */
                justify-content: center;
                margin-bottom: 15px; /* REDUCIDO: era 20px, ahora 15px */
                background: rgba(255, 255, 255, 0.05);
                padding: 8px; /* REDUCIDO 25% ADICIONAL: era 12px, ahora 8px */
                border-radius: 10px; /* REDUCIDO: era 12px, ahora 10px */
            }
            
            .sopa-celda {
                aspect-ratio: 1 / 1;
                background-color: rgba(255, 255, 255, 0.9);
                color: #2c3e50;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-weight: bold; /* AGREGADO: letras en negrita */
                border-radius: 4px; /* REDUCIDO: era 6px, ahora 4px */
                transition: all 0.2s ease;
                user-select: none;
                font-size: 10px; /* REDUCIDO 25% ADICIONAL: era 13px, ahora 10px */
                min-height: 18px; /* REDUCIDO 25% ADICIONAL: era 24px, ahora 18px */
            }
            
            .sopa-celda:hover {
                background-color: rgba(255, 255, 255, 1);
                transform: scale(1.05); /* REDUCIDO: era 1.1, ahora 1.05 */
                box-shadow: 0 2px 6px rgba(0,0,0,0.2); /* REDUCIDO: era 8px, ahora 6px */
            }
            
            .sopa-seleccionada {
                background-color: #ffd700 !important;
                color: #2c3e50;
                transform: scale(1.03); /* REDUCIDO: era 1.05, ahora 1.03 */
                font-weight: bold; /* AGREGADO: mantener negrita en selección */
            }
            
            .sopa-encontrada {
                background-color: #28a745 !important;
                color: white;
                font-weight: bold; /* AGREGADO: mantener negrita en encontradas */
            }
            
            .sopa-incorrecta {
                background-color: #dc3545 !important;
                color: white;
                font-weight: bold; /* AGREGADO: mantener negrita en incorrectas */
            }
            
            .sopa-pista-letra {
                background-color: rgba(255, 215, 0, 0.3) !important;
                box-shadow: 0 0 6px 1px rgba(255, 215, 0, 0.4); /* REDUCIDO: era 8px 2px, ahora 6px 1px */
                font-weight: bold; /* AGREGADO: mantener negrita en pistas */
            }
            
            .sopa-overlay {
                position: absolute;
                inset: 0;
                display: grid;
                place-items: center;
                background: rgba(44, 62, 80, 0.9);
                backdrop-filter: blur(5px);
                z-index: 50;
                padding: 16px;
            }
            
            .sopa-card {
                background: rgba(255, 255, 255, 0.95);
                color: #2c3e50;
                border-radius: 20px;
                padding: 32px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            
            .sopa-card h2 {
                margin: 0 0 16px;
                font-size: 28px;
                color: #2c3e50;
            }
            
            .sopa-card p {
                margin: 12px 0 20px;
                font-size: 16px;
                color: #666;
                line-height: 1.4;
            }
            
            .sopa-btn {
                background: linear-gradient(180deg, #3498db, #2980b9);
                border: none;
                color: white;
                font-weight: 800;
                padding: 10px 20px; /* REDUCIDO: era 12px 24px, ahora 10px 20px */
                border-radius: 10px; /* REDUCIDO: era 12px, ahora 10px */
                cursor: pointer;
                font-size: 14px; /* REDUCIDO: era 16px, ahora 14px */
                margin: 6px; /* REDUCIDO: era 8px, ahora 6px */
            }
            
            .sopa-btn:hover {
                transform: translateY(-1px);
            }
            
            .sopa-btn:active {
                transform: translateY(1px);
            }
            
            .sopa-btn:disabled {
                background: #95a5a6;
                cursor: not-allowed;
                transform: none;
            }
            
            .sopa-toast {
                position: absolute;
                top: 15px; /* REDUCIDO: era 20px, ahora 15px */
                right: 15px; /* REDUCIDO: era 20px, ahora 15px */
                background: rgba(44, 62, 80, 0.9);
                color: #fff;
                border-radius: 10px; /* REDUCIDO: era 12px, ahora 10px */
                padding: 10px 16px; /* REDUCIDO: era 12px 20px, ahora 10px 16px */
                font-size: 16px; /* REDUCIDO: era 18px, ahora 16px */
                font-weight: 700;
                z-index: 60;
                display: none;
            }
            
            @media (max-width: 768px) {
                .sopa-pista {
                    font-size: 14px; /* REDUCIDO: era 16px, ahora 14px */
                    padding: 10px; /* REDUCIDO: era 12px, ahora 10px */
                }
                
                .sopa-celda {
                    font-size: 8px; /* REDUCIDO: era 14px, ahora 8px */
                    font-weight: bold; /* AGREGADO: mantener negrita en móviles */
                }
                
                .sopa-content {
                    padding: 10px; /* AÑADIDO: para móviles más compacto */
                }
            }
        </style>
        
        <div class="sopa-game">
            <div class="sopa-hud">
                <div><strong>Puntaje:</strong> <span id="sopa-score">0</span></div>
                <div><strong>Ronda:</strong> <span id="sopa-round">1</span></div>
            </div>
            
            <div class="sopa-content">
                <div class="sopa-pista" id="sopa-pista">
                    Preparando palabra...
                </div>
                
                <div class="sopa-tablero" id="sopa-tablero">
                    <!-- Grid generado dinámicamente -->
                </div>
                
                <div style="text-align: center;">
                    <button class="sopa-btn" id="sopa-btn-verificar">Verificar</button>
                    <button class="sopa-btn" id="sopa-btn-start" style="display: none;">Comenzar</button>
                </div>
                
                <div class="sopa-toast" id="sopa-toast"></div>
            </div>
        </div>
    `;
}

// ==================== CLASE DEL JUEGO SOPA DE LETRAS - NUEVA LÓGICA PEDAGÓGICA ====================

class SopaDeLetrasGame {
    constructor(containerId, palabras = null, configuracion = null) {
        this.containerId = containerId;
        
        // Configuración adaptativa del juego
        this.configuracion = configuracion || {
            gridSize: 10,
            allowDiagonal: false,
            allowReverse: true,
            cantidadPalabras: 4
        };
        
        // Palabras del juego
        this.palabras = palabras || this.getPalabrasPorDefecto();
        
        // NUEVA LÓGICA PEDAGÓGICA (igual que Multiple Choice y Carrera)
        this.erroresAcumulados = 0;           // Errores totales en toda la actividad
        this.maxErrores = 3;                  // Máximo 3 errores
        this.palabrasIncorrectas = [];        // Índices de palabras no encontradas
        this.rondaActual = 1;                 // Ronda actual (1 = primera vez, 2+ = repeticiones)
        this.todasLasPalabrasMostradas = false; // Si ya mostró todas las palabras una vez
        
        // Estado del juego (mantener diseño visual)
        this.estado = {
            corriendo: false,
            palabraActual: null,
            indicePalabraGlobal: 0,          // Índice en el array original de palabras
            indicePalabraRonda: 0,           // Índice en la ronda actual
            palabrasRondaActual: [],         // Palabras de la ronda actual
            juegoTerminado: false,
            seleccion: [],
            palabraCoords: [],
            grid: [],
            
            // Puntaje (mantener para interfaz)
            puntos: 0
        };
        
        // Callbacks para Lumai
        this.onPalabraEncontrada = null;
        this.onPalabraNoEncontrada = null;
        this.onJuegoCompletado = null;
        
        console.log(`Sopa de Letras configurada: ${this.palabras.length} palabras, lógica pedagógica implementada`);
        
        this.init();
    }
    
    // Método resetear contadores
    resetearContadores() {
        this.erroresAcumulados = 0;
        this.palabrasIncorrectas = [];
        this.rondaActual = 1;
        this.todasLasPalabrasMostradas = false;
        console.log("Contadores de Sopa de Letras reseteados para nueva sesión");
    }
    
    // Métodos públicos para lumai
    setCallbacks(onEncontrada, onNoEncontrada, onCompletado) {
        this.onPalabraEncontrada = onEncontrada;
        this.onPalabraNoEncontrada = onNoEncontrada;
        this.onJuegoCompletado = onCompletado;
    }
    
    init() {
        this.createGameHTML();
        this.setupEventListeners();
        this.mostrarPantallaInicio();
    }
    
    createGameHTML() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = crearHTMLJuego(this.configuracion);
        
        // Obtener referencias a elementos
        this.elementos = {
            content: container.querySelector('.sopa-content'),
            pista: container.querySelector('#sopa-pista'),
            tablero: container.querySelector('#sopa-tablero'),
            btnVerificar: container.querySelector('#sopa-btn-verificar'),
            btnStart: container.querySelector('#sopa-btn-start'),
            toast: container.querySelector('#sopa-toast'),
            score: container.querySelector('#sopa-score'),
            round: container.querySelector('#sopa-round')
        };
    }
    
    setupEventListeners() {
        // Botón de verificar
        this.elementos.btnVerificar.addEventListener('click', () => {
            this.verificarSeleccion();
        });
        
        // Botón de inicio
        this.elementos.btnStart.addEventListener('click', () => {
            this.iniciarJuego();
        });
    }
    
    getPalabrasPorDefecto() {
        return [
            { palabra: "HOLA", pista: "Saludo común utilizado al encontrarse con alguien" },
            { palabra: "MUNDO", pista: "Planeta donde vivimos y desarrollamos nuestras actividades" },
            { palabra: "JUEGO", pista: "Actividad recreativa que realizamos para entretenernos" }
        ];
    }
    
    // NUEVA LÓGICA: Preparar palabras de la ronda
    prepararRonda() {
        if (this.rondaActual === 1) {
            // PRIMERA RONDA: Todas las palabras
            this.estado.palabrasRondaActual = [...this.palabras];
            console.log(`RONDA 1: Mostrando todas las ${this.palabras.length} palabras`);
        } else {
            // RONDAS SIGUIENTES: Solo las incorrectas
            this.estado.palabrasRondaActual = this.palabrasIncorrectas.map(indice => this.palabras[indice]);
            console.log(`RONDA ${this.rondaActual}: Repitiendo ${this.estado.palabrasRondaActual.length} palabras no encontradas`);
        }
        
        this.estado.indicePalabraRonda = 0;
    }
    
    mostrarPantallaInicio() {
        this.elementos.pista.innerHTML = `
            <strong>Sopa de Letras</strong><br/>
            Encuentra las palabras ocultas en el tablero
        `;
        this.elementos.btnStart.style.display = 'inline-block';
        this.elementos.btnVerificar.style.display = 'none';
    }
    
    iniciarJuego() {
        this.estado.corriendo = true;
        this.estado.juegoTerminado = false;
        this.estado.puntos = 0;
        
        this.elementos.btnStart.style.display = 'none';
        this.elementos.btnVerificar.style.display = 'inline-block';
        
        this.prepararRonda();
        this.actualizarHUD();
        
        // Iniciar primera palabra
        setTimeout(() => {
            this.generarPalabra();
        }, 500);
    }
    
    // NUEVA LÓGICA: Generar palabra de la ronda actual + DEBUG + BUG FIX
    generarPalabra() {
        // VERIFICAR SI COMPLETÓ TODAS LAS PALABRAS DE LA RONDA
        if (this.estado.indicePalabraRonda >= this.estado.palabrasRondaActual.length) {
            this.completarRonda();
            return;
        }
        
        // Mostrar palabra actual de la ronda
        const palabra = this.estado.palabrasRondaActual[this.estado.indicePalabraRonda];
        this.estado.palabraActual = palabra;
        
        // Encontrar índice global de la palabra (para tracking)
        this.estado.indicePalabraGlobal = this.palabras.findIndex(p => 
            p.palabra === palabra.palabra && 
            p.pista === palabra.pista
        );
        
        // DEBUG: Verificar qué pista se está mostrando
        console.log(`MOSTRANDO PALABRA EN TABLERO:`);
        console.log(`   Palabra: "${palabra.palabra}"`);
        console.log(`   Pista: "${palabra.pista}"`);
        
        if (palabra.palabra.includes('PENTAGRAMA')) {
            console.log(`¡PENTAGRAMA EN TABLERO! Verificar pista mostrada: "${palabra.pista}"`);
        }
        
        // CORREGIDO: AGREGAR ESPACIO DESPUÉS DE "Busca:"
        this.elementos.pista.innerHTML = `<strong>Busca:</strong> ${palabra.pista}`;
        
        this.estado.seleccion = [];
        
        this.crearTablero();
        
        console.log(`Palabra ${this.estado.indicePalabraRonda + 1}/${this.estado.palabrasRondaActual.length}: ${palabra.palabra}`);
        console.log(`Pista: ${palabra.pista}`);
    }
    
    // NUEVA LÓGICA: Completar ronda
    completarRonda() {
        if (this.rondaActual === 1) {
            // Terminó la primera ronda
            this.todasLasPalabrasMostradas = true;
            
            if (this.palabrasIncorrectas.length === 0) {
                // PERFECTO: Encontró todas en la primera ronda
                console.log('PERFECTO: Todas las palabras encontradas en primera ronda');
                this.completarActividad(true);
                return;
            } else {
                // Hay palabras no encontradas, continuar con ronda 2
                console.log(`Primera ronda terminada. ${this.palabrasIncorrectas.length} palabras no encontradas`);
                this.iniciarSiguienteRonda();
            }
        } else {
            // Terminó una ronda de repetición
            if (this.palabrasIncorrectas.length === 0) {
                // ÉXITO: Encontró todas las palabras faltantes
                console.log('ÉXITO: Encontró todas las palabras faltantes');
                this.completarActividad(true);
                return;
            } else {
                // Aún hay palabras no encontradas, continuar
                console.log(`Ronda ${this.rondaActual} terminada. ${this.palabrasIncorrectas.length} palabras aún no encontradas`);
                this.iniciarSiguienteRonda();
            }
        }
    }
    
    iniciarSiguienteRonda() {
        this.rondaActual++;
        console.log(`Iniciando ronda ${this.rondaActual}`);
        
        setTimeout(() => {
            this.prepararRonda();
            this.actualizarHUD();
            this.generarPalabra();
        }, 1000);
    }
    
    completarActividad(exitosa) {
        this.estado.corriendo = false;
        this.estado.juegoTerminado = true;
        
        if (exitosa) {
            console.log('ACTIVIDAD DOMINADA: Encontró todas las palabras');
        } else {
            console.log('MÁXIMO DE ERRORES: Actividad falló, continuar en rotación');
        }
        
        // SOLO ejecutar callback - NO mostrar mensajes propios del juego
        if (this.onJuegoCompletado) {
            this.onJuegoCompletado(exitosa); // true = dominada, false = continuar en rotación
        }
    }
    
    crearTablero() {
        const gridSize = this.configuracion.gridSize;
        let grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(""));
        this.estado.palabraCoords = this.colocarPalabra(grid, this.estado.palabraActual.palabra);
        
        // Llenar con letras aleatorias
        const letras = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (grid[r][c] === "") {
                    grid[r][c] = letras[Math.floor(Math.random() * letras.length)];
                }
            }
        }
        
        this.estado.grid = grid;
        this.renderizarTablero(grid);
    }
    
    colocarPalabra(grid, palabra) {
        let dirs = [{r:0,c:1}, {r:1,c:0}]; // horizontal, vertical
        
        if (this.configuracion.allowReverse) { 
            dirs.push({r:0,c:-1}, {r:-1,c:0}); // reverse horizontal, reverse vertical
        }
        if (this.configuracion.allowDiagonal) { 
            dirs.push({r:1,c:1}, {r:1,c:-1}); // diagonal down-right, diagonal down-left
            if (this.configuracion.allowReverse) { 
                dirs.push({r:-1,c:-1}, {r:-1,c:1}); // diagonal up-left, diagonal up-right
            }
        }
        
        let colocado = false, coords = [];
        let intentos = 0;
        
        // MEJORAR ALGORITMO: Priorizar direcciones que permiten palabras largas
        while(!colocado && intentos < 500) { // Más intentos
            const dir = dirs[Math.floor(Math.random() * dirs.length)];
            const r = Math.floor(Math.random() * this.configuracion.gridSize);
            const c = Math.floor(Math.random() * this.configuracion.gridSize);
            
            if (this.puedeColocar(grid, palabra, r, c, dir)) {
                for (let i = 0; i < palabra.length; i++) {
                    const newRow = r + i*dir.r;
                    const newCol = c + i*dir.c;
                    grid[newRow][newCol] = palabra[i];
                    coords.push({r: newRow, c: newCol});
                }
                colocado = true;
                console.log(`PALABRA "${palabra}" colocada en posición (${r},${c}) dirección (${dir.r},${dir.c})`);
            }
            intentos++;
        }
        
        // FALLBACK: Si no se pudo colocar, forzar horizontal simple
        if (!colocado) {
            console.warn(`No se pudo colocar "${palabra}" normalmente, usando fallback horizontal`);
            const r = Math.floor(this.configuracion.gridSize / 2);
            const maxC = this.configuracion.gridSize - palabra.length;
            if (maxC >= 0) {
                const c = Math.floor(Math.random() * (maxC + 1));
                for (let i = 0; i < palabra.length; i++) {
                    grid[r][c + i] = palabra[i];
                    coords.push({r: r, c: c + i});
                }
                console.log(`FALLBACK: "${palabra}" colocada horizontalmente en (${r},${c})`);
            }
        }
        
        return coords;
    }

    puedeColocar(grid, palabra, r, c, dir) {
        // VALIDACIÓN MEJORADA: Verificar que toda la palabra cabe
        for (let i = 0; i < palabra.length; i++) {
            const nr = r + i*dir.r;
            const nc = c + i*dir.c;
            
            // Verificar límites del grid
            if (nr < 0 || nr >= this.configuracion.gridSize || 
                nc < 0 || nc >= this.configuracion.gridSize) {
                return false;
            }
            
            // Verificar que la celda esté vacía
            if (grid[nr][nc] !== "") {
                return false;
            }
        }
        
        return true;
    }

    renderizarTablero(grid) {
        this.elementos.tablero.innerHTML = "";
        
        // CORREGIDO: Detectar nivel bajo por perfil, no por gridSize
        const esNivelBajo = estadoGlobal.perfil.nombre_visible === 'N1';
        const pistaCoord = esNivelBajo ? this.estado.palabraCoords[0] : null;
        
        console.log(`Nivel detectado: ${estadoGlobal.perfil.nombre_visible}, esNivelBajo: ${esNivelBajo}`);
        if (pistaCoord) {
            console.log(`Mostrando pista visual en coordenada (${pistaCoord.r},${pistaCoord.c})`);
        }
        
        // DEBUG: Mostrar coordenadas de la palabra actual
        console.log(`PALABRA "${this.estado.palabraActual.palabra}" colocada en coordenadas:`, this.estado.palabraCoords);
        
        grid.forEach((fila, r) => {
            fila.forEach((letra, c) => {
                const celda = document.createElement("div");
                celda.className = "sopa-celda";
                celda.textContent = letra;
                celda.dataset.fila = r;
                celda.dataset.col = c;
                
                // Ayuda visual para nivel básico
                if (pistaCoord && r === pistaCoord.r && c === pistaCoord.c) {
                    celda.classList.add('sopa-pista-letra');
                }
                
                celda.addEventListener('click', () => this.seleccionarCelda(celda));
                this.elementos.tablero.appendChild(celda);
            });
        });
    }

    seleccionarCelda(celda) {
        if (this.estado.juegoTerminado || !this.estado.corriendo) return;
        
        celda.classList.toggle("sopa-seleccionada");
        const index = this.estado.seleccion.indexOf(celda);
        
        if (index > -1) {
            this.estado.seleccion.splice(index, 1);
        } else {
            this.estado.seleccion.push(celda);
        }
    }
    
    actualizarHUD() {
        this.elementos.score.textContent = this.estado.puntos;
        this.elementos.round.textContent = this.rondaActual;
    }
    
    mostrarToast(mensaje, duracion = 1200) {
        this.elementos.toast.textContent = mensaje;
        this.elementos.toast.style.display = 'block';
        
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.elementos.toast.style.display = 'none';
        }, duracion);
    }
    
    // NUEVA LÓGICA DE VERIFICACIÓN CON RONDAS Y TRACKING
    verificarSeleccion() {
        // CASO 1: No hay selección
        if (this.estado.seleccion.length === 0) {
            this.mostrarToast('¡Selecciona las letras!');
            return;
        }

        const palabraFormada = this.estado.seleccion.map(c => c.textContent).join('');
        const palabraInvertida = palabraFormada.split('').reverse().join('');
        const palabraObjetivo = this.estado.palabraActual.palabra;
        
        const esCorrecta = palabraFormada === palabraObjetivo || 
                          palabraInvertida === palabraObjetivo;

        // TRACKING SIN DUPLICACIÓN - SOLO recordCustomEvent
        if (window.lumaiTracker) {
            const preguntaTexto = this.estado.palabraActual.pista;
            const respuestaUsuario = palabraFormada;
            const respuestaCorrecta = palabraObjetivo;
            const concepto = this.extraerConcepto(preguntaTexto);
            
            // SOLO ESTE REGISTRO (elimina duplicación)
            window.lumaiTracker.recordCustomEvent('response_recorded', {
                question: preguntaTexto,
                userAnswer: respuestaUsuario,
                correctAnswer: respuestaCorrecta,
                isCorrect: esCorrecta,
                concept: concepto,
                activity: 'Sopa de Letras'
            });
            
            console.log(`TRACKING: ${esCorrecta ? 'CORRECTO' : 'INCORRECTO'} "${preguntaTexto}" - ${respuestaUsuario}`);
        }

        if (esCorrecta) {
            // PALABRA ENCONTRADA
            
            // Si había estado no encontrada, removerla de la lista
            if (this.palabrasIncorrectas.includes(this.estado.indicePalabraGlobal)) {
                this.palabrasIncorrectas = this.palabrasIncorrectas.filter(
                    indice => indice !== this.estado.indicePalabraGlobal
                );
                console.log(`Palabra ${this.estado.indicePalabraGlobal} encontrada. No encontradas restantes: ${this.palabrasIncorrectas.length}`);
            }
            
            this.manejarPalabraEncontrada();
            
            if (this.onPalabraEncontrada) {
                this.onPalabraEncontrada(this.estado.palabraActual, this.estado.indicePalabraRonda + 1);
            }
            
        } else {
            // PALABRA NO ENCONTRADA
            this.erroresAcumulados++;
            
            // Agregar a palabras no encontradas si no está ya
            if (!this.palabrasIncorrectas.includes(this.estado.indicePalabraGlobal)) {
                this.palabrasIncorrectas.push(this.estado.indicePalabraGlobal);
                console.log(`Palabra ${this.estado.indicePalabraGlobal} agregada a no encontradas. Total: ${this.palabrasIncorrectas.length}`);
            }
            
            if (this.onPalabraNoEncontrada) {
                this.onPalabraNoEncontrada(this.estado.palabraActual, this.estado.indicePalabraRonda + 1);
            }
            
            // VERIFICAR MÁXIMO DE ERRORES
            if (this.erroresAcumulados >= this.maxErrores) {
                console.log(`MÁXIMO DE ERRORES ALCANZADO (${this.erroresAcumulados}/${this.maxErrores})`);
                this.mostrarToast('¡UPS! Sigamos con otro', 2000);
                this.actualizarHUD();
                
                // Completar inmediatamente - LUMAI maneja el mensaje
                this.completarActividad(false); // Falló por errores
                return;
            }
            
            this.manejarPalabraNoEncontrada();
        }
        
        this.actualizarHUD();
        
        // Continuar a la siguiente palabra
        setTimeout(() => {
            this.estado.indicePalabraRonda++;
            this.generarPalabra();
        }, 1200);
    }

    manejarPalabraEncontrada() {
        this.estado.puntos += 20;
        this.mostrarToast('¡Encontrada!');
        
        // Marcar celdas como encontradas
        this.estado.seleccion.forEach(c => {
            c.classList.remove('sopa-seleccionada');
            c.classList.add('sopa-encontrada');
        });
        
        this.estado.seleccion = [];
    }

    manejarPalabraNoEncontrada() {
        this.mostrarToast('¡UPS! Esa no es la palabra');
        
        // Mostrar brevemente las celdas incorrectas
        this.estado.seleccion.forEach(c => {
            c.classList.remove('sopa-seleccionada');
            c.classList.add('sopa-incorrecta');
        });
        
        // Limpiar efecto visual después de un momento
        setTimeout(() => {
            this.estado.seleccion.forEach(c => {
                c.classList.remove('sopa-incorrecta');
            });
        }, 1000);
        
        this.estado.seleccion = [];
    }
    
    // FUNCIÓN DE EXTRACCIÓN DE CONCEPTOS
    extraerConcepto(pista) {
        if (!pista) return 'Concepto general';
        
        const pistaLower = pista.toLowerCase();
        
        // Conceptos musicales específicos
        if (pistaLower.includes('pentagrama') || pistaLower.includes('línea')) {
            return 'Pentagrama';
        }
        if (pistaLower.includes('notas') || pistaLower.includes('nota')) {
            return 'Notas musicales';
        }
        if (pistaLower.includes('música') || pistaLower.includes('musical')) {
            return 'Teoría musical';
        }
        
        // Conceptos matemáticos
        if (pistaLower.includes('suma') || pistaLower.includes('sumar')) {
            return 'Suma';
        }
        if (pistaLower.includes('resta') || pistaLower.includes('restar')) {
            return 'Resta';
        }
        if (pistaLower.includes('multiplicar') || pistaLower.includes('multiplicación')) {
            return 'Multiplicación';
        }
        
        // Conceptos de ciencias
        if (pistaLower.includes('planeta') || pistaLower.includes('sol')) {
            return 'Sistema solar';
        }
        if (pistaLower.includes('célula') || pistaLower.includes('organismo')) {
            return 'Biología';
        }
        
        // Conceptos de geografía
        if (pistaLower.includes('capital') || pistaLower.includes('ciudad') || pistaLower.includes('país')) {
            return 'Geografía';
        }
        
        // Usar materia como fallback
        const materia = window.datosSession?.materia || 'Materia general';
        return materia;
    }
}

export function limpiarRecursos() {
    gameInstance = null;
    console.log("Limpiando recursos de Sopa de Letras");
}

console.log("activity-sopa-de-letras.js CON GRAMÁTICA PERFECCIONADA Y FORMATO CORREGIDO + DEBUG + LÍMITES DE PALABRAS cargado correctamente");
console.log("Funcionalidades: IA + Fallback + Lógica Pedagógica + Tracking + Rondas + GRAMÁTICA ESPAÑOLA PERFECTA + DEBUG + PISTAS COHERENTES + LÍMITES: N1(6 palabras) N2(8 palabras)");