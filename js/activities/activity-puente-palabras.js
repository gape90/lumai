// js/activities/activity-puente-palabras.js - Juego de memoria con cartas (fiel al original)
// ===============================================================================
// Adaptación del HTML original manteniendo diseño, mecánica y síntesis de voz

import { estadoGlobal, datosSession } from '../config.js';
import { llamarGeminiAPI } from '../ai-engine.js';

// Importar base de datos de emojis
let emojisBBDD = null;

async function cargarEmojisBBDD() {
    if (!emojisBBDD) {
        try {
            const modulo = await import('./emojis-base-datos.js');
            emojisBBDD = modulo.BBDD_LUMAI || [];
            console.log(`🔚 Base de datos de emojis cargada: ${emojisBBDD.length} emojis disponibles`);
        } catch (error) {
            console.error('❌ Error cargando base de datos de emojis:', error);
            emojisBBDD = [];
        }
    }
    return emojisBBDD;
}

// Variables del juego (igual que el original)
const synth = window.speechSynthesis;
let partidaActual = [];
let seleccionDePalabras = [];
let cartasSeleccionadas = [];
let paresEncontrados = 0;
let bloquearTablero = false;

// Variable para guardar las actividades generadas (CRÍTICO)
let actividadesGeneradas = [];

// ==================== CONFIGURACIÓN ====================

function obtenerConfiguracionPuente() {
    const perfil = estadoGlobal.perfil;
    
    const configuracionesPorPerfil = {
        'N0': { cantidadPares: 4, descripcion: 'Memory game muy simple con 4 pares' },
        'N1': { cantidadPares: 4, descripcion: 'Memory game simple con 4 pares' },
        'N2': { cantidadPares: 6, descripcion: 'Memory game moderado con 6 pares' },
        'N3': { cantidadPares: 6, descripcion: 'Memory game avanzado con 6 pares' }
    };
    
    return configuracionesPorPerfil[perfil?.nombre_visible] || configuracionesPorPerfil['N2'];
}

// ==================== GENERACIÓN DE ACTIVIDAD ====================

export async function generarActividad() {
    console.log("🎯 Generando actividad Puente de Palabras...");
    
    try {
        const config = obtenerConfiguracionPuente();
        console.log(`🎮 Configuración para ${estadoGlobal.perfil.nombre_visible}: ${config.descripcion}`);
        
        // Cargar base de datos de emojis
        await cargarEmojisBBDD();
        
        const parejasIA = await generarParejasConIA();
        
        if (parejasIA && parejasIA.length >= config.cantidadPares) {
            console.log("✅ Parejas generadas exitosamente con IA");
            
            // GUARDAR las actividades generadas en variable local (CRÍTICO)
            actividadesGeneradas = parejasIA.slice(0, config.cantidadPares);
            console.log("💾 Actividades guardadas localmente:", actividadesGeneradas);
            
            return {
                tipo: "puente-palabras",
                actividades: actividadesGeneradas,
                configuracion: config,
                instrucciones: "Encuentra los pares volteando las cartas"
            };
        } else {
            console.warn("⚠️ IA generó pocas parejas, usando fallback");
            throw new Error("Parejas insuficientes de IA");
        }
        
    } catch (error) {
        console.error("❌ Error generando con IA:", error);
        return generarActividadFallback();
    }
}

