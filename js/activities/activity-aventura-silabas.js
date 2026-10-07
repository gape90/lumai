// js/activities/activity-aventura-silabas.js - La Aventura de las Sílabas (Solo 2 animaciones + fondo transparente)
// ===============================================================================

import { estadoGlobal, datosSession } from '../config.js';
import { llamarGeminiAPI } from '../ai-engine.js';

// Importar base de datos de emojis
let emojisBBDD = null;

async function cargarEmojisBBDD() {
    if (!emojisBBDD) {
        try {
            const modulo = await import('./emojis-base-datos.js');
            emojisBBDD = modulo.BBDD_LUMAI || [];
            console.log(`📚 Base de datos de emojis cargada: ${emojisBBDD.length} emojis disponibles`);
        } catch (error) {
            console.error('⚠️ Error cargando base de datos de emojis:', error);
            emojisBBDD = [];
        }
    }
    return emojisBBDD;
}

// Variables del juego
const synth = window.speechSynthesis;
let rondaActual = {};
let palabrasPorRonda = 5;
let palabrasCompletadas = 0;
let intervaloBurbujas;
let actividadesGeneradas = [];

// ==================== CONFIGURACIÓN ====================

function obtenerConfiguracionAventura() {
    const perfil = estadoGlobal.perfil;
    
    const configuracionesPorPerfil = {
        'N0': { palabrasPorRonda: 5, velocidadBurbujas: 6000, descripcion: 'Cazador de sílabas muy simple' },
        'N1': { palabrasPorRonda: 6, velocidadBurbujas: 6000, descripcion: 'Cazador de sílabas simple' },
        'N2': { palabrasPorRonda: 6, velocidadBurbujas: 5000, descripcion: 'Cazador de sílabas moderado' },
        'N3': { palabrasPorRonda: 6, velocidadBurbujas: 4000, descripcion: 'Cazador de sílabas avanzado' }
    };
    
    return configuracionesPorPerfil[perfil?.nombre_visible] || configuracionesPorPerfil['N2'];
}

// ==================== GENERACIÓN DE ACTIVIDAD ====================

export async function generarActividad() {
    console.log("🎯 Generando actividad Aventura de las Sílabas...");
    
    try {
        const config = obtenerConfiguracionAventura();
        console.log(`🎮 Configuración para ${estadoGlobal.perfil.nombre_visible}: ${config.descripcion}`);
        
        await cargarEmojisBBDD();
        const palabrasIA = await generarPalabrasConIA();
        
        if (palabrasIA && palabrasIA.length >= config.palabrasPorRonda) {
            console.log("✅ Palabras generadas exitosamente con IA");
            actividadesGeneradas = palabrasIA.slice(0, config.palabrasPorRonda);
            console.log("💾 Palabras guardadas localmente:", actividadesGeneradas);
            
            return {
                tipo: "aventura-silabas",
                actividades: actividadesGeneradas,
                configuracion: config,
                instrucciones: "Caza las sílabas correctas para formar palabras"
            };
        } else {
            console.warn("⚠️ IA generó pocas palabras, usando fallback");
            throw new Error("Palabras insuficientes de IA");
        }
        
    } catch (error) {
        console.error("⚠️ Error generando con IA:", error);
        return generarActividadFallback();
    }
}

