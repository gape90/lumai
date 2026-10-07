// js/activities/activity-exploradores-sonido.js - Juego de Dictado para Perfil N0
// ===============================================================================
// 🔧 MODIFICADO: SOLO 3 cambios mínimos para flujo secuencial + mejoras específicas
// ===============================================================================

import { estadoGlobal, datosSession } from '../config.js';

// ==================== CONFIGURACIÓN Y ESTADO ====================

let actividadExploradores = {
    tipo: 'exploradores-sonido',
    frases: [],
    frasesDelJuego: [],
    indiceFraseActual: 0,
    fraseActual: '',
    aciertosConsecutivos: 0,
    maxFrases: 4, // Como en el HTML original
    configuracion: {
        velocidadVoz: 0.8  // Velocidad más lenta por defecto
    },
    completada: false,
    dominada: false,
    detenida: false  // 🛑 NUEVA PROPIEDAD PARA CONTROLAR DETENCIÓN
};

// Mensajes de acierto como en el HTML original
const mensajesAcierto = [
    "MUY BIEN. SIGAMOS CON LA SIGUIENTE FRASE.",
    "FELICITACIONES, SIGAMOS ADELANTE.", 
    "EXCELENTE, VAS MUY BIEN.",
    "PERFECTO, CONTINUÁ ASÍ.",
    "¡INCREÍBLE! SIGAMOS."
];

// ==================== GENERACIÓN DE ACTIVIDAD ====================

export async function generarActividad() {
    try {
        console.log('🎯 Generando actividad Exploradores del Sonido para N0...');
        
        // Configurar frases desde la explicación generada por IA
        const frasesSeleccionadas = extraerFrasesDeExplicacion();
        
        actividadExploradores.frases = frasesSeleccionadas;
        actividadExploradores.frasesDelJuego = frasesSeleccionadas.slice(0, 4); // Máximo 4 como el original
        actividadExploradores.indiceFraseActual = 0;
        actividadExploradores.aciertosConsecutivos = 0;
        actividadExploradores.completada = false;
        actividadExploradores.dominada = false;
        actividadExploradores.detenida = false; // 🛑 RESETEAR ESTADO
        
        console.log('🎯 Frases seleccionadas:', actividadExploradores.frasesDelJuego);
        
        return actividadExploradores;
        
    } catch (error) {
        console.error('⚠️ Error generando actividad Exploradores del Sonido:', error);
        throw error;
    }
}

function extraerFrasesDeExplicacion() {
    // Obtener SOLO la explicación educativa generada por la IA (NO incluir saludos)
    let explicacion = estadoGlobal.explicacionGenerada || '';
    
    if (!explicacion.trim()) {
        console.warn('⚠️ No hay explicación generada, usando frases de respaldo');
        const tema = estadoGlobal.tema?.toUpperCase() || 'TEMA';
        return [
            `EL ${tema} ES IMPORTANTE.`,
            `APRENDEMOS SOBRE ${tema}.`,
            `ES MUY INTERESANTE ESTUDIAR.`,
            `VAMOS A SEGUIR APRENDIENDO.`
        ];
    }
    
    console.log('📖 Explicación original completa:', explicacion);
    
    // PASO 1: Limpiar HTML, emojis y caracteres especiales
    explicacion = explicacion
        .replace(/<[^>]*>/g, '') // Quitar HTML
        .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Quitar emojis
        .replace(/\*+/g, '') // Quitar asteriscos
        .replace(/[^\wÀ-ÿ\s.,!?]/gi, '') // Solo letras, números, espacios y puntuación básica
        .replace(/\s+/g, ' ') // Espacios múltiples a uno solo
        .trim();
    
    // PASO 2: Filtrar saludos y frases introductorias que NO deben ser para escribir
    const frasesAExcluir = [
        /hola\s+\w+/i,
        /bienvenido/i,
        /vamos a aprender/i,
        /comenzemos/i,
        /empezamos/i,
        /iniciamos/i,
        /te explico/i,
        /voy a explicar/i
    ];
    
    // PASO 3: Dividir en oraciones y filtrar las que no son educativas
    let oraciones = explicacion
        .split(/[.!?]+/)
        .map(oracion => oracion.trim())
        .filter(oracion => {
            // Filtrar oraciones muy cortas
            if (oracion.length < 10) return false;
            
            // Filtrar saludos y frases introductorias
            for (const patron of frasesAExcluir) {
                if (patron.test(oracion)) {
                    console.log(`🚫 Excluyendo frase introductoria: "${oracion}"`);
                    return false;
                }
            }
            
            return true;
        })
        .slice(0, 6); // Máximo 6 oraciones educativas
    
    console.log('🔍 Oraciones educativas extraídas:', oraciones);
    
    // PASO 4: Convertir a mayúsculas y agregar puntuación
    const frases = oraciones.map(oracion => {
        let frase = oracion.toUpperCase();
        if (!frase.endsWith('.') && !frase.endsWith('!') && !frase.endsWith('?')) {
            frase += '.';
        }
        return frase;
    });
    
    // PASO 5: Validar que tengamos suficientes frases educativas
    if (frases.length < 3) {
        console.warn('⚠️ Pocas frases educativas extraídas, agregando contenido del tema');
        const tema = estadoGlobal.tema?.toUpperCase() || 'ESTE TEMA';
        const frasesEducativas = [
            `EL ${tema} ES FUNDAMENTAL.`,
            `ESTUDIAMOS ${tema} EN DETALLE.`,
            `${tema} TIENE MUCHAS CARACTERÍSTICAS.`,
            `ES IMPORTANTE CONOCER ${tema}.`
        ];
        frases.push(...frasesEducativas.slice(0, 4 - frases.length));
    }
    
    console.log('✅ Frases educativas finales para escribir:', frases);
    return frases.slice(0, 4); // Máximo 4 frases como el original
}

