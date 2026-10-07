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

function obtenerConfiguracionRace() {
    const nivel = estadoGlobal.perfil.dimensiones.procesamiento_informacion;
    
    const configuraciones = {
        "bajo": {
            velocidadMundo: 50,
            tiempoEntrePreguntas: 1200,
            velocidadDescenso: 3,
            cantidadPreguntas: 4,
            descripcion: "Velocidad muy lenta, mas tiempo para pensar"
        },
        "medio": {
            velocidadMundo: 70,
            tiempoEntrePreguntas: 1000,
            velocidadDescenso: 6,
            cantidadPreguntas: 6,
            descripcion: "Velocidad media, tiempo moderado"
        },
        "alto": {
            velocidadMundo: 80,
            tiempoEntrePreguntas: 1000,
            velocidadDescenso: 8,
            cantidadPreguntas: 7,
            descripcion: "Velocidad alta, desafio mayor"
        }
    };
    
    return configuraciones[nivel] || configuraciones["medio"];
}

// ==================== FUNCIONES DE CORRECCIÓN GRAMATICAL ====================

/**
 * Corrige la gramática de preguntas generadas por IA
 * Maneja concordancia, artículos, signos de interrogación y casos específicos
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
    
    // Sustantivos típicamente singulares
    const sustantivosSingulares = [
        'pentagrama', 'arte rupestre', 'sistema solar', 'universo', 'historia',
        'matemática', 'biología', 'química', 'física', 'literatura', 'música'
    ];
    
    // Sustantivos típicamente plurales
    const sustantivosPlurales = [
        'dibujos', 'pinturas', 'notas', 'números', 'letras', 'palabras', 
        'sonidos', 'colores', 'formas', 'figuras', 'elementos'
    ];
    
    // Detectar si debe usar singular basado en sustantivos conocidos
    const debeSingular = sustantivosSingulares.some(sustantivo => 
        preguntaCorregida.toLowerCase().includes(sustantivo.toLowerCase())
    );
    
    const debePlural = sustantivosPlurales.some(sustantivo => 
        preguntaCorregida.toLowerCase().includes(sustantivo.toLowerCase())
    );
    
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
    
    // Correcciones específicas para patrones comunes
    
    // "para qué sirve X" vs "para qué sirven X"
    if (preguntaCorregida.toLowerCase().includes('para qué sirve')) {
        if (debePlural) {
            preguntaCorregida = preguntaCorregida.replace(/para qué sirve/i, 'para qué sirven');
            preguntaCorregida = preguntaCorregida.replace(/para qué sirven ([^l][a-záéíóú]+)$/i, 'para qué sirven los $1');
        } else if (debeSingular) {
            preguntaCorregida = preguntaCorregida.replace(/para qué sirven/i, 'para qué sirve');
            preguntaCorregida = preguntaCorregida.replace(/para qué sirve ([^e][a-záéíóú]+)$/i, 'para qué sirve el $1');
        }
        preguntaCorregida = preguntaCorregida.replace(/para qué sirven? pentagramas?/i, 'para qué sirve el pentagrama');
    }
    
    // "qué es/son X"
    if (preguntaCorregida.toLowerCase().includes('qué es') || preguntaCorregida.toLowerCase().includes('qué son')) {
        if (debePlural) {
            preguntaCorregida = preguntaCorregida.replace(/qué es/i, 'qué son');
            preguntaCorregida = preguntaCorregida.replace(/qué son ([^l][a-záéíóú]+)$/i, 'qué son los $1');
        } else if (debeSingular) {
            preguntaCorregida = preguntaCorregida.replace(/qué son/i, 'qué es');
            preguntaCorregida = preguntaCorregida.replace(/qué es ([^e][a-záéíóú]+)$/i, 'qué es el $1');
        }
    }
    
    // "dónde está/están X"
    if (preguntaCorregida.toLowerCase().includes('dónde está') || preguntaCorregida.toLowerCase().includes('dónde están')) {
        if (debePlural) {
            preguntaCorregida = preguntaCorregida.replace(/dónde está/i, 'dónde están');
            preguntaCorregida = preguntaCorregida.replace(/dónde están ([^l][a-záéíóú]+)$/i, 'dónde están los $1');
        } else if (debeSingular) {
            preguntaCorregida = preguntaCorregida.replace(/dónde están/i, 'dónde está');
            preguntaCorregida = preguntaCorregida.replace(/dónde está ([^e][a-záéíóú]+)$/i, 'dónde está el $1');
        }
    }
    
    // "quién hizo/quiénes hicieron X"
    if (preguntaCorregida.toLowerCase().includes('quién hizo') || preguntaCorregida.toLowerCase().includes('quiénes hicieron')) {
        if (debePlural) {
            preguntaCorregida = preguntaCorregida.replace(/quién hizo/i, 'quiénes hicieron');
            preguntaCorregida = preguntaCorregida.replace(/quiénes hicieron ([^l][a-záéíóú]+)$/i, 'quiénes hicieron los $1');
        } else if (debeSingular) {
            preguntaCorregida = preguntaCorregida.replace(/quiénes hicieron/i, 'quién hizo');
            preguntaCorregida = preguntaCorregida.replace(/quién hizo ([^e][a-záéíóú]+)$/i, 'quién hizo el $1');
        }
    }
    
    // Asegurar formato correcto de pregunta
    if (!preguntaCorregida.startsWith('¿')) {
        preguntaCorregida = '¿' + preguntaCorregida;
    }
    if (!preguntaCorregida.endsWith('?')) {
        preguntaCorregida = preguntaCorregida + '?';
    }
    
    // Capitalizar primera letra después de ¿
    preguntaCorregida = preguntaCorregida.replace(/¿([a-z])/, (match, letra) => '¿' + letra.toUpperCase());
    
    return preguntaCorregida;
}

/**
 * Corrige la gramática de respuestas generadas por IA
 * Maneja orden de palabras y artículos faltantes
 */