async function generarPalabrasConIA() {
    const explicacion = estadoGlobal.explicacionGenerada;
    const config = obtenerConfiguracionAventura();
    const cantidadRequerida = config.palabrasPorRonda;
    
    const prompt = `
Eres un experto en educación creando palabras con sílabas para un juego de "La Aventura de las Sílabas" para ${estadoGlobal.perfil.nombre_visible}.

PERFIL DEL ESTUDIANTE: ${estadoGlobal.perfil.nombre_visible}
CONFIGURACIÓN: ${config.descripcion}

EXPLICACIÓN EDUCATIVA:
"""${explicacion}"""

INSTRUCCIONES:
- Extrae EXACTAMENTE ${cantidadRequerida} palabras clave de la explicación
- Cada palabra debe tener 2-4 sílabas para el juego
- Proporciona las sílabas separadas y un emoji representativo
- Las sílabas deben ser claras y pronunciables

FORMATO DE RESPUESTA (JSON):
\`\`\`json
[
  {
    "palabra": "MÚSICA",
    "silabas": ["MÚ", "SI", "CA"],
    "emoji": "🎵"
  },
  {
    "palabra": "COLOR",
    "silabas": ["CO", "LOR"],
    "emoji": "🎨"
  }
]
\`\`\`

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.
`;

    try {
        const respuesta = await llamarGeminiAPI(prompt, 1000, 0.7);
        console.log('🔥 Respuesta cruda de Gemini:', respuesta);
        
        let jsonLimpio = respuesta.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const palabras = JSON.parse(jsonLimpio);
        console.log('✅ Palabras procesadas de IA:', palabras);
        
        if (Array.isArray(palabras) && palabras.length >= cantidadRequerida) {
            console.log(`✅ IA generó ${palabras.length} palabras para la aventura de las sílabas`);
            
            return palabras.map(palabra => {
                let emojiDefinitivo = palabra.emoji || '🎯';
                
                if (emojisBBDD && emojisBBDD.length > 0) {
                    const emojiEncontrado = emojisBBDD.find(item => 
                        item.palabrasReferencia && Array.isArray(item.palabrasReferencia) &&
                        item.palabrasReferencia.some(ref => 
                            ref.toLowerCase().includes(palabra.palabra.toLowerCase()) ||
                            palabra.palabra.toLowerCase().includes(ref.toLowerCase())
                        )
                    );
                    
                    if (emojiEncontrado) {
                        emojiDefinitivo = emojiEncontrado.emoji;
                        console.log(`🎯 Emoji mejorado para ${palabra.palabra}: ${emojiDefinitivo}`);
                    }
                }
                
                return {
                    palabra: palabra.palabra || 'PALABRA',
                    silabas: palabra.silabas || ['PA', 'LA', 'BRA'],
                    emoji: emojiDefinitivo
                };
            });
        } else {
            throw new Error(`IA generó solo ${palabras.length} palabras, se requieren ${cantidadRequerida}`);
        }
        
    } catch (error) {
        console.error("⚠️ Error procesando respuesta de IA:", error);
        throw error;
    }
}

function generarActividadFallback() {
    console.log("🔄 Generando actividad Aventura de Sílabas con fallback");
    
    const config = obtenerConfiguracionAventura();
    const cantidadRequerida = config.palabrasPorRonda;
    
    const palabrasGenericas = [
        { palabra: 'MÚSICA', silabas: ['MÚ', 'SI', 'CA'], emoji: '🎵' },
        { palabra: 'COLOR', silabas: ['CO', 'LOR'], emoji: '🎨' },
        { palabra: 'ESCUELA', silabas: ['ES', 'CUE', 'LA'], emoji: '🏫' },
        { palabra: 'LIBRO', silabas: ['LI', 'BRO'], emoji: '📚' },
        { palabra: 'CASA', silabas: ['CA', 'SA'], emoji: '🏠' },
        { palabra: 'FLOR', silabas: ['FLOR'], emoji: '🌸' }
    ];
    
    actividadesGeneradas = palabrasGenericas.slice(0, cantidadRequerida);
    console.log("💾 Palabras fallback guardadas localmente:", actividadesGeneradas);
    
    return {
        tipo: "aventura-silabas",
        actividades: actividadesGeneradas,
        configuracion: config,
        instrucciones: "Caza las sílabas correctas para formar palabras",
        esFallback: true
    };
}

// ==================== RENDERIZACIÓN ====================

export async function renderizar() {
    console.log("🎨 Renderizando actividad Aventura de las Sílabas...");
    
    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (!actividadesEl) {
        console.error("⚠️ Elemento de actividades no encontrado");
        throw new Error("Contenedor de actividades no encontrado");
    }
    
    actividadesEl.innerHTML = '';
    const htmlJuego = generarHTMLJuego();
    actividadesEl.innerHTML = htmlJuego;
    configurarEventosJuego();
    
    console.log("✅ Actividad Aventura de las Sílabas renderizada correctamente");
}

