// js/activities/activity-supermercado.js - Aventura en el Supermercado
// ===============================================================================
// 🔧 MODIFICADO: SOLO 3 cambios mínimos para flujo secuencial + mejoras específicas
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

// ==================== FUNCIONES AUXILIARES (DEFINIDAS PRIMERO) ====================

function obtenerGeneroYArticulo(palabra, cantidad) {
    // Mapeo específico de géneros para alimentos
    const alimentosMasculinos = [
        'PAN', 'QUESO', 'HUEVO', 'POLLO', 'JAMÓN', 'JAMON', 'ATÚN', 'ATUN', 
        'PESCADO', 'ARROZ', 'YOGUR', 'ACEITE', 'CAFÉ', 'CAFE', 'TÉ', 'TE',
        'POROTO', 'AJO', 'APIO', 'CHOCLO', 'DURAZNO', 'MELÓN', 'MELON', 'LIMÓN', 'LIMON',
        'TOMATE'  // TOMATE es masculino
    ];
    
    const alimentosFemeninos = [
        'MANZANA', 'BANANA', 'PERA', 'UVA', 'PIÑA', 'PAPA', 'LECHE', 'SOPA', 'CARNE',
        'HAMBURGUESA', 'PIZZA', 'DONA', 'GALLETA', 'CEREZA', 'FRESA', 'NARANJA',
        'SANDÍA', 'SANDIA', 'ZANAHORIA', 'LECHUGA', 'CEBOLLA', 'CALABAZA', 'ARVEJA',
        'ESPINACA', 'PASTA', 'MANTECA', 'NUEZ', 'ALMENDRA', 'AVENA', 'MIEL', 'SAL',
        'AZÚCAR', 'AZUCAR'
    ];
    
    let esMasculino;
    if (alimentosMasculinos.includes(palabra)) {
        esMasculino = true;
    } else if (alimentosFemeninos.includes(palabra)) {
        esMasculino = false;
    } else {
        // Regla general: terminadas en A son femeninas, resto masculinas
        esMasculino = !palabra.endsWith('A');
    }
    
    // Retornar artículo según género y cantidad
    if (cantidad === 1) {
        return esMasculino ? 'el' : 'la';
    } else {
        return esMasculino ? 'los' : 'las';
    }
}

function pluralizar(palabra, cantidad) {
    if (cantidad === 1) return palabra;
    
    const ultimaLetraNorm = palabra.slice(-1).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if ("AEIOU".includes(ultimaLetraNorm)) return palabra + 'S';
    if (palabra.slice(-1) === 'Z') return palabra.slice(0, -1) + 'CES';
    return palabra + 'ES';
}

function dictarFrase(texto, callback = null) {
    if (!('speechSynthesis' in window)) {
        console.warn('Síntesis de voz no disponible');
        if (callback) callback();
        return;
    }
    
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-AR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    if (callback) {
        utterance.onend = callback;
        utterance.onerror = callback;
    }
    
    speechSynthesis.speak(utterance);
}

// ==================== CONFIGURACIÓN Y ESTADO ====================

let actividadSupermercado = {
    tipo: 'supermercado',
    listaDeLaRonda: [],
    itemActualIndex: 0,
    itemsRecolectados: 0,
    bloqueado: false,
    completada: false,
    dominada: false,
    configuracion: {},
    productosGenerados: [],
    // Variables para la funcionalidad de suma
    preguntaSuma: {
        respuestaCorrecta: 0,
        intentosRealizados: 0,
        maxIntentos: 2,
        enProceso: false
    }
};

// Ampliada lista de alimentos disponibles para mayor variedad
const ALIMENTOS_VALIDOS = [
    "PERA", "UVA", "PIÑA", "LIMÓN", "MELÓN", "PAPA", "PAN", "LECHE", "HUEVO",
    "TOMATE", "BANANA", "QUESO", "POLLO", "SOPA", "MANZANA", "CARNE", "HAMBURGUESA",
    "PIZZA", "HELADO", "DONA", "GALLETA", "PASTEL", "CEREZA", "FRESA", "NARANJA",
    "SANDÍA", "DURAZNO", "ZANAHORIA", "LECHUGA", "BRÓCOLI", "APIO", "CEBOLLA", 
    "AJO", "CALABAZA", "CHOCLO", "ARVEJA", "ESPINACA", "JAMÓN", "ATÚN", "PESCADO",
    "ARROZ", "PASTA", "YOGUR", "MANTECA", "POROTO", "LENTEJAS", "NUEZ", "ALMENDRA",
    "AVENA", "CEREAL", "MIEL", "ACEITE", "SAL", "AZÚCAR", "CAFÉ", "TÉ"
];

// ==================== CONFIGURACIÓN POR PERFIL ====================

function obtenerConfiguracionSupermercado() {
    const perfil = estadoGlobal.perfil;
    
    const configuracionesPorPerfil = {
        'N0': { 
            maxProductos: 5, 
            maxCantidad: 20, 
            descripcion: 'Compras muy simples'
        },
        'N1': { 
            maxProductos: 4, 
            maxCantidad: 7, 
            descripcion: 'Compras simples' 
        },
        'N2': { 
            maxProductos: 5, 
            maxCantidad: 9, 
            descripcion: 'Compras moderadas' 
        },
        'N3': { 
            maxProductos: 6, 
            maxCantidad: 12, 
            descripcion: 'Compras avanzadas' 
        }
    };
    
    return configuracionesPorPerfil[perfil?.nombre_visible] || configuracionesPorPerfil['N1'];
}

// ==================== GENERACIÓN DE ACTIVIDAD ====================

export async function generarActividad() {
    console.log("🛒 EJECUTANDO generarActividad()");
    console.log("🛒 Generando actividad Supermercado...");
    
    try {
        const config = obtenerConfiguracionSupermercado();
        console.log(`🎮 Configuración para ${estadoGlobal.perfil.nombre_visible}: ${config.descripcion}`);
        
        // Cargar base de datos de emojis
        await cargarEmojisBBDD();
        
        const productosIA = await generarProductosConIA();
        
        if (productosIA && productosIA.length >= config.maxProductos) {
            console.log("✅ Productos generados exitosamente con IA");
            
            // GUARDAR productos generados
            actividadSupermercado.productosGenerados = productosIA.slice(0, config.maxProductos);
            actividadSupermercado.configuracion = config;
            
            console.log("💾 Productos guardados localmente:", actividadSupermercado.productosGenerados);
            
            return {
                tipo: "supermercado",
                productos: actividadSupermercado.productosGenerados,
                configuracion: config,
                instrucciones: "Ayúdame a encontrar todo en la lista de compras"
            };
        } else {
            console.warn("⚠️ IA generó pocos productos, usando fallback");
            throw new Error("Productos insuficientes de IA");
        }
        
    } catch (error) {
        console.error("⚠️ Error generando con IA:", error);
        return generarActividadFallback();
    }
}

