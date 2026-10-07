// ==================== IMPORTACIONES PARA Lumai ====================
import { 
    estadoGlobal
} from '../config.js';

import { 
    completarRespuesta, 
    completarActividadCompleta,
    extraerPalabrasClave
} from '../activities-manager.js';

import { 
    llamarGeminiAPI 
} from '../ai-engine.js';

// ==================== CONFIGURACION ADAPTATIVA DINAMICA ====================

function obtenerConfiguracionMC() {
    const nivel = estadoGlobal.perfil.dimensiones.procesamiento_informacion;
    
    const configuraciones = {
        "bajo": {
            cantidadPreguntas: 3,
            tiempoRespuesta: 10000,
            opciones: 3,
            descripcion: "Pocas preguntas, mas tiempo, menos opciones"
        },
        "medio": {
            cantidadPreguntas: 4,
            tiempoRespuesta: 8000,
            opciones: 4,
            descripcion: "Cantidad moderada, tiempo equilibrado"
        },
        "alto": {
            cantidadPreguntas: 5,
            tiempoRespuesta: 6000,
            opciones: 4,
            descripcion: "Mas preguntas, mas opciones, desafio mayor"
        }
    };
    
    return configuraciones[nivel] || configuraciones["medio"];
}

// ==================== FUNCIONES DE CORRECCIÓN GRAMATICAL ====================

/**
 * Corrige la gramática de preguntas generadas por IA
 * Maneja concordancia, artículos, signos de interrogación y contexto específico
 */
function corregirGramaticaPregunta(pregunta) {
    if (!pregunta || typeof pregunta !== 'string') return pregunta;
    
    let preguntaCorregida = pregunta.trim();
    
    // Limpiar signos de interrogación duplicados
    preguntaCorregida = preguntaCorregida.replace(/¿{2,}/g, '¿').replace(/\?{2,}/g, '?');
    
    // Limpiar artículos duplicados
    preguntaCorregida = preguntaCorregida.replace(/\b(las?) \1\b/gi, '$1');
    preguntaCorregida = preguntaCorregida.replace(/\b(los?) \1\b/gi, '$1');
    preguntaCorregida = preguntaCorregida.replace(/\b(el) \1\b/gi, '$1');
    preguntaCorregida = preguntaCorregida.replace(/\b(un) \1\b/gi, '$1');
    preguntaCorregida = preguntaCorregida.replace(/\b(una) \1\b/gi, '$1');
    
    // Remover signos de interrogación existentes para reconstruir correctamente
    preguntaCorregida = preguntaCorregida.replace(/^¿/, '').replace(/\?$/, '');
    
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
    
    // Mejoras contextuales para preguntas específicas
    const mejoras_contextuales = [
        // Arte rupestre
        { patron: /qué pintaban las personas/i, reemplazo: 'qué pintaban las personas en aquella época' },
        { patron: /cómo se pintaba/i, reemplazo: 'cómo se pintaba el arte rupestre' },
        { patron: /dónde pintaban/i, reemplazo: 'dónde pintaban el arte rupestre' },
        { patron: /por qué pintaban/i, reemplazo: 'por qué pintaban las personas en las cuevas' },
        
        // Música
        { patron: /cómo se escriben notas/i, reemplazo: 'cómo se escriben las notas en el pentagrama' },
        { patron: /para qué sirven notas/i, reemplazo: 'para qué sirven las notas musicales' },
        { patron: /dónde se ponen notas/i, reemplazo: 'dónde se colocan las notas musicales' },
        
        // Historia general
        { patron: /qué hacían las personas/i, reemplazo: 'qué hacían las personas en esa época' },
        { patron: /cómo vivían/i, reemplazo: 'cómo vivían las personas antiguamente' },
        
        // Matemáticas
        { patron: /cómo se suma/i, reemplazo: 'cómo se resuelve la suma' },
        { patron: /qué es el número/i, reemplazo: 'qué representa este número' }
    ];
    
    for (const {patron, reemplazo} of mejoras_contextuales) {
        preguntaCorregida = preguntaCorregida.replace(patron, reemplazo);
    }
    
    // ===== CORRECCIONES ESPECÍFICAS DE GRAMÁTICA =====
    
    // 1. "que pintaban/hacían/escribían + sustantivo" → agregar artículo
    preguntaCorregida = preguntaCorregida.replace(
        /\b(qué?\s+(?:pintaban|hacían|escribían|creaban|dibujaban|tocaban|cantaban))\s+([a-záéíóúñü]+)\b/gi,
        (match, verbo, sustantivo) => {
            const sustantivoLimpio = sustantivo.trim();
            
            // Si ya tiene artículo, no cambiar
            if (/^(el|la|los|las|un|una|unos|unas)\s/i.test(sustantivoLimpio)) {
                return `${verbo} ${sustantivoLimpio}`;
            }
            
            // Decidir artículo apropiado
            if (sustantivoLimpio === 'personas' || sustantivoLimpio === 'pinturas' || 
                sustantivoLimpio === 'dibujos' || sustantivoLimpio === 'sonidos' ||
                sustantivoLimpio === 'notas' || sustantivoLimpio === 'canciones' ||
                sustantivoLimpio.endsWith('s')) {
                return `${verbo} las ${sustantivoLimpio}`;
            } else {
                return `${verbo} la ${sustantivoLimpio}`;
            }
        }
    );
    
    // 2. "para qué sirve/n X" - Corrección más inteligente
    preguntaCorregida = preguntaCorregida.replace(
        /para qué sirven? ([^?]+)/gi,
        (match, sustantivo) => {
            const sustantivoLimpio = sustantivo.trim();
            
            if (/^(el|la|los|las)\s/i.test(sustantivoLimpio)) {
                if (sustantivoLimpio.startsWith('el ') || sustantivoLimpio.startsWith('la ')) {
                    return `para qué sirve ${sustantivoLimpio}`;
                } else {
                    return `para qué sirven ${sustantivoLimpio}`;
                }
            }
            
            if (debeSerSingular(sustantivoLimpio)) {
                return `para qué sirve el ${sustantivoLimpio.replace(/s$/, '')}`;
            } else if (sustantivoLimpio.endsWith('s') || sustantivosPlurales.some(p => sustantivoLimpio.includes(p))) {
                return `para qué sirven los ${sustantivoLimpio}`;
            } else {
                return `para qué sirve el ${sustantivoLimpio}`;
            }
        }
    );
    
    // 3. "qué es/son X" - Mejorado
    preguntaCorregida = preguntaCorregida.replace(
        /qué (?:es|son) ([^?]+)/gi,
        (match, sustantivo) => {
            const sustantivoLimpio = sustantivo.trim();
            
            if (/^(el|la|los|las)\s/i.test(sustantivoLimpio)) {
                if (sustantivoLimpio.startsWith('los ') || sustantivoLimpio.startsWith('las ')) {
                    return `qué son ${sustantivoLimpio}`;
                } else {
                    return `qué es ${sustantivoLimpio}`;
                }
            }
            
            if (debeSerSingular(sustantivoLimpio)) {
                return `qué es el ${sustantivoLimpio.replace(/s$/, '')}`;
            } else if (sustantivoLimpio.endsWith('s')) {
                return `qué son los ${sustantivoLimpio}`;
            } else {
                return `qué es el ${sustantivoLimpio}`;
            }
        }
    );
    
    // 4. "dónde está/n X" - Mejorado
    preguntaCorregida = preguntaCorregida.replace(
        /dónde (?:está|están) ([^?]+)/gi,
        (match, sustantivo) => {
            const sustantivoLimpio = sustantivo.trim();
            
            if (/^(el|la|los|las|este|esta|estos|estas)\s/i.test(sustantivoLimpio)) {
                if (/^(los|las|estos|estas)\s/i.test(sustantivoLimpio)) {
                    return `dónde están ${sustantivoLimpio}`;
                } else {
                    return `dónde está ${sustantivoLimpio}`;
                }
            }
            
            if (debeSerSingular(sustantivoLimpio)) {
                return `dónde está el ${sustantivoLimpio.replace(/s$/, '')}`;
            } else if (sustantivoLimpio.endsWith('s')) {
                return `dónde están los ${sustantivoLimpio}`;
            } else {
                return `dónde está el ${sustantivoLimpio}`;
            }
        }
    );
    
    // 5. "quién/es hizo/hicieron X" - Mejorado
    preguntaCorregida = preguntaCorregida.replace(
        /quién(?:es)? (?:hizo|hicieron) ([^?]+)/gi,
        (match, sustantivo) => {
            const sustantivoLimpio = sustantivo.trim();
            
            if (/^(el|la|los|las|este|esta|estos|estas)\s/i.test(sustantivoLimpio)) {
                if (/^(los|las|estos|estas)\s/i.test(sustantivoLimpio)) {
                    return `quiénes hicieron ${sustantivoLimpio}`;
                } else {
                    return `quién hizo ${sustantivoLimpio}`;
                }
            }
            
            if (debeSerSingular(sustantivoLimpio)) {
                return `quién hizo el ${sustantivoLimpio.replace(/s$/, '')}`;
            } else if (sustantivoLimpio.endsWith('s')) {
                return `quiénes hicieron los ${sustantivoLimpio}`;
            } else {
                return `quién hizo el ${sustantivoLimpio}`;
            }
        }
    );
    
    // 6. Patrones adicionales específicos que faltan
    preguntaCorregida = preguntaCorregida.replace(
        /\b(cómo\s+(?:vivían|trabajaban|comían|dormían))\s+([a-záéíóúñü]+)\b/gi,
        (match, verbo, sustantivo) => {
            if (sustantivo === 'personas' || sustantivo.endsWith('s')) {
                return `${verbo} las ${sustantivo}`;
            } else {
                return `${verbo} la ${sustantivo}`;
            }
        }
    );
    
    // 7. Correcciones adicionales específicas para conceptos conocidos
    preguntaCorregida = preguntaCorregida.replace(/pentagramas/gi, 'pentagrama');
    preguntaCorregida = preguntaCorregida.replace(/los pentagrama/gi, 'el pentagrama');
    preguntaCorregida = preguntaCorregida.replace(/las pentagrama/gi, 'el pentagrama');
    
    // 8. Asegurar signos de interrogación correctos (una sola vez)
    if (!preguntaCorregida.startsWith('¿')) {
        preguntaCorregida = '¿' + preguntaCorregida;
    }
    if (!preguntaCorregida.endsWith('?')) {
        preguntaCorregida = preguntaCorregida + '?';
    }
    
    // 9. Capitalizar primera letra después de ¿
    preguntaCorregida = preguntaCorregida.replace(/¿([a-z])/, (match, letter) => {
        return '¿' + letter.toUpperCase();
    });
    
    // 10. Limpiar espacios múltiples
    preguntaCorregida = preguntaCorregida.replace(/\s+/g, ' ').trim();
    
    return preguntaCorregida;
}