async function generarParejasConIA() {
    const explicacion = estadoGlobal.explicacionGenerada;
    const config = obtenerConfiguracionPuente();
    const cantidadRequerida = config.cantidadPares;
    
    const prompt = `
Eres un experto en educación creando parejas emoji-palabra para un memory game para ${estadoGlobal.perfil.nombre_visible}.

PERFIL DEL ESTUDIANTE: ${estadoGlobal.perfil.nombre_visible}
CONFIGURACIÓN: ${config.descripcion}

EXPLICACIÓN EDUCATIVA:
"""${explicacion}"""

INSTRUCCIONES:
- Extrae EXACTAMENTE ${cantidadRequerida} conceptos clave de la explicación
- Cada concepto debe tener una palabra simple y un emoji representativo
- Las palabras deben ser pronunciables por síntesis de voz
- Los emojis deben ser reconocibles visualmente

FORMATO DE RESPUESTA (JSON):
\`\`\`json
[
  {
    "palabra": "CONCEPTO1",
    "emoji": "🎯"
  },
  {
    "palabra": "CONCEPTO2",
    "emoji": "📚"
  }
]
\`\`\`

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.
`;

    try {
        const respuesta = await llamarGeminiAPI(prompt, 1000, 0.7);
        
        let jsonLimpio = respuesta.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        const parejas = JSON.parse(jsonLimpio);
        
        if (Array.isArray(parejas) && parejas.length >= cantidadRequerida) {
            console.log(`✅ IA generó ${parejas.length} parejas para memory game`);
            
            // Enriquecer con emojis de la base de datos si es posible
            return parejas.map(pareja => {
                let emojiDefinitivo = pareja.emoji || '🎯';
                
                // Buscar emoji más específico en la base de datos
                if (emojisBBDD && emojisBBDD.length > 0) {
                    const emojiEncontrado = emojisBBDD.find(item => 
                        item.palabrasReferencia && Array.isArray(item.palabrasReferencia) &&
                        item.palabrasReferencia.some(ref => 
                            ref.toLowerCase().includes(pareja.palabra.toLowerCase()) ||
                            pareja.palabra.toLowerCase().includes(ref.toLowerCase())
                        )
                    );
                    
                    if (emojiEncontrado) {
                        emojiDefinitivo = emojiEncontrado.emoji;
                        console.log(`🎯 Emoji mejorado para ${pareja.palabra}: ${emojiDefinitivo}`);
                    }
                }
                
                return {
                    palabra: pareja.palabra || 'PALABRA',
                    emoji: emojiDefinitivo
                };
            });
        } else {
            throw new Error(`IA generó solo ${parejas.length} parejas, se requieren ${cantidadRequerida}`);
        }
        
    } catch (error) {
        console.error("❌ Error procesando respuesta de IA:", error);
        throw error;
    }
}

function generarActividadFallback() {
    console.log("🔄 Generando actividad Puente de Palabras con fallback");
    
    const config = obtenerConfiguracionPuente();
    const cantidadRequerida = config.cantidadPares;
    
    const parejasGenericas = [
        { palabra: 'APRENDER', emoji: '📚' },
        { palabra: 'ESTUDIAR', emoji: '✏️' },
        { palabra: 'SABER', emoji: '🧠' },
        { palabra: 'EDUCAR', emoji: '🎓' },
        { palabra: 'CONOCER', emoji: '💡' }
    ];
    
    // GUARDAR las actividades generadas en variable local (CRÍTICO)
    actividadesGeneradas = parejasGenericas.slice(0, cantidadRequerida);
    console.log("💾 Actividades fallback guardadas localmente:", actividadesGeneradas);
    
    return {
        tipo: "puente-palabras",
        actividades: actividadesGeneradas,
        configuracion: config,
        instrucciones: "Encuentra los pares volteando las cartas",
        esFallback: true
    };
}

// ==================== RENDERIZACIÓN ====================

export async function renderizar() {
    console.log("🎨 Renderizando actividad Puente de Palabras...");
    
    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (!actividadesEl) {
        console.error("❌ Elemento de actividades no encontrado");
        throw new Error("Contenedor de actividades no encontrado");
    }
    
    // Limpiar contenedor antes de renderizar
    actividadesEl.innerHTML = '';
    
    // Generar HTML del juego (fiel al original)
    const htmlJuego = generarHTMLJuego();
    actividadesEl.innerHTML = htmlJuego;
    
    // Configurar eventos y inicializar
    configurarEventosJuego();
    
    console.log("✅ Actividad Puente de Palabras renderizada correctamente");
}