async function generarProductosConIA() {
    const explicacion = estadoGlobal.explicacionGenerada;
    const config = obtenerConfiguracionSupermercado();
    const cantidadRequerida = config.maxProductos;
    
    const prompt = `
Sos un experto en educación creando una lista de compras para un juego de "Supermercado" para ${estadoGlobal.perfil.nombre_visible}.

PERFIL DEL ESTUDIANTE: ${estadoGlobal.perfil.nombre_visible}
CONFIGURACIÓN: ${config.descripcion}

EXPLICACIÓN EDUCATIVA:
"""${explicacion}"""

ALIMENTOS VÁLIDOS DISPONIBLES:
${ALIMENTOS_VALIDOS.join(', ')}

INSTRUCCIONES:
- Seleccioná EXACTAMENTE ${cantidadRequerida} alimentos de la lista válida
- Cada producto debe tener una cantidad entre 1 y ${config.maxCantidad}
- Los productos deben ser variados y educativos
- Evitá repetir productos de otras sesiones para mayor variedad
- Si es posible, relacioná con el tema: ${estadoGlobal.tema}

FORMATO DE RESPUESTA (JSON):
\`\`\`json
[
  {
    "producto": "MANZANA",
    "cantidad": 3
  },
  {
    "producto": "LECHE",
    "cantidad": 2
  }
]
\`\`\`

IMPORTANTE: Respondé SOLO con el JSON, sin texto adicional.
`;

    try {
        const respuesta = await llamarGeminiAPI(prompt, 1000, 0.7);
        
        let jsonLimpio = respuesta.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        const productos = JSON.parse(jsonLimpio);
        
        if (Array.isArray(productos) && productos.length >= cantidadRequerida) {
            console.log(`✅ IA generó ${productos.length} productos para supermercado`);
            
            // Enriquecer con emojis de la base de datos
            return productos.map(item => {
                const productoEnBBDD = emojisBBDD.find(emoji => 
                    emoji.palabra === item.producto || 
                    emoji.palabrasReferencia?.includes(item.producto)
                );
                
                // Mapeo manual completo de emojis para productos
                const emojisManual = {
                    'MANZANA': '🍎', 'BANANA': '🍌', 'PERA': '🍐', 'UVA': '🍇',
                    'PIÑA': '🍍', 'LIMÓN': '🍋', 'LIMON': '🍋', 'MELÓN': '🍈', 'MELON': '🍈',
                    'SANDÍA': '🍉', 'SANDIA': '🍉', 'FRESA': '🍓', 'NARANJA': '🍊',
                    'DURAZNO': '🍑', 'CEREZA': '🍒', 'PAPA': '🥔', 'PAN': '🍞',
                    'LECHE': '🥛', 'HUEVO': '🥚', 'TOMATE': '🍅', 'QUESO': '🧀',
                    'ZANAHORIA': '🥕', 'LECHUGA': '🥬', 'BRÓCOLI': '🥦', 'BROCOLI': '🥦',
                    'APIO': '🥬', 'CEBOLLA': '🧅', 'AJO': '🧄', 'CALABAZA': '🎃',
                    'CHOCLO': '🌽', 'ARVEJA': '🟢', 'ESPINACA': '🥬', 'POLLO': '🍗',
                    'CARNE': '🥩', 'JAMÓN': '🥓', 'JAMON': '🥓', 'ATÚN': '🐟', 'ATUN': '🐟',
                    'PESCADO': '🐟', 'ARROZ': '🍚', 'PASTA': '🍝', 'YOGUR': '🥛',
                    'MANTECA': '🧈', 'POROTO': '🫘', 'LENTEJAS': '🫛', 'NUEZ': '🥜',
                    'ALMENDRA': '🥜', 'AVENA': '🥣', 'CEREAL': '🥣', 'MIEL': '🍯',
                    'ACEITE': '🫒', 'SAL': '🧂', 'AZÚCAR': '🍯', 'AZUCAR': '🍯',
                    'CAFÉ': '☕', 'CAFE': '☕', 'TÉ': '🍵', 'TE': '🍵',
                    'HAMBURGUESA': '🍔', 'PIZZA': '🍕', 'HELADO': '🍦',
                    'DONA': '🍩', 'GALLETA': '🍪', 'PASTEL': '🎂', 'SOPA': '🍲'
                };
                
                // Priorizar mapeo manual, luego base de datos, luego fallback genérico
                const emojiFinal = emojisManual[item.producto] || 
                                   productoEnBBDD?.emoji || 
                                   '🥫'; // Fallback genérico de comida
                
                console.log(`🎯 Emoji asignado para ${item.producto}: ${emojiFinal}`);
                
                return {
                    producto: item.producto,
                    cantidad: Math.min(item.cantidad, config.maxCantidad),
                    emoji: emojiFinal,
                    palabra: item.producto
                };
            });
        } else {
            throw new Error(`IA generó solo ${productos.length} productos, se requieren ${cantidadRequerida}`);
        }
        
    } catch (error) {
        console.error("⚠️ Error procesando respuesta de IA:", error);
        throw error;
    }
}

function generarActividadFallback() {
    console.log("🔄 Generando actividad Supermercado con fallback");
    
    const config = obtenerConfiguracionSupermercado();
    const cantidadRequerida = config.maxProductos;
    
    // 20 productos diferentes para fallback aleatorio
    const productosFallback = [
        { producto: 'MANZANA', emoji: '🍎' },
        { producto: 'BANANA', emoji: '🍌' },
        { producto: 'PERA', emoji: '🍐' },
        { producto: 'UVA', emoji: '🍇' },
        { producto: 'NARANJA', emoji: '🍊' },
        { producto: 'FRESA', emoji: '🍓' },
        { producto: 'LECHE', emoji: '🥛' },
        { producto: 'PAN', emoji: '🍞' },
        { producto: 'QUESO', emoji: '🧀' },
        { producto: 'HUEVO', emoji: '🥚' },
        { producto: 'TOMATE', emoji: '🍅' },
        { producto: 'ZANAHORIA', emoji: '🥕' },
        { producto: 'PAPA', emoji: '🥔' },
        { producto: 'LECHUGA', emoji: '🥬' },
        { producto: 'ARROZ', emoji: '🍚' },
        { producto: 'PASTA', emoji: '🍝' },
        { producto: 'POLLO', emoji: '🍗' },
        { producto: 'CARNE', emoji: '🥩' },
        { producto: 'YOGUR', emoji: '🥛' },
        { producto: 'ACEITE', emoji: '🫒' }
    ];
    
    // Seleccionar productos aleatorios
    const productosSeleccionados = productosFallback
        .sort(() => Math.random() - 0.5)
        .slice(0, cantidadRequerida)
        .map(item => ({
            ...item,
            cantidad: Math.floor(Math.random() * config.maxCantidad) + 1,
            palabra: item.producto
        }));
    
    // GUARDAR productos fallback
    actividadSupermercado.productosGenerados = productosSeleccionados;
    actividadSupermercado.configuracion = config;
    
    console.log("💾 Productos fallback guardados localmente:", actividadSupermercado.productosGenerados);
    
    return {
        tipo: "supermercado",
        productos: actividadSupermercado.productosGenerados,
        configuracion: config,
        instrucciones: "Ayúdame a encontrar todo en la lista de compras",
        esFallback: true
    };
}

// ==================== RENDERIZACIÓN ====================

