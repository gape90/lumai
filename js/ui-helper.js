// js/ui-helper.js - Chat flotante para explicaciones CON VOZ Y MÉTRICAS + EFECTO ESCRITURA
// =====================================================================================

import { llamarGeminiAPI } from './ai-engine.js';
import { estadoGlobal, generarPromptHibrido, datosSession } from './config.js';
import { construirPrompt, fijarCapsulaActual, obtenerCapsulaActual, respaldoSinIA, temasDelPaso } from './chat-tutor.js';
import { nivelDeApoyo } from './banco-actividades.js';
import { hablar, detenerVoz } from './voz.js';

class ExplanationChat {
    constructor() {
        this.temaActual = '';
        this.pasoDeTemas = null;
        this.chatContainer = null;
        this.isOpen = false;
        this.explicacionContexto = '';
        this.contadorPreguntas = 0;
        this.ultimaRespuesta = '';
        this.recognition = null;
        this.micBtn = null;
        this.isTyping = false; // 🎯 NUEVO: Para controlar el efecto de escritura
        this.historial = []; // últimos mensajes (solo texto) para dar continuidad a la charla
        this.currentTypingInterval = null; // 🎯 NUEVO: Para cancelar escritura si es necesario
    }
    
    crear(explicacionTexto) {
        this.explicacionContexto = explicacionTexto;
        
        // ✅ REGISTRAR CONFIGURACIÓN DEL CHAT EN MÉTRICAS
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('chat_configured', {
                profileType: estadoGlobal.perfil?.nombre_visible,
                hasVoiceRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
                explanationLength: explicacionTexto?.length || 0
            });
        }
        