function generarHTMLJuego() {
    // Usar actividades guardadas localmente
    const cantidadPares = actividadesGeneradas.length || 3;
    const columnas = cantidadPares === 3 ? 3 : 4; // 3 pares = 3 columnas, 4+ pares = 4 columnas
    
    return `
        <div id="puente-palabras-game">
            <div id="pantalla-inicial-puente">
                <div class="titulo-game">
                    <h1>🌉 EL PUENTE DE LAS PALABRAS</h1>
                    <div class="subtitulo">¡ENCUENTRA LOS PARES Y CONECTA LAS PALABRAS!</div>
                    <div class="iconos-decorativos">
                        <span class="icono-carta">🃏</span>
                        <span class="icono-puente">🌉</span>
                        <span class="icono-carta">🃏</span>
                    </div>
                </div>
            </div>
            
            <div id="contenedor-juego-puente" style="display: none;">
                <div id="mensaje-feedback-puente">PREPARANDO EL JUEGO...</div>
                <div id="tablero-puente" style="display: none;"></div>
            </div>
        </div>
        
        <style>
            :root {
                --color-fondo: #f5f3ff;
                --color-texto: #4c1d95;
                --color-carta-dorso: #8b5cf6;
                --color-carta-frente: #ffffff;
                --color-acento1: #22c55e;
                --color-acento2: #f97316;
                --color-sombra: rgba(76, 29, 149, 0.2);
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }

            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0);
                }
                40% {
                    transform: translateY(-10px);
                }
                60% {
                    transform: translateY(-5px);
                }
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }

            @keyframes gradient {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }

            /* Animación para el degradado del dorso */
            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }

            #puente-palabras-game {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-image: url('img/fondo-el-puente-de-las-palabras.png');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                color: var(--color-texto);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 60vh;
                padding: 20px;
                box-sizing: border-box;
                perspective: 1000px;
                border-radius: 20px;
            }

            #pantalla-inicial-puente {
                display: block;
                padding: 40px 20px;
                background-color: rgba(255, 255, 255, 0.95);
                border-radius: 20px;
                box-shadow: 0 10px 30px var(--color-sombra);
                text-align: center;
                animation: fadeIn 0.5s ease-out;
            }

            .titulo-game h1 {
                font-size: 2.8em;
                margin: 0 0 15px 0;
                color: var(--color-texto);
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            }

            .subtitulo {
                font-size: 1.4em;
                color: var(--color-acento2);
                margin-bottom: 20px;
                font-weight: 600;
            }

            .iconos-decorativos {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin-top: 20px;
            }

            .icono-carta, .icono-puente {
                font-size: 3em;
                animation: bounce 2s infinite;
            }

            .icono-puente {
                animation-delay: 0.5s;
            }

            #contenedor-juego-puente {
                width: 100%;
                max-width: ${cantidadPares === 3 ? '480px' : '580px'};
                text-align: center;
                animation: fadeIn 0.5s ease-out;
            }
            
            #mensaje-feedback-puente {
                font-size: 1.8em;
                font-weight: 700;
                min-height: 80px;
                margin-bottom: 20px;
                background-color: rgba(255, 255, 255, 0.9);
                padding: 20px;
                border-radius: 15px;
                box-shadow: 0 5px 15px var(--color-sombra);
            }
            
            .correcto { color: var(--color-acento1); }
            .incorrecto { color: #ef4444; }
            
            .mensaje-final {
                background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c);
                background-size: 400% 400%;
                animation: gradient 3s ease infinite;
                padding: 25px!important;
                border-radius: 20px!important;
                box-shadow: 0 15px 30px rgba(0,0,0,0.2)!important;
                min-height: auto!important;
            }

            #tablero-puente {
                display: grid;
                grid-template-columns: repeat(${columnas}, 1fr);
                gap: 15px;
            }

            .carta-puente {
                width: 100%;
                aspect-ratio: 1 / 1;
                position: relative;
                transform-style: preserve-3d;
                transition: transform 0.6s;
                cursor: pointer;
            }

            .carta-puente.volteada {
                transform: rotateY(180deg);
            }

            .cara-carta {
                position: absolute;
                width: 100%;
                height: 100%;
                backface-visibility: hidden;
                border-radius: 15px;
                box-shadow: 0 5px 15px var(--color-sombra);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                background-image: url('img/el-puente-de-las-palabras.png');
                background-size: cover;
                background-position: center;
            }

            /* DORSO: Degradado animado con signo de interrogación negro */
            .dorso-carta {
                background: linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c);
                background-size: 400% 400%;
                animation: gradientShift 4s ease infinite;
                font-size: 3.5em;
                color: #000000; /* Signo de interrogación en NEGRO */
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.3);
            }

            /* FRENTE: Fondo blanco para buen contraste */
            .frente-carta {
                background-color: var(--color-carta-frente);
                transform: rotateY(180deg);
                font-size: 2.5em;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            .frente-carta.tipo-texto {
                font-size: 1.8em;
                padding: 5px;
                text-align: center;
                font-weight: bold;
                color: var(--color-texto);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                letter-spacing: 1px;
            }
        </style>
    `;
}