function generarHTMLJuego() {
    return `
        <div id="aventura-silabas-game">
            <div id="overlay-fondo-aventura"></div>
            <div id="pantalla-inicial-aventura">
                <div class="titulo-game-aventura">
                    <h1>🎯 LA AVENTURA DE LAS SÍLABAS</h1>
                    <div class="subtitulo-aventura">¡ATRAPA LAS BURBUJAS CON LAS SÍLABAS CORRECTAS!</div>
                    <div class="iconos-decorativos-aventura">
                        <span class="icono-burbuja">💧</span>
                        <span class="icono-cazador">🎯</span>
                        <span class="icono-burbuja">💧</span>
                    </div>
                </div>
            </div>
            
            <div class="contenedor-principal" style="display: none;">
                <div id="desafio-container">
                    <span class="desafio-emoji"></span>
                    <span class="desafio-palabra"></span>
                </div>
                <div id="zona-de-juego"></div>
                <button id="boton-siguiente-juego-aventura" style="
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    font-family: 'Arial', sans-serif;
                    font-size: 1.1em;
                    font-weight: 700;
                    padding: 15px 30px;
                    border: none;
                    background-color: #f97316;
                    color: white;
                    border-radius: 50px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
                    transition: transform 0.2s, box-shadow 0.2s;
                    z-index: 100;
                    display: block;
                ">➡️ SIGUIENTE</button>
                <div id="mensaje-feedback-aventura">
                    PREPARANDO EL JUEGO...
                    <button id="boton-siguiente-aventura">SIGUIENTE</button>
                </div>
            </div>
        </div>
        
        <style>
            :root {
                --color-texto-aventura: #e2e8f0;
                --color-acento1-aventura: #22c55e;
                --color-acento2-aventura: #f97316;
                --color-acento3-aventura: #38bdf8;
                --color-sombra-aventura: rgba(0, 0, 0, 0.4);
            }

            /* SOLO 2 ANIMACIONES PERMITIDAS */
            @keyframes fadeInAventura {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }

            /* 1. FLOTACIÓN HACIA ARRIBA (MANTENER) */
            @keyframes floatUpAventura {
                from { bottom: -100px; transform: translateX(-50%); }
                to { bottom: 100%; transform: translateX(-50%); }
            }
            
            /* 2. DESAPARICIÓN GRADUAL AL HACER CLIC (NUEVO - SIMPLE) */
            @keyframes fadeOutGradual {
                from { 
                    opacity: 1; 
                    transform: scale(1); 
                }
                to { 
                    opacity: 0; 
                    transform: scale(0.8); 
                }
            }

            #aventura-silabas-game {
                font-family: 'Poppins', sans-serif;
                /* FONDO CON IMAGEN Y TRANSPARENCIA */
                background-image: url('img/fondo-aventura-silabas.png');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                background-color: transparent; /* TRANSPARENTE */
                color: var(--color-texto-aventura);
                width: 100%;
                height: 80vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                box-sizing: border-box;
                border-radius: 20px;
                position: relative;
                overflow: hidden;
            }

            #pantalla-inicial-aventura {
                display: block;
                padding: 40px 20px;
                background-image: url('img/fondo-aventura-silabas.png');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                border-radius: 20px;
                box-shadow: 0 10px 30px var(--color-sombra-aventura);
                text-align: center;
                animation: fadeInAventura 0.5s ease-out;
            }

            .titulo-game-aventura {
                /* FONDO SEMI-TRANSPARENTE */
                background-color: rgba(15, 23, 42, 0.3); /* MUY TRANSPARENTE */
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 5px 15px var(--color-sombra-aventura);
            }

            .titulo-game-aventura h1 {
                font-size: 2.8em;
                margin: 0 0 15px 0;
                color: white;
                text-shadow: 0 0 15px var(--color-acento3-aventura);
            }

            .subtitulo-aventura {
                font-size: 1.4em;
                color: var(--color-acento2-aventura);
                margin-bottom: 20px;
                font-weight: 600;
            }

            .iconos-decorativos-aventura {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin-top: 20px;
            }

            .icono-burbuja, .icono-cazador {
                font-size: 3em;
            }

            .contenedor-principal {
                width: 100%;
                max-width: 800px;
                height: 90vh;
                max-height: 700px;
                /* FONDO TRANSPARENTE */
                background: rgba(30, 41, 59, 0.2); /* MUY TRANSPARENTE */
                border-radius: 20px;
                box-shadow: 0 10px 30px var(--color-sombra-aventura);
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
            }
            
            #desafio-container {
                position: absolute;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                /* FONDO SEMI-TRANSPARENTE */
                background-color: rgba(8, 20, 41, 0.4); /* MÁS TRANSPARENTE */
                padding: 15px 30px;
                border-radius: 20px;
                display: flex;
                align-items: center;
                gap: 20px;
                font-size: 2.5em;
                z-index: 10;
            }
            .desafio-emoji { font-size: 1.5em; }
            .desafio-palabra { letter-spacing: 5px; }
            
            #zona-de-juego {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
            }

            .burbuja {
                position: absolute;
                bottom: -100px;
                left: 50%;
                width: 100px;
                height: 100px;
                background-image: url('img/burbujas-aventura-silabas.png');
                background-size: cover;
                background-position: center;
                border-radius: 50%;
                color: black;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.8em;
                font-weight: 700;
                cursor: pointer;
                box-shadow: inset 0 0 10px rgba(255,255,255,0.3), 0 5px 20px var(--color-sombra-aventura);
                /* SOLO LA ANIMACIÓN DE FLOTACIÓN */
                animation-name: floatUpAventura;
                animation-timing-function: linear;
                animation-iteration-count: 1;
                z-index: 5;
                text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
            }
            
            /* EFECTO SIMPLE AL HACER CLIC */
            .burbuja.clicked {
                animation: fadeOutGradual 0.5s ease-out forwards;
            }
            
            .burbuja.correcta {
                background-color: var(--color-acento1-aventura);
            }
            .burbuja.incorrecta {
                background-color: #dc2626;
            }

            #mensaje-feedback-aventura {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1000;
                background-color: rgba(255, 255, 255, 0.98);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                border: 3px solid var(--color-acento1-aventura);
                width: 90%;
                max-width: 400px;
                padding: 30px;
                border-radius: 20px;
                text-align: center;
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #0f172a;
                font-size: 1.2em;
                font-weight: bold;
            }

            #boton-siguiente-aventura {
                font-family: 'Arial', sans-serif;
                font-size: 1.1em;
                font-weight: 700;
                padding: 15px 30px;
                border: none;
                background-color: var(--color-acento2-aventura);
                color: white;
                border-radius: 50px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
                transition: transform 0.2s, box-shadow 0.2s;
                margin-top: 15px;
                display: none;
            }

            #boton-siguiente-aventura:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 16px rgba(249, 115, 22, 0.5);
            }

            #overlay-fondo-aventura {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 999;
                display: none;
            }

            .correcto { color: var(--color-acento1-aventura); }
            .incorrecto { color: #ef4444; }
        </style>
    `;
}