// ==================== RENDERIZACIÓN ====================

export async function renderizar() {
    try {
        console.log('🎨 Renderizando actividad Exploradores del Sonido...');
        
        // 🔧 CAMBIO 1: Contenedor correcto para flujo secuencial
        const contenedor = estadoGlobal.elementosDOM.actividadesEl || document.getElementById('actividades');
        if (!contenedor) {
            throw new Error('No se encontró el contenedor de actividades');
        }
        
        contenedor.innerHTML = generarHTMLActividad();
        
        // Configurar eventos
        configurarEventos();
        
        // ⚡ INICIAR AUTOMÁTICAMENTE (SIN BOTÓN)
        setTimeout(() => {
            iniciarActividad();
        }, 1000); // Esperar 1 segundo para que se renderice todo
        
        console.log('✅ Actividad Exploradores del Sonido renderizada correctamente');
        
    } catch (error) {
        console.error('⚠️ Error renderizando actividad:', error);
        throw error;
    }
}

function generarHTMLActividad() {
    return `
        <div class="exploradores-sonido-container">
            <div class="background-animation"></div>
            <div class="content-overlay">
                <h1 class="exploradores-titulo">EXPLORADORES DEL SONIDO</h1>
                
                <textarea id="input-area" autofocus placeholder="ESCRIBÍ ACÁ LO QUE ESCUCHASTE..." class="exploradores-textarea"></textarea>
                
                <div class="exploradores-controles">
                    <label for="velocidad-input">VELOCIDAD:</label>
                    <input type="range" id="velocidad-input" min="0.5" max="1.5" step="0.25" value="0.8" class="velocidad-slider">
                </div>
                
                <div id="comparacion-palabras" class="comparacion-container" style="display:none;"></div>
                
                <div class="exploradores-botones">
                    <!-- ⚠️ ELIMINADO: BOTÓN COMENZAR AVENTURA -->
                    <button id="repetir-button" class="btn-explorador" style="display:none;">REPETIR</button>
                    <button id="verificar-button" class="btn-explorador" style="display:none;">VERIFICAR</button>
                    <button id="boton-siguiente-juego" class="btn-explorador" style="background-color: #f97316; display: block;">➡️ SIGUIENTE</button>
                </div>
                
                <div id="mensaje" class="exploradores-mensaje"></div>
            </div>
            
            <!-- 🎉 VENTANA EMERGENTE FINAL (IGUAL QUE AVENTURA SÍLABAS) -->
            <div id="overlay-fondo-exploradores"></div>
            <div id="mensaje-feedback-exploradores">
                PREPARANDO MENSAJE FINAL...
                <button id="boton-siguiente-exploradores">SIGUIENTE</button>
            </div>
        </div>
        
        <style>
            :root {
                --color-fondo: #0f172a;
                --color-primario: #4f46e5;
                --color-secundario: #14b8a6;
                --color-texto: #e2e8f0;
                --color-correcto: #22c55e;
                --color-incorrecto: #ef4444;
                --glow-efecto: 0 0 5px var(--color-secundario), 0 0 10px var(--color-secundario), 0 0 15px var(--color-secundario);
                --base-font-size: 15px;
            }

            .exploradores-sonido-container {
                position: relative;
                font-family: 'Poppins', sans-serif;
                background-color: var(--color-fondo);
                color: var(--color-texto);
                min-height: 70vh;
                margin: 0;
                box-sizing: border-box;
                border-radius: 15px;
                overflow: hidden;
            }

            .background-animation {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: url('./img/fondo-exploradores-del-sonido.png') center center;
                background-size: cover;
                opacity: 0.15;
                animation: backgroundFloat 20s ease-in-out infinite;
                z-index: 1;
            }

            .background-animation::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    45deg,
                    rgba(15, 23, 42, 0.8) 0%,
                    rgba(15, 23, 42, 0.6) 50%,
                    rgba(15, 23, 42, 0.8) 100%
                );
                animation: gradientShift 15s ease-in-out infinite;
            }

            @keyframes backgroundFloat {
                0%, 100% { 
                    transform: scale(1) translateY(0px);
                    opacity: 0.15;
                }
                25% { 
                    transform: scale(1.05) translateY(-10px);
                    opacity: 0.2;
                }
                50% { 
                    transform: scale(1.02) translateY(-5px);
                    opacity: 0.18;
                }
                75% { 
                    transform: scale(1.03) translateY(-8px);
                    opacity: 0.16;
                }
            }

            @keyframes gradientShift {
                0%, 100% { 
                    background: linear-gradient(45deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.8));
                }
                50% { 
                    background: linear-gradient(45deg, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.7));
                }
            }

            .content-overlay {
                position: relative;
                z-index: 2;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                min-height: 70vh;
                padding: 5vh 20px;
                text-align: center;
                font-size: var(--base-font-size);
            }

            .exploradores-titulo {
                color: white;
                font-size: 2.8em;
                margin-bottom: 8px;
                text-shadow: var(--glow-efecto);
                text-transform: uppercase;
                font-weight: 600;
                animation: titleGlow 3s ease-in-out infinite;
            }

            @keyframes titleGlow {
                0%, 100% { 
                    text-shadow: var(--glow-efecto);
                }
                50% { 
                    text-shadow: 0 0 8px var(--color-secundario), 0 0 15px var(--color-secundario), 0 0 25px var(--color-secundario);
                }
            }

            .exploradores-textarea {
                font-family: 'Poppins', sans-serif;
                font-size: 1.4em;
                padding: 18px;
                border: 2px solid var(--color-primario);
                border-radius: 9px;
                width: 90%;
                max-width: 570px;
                min-height: 140px;
                background-color: rgba(30, 41, 59, 0.95);
                color: var(--color-texto);
                margin-bottom: 20px;
                outline: none;
                transition: border-color 0.3s, box-shadow 0.3s, background-color 0.3s;
                resize: vertical;
                text-transform: uppercase;
                animation: slideInScale 1s ease-out 1s both;
                backdrop-filter: blur(5px);
            }

            @keyframes slideInScale {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            .exploradores-textarea:focus {
                border-color: var(--color-secundario);
                box-shadow: var(--glow-efecto);
                background-color: rgba(30, 41, 59, 0.98);
            }

            .exploradores-textarea::placeholder {
                text-transform: uppercase;
                color: #64748b;
            }

            .exploradores-controles {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
                font-size: 0.95em;
                text-transform: uppercase;
                animation: fadeInUp 1s ease-out 1.2s both;
            }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .velocidad-slider {
                accent-color: var(--color-secundario);
            }

            .comparacion-container {
                margin-top: 20px;
                margin-bottom: 20px;
                padding: 15px;
                background-color: rgba(30, 41, 59, 0.9);
                border-radius: 8px;
                border: 1px solid rgba(239, 68, 68, 0.3);
                max-width: 600px;
            }

            .comparacion-titulo {
                color: var(--color-incorrecto);
                font-size: 1em;
                margin-bottom: 10px;
                text-transform: uppercase;
                font-weight: 600;
            }

            .palabra-comparacion {
                display: inline-block;
                margin: 2px;
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: 600;
                font-size: 1.1em;
            }

            .palabra-correcta {
                background-color: rgba(34, 197, 94, 0.2);
                color: var(--color-correcto);
                border: 1px solid var(--color-correcto);
            }

            .palabra-incorrecta {
                background-color: rgba(239, 68, 68, 0.2);
                color: var(--color-incorrecto);
                border: 1px solid var(--color-incorrecto);
            }

            .exploradores-botones {
                display: flex;
                gap: 15px;
                margin-bottom: 25px;
                animation: fadeInUp 1s ease-out 1.4s both;
            }

            .btn-explorador {
                font-family: 'Poppins', sans-serif;
                font-size: 1.05em;
                font-weight: 600;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                text-transform: uppercase;
                transition: all 0.3s ease;
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
                min-width: 120px;
            }

            #repetir-button {
                background-color: var(--color-primario);
                color: white;
            }

            #verificar-button {
                background-color: var(--color-secundario);
                color: white;
            }

            .btn-explorador:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 12px rgba(0, 0, 0, 0.4);
            }

            .exploradores-mensaje {
                font-size: 1.2em;
                font-weight: 600;
                padding: 10px;
                border-radius: 6px;
                margin-top: 15px;
                min-height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--color-fondo);
                font-size: 1.5em;
                font-weight: bold;
            }

            #boton-siguiente-exploradores {
                font-family: 'Arial', sans-serif;
                font-size: 1.3em;
                font-weight: 700;
                padding: 18px 35px;
                border: none;
                background-color: var(--color-secundario);
                color: white;
                border-radius: 50px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);
                transition: transform 0.2s, box-shadow 0.2s;
                margin-top: 15px;
                display: none;
            }

            #boton-siguiente-exploradores:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 16px rgba(20, 184, 166, 0.5);
            }

            #overlay-fondo-exploradores {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 999;
                display: none;
            }

            #mensaje-feedback-exploradores {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 1000;
                background-color: rgba(255, 255, 255, 0.98);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                border: 3px solid var(--color-secundario);
                min-width: 400px;
                max-width: 500px;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: var(--color-fondo);
                font-size: 1.5em;
                font-weight: bold;
            }

            @media (max-width: 600px) {
                .content-overlay {
                    padding: 3vh 15px;
                }
                
                .exploradores-titulo {
                    font-size: 2.2em;
                }
                
                .exploradores-textarea {
                    width: 95%;
                    font-size: 1.2em;
                }
                
                .exploradores-botones {
                    flex-direction: column;
                    width: 100%;
                    max-width: 300px;
                }
                
                .btn-explorador {
                    width: 100%;
                }

                .background-animation {
                    background-size: cover;
                    background-position: center center;
                }

                .palabra-comparacion {
                    font-size: 1em;
                    padding: 3px 6px;
                }

                #mensaje-feedback-exploradores {
                    min-width: 300px;
                    max-width: 90%;
                    padding: 30px 20px;
                    font-size: 1.3em;
                }

                #boton-siguiente-exploradores {
                    font-size: 1.1em;
                    padding: 15px 25px;
                }
            }

            .mensaje-correcto {
                background-color: rgba(34, 197, 94, 0.2);
                color: var(--color-correcto);
            }

            .mensaje-incorrecto {
                background-color: rgba(239, 68, 68, 0.2);
                color: var(--color-incorrecto);
            }

            .correcto { color: var(--color-correcto); }
            .incorrecto { color: var(--color-incorrecto); }
        </style>
    `;
}

