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

function obtenerConfiguracionBasketball() {
    const nivel = estadoGlobal.perfil.dimensiones.procesamiento_informacion;
    
    const configuraciones = {
        "bajo": {
            numPelotas: 3,
            velocidad: 0.8,
            tiempoRespuesta: 8000,
            cantidadPreguntas: 3,
            descripcion: "Pocas pelotas, velocidad lenta, mas tiempo"
        },
        "medio": {
            numPelotas: 6,
            velocidad: 0.9,
            tiempoRespuesta: 6000,
            cantidadPreguntas: 5,
            descripcion: "Velocidad moderada, tiempo equilibrado"
        },
        "alto": {
            numPelotas: 10,
            velocidad: 0.9,
            tiempoRespuesta: 4000,
            cantidadPreguntas: 6,
            descripcion: "Mas pelotas, velocidad alta, desafio mayor"
        }
    };
    
    return configuraciones[nivel] || configuraciones["medio"];
}

// ==================== FUNCIONES DE CORRECCIÓN GRAMATICAL MEJORADAS ====================

function corregirGramaticaPregunta(pregunta) {
    if (!pregunta || typeof pregunta !== 'string') return pregunta;
    
    let preguntaCorregida = pregunta.trim();
    
    // Limpiar signos de interrogación duplicados al inicio
    preguntaCorregida = preguntaCorregida.replace(/¿+/g, '¿');
    preguntaCorregida = preguntaCorregida.replace(/\?+/g, '?');
    
    // 🔧 NUEVO: Limpiar artículos duplicados
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
    
    // 🔧 NUEVO: Mejoras contextuales para preguntas específicas
    // Agregar contexto temporal/específico a preguntas genéricas
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
    
    // 1. **MEJORADO**: "que pintaban/hacían/escribían + sustantivo" → agregar artículo
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
    
    // 6. **MEJORADO**: Patrones adicionales específicos que faltan
    // "cómo vivían X" → "¿cómo vivían las X?"
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

function corregirGramaticaRespuesta(respuesta) {
    if (!respuesta || typeof respuesta !== 'string') return respuesta;
    
    let respuestaCorregida = respuesta.trim();
    
    // ===== CORRECCIONES ESPECÍFICAS DE ORDEN DE PALABRAS =====
    
    // 1. **NUEVO**: Patrones específicos problemáticos
    const correccionesEspecificas = [
        // Casos específicos que están fallando
        { incorrecto: /vida con su/gi, correcto: 'contar su vida' },
        { incorrecto: /historia con su/gi, correcto: 'contar su historia' },
        { incorrecto: /experiencia con su/gi, correcto: 'contar su experiencia' },
        { incorrecto: /día con su/gi, correcto: 'contar su día' },
        
        // Patrones generales de "sustantivo con su" → "verbo su sustantivo"
        { incorrecto: /([a-záéíóúñü]+)\s+con\s+su/gi, correcto: 'contar su $1' },
    ];
    
    // Aplicar correcciones específicas primero
    correccionesEspecificas.forEach(correccion => {
        respuestaCorregida = respuestaCorregida.replace(correccion.incorrecto, correccion.correcto);
    });
    
    // 2. Correcciones de orden de palabras existentes
    const correccionesOrden = [
        // "sonidos escribir" → "escribir sonidos"
        [/sonidos escribir/gi, 'escribir sonidos'],
        [/notas tocar/gi, 'tocar notas'],
        [/música hacer/gi, 'hacer música'],
        [/dibujos hacer/gi, 'hacer dibujos'],
        [/pinturas crear/gi, 'crear pinturas'],
        [/instrumentos tocar/gi, 'tocar instrumentos'],
        [/canciones cantar/gi, 'cantar canciones'],
        
        // **NUEVO**: Más patrones problemáticos
        [/historias contar/gi, 'contar historias'],
        [/cuentos narrar/gi, 'narrar cuentos'],
        [/experiencias vivir/gi, 'vivir experiencias'],
        [/aventuras tener/gi, 'tener aventuras'],
        
        // Patrones más generales de sustantivo + verbo → verbo + sustantivo
        [/([a-záéíóúñü]+s)\s+(escribir|tocar|hacer|crear|cantar|dibujar|pintar|contar|narrar)/gi, '$2 $1'],
    ];
    
    correccionesOrden.forEach(([patron, reemplazo]) => {
        respuestaCorregida = respuestaCorregida.replace(patron, reemplazo);
    });
    
    // 3. **NUEVO**: Correcciones de fragmentos mal formados
    const fragmentosMalFormados = [
        // Si empieza con "con su" agregar verbo apropiado
        { patron: /^con su ([a-záéíóúñü]+)/gi, reemplazo: 'contar su $1' },
        { patron: /^su ([a-záéíóúñü]+)/gi, reemplazo: 'contar su $1' },
        
        // Si termina con "con" eliminar
        { patron: /([a-záéíóúñü]+)\s+con$/gi, reemplazo: '$1' },
        
        // Fragmentos incompletos comunes
        { patron: /^de su/gi, reemplazo: 'contar de su' },
        { patron: /^sobre su/gi, reemplazo: 'hablar sobre su' },
    ];
    
    fragmentosMalFormados.forEach(correccion => {
        respuestaCorregida = respuestaCorregida.replace(correccion.patron, correccion.reemplazo);
    });
    
    // 4. Correcciones de artículos faltantes para respuestas comunes
    if (/^(sonidos|notas|dibujos|pinturas|colores|líneas)$/i.test(respuestaCorregida)) {
        respuestaCorregida = 'los ' + respuestaCorregida.toLowerCase();
    }
    if (/^(música|arte|pentagrama)$/i.test(respuestaCorregida)) {
        respuestaCorregida = 'la ' + respuestaCorregida.toLowerCase();
    }
    
    // 5. **NUEVO**: Validar que la respuesta tenga sentido gramatical básico
    if (respuestaCorregida.length < 4 && !/^(sí|no|el|la|los|las)$/i.test(respuestaCorregida)) {
        console.warn('Respuesta muy corta detectada:', respuestaCorregida);
    }
    
    return respuestaCorregida;
}

// ==================== GENERACION DE ACTIVIDADES CON IA ====================

export async function generarActividad() {
    console.log("🏀 Generando actividad Basketball con IA...");
    
    try {
        const config = obtenerConfiguracionBasketball();
        console.log(`🎮 Configuración para ${estadoGlobal.perfil.nombre_visible}: ${config.descripcion}`);
        
        const actividadesIA = await generarPreguntasConIA();
        
        if (actividadesIA && actividadesIA.length >= config.cantidadPreguntas) {
            console.log("✅ Preguntas generadas exitosamente con IA");
            return {
                tipo: "basketball",
                actividades: actividadesIA.slice(0, config.cantidadPreguntas),
                configuracion: config,
                instrucciones: "Toca la pelota con la respuesta correcta"
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
    const config = obtenerConfiguracionBasketball();
    const cantidadRequerida = config.cantidadPreguntas;
    
    const prompt = `
Eres un experto en educación inclusiva creando preguntas para el juego "Basketball" para ${estadoGlobal.perfil.nombre_visible}.

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

## PATRONES ESPECÍFICOS A CORREGIR:
❌ "que pintaban personas" → ✅ "¿Qué pintaban las personas en aquella época?"
❌ "que hacían animales" → ✅ "¿Qué hacían los animales?"
❌ "cómo vivían personas" → ✅ "¿Cómo vivían las personas antiguamente?"

## ORDEN DE PALABRAS EN RESPUESTAS:
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
- Cada pregunta debe tener 1 respuesta CORRECTA y 9 respuestas INCORRECTAS
- **VERIFICAR:** Todas las preguntas deben usar artículos correctos y singular/plural apropiado
- **VERIFICAR:** Orden correcto verbo-sustantivo en respuestas
- **VERIFICAR:** NO fragmentos como "con su", "vida con", "de su" solos
- **VERIFICAR:** NO artículos duplicados como "las las", "los los"
- **VERIFICAR:** Contexto específico en todas las preguntas
- Respuestas cortas (máximo 3 palabras cada una)
- Adapta el lenguaje según el perfil del estudiante

FORMATO DE RESPUESTA (JSON):
\`\`\`json
[
${Array.from({length: cantidadRequerida}, (_, i) => 
  `  {
    "pregunta": "¿Pregunta gramaticalmente PERFECTA y específica ${i+1} sobre ${estadoGlobal.tema}?",
    "respuesta_correcta": "Respuesta ordenada",
    "respuestas_incorrectas": ["Resp1", "Resp2", "Resp3", "Resp4", "Resp5", "Resp6", "Resp7", "Resp8", "Resp9"]
  }`).join(',\n')}
]
\`\`\`

IMPORTANTE: 
- Responde SOLO con el JSON
- TRIPLE verificación de gramática y contexto antes de responder
- Usar signos de interrogación españoles UNA SOLA VEZ: ¿pregunta?
- EVITAR fragmentos mal formados en respuestas
- AGREGAR contexto específico a preguntas genéricas
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
        
        const actividades = JSON.parse(jsonLimpio);
        
        if (Array.isArray(actividades) && actividades.length >= cantidadRequerida) {
            console.log(`✅ Generadas ${actividades.length} preguntas para perfil ${estadoGlobal.perfil.dimensiones.procesamiento_informacion}`);
            
            // 🔧 APLICAR CORRECCIÓN DE GRAMÁTICA A PREGUNTAS Y RESPUESTAS
            return actividades.slice(0, cantidadRequerida).map(actividad => ({
                pregunta: corregirGramaticaPregunta(actividad.pregunta || `¿Pregunta sobre ${estadoGlobal.tema}?`),
                respuesta_correcta: corregirGramaticaRespuesta(actividad.respuesta_correcta || "Respuesta correcta"),
                respuestas_incorrectas: Array.isArray(actividad.respuestas_incorrectas) && actividad.respuestas_incorrectas.length >= 9 
                    ? actividad.respuestas_incorrectas.slice(0, 9).map(resp => corregirGramaticaRespuesta(resp))
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

function generarActividadFallback() {
    console.log("🔄 Generando actividad Basketball con fallback INTELIGENTE");
    
    const config = obtenerConfiguracionBasketball();
    const tema = estadoGlobal.tema || 'el tema';
    const explicacion = estadoGlobal.explicacionGenerada || '';
    const cantidadRequerida = config.cantidadPreguntas;
    
    // ✅ EXTRAER PALABRAS CLAVE REALES DE LA EXPLICACIÓN
    const palabrasClave = extraerPalabrasClaveDeHTML(explicacion);
    
    if (palabrasClave.length < cantidadRequerida) {
        console.warn(`⚠️ Solo se extrajeron ${palabrasClave.length} palabras, se requieren ${cantidadRequerida}`);
    }
    
    const preguntasGeneradas = [];
    
    for (let i = 0; i < cantidadRequerida; i++) {
        let pregunta, respuestaCorrecta, respuestasIncorrectas;
        
        if (i < palabrasClave.length) {
            // ✅ USAR PALABRA REAL EXTRAÍDA
            const palabraClave = palabrasClave[i];
            respuestaCorrecta = palabraClave;
            
            // ✅ GENERAR PREGUNTA ESPECÍFICA
            const temaLower = tema.toLowerCase();
            const palabraLower = palabraClave.toLowerCase();
            
            // Si la palabra ES el tema
            if (palabraLower === temaLower) {
                pregunta = `¿Qué aprendimos sobre ${palabraClave}?`;
            } else {
                // Si NO es el tema
                pregunta = `¿Qué es ${palabraClave}?`;
            }
            
            // ✅ GENERAR OPCIONES INCORRECTAS DESDE OTRAS PALABRAS CLAVE
            respuestasIncorrectas = generarOpcionesDesdeOtrasPalabras(palabrasClave, palabraClave, 9);
            
            console.log(`📝 Pregunta ${i + 1}: "${pregunta}" → Correcta: "${respuestaCorrecta}"`);
        } else {
            // ❌ FALLBACK GENÉRICO (solo si no hay suficientes palabras)
            pregunta = `¿Qué estudiamos sobre ${tema}? (${i+1}/${cantidadRequerida})`;
            respuestaCorrecta = `Concepto ${i+1}`;
            respuestasIncorrectas = ["OpciónA", "OpciónB", "OpciónC", "OpciónD", "OpciónE", "OpciónF", "OpciónG", "OpciónH", "OpciónI"];
            console.warn(`⚠️ Usando fallback genérico para pregunta ${i + 1}`);
        }
        
        preguntasGeneradas.push({ pregunta, respuesta_correcta: respuestaCorrecta, respuestas_incorrectas: respuestasIncorrectas });
    }
    
    console.log(`✅ Generadas ${preguntasGeneradas.length} preguntas con fallback inteligente`);
    
    return {
        tipo: "basketball",
        actividades: preguntasGeneradas,
        configuracion: config,
        instrucciones: "Toca la pelota con la respuesta correcta",
        esFallback: true
    };
}

function generarOpcionesDesdeOtrasPalabras(palabrasClave, palabraCorrecta, cantidadNecesaria = 9) {
    // Filtrar la palabra correcta de las opciones incorrectas
    const palabrasDisponibles = palabrasClave.filter(p => 
        p.toLowerCase() !== palabraCorrecta.toLowerCase()
    );
    
    const opciones = [];
    
    // Tomar hasta cantidadNecesaria palabras de las disponibles
    for (let i = 0; i < cantidadNecesaria && i < palabrasDisponibles.length; i++) {
        opciones.push(palabrasDisponibles[i]);
    }
    
    // Si no hay suficientes palabras clave, completar con opciones genéricas
    while (opciones.length < cantidadNecesaria) {
        opciones.push(`Opción ${String.fromCharCode(65 + opciones.length)}`);
    }
    
    return opciones;
}

function generarRespuestasIncorrectasPorDefecto() {
    return ["OpciónA", "OpciónB", "OpciónC", "OpciónD", "OpciónE", "OpciónF", "OpciónG", "OpciónH", "OpciónI"];
}

// ==================== RENDERIZAR ====================

export async function renderizar() {
    console.log("🎨 Renderizando actividad Basketball...");
    
    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (!actividadesEl) {
        console.error("❌ Elemento de actividades no encontrado");
        return;
    }
    
    const config = estadoGlobal.actividadActual.configuracion || obtenerConfiguracionBasketball();
    const cantidadPreguntas = estadoGlobal.actividadActual.actividades.length;
    const esFallback = estadoGlobal.actividadActual.esFallback || false;
    
    // Crear contenedor para el juego
    actividadesEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #00509e; margin-bottom: 15px;">🏀 Basketball</h2>
            <p style="margin-bottom: 10px; color: #666;">
                <strong>Instrucciones:</strong> Toca la pelota con la respuesta correcta
            </p>
            <div id="basketball-game-container" style="margin: 20px auto; max-width: 980px;"></div>
        </div>
    `;
    
   
    const preguntas = estadoGlobal.actividadActual.actividades;
    const juegoBasketball = new BasketballGame('basketball-game-container', preguntas, config);
    
    // Resetear contadores para nueva sesión
    juegoBasketball.resetearContadores();
    
    // Callbacks corregidos para LUMAI
    juegoBasketball.setCallbacks(
        (pregunta, progreso) => {
            console.log('✅ Callback: Respuesta correcta en Basketball');
        },
        
        (pregunta, progreso) => {
            console.log('❌ Callback: Respuesta incorrecta en Basketball');
        },
        
        (actividad_dominada) => {
            console.log(`🏆 CALLBACK JUEGO COMPLETADO:`);
            console.log(`📊 Actividad dominada: ${actividad_dominada}`);
            
            if (actividad_dominada) {
                // ACTIVIDAD DOMINADA - Respondió bien todas las preguntas
                console.log(`🌟 LLAMANDO completarActividadCompleta(true) - ACTIVIDAD DOMINADA`);
                setTimeout(() => {
                    completarActividadCompleta(true);
                }, 800);
            } else {
                // 3 errores acumulados - Continuar en rotación
                console.log(`🔄 LLAMANDO completarActividadCompleta(false) - CONTINUAR EN ROTACIÓN`);
                setTimeout(() => {
                    completarActividadCompleta(false);
                }, 800);
            }
        }
    );
    
    console.log(`✅ Basketball renderizada - ${cantidadPreguntas} preguntas con lógica pedagógica y gramática perfeccionada`);
}

// ==================== CLASE DEL JUEGO BASKETBALL - NUEVA LÓGICA PEDAGÓGICA ====================

class BasketballGame {
    constructor(containerId, preguntas = null, configuracion = null) {
        this.containerId = containerId;
        
        // Configuración adaptativa del juego
        this.configuracion = configuracion || {
            numPelotas: 6,
            velocidad: 0.9,
            tiempoRespuesta: 6000,
            cantidadPreguntas: 5
        };
        
        // Preguntas del juego
        this.preguntas = preguntas || this.getPreguntasPorDefecto();
        
        // 🎯 NUEVA LÓGICA PEDAGÓGICA (igual que Multiple Choice, Carrera y Sopa)
        this.erroresAcumulados = 0;           // Errores totales en toda la actividad
        this.maxErrores = 3;                  // Máximo 3 errores
        this.preguntasIncorrectas = [];       // Índices de preguntas respondidas incorrectamente
        this.rondaActual = 1;                 // Ronda actual (1 = primera vez, 2+ = repeticiones)
        this.todasLasPreguntasMostradas = false; // Si ya mostró todas las preguntas una vez
        
        // Estado del juego (mantener diseño visual)
        this.estado = {
            corriendo: false,
            preguntaActual: null,
            indicePreguntaGlobal: 0,         // Índice en el array original de preguntas
            indicePreguntaRonda: 0,          // Índice en la ronda actual
            preguntasRondaActual: [],        // Preguntas de la ronda actual
            juegoTerminado: false,
            pelotas: [],
            animacionId: null,
            
            // Puntaje (mantener para interfaz)
            puntos: 0
        };
        
        // Callbacks para Lumai
        this.onRespuestaCorrecta = null;
        this.onRespuestaIncorrecta = null;
        this.onJuegoCompletado = null;
        
        console.log(`🏀 Basketball configurado: ${this.preguntas.length} preguntas, lógica pedagógica implementada`);
        
        this.init();
    }
    
    // Método resetear contadores
    resetearContadores() {
        this.erroresAcumulados = 0;
        this.preguntasIncorrectas = [];
        this.rondaActual = 1;
        this.todasLasPreguntasMostradas = false;
        console.log("🔄 Contadores de Basketball reseteados para nueva sesión");
    }
    
    // Métodos públicos para lumai
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
                .basketball-game {
                    background: linear-gradient(135deg, #2d3748, #4a5568);
                    color: #e2e8f0;
                    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                    border-radius: 18px;
                    overflow: hidden;
                    max-width: 980px;
                    margin: 0 auto;
                }
                
                .basketball-hud {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                    justify-content: center;
                    background: rgba(26, 32, 44, 0.9);
                    border-bottom: 1px solid #4a5568;
                    padding: 12px;
                }
                
                .basketball-hud strong { color: #fff; }
                
                .basketball-court {
                    position: relative;
                    height: 500px;
                    background-image: url('img/fondo-juego-basket.png');
                    background-size: cover;
                    background-position: center;
                    border: 4px solid #654321;
                    border-radius: 10px;
                    overflow: hidden;
                }
                
                .basketball-ball {
                    position: absolute;
                    width: 120px;
                    height: 120px;
                    background-image: url('img/pelota-basket.png');
                    background-size: cover;
                    background-position: center;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    font-weight: bold;
                    font-size: 0.9rem;
                    color: white;
                    text-shadow: 1px 1px 3px rgba(0,0,0,0.9);
                    cursor: pointer;
                    transition: transform 0.1s ease;
                    padding: 5px;
                    word-break: break-word;
                    line-height: 1.2;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }
                
                .basketball-ball:hover {
                    transform: scale(1.1);
                }
                
                .basketball-ball:active {
                    transform: scale(0.95);
                }
                
                .basketball-question {
                    position: absolute;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: min(90%, 600px);
                    background: rgba(26, 32, 44, 0.95);
                    border: 2px solid #4a5568;
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                    color: #fff;
                    font-size: 18px;
                    font-weight: 600;
                    z-index: 20;
                }
                
                .basketball-overlay {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    place-items: center;
                    background: rgba(26, 32, 44, 0.85);
                    backdrop-filter: blur(2px);
                    z-index: 50;
                    padding: 16px;
                }
                
                .basketball-card {
                    background: #2d3748;
                    border: 2px solid #4a5568;
                    border-radius: 20px;
                    padding: 32px;
                    max-width: 600px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                }
                
                .basketball-card h2 {
                    margin: 0 0 16px;
                    font-size: 32px;
                    color: #fff;
                }
                
                .basketball-card p {
                    margin: 12px 0 20px;
                    font-size: 18px;
                    color: #cbd5e0;
                    line-height: 1.4;
                }
                
                .basketball-btn {
                    background: linear-gradient(180deg, #38a169, #2f855a);
                    border: none;
                    color: white;
                    font-weight: 800;
                    padding: 12px 24px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 8px;
                }
                
                .basketball-btn:hover {
                    transform: translateY(-1px);
                }
                
                .basketball-btn:active {
                    transform: translateY(1px);
                }
                
                .basketball-toast {
                    position: absolute;
                    top: 80px;
                    right: 20px;
                    background: #2d3748;
                    color: #fff;
                    border: 2px solid #4a5568;
                    border-radius: 12px;
                    padding: 12px 20px;
                    font-size: 24px;
                    font-weight: 900;
                    z-index: 60;
                    display: none;
                }
                
                @media (max-width: 768px) {
                    .basketball-question {
                        font-size: 16px;
                        padding: 12px;
                    }
                    
                    .basketball-ball {
                        width: 100px;
                        height: 100px;
                        font-size: 0.8rem;
                    }
                }
            </style>
            
            <div class="basketball-game">
                <div class="basketball-hud">
                    <div><strong>Puntaje:</strong> <span id="basketball-score">0</span></div>
                    <div><strong>Ronda:</strong> <span id="basketball-round">1</span></div>
                </div>
                
                <div class="basketball-court" id="basketball-court">
                    <div class="basketball-question" id="basketball-question">
                        <span id="basketball-question-text">Preparando pregunta...</span>
                    </div>
                    
                    <div class="basketball-overlay" id="basketball-overlay">
                        <div class="basketball-card">
                            <h2 id="basketball-title">🏀 Basketball</h2>
                            <p id="basketball-description">
                                Toca la <strong>pelota con la respuesta correcta</strong>.<br/>
                                Las pelotas se mueven por la cancha.
                            </p>
                            <button class="basketball-btn" id="basketball-btn-start">Comenzar Juego</button>
                        </div>
                    </div>
                    
                    <div class="basketball-toast" id="basketball-toast"></div>
                </div>
            </div>
        `;
        
        // Obtener referencias a elementos
        this.elementos = {
            court: container.querySelector('#basketball-court'),
            question: container.querySelector('#basketball-question-text'),
            overlay: container.querySelector('#basketball-overlay'),
            title: container.querySelector('#basketball-title'),
            description: container.querySelector('#basketball-description'),
            btnStart: container.querySelector('#basketball-btn-start'),
            toast: container.querySelector('#basketball-toast'),
            score: container.querySelector('#basketball-score'),
            round: container.querySelector('#basketball-round')
        };
    }
    
    setupEventListeners() {
        // Botón de inicio
        this.elementos.btnStart.addEventListener('click', () => {
            this.iniciarJuego();
        });
        
        // Responsive
        window.addEventListener('resize', () => {
            if (this.estado.corriendo) {
                this.actualizarPosicionesPelotas();
            }
        });
    }
    
    getPreguntasPorDefecto() {
        return [
            {
                pregunta: "¿Cuál es la capital de Argentina?",
                respuesta_correcta: "Buenos Aires",
                respuestas_incorrectas: ["Córdoba", "Mendoza", "Rosario", "La Plata", "Tucumán", "Salta", "Neuquén", "Bariloche", "Mar del Plata"]
            },
            {
                pregunta: "¿Cuánto es 8 × 7?",
                respuesta_correcta: "56",
                respuestas_incorrectas: ["48", "54", "63", "49", "64", "42", "35", "72", "45"]
            },
            {
                pregunta: "¿Qué órgano bombea la sangre?",
                respuesta_correcta: "Corazón",
                respuestas_incorrectas: ["Pulmones", "Hígado", "Riñones", "Cerebro", "Estómago", "Intestino", "Páncreas", "Bazo", "Vesícula"]
            }
        ];
    }
    
    // 🎯 NUEVA LÓGICA: Preparar preguntas de la ronda
    prepararRonda() {
        if (this.rondaActual === 1) {
            // PRIMERA RONDA: Todas las preguntas
            this.estado.preguntasRondaActual = [...this.preguntas];
            console.log(`🎯 RONDA 1: Mostrando todas las ${this.preguntas.length} preguntas`);
        } else {
            // RONDAS SIGUIENTES: Solo las incorrectas
            this.estado.preguntasRondaActual = this.preguntasIncorrectas.map(indice => this.preguntas[indice]);
            console.log(`🔄 RONDA ${this.rondaActual}: Repitiendo ${this.estado.preguntasRondaActual.length} preguntas incorrectas`);
        }
        
        this.estado.indicePreguntaRonda = 0;
    }
    
    mostrarPantallaInicio() {
        this.elementos.overlay.style.display = 'grid';
        this.elementos.title.textContent = '🏀 Basketball';
        this.elementos.description.innerHTML = `
            Toca la <strong>pelota con la respuesta correcta</strong>.<br/>
            Las pelotas se mueven por la cancha.
        `;
        this.elementos.btnStart.textContent = 'Comenzar Juego';
        this.elementos.btnStart.style.display = 'inline-block';
    }
    
    ocultarOverlay() {
        this.elementos.overlay.style.display = 'none';
    }
    
    iniciarJuego() {
        this.estado.corriendo = true;
        this.estado.juegoTerminado = false;
        this.estado.puntos = 0;
        
        this.ocultarOverlay();
        this.prepararRonda();
        this.actualizarHUD();
        this.limpiarPelotas();
        
        // Iniciar primera pregunta
        setTimeout(() => {
            this.generarPregunta();
        }, 500);
    }
    
    // 🎯 NUEVA LÓGICA: Generar pregunta de la ronda actual
    generarPregunta() {
        // ✅ VERIFICAR SI COMPLETÓ TODAS LAS PREGUNTAS DE LA RONDA
        if (this.estado.indicePreguntaRonda >= this.estado.preguntasRondaActual.length) {
            this.completarRonda();
            return;
        }
        
        this.limpiarPelotas();
        
        // Mostrar pregunta actual de la ronda
        const pregunta = this.estado.preguntasRondaActual[this.estado.indicePreguntaRonda];
        this.estado.preguntaActual = pregunta;
        
        // Encontrar índice global de la pregunta (para tracking)
        this.estado.indicePreguntaGlobal = this.preguntas.findIndex(p => 
            p.pregunta === pregunta.pregunta && 
            p.respuesta_correcta === pregunta.respuesta_correcta
        );
        
        this.elementos.question.textContent = pregunta.pregunta;
        
        // Crear opciones de respuesta
        const opciones = [pregunta.respuesta_correcta];
        const incorrectas = [...pregunta.respuestas_incorrectas];
        
        // Añadir respuestas incorrectas hasta completar el número de pelotas
        while (opciones.length < this.configuracion.numPelotas && incorrectas.length > 0) {
            opciones.push(incorrectas.shift());
        }
        
        // Mezclar opciones
        opciones.sort(() => Math.random() - 0.5);
        
        // Crear pelotas
        opciones.forEach(opcion => {
            this.crearPelota(opcion, opcion === pregunta.respuesta_correcta);
        });
        
        // Iniciar animación
        this.iniciarAnimacion();
        
        console.log(`🎯 Pregunta ${this.estado.indicePreguntaRonda + 1}/${this.estado.preguntasRondaActual.length}: ${pregunta.pregunta}`);
        console.log(`🎯 Respuesta correcta: ${pregunta.respuesta_correcta}`);
    }
    
    // 🎯 NUEVA LÓGICA: Completar ronda
    completarRonda() {
        if (this.rondaActual === 1) {
            // Terminó la primera ronda
            this.todasLasPreguntasMostradas = true;
            
            if (this.preguntasIncorrectas.length === 0) {
                // ✅ PERFECTO: Respondió bien todas en la primera ronda
                console.log('🏆 PERFECTO: Todas las preguntas correctas en primera ronda');
                this.completarActividad(true);
                return;
            } else {
                // Hay preguntas incorrectas, continuar con ronda 2
                console.log(`🔄 Primera ronda terminada. ${this.preguntasIncorrectas.length} preguntas incorrectas`);
                this.iniciarSiguienteRonda();
            }
        } else {
            // Terminó una ronda de repetición
            if (this.preguntasIncorrectas.length === 0) {
                // ✅ ÉXITO: Respondió bien todas las preguntas incorrectas
                console.log('🏆 ÉXITO: Corrigió todas las preguntas incorrectas');
                this.completarActividad(true);
                return;
            } else {
                // Aún hay preguntas incorrectas, continuar
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
            console.log('📚 MÁXIMO DE ERRORES: Actividad falló, continuar en rotación');
        }
        
        // ✅ SOLO ejecutar callback - NO mostrar mensajes propios del juego
        if (this.onJuegoCompletado) {
            this.onJuegoCompletado(exitosa); // true = dominada, false = continuar en rotación
        }
    }
    
    crearPelota(texto, esCorrecta) {
        const pelotaEl = document.createElement('div');
        pelotaEl.className = 'basketball-ball';
        pelotaEl.textContent = texto;
        
        const courtRect = this.elementos.court.getBoundingClientRect();
        const courtWidth = this.elementos.court.offsetWidth;
        const courtHeight = this.elementos.court.offsetHeight;
        const size = 120;
        
        const pelota = {
            elemento: pelotaEl,
            x: Math.random() * (courtWidth - size),
            y: Math.random() * (courtHeight - size - 100) + 80, // Evitar zona de pregunta
            vx: (Math.random() - 0.5) * 4 * this.configuracion.velocidad,
            vy: (Math.random() - 0.5) * 4 * this.configuracion.velocidad,
            esCorrecta: esCorrecta
        };
        
        pelotaEl.style.left = `${pelota.x}px`;
        pelotaEl.style.top = `${pelota.y}px`;
        this.elementos.court.appendChild(pelotaEl);
        this.estado.pelotas.push(pelota);
        
        pelotaEl.onclick = () => {
            if (!this.estado.corriendo) return;
            this.resolverRespuesta(esCorrecta, pelotaEl);
        };
    }
    
    iniciarAnimacion() {
        if (!this.estado.corriendo) return;
        
        const animar = () => {
            if (!this.estado.corriendo) return;
            
            this.actualizarPelotas();
            this.estado.animacionId = requestAnimationFrame(animar);
        };
        
        animar();
    }
    
    actualizarPelotas() {
        const courtWidth = this.elementos.court.offsetWidth;
        const courtHeight = this.elementos.court.offsetHeight;
        const size = 120;
        
        this.estado.pelotas.forEach(pelota => {
            pelota.x += pelota.vx;
            pelota.y += pelota.vy;
            
            // Rebotes en bordes
            if (pelota.x <= 0 || pelota.x >= courtWidth - size) {
                pelota.vx *= -1;
                pelota.x = Math.max(0, Math.min(courtWidth - size, pelota.x));
            }
            if (pelota.y <= 80 || pelota.y >= courtHeight - size) { // 80px para evitar zona de pregunta
                pelota.vy *= -1;
                pelota.y = Math.max(80, Math.min(courtHeight - size, pelota.y));
            }
            
            pelota.elemento.style.left = `${pelota.x}px`;
            pelota.elemento.style.top = `${pelota.y}px`;
        });
    }
    
    actualizarPosicionesPelotas() {
        // Método para responsive
        const courtWidth = this.elementos.court.offsetWidth;
        const courtHeight = this.elementos.court.offsetHeight;
        const size = 120;
        
        this.estado.pelotas.forEach(pelota => {
            pelota.x = Math.min(pelota.x, courtWidth - size);
            pelota.y = Math.min(pelota.y, courtHeight - size);
            pelota.elemento.style.left = `${pelota.x}px`;
            pelota.elemento.style.top = `${pelota.y}px`;
        });
    }
    
    limpiarPelotas() {
        if (this.estado.animacionId) {
            cancelAnimationFrame(this.estado.animacionId);
            this.estado.animacionId = null;
        }
        
        this.estado.pelotas.forEach(pelota => {
            if (pelota.elemento.parentNode) {
                pelota.elemento.parentNode.removeChild(pelota.elemento);
            }
        });
        this.estado.pelotas = [];
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
    
    // ✅ NUEVA LÓGICA DE RESPUESTA CON RONDAS Y TRACKING
    resolverRespuesta(esCorrecta, pelotaEl) {
        this.estado.corriendo = false;
        
        // Cambiar color de la pelota
        pelotaEl.style.background = esCorrecta ? 'linear-gradient(135deg, #38a169, #2f855a)' : 'linear-gradient(135deg, #e53e3e, #c53030)';
        
        // ✅ TRACKING SIN DUPLICACIÓN - SOLO recordCustomEvent
        if (window.lumaiTracker) {
            const preguntaTexto = this.estado.preguntaActual.pregunta;
            const respuestaUsuario = pelotaEl.textContent;
            const respuestaCorrecta = this.estado.preguntaActual.respuesta_correcta;
            const concepto = this.extraerConcepto(preguntaTexto);
            
            // ✅ SOLO ESTE REGISTRO (elimina duplicación)
            window.lumaiTracker.recordCustomEvent('response_recorded', {
                question: preguntaTexto,
                userAnswer: respuestaUsuario,
                correctAnswer: respuestaCorrecta,
                isCorrect: esCorrecta,
                concept: concepto,
                activity: 'Basketball'
            });
            
            console.log(`📊 TRACKING: ${esCorrecta ? '✅' : '❌'} "${preguntaTexto}" - ${respuestaUsuario}`);
        }
        
        if (esCorrecta) {
            // ✅ RESPUESTA CORRECTA
            
            // Si había estado incorrecta, removerla de la lista
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
            // ❌ RESPUESTA INCORRECTA
            this.erroresAcumulados++;
            
            // Agregar a preguntas incorrectas si no está ya
            if (!this.preguntasIncorrectas.includes(this.estado.indicePreguntaGlobal)) {
                this.preguntasIncorrectas.push(this.estado.indicePreguntaGlobal);
                console.log(`❌ Pregunta ${this.estado.indicePreguntaGlobal} agregada a incorrectas. Total: ${this.preguntasIncorrectas.length}`);
            }
            
            if (this.onRespuestaIncorrecta) {
                this.onRespuestaIncorrecta(this.estado.preguntaActual, this.estado.indicePreguntaRonda + 1);
            }
            
            // ⚠️ VERIFICAR MÁXIMO DE ERRORES
            if (this.erroresAcumulados >= this.maxErrores) {
                console.log(`🛑 MÁXIMO DE ERRORES ALCANZADO (${this.erroresAcumulados}/${this.maxErrores})`);
                this.mostrarToast('¡UPS! Sigamos con otro', 2000);
                this.actualizarHUD();
                
                // ✅ Completar inmediatamente - LUMAI maneja el mensaje
                this.completarActividad(false); // Falló por errores
                return;
            }
            
            this.mostrarToast('¡UPS!');
        }
        
        this.actualizarHUD();
        
        // Continuar a la siguiente pregunta
        setTimeout(() => {
            this.estado.indicePreguntaRonda++;
            this.estado.corriendo = true;
            this.generarPregunta();
        }, 1200);
    }
    
    // ✅ FUNCIÓN DE EXTRACCIÓN DE CONCEPTOS
    extraerConcepto(pregunta) {
        if (!pregunta) return 'Concepto general';
        
        const preguntaLower = pregunta.toLowerCase();
        
        // Conceptos musicales específicos
        if (preguntaLower.includes('pentagrama') || preguntaLower.includes('línea')) {
            return 'Pentagrama';
        }
        if (preguntaLower.includes('notas') || preguntaLower.includes('nota')) {
            return 'Notas musicales';
        }
        if (preguntaLower.includes('música') || preguntaLower.includes('musical')) {
            return 'Teoría musical';
        }
        
        // Conceptos matemáticos
        if (preguntaLower.includes('suma') || preguntaLower.includes('+') || preguntaLower.includes('sumar')) {
            return 'Suma';
        }
        if (preguntaLower.includes('resta') || preguntaLower.includes('-') || preguntaLower.includes('restar')) {
            return 'Resta';
        }
        if (preguntaLower.includes('multiplicar') || preguntaLower.includes('×') || preguntaLower.includes('*')) {
            return 'Multiplicación';
        }
        
        // Conceptos de ciencias
        if (preguntaLower.includes('planeta') || preguntaLower.includes('sol')) {
            return 'Sistema solar';
        }
        if (preguntaLower.includes('célula') || preguntaLower.includes('organismo')) {
            return 'Biología';
        }
        
        // Conceptos de geografía
        if (preguntaLower.includes('capital') || preguntaLower.includes('ciudad') || preguntaLower.includes('país')) {
            return 'Geografía';
        }
        
        // Usar materia como fallback
        const materia = window.datosSession?.materia || 'Materia general';
        return materia;
    }
}

// ==================== LIMPIAR RECURSOS ====================

export function limpiarRecursos() {
    console.log("🧹 Limpiando recursos de Basketball");
}

// ==================== LOGGING ====================
console.log("🏀 activity-basketball.js CON GRAMÁTICA PERFECCIONADA Y CONTEXTO ESPECÍFICO cargado correctamente");
console.log("✅ Funcionalidades: IA + Fallback + Lógica Pedagógica + Tracking + Sistema de Rondas + GRAMÁTICA ESPAÑOLA PERFECTA + CONTEXTO ESPECÍFICO + LIMPIEZA JSON GEMINI 2.5");