// ==================== LÓGICA DEL JUEGO ====================

function configurarEventosJuego() {
    console.log("🎮 Configurando eventos para Aventura de Sílabas");
    
    // Configurar botón SIGUIENTE
    const botonSiguienteJuego = document.getElementById('boton-siguiente-juego-aventura');
    if (botonSiguienteJuego) {
        botonSiguienteJuego.addEventListener('mouseenter', () => {
            botonSiguienteJuego.style.transform = 'translateY(-3px)';
            botonSiguienteJuego.style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.5)';
        });
        botonSiguienteJuego.addEventListener('mouseleave', () => {
            botonSiguienteJuego.style.transform = 'translateY(0)';
            botonSiguienteJuego.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.4)';
        });
        
        botonSiguienteJuego.addEventListener('click', async () => {
            console.log('🎯 Botón SIGUIENTE presionado en Aventura Sílabas');
            
            // Detener audio
            if (synth) {
                synth.cancel();
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            
            // Detener intervalo de burbujas
            if (intervaloBurbujas) {
                clearInterval(intervaloBurbujas);
            }
            
            try {
                console.log('➡️ Cargando Supermercado...');
                
                estadoGlobal.actividadActual = 'supermercado';
                
                const moduloSupermercado = await import('./activity-supermercado.js');
                
                if (moduloSupermercado.generarActividad) {
                    await moduloSupermercado.generarActividad();
                }
                
                if (moduloSupermercado.renderizar) {
                    await moduloSupermercado.renderizar();
                }
                
                console.log('✅ Supermercado cargado correctamente');
                
            } catch (error) {
                console.error('❌ Error al cargar siguiente juego:', error);
            }
        });
    }
    
    // 🔧 CORREGIDO: Solo un pequeño delay, NO ocultar automáticamente
    setTimeout(() => {
        iniciarJuego();
    }, 2000);
}