        // Crear el HTML del chat
        const chatHTML = `
        <style>
            #floatingChatContainer {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                font-family: 'Poppins', sans-serif;
            }

            .lumai-responde-label { background: #fff; color: #00509e; font-weight: 700; font-size: .95rem; padding: 8px 14px; border-radius: 999px; box-shadow: 0 2px 12px rgba(0,80,158,.25); border: 2px solid #00509e; pointer-events: none; white-space: nowrap; }
            #floatingChatContainer.abierto .lumai-responde-label { display: none; }
            .chat-toggle-btn { padding: 0; border: 3px solid #fff !important; }
            .chat-toggle-btn .lumai-cara-img { width: 100%; height: 100%; border-radius: 50%; object-fit: contain; }
            .chat-botones { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
            .lumai-avatar-btn {
                width: 60px; height: 60px; padding: 0; border-radius: 50%; cursor: pointer;
                border: 3px solid #fff; background: linear-gradient(135deg, #00509e, #0a78d6);
                box-shadow: 0 4px 20px rgba(0, 80, 158, 0.3); overflow: hidden;
                display: flex; align-items: center; justify-content: center;
                transition: transform .2s ease;
            }
            .lumai-avatar-btn:hover { transform: scale(1.08); }
            .lumai-cara-img { width: 100%; height: 100%; object-fit: contain; display: block; }
            .ai-avatar { width: 48px !important; height: 48px !important; overflow: hidden; }
            .ai-avatar .lumai-cara-img { width: 100%; height: 100%; border-radius: 50%; background: #0a5aa8; }
            .chat-toggle-btn:focus-visible, .lumai-avatar-btn:focus-visible { outline: 3px solid #ffbf00; outline-offset: 2px; }
            .chat-toggle-btn {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #00509e, #0066cc);
                border: none;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(0, 80, 158, 0.3);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                font-size: 1.5rem;
                color: white;
            }

            .chat-toggle-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(0, 80, 158, 0.4);
            }

            .chat-toggle-btn.active {
                background: linear-gradient(135deg, #dc3545, #c82333);
            }

            .notification-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ff4757;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 0.7rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                transform: scale(0);
                transition: transform 0.3s ease;
            }

            .notification-badge.show {
                transform: scale(1);
            }

            .chat-window {
                position: absolute;
                bottom: 80px;
                right: 0;
                width: 380px;
                height: 550px;
                background: white;
                border-radius: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                opacity: 0;
                transform: translateY(20px) scale(0.9);
                transition: all 0.3s ease;
                pointer-events: none;
                overflow: hidden;
                border: 1px solid #e0e0e0;
            }

            .chat-window.active {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: all;
            }

            .chat-header {
                background: linear-gradient(135deg, #00509e, #0066cc);
                color: white;
                padding: 20px;
                text-align: center;
            }

            .chat-header h3 {
                margin: 0;
                font-size: 1.2rem;
            }

            .chat-header p {
                margin: 5px 0 0 0;
                opacity: 0.9;
                font-size: 0.9rem;
            }

            .ai-avatar {
                width: 40px;
                height: 40px;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
                margin: 0 auto 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
            }

            .chat-messages {
                height: 380px;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
                scroll-behavior: smooth; /* 🎯 NUEVO: Scroll suave automático */
            }

            .chat-messages::-webkit-scrollbar {
                width: 6px;
            }

            .chat-messages::-webkit-scrollbar-thumb {
                background: #bbb;
                border-radius: 3px;
            }

            .message {
                margin-bottom: 15px;
                animation: fadeInUp 0.3s ease;
            }

            .message.bot {
                text-align: left;
            }

            .message.user {
                text-align: right;
            }

            .message-bubble {
                display: inline-block;
                max-width: 85%;
                padding: 12px 16px;
                border-radius: 18px;
                font-size: 0.9rem;
                line-height: 1.6;
                word-wrap: break-word;
                white-space: pre-line;
            }

            .message.bot .message-bubble {
                background: white;
                color: #333;
                border-bottom-left-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            /* 🎯 NUEVO: Estilo para mensajes en proceso de escritura */
            .message-bubble.typing-message {
                min-height: 20px;
                position: relative;
            }

            .message-bubble.typing-message::after {
                content: '|';
                animation: blink 1s infinite;
                font-weight: bold;
                color: #00509e;
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }

            .message-bubble p {
                margin: 0.8rem 0;
                line-height: 1.5;
            }

            .message-bubble p:first-child {
                margin-top: 0;
            }

            .message-bubble p:last-child {
                margin-bottom: 0;
            }

            .interactive-question {
                background: linear-gradient(135deg, #e3f2fd, #bbdefb);
                padding: 10px 14px;
                border-radius: 12px;
                margin: 8px 0;
                border-left: 3px solid #00509e;
                font-weight: 500;
                font-style: italic;
            }

            .quick-response-buttons {
                display: flex;
                gap: 8px;
                margin: 10px 0;
                flex-wrap: wrap;
            }

            .quick-btn {
                background: linear-gradient(135deg, #00509e, #0066cc);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 15px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }

            .quick-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 2px 8px rgba(0, 80, 158, 0.3);
            }

            .message.user .message-bubble {
                background: linear-gradient(135deg, #00509e, #0066cc);
                color: white;
                border-bottom-right-radius: 6px;
            }

            .message-time {
                font-size: 0.7rem;
                opacity: 0.7;
                margin-top: 5px;
            }

            .chat-input-area {
                padding: 15px 20px;
                background: white;
                border-top: 1px solid #e0e0e0;
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .mic-btn {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #28a745, #20c997);
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                font-size: 1rem;
                color: white;
            }

            .mic-btn:hover {
                transform: scale(1.1);
            }

            .mic-btn.recording {
                background: linear-gradient(135deg, #dc3545, #c82333);
                animation: pulse 1s infinite;
            }

            .mic-btn:disabled {
                background: #6c757d;
                cursor: not-allowed;
                opacity: 0.6;
            }

            .chat-input {
                flex: 1;
                border: 1px solid #ddd;
                border-radius: 25px;
                padding: 12px 16px;
                font-size: 0.9rem;
                outline: none;
                transition: border-color 0.3s ease;
                font-family: inherit;
            }

            .chat-input:focus {
                border-color: #00509e;
            }

            .send-btn {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #00509e, #0066cc);
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s ease;
                font-size: 1rem;
                color: white;
            }

            .send-btn:hover {
                transform: scale(1.1);
            }

            /* 🎯 NUEVO: Deshabilitar envío mientras se está escribiendo */
            .send-btn:disabled {
                background: #6c757d;
                cursor: not-allowed;
                opacity: 0.6;
            }

            .typing-indicator {
                display: none;
                padding: 10px 20px;
                font-style: italic;
                color: #666;
                font-size: 0.8rem;
            }

            .typing-dots::after {
                content: '';
                animation: typingDots 1.5s infinite;
            }

            @media (max-width: 768px) {
                .chat-window {
                    width: calc(100vw - 40px);
                    height: 70vh;
                    bottom: 80px;
                    right: -10px;
                }
                
                #floatingChatContainer {
                    bottom: 15px;
                    right: 15px;
                }
            }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes typingDots {
                0%, 20% { content: ''; }
                40% { content: '.'; }
                60% { content: '..'; }
                80%, 100% { content: '...'; }
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        </style>
        
        <div id="floatingChatContainer">
            <div class="chat-window" id="chatWindow">
                <div class="chat-header">
                    <div class="ai-avatar"><img src="img/lumai-cara.png" alt="" class="lumai-cara-img"></div>
                    <h3 id="chatTitulo">LumAI responde</h3>
                    <p id="chatSubtitulo">Pregúntame sobre la explicación</p>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                </div>
                
                <div class="typing-indicator" id="typingIndicator">
                    Pensando<span class="typing-dots"></span>
                </div>
                
                <div class="chat-input-area">
                    <button class="mic-btn" id="micBtn" title="Hablar">🎤</button>
                    <input 
                        type="text" 
                        class="chat-input" 
                        id="chatInput" 
                        placeholder="Escribí tu duda acá…"
                        maxlength="500"
                    >
                    <button class="send-btn" id="sendBtn">📤</button>
                </div>
            </div>

            <div class="chat-botones">
                <span class="lumai-responde-label" id="lumaiRespondeLabel" aria-hidden="true">LumAI responde</span>
                <button class="chat-toggle-btn" id="chatToggleBtn" type="button" aria-label="LumAI responde: abrir el asistente para hacer preguntas">
                    <img src="img/lumai-cara.png" alt="" class="lumai-cara-img">
                    <div class="notification-badge" id="notificationBadge">?</div>
                </button>
            </div>
        </div>`;
        