export async function renderizar() {
    console.log("🛒 EJECUTANDO renderizar()");
    console.log("🎨 Renderizando actividad Supermercado...");
    
    // 🔧 CAMBIO 1: Contenedor correcto para flujo secuencial
    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (!actividadesEl) {
        console.error("⚠️ Elemento de actividades no encontrado");
        throw new Error("Contenedor de actividades no encontrado");
    }
    
    actividadesEl.innerHTML = '';
    const htmlJuego = generarHTMLJuego();
    actividadesEl.innerHTML = htmlJuego;
    configurarEventos();
    
    console.log("✅ Actividad Supermercado renderizada correctamente");
}

function generarHTMLJuego() {
    return `
        <div id="supermercado-game">
            <div id="pantalla-inicio-super">
                <div class="titulo-game-super">
                    <h1>🛒 AVENTURA EN EL SUPERMERCADO</h1>
                    <div class="subtitulo-super">¡VAMOS DE COMPRAS! AYÚDAME A ENCONTRAR TODO EN LA LISTA.</div>
                </div>
            </div>
            
            <div class="contenedor-principal-super" style="display: none;">
                <div id="lista-completa">
                    <h2>LISTA DE COMPRAS</h2>
                    <ul id="lista-items"></ul>
                </div>

                <div class="juego-area-central">
                    <div id="zona-superior">
                        <div id="mensaje-ia"></div>
                    </div>
                    <div id="zona-supermercado"></div>
                    <div id="carrito-container">
                        <div id="carrito-emoji" class="carrito-emoji">🛒</div>
                        <div id="carrito-contador" class="carrito-contador">0 / 0</div>
                    </div>
                </div>
            </div>
            
            
            <!-- ✅ BOTÓN SIGUIENTE JUEGO -->
            <button id="boton-siguiente-juego-super" style="
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
            <!-- 🎉 VENTANA EMERGENTE FINAL -->
            <div id="overlay-fondo-super"></div>
            <div id="mensaje-feedback-super">
                PREPARANDO MENSAJE FINAL...
                <button id="boton-siguiente-super">SIGUIENTE</button>
            </div>

            <!-- 🧮 VENTANA EMERGENTE DE SUMA MEJORADA -->
            <div id="overlay-suma-super" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(59, 130, 246, 0.3)); backdrop-filter: blur(8px); z-index: 1001;"></div>
            <div id="ventana-suma-super" style="
                display: none;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                z-index: 1002;
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05);
                border: 3px solid transparent;
                background-clip: padding-box;
                width: 85%;
                max-width: 420px;
                padding: 30px 25px;
                border-radius: 25px;
                text-align: center;
                animation: modalEntrada 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            ">
                <div class="contenido-suma">
                    <div class="icono-suma-container" style="margin-bottom: 25px;">
                        <div style="
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #22c55e, #16a34a);
                            border-radius: 50%;
                            font-size: 2.5em;
                            box-shadow: 0 10px 25px rgba(34, 197, 94, 0.3);
                            animation: pulsoSuave 2s infinite ease-in-out;
                        ">🧮</div>
                    </div>
                    
                    <h2 style="
                        color: #1f2937; 
                        font-size: 1.6em; 
                        margin-bottom: 15px; 
                        font-weight: 800;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        background: linear-gradient(135deg, #1f2937, #374151);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    ">CONTEMOS JUNTOS</h2>
                    
                    <p style="
                        color: #6b7280;
                        font-size: 1.1em;
                        margin-bottom: 30px;
                        font-weight: 600;
                        line-height: 1.4;
                    ">¿CUÁNTOS PRODUCTOS COMPRAMOS EN TOTAL?</p>
                    
                    <div class="input-container" style="position: relative; margin: 25px 0;">
                        <input type="text" id="input-suma" placeholder="ESCRIBÍ EL NÚMERO ACÁ" maxlength="3" style="
                            font-size: 1.8em;
                            padding: 15px 20px;
                            border: 3px solid #e5e7eb;
                            border-radius: 15px;
                            text-align: center;
                            width: 150px;
                            background: linear-gradient(135deg, #ffffff, #f9fafb);
                            color: #1f2937;
                            font-weight: bold;
                            box-shadow: inset 0 2px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.1);
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            outline: none;
                        ">
                    </div>
                    
                    <div class="botones-suma" style="margin: 30px 0;">
                        <button id="boton-confirmar-suma" style="
                            font-family: 'Inter', 'Segoe UI', sans-serif;
                            font-size: 1.2em;
                            font-weight: 700;
                            padding: 15px 35px;
                            border: none;
                            background: linear-gradient(135deg, #22c55e, #16a34a);
                            color: white;
                            border-radius: 50px;
                            cursor: pointer;
                            box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4), 0 3px 10px rgba(0, 0, 0, 0.1);
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            position: relative;
                            overflow: hidden;
                        ">
                            <span style="position: relative; z-index: 1;">CONFIRMAR</span>
                        </button>
                    </div>
                    
                    <div id="mensaje-suma" style="
                        font-size: 1.1em;
                        font-weight: 600;
                        margin-top: 20px;
                        min-height: 30px;
                        color: #374151;
                        transition: all 0.3s ease;
                        padding: 10px;
                        border-radius: 10px;
                    "></div>
                </div>
            </div>
        </div>
        
        <style>
            :root {
                --color-fondo-super: #fefce8;
                --color-texto-super: #78350f;
                --color-acento1-super: #22c55e;
                --color-acento2-super: #f97316;
                --color-sombra-super: rgba(120, 53, 15, 0.2);
            }

            @keyframes fadeInSuper {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }

            @keyframes shakeSuper {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }

            @keyframes modalEntrada {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8) rotateY(20deg);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) rotateY(0deg);
                }
            }

            @keyframes pulsoSuave {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            #supermercado-game {
                font-family: 'Poppins', sans-serif;
                background-color: var(--color-fondo-super);
                background-image: url('img/fondo-supermercado.png');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                color: var(--color-texto-super);
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
                text-transform: uppercase;
            }

            #input-suma:focus {
                border-color: #22c55e !important;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.06), 0 0 0 3px rgba(34, 197, 94, 0.1), 0 4px 12px rgba(0,0,0,0.1) !important;
                transform: scale(1.02);
            }

            #boton-confirmar-suma:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(34, 197, 94, 0.5), 0 5px 15px rgba(0, 0, 0, 0.2);
            }

            #boton-confirmar-suma:active {
                transform: translateY(0);
                box-shadow: 0 5px 15px rgba(34, 197, 94, 0.3);
            }

            #boton-confirmar-suma::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s;
            }

            #boton-confirmar-suma:hover::before {
                left: 100%;
            }

            #pantalla-inicio-super {
                display: block;
                padding: 40px 20px;
                background-color: rgba(254, 252, 232, 0.05);
                border-radius: 20px;
                box-shadow: 0 10px 30px var(--color-sombra-super);
                text-align: center;
                animation: fadeInSuper 0.5s ease-out;
            }

            .titulo-game-super {
                background-color: rgba(254, 252, 232, 0.9);
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 5px 15px var(--color-sombra-super);
                border: 2px solid rgba(120, 53, 15, 0.3);
            }

            .titulo-game-super h1 {
                font-size: 2.8em;
                margin: 0 0 15px 0;
                color: var(--color-texto-super);
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            }

            .subtitulo-super {
                font-size: 1.4em;
                color: var(--color-acento2-super);
                margin-bottom: 20px;
                font-weight: 600;
            }

            .contenedor-principal-super {
                width: 100%;
                max-width: 950px;
                height: 90vh;
                max-height: 700px;
                background: rgba(254, 252, 232, 0.1);
                border-radius: 20px;
                box-shadow: 0 10px 30px var(--color-sombra-super);
                display: flex;
                position: relative;
                overflow: hidden;
                padding: 20px;
                box-sizing: border-box;
            }
            
            #lista-completa {
                position: absolute;
                left: 20px;
                top: 50%;
                transform: translateY(-50%);
                background-color: rgba(255, 255, 255, 0.95);
                padding: 15px;
                border-radius: 15px;
                box-shadow: 0 5px 15px var(--color-sombra-super);
                text-align: left;
                width: 180px;
                z-index: 10;
                border: 2px solid rgba(120, 53, 15, 0.2);
            }

            #lista-completa h2 {
                margin: 0 0 10px 0;
                font-size: 1.1em;
                text-align: center;
                border-bottom: 2px solid #fef3c7;
                padding-bottom: 5px;
                color: var(--color-texto-super);
            }

            #lista-completa ul {
                list-style: none;
                margin: 0;
                padding: 0;
                font-size: 1em;
            }

            #lista-completa li {
                margin-bottom: 8px;
                opacity: 1;
                transition: opacity 0.5s;
                color: var(--color-texto-super);
            }

            #lista-completa li.completado {
                opacity: 0.4;
                text-decoration: line-through;
            }

            .juego-area-central {
                margin-left: 200px;
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            
            #zona-superior {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                margin-bottom: 20px;
                min-height: 90px;
            }
            
            #mensaje-ia {
                font-size: 1.2em;
                font-weight: 700;
                max-width: 500px;
                text-align: center;
                color: var(--color-texto-super);
                background-color: rgba(255, 255, 255, 0.85);
                padding: 10px 20px;
                border-radius: 15px;
                box-shadow: 0 2px 8px var(--color-sombra-super);
            }
            
            #zona-supermercado {
                background-color: rgba(253, 230, 138, 0.8);
                border-radius: 20px;
                padding: 20px;
                display: flex;
                justify-content: space-around;
                align-items: center;
                min-height: 180px;
                box-shadow: inset 0 4px 10px rgba(0,0,0,0.1);
                flex: 1;
                border: 2px solid rgba(120, 53, 15, 0.3);
            }

            .estante { 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
            }

            .producto {
                font-size: 3.5em;
                cursor: pointer;
                transition: transform 0.2s;
                padding: 8px;
                border-radius: 10px;
                background-color: rgba(255,255,255,0.9);
                margin: 5px;
                box-shadow: 0 2px 8px var(--color-sombra-super);
                border: 2px solid rgba(120, 53, 15, 0.2);
            }

            .producto:hover { 
                transform: scale(1.15);
                background-color: rgba(255,255,255,0.95);
                box-shadow: 0 4px 12px var(--color-sombra-super);
            }

            .producto.shake { 
                animation: shakeSuper 0.3s; 
            }

            .producto-clon { 
                position: absolute; 
                z-index: 100; 
                font-size: 3.5em; 
                transition: all 0.6s ease-in; 
                pointer-events: none;
            }
            
            #carrito-container {
                margin-top: 15px;
                display: flex;
                justify-content: center;
                align-items: flex-end;
                gap: 20px;
            }

            .carrito-emoji { 
                font-size: 7em; 
            }

            .carrito-contador {
                font-size: 1.8em;
                background-color: rgba(255, 255, 255, 0.95);
                padding: 8px 18px;
                border-radius: 10px;
                box-shadow: 0 5px 15px var(--color-sombra-super);
                font-weight: 700;
                color: var(--color-texto-super);
                border: 2px solid rgba(120, 53, 15, 0.3);
            }

            /* 🎉 ESTILOS PARA VENTANA EMERGENTE FINAL - TAMAÑO CORREGIDO */
            #mensaje-feedback-super {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1000;
                background-color: rgba(255, 255, 255, 0.98);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                border: 3px solid var(--color-acento1-super);
                width: 85%;
                max-width: 380px;
                padding: 25px;
                border-radius: 20px;
                text-align: center;
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: var(--color-texto-super);
                font-size: 1.1em;
                font-weight: bold;
            }

            #boton-siguiente-super {
                font-family: 'Arial', sans-serif;
                font-size: 1.1em;
                font-weight: 700;
                padding: 15px 30px;
                border: none;
                background-color: var(--color-acento2-super);
                color: white;
                border-radius: 50px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
                transition: transform 0.2s, box-shadow 0.2s;
                margin-top: 15px;
                display: none;
            }

            #boton-siguiente-super:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 16px rgba(249, 115, 22, 0.5);
            }

            #overlay-fondo-super {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 999;
                display: none;
            }

            @media (max-width: 800px) {
                .contenedor-principal-super {
                    flex-direction: column;
                    padding: 10px;
                }
                
                #lista-completa {
                    position: relative;
                    left: 0;
                    top: 0;
                    transform: none;
                    width: 100%;
                    margin-bottom: 15px;
                }
                
                .juego-area-central {
                    margin-left: 0;
                }
                
                #zona-supermercado {
                    min-height: 120px;
                }
                
                .producto {
                    font-size: 2.5em;
                }
                
                .carrito-emoji {
                    font-size: 4em;
                }

                #ventana-suma-super {
                    width: 95% !important;
                    max-width: 350px !important;
                    padding: 25px 15px !important;
                }

                #mensaje-feedback-super {
                    width: 95% !important;
                    max-width: 320px !important;
                    padding: 20px !important;
                    font-size: 1em !important;
                }
            }
        </style>
    `;
}