function iniciarJuego() {
    console.log("🎯 Iniciando La Aventura de las Sílabas...");
    
    // 🔧 CAMBIO 2: Saludo específico mejorado para segundo juego - TODO EN MAYÚSCULAS
    const nombreAlumno = datosSession?.nombreAlumno || estadoGlobal.datosSession?.nombre || 'ESTUDIANTE';
    const saludo = `CONTINUAMOS APRENDIENDO. AHORA VAMOS A PRACTICAR CON LA AVENTURA DE LAS SÍLABAS. TENÉS QUE PRESIONAR LAS BURBUJAS QUE TIENEN LAS SÍLABAS QUE FORMAN LA PALABRA QUE VA A APARECER ARRIBA. EMPECEMOS ${nombreAlumno.toUpperCase()}.`;
    
    // 🔧 CORREGIDO: Ocultar pantalla inicial DESPUÉS de que termine la voz
    dictarFrase(saludo, () => {
        const pantallaInicial = document.getElementById('pantalla-inicial-aventura');
        const contenedorPrincipal = document.querySelector('.contenedor-principal');
        
        if (pantallaInicial && contenedorPrincipal) {
            console.log("✅ Introducción terminada, ocultando pantalla inicial...");
            pantallaInicial.style.display = 'none';
            contenedorPrincipal.style.display = 'flex';
            prepararPrimeraRonda();
        }
    });
}

function prepararPrimeraRonda() {
    console.log("📊 Actividades desde variable local:", actividadesGeneradas);
    
    if (actividadesGeneradas.length === 0) {
        console.error("⚠️ No hay palabras para el juego");
        mostrarMensajeFinal("ERROR: NO SE PUDIERON CARGAR LAS PALABRAS");
        return;
    }
    
    palabrasCompletadas = 0;
    palabrasPorRonda = actividadesGeneradas.length;
    siguientePalabra();
}

function siguientePalabra() {
    if (palabrasCompletadas >= palabrasPorRonda) {
        completarJuego();
        return;
    }
    
    // 🔧 LIMPIAR ZONA DE JUEGO antes de nueva palabra
    const zonaJuego = document.getElementById('zona-de-juego');
    if (zonaJuego) {
        zonaJuego.innerHTML = '';
    }
    
    const palabraActual = actividadesGeneradas[palabrasCompletadas];
    rondaActual = {
        palabra: palabraActual.palabra,
        emoji: palabraActual.emoji,
        silabas: palabraActual.silabas,
        silabrasRestantes: [...palabraActual.silabas],
        silabasDummy: generarSilabasDummy(palabraActual.silabas)
    };
    
    const desafioEmoji = document.querySelector('.desafio-emoji');
    const desafioPalabra = document.querySelector('.desafio-palabra');
    
    if (desafioEmoji && desafioPalabra) {
        desafioEmoji.textContent = rondaActual.emoji;
        desafioPalabra.textContent = rondaActual.palabra;
    }
    
    console.log("🎯 Iniciando palabra:", rondaActual.palabra);
    
    // 🔧 PEQUEÑO DELAY antes de iniciar burbujas para nueva palabra
    setTimeout(() => {
        iniciarBurbujas();
    }, 800);
}