// ==================== LÓGICA DEL JUEGO (FIEL AL ORIGINAL) ====================

function configurarEventosJuego() {
    console.log("🎮 Configurando eventos del Puente de las Palabras...");
    
    // Reiniciar variables del juego
    paresEncontrados = 0;
    cartasSeleccionadas = [];
    bloquearTablero = false;
    
    // Reproducir mensaje inicial y esperar a que termine antes de continuar
    const mensajeInicial = "AHORA VAMOS A SEGUIR CON EL JUEGO PUENTE DE PALABRAS.";
    
    // Función callback para cuando termine el audio
    const continuarDespuesDelAudio = () => {
        console.log("⏰ Audio terminado, pasando a la siguiente pantalla...");
        
        const pantallaInicial = document.getElementById('pantalla-inicial-puente');
        const contenedorJuego = document.getElementById('contenedor-juego-puente');
        
        if (pantallaInicial && contenedorJuego) {
            console.log("✅ Elementos encontrados, ocultando pantalla inicial...");
            pantallaInicial.style.display = 'none';
            contenedorJuego.style.display = 'block';
            iniciarJuego();
        } else {
            console.error("❌ No se encontraron los elementos:", {
                pantallaInicial: !!pantallaInicial,
                contenedorJuego: !!contenedorJuego
            });
        }
    };
    
    // Reproducir el mensaje inicial y ejecutar callback cuando termine
    dictarFrase(mensajeInicial, continuarDespuesDelAudio);
}

function iniciarJuego() {
    console.log("🎯 Iniciando juego...");
    
    // Mensaje explicativo del juego (sin el saludo inicial)
    const explicacion = "TE MOSTRARÉ VARIAS CARTAS. DEBERÁS ENCONTRAR LOS PARES DE CADA IMAGEN CON SU PALABRA ESCRITA. ¡MUCHA SUERTE!";
    const mensajeFeedback = document.getElementById('mensaje-feedback-puente');
    
    if (mensajeFeedback) {
        mensajeFeedback.textContent = "PREPARANDO EL JUEGO...";
        console.log("🎤 Reproduciendo explicación del juego...");
        dictarFrase(explicacion, prepararTablero);
    } else {
        console.error("❌ No se encontró mensaje-feedback-puente");
    }
}