// ==================== CONFIGURACIÓN DE EVENTOS ====================

function configurarEventos() {
    const repetirButton = document.getElementById('repetir-button');
    const verificarButton = document.getElementById('verificar-button');
    const inputArea = document.getElementById('input-area');
    const velocidadInput = document.getElementById('velocidad-input');
    
    if (repetirButton) {
        repetirButton.addEventListener('click', () => dictarFrase(actividadExploradores.fraseActual));
    }
    
    if (verificarButton) {
        verificarButton.addEventListener('click', verificarFrase);
    }
    
    if (inputArea) {
        inputArea.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                verificarFrase();
            }
        });
    }
    
    if (velocidadInput) {
        velocidadInput.addEventListener('input', function() {
            actividadExploradores.configuracion.velocidadVoz = parseFloat(this.value);
        });
    }
    
    const botonSiguienteJuego = document.getElementById('boton-siguiente-juego');
    if (botonSiguienteJuego) {
        botonSiguienteJuego.addEventListener('click', async () => {
            console.log('🎯 Botón SIGUIENTE presionado');
            
            // Detener audio
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            
            actividadExploradores.detenida = true;
            
            try {
                // Cargar aventura-silabas directamente
                const moduloManager = await import('../activities-manager.js');
                
                console.log('➡️ Cargando Aventura de Sílabas...');
                
                estadoGlobal.actividadActual = 'aventura-silabas';
                
                const moduloAventura = await import('./activity-aventura-silabas.js');
                
                if (moduloAventura.generarActividad) {
                    await moduloAventura.generarActividad();
                }
                
                if (moduloAventura.renderizar) {
                    await moduloAventura.renderizar();
                }
                
                console.log('✅ Aventura de Sílabas cargado correctamente');
                
            } catch (error) {
                console.error('❌ Error al cargar siguiente juego:', error);
            }
        });
    }
}