function generarSilabasDummy(silabrasCorrectas) {
    const dummies = ['BA', 'CO', 'DE', 'FE', 'GI', 'HO', 'JU', 'KE', 'LI', 'MO', 'NE', 'ÑO', 'PA', 'QUE', 'RI', 'SO', 'TE', 'VU', 'WA', 'XI', 'YO', 'ZU'];
    const resultado = [];
    
    while (resultado.length < 3) {
        const dummy = dummies[Math.floor(Math.random() * dummies.length)];
        if (!silabrasCorrectas.includes(dummy) && !resultado.includes(dummy)) {
            resultado.push(dummy);
        }
    }
    
    return resultado;
}

function iniciarBurbujas() {
    const zonaJuego = document.getElementById('zona-de-juego');
    
    if (!zonaJuego) return;
    
    zonaJuego.innerHTML = '';
    
    console.log("🫧 Iniciando burbujas para:", rondaActual.palabra);
    
    const todasLasSilabas = [...rondaActual.silabrasRestantes, ...rondaActual.silabasDummy];
    todasLasSilabas.sort(() => Math.random() - 0.5);
    
    let indiceSilaba = 0;
    let burbujasActivas = 0;
    const maxBurbujas = 3;
    
    // 🔧 LIMPIAR INTERVALO ANTERIOR SI EXISTE
    if (intervaloBurbujas) {
        clearInterval(intervaloBurbujas);
    }
    
    // 🔧 NUEVO: Crear las primeras 3 burbujas casi simultáneamente
    const crearBurbujasIniciales = () => {
        for (let i = 0; i < Math.min(3, todasLasSilabas.length); i++) {
            setTimeout(() => {
                if (indiceSilaba < todasLasSilabas.length && rondaActual.silabrasRestantes.length > 0) {
                    crearBurbuja(todasLasSilabas[indiceSilaba], () => {
                        burbujasActivas--;
                    });
                    burbujasActivas++;
                    indiceSilaba++;
                }
            }, i * 800); // 0ms, 800ms, 1600ms para las primeras 3
        }
    };
    
    // Crear las burbujas iniciales
    crearBurbujasIniciales();
    
    // 🔧 INTERVALO MÁS RÁPIDO para mantener 3 burbujas en pantalla
    intervaloBurbujas = setInterval(() => {
        if (rondaActual.silabrasRestantes.length === 0) {
            clearInterval(intervaloBurbujas);
            return;
        }
        
        // Solo crear nueva burbuja si hay espacio y quedan sílabas por mostrar
        if (burbujasActivas < maxBurbujas && indiceSilaba < todasLasSilabas.length) {
            crearBurbuja(todasLasSilabas[indiceSilaba], () => {
                burbujasActivas--;
            });
            burbujasActivas++;
            indiceSilaba++;
        }
        
        // Si ya mostramos todas las sílabas, reiniciar para mostrar más
        if (indiceSilaba >= todasLasSilabas.length && rondaActual.silabrasRestantes.length > 0) {
            indiceSilaba = 0;
            todasLasSilabas.sort(() => Math.random() - 0.5);
        }
        
    }, 1200); // 🔧 MÁS RÁPIDO: 1.2 segundos entre burbujas
}