// ==================== CONFIGURACIÓN DE EVENTOS ====================

function configurarEventos() {
    console.log("🎮 Configurando eventos de Supermercado...");
    
    
    // Configurar botón SIGUIENTE
    const botonSiguienteJuego = document.getElementById('boton-siguiente-juego-super');
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
            console.log('🎯 Botón SIGUIENTE presionado en Supermercado');
            
            // Detener audio
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            
            try {
                console.log('➡️ Cargando Puente de Palabras...');
                
                estadoGlobal.actividadActual = 'puente-palabras';
                
                const moduloPuente = await import('./activity-puente-palabras.js');
                
                if (moduloPuente.generarActividad) {
                    await moduloPuente.generarActividad();
                }
                
                if (moduloPuente.renderizar) {
                    await moduloPuente.renderizar();
                }
                
                console.log('✅ Puente de Palabras cargado correctamente');
                
            } catch (error) {
                console.error('❌ Error al cargar siguiente juego:', error);
            }
        });
    }
    // 🔧 PANTALLA INICIAL MEJORADA: Esperar hasta que termine la introducción específica
    // Iniciar el saludo inmediatamente cuando se renderiza
    setTimeout(() => {
        iniciarJuego();
    }, 500);
}

// ==================== LÓGICA DEL JUEGO ====================