function prepararTablero() {
    const mensajeFeedback = document.getElementById('mensaje-feedback-puente');
    const tablero = document.getElementById('tablero-puente');
    
    console.log("🎯 Preparando tablero de cartas...");
    
    if (!mensajeFeedback || !tablero) {
        console.error("❌ Error: No se encontraron los elementos del juego");
        return;
    }
    
    mensajeFeedback.textContent = "ENCUENTRA LOS PARES";
    tablero.innerHTML = '';
    tablero.style.display = 'grid';
    
    // Reiniciar variables
    cartasSeleccionadas = [];
    paresEncontrados = 0;
    bloquearTablero = false;

    // USAR las actividades guardadas localmente
    console.log("📊 Actividades desde variable local:", actividadesGeneradas);
    console.log("📊 Actividades desde estado global:", estadoGlobal.actividadActual?.actividades);
    
    // Priorizar variable local sobre estado global
    const actividades = actividadesGeneradas.length > 0 ? actividadesGeneradas : (estadoGlobal.actividadActual?.actividades || []);
    
    console.log("🎮 Actividades finales para cartas:", actividades);
    
    if (actividades.length === 0) {
        console.error("❌ No hay actividades para generar cartas");
        mensajeFeedback.textContent = "ERROR: NO SE PUDIERON CARGAR LAS CARTAS";
        return;
    }
    
    seleccionDePalabras = actividades;

    partidaActual = [];
    seleccionDePalabras.forEach((item, index) => {
        partidaActual.push({ tipo: 'emoji', valor: item.emoji, parId: index });
        partidaActual.push({ tipo: 'texto', valor: item.palabra, parId: index });
    });

    // Mezclar las cartas
    partidaActual.sort(() => Math.random() - 0.5);
    console.log("🃏 Cartas generadas:", partidaActual);

    partidaActual.forEach((item, cartaIndex) => {
        const carta = document.createElement('div');
        carta.classList.add('carta-puente');
        carta.dataset.parId = item.parId;
        carta.dataset.cartaIndex = cartaIndex;

        carta.innerHTML = `
            <div class="cara-carta dorso-carta">?</div>
            <div class="cara-carta frente-carta tipo-${item.tipo}">${item.valor}</div>
        `;

        carta.addEventListener('click', () => voltearCarta(carta, item));
        tablero.appendChild(carta);
        
        console.log(`🃏 Carta ${cartaIndex + 1} añadida: ${item.tipo} - ${item.valor}`);
    });
    
    console.log("✅ Tablero preparado con", partidaActual.length, "cartas");
}

function voltearCarta(cartaElemento, item) {
    if (bloquearTablero || cartaElemento.classList.contains('volteada') || cartasSeleccionadas.length >= 2) {
        return;
    }

    // SÍNTESIS DE VOZ: La IA lee el contenido de la carta (igual que el original)
    const palabraADecir = seleccionDePalabras[item.parId].palabra;
    dictarFrase(palabraADecir);

    cartaElemento.classList.add('volteada');
    cartasSeleccionadas.push({ elemento: cartaElemento, item: item });

    if (cartasSeleccionadas.length === 2) {
        verificarPar();
    }
}