function crearBurbuja(silaba, onDestroy) {
    const zonaJuego = document.getElementById('zona-de-juego');
    const burbuja = document.createElement('div');
    
    burbuja.className = 'burbuja';
    burbuja.textContent = silaba;
    
    const posX = Math.random() * 80 + 10;
    burbuja.style.left = `${posX}%`;
    
    const duracion = Math.random() * 2 + 7; // 🔧 CAMBIAR: 7-9 segundos (era 8-11)
    burbuja.style.animationDuration = `${duracion}s`;
    
    burbuja.addEventListener('click', () => manejarClicBurbuja(burbuja, silaba));
    
    zonaJuego.appendChild(burbuja);
    
    setTimeout(() => {
        if (burbuja.parentNode) {
            burbuja.parentNode.removeChild(burbuja);
        }
        if (onDestroy) onDestroy(); // 🔧 LLAMAR CALLBACK AL DESTRUIR
    }, duracion * 1000);
}

// 🔧 FUNCIÓN SIMPLIFICADA - Sin loops complejos
function manejarClicBurbuja(burbuja, silaba) {
    const esCorrecta = rondaActual.silabrasRestantes.includes(silaba);
    
    // EFECTO SIMPLE DE CLIC: Solo agregar clase para fade out gradual
    burbuja.classList.add('clicked');
    
    if (esCorrecta) {
        burbuja.classList.add('correcta');
        rondaActual.silabrasRestantes = rondaActual.silabrasRestantes.filter(s => s !== silaba);
        
        // 🔧 NO DECIR LA SÍLABA POR VOZ (quitado dictarFrase(silaba))
        
        console.log("✅ Sílaba correcta:", silaba, "Restantes:", rondaActual.silabrasRestantes);
        
        // 🔧 SIMPLIFICADO: Solo verificar si completó la palabra
        if (rondaActual.silabrasRestantes.length === 0) {
            console.log("🎉 Palabra completada:", rondaActual.palabra);
            clearInterval(intervaloBurbujas);
            palabrasCompletadas++;
            
            console.log(`📊 Progreso: ${palabrasCompletadas}/${palabrasPorRonda} palabras completadas`);
            
            // 🔧 AGREGAR MENSAJE DE VOZ AL COMPLETAR PALABRA - TODO EN MAYÚSCULAS
            const nombreAlumno = datosSession?.nombreAlumno || estadoGlobal.datosSession?.nombre || 'ESTUDIANTE';
            let mensajeFelicitacion = '';
            
            if (palabrasCompletadas === 1) {
                mensajeFelicitacion = `MUY BIEN ${nombreAlumno.toUpperCase()} COMPLETASTE LA PALABRA ${rondaActual.palabra}`;
            } else if (palabrasCompletadas === 2) {
                mensajeFelicitacion = `EXCELENTE ${nombreAlumno.toUpperCase()} COMPLETASTE LA PALABRA ${rondaActual.palabra}`;
            } else {
                mensajeFelicitacion = `FANTÁSTICO ${nombreAlumno.toUpperCase()} COMPLETASTE LA PALABRA ${rondaActual.palabra}`;
            }
            
            // Reproducir mensaje de felicitación
            dictarFrase(mensajeFelicitacion);
            
            // 🔧 TIMEOUT ÚNICO para evitar problemas de timing
            setTimeout(() => {
                if (palabrasCompletadas >= palabrasPorRonda) {
                    console.log("🎉 ¡Todas las palabras completadas!");
                    completarJuego();
                } else {
                    siguientePalabra();
                }
            }, 3000); // Dar más tiempo para el mensaje de felicitación
        }
    } else {
        burbuja.classList.add('incorrecta');
        // 🔧 SIMPLIFICADO: Solo mensaje simple - TODO EN MAYÚSCULAS
        dictarFrase("NO, ESA SÍLABA NO ES CORRECTA");
    }
    
    // Remover después del fade out
    setTimeout(() => {
        if (burbuja.parentNode) {
            burbuja.parentNode.removeChild(burbuja);
        }
    }, 500);
}