function iniciarJuego() {
    console.log("🛒 Iniciando Aventura en el Supermercado...");
    
    // 🔧 CAMBIO 2: Saludo específico para tercer juego con ARGENTINISMO CORRECTO
    const nombreAlumno = datosSession?.nombreAlumno || estadoGlobal.datosSession?.nombre || 'ESTUDIANTE';
    const saludo = `PERFECTO ${nombreAlumno.toUpperCase()}! AHORA VAMOS A TOMARNOS UN RECREO PARA IR AL SUPERMERCADO A COMPRAR UNAS COSAS. ¡AYÚDAME A ENCONTRAR TODO EN LA LISTA! PARA COMPRAR CADA PRODUCTO TENÉS QUE HACER CLIC SOBRE ÉL.`;
    
    // 🔧 MEJORA: Pantalla inicial permanece hasta que termina la introducción completa
    dictarFrase(saludo, () => {
        // Solo cuando termina toda la introducción, cambiar pantalla
        const pantallaInicial = document.getElementById('pantalla-inicio-super');
        const contenedorPrincipal = document.querySelector('.contenedor-principal-super');
        
        if (pantallaInicial && contenedorPrincipal) {
            console.log("✅ Introducción terminada, cambiando a pantalla del juego...");
            pantallaInicial.style.display = 'none';
            contenedorPrincipal.style.display = 'flex';
            prepararNuevaRonda();
        }
    });
}

function prepararNuevaRonda() {
    console.log("📊 Productos desde variable local:", actividadSupermercado.productosGenerados);
    
    if (actividadSupermercado.productosGenerados.length === 0) {
        console.error("⚠️ No hay productos para el juego");
        mostrarVentanaEmergenteFinal("ERROR: NO SE PUDIERON CARGAR LOS PRODUCTOS");
        return;
    }
    
    // Usar los productos generados
    actividadSupermercado.listaDeLaRonda = actividadSupermercado.productosGenerados.map(item => ({
        item: {
            emoji: item.emoji,
            palabra: item.palabra
        },
        cantidad: item.cantidad
    }));
    
    // DEBUG: Verificar la lista generada
    console.log("🔍 DEBUG - Lista completa de compras:");
    actividadSupermercado.listaDeLaRonda.forEach((mision, index) => {
        console.log(`   ${index + 1}. ${mision.cantidad} ${mision.item.palabra} ${mision.item.emoji}`);
    });
    console.log(`📊 Total productos en lista: ${actividadSupermercado.listaDeLaRonda.length}`);
    console.log(`🔍 Producto actual: ${actividadSupermercado.itemActualIndex + 1}`);
    
    // Limpiar y configurar UI
    const listaItemsUl = document.getElementById('lista-items');
    
    if (listaItemsUl) listaItemsUl.innerHTML = '';
    
    // Mostrar lista de compras (SIN EMOJIS - solo número y nombre)
    actividadSupermercado.listaDeLaRonda.forEach((mision, index) => {
        if (listaItemsUl) {
            const li = document.createElement('li');
            li.id = `lista-item-${index}`;
            li.innerHTML = `<span>${mision.cantidad}</span> ${pluralizar(mision.item.palabra, mision.cantidad)}`;
            listaItemsUl.appendChild(li);
        }
    });

    // Resetear índices
    actividadSupermercado.itemActualIndex = 0;
    actividadSupermercado.itemsRecolectados = 0;
    
    presentarSiguienteItem();
}

function presentarSiguienteItem(callback = null) {
    // Liberar bloqueo inmediatamente al iniciar nuevo producto
    actividadSupermercado.bloqueado = false;
    
    console.log(`🔄 Verificando progreso: ${actividadSupermercado.itemActualIndex}/${actividadSupermercado.listaDeLaRonda.length}`);
    
    // VERIFICACIÓN CORREGIDA: Solo finalizar si realmente completó TODOS los productos
    if (actividadSupermercado.itemActualIndex >= actividadSupermercado.listaDeLaRonda.length) {
        console.log("🎉 ¡Misión cumplida! Todos los productos de la lista han sido recolectados.");
        
        const despedida = "¡MISIÓN CUMPLIDA! SOS UN EXCELENTE AYUDANTE DE COMPRAS.";
        
        const mensajeIa = document.getElementById('mensaje-ia');
        if (mensajeIa) mensajeIa.textContent = "¡COMPRA FINALIZADA!";
        
        dictarFrase(despedida, () => {
            setTimeout(() => {
                console.log("🧮 DEBUG: Intentando mostrar ventana de suma...");
                mostrarVentanaSuma();
            }, 1000);
        });
        return;
    }

    // Obtener el producto actual de la lista
    const mision = actividadSupermercado.listaDeLaRonda[actividadSupermercado.itemActualIndex];
    
    // RESETEAR contador para el nuevo producto
    actividadSupermercado.itemsRecolectados = 0;
    
    console.log(`🛒 Presentando producto ${actividadSupermercado.itemActualIndex + 1}: ${mision.cantidad} ${mision.item.palabra}`);
    
    // Actualizar contador del carrito para el nuevo producto
    const carritoContador = document.getElementById('carrito-contador');
    if (carritoContador) carritoContador.textContent = `0 / ${mision.cantidad}`;
    
    // 🔧 SOLO EJECUTAR INSTRUCCIONES DE VOZ SI ES EL PRIMER PRODUCTO
    // Los demás productos ya tienen su mensaje dicho desde animarProductoAlCarrito()
    if (actividadSupermercado.itemActualIndex === 0) {
        const palabraPlural = pluralizar(mision.item.palabra, mision.cantidad);
        const instruccion = `¡VAMOS A BUSCAR! NECESITAMOS ${mision.cantidad} ${palabraPlural}.`;
        
        const mensajeIa = document.getElementById('mensaje-ia');
        if (mensajeIa) mensajeIa.textContent = instruccion;
        
        dictarFrase(instruccion);
    }
    // Para productos 2, 3, etc. NO decir nada porque ya se dijo en animarProductoAlCarrito()
    
    // Resetear estado de todos los productos al cambiar de producto
    setTimeout(() => {
        document.querySelectorAll('.producto').forEach(producto => {
            producto.dataset.procesando = 'false';
        });
    }, 100);
    
    // Configurar productos en el supermercado para el nuevo producto
    configurarProductosEnSupermercado(mision);
    
    // 🔧 EJECUTAR CALLBACK DESPUÉS DE QUE SE CONFIGUREN LOS PRODUCTOS VISUALMENTE
    if (callback) {
        setTimeout(callback, 300); // Esperar un poco para que se rendericen los productos
    }
}