/**
 * Corrige la gramática de opciones de respuesta
 * Maneja orden de palabras y artículos faltantes
 */
function corregirGramaticaOpcion(opcion) {
    if (!opcion || typeof opcion !== 'string') return opcion;
    
    let opcionCorregida = opcion.trim();
    
    // Correcciones de orden de palabras comunes
    const correccionesOrden = [
        [/sonidos escribir/gi, 'escribir sonidos'],
        [/notas tocar/gi, 'tocar notas'],
        [/música hacer/gi, 'hacer música'],
        [/dibujos hacer/gi, 'hacer dibujos'],
        [/pinturas crear/gi, 'crear pinturas'],
        [/instrumentos tocar/gi, 'tocar instrumentos'],
        [/canciones cantar/gi, 'cantar canciones'],
        [/historias contar/gi, 'contar historias'],
        [/cuentos narrar/gi, 'narrar cuentos'],
        [/vida con su/gi, 'contar su vida'],
        [/historia con su/gi, 'contar su historia'],
        [/experiencia con su/gi, 'contar su experiencia']
    ];
    
    correccionesOrden.forEach(([patron, reemplazo]) => {
        opcionCorregida = opcionCorregida.replace(patron, reemplazo);
    });
    
    // Correcciones de fragmentos mal formados
    const fragmentosMalFormados = [
        { patron: /^con su ([a-záéíóúñü]+)/gi, reemplazo: 'contar su $1' },
        { patron: /^su ([a-záéíóúñü]+)/gi, reemplazo: 'contar su $1' },
        { patron: /([a-záéíóúñü]+)\s+con$/gi, reemplazo: '$1' }
    ];
    
    fragmentosMalFormados.forEach(correccion => {
        opcionCorregida = opcionCorregida.replace(correccion.patron, correccion.reemplazo);
    });
    
    // Agregar artículos faltantes para opciones comunes
    if (/^(sonidos|notas|dibujos|pinturas|colores|líneas)$/i.test(opcionCorregida)) {
        opcionCorregida = 'los ' + opcionCorregida.toLowerCase();
    }
    if (/^(música|arte|pentagrama)$/i.test(opcionCorregida)) {
        opcionCorregida = 'la ' + opcionCorregida.toLowerCase();
    }
    
    return opcionCorregida;
}