        // Insertar en el DOM
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        
        // Obtener referencias
        this.chatContainer = document.getElementById('floatingChatContainer');
        this.chatWindow = document.getElementById('chatWindow');
        this.chatToggleBtn = document.getElementById('chatToggleBtn');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.notificationBadge = document.getElementById('notificationBadge');
        this.micBtn = document.getElementById('micBtn');
        
        // Inicializar eventos
        this.initEventListeners();
        
        // Configurar reconocimiento de voz
        this.configurarReconocimientoVoz();
        
        // Personalizar mensaje inicial según el perfil
        this.personalizarMensajeInicial();
        
        // Sistema de sugerencias proactivas para estudiantes con dificultades
        if (estadoGlobal.perfil && estadoGlobal.perfil.dimensiones.comprension_lectora === "bajo") {
            this.iniciarSugerenciasProactivas();
        }
        
        // Mostrar notificación inicial después de 2 segundos
        setTimeout(() => this.showNotificationBadge(), 2000);
        
        console.log('💬 Chat flotante creado con reconocimiento de voz y efecto de escritura');
    }
    
    // ============================= 🎯 NUEVAS FUNCIONES PARA EFECTO DE ESCRITURA =============================
    
    /**
     * Función principal para agregar mensajes con efecto de escritura gradual
     * @param {string} text - Texto del mensaje
     * @param {string} type - Tipo: 'bot' o 'user'
     * @param {boolean} incluirBotones - Si incluir botones de respuesta rápida
     * @param {boolean} efectoEscritura - Si usar efecto de escritura gradual (solo para bot)
     */
    addMessage(text, type = 'bot', incluirBotones = false, efectoEscritura = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let contenidoFormateado = text;
        if (type === 'bot') {
            contenidoFormateado = this.formatearRespuestaBot(text, incluirBotones);
        }
        
        // Si es mensaje del bot y se requiere efecto de escritura
        if (type === 'bot' && efectoEscritura && !incluirBotones) {
            messageDiv.innerHTML = `
                <div class="message-bubble typing-message" id="typing-${Date.now()}"></div>
                <div class="message-time">${timeString}</div>
            `;
            
            this.chatMessages.appendChild(messageDiv);
            this.scrollToMensaje(messageDiv);
            
            // Iniciar efecto de escritura gradual
            const bubbleElement = messageDiv.querySelector('.message-bubble');
            this.startTypingEffect(bubbleElement, contenidoFormateado, incluirBotones);
            
        } else {
            // Mensaje normal (usuario o bot con botones)
            messageDiv.innerHTML = `
                <div class="message-bubble">${contenidoFormateado}</div>
                <div class="message-time">${timeString}</div>
            `;
            
            this.chatMessages.appendChild(messageDiv);
            if (type === 'bot') this.scrollToMensaje(messageDiv); else this.scrollToBottom();
            
            if (incluirBotones) {
                this.configurarBotonesRapidos(messageDiv);
            }
        }
        
        if (type === 'bot' && !this.isOpen) {
            this.showNotificationBadge();
        }
        
        // ✅ REGISTRAR MENSAJE EN MÉTRICAS
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('chat_message_added', {
                messageType: type,
                messageLength: text.length,
                hasQuickButtons: incluirBotones,
                hasTypingEffect: efectoEscritura && type === 'bot'
            });
        }
    }
    
    /**
     * Inicia el efecto de escritura gradual
     * @param {HTMLElement} element - Elemento donde se escribirá el texto
     * @param {string} fullText - Texto completo a escribir
     * @param {boolean} incluirBotones - Si incluir botones al final
     */
    startTypingEffect(element, fullText, incluirBotones = false) {
        if (!element || !fullText) return;
        
        // Cancelar cualquier escritura previa
        this.stopTypingEffect();
        
        this.isTyping = true;
        element.classList.add('typing-message');
        
        // Deshabilitar envío de mensajes mientras se escribe
        if (this.sendBtn) {
            this.sendBtn.disabled = true;
        }
        if (this.chatInput) {
            this.chatInput.disabled = true;
        }
        
        let currentText = '';
        let currentIndex = 0;
        
        // Determinar velocidad según perfil del estudiante
        const velocidades = {
            "N1": 30,   // Más lento para estudiantes con dificultades
            "N2": 20,   // Velocidad media
            "N3": 15    // Más rápido para estudiantes avanzados
        };
        
        const velocidad = velocidades[estadoGlobal.perfil?.nombre_visible] || 20;
        
        const writeNextChar = () => {
            if (currentIndex < fullText.length && this.isTyping) {
                currentText += fullText[currentIndex];
                element.innerHTML = currentText;
                currentIndex++;
                
                // Scroll automático mientras se escribe
                this.scrollToBottom();
                
                // Continuar escribiendo
                this.currentTypingInterval = setTimeout(writeNextChar, velocidad);
                
            } else {
                // Escritura completada
                this.finishTypingEffect(element, fullText, incluirBotones);
            }
        };
        
        // Iniciar escritura
        writeNextChar();
    }
    
    /**
     * Finaliza el efecto de escritura
     * @param {HTMLElement} element - Elemento donde se escribió
     * @param {string} fullText - Texto completo
     * @param {boolean} incluirBotones - Si incluir botones
     */
    finishTypingEffect(element, fullText, incluirBotones) {
        if (!element) return;
        
        this.isTyping = false;
        element.classList.remove('typing-message');
        element.innerHTML = fullText;
        
        // Rehabilitar envío de mensajes
        if (this.sendBtn) {
            this.sendBtn.disabled = false;
        }
        if (this.chatInput) {
            this.chatInput.disabled = false;
        }
        
        // Configurar botones si es necesario
        if (incluirBotones) {
            const messageDiv = element.closest('.message');
            if (messageDiv) {
                this.configurarBotonesRapidos(messageDiv);
            }
        }
        
        // Scroll final
        this.scrollToBottom();
        
        console.log('✅ Efecto de escritura completado');
    }
    
    /**
     * Detiene cualquier efecto de escritura en curso
     */
    stopTypingEffect() {
        if (this.currentTypingInterval) {
            clearTimeout(this.currentTypingInterval);
            this.currentTypingInterval = null;
        }
        
        this.isTyping = false;
        
        // Rehabilitar controles
        if (this.sendBtn) {
            this.sendBtn.disabled = false;
        }
        if (this.chatInput) {
            this.chatInput.disabled = false;
        }
    }
    
    // ============================= FIN FUNCIONES DE EFECTO DE ESCRITURA =============================
    
    // ✅ NUEVO: Configurar reconocimiento de voz
    configurarReconocimientoVoz() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'es-AR';
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            this.recognition.continuous = false;

            // Event listeners para el reconocimiento
            this.recognition.addEventListener('start', () => {
                this.micBtn.classList.add('recording');
                this.micBtn.innerHTML = '🔴';
                this.chatInput.placeholder = '🎤 Escuchando...';
                console.log('🎤 Reconocimiento de voz iniciado');
                
                // ✅ REGISTRAR USO DE VOZ EN MÉTRICAS
                if (window.lumaiTracker) {
                    window.lumaiTracker.recordCustomEvent('voice_recognition_started', {
                        profileType: estadoGlobal.perfil?.nombre_visible
                    });
                }
            });

            this.recognition.addEventListener('result', (event) => {
                const transcript = event.results[0][0].transcript;
                this.chatInput.value = transcript;
                console.log('🎤 Texto reconocido:', transcript);
                
                // ✅ REGISTRAR TRANSCRIPCIÓN EN MÉTRICAS
                if (window.lumaiTracker) {
                    window.lumaiTracker.recordCustomEvent('voice_transcribed', {
                        transcriptLength: transcript.length,
                        confidence: event.results[0][0].confidence
                    });
                }
                
                // Auto-enviar si el estudiante tiene dificultades
                if (estadoGlobal.perfil && estadoGlobal.perfil.dimensiones.comprension_lectora === "bajo") {
                    setTimeout(() => {
                        this.sendMessage();
                    }, 500);
                }
            });

            this.recognition.addEventListener('end', () => {
                this.resetMicButton();
            });

            this.recognition.addEventListener('error', (event) => {
                console.warn('⚠️ Error en reconocimiento de voz:', event.error);
                this.resetMicButton();
                
                // ✅ REGISTRAR ERROR DE VOZ EN MÉTRICAS
                if (window.lumaiTracker) {
                    window.lumaiTracker.recordCustomEvent('voice_recognition_error', {
                        error: event.error
                    });
                }
                
                // Mensaje de error personalizado por perfil
                const mensajesErrorVoz = {
                    "N1": "¡Ups! 🎈 No pude escucharte bien. ¿Podés intentar de nuevo?",
                    "N2": "Lo siento, no pude entender tu voz. 🌸 ¿Probás otra vez?",
                    "N3": "Hubo un problema con el reconocimiento de voz. Intenta nuevamente."
                };
                
                const errorMsg = mensajesErrorVoz[estadoGlobal.perfil?.nombre_visible] || 
                               "No pude escucharte bien. ¿Intentas de nuevo?";
                
                this.mostrarMensajeTemporalEnChat(errorMsg);
            });

            // Event listener para el botón de micrófono
            this.micBtn.addEventListener('click', () => {
                if (this.micBtn.classList.contains('recording')) {
                    this.recognition.stop();
                } else {
                    try {
                        this.recognition.start();
                    } catch (error) {
                        console.warn('⚠️ Error iniciando reconocimiento:', error);
                    }
                }
            });

            console.log('🎤 Reconocimiento de voz configurado');
        } else {
            // Deshabilitar micrófono si no hay soporte
            this.micBtn.disabled = true;
            this.micBtn.style.opacity = '0.5';
            this.micBtn.title = 'Reconocimiento de voz no soportado en este navegador';
            console.warn('⚠️ Reconocimiento de voz no soportado');
        }
    }
    
    // ✅ NUEVO: Resetear botón de micrófono
    resetMicButton() {
        this.micBtn.classList.remove('recording');
        this.micBtn.innerHTML = '🎤';
        
        const placeholdersPersonalizados = {
            "N1": "¿Qué querés saber? 🎈",
            "N2": "Escribí tu pregunta aquí 🌸",
            "N3": "Formula tu consulta..."
        };
        
        const placeholderPersonalizado = placeholdersPersonalizados[estadoGlobal.perfil?.nombre_visible] || 
                                       "Escribí tu duda acá…";
        
        this.chatInput.placeholder = placeholderPersonalizado;
    }
    
    // ✅ NUEVO: Mostrar mensaje temporal en el chat
    mostrarMensajeTemporalEnChat(mensaje) {
        const mensajeTemp = document.createElement('div');
        mensajeTemp.className = 'message bot';
        mensajeTemp.style.opacity = '0.7';
        mensajeTemp.innerHTML = `
            <div class="message-bubble">${mensaje}</div>
            <div class="message-time">Sistema</div>
        `;
        
        this.chatMessages.appendChild(mensajeTemp);
        this.scrollToBottom();
        
        // Quitar después de 3 segundos
        setTimeout(() => {
            if (mensajeTemp.parentNode) {
                this.chatMessages.removeChild(mensajeTemp);
            }
        }, 3000);
    }
    
    iniciarSugerenciasProactivas() {
        setTimeout(() => {
            if (this.contadorPreguntas === 0 && !this.isOpen) {
                this.showNotificationBadge();
                if (this.notificationBadge) {
                    this.notificationBadge.textContent = '💡';
                    this.notificationBadge.title = 'Tengo una sugerencia para vos';
                }
            }
        }, 30000);
        
        setTimeout(() => {
            if (this.contadorPreguntas === 0) {
this.addBotHtml(`<p style="margin:0 0 6px"><b>¿Todo bien con la clase?</b></p><p style="margin:0 0 6px">Si tenés alguna duda, preguntame.</p><div class="quick-response-buttons"><button class="quick-btn" data-modo="temas">📋 Ver temas para explicar</button></div>`);
            }
        }, 60000);
    }
    
    destruir() {
        // Detener cualquier efecto de escritura
        this.stopTypingEffect();
        
        if (estadoGlobal.perfil && estadoGlobal.perfil.dimensiones.comprension_lectora === "bajo" && this.contadorPreguntas === 0) {
            console.log('💬 Estudiante con dificultades no utilizó el chat - puede necesitar más apoyo');
            
            // ✅ REGISTRAR EN MÉTRICAS
            if (window.lumaiTracker) {
                window.lumaiTracker.recordCustomEvent('chat_unused_special_needs', {
                    profileType: estadoGlobal.perfil.nombre_visible,
                    sessionDuration: window.lumaiTracker.getCurrentStats()?.session?.duration || 0
                });
            }
        }
        
        // ✅ NUEVO: Limpiar reconocimiento de voz
        if (this.recognition) {
            this.recognition.abort();
            this.recognition = null;
        }
        
        if (this.chatContainer) {
            this.chatContainer.remove();
            this.chatContainer = null;
            console.log('💬 Chat flotante destruido');
        }
    }
    
    personalizarMensajeInicial() {
        const mensajesIniciales = {
            "N1": "¡Hola! 🎈 Leí toda la explicación y estoy acá para ayudarte. ¿Querés preguntarme algo sobre el tema? ¡Podés hablar o escribir!",
            "N2": "¡Hola! 🌸 Ya leí la explicación completa. ¿Tenés alguna pregunta sobre lo que estamos aprendiendo? Podés escribir o usar el micrófono.",
            "N3": "¡Hola! He analizado la explicación a fondo. ¿Tenés alguna consulta específica sobre el tema? Podemos profundizar en lo que necesites."
        };
        
        const placeholdersPersonalizados = {
            "N1": "¿Qué querés saber? 🎈",
            "N2": "Escribí tu pregunta acá 🌸",
            "N3": "Hacé tu consulta..."
        };
        
        const titulosPersonalizados = {
            "N1": "Tu Amigo IA 🎈",
            "N2": "Asistente Educativo 🌸", 
            "N3": "Consultor Académico"
        };
        
        const subtitulosPersonalizados = {
            "N1": "¡Preguntame hablando o escribiendo!",
            "N2": "Acá para ayudarte a aprender",
            "N3": "Análisis y consultas especializadas"
        };
        
        const perfilName = null; // el asistente es el mismo para todos: LumAI responde (el estilo se adapta con las perillas)
        
        const mensajePersonalizado = mensajesIniciales[perfilName] || 
                                   "¡Hola! Soy LumAI. Te ayudo con esta clase: preguntame lo que no entiendas o pedime que te lo explique de otra forma. 📚";
        
        const placeholderPersonalizado = placeholdersPersonalizados[perfilName] || 
                                       "Escribí tu duda acá…";
        
        const tituloPersonalizado = titulosPersonalizados[perfilName] || 
                                  "LumAI responde";
        
        const subtituloPersonalizado = subtitulosPersonalizados[perfilName] || 
                                     "Te ayudo con esta clase";
        
        // Personalizar elementos
        const mensajeEl = document.getElementById('mensajeInicial');
        if (mensajeEl) {
            mensajeEl.textContent = mensajePersonalizado;
        }
        
        if (this.chatInput) {
            this.chatInput.placeholder = placeholderPersonalizado;
        }
        
        const tituloEl = document.getElementById('chatTitulo');
        const subtituloEl = document.getElementById('chatSubtitulo');
        
        if (tituloEl) {
            tituloEl.textContent = tituloPersonalizado;
        }
        
        if (subtituloEl) {
            subtituloEl.textContent = subtituloPersonalizado;
        }
    }
    
    initEventListeners() {
        this.chatToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleChat();
        });
        // La clase avisa en qué actividad está el alumno y si quiere preguntar algo puntual
        document.addEventListener('lumai:capsula', (e) => fijarCapsulaActual(e.detail));
        document.addEventListener('lumai:preguntar', (e) => {
            const d = e.detail || {};
            if (!this.isOpen) this.toggleChat();
            if (d.pregunta && !this.isTyping) {
                this.chatInput.value = d.pregunta;
                this.sendMessage(d.modo || 'libre');
            }
        });
        
        this.chatInput.addEventListener('keypress', (e) => {
            // 🎯 MODIFICADO: No enviar si se está escribiendo
            if (e.key === 'Enter' && !e.shiftKey && !this.isTyping) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.sendBtn.addEventListener('click', () => {
            // 🎯 MODIFICADO: No enviar si se está escribiendo
            if (!this.isTyping) {
                this.sendMessage();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.toggleChat();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (this.isOpen && !e.target.closest('#floatingChatContainer')) {
                this.toggleChat();
            }
        });
    }
    
    toggleChat() {
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            this.openChat();
        } else {
            this.closeChat();
        }
    }
    
    openChat() {
        this.chatWindow.classList.add('active');
        this.chatToggleBtn.classList.add('active');
        this.chatToggleBtn.innerHTML = '✖️';
        this.chatContainer?.classList.add('abierto');
        try { detenerVoz(); } catch (e) { /* sin voz */ }
        this.mostrarTemasSiCorresponde();
        this.hideNotificationBadge();
        
        // ✅ REGISTRAR APERTURA DEL CHAT EN MÉTRICAS
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('chat_opened', {
                profileType: estadoGlobal.perfil?.nombre_visible,
                questionsAsked: this.contadorPreguntas
            });
        }
        
        setTimeout(() => {
            if (!this.isTyping) { // Solo focus si no se está escribiendo
                this.chatInput.focus();
            }
        }, 300);
    }
    
    closeChat() {
        this.chatWindow.classList.remove('active');
        this.chatToggleBtn.classList.remove('active');
        this.chatToggleBtn.innerHTML = '<img src="img/lumai-cara.png" alt="" class="lumai-cara-img"><div class="notification-badge" id="notificationBadge">?</div>';
        this.chatContainer?.classList.remove('abierto');
        this.notificationBadge = document.getElementById('notificationBadge');
        
        // ✅ NUEVO: Detener reconocimiento si está activo
        if (this.recognition && this.micBtn.classList.contains('recording')) {
            this.recognition.stop();
        }
        
        // ✅ REGISTRAR CIERRE DEL CHAT EN MÉTRICAS
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('chat_closed', {
                profileType: estadoGlobal.perfil?.nombre_visible,
                questionsAsked: this.contadorPreguntas
            });
        }
    }
    
    sendMessage(modo = 'libre') {
        const message = this.chatInput.value.trim();
        if (!message || this.isTyping) return; // 🎯 No enviar si se está escribiendo
        
        this.addMessage(message, 'user', false, false); // Usuario sin efecto de escritura
        this.chatInput.value = '';
        this.contadorPreguntas++;
        
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('chat_question_asked', {
                questionLength: message.length,
                questionNumber: this.contadorPreguntas,
                modo
            });
        }
        
        if (modo === 'libre' && !this.temaElegido) {
            // Antes de responder, el alumno elige el tema que no entiende
            this.mostrarTemas(true, true);
            return;
        }
        if (modo === 'libre') this.temaActual = message.slice(0, 90);
        this.showTypingIndicator();
        this.generateAIResponse(message, modo);
    }
    
    generarRespuestaDeApoyo() {
        const respuestasApoyo = {
            "N1": `¡Tranquilo! 🎈 A veces pasa que algo parece difícil.

Vamos a empezar de nuevo, pero más despacito.

¿Qué parte específica no entendés? Te la voy a explicar súper fácil.

<div class="quick-response-buttons">
    <button class="quick-btn">🤔 Todo me confunde</button>
    <button class="quick-btn">🔍 Una parte específica</button>
    <button class="quick-btn">🎯 Dame un ejemplo</button>
</div>`,
            "N2": `Está perfecto que preguntes cuando algo no se entiende. 🌸

Vamos a tomarlo con calma y paso a paso.

¿Podrías decirme exactamente qué parte te resulta más difícil?

<div class="quick-response-buttons">
    <button class="quick-btn">✅ Sí, entendí</button>
    <button class="quick-btn">❓ No entendí bien</button>
</div>`,
            "N3": `Entiendo tu dificultad. Reformulemos el concepto desde una perspectiva diferente.

¿Hay algún aspecto específico que requiere mayor clarificación?`
        };
        
        return respuestasApoyo[estadoGlobal.perfil?.nombre_visible] || 
               "No te preocupes, vamos paso a paso. ¿Qué parte específica no entendés?";
    }
    
    formatearRespuestaBot(texto, incluirBotones) {
        let textoFormateado = texto
            .split('\n\n')
            .map(parrafo => parrafo.trim())
            .filter(parrafo => parrafo.length > 0)
            .join('\n\n');
        
        textoFormateado = textoFormateado.replace(
            /([^.!]*\?)/g, 
            '<div class="interactive-question">$1</div>'
        );
        
        return textoFormateado;
    }
    
    configurarBotonesRapidos(messageDiv) {
        const botonesRapidos = messageDiv.querySelectorAll('.quick-btn');
        botonesRapidos.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isTyping) return;
                const modo = btn.dataset.modo;
                if (btn.dataset.tema) { this.temaActual = btn.dataset.tema; this.temaElegido = true; }
                this.addMessage(btn.textContent, 'user', false, false); // Usuario sin efecto
                if (window.lumaiTracker) {
                    window.lumaiTracker.recordCustomEvent('quick_response_used', { modo, tema: (this.temaActual || '').slice(0, 80) });
                }
                if (modo === 'temas') { this.mostrarTemas(true); return; }
                const tema = this.temaActual || 'la clase';
                const pedidos = {
                    explicar: `Explicame: ${tema}`,
                    ejemplo: `Dame ejemplos nuevos sobre: ${tema}`,
                    otra_forma: `Explicámelo de otra forma: ${tema}`
                };
                this.showTypingIndicator();
                this.generateAIResponse(pedidos[modo] || tema, modo || 'libre');
            });
        });
    }

    // Mensaje del bot con HTML propio (botones), sin el formateo de las respuestas de la IA
    addBotHtml(html, sinScroll = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageDiv.innerHTML = `<div class="message-bubble">${html}</div><div class="message-time">${hora}</div>`;
        this.chatMessages.appendChild(messageDiv);
        if (!sinScroll) this.scrollToMensaje(messageDiv);
        this.configurarBotonesRapidos(messageDiv);
    }

    escHtml(t) { return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    // "¿Qué necesitás que te explique, Mica?" + temas del paso en el que está el alumno
    async mostrarTemas(forzar = false, pedirElegir = false) {
        const cap = obtenerCapsulaActual();
        if (this.pasoDeTemas !== (cap?.id || 'general')) this.temaElegido = false;
        this.pasoDeTemas = cap?.id || 'general';
        const nombre = String(datosSession?.nombreAlumno || '').trim();   // solo se muestra acá; no va a la IA
        let temas = [];
        try { temas = await temasDelPaso(cap); } catch (e) { temas = []; }
        const aj = estadoGlobal.ajustes || {};
        const may = t => (aj.mayusculas ? String(t).toUpperCase() : String(t));
        const donde = cap ? `Estás en la actividad ${cap.numero}: “${this.escHtml(cap.titulo)}”.` : 'Elegí un tema de la clase.';
        const botones = temas.map(t => `<button class="quick-btn" data-modo="explicar" data-tema="${this.escHtml(t)}">${this.escHtml(may(t))}</button>`).join('');
        this.addBotHtml(`<p style="margin:0 0 6px"><b>${this.escHtml(may(pedirElegir ? `Primero elegí el tema que no entendés${nombre ? ', ' + nombre : ''}:` : `¿Qué necesitás que te explique${nombre ? ', ' + nombre : ''}?`))}</b></p><p style="margin:0 0 6px">${this.escHtml(may(donde.replace(/<[^>]+>/g, '')))}</p><div class="quick-response-buttons">${botones}</div>${pedirElegir ? '' : `<p style="margin:6px 0 0;font-size:.85rem">${this.escHtml(may('Tocá el tema que querés que te explique.'))}</p>`}`);
    }

    mostrarTemasSiCorresponde() {
        const cap = obtenerCapsulaActual();
        const paso = cap?.id || 'general';
        if (this.isTyping) return;
        if (this.pasoDeTemas !== paso) this.mostrarTemas();
    }

    // Después de explicar: ofrecer ejemplos nuevos (distintos a los de la clase)
    ofrecerSeguimiento(modo) {
        const aj = estadoGlobal.ajustes || {};
        const may = t => (aj.mayusculas ? String(t).toUpperCase() : String(t));
        const e = t => this.escHtml(may(t));
        if (modo === 'ejemplo') {
            this.addBotHtml(`<p style="margin:0 0 6px"><b>${e('¿Querés otro ejemplo?')}</b></p><div class="quick-response-buttons"><button class="quick-btn" data-modo="ejemplo">${e('💡 Otro ejemplo')}</button><button class="quick-btn" data-modo="temas">${e('📋 Otro tema')}</button></div>`, true);
        } else {
            this.addBotHtml(`<p style="margin:0 0 6px"><b>${e('¿Querés que te dé ejemplos?')}</b></p><div class="quick-response-buttons"><button class="quick-btn" data-modo="ejemplo">${e('💡 Sí, dame ejemplos')}</button><button class="quick-btn" data-modo="otra_forma">${e('🔄 Explicámelo de otra forma')}</button><button class="quick-btn" data-modo="temas">${e('📋 Otro tema')}</button></div>`, true);
        }
    }

    async generateAIResponse(userMessage, modo = 'libre') {
        try {
            const apoyo = nivelDeApoyo() || 'medio';
            const prompt = await construirPrompt({ pregunta: userMessage, modo, historial: this.historial });
            this.historial.push({ rol: 'user', texto: userMessage });

            let response;
            try {
                response = await llamarGeminiAPI(prompt);
            } catch (errIA) {
                console.warn('⚠️ Sin IA para el chat; respuesta de respaldo desde la clase:', errIA?.message);
                if (modo === 'ejemplo' || modo === 'otra_forma') {
                    response = 'Ahora no pude armar ' + (modo === 'ejemplo' ? 'ejemplos nuevos' : 'otra explicación') + '. Probá de nuevo en un ratito, o releé la actividad con calma.';
                } else {
                    response = await respaldoSinIA(userMessage);
                }
            }
            response = String(response || '').trim();
            if ((estadoGlobal.ajustes || {}).mayusculas) response = response.toUpperCase();
            response = response.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            this.historial.push({ rol: 'bot', texto: response });
            if (this.historial.length > 8) this.historial = this.historial.slice(-8);
            
            this.hideTypingIndicator();
            
            if (window.lumaiTracker) {
                window.lumaiTracker.recordCustomEvent('ai_response_generated', {
                    responseLength: response.length,
                    modo,
                    apoyo
                });
            }

            // Los alumnos con voz activada también escuchan la respuesta
            const aj = estadoGlobal.ajustes || {};
            if (aj.voz >= 2) { try { hablar(response, { mostrar: false, ajustes: aj }); } catch (e) { /* sin voz */ } }
            
            this.addMessage(response, 'bot', false, false);
            this.ofrecerSeguimiento(modo);
            
        } catch (error) {
            console.error('Error generando respuesta:', error);
            this.hideTypingIndicator();
            
            if (window.lumaiTracker) {
                window.lumaiTracker.recordCustomEvent('ai_response_error', { error: error.message });
            }
            this.addMessage('Tuve un problemita. ¿Probás preguntarme de nuevo?', 'bot', false, true);
        }
    }
    
    showTypingIndicator() {
        const indicadoresTyping = {
            "N1": "Pensando... 🎈",
            "N2": "Preparando respuesta... 🌸", 
            "N3": "Analizando consulta..."
        };
        
        const indicadorPersonalizado = indicadoresTyping[estadoGlobal.perfil?.nombre_visible] || "Pensando";
        
        this.typingIndicator.innerHTML = `${indicadorPersonalizado}<span class="typing-dots"></span>`;
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }
    
    // Muestra el comienzo de un mensaje (para que las respuestas largas se lean desde el principio)
    scrollToMensaje(div) {
        if (!this.chatMessages || !div) return;
        const delta = div.getBoundingClientRect().top - this.chatMessages.getBoundingClientRect().top;
        this.chatMessages.scrollTop += delta - 8;
    }

    scrollToBottom() {
        // 🎯 MEJORADO: Scroll más suave y confiable
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }
    
    showNotificationBadge() {
        if (this.notificationBadge) {
            this.notificationBadge.classList.add('show');
            this.chatToggleBtn.classList.add('pulse');
        }
    }
    
    hideNotificationBadge() {
        if (this.notificationBadge) {
            this.notificationBadge.classList.remove('show');
            this.chatToggleBtn.classList.remove('pulse');
        }
    }
}