// 🔧 FUNCIÓN AGREGADA PARA CAMBIAR PRODUCTOS SIN VOZ
function presentarSiguienteItemSinVoz(callback = null) {
    // Esta función solo configura productos visualmente SIN decir nada
    
    // Liberar bloqueo inmediatamente
    actividadSupermercado.bloqueado = false;
    
    // Obtener el producto actual de la lista
    const mision = actividadSupermercado.listaDeLaRonda[actividadSupermercado.itemActualIndex];
    
    // RESETEAR contador para el nuevo producto
    actividadSupermercado.itemsRecolectados = 0;
    
    console.log(`🛒 Configurando visualmente producto ${actividadSupermercado.itemActualIndex + 1}: ${mision.cantidad} ${mision.item.palabra}`);
    
    // Actualizar contador del carrito para el nuevo producto
    const carritoContador = document.getElementById('carrito-contador');
    if (carritoContador) carritoContador.textContent = `0 / ${mision.cantidad}`;
    
    // Resetear estado de todos los productos al cambiar de producto
    setTimeout(() => {
        document.querySelectorAll('.producto').forEach(producto => {
            producto.dataset.procesando = 'false';
        });
    }, 100);
    
    // Configurar productos en el supermercado para el nuevo producto
    configurarProductosEnSupermercado(mision);
    
    // 🔧 EJECUTAR CALLBACK DESPUÉS DE QUE SE CONFIGUREN LOS PRODUCTOS VISUALMENTE
    if (callback) {
        setTimeout(callback, 800); // Tiempo suficiente para que se rendericen los productos
    }
}

function configurarProductosEnSupermercado(mision) {
    const zonaSupermercado = document.getElementById('zona-supermercado');
    if (!zonaSupermercado) return;
    
    zonaSupermercado.innerHTML = '';
    
    // Conseguir productos de la base de datos para mostrar
    const productosDisponibles = emojisBBDD.filter(p => ALIMENTOS_VALIDOS.includes(p.palabra));
    
    // Crear array con el producto correcto + 2 incorrectos
    const productosAMostrar = [mision.item];
    
    // Agregar productos incorrectos
    const incorrectos = productosDisponibles
        .filter(p => p.palabra !== mision.item.palabra)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
    
    productosAMostrar.push(...incorrectos);
    
    // Mezclar orden
    productosAMostrar.sort(() => Math.random() - 0.5);
    
    // Crear elementos DOM
    productosAMostrar.forEach(producto => {
        const estante = document.createElement('div');
        estante.className = 'estante';
        
        const p = document.createElement('div');
        p.className = 'producto';
        p.textContent = producto.emoji;
        p.dataset.palabra = producto.palabra;
        p.dataset.procesando = 'false'; // Inicializar en false
        
        estante.appendChild(p);
        zonaSupermercado.appendChild(estante);
        
        p.addEventListener('click', () => recolectarItem(p));
    });
    
    console.log(`🪛 Supermercado configurado para: ${mision.item.palabra} (necesita ${mision.cantidad})`);
}

function recolectarItem(elementoProducto) {
    // Solo prevenir doble clic del MISMO elemento, no bloquear toda la interfaz
    if (elementoProducto.dataset.procesando === 'true') {
        console.log("🚫 Clic bloqueado - este producto ya está procesando");
        return;
    }
    
    // Solo marcar ESTE producto como procesando temporalmente
    elementoProducto.dataset.procesando = 'true';
    
    const mision = actividadSupermercado.listaDeLaRonda[actividadSupermercado.itemActualIndex];
    const palabraProducto = elementoProducto.dataset.palabra;
    const palabraPlural = pluralizar(mision.item.palabra, mision.cantidad);

    const esCorrecta = palabraProducto === mision.item.palabra;

    if (!esCorrecta) {
        // Producto incorrecto - liberar rápidamente para permitir nuevo intento
        elementoProducto.classList.add('shake');
        dictarFrase("ESO NO ESTÁ EN LA LISTA.");
        setTimeout(() => {
            elementoProducto.classList.remove('shake');
            elementoProducto.dataset.procesando = 'false'; // Liberar rápido
        }, 300);
        return;
    }

    if (actividadSupermercado.itemsRecolectados >= mision.cantidad) {
        // Ya tiene suficientes - liberar rápidamente
        elementoProducto.classList.add('shake');
        dictarFrase(`¡CUIDADO! LA LISTA SOLO PIDE ${mision.cantidad}. YA TENEMOS SUFICIENTES.`);
        setTimeout(() => {
            elementoProducto.classList.remove('shake');
            elementoProducto.dataset.procesando = 'false'; // Liberar rápido
        }, 300);
        return;
    }
    
    // Producto correcto - NO bloquear toda la interfaz inmediatamente
    // Solo animar y permitir más clics del mismo producto
    animarProductoAlCarrito(elementoProducto, mision, palabraPlural);
}

// 🔧 FUNCIÓN CORREGIDA CON TODOS LOS CAMBIOS
function animarProductoAlCarrito(elementoProducto, mision, palabraPlural) {
    const carritoEmoji = document.getElementById('carrito-emoji');
    const carritoContador = document.getElementById('carrito-contador');
    
    if (!carritoEmoji) return;
    
    // Liberar inmediatamente este producto para permitir clics rápidos
    setTimeout(() => {
        elementoProducto.dataset.procesando = 'false';
    }, 50); // Muy rápido: 50ms en lugar de 300ms
    
    // Crear clon para animación
    const clon = elementoProducto.cloneNode(true);
    clon.classList.add('producto-clon');
    document.body.appendChild(clon);
    
    const rect = elementoProducto.getBoundingClientRect();
    const carritoRect = carritoEmoji.getBoundingClientRect();
    
    const destinoX = carritoRect.left + (carritoRect.width / 2) - (rect.width / 2);
    const destinoY = carritoRect.top + (carritoRect.height / 2) - (rect.height / 2);

    clon.style.left = `${rect.left}px`;
    clon.style.top = `${rect.top}px`;
    
    // Animación más rápida para permitir clics seguidos
    setTimeout(() => {
        clon.style.left = `${destinoX}px`;
        clon.style.top = `${destinoY}px`;
        clon.style.transform = 'scale(0.2)';
        clon.style.opacity = '0';
    }, 10);

    // Incrementar contador
    actividadSupermercado.itemsRecolectados++;
    
    if (carritoContador) {
        carritoContador.textContent = `${actividadSupermercado.itemsRecolectados} / ${mision.cantidad}`;
    }
    
    // 🔧 SOLO DECIR EL NÚMERO al recolectar (CAMBIO SOLICITADO)
    dictarFrase(String(actividadSupermercado.itemsRecolectados));
    
    // Limpiar animación rápidamente
    setTimeout(() => {
        if (clon.parentNode) {
            clon.remove();
        }
    }, 150); // Reducido de 300ms a 150ms
    
    // Verificar completación sin bloquear
    if (actividadSupermercado.itemsRecolectados >= mision.cantidad) {
        // AHORA SÍ: Bloquear cuando realmente complete el producto
        actividadSupermercado.bloqueado = true;
        
        // Marcar como completado en la lista
        const listaItem = document.getElementById(`lista-item-${actividadSupermercado.itemActualIndex}`);
        if (listaItem) listaItem.classList.add('completado');
        
        // 🔧 LÓGICA CORREGIDA PARA DETECTAR ÚLTIMO PRODUCTO
        const siguienteIndex = actividadSupermercado.itemActualIndex + 1;
        const esUltimoProducto = siguienteIndex >= actividadSupermercado.listaDeLaRonda.length;
        
        let mensajeCompletacion;
        if (esUltimoProducto) {
            // ✅ ÚLTIMO PRODUCTO: Solo "¡Genial!"
            mensajeCompletacion = "¡GENIAL!";
        } else if (actividadSupermercado.itemActualIndex === 0) {
            // Primer producto completado
            mensajeCompletacion = "GENIAL, SIGAMOS DE COMPRAS.";
        } else {
            // Productos intermedios
            mensajeCompletacion = "GENIAL, SIGAMOS BUSCANDO.";
        }
        
        // Mostrar mensaje de completación
        const mensajeIa = document.getElementById('mensaje-ia');
        if (mensajeIa) {
            mensajeIa.textContent = mensajeCompletacion.toUpperCase();
        }
        
        dictarFrase(mensajeCompletacion, () => {
            if (esUltimoProducto) {
                // ✅ ÚLTIMO PRODUCTO: Ir directo a finalización
                actividadSupermercado.itemActualIndex++;
                setTimeout(() => presentarSiguienteItem(), 1000);
            } else {
                // ✅ HAY SIGUIENTE PRODUCTO: Cambiar visual PRIMERO, luego mensaje
                const siguienteMision = actividadSupermercado.listaDeLaRonda[siguienteIndex];
                const siguientePalabraPlural = pluralizar(siguienteMision.item.palabra, siguienteMision.cantidad);
                const mensajeBusqueda = `AHORA VAMOS A BUSCAR ${siguienteMision.cantidad} ${siguientePalabraPlural}.`;
                
                // Incrementar índice
                actividadSupermercado.itemActualIndex++;
                
                // ✅ CAMBIAR PRODUCTOS VISUALMENTE PRIMERO (SIN VOZ)
                presentarSiguienteItemSinVoz(() => {
                    // ✅ DESPUÉS DEL CAMBIO VISUAL, DECIR EL MENSAJE
                    const mensajeIa = document.getElementById('mensaje-ia');
                    if (mensajeIa) {
                        mensajeIa.textContent = `AHORA VAMOS A BUSCAR ${siguienteMision.cantidad} ${siguientePalabraPlural.toUpperCase()}.`;
                    }
                    
                    dictarFrase(mensajeBusqueda);
                });
            }
        });
    }
}