// ==================== GENERACION DE ACTIVIDADES CON IA ====================

export async function generarActividad() {
    console.log("🎯 Generando actividad Multiple Choice con IA...");
    
    try {
        const config = obtenerConfiguracionMC();
        console.log(`🎮 Configuración para ${estadoGlobal.perfil.nombre_visible}: ${config.descripcion}`);
        
        const actividadesIA = await generarPreguntasConIA();
        
        if (actividadesIA && actividadesIA.length >= config.cantidadPreguntas) {
            console.log("✅ Preguntas generadas exitosamente con IA");
            return {
                tipo: "multiple-choice",
                actividades: actividadesIA.slice(0, config.cantidadPreguntas),
                configuracion: config,
                instrucciones: "Elige la respuesta correcta para cada pregunta"
            };
        } else {
            console.warn("⚠️ IA generó pocas preguntas, usando fallback");
            throw new Error("Preguntas insuficientes de IA");
        }
        
    } catch (error) {
        console.error("❌ Error generando con IA:", error);
        return generarActividadFallback();
    }
}

async function generarPreguntasConIA() {
    const adaptaciones = obtenerAdaptacionesSegunPerfil();
    const explicacion = estadoGlobal.explicacionGenerada;
    const config = obtenerConfiguracionMC();
    const cantidadRequerida = config.cantidadPreguntas;
    
    const prompt = `
Eres un experto en educación inclusiva creando preguntas de opción múltiple para ${estadoGlobal.perfil.nombre_visible}.

PERFIL DEL ESTUDIANTE: ${estadoGlobal.perfil.nombre_visible}
${adaptaciones}

EXPLICACIÓN EDUCATIVA:
"""${explicacion}"""

REGLAS CRÍTICAS DE GRAMÁTICA ESPAÑOLA Y CONTEXTO:

## SUSTANTIVOS ESPECÍFICOS - USAR SINGULAR:
- **pentagrama** → "¿Para qué sirve el pentagrama?" (NO "pentagramas")
- **arte rupestre** → "¿Qué es el arte rupestre?" 
- **sistema solar** → "¿Cómo funciona el sistema solar?"

## SUSTANTIVOS QUE VAN EN PLURAL:
- **dibujos, pinturas, animales, plantas, notas musicales, sonidos, colores**
- "¿Para qué sirven los dibujos?" "¿Dónde están las pinturas?"

## ARTÍCULOS DUPLICADOS - EVITAR:
❌ "que pintaban las las personas" → ✅ "¿Qué pintaban las personas?"
❌ "dónde están los los dibujos" → ✅ "¿Dónde están los dibujos?"

## CONTEXTO ESPECÍFICO OBLIGATORIO:
- NO preguntas vagas: "¿qué pintaban las personas?" ❌
- SÍ preguntas específicas: "¿qué pintaban las personas en aquella época?" ✅
- NO preguntas genéricas: "¿cómo se pintaba?" ❌  
- SÍ preguntas contextuales: "¿cómo se pintaba el arte rupestre?" ✅
- Incluir referencias temporales: "en esa época", "antiguamente", "en aquel tiempo"
- Incluir referencias específicas del tema: "en las cuevas", "en el pentagrama", "en la música"

## ORDEN DE PALABRAS EN OPCIONES:
❌ INCORRECTO: "sonidos escribir", "notas tocar", "vida con su"
✅ CORRECTO: "escribir sonidos", "tocar notas", "contar su vida"

## ARTÍCULOS OBLIGATORIOS:
- Toda pregunta debe tener artículo apropiado
- "¿Para qué sirve EL pentagrama?" (no "¿para qué sirven pentagramas?")

## EJEMPLOS PERFECTOS DE GRAMÁTICA Y CONTEXTO:
- "¿Para qué sirve el pentagrama en la música?"
- "¿Qué pintaban las personas en aquella época?"
- "¿Dónde pintaban el arte rupestre las personas?"
- "¿Cómo se pintaba el arte rupestre en las cuevas?"
- "¿Quiénes hicieron las pinturas?"
- "¿Qué son las notas musicales?"
- "¿Cómo vivían las personas antiguamente?"

EJEMPLOS ESPECÍFICOS DE ERRORES A EVITAR:
❌ "que pintaban personas" → ✅ "¿Qué pintaban las personas en aquella época?"
❌ "vida con su" → ✅ "contar su vida"
❌ "para qué sirven pentagramas" → ✅ "¿Para qué sirve el pentagrama?"
❌ "sonidos escribir" → ✅ "escribir sonidos"
❌ "las las personas" → ✅ "las personas"
❌ "cómo se pintaba" → ✅ "¿Cómo se pintaba el arte rupestre?"

## ⚠️ CRÍTICO - MANEJO CORRECTO DE ANALOGÍAS (OBLIGATORIO) ⚠️

### EJEMPLOS ESPECÍFICOS OBLIGATORIOS:
**PENTAGRAMA (tema musical):**
- ❌ INCORRECTO: "¿Qué es el pentagrama?" → "Una escalera musical"
- ✅ CORRECTO: "¿Qué es el pentagrama?" → "Un dibujo con cinco líneas"
- ✅ CORRECTO: "¿A qué se parece el pentagrama?" → "A una escalera"
- ✅ CORRECTO: "¿Con qué podríamos comparar el pentagrama?" → "Con una escalera"

**RESPUESTAS GRAMATICALMENTE CORRECTAS:**
- ❌ INCORRECTO: "líneas espacios" 
- ✅ CORRECTO: "líneas y espacios"
- ❌ INCORRECTO: "sonidos escribir"
- ✅ CORRECTO: "escribir sonidos"

### REGLA PRINCIPAL:
- **CUANDO LA EXPLICACIÓN USE ANALOGÍAS:**
  - ❌ NUNCA preguntar "¿Qué es X?" si la respuesta esperada sería la analogía
  - ✅ SÍ preguntar "¿A qué se parece X?", "¿Con qué podríamos comparar X?"
  - ✅ SÍ preguntar "¿Por qué decimos que X es como Y?"

### VERIFICACIÓN OBLIGATORIA ANTES DE RESPONDER:
1. ¿La respuesta a "¿Qué es X?" es una definición literal o una analogía?
2. Si es analogía, ¿cambié la pregunta por "¿A qué se parece X?"?
3. ¿Todas las respuestas tienen gramática completa (con "y", artículos, etc.)?

**OBJETIVO:** El estudiante debe entender que es una COMPARACIÓN, no la definición real.

INSTRUCCIONES CRÍTICAS:
- Genera EXACTAMENTE ${cantidadRequerida} preguntas basadas 100% en la explicación
- Cada pregunta debe tener ${config.opciones} opciones (una correcta y ${config.opciones-1} incorrectas)
- Las respuestas incorrectas deben ser plausibles pero claramente erróneas
- **VERIFICAR:** Todas las preguntas deben usar artículos correctos y singular/plural apropiado
- **VERIFICAR:** Orden correcto verbo-sustantivo en opciones
- **VERIFICAR:** NO fragmentos como "con su", "vida con", "de su" solos en opciones
- **VERIFICAR:** NO artículos duplicados como "las las", "los los"
- **VERIFICAR:** Contexto específico en todas las preguntas
- Adapta el lenguaje según el perfil del estudiante
- Enfócate en conceptos clave de la explicación

FORMATO DE RESPUESTA (JSON):
\`\`\`json
[
${Array.from({length: cantidadRequerida}, (_, i) => 
  `  {
    "pregunta": "¿Pregunta gramaticalmente PERFECTA y específica ${i+1} sobre ${estadoGlobal.tema}?",
    "opciones": ["Opción A correcta", "Opción B incorrecta", "Opción C incorrecta"${config.opciones === 4 ? ', "Opción D incorrecta"' : ''}],
    "respuesta_correcta": ${Math.floor(Math.random() * config.opciones)}
  }`).join(',\n')}
]
\`\`\`

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional
- TRIPLE verificación de gramática y contexto antes de responder
- Usar signos de interrogación españoles UNA SOLA VEZ: ¿pregunta?
- EVITAR fragmentos mal formados en opciones
- AGREGAR contexto específico a preguntas genéricas`;

    try {
        // ✅ Aumentado a 3000 tokens para evitar truncamiento
        const respuesta = await llamarGeminiAPI(prompt, 3000, 0.7);
        
        // ✅ LIMPIEZA DE JSON MEJORADA PARA GEMINI 2.5
        let jsonLimpio = respuesta
            .replace(/```json\n?/gi, "")
            .replace(/```\n?/g, "")
            .replace(/^[^[{]*/, "")  // ✅ Elimina TODO antes del primer [ o {
            .replace(/[^\]}]*$/, "")  // ✅ Elimina TODO después del último ] o }
            .trim();
        
        const actividades = JSON.parse(jsonLimpio);
        
        if (Array.isArray(actividades) && actividades.length >= cantidadRequerida) {
            console.log(`✅ Generadas ${actividades.length} preguntas para perfil ${estadoGlobal.perfil.dimensiones.procesamiento_informacion}`);
            
            // APLICAR CORRECCIÓN DE GRAMÁTICA A PREGUNTAS Y OPCIONES
            return actividades.slice(0, cantidadRequerida).map(actividad => ({
                pregunta: corregirGramaticaPregunta(actividad.pregunta || `¿Pregunta sobre ${estadoGlobal.tema}?`),
                opciones: Array.isArray(actividad.opciones) && actividad.opciones.length >= config.opciones 
                    ? actividad.opciones.slice(0, config.opciones).map(opcion => corregirGramaticaOpcion(opcion))
                    : generarOpcionesPorDefecto(config.opciones),
                respuesta_correcta: actividad.respuesta_correcta || 0
            }));
        } else {
            throw new Error(`IA generó solo ${actividades.length} preguntas, se requieren ${cantidadRequerida}`);
        }
        
    } catch (error) {
        console.error("❌ Error procesando respuesta de IA:", error);
        throw error;
    }
}