// Exportar instancia única
export const explanationChat = new ExplanationChat();

// ✅ FUNCIÓN REQUERIDA POR UI-CONTROLLER.JS
export function configurarChatFlotante() {
    try {
        // Verificar que tenemos la explicación generada
        const explicacion = estadoGlobal.explicacionGenerada || '';
        
        if (!explicacion) {
            console.warn('⚠️ No hay explicación disponible para el chat');
            return false;
        }

        // Crear el chat con la explicación
        explanationChat.crear(explicacion);
        
        // ✅ REGISTRAR CONFIGURACIÓN EN MÉTRICAS
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('chat_configured_successfully', {
                explanationLength: explicacion.length,
                profileType: estadoGlobal.perfil?.nombre_visible,
                hasVoiceSupport: !explanationChat.micBtn?.disabled,
                hasTypingEffect: true
            });
        }
        
        console.log('💬 Chat flotante configurado correctamente con efecto de escritura');
        return true;
        
    } catch (error) {
        console.error('❌ Error configurando chat flotante:', error);
        
        // ✅ REGISTRAR ERROR EN MÉTRICAS
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('chat_configuration_error', {
                error: error.message
            });
        }
        
        return false;
    }
}

// ✅ FUNCIÓN PARA DESTRUIR EL CHAT
export function destruirChatFlotante() {
    try {
        explanationChat.destruir();
        console.log('💬 Chat flotante destruido');
        return true;
    } catch (error) {
        console.error('❌ Error destruyendo chat:', error);
        return false;
    }
}

// ==================== LOGGING ====================
console.log('💬 ui-helper.js CON MÉTRICAS Y EFECTO DE ESCRITURA cargado correctamente');
console.log('✅ Funcionalidades: Chat flotante + Reconocimiento de voz + EFECTO ESCRITURA GRADUAL + TRACKING INTEGRADO');