function corregirGramaticaRespuesta(respuesta) {
    if (!respuesta || typeof respuesta !== 'string') return respuesta;
    
    let respuestaCorregida = respuesta.trim();
    
    // Correcciones de orden de palabras comunes
    const patronesOrden = [
        { patron: /^sonidos (.+)$/i, reemplazo: '$1 sonidos' },
        { patron: /^notas (.+)$/i, reemplazo: '$1 notas' },
        { patron: /^música (.+)$/i, reemplazo: '$1 música' },
        { patron: /^números (.+)$/i, reemplazo: '$1 números' },
        { patron: /^palabras (.+)$/i, reemplazo: '$1 palabras' },
        { patron: /^dibujos (.+)$/i, reemplazo: '$1 dibujos' },
        { patron: /^pinturas (.+)$/i, reemplazo: '$1 pinturas' }
    ];
    
    for (const {patron, reemplazo} of patronesOrden) {
        respuestaCorregida = respuestaCorregida.replace(patron, reemplazo);
    }
    
    // Agregar artículos faltantes para sustantivos comunes
    const sustantivosConArticulo = [
        { patron: /^pentagrama$/i, reemplazo: 'el pentagrama' },
        { patron: /^música$/i, reemplazo: 'la música' },
        { patron: /^arte$/i, reemplazo: 'el arte' },
        { patron: /^historia$/i, reemplazo: 'la historia' },
        { patron: /^matemática$/i, reemplazo: 'la matemática' }
    ];
    
    for (const {patron, reemplazo} of sustantivosConArticulo) {
        respuestaCorregida = respuestaCorregida.replace(patron, reemplazo);
    }
    
    return respuestaCorregida;
}

// ==================== FUNCIÓN PARA EXTRAER PALABRAS CLAVE DE HTML ====================

/**
 * Extrae palabras clave significativas del HTML de la explicación
 * Similar a la función en activity-skater.js
 */
function extraerPalabrasClaveDeHTML(explicacionHTML) {
    if (!explicacionHTML || typeof explicacionHTML !== 'string') {
        console.warn('⚠️ No hay explicación HTML para extraer palabras clave');
        return [];
    }
    
    // 1. Limpiar HTML - remover todas las etiquetas
    let textoLimpio = explicacionHTML
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    console.log('🧹 Texto limpio (primeros 200 chars):', textoLimpio.substring(0, 200));
    
    // 2. Palabras a ignorar (stop words en español)
    const stopWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
        'de', 'del', 'al', 'a', 'ante', 'bajo', 'con', 'contra',
        'desde', 'durante', 'en', 'entre', 'hacia', 'hasta',
        'para', 'por', 'según', 'sin', 'sobre', 'tras',
        'y', 'o', 'pero', 'si', 'no', 'ni', 'que', 'qué',
        'como', 'cómo', 'cuando', 'cuándo', 'donde', 'dónde',
        'es', 'son', 'está', 'están', 'ser', 'estar', 'hay',
        'hola', 'soy', 'te', 'me', 'se', 'lo', 'eso', 'esto',
        'muy', 'más', 'menos', 'mucho', 'poco', 'todo', 'nada',
        'vos', 'podés', 'puedes', 'puede', 'pueden',
        // ✅ VERBOS A FILTRAR (conjugaciones comunes)
        'tiene', 'tienen', 'tengo', 'tener', 'tuvo', 'tenía',
        'vive', 'viven', 'vivir', 'vivía', 'vivían',
        'hace', 'hacen', 'hacer', 'hacía', 'hacían', 'hacemos',
        'escribe', 'escriben', 'escribir', 'escribía', 'escribimos',
        'sube', 'suben', 'subir', 'subía', 'subían',
        'baja', 'bajan', 'bajar', 'bajaba', 'bajaban',
        'sabe', 'saben', 'saber', 'sabía', 'sabían', 'sabemos',
        'eres', 'somos', 'son', 'soy', 'sos',
        'adelante', 'seguimos', 'siguen', 'seguir',
        // ✅ DETERMINANTES Y PRONOMBRES A FILTRAR
        'cada', 'otro', 'otra', 'otros', 'otras',
        'este', 'esta', 'estos', 'estas',
        'ese', 'esa', 'esos', 'esas',
        'aquel', 'aquella', 'aquellos', 'aquellas',
        'cual', 'cuales', 'quien', 'quienes'
    ]);
    
    // 3. Extraer palabras y contar frecuencia
    const palabras = textoLimpio
        .toLowerCase()
        .split(/\s+/)
        .filter(palabra => {
            // Filtrar palabras que:
            // - Tienen al menos 4 letras
            // - No son stop words
            // - No son números
            // - Solo contienen letras (con acentos permitidos)
            // ✅ FILTRO ADICIONAL: Eliminar terminaciones verbales comunes
            return palabra.length >= 4 &&
                   !stopWords.has(palabra) &&
                   !/^\d+$/.test(palabra) &&
                   /^[a-záéíóúñü]+$/i.test(palabra) &&
                   // ✅ Filtrar terminaciones verbales
                   !palabra.endsWith('mos') &&    // escribimos, hacemos, vivimos
                   !palabra.endsWith('ís') &&     // podéis, sabéis
                   !palabra.endsWith('en') &&     // viven, tienen, escriben
                   !palabra.endsWith('ía') &&     // tenía, vivía, hacía
                   !palabra.endsWith('ían') &&    // tenían, vivían, hacían
                   !palabra.endsWith('er') &&     // tener, hacer, saber
                   !palabra.endsWith('ir') &&     // vivir, escribir, subir
                   !palabra.endsWith('ar');       // bajar, tocar, pintar
        });
    
    // 4. Contar frecuencia de cada palabra
    const frecuencia = {};
    palabras.forEach(palabra => {
        frecuencia[palabra] = (frecuencia[palabra] || 0) + 1;
    });
    
    // 5. Ordenar por frecuencia y tomar las más relevantes
    const palabrasOrdenadas = Object.entries(frecuencia)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([palabra]) => {
            // Capitalizar primera letra
            return palabra.charAt(0).toUpperCase() + palabra.slice(1);
        });
    
    console.log('📊 Palabras clave extraídas:', palabrasOrdenadas.join(', '));
    
    return palabrasOrdenadas;
}