// ==================== LÓGICA PRINCIPAL ====================

function iniciarActividad() {
    const mensajeDiv = document.getElementById('mensaje');
    const inputArea = document.getElementById('input-area');
    const comparacionDiv = document.getElementById('comparacion-palabras');
    
    if (mensajeDiv) mensajeDiv.textContent = '';
    if (comparacionDiv) comparacionDiv.style.display = 'none';
    
    // Regenerar frases para nueva sesión
    const frasesNuevas = extraerFrasesDeExplicacion();
    actividadExploradores.frases = frasesNuevas;
    actividadExploradores.frasesDelJuego = frasesNuevas.slice(0, 4);
    
    actividadExploradores.indiceFraseActual = 0;
    actividadExploradores.aciertosConsecutivos = 0;
    actividadExploradores.detenida = false; // 🛑 ASEGURAR QUE NO ESTÉ DETENIDA
    
    // 🔧 CAMBIO 2: Mantener saludo original "¡Hola [nombre]!" (ya está correcto)
    const nombreAlumno = datosSession?.nombreAlumno || estadoGlobal.datosSession?.nombre || 'EXPLORADOR';
    const tema = datosSession?.tema || estadoGlobal.tema || 'ESTE TEMA';
    
    const saludo = `¡HOLA ${nombreAlumno.toUpperCase()}! BIENVENIDO A EXPLORADORES DEL SONIDO. VAS A ESCUCHAR FRASES Y TENDRÁS QUE ESCRIBIR LO QUE ESCUCHES. ¡COMENCEMOS!`;
    
    dictarFrase(saludo, () => {
        // Mostrar controles y comenzar con la primera frase
        setTimeout(() => {
            mostrarControlesYComenzar();
        }, 1000);
    });
}