function obtenerAdaptacionesSegunPerfil() {
    const perfil = estadoGlobal.perfil;
    const nivel = perfil.dimensiones.comprension_lectora;
    
    const adaptacionesPorNivel = {
        "bajo": `
ADAPTACIONES ESPECIALES:
- Preguntas MUY SIMPLES con máximo 8 palabras
- Opciones de máximo 3 palabras cada una
- Usar vocabulario básico y concreto
- Evitar conceptos abstractos
- Enfocarse en información literal de la explicación
- GRAMÁTICA SIMPLE pero CORRECTA`,

        "medio": `
ADAPTACIONES MODERADAS:
- Preguntas claras de 10-15 palabras
- Opciones de 3-5 palabras cada una
- Vocabulario accesible pero preciso
- Conceptos concretos con relaciones simples
- GRAMÁTICA ESTÁNDAR CORRECTA`,

        "alto": `
ADAPTACIONES AVANZADAS:
- Preguntas pueden ser más elaboradas
- Opciones pueden usar términos técnicos
- Vocabulario específico de la materia
- Conceptos abstractos permitidos
- GRAMÁTICA COMPLEJA pero SIEMPRE CORRECTA`
    };
    
    return adaptacionesPorNivel[nivel] || adaptacionesPorNivel["medio"];
}

// ==================== FALLBACK INTELIGENTE - EXTRACCIÓN DE PALABRAS CLAVE ====================

/**
 * Extrae palabras clave relevantes del contenido HTML de la explicación
 * Filtra stop words, verbos y devuelve las palabras más frecuentes
 * @param {string} explicacionHTML - Contenido HTML de la explicación
 * @returns {Array<string>} - Array de palabras clave ordenadas por relevancia
 */