// ==================== GENERACION DE ACTIVIDADES CON IA ====================

export async function generarActividad() {
    console.log("🏃 Generando actividad Carrera del Conocimiento con IA...");
    
    try {
        const config = obtenerConfiguracionRace();
        console.log(`🎮 Configuración para ${estadoGlobal.perfil.nombre_visible}: ${config.descripcion}`);
        
        const actividadesIA = await generarPreguntasConIA();
        
        if (actividadesIA && actividadesIA.length >= config.cantidadPreguntas) {
            console.log("✅ Preguntas generadas exitosamente con IA");
            return {
                tipo: "race",
                actividades: actividadesIA.slice(0, config.cantidadPreguntas),
                configuracion: config,
                instrucciones: "Muévete entre carriles y atraviesa la respuesta correcta"
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
    const config = obtenerConfiguracionRace();
    const cantidadRequerida = config.cantidadPreguntas;
    
    const prompt = `
Eres un experto en educación inclusiva creando preguntas para el juego "Carrera del Conocimiento" para ${estadoGlobal.perfil.nombre_visible}.

PERFIL DEL ESTUDIANTE: ${estadoGlobal.perfil.nombre_visible}
${adaptaciones}

EXPLICACIÓN EDUCATIVA:
"""${explicacion}"""

INSTRUCCIONES CRÍTICAS DE GRAMÁTICA ESPAÑOLA Y CONTEXTO:
- Genera EXACTAMENTE ${cantidadRequerida} preguntas basadas 100% en la explicación
- Cada pregunta debe tener 1 respuesta CORRECTA y 3 respuestas INCORRECTAS
- GRAMÁTICA OBLIGATORIA:
  * Usar signos de interrogación españoles: ¿pregunta?
  * Concordancia correcta: "¿Para qué sirve el pentagrama?" NO "¿Para qué sirven pentagramas?"
  * Artículos obligatorios: "los dibujos", "el pentagrama", "las notas"
  * NO duplicar artículos: "las personas" NO "las las personas"
  * Orden correcto: "escribir sonidos" NO "sonidos escribir"
- CONTEXTO ESPECÍFICO OBLIGATORIO:
  * NO preguntas vagas: "¿qué pintaban las personas?" ❌
  * SÍ preguntas específicas: "¿qué pintaban las personas en aquella época?" ✅
  * NO preguntas genéricas: "¿cómo se pintaba?" ❌  
  * SÍ preguntas contextuales: "¿cómo se pintaba el arte rupestre?" ✅
  * Incluir referencias temporales: "en esa época", "antiguamente", "en aquel tiempo"
  * Incluir referencias específicas del tema: "en las cuevas", "en el pentagrama", "en la música"
- Todas las respuestas deben ser CORTAS (máximo 4 palabras cada una)
- Adapta el lenguaje según el perfil del estudiante
- Enfócate en conceptos clave de la explicación

EJEMPLOS DE GRAMÁTICA Y CONTEXTO CORRECTOS:
✅ "¿Para qué sirve el pentagrama en la música?" → "escribir notas"
✅ "¿Dónde pintaban el arte rupestre las personas?" → "en las cuevas"
✅ "¿Qué pintaban las personas en aquella época?" → "animales salvajes"
✅ "¿Cómo se pintaba el arte rupestre?" → "con pigmentos"
✅ "¿Qué son las notas musicales?" → "sonidos organizados"

❌ EVITAR:
❌ "para qué sirve pentagramas" → "sonidos escribir"
❌ "que pintaban las las personas" (artículos duplicados)
❌ "qué pintaban las personas" (muy genérico, falta contexto)
❌ "cómo se pintaba" (muy vago, falta especificidad)

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


FORMATO DE RESPUESTA (JSON):
\`\`\`json
[
${Array.from({length: cantidadRequerida}, (_, i) => 
  `  {
    "pregunta": "¿Pregunta ${i+1} sobre ${estadoGlobal.tema}?",
    "correcta": "Respuesta breve ${i+1}",
    "incorrectas": ["Inc1", "Inc2", "Inc3"]
  }`).join(',\n')}
]
\`\`\`

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional. Revisa gramática española antes de responder.`;

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
            return actividades.slice(0, cantidadRequerida).map(actividad => ({
                pregunta: corregirGramaticaPregunta(actividad.pregunta || `¿Pregunta sobre ${estadoGlobal.tema}?`),
                correcta: corregirGramaticaRespuesta(actividad.correcta || "Respuesta correcta"),
                incorrectas: Array.isArray(actividad.incorrectas) && actividad.incorrectas.length >= 3 
                    ? actividad.incorrectas.slice(0, 3).map(resp => corregirGramaticaRespuesta(resp))
                    : generarRespuestasIncorrectasPorDefecto()
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
- Preguntas MUY SIMPLES con máximo 6 palabras
- Respuestas de máximo 3 palabras cada una
- Usar vocabulario básico y concreto
- Evitar conceptos abstractos
- Enfocarse en información literal de la explicación
- GRAMÁTICA SIMPLE pero CORRECTA`,

        "medio": `
ADAPTACIONES MODERADAS:
- Preguntas claras de 8-12 palabras
- Respuestas de 3 palabras cada una
- Vocabulario accesible pero preciso
- Conceptos concretos con relaciones simples
- GRAMÁTICA ESTÁNDAR CORRECTA`,

        "alto": `
ADAPTACIONES AVANZADAS:
- Preguntas pueden ser más elaboradas
- Respuestas pueden usar términos técnicos
- Vocabulario específico de la materia
- Conceptos abstractos permitidos
- GRAMÁTICA COMPLEJA pero SIEMPRE CORRECTA`
    };
    
    return adaptacionesPorNivel[nivel] || adaptacionesPorNivel["medio"];
}

function generarActividadFallback() {
    console.log("🔄 Generando actividad Carrera con fallback INTELIGENTE");
    
    const config = obtenerConfiguracionRace();
    const tema = estadoGlobal.tema;
    const cantidadRequerida = config.cantidadPreguntas;
    const explicacion = estadoGlobal.explicacionGenerada || '';
    
    // ✅ Extraer palabras clave REALES de la explicación HTML
    const palabrasClave = extraerPalabrasClaveDeHTML(explicacion);
    
    console.log(`📊 Se necesitan ${cantidadRequerida} preguntas, palabras clave disponibles: ${palabrasClave.length}`);
    
    const preguntasGenericas = [];
    
    if (palabrasClave.length >= cantidadRequerida) {
        console.log(`✅ Suficientes palabras clave para generar ${cantidadRequerida} preguntas especÍficas`);
        
        for (let i = 0; i < cantidadRequerida; i++) {
            const palabraActual = palabrasClave[i];
            const palabraLower = palabraActual.toLowerCase();
            const temaLower = tema.toLowerCase();
            const otrasPalabras = palabrasClave.filter((_, idx) => idx !== i);
            
            // ✅ MEJORADO: Generar pregunta específica SIN redundancia
            let pregunta;
            if (palabraLower === temaLower) {
                // Si la palabra ES el tema, preguntar de forma general
                pregunta = `¿Qué aprendimos sobre ${palabraActual}?`;
            } else {
                // Si NO es el tema, preguntar específicamente
                pregunta = `¿Qué es ${palabraActual}?`;
            }
            
            preguntasGenericas.push({
                pregunta: pregunta,
                correcta: palabraActual,
                incorrectas: generarIncorrectasDesdeOtrasPalabras(otrasPalabras, 3)
            });
            
            console.log(`📝 Pregunta ${i+1}: "${pregunta}" → Correcta: "${palabraActual}"`);
        }
    } else {
        console.warn(`⚠️ Pocas palabras clave (${palabrasClave.length}), usando fallback genérico`);
        
        for (let i = 0; i < cantidadRequerida; i++) {
            preguntasGenericas.push({
                pregunta: `¿Qué estudiamos sobre ${tema}? (${i+1}/${cantidadRequerida})`,
                correcta: `Concepto ${i+1}`,
                incorrectas: ["Incorrecto A", "Incorrecto B", "Incorrecto C"]
            });
        }
    }
    
    return {
        tipo: "race",
        actividades: preguntasGenericas,
        configuracion: config,
        instrucciones: "Muévete entre carriles y atraviesa la respuesta correcta",
        esFallback: true
    };
}

/**
 * Genera respuestas incorrectas usando otras palabras clave
 */
function generarIncorrectasDesdeOtrasPalabras(palabras, cantidad = 3) {
    if (!palabras || palabras.length < cantidad) {
        return ["Opción A", "Opción B", "Opción C"].slice(0, cantidad);
    }
    
    // Mezclar las palabras
    const palabrasMezcladas = [...palabras].sort(() => Math.random() - 0.5);
    
    // Tomar las primeras 'cantidad' palabras
    return palabrasMezcladas.slice(0, cantidad);
}

function generarRespuestasIncorrectasPorDefecto() {
    return ["Opción A", "Opción B", "Opción C"];
}

// ==================== RENDERIZAR ====================

export async function renderizar() {
    console.log("🎨 Renderizando actividad Carrera del Conocimiento...");
    
    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (!actividadesEl) {
        console.error("❌ Elemento de actividades no encontrado");
        return;
    }
    
    const config = estadoGlobal.actividadActual.configuracion || obtenerConfiguracionRace();
    const cantidadPreguntas = estadoGlobal.actividadActual.actividades.length;
    const esFallback = estadoGlobal.actividadActual.esFallback || false;
    
    // Crear contenedor para el juego
    actividadesEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #00509e; margin-bottom: 15px;">🏃 Carrera del Conocimiento</h2>
            <p style="margin-bottom: 10px; color: #666;">
                <strong>Instrucciones:</strong> Usa ← → para moverte entre carriles y atraviesa la respuesta correcta
            </p>
            <div id="race-game-container" style="margin: 20px auto; max-width: 980px;"></div>
        </div>
    `;
    
    const preguntas = estadoGlobal.actividadActual.actividades;
    const juegoRace = new RaceGame('race-game-container', preguntas, config);
    
    // Resetear contadores para nueva sesión
    juegoRace.resetearContadores();
    
    // Callbacks corregidos para LUMAI
    juegoRace.setCallbacks(
        (pregunta, progreso) => {
            console.log('✅ Callback: Respuesta correcta en Carrera');
        },
        
        (pregunta, progreso) => {
            console.log('❌ Callback: Respuesta incorrecta en Carrera');
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
    
    console.log(`✅ Carrera renderizada - ${cantidadPreguntas} preguntas con lógica pedagógica`);
}

// ==================== CLASE DEL JUEGO CARRERA - NUEVA LÓGICA PEDAGÓGICA ====================

class RaceGame {
    constructor(containerId, preguntas = null, configuracion = null) {
        this.containerId = containerId;
        
        this.configuracion = configuracion || {
            velocidadMundo: 70,
            tiempoEntrePreguntas: 1000,
            velocidadDescenso: 8,
            cantidadPreguntas: 6
        };
        
        this.preguntas = preguntas || this.getPreguntasPorDefecto();
        
        // NUEVA LÓGICA PEDAGÓGICA
        this.erroresAcumulados = 0;
        this.maxErrores = 3;
        this.preguntasIncorrectas = [];
        this.rondaActual = 1;
        this.todasLasPreguntasMostradas = false;
        
        // Estado del juego
        this.estado = {
            corriendo: false,
            carril: 1,
            velocidadMundo: this.configuracion.velocidadMundo,
            velocidadDescenso: this.configuracion.velocidadDescenso,
            topJugador: 36,
            puertas: [],
            preguntaActiva: false,
            respondido: false,
            
            preguntaActual: null,
            indicePreguntaGlobal: 0,
            indicePreguntaRonda: 0,
            preguntasRondaActual: [],
            juegoTerminado: false,
            
            puntos: 0
        };
        
        this.onRespuestaCorrecta = null;
        this.onRespuestaIncorrecta = null;
        this.onJuegoCompletado = null;
        
        console.log(`🏃 Carrera configurada: ${this.preguntas.length} preguntas, lógica pedagógica implementada`);
        
        this.init();
    }
    
    resetearContadores() {
        this.erroresAcumulados = 0;
        this.preguntasIncorrectas = [];
        this.rondaActual = 1;
        this.todasLasPreguntasMostradas = false;
        console.log("🔄 Contadores de Carrera reseteados para nueva sesión");
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
                .race-game {
                    background: radial-gradient(1200px 600px at 50% 20%, #111827, #0b1020 60%, #060912);
                    color: #e5e7eb;
                    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                    border-radius: 18px;
                    overflow: hidden;
                    max-width: 980px;
                    margin: 0 auto;
                }
                
                .race-hud {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                    justify-content: center;
                    background: rgba(17, 24, 39, 0.9);
                    border-bottom: 1px solid #1f2937;
                    padding: 12px;
                }
                
                .race-hud strong { color: #fff; }
                
                .race-area {
                    position: relative;
                    height: 500px;
                    background: linear-gradient(to bottom, rgba(255,255,255,.02), rgba(255,255,255,0));
                    overflow: hidden;
                }
                
                .race-lanes {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                }
                
                .race-lane {
                    position: relative;
                    border-left: 1px dashed #334155;
                    border-right: 1px dashed #334155;
                    background: linear-gradient(to bottom, #1f2937, #101828);
                }
                
                .race-lane::after {
                    content: "";
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 4px;
                    height: 100%;
                    background: repeating-linear-gradient(to bottom, rgba(255,255,255,.12), rgba(255,255,255,.12) 18px, rgba(255,255,255,0) 18px, rgba(255,255,255,0) 38px);
                    opacity: 0.45;
                }
                
                .race-player {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 50px;
                    height: 50px;
                    background: conic-gradient(from 200deg at 70% 30%, #93c5fd, #60a5fa, #3b82f6, #2563eb 70%);
                    border: 2px solid #1e3a8a;
                    border-radius: 12px;
                    box-shadow: 0 8px 16px rgba(59,130,246,.4);
                    z-index: 15;
                    transition: left 0.15s ease;
                }
                
                .race-question {
                    position: absolute;
                    top: 8px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: min(90%, 800px);
                    background: rgba(11, 18, 34, 0.95);
                    border: 1px solid #1e293b;
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                    color: #fff;
                    font-size: 20px;
                    font-weight: 700;
                    z-index: 20;
                }
                
                .race-gate {
                    position: absolute;
                    bottom: 100%;
                    width: calc(25% - 16px);
                    margin: 0 8px;
                    height: 70px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 8px;
                    border-radius: 10px;
                    background: rgba(11, 18, 34, 0.9);
                    border: 2px solid #3b82f6;
                    color: white;
                    font-weight: 600;
                    font-size: 16px;
                    z-index: 10;
                    word-break: break-word;
                    line-height: 1.2;
                }
                
                .race-overlay {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    place-items: center;
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(2px);
                    z-index: 50;
                    padding: 16px;
                }
                
                .race-card {
                    background: #0b1222;
                    border: 1px solid #1f2937;
                    border-radius: 20px;
                    padding: 32px;
                    max-width: 600px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                }
                
                .race-card h2 {
                    margin: 0 0 16px;
                    font-size: 32px;
                    color: #fff;
                }
                
                .race-card p {
                    margin: 12px 0 20px;
                    font-size: 18px;
                    color: #dbeafe;
                    line-height: 1.4;
                }
                
                .race-btn {
                    background: linear-gradient(180deg, #3b82f6, #2563eb);
                    border: none;
                    color: #031020;
                    font-weight: 800;
                    padding: 12px 24px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 8px;
                }
                
                .race-btn:hover {
                    transform: translateY(-1px);
                }
                
                .race-btn:active {
                    transform: translateY(1px);
                }
                
                .race-toast {
                    position: absolute;
                    top: 80px;
                    right: 20px;
                    background: #0b1222;
                    color: #fff;
                    border: 1px solid #334155;
                    border-radius: 12px;
                    padding: 12px 20px;
                    font-size: 24px;
                    font-weight: 900;
                    z-index: 60;
                    display: none;
                }
                
                .race-controls {
                    position: absolute;
                    bottom: 16px;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    gap: 16px;
                    z-index: 20;
                }
                
                .race-control-btn {
                    background: #0b1222;
                    border: 1px solid #334155;
                    color: #e5e7eb;
                    padding: 10px 16px;
                    border-radius: 10px;
                    font-size: 18px;
                    cursor: pointer;
                }
                
                @media (max-width: 768px) {
                    .race-question {
                        font-size: 16px;
                        padding: 12px;
                    }
                    
                    .race-gate {
                        font-size: 14px;
                        height: 60px;
                    }
                }
            </style>
            
            <div class="race-game">
                <div class="race-hud">
                    <div><strong>Puntaje:</strong> <span id="race-score">0</span></div>
                    <div><strong>Ronda:</strong> <span id="race-round">1</span></div>
                </div>
                
                <div class="race-area">
                    <div class="race-lanes" id="race-lanes">
                        <div class="race-lane" data-lane="0"></div>
                        <div class="race-lane" data-lane="1"></div>
                        <div class="race-lane" data-lane="2"></div>
                        <div class="race-lane" data-lane="3"></div>
                    </div>
                    
                    <div class="race-player" id="race-player"></div>
                    
                    <div class="race-question" id="race-question">
                        <span id="race-question-text">Preparando pregunta...</span>
                    </div>
                    
                    <div class="race-controls">
                        <button class="race-control-btn" id="race-btn-left">⟵</button>
                        <button class="race-control-btn" id="race-btn-right">⟶</button>
                    </div>
                    
                    <div class="race-overlay" id="race-overlay">
                        <div class="race-card">
                            <h2 id="race-title">🏃 Carrera del Conocimiento</h2>
                            <p id="race-description">
                                Muévete con las <strong>flechas del teclado</strong> ← → entre los 4 carriles.<br/>
                                Atraviesa la <strong>respuesta correcta</strong> de cada pregunta.
                            </p>
                            <button class="race-btn" id="race-btn-start">Comenzar Carrera</button>
                        </div>
                    </div>
                    
                    <div class="race-toast" id="race-toast"></div>
                </div>
            </div>
        `;
        
        this.elementos = {
            area: container.querySelector('.race-area'),
            lanes: container.querySelector('#race-lanes'),
            player: container.querySelector('#race-player'),
            question: container.querySelector('#race-question-text'),
            overlay: container.querySelector('#race-overlay'),
            title: container.querySelector('#race-title'),
            description: container.querySelector('#race-description'),
            btnStart: container.querySelector('#race-btn-start'),
            btnLeft: container.querySelector('#race-btn-left'),
            btnRight: container.querySelector('#race-btn-right'),
            toast: container.querySelector('#race-toast'),
            score: container.querySelector('#race-score'),
            round: container.querySelector('#race-round')
        };
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.estado.corriendo) return;
            
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.moverJugador(this.estado.carril - 1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.moverJugador(this.estado.carril + 1);
            }
        });
        
        this.elementos.btnLeft.addEventListener('click', () => {
            if (this.estado.corriendo) {
                this.moverJugador(this.estado.carril - 1);
            }
        });
        
        this.elementos.btnRight.addEventListener('click', () => {
            if (this.estado.corriendo) {
                this.moverJugador(this.estado.carril + 1);
            }
        });
        
        this.elementos.btnStart.addEventListener('click', () => {
            this.iniciarJuego();
        });
        
        window.addEventListener('resize', () => {
            if (this.estado.corriendo) {
                this.actualizarPosicionJugador();
            }
        });
    }
    
    getPreguntasPorDefecto() {
        return [
            {
                pregunta: "¿Cuál es la capital de Argentina?",
                correcta: "Buenos Aires",
                incorrectas: ["Córdoba", "Mendoza", "Rosario"]
            },
            {
                pregunta: "¿Cuánto es 7 × 6?",
                correcta: "42",
                incorrectas: ["36", "49", "48"]
            },
            {
                pregunta: "¿Qué órgano bombea la sangre?",
                correcta: "Corazón",
                incorrectas: ["Pulmones", "Hígado", "Riñones"]
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
        this.elementos.title.textContent = '🏃 Carrera del Conocimiento';
        this.elementos.description.innerHTML = `
            Muévete con las <strong>flechas del teclado</strong> ← → entre los 4 carriles.<br/>
            Atraviesa la <strong>respuesta correcta</strong> de cada pregunta.
        `;
        this.elementos.btnStart.textContent = 'Comenzar Carrera';
        this.elementos.btnStart.style.display = 'inline-block';
    }
    
    ocultarOverlay() {
        this.elementos.overlay.style.display = 'none';
    }
    
    iniciarJuego() {
        this.estado.corriendo = true;
        this.estado.juegoTerminado = false;
        this.estado.carril = 1;
        this.estado.topJugador = 36;
        this.estado.puntos = 0;
        
        this.ocultarOverlay();
        this.prepararRonda();
        this.actualizarHUD();
        this.limpiarPuertas();
        this.actualizarPosicionJugador();
        
        this.iniciarLoop();
        
        setTimeout(() => {
            this.generarPregunta();
        }, this.configuracion.tiempoEntrePreguntas);
    }
    
    generarPregunta() {
        if (this.estado.indicePreguntaRonda >= this.estado.preguntasRondaActual.length) {
            this.completarRonda();
            return;
        }
        
        this.limpiarPuertas();
        this.estado.respondido = false;
        this.estado.preguntaActiva = true;
        
        const pregunta = this.estado.preguntasRondaActual[this.estado.indicePreguntaRonda];
        this.estado.preguntaActual = pregunta;
        
        this.estado.indicePreguntaGlobal = this.preguntas.findIndex(p => 
            p.pregunta === pregunta.pregunta && 
            p.correcta === pregunta.correcta
        );
        
        this.elementos.question.textContent = pregunta.pregunta;
        
        const carrilCorrecto = Math.floor(Math.random() * 4);
        const opciones = [...pregunta.incorrectas];
        
        for (let i = 0; i < 4; i++) {
            const esCorrecta = i === carrilCorrecto;
            const texto = esCorrecta ? pregunta.correcta : opciones.shift();
            
            this.crearPuerta(i, texto, esCorrecta);
        }
        
        console.log(`🎯 Pregunta ${this.estado.indicePreguntaRonda + 1}/${this.estado.preguntasRondaActual.length}: ${pregunta.pregunta}`);
        console.log(`🎯 Respuesta correcta en carril ${carrilCorrecto}: ${pregunta.correcta}`);
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
    
    crearPuerta(carril, texto, esCorrecta) {
        const puerta = document.createElement('div');
        puerta.className = 'race-gate';
        puerta.textContent = texto;
        puerta.style.left = `${carril * 25}%`;
        puerta.style.bottom = '-150px';
        
        this.elementos.lanes.appendChild(puerta);
        
        this.estado.puertas.push({
            elemento: puerta,
            carril: carril,
            esCorrecta: esCorrecta,
            y: -150,
            verificada: false
        });
    }
    
    moverJugador(nuevoCarril) {
        this.estado.carril = Math.max(0, Math.min(3, nuevoCarril));
        this.actualizarPosicionJugador();
    }
    
    actualizarPosicionJugador() {
        const anchoContenedor = this.elementos.area.getBoundingClientRect().width;
        const anchoCarril = anchoContenedor / 4;
        const centroCarril = (anchoCarril * this.estado.carril) + (anchoCarril / 2);
        
        this.elementos.player.style.left = `${centroCarril}px`;
        this.elementos.player.style.top = `${this.estado.topJugador}px`;
    }
    
    limpiarPuertas() {
        this.estado.puertas.forEach(puerta => {
            puerta.elemento.remove();
        });
        this.estado.puertas = [];
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
    
    resolverRespuesta(esCorrecta) {
        if (this.estado.respondido) return;
        
        this.estado.respondido = true;
        this.estado.preguntaActiva = false;
        
        if (window.lumaiTracker) {
            const preguntaTexto = this.estado.preguntaActual.pregunta;
            const respuestaUsuario = esCorrecta ? this.estado.preguntaActual.correcta : "Respuesta incorrecta";
            const respuestaCorrecta = this.estado.preguntaActual.correcta;
            const concepto = this.extraerConcepto(preguntaTexto);
            
            window.lumaiTracker.recordCustomEvent('response_recorded', {
                question: preguntaTexto,
                userAnswer: respuestaUsuario,
                correctAnswer: respuestaCorrecta,
                isCorrect: esCorrecta,
                concept: concepto,
                activity: 'carrera-conocimiento'
            });
            
            console.log(`📊 TRACKING: ${esCorrecta ? '✅' : '❌'} "${preguntaTexto}" - ${respuestaUsuario}`);
        }
        
        if (esCorrecta) {
            if (this.preguntasIncorrectas.includes(this.estado.indicePreguntaGlobal)) {
                this.preguntasIncorrectas = this.preguntasIncorrectas.filter(
                    indice => indice !== this.estado.indicePreguntaGlobal
                );
                console.log(`✅ Pregunta ${this.estado.indicePreguntaGlobal} corregida. Incorrectas restantes: ${this.preguntasIncorrectas.length}`);
            }
            
            this.estado.puntos += 20;
            
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
                console.log(`🛑 MÁXIMO DE ERRORES ALCANZADO (${this.erroresAcumulados}/${this.maxErrores})`);
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
        if (preguntaLower.includes('suma') || preguntaLower.includes('+') || preguntaLower.includes('sumar')) {
            return 'Suma';
        }
        if (preguntaLower.includes('resta') || preguntaLower.includes('-') || preguntaLower.includes('restar')) {
            return 'Resta';
        }
        if (preguntaLower.includes('multiplicar') || preguntaLower.includes('×') || preguntaLower.includes('*')) {
            return 'Multiplicación';
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
    
    iniciarLoop() {
        if (!this.estado.corriendo) return;
        
        this.actualizarPuertas();
        this.actualizarDescensoJugador();
        
        requestAnimationFrame(() => this.iniciarLoop());
    }
    
    actualizarPuertas() {
        const dt = 1/60;
        const dy = this.estado.velocidadMundo * dt;
        const alturaContenedor = this.elementos.area.clientHeight;
        const alturaJugador = 50;
        
        const fondoJugador = alturaContenedor - (this.estado.topJugador + alturaJugador);
        
        for (let i = this.estado.puertas.length - 1; i >= 0; i--) {
            const puerta = this.estado.puertas[i];
            puerta.y += dy;
            puerta.elemento.style.bottom = `${puerta.y}px`;
            
            if (!puerta.verificada && 
                puerta.y + 70 >= fondoJugador && 
                puerta.y <= fondoJugador + alturaJugador) {
                
                puerta.verificada = true;
                
                if (puerta.carril === this.estado.carril) {
                    this.resolverRespuesta(puerta.esCorrecta);
                    break;
                }
            }
            
            if (puerta.y > alturaContenedor + 100) {
                puerta.elemento.remove();
                this.estado.puertas.splice(i, 1);
            }
        }
        
        if (this.estado.preguntaActiva && this.estado.puertas.length > 0) {
            const todasPasaron = this.estado.puertas.every(p => 
                p.verificada || p.y > fondoJugador + alturaJugador
            );
            
            if (todasPasaron && !this.estado.respondido) {
                this.resolverRespuesta(false);
            }
        }
    }
    
    actualizarDescensoJugador() {
        const dt = 1/60;
        const alturaJugador = 50;
        const maxTop = this.elementos.area.clientHeight - alturaJugador - 60;
        
        this.estado.topJugador = Math.min(
            this.estado.topJugador + this.estado.velocidadDescenso * dt, 
            maxTop
        );
        
        this.elementos.player.style.top = `${this.estado.topJugador}px`;
    }
}

// ==================== LIMPIAR RECURSOS ====================

export function limpiarRecursos() {
    console.log("🧹 Limpiando recursos de Carrera del Conocimiento");
}

// ==================== LOGGING ====================
console.log("🏃 activity-carrera-conocimiento.js CON GRAMÁTICA CORREGIDA Y FALLBACK INTELIGENTE cargado correctamente");
console.log("✅ Funcionalidades: IA + Fallback Inteligente + Lógica Pedagógica + Tracking + Sistema de Rondas + GRAMÁTICA ESPAÑOLA PERFECTA + LIMPIEZA JSON GEMINI 2.5 + TOKENS 3000 + FILTRO VERBOS MEJORADO");