function mostrarControlesYComenzar() {
    const repetirButton = document.getElementById('repetir-button');
    const verificarButton = document.getElementById('verificar-button');
    
    if (repetirButton) repetirButton.style.display = 'inline-block';
    if (verificarButton) verificarButton.style.display = 'inline-block';
    
    siguienteFrase();
}

function siguienteFrase() {
    if (actividadExploradores.indiceFraseActual >= actividadExploradores.frasesDelJuego.length) {
        finalizarActividad(true);
        return;
    }
    
    actividadExploradores.fraseActual = actividadExploradores.frasesDelJuego[actividadExploradores.indiceFraseActual];
    
    const inputArea = document.getElementById('input-area');
    const comparacionDiv = document.getElementById('comparacion-palabras');
    
    if (inputArea) {
        inputArea.value = '';
        inputArea.focus();
    }
    
    if (comparacionDiv) {
        comparacionDiv.style.display = 'none';
    }
    
    // Dictar la frase automáticamente
    setTimeout(() => {
        dictarFrase(actividadExploradores.fraseActual);
    }, 500);
}

function verificarFrase() {
    const inputArea = document.getElementById('input-area');
    const mensajeDiv = document.getElementById('mensaje');
    const comparacionDiv = document.getElementById('comparacion-palabras');
    
    if (!inputArea || !mensajeDiv) return;
    
    const respuestaUsuario = inputArea.value.trim();
    const fraseCorrecta = actividadExploradores.fraseActual;
    
    // Usar normalización sin acentos para comparar
    const respuestaNormalizada = normalizarTextoSinAcentos(respuestaUsuario);
    const fraseCorrectorNormalizada = normalizarTextoSinAcentos(fraseCorrecta);
    
    if (respuestaNormalizada === fraseCorrectorNormalizada) {
        // Respuesta correcta
        actividadExploradores.aciertosConsecutivos++;
        mensajeDiv.style.background = 'rgba(34, 197, 94, 0.2)';
        mensajeDiv.style.color = '#15803d';
        
        const mensajeAcierto = mensajesAcierto[Math.floor(Math.random() * mensajesAcierto.length)];
        mensajeDiv.textContent = mensajeAcierto; // ✅ MISMO TEXTO QUE LA VOZ
        
        // ✅ DESAPARECER MENSAJE DESPUÉS DE 5 SEGUNDOS
        setTimeout(() => {
            if (mensajeDiv) {
                mensajeDiv.textContent = '';
                mensajeDiv.style.background = 'transparent';
            }
        }, 5000);
        
        dictarFrase(mensajeAcierto, () => {
            setTimeout(() => {
                actividadExploradores.indiceFraseActual++;
                siguienteFrase();
            }, 2000);
        });
        
    } else {
        // Respuesta incorrecta
        mensajeDiv.style.background = 'rgba(239, 68, 68, 0.2)';
        mensajeDiv.style.color = '#dc2626';
        mensajeDiv.textContent = 'NO ES CORRECTO. REVISÁ LA COMPARACIÓN.';
        
        // Mostrar comparación
        if (comparacionDiv) {
            mostrarComparacionPalabras(respuestaUsuario, fraseCorrecta, comparacionDiv);
        }
        
        dictarFrase("INTENTÁLO DE NUEVO. ESCUCHÁ NUEVAMENTE LA FRASE", () => {
            setTimeout(() => {
                dictarFrase(actividadExploradores.fraseActual, () => {
                    inputArea.value = '';
                    inputArea.focus();
                });
            }, 1000); // Pausa de 1 segundo antes de repetir la frase
        });
    }
}