function extraerPalabrasClaveDeHTML(explicacionHTML) {
    if (!explicacionHTML || typeof explicacionHTML !== 'string') {
        console.warn("⚠️ HTML de explicación no válido para extraer palabras clave");
        return [];
    }
    
    // 1. Limpiar HTML - remover tags
    let textoLimpio = explicacionHTML.replace(/<[^>]*>/g, ' ');
    
    // 2. Limpiar caracteres especiales y normalizar
    textoLimpio = textoLimpio
        .replace(/[^\w\sáéíóúñüáéíóúñü]/gi, ' ')
        .toLowerCase()
        .trim();
    
    console.log(`🧹 Texto limpio (primeros 200 chars): ${textoLimpio.substring(0, 200)}`);
    
    // 3. Dividir en palabras
    const palabras = textoLimpio.split(/\s+/).filter(p => p.length > 2);
    
    // 4. Stop words en español (palabras comunes a filtrar)
    const stopWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
        'de', 'del', 'al', 'con', 'sin', 'por', 'para', 'en', 'entre',
        'que', 'es', 'son', 'como', 'pero', 'porque', 'cuando', 'donde',
        'muy', 'más', 'menos', 'tan', 'tanto', 'si', 'no', 'ya',
        'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
        'yo', 'tu', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas',
        'me', 'te', 'se', 'nos', 'os', 'mi', 'tu', 'su',
        'hay', 'hola', 'soy', 'lumai', 'diviértete',
        // ✅ VERBOS A FILTRAR (conjugaciones comunes)
        'viven', 'escribimos', 'hacemos', 'suben', 'bajan', 'podés', 'puedes',
        'sabemos', 'tienen', 'sabes', 'saben', 'hacen', 'vive', 'escribe',
        'hace', 'sube', 'baja', 'puede', 'sabe', 'soy', 'sos', 'eres',
        'somos', 'son', 'adelante', 'seguimos'
    ]);
    
    // 5. Filtrar stop words y verbos
    const palabrasFiltradas = palabras.filter(palabra => {
        return !stopWords.has(palabra) && 
               palabra.length >= 3 &&
               // ✅ FILTRO ADICIONAL: Eliminar terminaciones verbales comunes
               !palabra.endsWith('mos') && // escribimos, hacemos
               !palabra.endsWith('ís') &&  // podéis
               !palabra.endsWith('en');    // viven, tienen
    });
    
    // 6. Contar frecuencia de palabras
    const frecuencias = {};
    palabrasFiltradas.forEach(palabra => {
        frecuencias[palabra] = (frecuencias[palabra] || 0) + 1;
    });
    
    // 7. Ordenar por frecuencia (más frecuentes primero)
    const palabrasOrdenadas = Object.keys(frecuencias)
        .sort((a, b) => frecuencias[b] - frecuencias[a])
        .slice(0, 15); // Tomar las 15 más relevantes
    
    // 8. Capitalizar primera letra de cada palabra
    const palabrasClave = palabrasOrdenadas.map(palabra => 
        palabra.charAt(0).toUpperCase() + palabra.slice(1)
    );
    
    console.log(`📊 Palabras clave extraídas: ${palabrasClave.join(', ')}`);
    
    return palabrasClave;
}

function generarActividadFallback() {
    console.log("🔄 Generando actividad Multiple Choice con fallback INTELIGENTE");
    
    const config = obtenerConfiguracionMC();
    const tema = estadoGlobal.tema;
    const explicacion = estadoGlobal.explicacionGenerada;
    const cantidadRequerida = config.cantidadPreguntas;
    
    // ✅ Extraer palabras clave de la explicación HTML
    const palabrasClave = extraerPalabrasClaveDeHTML(explicacion);
    
    console.log(`📊 Se necesitan ${cantidadRequerida} preguntas, palabras clave disponibles: ${palabrasClave.length}`);
    
    const preguntasGenericas = [];
    
    // Si hay suficientes palabras clave, generar preguntas específicas
    if (palabrasClave.length >= cantidadRequerida) {
        console.log("✅ Suficientes palabras clave para generar preguntas específicas");
        
        for (let i = 0; i < cantidadRequerida; i++) {
            const palabraActual = palabrasClave[i];
            const palabraLower = palabraActual.toLowerCase();
            const temaLower = tema.toLowerCase();
            
            // ✅ MEJORADO: Generar pregunta específica SIN redundancia
            let pregunta;
            if (palabraLower === temaLower) {
                // Si la palabra ES el tema, preguntar de forma general
                pregunta = `¿Qué aprendimos sobre ${palabraActual}?`;
            } else {
                // Si NO es el tema, preguntar específicamente
                pregunta = `¿Qué es ${palabraActual}?`;
            }
            
            // Generar opciones usando otras palabras clave
            const otrasPalabras = palabrasClave.filter((_, idx) => idx !== i);
            const opciones = generarOpcionesDesdeOtrasPalabras(palabraActual, otrasPalabras, config.opciones);
            
            preguntasGenericas.push({
                pregunta: pregunta,
                opciones: opciones,
                respuesta_correcta: 0 // La correcta siempre en posición 0
            });
            
            console.log(`📝 Pregunta ${i+1}: "${pregunta}" → Correcta: "${palabraActual}"`);
        }
        
    } else {
        // Si no hay suficientes palabras, usar fallback genérico
        console.warn(`⚠️ Pocas palabras clave (${palabrasClave.length}), usando fallback genérico`);
        
        for (let i = 0; i < cantidadRequerida; i++) {
            preguntasGenericas.push({
                pregunta: `¿Qué estudiamos sobre ${tema}? (${i+1}/${cantidadRequerida})`,
                opciones: generarOpcionesPorDefecto(config.opciones, i+1),
                respuesta_correcta: 0
            });
        }
    }
    
    return {
        tipo: "multiple-choice",
        actividades: preguntasGenericas,
        configuracion: config,
        instrucciones: "Elige la respuesta correcta para cada pregunta",
        esFallback: true
    };
}

function generarOpcionesPorDefecto(cantidadOpciones, numero = 1) {
    const opciones = [`Concepto ${numero}`, "Opción B", "Opción C"];
    if (cantidadOpciones === 4) {
        opciones.push("Opción D");
    }
    return opciones;
}

/**
 * Genera opciones de respuesta usando otras palabras clave
 * @param {string} palabraCorrecta - La palabra correcta
 * @param {Array<string>} otrasPalabras - Otras palabras clave disponibles
 * @param {number} cantidadOpciones - Total de opciones necesarias (3 o 4)
 * @returns {Array<string>} - Array de opciones con la correcta primero
 */
function generarOpcionesDesdeOtrasPalabras(palabraCorrecta, otrasPalabras, cantidadOpciones) {
    const opciones = [palabraCorrecta]; // La correcta siempre primero
    
    // Agregar opciones incorrectas desde otras palabras
    const incorrectasNecesarias = cantidadOpciones - 1;
    
    if (otrasPalabras.length >= incorrectasNecesarias) {
        // Hay suficientes palabras, usar las primeras N
        for (let i = 0; i < incorrectasNecesarias; i++) {
            opciones.push(otrasPalabras[i]);
        }
    } else {
        // No hay suficientes, usar las disponibles y completar con genéricas
        otrasPalabras.forEach(palabra => opciones.push(palabra));
        
        let contador = 1;
        while (opciones.length < cantidadOpciones) {
            opciones.push(`Opción ${String.fromCharCode(65 + opciones.length - 1)}`);
            contador++;
        }
    }
    
    return opciones;
}

// ==================== RENDERIZAR ====================