function verificarPar() {
    bloquearTablero = true;
    const [carta1, carta2] = cartasSeleccionadas;
    const mensajeFeedback = document.getElementById('mensaje-feedback-puente');

    if (carta1.item.parId === carta2.item.parId) {
        // Es un par correcto
        paresEncontrados++;
        mensajeFeedback.textContent = "¡GENIAL!";
        mensajeFeedback.className = 'correcto';
        dictarFrase("¡GENIAL, ENCONTRASTE UN PAR!");
        
        cartasSeleccionadas = [];
        bloquearTablero = false;

        // Verificar si se completó el juego
        const totalPares = seleccionDePalabras.length;
        if (paresEncontrados === totalPares && totalPares > 0) {
            // Bloquear todas las cartas para evitar más clics
            const todasLasCartas = document.querySelectorAll('.carta-puente');
            todasLasCartas.forEach(carta => {
                carta.style.pointerEvents = 'none';
            });
            
            // Obtener nombre del alumno EN MAYÚSCULAS
            const nombreAlumno = (datosSession.nombreAlumno || 'ESTUDIANTE').toUpperCase();
            
            // Reproducir mensaje de victoria por voz
            const victoria = `¡EXCELENTE ${nombreAlumno}! COMPLETASTE ESTA Y TODAS LAS ACTIVIDADES PROPUESTAS. ¡FELICITACIONES!`;
            dictarFrase(victoria);
            
            setTimeout(() => {
                // Ocultar las cartas
                const tablero = document.getElementById('tablero-puente');
                if (tablero) {
                    tablero.style.display = 'none';
                }
                
                // Crear el mensaje final con tamaño ajustado y TODO EN MAYÚSCULAS
                mensajeFeedback.innerHTML = `
                    <div style="color: white; text-align: center;">
                        <div style="font-size: 1.5em; margin-bottom: 10px;">🎉 🏆 🌟</div>
                        <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 12px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); text-transform: uppercase;">
                            ¡EXCELENTE ${nombreAlumno}!
                        </div>
                        <div style="font-size: 0.85em; margin-bottom: 18px; line-height: 1.4; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); text-transform: uppercase;">
                            COMPLETASTE ESTA Y TODAS LAS ACTIVIDADES PROPUESTAS<br>
                            <span style="font-size: 0.95em; font-weight: bold;">¡FELICITACIONES! 🎊</span>
                        </div>
                        <button id="boton-finalizar" style="
                            font-family: 'Arial', sans-serif;
                            font-size: 0.95em;
                            font-weight: 700;
                            padding: 12px 30px;
                            border: none;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border-radius: 50px;
                            cursor: pointer;
                            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
                            transition: all 0.3s ease;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        ">
                            <span style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span>FINALIZAR CLASE</span>
                                <span style="font-size: 1.1em;">👋</span>
                            </span>
                        </button>
                    </div>
                `;
                
                // Aplicar la clase para mensaje final con animación
                mensajeFeedback.className = 'correcto mensaje-final';
                
                // Configurar el botón
                const botonFinalizar = document.getElementById('boton-finalizar');
                if (botonFinalizar) {
                    // Efectos hover mejorados
                    botonFinalizar.addEventListener('mouseenter', () => {
                        botonFinalizar.style.transform = 'translateY(-2px) scale(1.02)';
                        botonFinalizar.style.boxShadow = '0 10px 25px rgba(0,0,0,0.35)';
                        botonFinalizar.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)';
                    });
                    botonFinalizar.addEventListener('mouseleave', () => {
                        botonFinalizar.style.transform = 'translateY(0) scale(1)';
                        botonFinalizar.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                        botonFinalizar.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    });
                    
                    // Función del botón - Detener audio y redirigir a index.html
                    botonFinalizar.addEventListener('click', () => {
                        console.log('👋 Finalizando clase y volviendo al inicio...');
                        // Detener completamente el audio antes de redirigir
                        if (synth) {
                            synth.cancel();
                        }
                        if (window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                        }
                        window.location.href = 'index.html';
                    });
                }
            }, 3000);
        }
    } else {
        // Par incorrecto
        mensajeFeedback.textContent = "NO COINCIDEN";
        mensajeFeedback.className = 'incorrecto';
        dictarFrase("¡NO COINCIDEN!");

        setTimeout(() => {
            carta1.elemento.classList.remove('volteada');
            carta2.elemento.classList.remove('volteada');
            cartasSeleccionadas = [];
            bloquearTablero = false;
            mensajeFeedback.textContent = "ENCUENTRA LOS PARES";
            mensajeFeedback.className = '';
        }, 2000);
    }
}

// Función de síntesis de voz (igual que el original)
function dictarFrase(texto, callback) {
    synth.cancel(); // Cancela cualquier audio anterior
    let utterThis = new SpeechSynthesisUtterance(texto);
    utterThis.lang = 'es-ES';
    utterThis.rate = 1.0;
    if (callback) { 
        utterThis.onend = callback; 
    }
    synth.speak(utterThis);
}

// ==================== LIMPIAR RECURSOS ====================

export function limpiarRecursos() {
    console.log("🧹 Limpiando recursos de Puente de Palabras");
    
    // Detener síntesis de voz
    if (synth) {
        synth.cancel();
    }
    
    // Limpiar variables del juego
    partidaActual = [];
    seleccionDePalabras = [];
    cartasSeleccionadas = [];
    paresEncontrados = 0;
    bloquearTablero = false;
    actividadesGeneradas = [];
}

// ==================== LOGGING ====================
console.log("🌉 activity-puente-palabras.js FIEL AL ORIGINAL cargado correctamente");
console.log("✅ Funcionalidades: Memory game + Cartas 3D + Síntesis de voz + Integración LUMAI");