// ==================== NUEVA FUNCIONALIDAD: VENTANA DE SUMA ====================

function mostrarVentanaSuma() {
    console.log("🧮 Mostrando ventana de suma...");
    
    // Calcular la respuesta correcta (suma total de productos)
    let totalProductos = 0;
    actividadSupermercado.listaDeLaRonda.forEach(mision => {
        totalProductos += mision.cantidad;
    });
    
    // Guardar datos de la pregunta
    actividadSupermercado.preguntaSuma.respuestaCorrecta = totalProductos;
    actividadSupermercado.preguntaSuma.intentosRealizados = 0;
    actividadSupermercado.preguntaSuma.enProceso = true;
    
    console.log(`🧮 Respuesta correcta: ${totalProductos} productos`);
    
    // Mostrar ventana y overlay
    const overlay = document.getElementById('overlay-suma-super');
    const ventanaSuma = document.getElementById('ventana-suma-super');
    
    if (overlay && ventanaSuma) {
        overlay.style.display = 'block';
        ventanaSuma.style.display = 'block';
        
        // Crear lista de compras para referencia con TAMAÑO CORREGIDO
        let listaComprasHTML = `
            <div style="
                background: rgba(34, 197, 94, 0.1);
                border: 2px solid rgba(34, 197, 94, 0.3);
                border-radius: 12px;
                padding: 12px;
                margin: 15px 0;
                text-align: left;
                font-size: 0.85em;
                max-height: 140px;
                overflow-y: auto;
            ">
                <div style="
                    font-weight: bold;
                    color: #059669;
                    margin-bottom: 6px;
                    text-align: center;
                    font-size: 0.95em;
                ">🔍 LISTA DE COMPRAS</div>
                <div style="color: #047857;">
        `;
        
        // Agregar cada producto a la lista
        actividadSupermercado.listaDeLaRonda.forEach((mision, index) => {
            const palabraPlural = pluralizar(mision.item.palabra, mision.cantidad);
            listaComprasHTML += `
                <div style="margin: 3px 0; display: flex; justify-content: space-between; align-items: center; font-size: 0.9em;">
                    <span>${mision.item.emoji} ${mision.cantidad} ${palabraPlural}</span>
                    <span style="
                        background: rgba(34, 197, 94, 0.2);
                        color: #065f46;
                        padding: 1px 6px;
                        border-radius: 15px;
                        font-weight: bold;
                        font-size: 0.85em;
                    ">${mision.cantidad}</span>
                </div>
            `;
        });
        
        listaComprasHTML += `
                </div>
            </div>
        `;
        
        // Actualizar el contenido de la ventana de suma incluyendo la lista
        const contenidoSuma = document.querySelector('.contenido-suma');
        if (contenidoSuma) {
            contenidoSuma.innerHTML = `
                <div class="icono-suma-container" style="margin-bottom: 20px;">
                    <div style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 70px;
                        height: 70px;
                        background: linear-gradient(135deg, #22c55e, #16a34a);
                        border-radius: 50%;
                        font-size: 2.2em;
                        box-shadow: 0 8px 20px rgba(34, 197, 94, 0.3);
                        animation: pulsoSuave 2s infinite ease-in-out;
                    ">🧮</div>
                </div>
                
                <h2 style="
                    color: #1f2937; 
                    font-size: 1.4em; 
                    margin-bottom: 12px; 
                    font-weight: 800;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">CONTEMOS JUNTOS</h2>
                
                <p style="
                    color: #6b7280;
                    font-size: 1em;
                    margin-bottom: 10px;
                    font-weight: 600;
                    line-height: 1.3;
                ">¿CUÁNTOS PRODUCTOS COMPRAMOS EN TOTAL?</p>
                
                ${listaComprasHTML}
                
                <div class="input-container" style="position: relative; margin: 20px 0;">
                    <input type="text" id="input-suma" placeholder="ESCRIBÍ EL NÚMERO ACÁ" maxlength="3" style="
                        font-size: 1.6em;
                        padding: 12px 18px;
                        border: 3px solid #e5e7eb;
                        border-radius: 12px;
                        text-align: center;
                        width: 130px;
                        background: linear-gradient(135deg, #ffffff, #f9fafb);
                        color: #1f2937;
                        font-weight: bold;
                        box-shadow: inset 0 2px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.1);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        outline: none;
                    ">
                </div>
                
                <div class="botones-suma" style="margin: 20px 0;">
                    <button id="boton-confirmar-suma" style="
                        font-family: 'Inter', 'Segoe UI', sans-serif;
                        font-size: 1.1em;
                        font-weight: 700;
                        padding: 12px 30px;
                        border: none;
                        background: linear-gradient(135deg, #22c55e, #16a34a);
                        color: white;
                        border-radius: 40px;
                        cursor: pointer;
                        box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4), 0 3px 8px rgba(0, 0, 0, 0.1);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        position: relative;
                        overflow: hidden;
                    ">
                        <span style="position: relative; z-index: 1;">CONFIRMAR</span>
                    </button>
                </div>
                
                <div id="mensaje-suma" style="
                    font-size: 1em;
                    font-weight: 600;
                    margin-top: 15px;
                    min-height: 25px;
                    color: #374151;
                    transition: all 0.3s ease;
                    padding: 8px;
                    border-radius: 8px;
                "></div>
            `;
        }
        
        // Limpiar input y mensaje
        setTimeout(() => {
            const input = document.getElementById('input-suma');
            const mensaje = document.getElementById('mensaje-suma');
            
            if (input) {
                input.value = '';
                input.focus();
            }
            if (mensaje) mensaje.textContent = '';
            
            configurarEventosSuma();
        }, 100);
        
        dictarFrase("AHORA DECIME PARA FINALIZAR, ¿CUÁNTOS PRODUCTOS COMPRAMOS EN TOTAL?");
    }
}