export async function renderizar() {
    console.log("🎨 Renderizando actividad Multiple Choice...");
    
    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (!actividadesEl) {
        console.error("❌ Elemento de actividades no encontrado");
        return;
    }
    
    const config = estadoGlobal.actividadActual.configuracion || obtenerConfiguracionMC();
    const cantidadPreguntas = estadoGlobal.actividadActual.actividades.length;
    const esFallback = estadoGlobal.actividadActual.esFallback || false;
    
    // Crear contenedor para el juego
    actividadesEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #00509e; margin-bottom: 15px;">🎯 Multiple Choice</h2>
            <p style="margin-bottom: 20px; color: #666;">
                <strong>Instrucciones:</strong> Elige la respuesta correcta para cada pregunta
            </p>
            <div id="mc-game-container" style="margin: 20px auto; max-width: 800px;"></div>
        </div>
    `;
    
    const preguntas = estadoGlobal.actividadActual.actividades;
    const juegoMC = new MultipleChoiceGame('mc-game-container', preguntas, config);
    
    // Resetear contadores para nueva sesión
    juegoMC.resetearContadores();
    
    // Callbacks corregidos para LUMAI
    juegoMC.setCallbacks(
        (pregunta, progreso) => {
            console.log('✅ Callback: Respuesta correcta en MC');
        },
        
        (pregunta, progreso) => {
            console.log('❌ Callback: Respuesta incorrecta en MC');
        },
        
        (actividad_dominada) => {
            console.log(`🏆 CALLBACK JUEGO COMPLETADO:`);
            console.log(`📊 Actividad dominada: ${actividad_dominada}`);
            
            if (actividad_dominada) {
                console.log(`🌟 LLAMANDO completarActividadCompleta(true) - ACTIVIDAD DOMINADA`);
                setTimeout(() => {
                    completarActividadCompleta(true);
                }, 800);
            } else {
                console.log(`🔄 LLAMANDO completarActividadCompleta(false) - CONTINUAR EN ROTACIÓN`);
                setTimeout(() => {
                    completarActividadCompleta(false);
                }, 800);
            }
        }
    );
    
    console.log(`✅ Multiple Choice renderizada - ${cantidadPreguntas} preguntas con lógica pedagógica y gramática perfeccionada`);
}

// ==================== CLASE DEL JUEGO MULTIPLE CHOICE - LÓGICA PEDAGÓGICA ====================

class MultipleChoiceGame {
    constructor(containerId, preguntas = null, configuracion = null) {
        this.containerId = containerId;
        
        this.configuracion = configuracion || {
            cantidadPreguntas: 4,
            tiempoRespuesta: 8000,
            opciones: 4
        };
        
        this.preguntas = preguntas || this.getPreguntasPorDefecto();
        
        // NUEVA LÓGICA PEDAGÓGICA (igual que Verdadero/Falso)
        this.erroresAcumulados = 0;
        this.maxErrores = 3;
        this.preguntasIncorrectas = [];
        this.rondaActual = 1;
        this.todasLasPreguntasMostradas = false;
        
        // Estado del juego (SIN SISTEMA DE PUNTOS)
        this.estado = {
            corriendo: false,
            preguntaActual: null,
            indicePreguntaGlobal: 0,
            indicePreguntaRonda: 0,
            preguntasRondaActual: [],
            juegoTerminado: false,
            respondiendo: false
        };
        
        // Callbacks para Lumai
        this.onRespuestaCorrecta = null;
        this.onRespuestaIncorrecta = null;
        this.onJuegoCompletado = null;
        
        console.log(`🎯 Multiple Choice configurado: ${this.preguntas.length} preguntas, lógica pedagógica mejorada`);
        
        this.init();
    }
    
    resetearContadores() {
        this.erroresAcumulados = 0;
        this.preguntasIncorrectas = [];
        this.rondaActual = 1;
        this.todasLasPreguntasMostradas = false;
        console.log("🔄 Contadores de Multiple Choice reseteados para nueva sesión");
    }
    
    setCallbacks(onCorrecta, onIncorrecta, onCompletado) {
        this.onRespuestaCorrecta = onCorrecta;
        this.onRespuestaIncorrecta = onIncorrecta;
        this.onJuegoCompletado = onCompletado;
    }
    
    init() {
        this.createGameHTML();
        this.setupEventListeners();
        this.mostrarPantallaInicio();
    }
    
    createGameHTML() {
        const container = document.getElementById(this.containerId);
        
        container.innerHTML = `
            <style>
                .mc-game {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: #fff;
                    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                    border-radius: 18px;
                    overflow: hidden;
                    max-width: 800px;
                    margin: 0 auto;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                
                .mc-hud {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.2);
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding: 12px;
                }
                
                .mc-hud strong { color: #fff; }
                
                .mc-content {
                    padding: 20px;
                    min-height: 400px;
                    position: relative;
                }
                
                .mc-question {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 20px;
                    color: #fff;
                    line-height: 1.4;
                }
                
                .mc-options {
                    display: grid;
                    gap: 12px;
                    grid-template-columns: 1fr;
                    margin-bottom: 20px;
                }
                
                .mc-option {
                    background: rgba(255, 255, 255, 0.9);
                    color: #333;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 10px;
                    padding: 15px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: left;
                }
                
                .mc-option:hover {
                    background: rgba(255, 255, 255, 1);
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                
                .mc-option:active {
                    transform: translateY(0px);
                }
                
                .mc-option.disabled {
                    pointer-events: none;
                    opacity: 0.7;
                }
                
                .mc-option.correcta {
                    background: #d4edda;
                    color: #155724;
                    border-color: #c3e6cb;
                }
                
                .mc-option.incorrecta {
                    background: #f8d7da;
                    color: #721c24;
                    border-color: #f5c6cb;
                }
                
                .mc-overlay {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    place-items: center;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(5px);
                    z-index: 50;
                    padding: 16px;
                }
                
                .mc-card {
                    background: rgba(255, 255, 255, 0.95);
                    color: #333;
                    border-radius: 20px;
                    padding: 32px;
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                
                .mc-card h2 {
                    margin: 0 0 16px;
                    font-size: 28px;
                    color: #333;
                }
                
                .mc-card p {
                    margin: 12px 0 20px;
                    font-size: 16px;
                    color: #666;
                    line-height: 1.4;
                }
                
                .mc-btn {
                    background: linear-gradient(180deg, #667eea, #764ba2);
                    border: none;
                    color: white;
                    font-weight: 800;
                    padding: 12px 24px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 8px;
                }
                
                .mc-btn:hover {
                    transform: translateY(-1px);
                }
                
                .mc-btn:active {
                    transform: translateY(1px);
                }
                
                .mc-toast {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.9);
                    color: #fff;
                    border-radius: 12px;
                    padding: 12px 20px;
                    font-size: 18px;
                    font-weight: 700;
                    z-index: 60;
                    display: none;
                }
                
                @media (max-width: 768px) {
                    .mc-question {
                        font-size: 18px;
                        padding: 16px;
                    }
                    
                    .mc-option {
                        font-size: 14px;
                        padding: 12px;
                    }
                }
            </style>
            
            <div class="mc-game">
                <div class="mc-hud">
                    <div><strong>Ronda:</strong> <span id="mc-round">1</span></div>
                </div>
                
                <div class="mc-content">
                    <div class="mc-question" id="mc-question">
                        Preparando pregunta...
                    </div>
                    
                    <div class="mc-options" id="mc-options">
                        <!-- Opciones se generan dinámicamente -->
                    </div>
                    
                    <div class="mc-overlay" id="mc-overlay">
                        <div class="mc-card">
                            <h2 id="mc-title">🎯 Multiple Choice</h2>
                            <p id="mc-description">
                                <strong>Elige la respuesta correcta</strong> para cada pregunta.<br/>
                                Lee cuidadosamente antes de responder.
                            </p>
                            <button class="mc-btn" id="mc-btn-start">Comenzar</button>
                        </div>
                    </div>
                    
                    <div class="mc-toast" id="mc-toast"></div>
                </div>
            </div>
        `;
        
        this.elementos = {
            content: container.querySelector('.mc-content'),
            question: container.querySelector('#mc-question'),
            options: container.querySelector('#mc-options'),
            overlay: container.querySelector('#mc-overlay'),
            title: container.querySelector('#mc-title'),
            description: container.querySelector('#mc-description'),
            btnStart: container.querySelector('#mc-btn-start'),
            toast: container.querySelector('#mc-toast'),
            round: container.querySelector('#mc-round')
        };
    }
    
    setupEventListeners() {
        this.elementos.btnStart.addEventListener('click', () => {
            this.iniciarJuego();
        });
    }
    
    getPreguntasPorDefecto() {
        return [
            {
                pregunta: "¿Cuál es la capital de Argentina?",
                opciones: ["Buenos Aires", "Córdoba", "Mendoza", "Rosario"],
                respuesta_correcta: 0
            },
            {
                pregunta: "¿Cuánto es 8 × 7?",
                opciones: ["54", "56", "63", "64"],
                respuesta_correcta: 1
            },
            {
                pregunta: "¿Qué órgano bombea la sangre?",
                opciones: ["Pulmones", "Corazón", "Hígado", "Riñones"],
                respuesta_correcta: 1
            }
        ];
    }
    
    prepararRonda() {
        if (this.rondaActual === 1) {
            this.estado.preguntasRondaActual = [...this.preguntas];
            console.log(`🎯 RONDA 1: Mostrando todas las ${this.preguntas.length} preguntas`);
        } else {
            this.estado.preguntasRondaActual = this.preguntasIncorrectas.map(indice => this.preguntas[indice]);
            console.log(`🔄 RONDA ${this.rondaActual}: Repitiendo ${this.estado.preguntasRondaActual.length} preguntas incorrectas`);
        }
        
        this.estado.indicePreguntaRonda = 0;
    }
    
    mostrarPantallaInicio() {
        this.elementos.overlay.style.display = 'grid';
        this.elementos.title.textContent = '🎯 Multiple Choice';
        this.elementos.description.innerHTML = `
            <strong>Elige la respuesta correcta</strong> para cada pregunta.<br/>
            Lee cuidadosamente antes de responder.
        `;
        this.elementos.btnStart.textContent = 'Comenzar';
        this.elementos.btnStart.style.display = 'inline-block';
    }
    
    ocultarOverlay() {
        this.elementos.overlay.style.display = 'none';
    }
    
    iniciarJuego() {
        this.estado.corriendo = true;
        this.estado.juegoTerminado = false;
        this.estado.respondiendo = false;
        
        this.ocultarOverlay();
        this.prepararRonda();
        this.actualizarHUD();
        
        setTimeout(() => {
            this.generarPregunta();
        }, 500);
    }
    
    generarPregunta() {
        if (this.estado.indicePreguntaRonda >= this.estado.preguntasRondaActual.length) {
            this.completarRonda();
            return;
        }
        
        const pregunta = this.estado.preguntasRondaActual[this.estado.indicePreguntaRonda];
        this.estado.preguntaActual = pregunta;
        this.estado.respondiendo = false;
        
        this.estado.indicePreguntaGlobal = this.preguntas.findIndex(p => 
            p.pregunta === pregunta.pregunta && 
            JSON.stringify(p.opciones) === JSON.stringify(pregunta.opciones)
        );
        
        this.elementos.question.textContent = pregunta.pregunta;
        
        this.elementos.options.innerHTML = '';
        pregunta.opciones.forEach((opcion, index) => {
            this.crearOpcion(opcion, index, index === pregunta.respuesta_correcta);
        });
        
        this.actualizarHUD();
        
        console.log(`🎯 Pregunta ${this.estado.indicePreguntaRonda + 1}/${this.estado.preguntasRondaActual.length}: ${pregunta.pregunta}`);
        console.log(`🎯 Respuesta correcta: ${pregunta.opciones[pregunta.respuesta_correcta]}`);
    }
    
    completarRonda() {
        if (this.rondaActual === 1) {
            this.todasLasPreguntasMostradas = true;
            
            if (this.preguntasIncorrectas.length === 0) {
                console.log('🏆 PERFECTO: Todas las preguntas correctas en primera ronda');
                this.completarActividad(true);
                return;
            } else {
                console.log(`🔄 Primera ronda terminada. ${this.preguntasIncorrectas.length} preguntas incorrectas`);
                this.iniciarSiguienteRonda();
            }
        } else {
            if (this.preguntasIncorrectas.length === 0) {
                console.log('🏆 ÉXITO: Corrigió todas las preguntas incorrectas');
                this.completarActividad(true);
                return;
            } else {
                console.log(`🔄 Ronda ${this.rondaActual} terminada. ${this.preguntasIncorrectas.length} preguntas aún incorrectas`);
                this.iniciarSiguienteRonda();
            }
        }
    }
    
    iniciarSiguienteRonda() {
        this.rondaActual++;
        console.log(`🔄 Iniciando ronda ${this.rondaActual}`);
        
        setTimeout(() => {
            this.prepararRonda();
            this.actualizarHUD();
            this.generarPregunta();
        }, 1000);
    }
    
    completarActividad(exitosa) {
        this.estado.corriendo = false;
        this.estado.juegoTerminado = true;
        
        if (exitosa) {
            console.log('🏆 ACTIVIDAD DOMINADA: Respondió correctamente todas las preguntas');
        } else {
            console.log('🚨 MÁXIMO DE ERRORES: Actividad falló, continuar en rotación');
        }
        
        if (this.onJuegoCompletado) {
            this.onJuegoCompletado(exitosa);
        }
    }
    
    crearOpcion(texto, index, esCorrecta) {
        const opcionEl = document.createElement('div');
        opcionEl.className = 'mc-option';
        opcionEl.textContent = `${String.fromCharCode(65 + index)}) ${texto}`;
        
        opcionEl.onclick = () => {
            if (!this.estado.corriendo || this.estado.respondiendo) return;
            this.resolverRespuesta(esCorrecta, opcionEl, index);
        };
        
        this.elementos.options.appendChild(opcionEl);
    }
    
    actualizarHUD() {
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
    
    resolverRespuesta(esCorrecta, opcionEl, index) {
        this.estado.respondiendo = true;
        
        this.elementos.options.querySelectorAll('.mc-option').forEach(op => {
            op.classList.add('disabled');
        });
        
        opcionEl.classList.add(esCorrecta ? 'correcta' : 'incorrecta');
        
        if (window.lumaiTracker) {
            const preguntaTexto = this.estado.preguntaActual.pregunta;
            const respuestaUsuario = this.estado.preguntaActual.opciones[index];
            const respuestaCorrecta = this.estado.preguntaActual.opciones[this.estado.preguntaActual.respuesta_correcta];
            const concepto = this.extraerConcepto(preguntaTexto);
            
            window.lumaiTracker.recordCustomEvent('response_recorded', {
                question: preguntaTexto,
                userAnswer: respuestaUsuario,
                correctAnswer: respuestaCorrecta,
                isCorrect: esCorrecta,
                concept: concepto,
                activity: 'multiple-choice'
            });
            
            console.log(`📊 TRACKING: ${esCorrecta ? '✅' : '❌ '} "${preguntaTexto}" - ${respuestaUsuario}`);
        }
        
        if (esCorrecta) {
            if (this.preguntasIncorrectas.includes(this.estado.indicePreguntaGlobal)) {
                this.preguntasIncorrectas = this.preguntasIncorrectas.filter(
                    indice => indice !== this.estado.indicePreguntaGlobal
                );
                console.log(`✅ Pregunta ${this.estado.indicePreguntaGlobal} corregida. Incorrectas restantes: ${this.preguntasIncorrectas.length}`);
            }
            
            if (this.onRespuestaCorrecta) {
                this.onRespuestaCorrecta(this.estado.preguntaActual, this.estado.indicePreguntaRonda + 1);
            }
            
            this.mostrarToast('¡Bien!');
            
        } else {
            this.erroresAcumulados++;
            
            if (!this.preguntasIncorrectas.includes(this.estado.indicePreguntaGlobal)) {
                this.preguntasIncorrectas.push(this.estado.indicePreguntaGlobal);
                console.log(`❌ Pregunta ${this.estado.indicePreguntaGlobal} agregada a incorrectas. Total: ${this.preguntasIncorrectas.length}`);
            }
            
            if (this.onRespuestaIncorrecta) {
                this.onRespuestaIncorrecta(this.estado.preguntaActual, this.estado.indicePreguntaRonda + 1);
            }
            
            if (this.erroresAcumulados >= this.maxErrores) {
                console.log(`🚨 MÁXIMO DE ERRORES ALCANZADO (${this.erroresAcumulados}/${this.maxErrores})`);
                this.mostrarToast('¡UPS! Sigamos con otro', 2000);
                this.actualizarHUD();
                
                this.completarActividad(false);
                return;
            }
            
            this.mostrarToast('¡UPS!');
        }
        
        this.actualizarHUD();
        
        setTimeout(() => {
            this.estado.indicePreguntaRonda++;
            this.generarPregunta();
        }, 1200);
    }
    
    extraerConcepto(pregunta) {
        if (!pregunta) return 'Concepto general';
        
        const preguntaLower = pregunta.toLowerCase();
        
        if (preguntaLower.includes('pentagrama') || preguntaLower.includes('línea')) {
            return 'Pentagrama';
        }
        if (preguntaLower.includes('notas') || preguntaLower.includes('nota')) {
            return 'Notas musicales';
        }
        if (preguntaLower.includes('música') || preguntaLower.includes('musical')) {
            return 'Teoría musical';
        }
        if (preguntaLower.includes('escribir') || preguntaLower.includes('componer')) {
            return 'Composición musical';
        }
        if (preguntaLower.includes('suma') || preguntaLower.includes('+') || preguntaLower.includes('sumar')) {
            return 'Suma';
        }
        if (preguntaLower.includes('resta') || preguntaLower.includes('-') || preguntaLower.includes('restar')) {
            return 'Resta';
        }
        if (preguntaLower.includes('multiplicar') || preguntaLower.includes('×') || preguntaLower.includes('*')) {
            return 'Multiplicación';
        }
        if (preguntaLower.includes('dividir') || preguntaLower.includes('÷') || preguntaLower.includes('/')) {
            return 'División';
        }
        if (preguntaLower.includes('planeta') || preguntaLower.includes('sol')) {
            return 'Sistema solar';
        }
        if (preguntaLower.includes('célula') || preguntaLower.includes('organismo')) {
            return 'Biología';
        }
        if (preguntaLower.includes('capital') || preguntaLower.includes('ciudad') || preguntaLower.includes('país')) {
            return 'Geografía';
        }
        
        const materia = window.datosSession?.materia || 'Materia general';
        return materia;
    }
}

// ==================== LIMPIAR RECURSOS ====================

export function limpiarRecursos() {
    console.log("🧹 Limpiando recursos de Multiple Choice");
}

// ==================== LOGGING ====================
console.log("🎯 activity-mc.js CON GRAMÁTICA PERFECCIONADA Y CONTEXTO ESPECÍFICO cargado correctamente");
console.log("✅ Funcionalidades: IA + Fallback + Lógica Pedagógica + Tracking + Sistema de Rondas + GRAMÁTICA ESPAÑOLA PERFECTA + CONTEXTO ESPECÍFICO");
