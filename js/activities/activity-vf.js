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

function obtenerConfiguracionVF() {
    const nivel = estadoGlobal.perfil.dimensiones.procesamiento_informacion;
    
    const configuraciones = {
        "bajo": {
            cantidadPreguntas: 3,
            tiempoRespuesta: 12000,
            descripcion: "Pocas afirmaciones, mas tiempo para pensar"
        },
        "medio": {
            cantidadPreguntas: 4,
            tiempoRespuesta: 8000,
            descripcion: "Cantidad moderada, tiempo equilibrado"
        },
        "alto": {
            cantidadPreguntas: 5,
            tiempoRespuesta: 6000,
            descripcion: "Mas afirmaciones, desafio mayor"
        }
    };
    
    return configuraciones[nivel] || configuraciones["medio"];
}

// ==================== GENERACION DE ACTIVIDADES CON IA ====================

export async function generarActividad() {
    console.log("✅❌ Generando actividad Verdadero/Falso con IA...");
    
    try {
        const config = obtenerConfiguracionVF();
        console.log(`🎮 Configuración para ${estadoGlobal.perfil.nombre_visible}: ${config.descripcion}`);
        
        const actividadesIA = await generarPreguntasConIA();
        
        if (actividadesIA && actividadesIA.length >= config.cantidadPreguntas) {
            console.log("✅ Preguntas generadas exitosamente con IA");
            return {
                tipo: "verdadero-falso",
                actividades: actividadesIA.slice(0, config.cantidadPreguntas),
                configuracion: config,
                instrucciones: "Determina si cada afirmación es verdadera o falsa"
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
    const config = obtenerConfiguracionVF();
    const cantidadRequerida = config.cantidadPreguntas;
    
    const prompt = `
Eres un experto en educación inclusiva creando afirmaciones de Verdadero/Falso para ${estadoGlobal.perfil.nombre_visible}.

PERFIL DEL ESTUDIANTE: ${estadoGlobal.perfil.nombre_visible}
${adaptaciones}

EXPLICACIÓN EDUCATIVA:
"""${explicacion}"""

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
- Genera EXACTAMENTE ${cantidadRequerida} afirmaciones basadas 100% en la explicación
- Crea una MEZCLA EQUILIBRADA de afirmaciones verdaderas y falsas
- Las afirmaciones falsas deben ser plausibles pero incorrectas según la explicación
- Adapta el lenguaje según el perfil del estudiante
- Enfócate en conceptos clave de la explicación

FORMATO DE RESPUESTA (JSON):
\`\`\`json
[
${Array.from({length: cantidadRequerida}, (_, i) => 
  `  {
    "enunciado": "Afirmación ${i+1} sobre ${estadoGlobal.tema}",
    "respuesta": ${Math.random() > 0.5 ? 'true' : 'false'},
    "explicacion": "Justificación breve"
  }`).join(',\n')}
]
\`\`\`

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`;

    try {
        // ✅ Aumentado a 2000 tokens para evitar truncamiento
        const respuesta = await llamarGeminiAPI(prompt, 2000, 0.7);
        
        // ✅ LIMPIEZA DE JSON MEJORADA PARA GEMINI 2.5
        let jsonLimpio = respuesta
            .replace(/```json\n?/gi, "")
            .replace(/```\n?/g, "")
            .replace(/^[^[{]*/, "")  // ✅ Elimina TODO antes del primer [ o {
            .replace(/[^\]}]*$/, "")  // ✅ Elimina TODO después del último ] o }
            .trim();
        const actividades = JSON.parse(jsonLimpio);
        
        if (Array.isArray(actividades) && actividades.length >= cantidadRequerida) {
            console.log(`✅ Generadas ${actividades.length} afirmaciones para perfil ${estadoGlobal.perfil.dimensiones.procesamiento_informacion}`);
            return actividades.slice(0, cantidadRequerida).map(actividad => ({
                enunciado: actividad.enunciado || `Afirmación sobre ${estadoGlobal.tema}`,
                respuesta: typeof actividad.respuesta === 'boolean' ? actividad.respuesta : true,
                explicacion: actividad.explicacion || "Basado en la explicación proporcionada"
            }));
        } else {
            throw new Error(`IA generó solo ${actividades.length} afirmaciones, se requieren ${cantidadRequerida}`);
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
- Afirmaciones MUY SIMPLES con máximo 8 palabras
- Usar vocabulario básico y concreto
- Evitar conceptos abstractos
- Enfocarse en información literal de la explicación`,

        "medio": `
ADAPTACIONES MODERADAS:
- Afirmaciones claras de 10-15 palabras
- Vocabulario accesible pero preciso
- Conceptos concretos con relaciones simples`,

        "alto": `
ADAPTACIONES AVANZADAS:
- Afirmaciones pueden ser más elaboradas
- Vocabulario específico de la materia
- Conceptos abstractos permitidos`
    };
    
    return adaptacionesPorNivel[nivel] || adaptacionesPorNivel["medio"];
}

function generarActividadFallback() {
    console.log("🔄 Generando actividad Verdadero/Falso con fallback");
    
    const config = obtenerConfiguracionVF();
    const tema = estadoGlobal.tema;
    const cantidadRequerida = config.cantidadPreguntas;
    
    const { oracionesEducativas } = extraerPalabrasClave();
    const afirmacionesGenericas = [];
    
    // Generar afirmaciones VERDADERAS basadas en oraciones reales
    const preguntasVerdaderas = Math.ceil(cantidadRequerida * 0.6); // 60% verdaderas
    const preguntasFalsas = cantidadRequerida - preguntasVerdaderas; // 40% falsas
    
    // Afirmaciones VERDADERAS
    for (let i = 0; i < preguntasVerdaderas && i < oracionesEducativas.length; i++) {
        afirmacionesGenericas.push({
            enunciado: oracionesEducativas[i],
            respuesta: true,
            explicacion: `Esta afirmación aparece en la explicación sobre ${tema}.`
        });
    }
    
    // Afirmaciones FALSAS
    for (let i = 0; i < preguntasFalsas; i++) {
        afirmacionesGenericas.push({
            enunciado: `No se proporcionó información detallada sobre ${tema}`,
            respuesta: false,
            explicacion: `Esta afirmación es incorrecta según la explicación.`
        });
    }
    
    // Fallback de seguridad
    if (afirmacionesGenericas.length === 0) {
        afirmacionesGenericas.push({
            enunciado: `Se explicó información sobre ${tema}`,
            respuesta: true,
            explicacion: `Verdadero, se proporcionó información sobre ${tema}.`
        });
    }
    
    return {
        tipo: "verdadero-falso",
        actividades: afirmacionesGenericas,
        configuracion: config,
        instrucciones: "Determina si cada afirmación es verdadera o falsa",
        esFallback: true
    };
}

// ==================== RENDERIZAR ====================

export async function renderizar() {
    console.log("🎨 Renderizando actividad Verdadero/Falso...");
    
    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (!actividadesEl) {
        console.error("❌ Elemento de actividades no encontrado");
        return;
    }
    
    const config = estadoGlobal.actividadActual.configuracion || obtenerConfiguracionVF();
    const cantidadPreguntas = estadoGlobal.actividadActual.actividades.length;
    const esFallback = estadoGlobal.actividadActual.esFallback || false;
    
    // Crear contenedor para el juego
    actividadesEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2 style="color: #00509e; margin-bottom: 15px;">✅❌ Verdadero o Falso</h2>
            <p style="margin-bottom: 10px; color: #666;">
                <strong>Instrucciones:</strong> Determina si cada afirmación es verdadera o falsa
            </p>
            <div id="vf-game-container" style="margin: 20px auto; max-width: 800px;"></div>
        </div>
    `;
    
   
    const preguntas = estadoGlobal.actividadActual.actividades;
    const juegoVF = new VerdaderoFalsoGame('vf-game-container', preguntas, config);
    
    // Resetear contadores para nueva sesión
    juegoVF.resetearContadores();
    
    // Callbacks corregidos para LUMAI
    juegoVF.setCallbacks(
        (pregunta, progreso) => {
            console.log('✅ Callback: Respuesta correcta en VF');
        },
        
        (pregunta, progreso) => {
            console.log('❌ Callback: Respuesta incorrecta en VF');
        },
        
        (puntajeFinal, actividad_dominada) => {
            console.log(`🏆 CALLBACK JUEGO COMPLETADO:`);
            console.log(`📊 Puntaje: ${puntajeFinal}, Actividad dominada: ${actividad_dominada}`);
            
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
    
    console.log(`✅ Verdadero/Falso renderizada - ${cantidadPreguntas} preguntas con nueva lógica pedagógica`);
}

// ==================== CLASE DEL JUEGO VERDADERO/FALSO - SIN MENSAJES PROPIOS ====================

class VerdaderoFalsoGame {
    constructor(containerId, preguntas = null, configuracion = null) {
        this.containerId = containerId;
        
        // Configuración adaptativa del juego
        this.configuracion = configuracion || {
            cantidadPreguntas: 4,
            tiempoRespuesta: 8000
        };
        
        // Preguntas del juego
        this.preguntas = preguntas || this.getPreguntasPorDefecto();
        
        // 🎯 NUEVA LÓGICA PEDAGÓGICA
        this.erroresAcumulados = 0;           // Errores totales en toda la actividad
        this.maxErrores = 3;                  // Máximo 3 errores
        this.preguntasIncorrectas = [];       // Índices de preguntas respondidas incorrectamente
        this.rondaActual = 1;                 // Ronda actual (1 = primera vez, 2+ = repeticiones)
        this.todasLasPreguntasMostradas = false; // Si ya mostró todas las preguntas una vez
        
        // Estado del juego
        this.estado = {
            corriendo: false,
            preguntaActual: null,
            indicePreguntaGlobal: 0,         // Índice en el array original de preguntas
            indicePreguntaRonda: 0,          // Índice en la ronda actual
            preguntasRondaActual: [],        // Preguntas de la ronda actual
            puntos: 0,
            juegoTerminado: false,
            respondiendo: false
        };
        
        // Callbacks para Lumai
        this.onRespuestaCorrecta = null;
        this.onRespuestaIncorrecta = null;
        this.onJuegoCompletado = null;
        
        console.log(`✅❌ Verdadero/Falso configurado: ${this.preguntas.length} preguntas, lógica pedagógica mejorada`);
        
        this.init();
    }
    
    // Método resetear contadores como las otras actividades
    resetearContadores() {
        this.erroresAcumulados = 0;
        this.preguntasIncorrectas = [];
        this.rondaActual = 1;
        this.todasLasPreguntasMostradas = false;
        console.log("🔄 Contadores de Verdadero/Falso reseteados para nueva sesión");
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
                .vf-game {
                    background: linear-gradient(135deg, #11998e, #38ef7d);
                    color: #fff;
                    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                    border-radius: 18px;
                    overflow: hidden;
                    max-width: 800px;
                    margin: 0 auto;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                
                .vf-hud {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.2);
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding: 12px;
                }
                
                .vf-hud strong { color: #fff; }
                
                .vf-content {
                    padding: 20px;
                    min-height: 400px;
                    position: relative;
                }
                
                .vf-statement {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 12px;
                    padding: 25px;
                    text-align: center;
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 30px;
                    color: #fff;
                    line-height: 1.4;
                }
                
                .vf-buttons {
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                
                .vf-btn {
                    padding: 15px 30px;
                    border: none;
                    border-radius: 12px;
                    font-size: 18px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-width: 120px;
                }
                
                .vf-btn.verdadero {
                    background: #28a745;
                    color: white;
                }
                
                .vf-btn.falso {
                    background: #dc3545;
                    color: white;
                }
                
                .vf-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                
                .vf-btn:active {
                    transform: translateY(0px);
                }
                
                .vf-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .vf-btn.correcta {
                    background: #155724;
                    color: #d4edda;
                }
                
                .vf-btn.incorrecta {
                    background: #721c24;
                    color: #f8d7da;
                }
                
                .vf-overlay {
                    position: absolute;
                    inset: 0;
                    display: grid;
                    place-items: center;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(5px);
                    z-index: 50;
                    padding: 16px;
                }
                
                .vf-card {
                    background: rgba(255, 255, 255, 0.95);
                    color: #333;
                    border-radius: 20px;
                    padding: 32px;
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                
                .vf-card h2 {
                    margin: 0 0 16px;
                    font-size: 28px;
                    color: #333;
                }
                
                .vf-card p {
                    margin: 12px 0 20px;
                    font-size: 16px;
                    color: #666;
                    line-height: 1.4;
                }
                
                .vf-start-btn {
                    background: linear-gradient(180deg, #11998e, #38ef7d);
                    border: none;
                    color: white;
                    font-weight: 800;
                    padding: 12px 24px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 8px;
                }
                
                .vf-start-btn:hover {
                    transform: translateY(-1px);
                }
                
                .vf-start-btn:active {
                    transform: translateY(1px);
                }
                
                .vf-toast {
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
                    .vf-statement {
                        font-size: 18px;
                        padding: 20px;
                    }
                    
                    .vf-buttons {
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .vf-btn {
                        width: 200px;
                    }
                }
            </style>
            
            <div class="vf-game">
                <div class="vf-hud">
                    <div><strong>Puntaje:</strong> <span id="vf-score">0</span></div>
                    <div><strong>Ronda:</strong> <span id="vf-round">1</span></div>
                </div>
                
                <div class="vf-content">
                    <div class="vf-statement" id="vf-statement">
                        Preparando afirmación...
                    </div>
                    
                    <div class="vf-buttons" id="vf-buttons">
                        <button class="vf-btn verdadero" id="vf-btn-true">✅ Verdadero</button>
                        <button class="vf-btn falso" id="vf-btn-false">❌ Falso</button>
                    </div>
                    
                    <div class="vf-overlay" id="vf-overlay">
                        <div class="vf-card">
                            <h2 id="vf-title">✅❌ Verdadero o Falso</h2>
                            <p id="vf-description">
                                <strong>Determina si cada afirmación es verdadera o falsa</strong>.<br/>
                                Lee cuidadosamente antes de responder.
                            </p>
                            <button class="vf-start-btn" id="vf-btn-start">Comenzar</button>
                        </div>
                    </div>
                    
                    <div class="vf-toast" id="vf-toast"></div>
                </div>
            </div>
        `;
        
        // Obtener referencias a elementos
        this.elementos = {
            content: container.querySelector('.vf-content'),
            statement: container.querySelector('#vf-statement'),
            buttons: container.querySelector('#vf-buttons'),
            btnTrue: container.querySelector('#vf-btn-true'),
            btnFalse: container.querySelector('#vf-btn-false'),
            overlay: container.querySelector('#vf-overlay'),
            title: container.querySelector('#vf-title'),
            description: container.querySelector('#vf-description'),
            btnStart: container.querySelector('#vf-btn-start'),
            toast: container.querySelector('#vf-toast'),
            score: container.querySelector('#vf-score'),
            round: container.querySelector('#vf-round')
        };
    }
    
    setupEventListeners() {
        // Botón de inicio
        this.elementos.btnStart.addEventListener('click', () => {
            this.iniciarJuego();
        });
        
        // Botones de respuesta
        this.elementos.btnTrue.addEventListener('click', () => {
            if (!this.estado.corriendo || this.estado.respondiendo) return;
            this.resolverRespuesta(true, this.elementos.btnTrue);
        });
        
        this.elementos.btnFalse.addEventListener('click', () => {
            if (!this.estado.corriendo || this.estado.respondiendo) return;
            this.resolverRespuesta(false, this.elementos.btnFalse);
        });
    }
    
    getPreguntasPorDefecto() {
        return [
            {
                enunciado: "Argentina es un país de América del Sur",
                respuesta: true,
                explicacion: "Verdadero, Argentina está ubicada en América del Sur"
            },
            {
                enunciado: "El agua hierve a 200 grados Celsius",
                respuesta: false,
                explicacion: "Falso, el agua hierve a 100 grados Celsius al nivel del mar"
            },
            {
                enunciado: "El corazón bombea sangre por todo el cuerpo",
                respuesta: true,
                explicacion: "Verdadero, esa es la función principal del corazón"
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
        this.elementos.title.textContent = '✅❌ Verdadero o Falso';
        this.elementos.description.innerHTML = `
            <strong>Determina si cada afirmación es verdadera o falsa</strong>.<br/>
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
        this.estado.puntos = 0;
        this.estado.juegoTerminado = false;
        this.estado.respondiendo = false;
        
        this.ocultarOverlay();
        this.prepararRonda();
        this.actualizarHUD();
        this.habilitarBotones();
        
        // Iniciar primera pregunta
        setTimeout(() => {
            this.generarPregunta();
        }, 500);
    }
    
    generarPregunta() {
        // ✅ VERIFICAR SI COMPLETÓ TODAS LAS PREGUNTAS DE LA RONDA
        if (this.estado.indicePreguntaRonda >= this.estado.preguntasRondaActual.length) {
            this.completarRonda();
            return;
        }
        
        // Mostrar pregunta actual de la ronda
        const pregunta = this.estado.preguntasRondaActual[this.estado.indicePreguntaRonda];
        this.estado.preguntaActual = pregunta;
        this.estado.respondiendo = false;
        
        // Encontrar índice global de la pregunta (para tracking)
        this.estado.indicePreguntaGlobal = this.preguntas.findIndex(p => 
            p.enunciado === pregunta.enunciado && p.respuesta === pregunta.respuesta
        );
        
        this.elementos.statement.textContent = pregunta.enunciado;
        this.habilitarBotones();
        
        console.log(`✅❌ Pregunta ${this.estado.indicePreguntaRonda + 1}/${this.estado.preguntasRondaActual.length}: ${pregunta.enunciado}`);
        console.log(`🔍 Respuesta correcta: ${pregunta.respuesta ? 'Verdadero' : 'Falso'}`);
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
        }, 1000); // ✅ Reducido de 2000ms a 1000ms para flujo más natural
    }
    
    // ✅ NUEVA FUNCIÓN SIN MENSAJES PROPIOS - SOLO CALLBACKS
    completarActividad(exitosa) {
        this.estado.corriendo = false;
        this.estado.juegoTerminado = true;
        
        console.log(`🎯 ACTIVIDAD COMPLETADA: ${exitosa ? 'DOMINADA' : 'FALLÓ'}`);
        
        // ✅ SOLO CALLBACKS - NO MOSTRAR PANTALLAS PROPIAS
        if (this.onJuegoCompletado) {
            this.onJuegoCompletado(this.estado.puntos, exitosa);
        }
        
        // NO mostrar pantallas propias - la app LUMAI maneja todos los mensajes
        console.log('✅ Callback enviado, app LUMAI maneja los mensajes');
    }
    
    habilitarBotones() {
        this.elementos.btnTrue.disabled = false;
        this.elementos.btnFalse.disabled = false;
        this.elementos.btnTrue.classList.remove('correcta', 'incorrecta');
        this.elementos.btnFalse.classList.remove('correcta', 'incorrecta');
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
    
    // ✅ NUEVA LÓGICA DE RESPUESTA SIN DUPLICACIÓN
    resolverRespuesta(eleccion, botonSeleccionado) {
        this.estado.respondiendo = true;
        const esCorrecta = eleccion === this.estado.preguntaActual.respuesta;
        
        // Deshabilitar ambos botones
        this.elementos.btnTrue.disabled = true;
        this.elementos.btnFalse.disabled = true;
        
        // Colorear el botón seleccionado
        botonSeleccionado.classList.add(esCorrecta ? 'correcta' : 'incorrecta');
        
        // ✅ TRACKING SIN DUPLICACIÓN - SOLO recordCustomEvent
        if (window.lumaiTracker) {
            const preguntaTexto = this.estado.preguntaActual.enunciado;
            const respuestaUsuario = eleccion ? 'Verdadero' : 'Falso';
            const respuestaCorrecta = this.estado.preguntaActual.respuesta ? 'Verdadero' : 'Falso';
            const concepto = this.extraerConcepto(preguntaTexto);
            
            // ✅ SOLO ESTE REGISTRO (elimina duplicación)
            window.lumaiTracker.recordCustomEvent('response_recorded', {
                question: preguntaTexto,
                userAnswer: respuestaUsuario,
                correctAnswer: respuestaCorrecta,
                isCorrect: esCorrecta,
                concept: concepto,
                activity: 'verdadero-falso'
            });
            
            console.log(`📊 TRACKING: ${esCorrecta ? '✅' : '❌'} "${preguntaTexto}" - ${respuestaUsuario}`);
        }
        
        if (esCorrecta) {
            // ✅ RESPUESTA CORRECTA
            this.estado.puntos += 20;
            
            // Si había estado incorrecta, removerla de la lista
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
            // ❌ RESPUESTA INCORRECTA
            this.erroresAcumulados++;
            this.estado.puntos = Math.max(0, this.estado.puntos - 10);
            
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
                this.mostrarToast('¡UPS! Sigamos con otro', 1500);
                this.actualizarHUD();
                
                // ✅ NO mostrar pantallas propias - solo callback
                setTimeout(() => {
                    this.completarActividad(false); // Falló por errores
                }, 1500);
                return;
            }
            
            this.mostrarToast('¡UPS!');
        }
        
        this.actualizarHUD();
        
        // Continuar a la siguiente pregunta
        setTimeout(() => {
            this.estado.indicePreguntaRonda++;
            this.generarPregunta();
        }, 1200); // ✅ Reducido de 1500ms a 1200ms para transiciones más fluidas
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
        if (preguntaLower.includes('escribir') || preguntaLower.includes('componer')) {
            return 'Composición musical';
        }
        
        // Conceptos matemáticos
        if (preguntaLower.includes('suma') || preguntaLower.includes('+')) {
            return 'Suma';
        }
        if (preguntaLower.includes('resta') || preguntaLower.includes('-')) {
            return 'Resta';
        }
        if (preguntaLower.includes('multiplicar') || preguntaLower.includes('×')) {
            return 'Multiplicación';
        }
        
        // Conceptos de ciencias
        if (preguntaLower.includes('planeta') || preguntaLower.includes('sol')) {
            return 'Sistema solar';
        }
        
        // Usar materia como fallback
        const materia = window.datosSession?.materia || 'Materia general';
        return materia;
    }
}

// ==================== LIMPIAR RECURSOS ====================

export function limpiarRecursos() {
    console.log("🧹 Limpiando recursos de Verdadero/Falso");
}

// ==================== LOGGING ====================
console.log("✅❌ activity-vf.js SIN MENSAJES PROPIOS - Solo callbacks para LUMAI");
console.log("✅ Funcionalidades: IA + Lógica Pedagógica + Tracking Sin Duplicación + Solo Callbacks");