function mostrarComparacionPalabras(textoUsuario, textoCorrect, contenedor) {
    if (!contenedor) return;
    
    const palabrasUsuario = textoUsuario.toUpperCase().split(' ').filter(p => p.trim());
    const palabrasCorrectas = textoCorrect.split(' ').filter(p => p.trim());
    
    let htmlComparacion = `
        <div class="comparacion-titulo">LA RESPUESTA CORRECTA ES:</div>
        <div class="fila-comparacion">
    `;
    
    // Mostrar solo la frase correcta con palabras incorrectas en rojo
    for (let i = 0; i < palabrasCorrectas.length; i++) {
        const palabraUsuario = palabrasUsuario[i] || '';
        const palabraCorrecta = palabrasCorrectas[i] || '';
        
        // COMPARAR SIN ACENTOS NI PUNTUACIÓN
        const esCorrecta = normalizarTextoSinAcentos(palabraUsuario) === normalizarTextoSinAcentos(palabraCorrecta);
        const claseCSS = esCorrecta ? 'palabra-correcta' : 'palabra-incorrecta';
        
        htmlComparacion += `<span class="palabra-comparacion ${claseCSS}">${palabraCorrecta}</span>`;
    }
    
    htmlComparacion += `</div>`;
    
    contenedor.innerHTML = htmlComparacion;
    contenedor.style.display = 'block';
}

function finalizarActividad(dominada) {
    console.log('🎉 Finalizando Exploradores del Sonido...');
    
    actividadExploradores.completada = true;
    actividadExploradores.dominada = dominada;
    
    // 🎊 MOSTRAR VENTANA EMERGENTE MEJORADA
    setTimeout(() => {
        mostrarMensajeFinal("¡HAS COMPLETADO TODOS LOS DICTADOS!");
    }, 1000);
}

