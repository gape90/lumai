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

function obtenerConfiguracionSkater() {
    const nivel = estadoGlobal.perfil.dimensiones.procesamiento_informacion;
    
    const configuraciones = {
        "bajo": {
            velocidadBarriles: 3,
            cantidadBarriles: 4,
            tiempoEntreBarriles: 150,
            cantidadPreguntas: 3,
            descripcion: "3 preguntas, velocidad lenta, pocos obstaculos"
        },
        "medio": {
            velocidadBarriles: 4,
            cantidadBarriles: 5,
            tiempoEntreBarriles: 100,
            cantidadPreguntas: 4,
            descripcion: "4 preguntas, velocidad media, obstaculos moderados"
        },
        "alto": {
            velocidadBarriles: 5,
            cantidadBarriles: 6,
            tiempoEntreBarriles: 90,
            cantidadPreguntas: 5,
            descripcion: "5 preguntas, velocidad alta, muchos obstaculos"
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
    console.log("🛹 Generando actividad Skater con IA...");
    
    try {
        const config = obtenerConfiguracionSkater();
        console.log(`🎮 Configuración para ${estadoGlobal.perfil.nombre_visible}: ${config.descripcion}`);
        
        const actividadesIA = await generarPreguntasConIA();
        
        if (actividadesIA && actividadesIA.length >= config.cantidadPreguntas) {
            console.log("✅ Preguntas generadas exitosamente con IA");
            return {
                tipo: "skater",
                actividades: actividadesIA.slice(0, config.cantidadPreguntas),
                configuracion: config,
                instrucciones: "Salta las respuestas incorrectas y atrapa las correctas"
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
    const config = obtenerConfiguracionSkater();
    const cantidadRequerida = config.cantidadPreguntas;
    
    const prompt = `
Eres un experto en educación inclusiva creando preguntas para el juego "El Skater" para ${estadoGlobal.perfil.nombre_visible}.

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
- Cada pregunta debe tener 1 respuesta CORRECTA y 7 respuestas INCORRECTAS
- **VERIFICAR:** Todas las preguntas deben usar artículos correctos y singular/plural apropiado
- **VERIFICAR:** Orden correcto verbo-sustantivo en respuestas
- **VERIFICAR:** NO fragmentos como "con su", "vida con", "de su" solos
- **VERIFICAR:** NO artículos duplicados como "las las", "los los"
- **VERIFICAR:** Contexto específico en todas las preguntas
- Las respuestas incorrectas deben ser plausibles pero claramente erróneas
- Adapta el lenguaje según el perfil del estudiante
- Enfócate en conceptos clave de la explicación

FORMATO DE RESPUESTA (JSON):
\`\`\`json
[
${Array.from({length: cantidadRequerida}, (_, i) => 
  `  {
    "pregunta": "¿Pregunta gramaticalmente PERFECTA y específica ${i+1} sobre ${estadoGlobal.tema}?",
    "correcta": "Respuesta ordenada correctamente",
    "incorrectas": ["Inc1", "Inc2", "Inc3", "Inc4", "Inc5", "Inc6", "Inc7"]
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
        // ✅ Aumentado a 3000 tokens para evitar truncamiento de respuesta
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
                correcta: corregirGramaticaRespuesta(actividad.correcta || "Respuesta correcta"),
                incorrectas: Array.isArray(actividad.incorrectas) && actividad.incorrectas.length >= 7 
                    ? actividad.incorrectas.slice(0, 7).map(resp => corregirGramaticaRespuesta(resp))
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

// ✅ FUNCIÓN LOCAL: Extraer palabras clave específicas de la explicación HTML
function extraerPalabrasClaveDeHTML(explicacionHTML) {
    if (!explicacionHTML || typeof explicacionHTML !== 'string') {
        console.log("⚠️ Explicación vacía o no es string");
        return [];
    }
    
    // Limpiar HTML: remover etiquetas pero mantener contenido
    let textoLimpio = explicacionHTML
        .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remover estilos
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remover scripts
        .replace(/<[^>]+>/g, ' ') // Remover todas las etiquetas HTML
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();
    
    console.log(`🧹 Texto limpio (primeros 200 chars): ${textoLimpio.substring(0, 200)}`);
    
    // Palabras a ignorar (stop words en español + verbos comunes)
    const stopWords = new Set([
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 
        'de', 'del', 'a', 'al', 'en', 'es', 'son', 'por', 'para',
        'con', 'sin', 'sobre', 'como', 'muy', 'más', 'pero', 'que',
        'y', 'o', 'si', 'no', 'también', 'solo', 'hay', 'tiene',
        'eres', 'está', 'están', 'hola', 'qué', 'bueno', 'nuevo',
        // ✅ VERBOS A FILTRAR (conjugaciones comunes)
        'viven', 'escribimos', 'hacemos', 'suben', 'bajan', 'podés', 'puedes',
        'sabemos', 'tienen', 'sabes', 'saben', 'hacen', 'vive', 'escribe',
        'hace', 'sube', 'baja', 'puede', 'sabe', 'soy', 'sos', 'eres',
        'somos', 'son', 'estoy', 'estás', 'estamos', 'adelante', 'seguimos',
        'aprendiendo', 'propongo', 'verte', 'campeón', 'útil', 'allí'
    ]);
    
    // Extraer palabras significativas (sustantivos, conceptos)
    const palabras = textoLimpio
        .toLowerCase()
        .split(/\s+/)
        .filter(palabra => {
            // Filtrar palabras cortas, números y stop words
            return palabra.length >= 4 && 
                   !stopWords.has(palabra) &&
                   !/^\d+$/.test(palabra) &&
                   /^[a-zñáéíóúü]+$/.test(palabra) &&
                   // ✅ FILTRO ADICIONAL: Eliminar palabras que terminan en verbos comunes
                   !palabra.endsWith('mos') && // escribimos, hacemos
                   !palabra.endsWith('ís') &&  // podéis
                   !palabra.endsWith('en');    // viven, tienen (aunque también elimina "imagen", pero es aceptable)
        });
    
    // Contar frecuencia de palabras
    const frecuencia = {};
    palabras.forEach(palabra => {
        frecuencia[palabra] = (frecuencia[palabra] || 0) + 1;
    });
    
    // Ordenar por frecuencia (las más frecuentes primero)
    const palabrasClave = Object.entries(frecuencia)
        .sort((a, b) => b[1] - a[1])
        .map(([palabra, freq]) => {
            // Capitalizar primera letra
            return palabra.charAt(0).toUpperCase() + palabra.slice(1);
        })
        .slice(0, 15); // Tomar las 15 más frecuentes
    
    console.log(`📊 Palabras clave extraídas: ${palabrasClave.join(', ')}`);
    console.log(`📈 Total de palabras clave: ${palabrasClave.length}`);
    
    return palabrasClave;
}

function generarActividadFallback() {
    console.log("🔄 Generando actividad Skater con fallback INTELIGENTE");
    
    const config = obtenerConfiguracionSkater();
    const tema = estadoGlobal.tema;
    const explicacion = estadoGlobal.explicacionGenerada || "";
    const cantidadRequerida = config.cantidadPreguntas;
    
    // ✅ Extraer palabras clave de la explicación (devuelve STRING separado por comas)
    // ✅ Usar función LOCAL para extraer palabras clave de HTML
    const palabrasClave = extraerPalabrasClaveDeHTML(explicacion);
    
    console.log(`📝 Palabras clave extraídas: ${palabrasClave.join(', ')}`);
    console.log(`📊 Total de palabras clave: ${palabrasClave.length}`);
    
    const preguntasGenericas = [];
    
    if (palabrasClave.length >= cantidadRequerida) {
        // Usar palabras clave como respuestas
        console.log(`✅ Suficientes palabras clave para generar ${cantidadRequerida} preguntas`);
        for (let i = 0; i < cantidadRequerida; i++) {
            const palabraActual = palabrasClave[i];
            const palabraLower = palabraActual.toLowerCase();
            
            // ✅ MEJORADO: Generar pregunta específica SIN redundancia
            let pregunta;
            if (palabraLower === tema.toLowerCase()) {
                // Si la palabra ES el tema, preguntar de forma general
                pregunta = `¿Qué aprendimos sobre ${palabraActual}?`;
            } else {
                // Si NO es el tema, preguntar específicamente
                pregunta = `¿Qué es ${palabraActual}?`;
            }
            
            preguntasGenericas.push({
                pregunta: pregunta,
                correcta: palabraActual,
                incorrectas: generarIncorrectasDesdeOtrasPalabrasClave(palabrasClave, i)
            });
            console.log(`📝 Pregunta ${i+1}: "${pregunta}" → Correcta: "${palabraActual}"`);
        }
    } else if (palabrasClave.length > 0) {
        // Usar palabras clave disponibles y repetir si es necesario
        console.log(`⚠️ Solo ${palabrasClave.length} palabras clave, repitiendo para ${cantidadRequerida} preguntas`);
        for (let i = 0; i < cantidadRequerida; i++) {
            const indicePalabra = i % palabrasClave.length;
            const palabraActual = palabrasClave[indicePalabra];
            const palabraLower = palabraActual.toLowerCase();
            
            // ✅ MEJORADO: Generar pregunta específica SIN redundancia
            let pregunta;
            if (palabraLower === tema.toLowerCase()) {
                pregunta = `¿Qué aprendimos sobre ${palabraActual}?`;
            } else {
                pregunta = `¿Qué es ${palabraActual}?`;
            }
            
            preguntasGenericas.push({
                pregunta: pregunta,
                correcta: palabraActual,
                incorrectas: generarIncorrectasDesdeOtrasPalabrasClave(palabrasClave, indicePalabra)
            });
            console.log(`📝 Pregunta ${i+1}: "${pregunta}" → Correcta: "${palabraActual}"`);
        }
    } else {
        // Fallback básico si no hay palabras clave
        console.log(`⚠️ No se encontraron palabras clave, usando fallback básico`);
        for (let i = 0; i < cantidadRequerida; i++) {
            preguntasGenericas.push({
                pregunta: `¿Qué aprendimos sobre ${tema}? (${i+1}/${cantidadRequerida})`,
                correcta: `Concepto sobre ${tema}`,
                incorrectas: ["Opción A", "Opción B", "Opción C", "Opción D", "Opción E", "Opción F", "Opción G"]
            });
        }
    }
    
    console.log(`✅ Fallback inteligente: ${preguntasGenericas.length} preguntas generadas`);
    
    return {
        tipo: "skater",
        actividades: preguntasGenericas,
        configuracion: config,
        instrucciones: "Salta las respuestas incorrectas y atrapa las correctas",
        esFallback: true
    };
}

// ✅ Función auxiliar para generar respuestas incorrectas desde otras palabras clave
function generarIncorrectasDesdeOtrasPalabrasClave(palabrasClave, indiceCorrector) {
    const incorrectas = [];
    const opcionesGenericas = ["Otro concepto", "Diferente idea", "Otra opción", "Concepto distinto", 
                               "Opción alternativa", "Idea diferente", "Otro término"];
    
    // Usar otras palabras clave como incorrectas (evitando la correcta)
    for (let i = 0; i < palabrasClave.length && incorrectas.length < 7; i++) {
        if (i !== indiceCorrector) {
            incorrectas.push(palabrasClave[i]);
        }
    }
    
    // Completar con opciones genéricas si no hay suficientes
    while (incorrectas.length < 7) {
        const opcionIndex = incorrectas.length % opcionesGenericas.length;
        incorrectas.push(opcionesGenericas[opcionIndex]);
    }
    
    return incorrectas.slice(0, 7);
}

function generarRespuestasIncorrectasPorDefecto() {
    return ["Opción A", "Opción B", "Opción C", "Opción D", "Opción E", "Opción F", "Opción G"];
}

// ==================== RENDERIZAR ====================

export async function renderizar() {
    console.log("🎨 Renderizando actividad Skater...");
    
    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (!actividadesEl) {
        console.error("❌ Elemento de actividades no encontrado");
        return;
    }
    
    const config = estadoGlobal.actividadActual.configuracion || obtenerConfiguracionSkater();
    const cantidadPreguntas = estadoGlobal.actividadActual.actividades.length;
    
    actividadesEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #00509e; margin-bottom: 15px;">🛹 El Skater</h2>
            <p style="margin-bottom: 10px; color: #666;">
                <strong>Instrucciones:</strong> Salta las respuestas incorrectas y atrapa las correctas.
            </p>
            <p style="margin-bottom: 20px; color: #666; font-size: 14px;">
                Utiliza ← → para moverte y barra espaciadora o tecla ↑ para saltar.
            </p>
            <div id="skater-game-container" style="margin: 20px auto;"></div>
        </div>
    `;
    
    
    const preguntas = estadoGlobal.actividadActual.actividades;
    const juegoSkater = new SkaterGame('skater-game-container', preguntas, config);
    
    juegoSkater.resetearContadores();
    
    // Callbacks corregidos para LUMAI
    juegoSkater.setCallbacks(
        (pregunta, puntaje) => {
            console.log('✅ Callback: Respuesta correcta en Skater');
        },
        
        (pregunta) => {
            console.log('❌ Callback: Respuesta incorrecta en Skater');
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
    
    console.log(`✅ Skater renderizado - ${cantidadPreguntas} preguntas con lógica pedagógica y gramática perfeccionada`);
}

// ==================== CLASE DEL JUEGO SKATER - NUEVA LÓGICA PEDAGÓGICA ====================

class SkaterGame {
    constructor(containerId, preguntas = null, configuracion = null) {
        this.containerId = containerId;
        this.canvas = null;
        this.ctx = null;
        
        this.canvasWidth = 800;
        this.canvasHeight = 400;
        
        this.configuracion = configuracion || {
            velocidadBarriles: 5,
            cantidadBarriles: 6,
            tiempoEntreBarriles: 100
        };
        
        this.preguntas = preguntas || this.getPreguntasPorDefecto();
        
        // 🎯 NUEVA LÓGICA PEDAGÓGICA (igual que todas las actividades anteriores)
        this.erroresAcumulados = 0;           // Errores totales en toda la actividad
        this.maxErrores = 3;                  // Máximo 3 errores
        this.preguntasIncorrectas = [];       // Índices de preguntas respondidas incorrectamente
        this.rondaActual = 1;                 // Ronda actual (1 = primera vez, 2+ = repeticiones)
        this.todasLasPreguntasMostradas = false; // Si ya mostró todas las preguntas una vez
        
        // Estado del juego (mantener diseño visual)
        this.preguntaActual = null;
        this.indicePreguntaGlobal = 0;        // Índice en el array original de preguntas
        this.indicePreguntaRonda = 0;         // Índice en la ronda actual
        this.preguntasRondaActual = [];       // Preguntas de la ronda actual
        this.juegoTerminado = false;
        
        // Variables originales del juego (mantener mecánica visual)
        this.imagenes = {
            fondo: null,
            personajeSkate: null,
            personajeSalta: null,
            barril: null
        };
        this.imagenesCargadas = 0;
        this.totalImagenes = 4;
        
        this.puntaje = 0;
        this.estadoJuego = 'cargando';
        
        this.personajeAncho = 144;
        this.personajeAlto = 173;
        this.personajeX = 50;
        this.personajeY = 0;
        this.personajeY_original = 0;
        this.estaSaltando = false;
        this.velocidadSalto = -18;
        this.gravedad = 0.8;
        this.velocidadMovimiento = 5;
        this.moviendoDerecha = false;
        this.moviendoIzquierda = false;
        
        this.personajePaddingX = 0.4;
        this.personajePaddingY = 0.1;
        this.barrilPadding = 0.3;
        
        this.velocidadFondo = 2;
        this.fondoX1 = 0;
        this.fondoX2 = 0;
        
        this.barriles = [];
        this.respuestasDelNivel = [];
        this.proximaRespuestaIndex = 0;
        this.proximoBarrilEn = this.configuracion.tiempoEntreBarriles;
        this.velocidadBarriles = this.configuracion.velocidadBarriles;
        this.maxBarrilesSimultaneos = this.configuracion.cantidadBarriles;
        
        this.textoFlotante = { texto: "", alpha: 0, x: 0, y: 0 };
        
        // Callbacks para Lumai
        this.onRespuestaCorrecta = null;
        this.onRespuestaIncorrecta = null;
        this.onJuegoCompletado = null;
        
        console.log(`🛹 Skater configurado: ${this.preguntas.length} preguntas, lógica pedagógica implementada`);
        
        this.init();
    }
    
    // Método resetear contadores
    resetearContadores() {
        this.erroresAcumulados = 0;
        this.preguntasIncorrectas = [];
        this.rondaActual = 1;
        this.todasLasPreguntasMostradas = false;
        console.log("🔄 Contadores de Skater reseteados para nueva sesión");
    }
    
    // Métodos públicos para lumai
    setCallbacks(onCorrecta, onIncorrecta, onCompletado) {
        this.onRespuestaCorrecta = onCorrecta;
        this.onRespuestaIncorrecta = onIncorrecta;
        this.onJuegoCompletado = onCompletado;
    }
    
    init() {
        this.createCanvas();
        this.cargarImagenes();
        this.setupEventListeners();
        this.personajeY_original = this.canvasHeight - this.personajeAlto - 20;
        this.personajeY = this.personajeY_original;
        this.fondoX2 = this.canvasWidth;
    }
    
    // 🎯 NUEVA LÓGICA: Preparar preguntas de la ronda
    prepararRonda() {
        if (this.rondaActual === 1) {
            // PRIMERA RONDA: Todas las preguntas
            this.preguntasRondaActual = [...this.preguntas];
            console.log(`🎯 RONDA 1: Mostrando todas las ${this.preguntas.length} preguntas`);
        } else {
            // RONDAS SIGUIENTES: Solo las incorrectas
            this.preguntasRondaActual = this.preguntasIncorrectas.map(indice => this.preguntas[indice]);
            console.log(`🔄 RONDA ${this.rondaActual}: Repitiendo ${this.preguntasRondaActual.length} preguntas incorrectas`);
        }
        
        this.indicePreguntaRonda = 0;
    }
    
    // 🎯 NUEVA LÓGICA: Iniciar pregunta de la ronda actual
    iniciarNivel() {
        // ✅ VERIFICAR SI COMPLETÓ TODAS LAS PREGUNTAS DE LA RONDA
        if (this.indicePreguntaRonda >= this.preguntasRondaActual.length) {
            this.completarRonda();
            return;
        }
        
        this.barriles = [];
        
        // Mostrar pregunta actual de la ronda
        const pregunta = this.preguntasRondaActual[this.indicePreguntaRonda];
        this.preguntaActual = pregunta;
        
        // Encontrar índice global de la pregunta (para tracking)
        this.indicePreguntaGlobal = this.preguntas.findIndex(p => 
            p.pregunta === pregunta.pregunta && 
            p.correcta === pregunta.correcta
        );
        
        this.respuestasDelNivel = [pregunta.correcta, ...pregunta.incorrectas].sort(() => Math.random() - 0.5);
        this.proximaRespuestaIndex = 0;
        this.proximoBarrilEn = this.configuracion.tiempoEntreBarriles;
        
        console.log(`🎯 Pregunta ${this.indicePreguntaRonda + 1}/${this.preguntasRondaActual.length}: ${pregunta.pregunta}`);
        console.log(`🔍 Respuesta correcta: ${pregunta.correcta}`);
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
            this.iniciarNivel();
        }, 1000);
    }
    
    completarActividad(exitosa) {
        this.estadoJuego = 'completado';
        this.juegoTerminado = true;
        
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
    
    reiniciarJuego() {
        this.puntaje = 0;
        this.personajeX = 50;
        this.personajeY = this.personajeY_original;
        this.prepararRonda();
        this.iniciarNivel();
        this.estadoJuego = 'jugando';
    }
    
    // ✅ NUEVA LÓGICA DE RESPUESTA CON RONDAS Y TRACKING
    respuestaCorrecta() {
        this.puntaje++;
        
        // ✅ TRACKING SIN DUPLICACIÓN - SOLO recordCustomEvent
        if (window.lumaiTracker) {
            const preguntaTexto = this.preguntaActual.pregunta;
            const respuestaUsuario = this.preguntaActual.correcta;
            const respuestaCorrecta = this.preguntaActual.correcta;
            const concepto = this.extraerConcepto(preguntaTexto);
            
            // ✅ SOLO ESTE REGISTRO (elimina duplicación)
            window.lumaiTracker.recordCustomEvent('response_recorded', {
                question: preguntaTexto,
                userAnswer: respuestaUsuario,
                correctAnswer: respuestaCorrecta,
                isCorrect: true,
                concept: concepto,
                activity: 'Skate'
            });
            
            console.log(`📊 TRACKING: ✅ "${preguntaTexto}" - ${respuestaUsuario}`);
        }
        
        // Si había estado incorrecta, removerla de la lista
        if (this.preguntasIncorrectas.includes(this.indicePreguntaGlobal)) {
            this.preguntasIncorrectas = this.preguntasIncorrectas.filter(
                indice => indice !== this.indicePreguntaGlobal
            );
            console.log(`✅ Pregunta ${this.indicePreguntaGlobal} corregida. Incorrectas restantes: ${this.preguntasIncorrectas.length}`);
        }
        
        console.log(`✅ RESPUESTA CORRECTA - Pregunta ${this.indicePreguntaRonda + 1}/${this.preguntasRondaActual.length}`);
        
        this.textoFlotante.texto = "¡CORRECTO!";
        this.textoFlotante.x = this.personajeX + this.personajeAncho / 2;
        this.textoFlotante.y = this.personajeY;
        this.textoFlotante.alpha = 1.0;
        
        if (this.onRespuestaCorrecta) {
            this.onRespuestaCorrecta(this.preguntaActual, this.puntaje);
        }
        
        // Continuar a la siguiente pregunta de la ronda
        setTimeout(() => {
            this.indicePreguntaRonda++;
            this.iniciarNivel();
        }, 1200);
    }
    
    respuestaIncorrecta() {
        this.erroresAcumulados++;
        
        // ✅ TRACKING SIN DUPLICACIÓN - SOLO recordCustomEvent
        if (window.lumaiTracker) {
            const preguntaTexto = this.preguntaActual.pregunta;
            const respuestaUsuario = "Respuesta incorrecta";
            const respuestaCorrecta = this.preguntaActual.correcta;
            const concepto = this.extraerConcepto(preguntaTexto);
            
            // ✅ SOLO ESTE REGISTRO (elimina duplicación)
            window.lumaiTracker.recordCustomEvent('response_recorded', {
                question: preguntaTexto,
                userAnswer: respuestaUsuario,
                correctAnswer: respuestaCorrecta,
                isCorrect: false,
                concept: concepto,
                activity: 'Skate'
            });
            
            console.log(`📊 TRACKING: ❌ "${preguntaTexto}" - ${respuestaUsuario}`);
        }
        
        // Agregar a preguntas incorrectas si no está ya
        if (!this.preguntasIncorrectas.includes(this.indicePreguntaGlobal)) {
            this.preguntasIncorrectas.push(this.indicePreguntaGlobal);
            console.log(`❌ Pregunta ${this.indicePreguntaGlobal} agregada a incorrectas. Total: ${this.preguntasIncorrectas.length}`);
        }
        
        console.log(`❌ RESPUESTA INCORRECTA - Error ${this.erroresAcumulados}/${this.maxErrores}`);
        
        this.textoFlotante.texto = "¡INCORRECTO!";
        this.textoFlotante.x = this.personajeX + this.personajeAncho / 2;
        this.textoFlotante.y = this.personajeY;
        this.textoFlotante.alpha = 1.0;
        
        if (this.onRespuestaIncorrecta) {
            this.onRespuestaIncorrecta(this.preguntaActual);
        }
        
        // ⚠️ VERIFICAR MÁXIMO DE ERRORES
        if (this.erroresAcumulados >= this.maxErrores) {
            console.log(`🛑 MÁXIMO DE ERRORES ALCANZADO (${this.erroresAcumulados}/${this.maxErrores})`);
            
            this.textoFlotante.texto = "¡UPS! Sigamos con otro";
            this.textoFlotante.alpha = 1.0;
            
            // ✅ Completar inmediatamente - LUMAI maneja el mensaje
            this.completarActividad(false); // Falló por errores
        } else {
            // Continuar a la siguiente pregunta de la ronda
            setTimeout(() => {
                this.indicePreguntaRonda++;
                this.iniciarNivel();
            }, 1200);
        }
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
    
    // ==================== MANTENER TODA LA MECÁNICA VISUAL ORIGINAL ====================
    
    cargarImagenes() {
        console.log("🖼️ Cargando imagenes del skater...");
        
        this.imagenes.fondo = new Image();
        this.imagenes.fondo.onload = () => this.verificarImagenesCargadas();
        this.imagenes.fondo.onerror = () => this.manejarErrorImagen('fondo');
        this.imagenes.fondo.src = 'img/fondo-skate.png';
        
        this.imagenes.personajeSkate = new Image();
        this.imagenes.personajeSkate.onload = () => this.verificarImagenesCargadas();
        this.imagenes.personajeSkate.onerror = () => this.manejarErrorImagen('personajeSkate');
        this.imagenes.personajeSkate.src = 'img/personaje_skate.png';
        
        this.imagenes.personajeSalta = new Image();
        this.imagenes.personajeSalta.onload = () => this.verificarImagenesCargadas();
        this.imagenes.personajeSalta.onerror = () => this.manejarErrorImagen('personajeSalta');
        this.imagenes.personajeSalta.src = 'img/personaje_salta.png';
        
        this.imagenes.barril = new Image();
        this.imagenes.barril.onload = () => this.verificarImagenesCargadas();
        this.imagenes.barril.onerror = () => this.manejarErrorImagen('barril');
        this.imagenes.barril.src = 'img/barril.png';
    }
    
    verificarImagenesCargadas() {
        this.imagenesCargadas++;
        console.log(`🖼️ Imagen cargada: ${this.imagenesCargadas}/${this.totalImagenes}`);
        
        if (this.imagenesCargadas === this.totalImagenes) {
            console.log("✅ Todas las imagenes cargadas correctamente");
            this.estadoJuego = 'inicio';
            this.gameLoop();
        }
    }
    
    manejarErrorImagen(nombreImagen) {
        console.warn(`⚠️ Error cargando imagen: ${nombreImagen}`);
        this.imagenesCargadas++;
        
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('IMG', 50, 50);
        
        this.imagenes[nombreImagen] = new Image();
        this.imagenes[nombreImagen].src = canvas.toDataURL();
        
        if (this.imagenesCargadas === this.totalImagenes) {
            console.log("✅ Imagenes cargadas (algunas con fallback)");
            this.estadoJuego = 'inicio';
            this.gameLoop();
        }
    }
    
    getPreguntasPorDefecto() {
        return [
            {
                pregunta: "¿Cuánto es 2 + 2?",
                correcta: "4",
                incorrectas: ["3", "5", "2", "1", "6", "8", "0"]
            },
            {
                pregunta: "¿De qué color es el cielo?",
                correcta: "Azul",
                incorrectas: ["Verde", "Rojo", "Amarillo", "Naranja", "Rosa", "Negro", "Blanco"]
            },
            {
                pregunta: "¿Cuál es la capital de Argentina?",
                correcta: "Buenos Aires",
                incorrectas: ["Madrid", "Bogotá", "Lima", "Santiago", "Montevideo", "Brasilia", "París"]
            }
        ];
    }
    
    createCanvas() {
        const container = document.getElementById(this.containerId);
        
        container.innerHTML = `
            <div style="text-align: center; background: #333; padding: 20px; border-radius: 10px;">
                <canvas id="skaterCanvas" style="border: 2px solid #fff; cursor: pointer; max-width: 100%; height: auto;"></canvas>
            </div>
        `;
        
        this.canvas = document.getElementById('skaterCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.estadoJuego !== 'jugando') return;
            if (e.key === ' ' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.saltar();
            }
            if (e.key === 'ArrowRight') {
                this.moviendoDerecha = true;
            }
            if (e.key === 'ArrowLeft') {
                this.moviendoIzquierda = true;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowRight') {
                this.moviendoDerecha = false;
            }
            if (e.key === 'ArrowLeft') {
                this.moviendoIzquierda = false;
            }
        });
        
        this.canvas.addEventListener('click', () => {
            if (this.estadoJuego === 'inicio') {
                this.reiniciarJuego();
            }
        });
    }
    
    spawnBarril() {
        if (this.proximaRespuestaIndex >= this.respuestasDelNivel.length) {
            this.proximaRespuestaIndex = 0;
            this.respuestasDelNivel.sort(() => Math.random() - 0.5);
            console.log(`🔄 Respuestas mezcladas nuevamente`);
        }
        
        const textoRespuesta = this.respuestasDelNivel[this.proximaRespuestaIndex];
        this.proximaRespuestaIndex++;
        
        const esCorrecta = textoRespuesta === this.preguntaActual.correcta;
        
        console.log(`🎲 SPAWN BARRIL: "${textoRespuesta}" (${esCorrecta ? 'CORRECTA' : 'INCORRECTA'})`);
        
        this.barriles.push({
            x: this.canvasWidth,
            y: this.canvasHeight - 130,
            ancho: 84,
            alto: 98,
            texto: textoRespuesta,
            esCorrecta: esCorrecta
        });
        
        this.proximoBarrilEn = this.configuracion.tiempoEntreBarriles + (Math.random() * 40 - 20);
    }
    
    saltar() {
        if (!this.estaSaltando) {
            this.estaSaltando = true;
        }
    }
    
    actualizarSalto() { 
        if (this.estaSaltando) { 
            this.velocidadSalto += this.gravedad; 
            this.personajeY += this.velocidadSalto; 
            if (this.personajeY >= this.personajeY_original) { 
                this.personajeY = this.personajeY_original; 
                this.estaSaltando = false; 
                this.velocidadSalto = -18; 
            } 
        } 
    }
    
    actualizarMovimiento() { 
        if (this.moviendoDerecha && this.personajeX < this.canvasWidth - this.personajeAncho) 
            this.personajeX += this.velocidadMovimiento; 
        if (this.moviendoIzquierda && this.personajeX > 0) 
            this.personajeX -= this.velocidadMovimiento; 
    }
    
    actualizarFondo() { 
        this.fondoX1 -= this.velocidadFondo; 
        this.fondoX2 -= this.velocidadFondo; 
        if (this.fondoX1 <= -this.canvasWidth) this.fondoX1 = this.canvasWidth; 
        if (this.fondoX2 <= -this.canvasWidth) this.fondoX2 = this.canvasWidth; 
    }
    
    actualizarBarriles() {
        for (let barril of this.barriles) {
            barril.x -= this.velocidadBarriles;
        }
        
        this.proximoBarrilEn--;
        
        if (this.proximoBarrilEn <= 0 && this.barriles.length < this.maxBarrilesSimultaneos) {
            this.spawnBarril();
        }
        
        this.barriles = this.barriles.filter(barril => barril.x + barril.ancho > 0);
    }
    
    actualizarTextoFlotante() {
        if (this.textoFlotante.alpha > 0) {
            this.textoFlotante.y -= 1;
            this.textoFlotante.alpha -= 0.015;
        }
    }
    
    verificarColisiones() {
        for (let barril of this.barriles) {
            const pAnchoHitbox = this.personajeAncho * (1 - this.personajePaddingX);
            const pAltoHitbox = this.personajeAlto * (1 - this.personajePaddingY);
            const pXHitbox = this.personajeX + (this.personajeAncho - pAnchoHitbox) / 2;
            const pYHitbox = this.personajeY + (this.personajeAlto - pAltoHitbox) / 2;
            const bAnchoHitbox = barril.ancho * (1 - this.barrilPadding);
            const bAltoHitbox = barril.alto * (1 - this.barrilPadding);
            const bXHitbox = barril.x + (barril.ancho - bAnchoHitbox) / 2;
            const bYHitbox = barril.y + (barril.alto - bAltoHitbox) / 2;
            
            if (pXHitbox < bXHitbox + bAnchoHitbox && 
                pXHitbox + pAnchoHitbox > bXHitbox && 
                pYHitbox < bYHitbox + bAltoHitbox && 
                pYHitbox + pAltoHitbox > bYHitbox) {
                
                console.log(`🎯 COLISIÓN: "${barril.texto}" (${barril.esCorrecta ? 'CORRECTA' : 'INCORRECTA'})`);
                
                if (barril.esCorrecta) {
                    console.log(`➡️ Ejecutando respuestaCorrecta()`);
                    this.respuestaCorrecta();
                } else {
                    console.log(`➡️ Ejecutando respuestaIncorrecta()`);
                    this.respuestaIncorrecta();
                }
                this.barriles = this.barriles.filter(b => b !== barril);
                break;
            }
        }
    }
    
    dibujarFondo() {
        if (this.imagenes.fondo && this.imagenes.fondo.complete) {
            this.ctx.drawImage(this.imagenes.fondo, this.fondoX1, 0, this.canvasWidth, this.canvasHeight);
            this.ctx.drawImage(this.imagenes.fondo, this.fondoX2, 0, this.canvasWidth, this.canvasHeight);
        } else {
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#98FB98');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
    }
    
    dibujarPersonaje() {
        let img;
        if (this.estaSaltando) {
            img = this.imagenes.personajeSalta;
        } else {
            img = this.imagenes.personajeSkate;
        }
        
        if (img && img.complete) {
            this.ctx.drawImage(img, this.personajeX, this.personajeY, this.personajeAncho, this.personajeAlto);
        } else {
            const centerX = this.personajeX + this.personajeAncho / 2;
            
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.fillRect(this.personajeX + 30, this.personajeY + 40, 60, 80);
            
            this.ctx.fillStyle = '#FFD93D';
            this.ctx.beginPath();
            this.ctx.arc(centerX, this.personajeY + 30, 25, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(this.personajeX + 20, this.personajeY + 130, 80, 10);
        }
    }
    
    dibujarBarriles() {
        for (let barril of this.barriles) {
            if (this.imagenes.barril && this.imagenes.barril.complete) {
                this.ctx.drawImage(this.imagenes.barril, barril.x, barril.y, barril.ancho, barril.alto);
            } else {
                this.ctx.fillStyle = barril.esCorrecta ? '#4CAF50' : '#F44336';
                this.ctx.fillRect(barril.x, barril.y, barril.ancho, barril.alto);
                
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(barril.x, barril.y, barril.ancho, barril.alto);
            }
            
            this.dibujarTextoBarril(barril);
        }
    }
    
    dibujarTextoBarril(barril) {
        const texto = barril.texto;
        const maxAncho = barril.ancho - 10;
        const centroX = barril.x + barril.ancho / 2;
        const centroY = barril.y + barril.alto / 2;
        
        this.ctx.font = "bold 14px Arial";
        this.ctx.textAlign = "center";
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = "white";
        
        const medidaTexto = this.ctx.measureText(texto);
        
        if (medidaTexto.width <= maxAncho) {
            this.ctx.strokeText(texto, centroX, centroY + 2);
            this.ctx.fillText(texto, centroX, centroY + 2);
        } else {
            const palabras = texto.split(' ');
            let linea1 = '';
            let linea2 = '';
            
            for (let i = 0; i < palabras.length; i++) {
                const testLinea1 = linea1 + (linea1 ? ' ' : '') + palabras[i];
                const medidaLinea1 = this.ctx.measureText(testLinea1);
                
                if (medidaLinea1.width <= maxAncho || i === 0) {
                    linea1 = testLinea1;
                } else {
                    linea2 = palabras.slice(i).join(' ');
                    break;
                }
            }
            
            if (!linea2 && linea1.length > 8) {
                const mitad = Math.ceil(linea1.length / 2);
                linea2 = linea1.substring(mitad);
                linea1 = linea1.substring(0, mitad);
            }
            
            const alturaLinea = 16;
            const y1 = centroY - alturaLinea / 2;
            const y2 = centroY + alturaLinea / 2;
            
            this.ctx.strokeText(linea1, centroX, y1);
            this.ctx.fillText(linea1, centroX, y1);
            
            if (linea2) {
                this.ctx.strokeText(linea2, centroX, y2);
                this.ctx.fillText(linea2, centroX, y2);
            }
        }
    }
    
    dibujarUI() {
        if (this.estadoJuego === 'cargando') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🛹 EL SKATER', this.canvasWidth / 2, this.canvasHeight / 2 - 60);
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Cargando imagenes... ${this.imagenesCargadas}/${this.totalImagenes}`, 
                            this.canvasWidth / 2, this.canvasHeight / 2);
            
            const barWidth = 300;
            const barHeight = 10;
            const barX = (this.canvasWidth - barWidth) / 2;
            const barY = this.canvasHeight / 2 + 30;
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);
            
            const progress = (this.imagenesCargadas / this.totalImagenes) * barWidth;
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(barX, barY, progress, barHeight);
            
            return;
        }
        
        if (this.estadoJuego === 'inicio') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🛹 EL SKATER', this.canvasWidth / 2, this.canvasHeight / 2 - 40);
            
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText('Hace Click para Empezar', this.canvasWidth / 2, this.canvasHeight / 2 + 40);
            return;
        }
        
        if (this.estadoJuego !== 'jugando') return;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvasWidth, 60);
        
        if (this.preguntaActual) {
            this.ctx.fillStyle = "white";
            this.ctx.font = "bold 20px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText(this.preguntaActual.pregunta, this.canvasWidth / 2, 35);
        }
        
        // ✅ HUD SIMPLIFICADO: Solo Puntaje y Ronda (sin errores)
        this.ctx.fillStyle = "yellow";
        this.ctx.font = "bold 20px Arial";
        this.ctx.textAlign = "left";
        this.ctx.fillText(`Puntaje: ${this.puntaje}`, 20, 30);
        
        this.ctx.fillStyle = "#4CAF50";
        this.ctx.font = "bold 16px Arial";
        this.ctx.fillText(`Ronda: ${this.rondaActual}`, 20, 50);
        
        if (this.textoFlotante.alpha > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.textoFlotante.alpha;
            this.ctx.fillStyle = this.textoFlotante.texto.includes("CORRECTO") ? "#4CAF50" : "#F44336";
            this.ctx.font = "bold 24px Arial";
            this.ctx.textAlign = "center";
            this.ctx.strokeStyle = "white";
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(this.textoFlotante.texto, this.textoFlotante.x, this.textoFlotante.y);
            this.ctx.fillText(this.textoFlotante.texto, this.textoFlotante.x, this.textoFlotante.y);
            this.ctx.restore();
        }
    }
    
    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        if (this.estadoJuego === 'jugando') {
            this.actualizarFondo();
            this.actualizarSalto();
            this.actualizarMovimiento();
            this.actualizarBarriles();
            this.actualizarTextoFlotante();
            this.verificarColisiones();
        } else if (this.estadoJuego === 'cargando' || this.estadoJuego === 'inicio') {
            this.actualizarFondo();
        } else if (this.estadoJuego === 'terminado' || this.estadoJuego === 'completado') {
            this.actualizarFondo();
            this.actualizarTextoFlotante();
        }
        
        this.dibujarFondo();
        if (this.estadoJuego === 'jugando') {
            this.dibujarBarriles();
        }
        this.dibujarPersonaje();
        this.dibujarUI();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ==================== LIMPIAR RECURSOS ====================

export function limpiarRecursos() {
    console.log("🧹 Limpiando recursos de Skater");
}

// ==================== LOGGING ====================
console.log("🛹 activity-skater.js CON GRAMÁTICA PERFECCIONADA Y CONTEXTO ESPECÍFICO cargado correctamente");
console.log("✅ Funcionalidades: IA + Fallback + Lógica Pedagógica + Tracking + Sistema de Rondas + GRAMÁTICA ESPAÑOLA PERFECTA + CONTEXTO ESPECÍFICO");