function completarJuego() {
    console.log("🎉 Aventura de Sílabas completada");
    
    clearInterval(intervaloBurbujas);
    const zonaJuego = document.getElementById('zona-de-juego');
    if (zonaJuego) {
        zonaJuego.innerHTML = '';
    }
    
    const nombreAlumno = datosSession?.nombreAlumno || estadoGlobal.datosSession?.nombre || 'ESTUDIANTE';
    
    setTimeout(() => {
        mostrarMensajeFinal(`¡MUY BIEN ${nombreAlumno.toUpperCase()}! COMPLETASTE LA AVENTURA DE LAS SÍLABAS. PRESIONÁ EL BOTÓN SIGUIENTE.`);
    }, 1000);
}

function mostrarMensajeFinal(mensaje) {
    const mensajeFeedback = document.getElementById('mensaje-feedback-aventura');
    const overlay = document.getElementById('overlay-fondo-aventura');
    const nombreAlumno = datosSession?.nombreAlumno || estadoGlobal.datosSession?.nombre || 'ESTUDIANTE';
    
    if (mensajeFeedback && overlay) {
        overlay.style.display = 'block';
        mensajeFeedback.style.display = 'flex';
        
        // 🔧 CAMBIO 4: Mensaje emergente igual que Exploradores del Sonido + TAMAÑO CORREGIDO - TODO EN MAYÚSCULAS
        const mensajeCompleto = `¡MUY BIEN ${nombreAlumno.toUpperCase()}! COMPLETASTE LA AVENTURA DE LAS SÍLABAS. PRESIONÁ EL BOTÓN SIGUIENTE.`;
        
        mensajeFeedback.innerHTML = `
            <div style="margin-bottom: 15px; font-size: 1.3em; line-height: 1.4;">${mensajeCompleto}</div>
            <button id="boton-siguiente-aventura" style="
                font-family: 'Arial', sans-serif;
                font-size: 1.1em;
                font-weight: 700;
                padding: 15px 30px;
                border: none;
                background-color: #f97316;
                color: white;
                border-radius: 50px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
                transition: transform 0.2s, box-shadow 0.2s;
                display: inline-block;
            ">SIGUIENTE</button>
        `;
        
        // 🔧 REPRODUCIR MENSAJE DE FELICITACIÓN que coincide con el texto
        dictarFrase(mensajeCompleto);
        
        const botonSiguiente = document.getElementById('boton-siguiente-aventura');
        if (botonSiguiente) {
            botonSiguiente.addEventListener('mouseenter', () => {
                botonSiguiente.style.transform = 'translateY(-3px)';
                botonSiguiente.style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.5)';
            });
            botonSiguiente.addEventListener('mouseleave', () => {
                botonSiguiente.style.transform = 'translateY(0)';
                botonSiguiente.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.4)';
            });
            
            botonSiguiente.addEventListener('click', () => {
                console.log('🎉 Botón Siguiente presionado en Aventura Sílabas');
                console.log('🎉 Actividad Aventura de las Sílabas completada');
                // 🔧 DETENER AUDIO ANTES DE CONTINUAR
                if (synth) {
                    synth.cancel();
                }
                if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
                // 🔧 CAMBIO 3: Usar callback secuencial en lugar del original
                if (window.actividadCompletadaSecuencial) {
                    window.actividadCompletadaSecuencial();
                }
            });
        }
    }
}

function dictarFrase(texto, callback) {
    synth.cancel();
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
    console.log("🧹 Limpiando recursos de Aventura de Sílabas");
    
    if (synth) {
        synth.cancel();
    }
    
    if (intervaloBurbujas) {
        clearInterval(intervaloBurbujas);
    }
    
    rondaActual = {};
    palabrasCompletadas = 0;
    actividadesGeneradas = [];
    
    console.log("✅ Recursos de Aventura de Sílabas limpiados completamente");
}

console.log("🎯 activity-aventura-silabas.js COMPLETO Y FUNCIONAL cargado correctamente");
console.log("✅ Funcionalidades: Generación + Renderización + Juego completo + Limpieza + Métricas");
console.log("🎮 Auto-inicio en 2 segundos + Síntesis de voz + Progresión automática");