function mostrarMensajeFinal(mensaje) {
    const mensajeFeedback = document.getElementById('mensaje-feedback-exploradores');
    const overlay = document.getElementById('overlay-fondo-exploradores');
    const nombreAlumno = datosSession?.nombreAlumno || 'ESTUDIANTE';
    
    if (mensajeFeedback && overlay) {
        overlay.style.display = 'block';
        mensajeFeedback.style.display = 'flex';
        
        mensajeFeedback.innerHTML = `
            <div style="margin-bottom: 20px; font-size: 1.6em; color: #1f2937;">
                ¡MUY BIEN ${nombreAlumno.toUpperCase()}!
            </div>
            <div style="margin-bottom: 25px; font-size: 1.2em; color: #4b5563;">
                COMPLETASTE EXPLORADORES DEL SONIDO. PRESIONÁ EL BOTÓN SIGUIENTE.
            </div>
            <button id="boton-siguiente-exploradores">SIGUIENTE</button>
        `;
        
        const botonSiguiente = document.getElementById('boton-siguiente-exploradores');
        if (botonSiguiente) {
            botonSiguiente.style.display = 'block';
            
            botonSiguiente.addEventListener('click', () => {
                console.log('🎉 Botón Siguiente presionado en Exploradores');
                // 🔧 DETENER AUDIO ANTES DE CONTINUAR
                if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
                // 🔧 CAMBIO 3: Usar callback secuencial en lugar del original
                if (window.actividadCompletadaSecuencial) {
                    window.actividadCompletadaSecuencial();
                } else {
                    console.warn('⚠️ window.actividadCompletadaSecuencial no disponible, usando fallback');
                    window.location.href = 'index.html';
                }
            });
        }
        
        // Reproducir mensaje de felicitación que coincide con el texto
        const mensajeFelicitacion = `¡MUY BIEN ${nombreAlumno.toUpperCase()}! COMPLETASTE EXPLORADORES DEL SONIDO. PRESIONÁ EL BOTÓN SIGUIENTE.`;
        dictarFrase(mensajeFelicitacion);
    }
}

// ==================== FUNCIONES AUXILIARES ====================

// FUNCIÓN PARA IGNORAR ACENTOS Y PUNTUACIÓN
function normalizarTextoSinAcentos(texto) {
    return texto.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quitar acentos y diacríticos
        .replace(/[.,;:!?¿¡"'()[\]{}-]/g, '') // Quitar TODA puntuación
        .replace(/\s+/g, ' ') // Espacios múltiples a uno solo
        .trim();
}

function dictarFrase(frase, callback = null) {
    // 🛑 VERIFICAR SI LA ACTIVIDAD FUE DETENIDA
    if (actividadExploradores.detenida) {
        console.log('🚫 Síntesis cancelada - actividad detenida');
        if (callback) callback();
        return;
    }
    
    if (!window.speechSynthesis) {
        console.warn('⚠️ Síntesis de voz no disponible');
        if (callback) callback();
        return;
    }
    
    // Cancelar síntesis anterior
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(frase);
    utterance.lang = 'es-ES';
    utterance.rate = actividadExploradores.configuracion.velocidadVoz;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onend = function() {
        console.log('📊 Síntesis completada');
        if (callback && !actividadExploradores.detenida) {
            callback();
        }
    };
    
    utterance.onerror = function(e) {
        console.error('⚠️ Error en síntesis de voz:', e);
        if (callback) callback();
    };
    
    window.speechSynthesis.speak(utterance);
}

// 🛑 FUNCIÓN PARA DETENER LA ACTIVIDAD EXTERNAMENTE
function detenerActividad() {
    console.log('🛑 Deteniendo actividad Exploradores del Sonido...');
    
    // Cancelar cualquier síntesis de voz en curso
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        console.log('🔇 Síntesis de voz cancelada');
    }
    
    // Marcar como detenida
    actividadExploradores.detenida = true;
    
    // Ocultar todos los botones y mensajes
    const botones = ['repetir-button', 'verificar-button'];
    botones.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.style.display = 'none';
    });
    
    const mensajeDiv = document.getElementById('mensaje');
    if (mensajeDiv) {
        mensajeDiv.innerHTML = '<span class="mensaje-correcto">ACTIVIDAD DETENIDA</span>';
    }
    
    console.log('✅ Actividad Exploradores del Sonido detenida correctamente');
}

// ==================== EXPORTACIONES ====================

export { actividadExploradores, detenerActividad };

// ==================== LOGGING ====================
console.log('🎵 activity-exploradores-sonido.js - CÓDIGO COMPLETO FINAL - cargado correctamente');
console.log('✅ Funcionalidades: Diseño original + Contenedor correcto + Saludo original + Callback secuencial + Mejoras UX + Desaparición mensaje');