function configurarEventosSuma() {
    const botonConfirmar = document.getElementById('boton-confirmar-suma');
    const input = document.getElementById('input-suma');
    
    // Remover event listeners anteriores
    if (botonConfirmar) {
        botonConfirmar.replaceWith(botonConfirmar.cloneNode(true));
        const nuevoBoton = document.getElementById('boton-confirmar-suma');
        nuevoBoton.addEventListener('click', validarRespuestaSuma);
    }
    
    if (input) {
        input.replaceWith(input.cloneNode(true));
        const nuevoInput = document.getElementById('input-suma');
        
        // Enter para confirmar
        nuevoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                validarRespuestaSuma();
            }
        });
        
        // Solo permitir números
        nuevoInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        
        nuevoInput.focus();
    }
}

function validarRespuestaSuma() {
    const input = document.getElementById('input-suma');
    const mensaje = document.getElementById('mensaje-suma');
    
    if (!input || !mensaje) return;
    
    const respuestaUsuario = input.value.trim();
    const respuestaCorrecta = actividadSupermercado.preguntaSuma.respuestaCorrecta;
    
    // Validar que sea un número
    if (respuestaUsuario === '' || isNaN(respuestaUsuario)) {
        mensaje.textContent = 'TENÉS QUE ESCRIBIR UN NÚMERO';
        mensaje.style.color = '#ef4444';
        mensaje.style.background = 'rgba(239, 68, 68, 0.1)';
        dictarFrase("TENÉS QUE ESCRIBIR UN NÚMERO");
        input.focus();
        return;
    }
    
    const numeroUsuario = parseInt(respuestaUsuario);
    actividadSupermercado.preguntaSuma.intentosRealizados++;
    
    if (numeroUsuario === respuestaCorrecta) {
        // RESPUESTA CORRECTA
        mensaje.textContent = '¡GENIAL!';
        mensaje.style.color = '#22c55e';
        mensaje.style.background = 'rgba(34, 197, 94, 0.1)';
        
        dictarFrase("¡GENIAL!", () => {
            setTimeout(() => {
                cerrarVentanaSuma();
                mostrarVentanaEmergenteFinal();
            }, 1500);
        });
        
    } else {
        // RESPUESTA INCORRECTA
        if (actividadSupermercado.preguntaSuma.intentosRealizados >= actividadSupermercado.preguntaSuma.maxIntentos) {
            // Ya agotó los intentos - mostrar respuesta correcta
            mensaje.textContent = `LA RESPUESTA CORRECTA ERA ${respuestaCorrecta}`;
            mensaje.style.color = '#f97316';
            mensaje.style.background = 'rgba(249, 115, 22, 0.1)';
            
            dictarFrase(`LA CANTIDAD DE PRODUCTOS QUE COMPRASTE SON ${respuestaCorrecta}`, () => {
                setTimeout(() => {
                    cerrarVentanaSuma();
                    mostrarVentanaEmergenteFinal();
                }, 2000);
            });
            
        } else {
            // Aún tiene intentos
            mensaje.textContent = 'PROBÁ DE NUEVO';
            mensaje.style.color = '#ef4444';
            mensaje.style.background = 'rgba(239, 68, 68, 0.1)';
            input.value = '';
            
            dictarFrase("PROBÁ DE NUEVO", () => {
                input.focus();
            });
        }
    }
}

function cerrarVentanaSuma() {
    const overlay = document.getElementById('overlay-suma-super');
    const ventanaSuma = document.getElementById('ventana-suma-super');
    
    if (overlay) overlay.style.display = 'none';
    if (ventanaSuma) ventanaSuma.style.display = 'none';
    
    actividadSupermercado.preguntaSuma.enProceso = false;
}

// ==================== VENTANA EMERGENTE FINAL ====================

function mostrarVentanaEmergenteFinal(mensaje = null) {
    const nombreAlumno = datosSession?.nombreAlumno || estadoGlobal.datosSession?.nombre || 'ESTUDIANTE';
    const mensajeFinal = mensaje || `EXCELENTE ${nombreAlumno.toUpperCase()} COMPLETASTE AVENTURA EN EL SUPERMERCADO. PRESIONA SIGUIENTE PARA CONTINUAR.`;
    
    const mensajeFeedback = document.getElementById('mensaje-feedback-super');
    const overlay = document.getElementById('overlay-fondo-super');
    
    if (mensajeFeedback && overlay) {
        overlay.style.display = 'block';
        mensajeFeedback.style.display = 'flex';
        
        mensajeFeedback.innerHTML = `
            <div style="margin-bottom: 15px; font-size: 1.2em; line-height: 1.4;">${mensajeFinal}</div>
            <button id="boton-siguiente-super" style="
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
        
        // Reproducir mensaje de felicitación que coincide con el texto
        dictarFrase(mensajeFinal);
        
        const botonSiguiente = document.getElementById('boton-siguiente-super');
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
                console.log('🎉 Botón Siguiente presionado en Supermercado');
                console.log('🎉 Actividad Supermercado completada');
                // 🔧 CAMBIO AGREGADO: Detener audio antes de continuar
                if (speechSynthesis) {
                    speechSynthesis.cancel();
                }
                // 🔧 CAMBIO 3: Usar callback secuencial en lugar del original
                if (window.actividadCompletadaSecuencial) {
                    window.actividadCompletadaSecuencial();
                }
            });
        }
    }
}

// ==================== LIMPIAR RECURSOS ====================

export function limpiarRecursos() {
    console.log("🧹 Limpiando recursos de Supermercado");
    
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
    
    // Limpiar variables del juego
    actividadSupermercado = {
        tipo: 'supermercado',
        listaDeLaRonda: [],
        itemActualIndex: 0,
        itemsRecolectados: 0,
        bloqueado: false,
        completada: false,
        dominada: false,
        configuracion: {},
        productosGenerados: [],
        // Resetear variables de suma
        preguntaSuma: {
            respuestaCorrecta: 0,
            intentosRealizados: 0,
            maxIntentos: 2,
            enProceso: false
        }
    };
}

console.log("🛒 activity-supermercado.js COMPLETO Y FUNCIONAL cargado correctamente");
console.log("✅ Funcionalidades: Diseño original + Flujo secuencial + Suma educativa + Ventana emergente final + Español argentino + CAMBIOS SOLICITADOS");
