// js/ui-helper.js - Chat flotante para explicaciones CON VOZ Y MÉTRICAS + EFECTO ESCRITURA
// =====================================================================================

import { llamarGeminiAPI } from './ai-engine.js';
import { estadoGlobal, generarPromptHibrido } from './config.js';

class ExplanationChat {
    constructor() {
        this.chatContainer = null;
        this.isOpen = false;
        this.explicacionContexto = '';
        this.contadorPreguntas = 0;
        this.ultimaRespuesta = '';
        this.recognition = null;
        this.micBtn = null;
        this.isTyping = false; // 🎯 NUEVO: Para controlar el efecto de escritura
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
                    <div class="ai-avatar">🤖</div>
                    <h3 id="chatTitulo">Asistente IA</h3>
                    <p id="chatSubtitulo">Pregúntame sobre la explicación</p>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <div class="message bot">
                        <div class="message-bubble" id="mensajeInicial">
                            ¡Hola! Leí la explicación y estoy acá para ayudarte. ¿Tenés alguna pregunta sobre el tema? 📚
                        </div>
                        <div class="message-time">Ahora</div>
                    </div>
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
                        placeholder="Pregunta sobre la explicación..."
                        maxlength="500"
                    >
                    <button class="send-btn" id="sendBtn">📤</button>
                </div>
            </div>

            <button class="chat-toggle-btn" id="chatToggleBtn">
                💬
                <div class="notification-badge" id="notificationBadge">?</div>
            </button>
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
            this.scrollToBottom();
            
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
            this.scrollToBottom();
            
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
                                       "Pregunta sobre la explicación...";
        
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
                this.addMessage(`¡Hola ${estadoGlobal.perfil?.nombre_visible || 'estudiante'}! 🎈 

¿Todo bien con la explicación? 

Si tenés alguna duda, no dudes en preguntarme. ¡Estoy acá para ayudarte!

<div class="quick-response-buttons">
    <button class="quick-btn">👍 Todo bien</button>
    <button class="quick-btn">❓ Tengo dudas</button>
    <button class="quick-btn">🔄 Resumí todo</button>
</div>`, 'bot', true, false); // Sin efecto de escritura para este mensaje especial
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
        
        const perfilName = estadoGlobal.perfil?.nombre_visible;
        
        const mensajePersonalizado = mensajesIniciales[perfilName] || 
                                   "¡Hola! Leí la explicación y estoy acá para ayudarte. ¿Tenés alguna pregunta sobre el tema? 📚";
        
        const placeholderPersonalizado = placeholdersPersonalizados[perfilName] || 
                                       "Pregunta sobre la explicación...";
        
        const tituloPersonalizado = titulosPersonalizados[perfilName] || 
                                  "Asistente IA";
        
        const subtituloPersonalizado = subtitulosPersonalizados[perfilName] || 
                                     "Pregúntame sobre la explicación";
        
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
        this.chatToggleBtn.innerHTML = '💬<div class="notification-badge" id="notificationBadge">?</div>';
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
    
    sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isTyping) return; // 🎯 No enviar si se está escribiendo
        
        this.addMessage(message, 'user', false, false); // Usuario sin efecto de escritura
        this.chatInput.value = '';
        this.contadorPreguntas++;
        
        // ✅ REGISTRAR PREGUNTA EN MÉTRICAS
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('chat_question_asked', {
                questionLength: message.length,
                questionNumber: this.contadorPreguntas,
                profileType: estadoGlobal.perfil?.nombre_visible
            });
        }
        
        const palabrasConfusion = ['no entiendo', 'confuso', 'difícil', 'no comprendo', 'ayuda', 'explicá mejor'];
        const estaConfundido = palabrasConfusion.some(palabra => message.toLowerCase().includes(palabra));
        
        this.showTypingIndicator();
        
        if (estaConfundido && estadoGlobal.perfil && estadoGlobal.perfil.dimensiones.comprension_lectora === "bajo") {
            // ✅ REGISTRAR CONFUSIÓN EN MÉTRICAS
            if (window.lumaiTracker) {
                window.lumaiTracker.recordCustomEvent('confusion_detected', {
                    confusionWords: palabrasConfusion.filter(palabra => message.toLowerCase().includes(palabra)),
                    profileType: estadoGlobal.perfil.nombre_visible
                });
            }
            
            setTimeout(() => {
                this.hideTypingIndicator();
                const respuestaEspecial = this.generarRespuestaDeApoyo();
                this.addMessage(respuestaEspecial, 'bot', true, true); // Con efecto de escritura
            }, 1000);
        } else {
            this.generateAIResponse(message);
        }
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
            btn.addEventListener('click', (e) => {
                const respuesta = e.target.textContent;
                this.addMessage(respuesta, 'user', false, false); // Usuario sin efecto
                this.procesarRespuestaRapida(respuesta);
            });
        });
    }
    
    procesarRespuestaRapida(respuesta) {
        this.showTypingIndicator();
        
        // ✅ REGISTRAR RESPUESTA RÁPIDA EN MÉTRICAS
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('quick_response_used', {
                response: respuesta,
                profileType: estadoGlobal.perfil?.nombre_visible
            });
        }
        
        setTimeout(() => {
            this.hideTypingIndicator();
            
            if (respuesta.includes('Sí') || respuesta.includes('Entendí') || respuesta.includes('Todo bien')) {
                const mensajesPositivos = {
                    "N1": "¡Genial! 🎈 ¡Sos un campeón! ¿Querés que te explique algo más del tema?",
                    "N2": "¡Excelente! 🌸 Me alegra que lo hayas entendido. ¿Hay algo más que te gustaría saber?",
                    "N3": "Perfecto. Comprendiste el concepto correctamente. ¿Deseas profundizar en algún aspecto específico?"
                };
                this.addMessage(mensajesPositivos[estadoGlobal.perfil?.nombre_visible] || "¡Excelente! ¿Algo más?", 'bot', false, true);
            } else if (respuesta.includes('Resumí') || respuesta.includes('resumen')) {
                this.generarResumenPersonalizado();
            } else if (respuesta.includes('dudas') || respuesta.includes('No entendí') || respuesta.includes('confunde')) {
                const mensajesAyuda = {
                    "N1": "¡No te preocupes! 🎈 Te lo explico de otra manera más fácil. ¿Qué parte no entendiste bien?",
                    "N2": "Está bien, vamos paso a paso. 🌸 ¿Qué parte específica te resulta confusa?",
                    "N3": "Entiendo. Reformulemos el concepto desde otro ángulo. ¿Qué aspecto requiere mayor clarificación?"
                };
                this.addMessage(mensajesAyuda[estadoGlobal.perfil?.nombre_visible] || "No problem, te ayudo.", 'bot', false, true);
            } else if (respuesta.includes('ejemplo')) {
                this.generarEjemploPersonalizado();
            }
        }, 800);
    }
    
    async generarResumenPersonalizado() {
        try {
            const adaptaciones = generarPromptHibrido(estadoGlobal.perfil);
            const nombreEstudiante = estadoGlobal.perfil?.nombre_visible || 'estudiante';
            
            const prompt = `
Eres un tutor que debe hacer un resumen de la explicación para ${nombreEstudiante}.

PERFIL DEL ESTUDIANTE: ${nombreEstudiante}
${adaptaciones}

EXPLICACIÓN COMPLETA:
"""${this.explicacionContexto}"""

INSTRUCCIONES:
- Hacé un resumen súper claro de los puntos más importantes
- Máximo 80 palabras para estudiantes con dificultades, 100 para nivel medio, 120 para avanzado
- Usá párrafos cortos separados por doble salto de línea
- Terminá preguntando si quiere que profundices en algún punto

Resumen personalizado para ${nombreEstudiante}:`;
            
            const resumen = await llamarGeminiAPI(prompt);
            this.addMessage(resumen, 'bot', false, true); // Con efecto de escritura
            
        } catch (error) {
            this.addMessage("Te hago un resumen rápido de lo más importante de la explicación. ¿Qué parte te interesa más?", 'bot', false, true);
        }
    }
    
    async generarEjemploPersonalizado() {
        try {
            const adaptaciones = generarPromptHibrido(estadoGlobal.perfil);
            const nombreEstudiante = estadoGlobal.perfil?.nombre_visible || 'estudiante';
            
            const prompt = `
Creá un ejemplo súper claro para ${nombreEstudiante} basado en la explicación.

PERFIL DEL ESTUDIANTE: ${nombreEstudiante}
${adaptaciones}

EXPLICACIÓN:
"""${this.explicacionContexto}"""

INSTRUCCIONES:
- Creá un ejemplo práctico y fácil de entender
- Usá situaciones de la vida cotidiana que el estudiante pueda relacionar
- Máximo 60 palabras
- Sé concreto y visual

Ejemplo práctico para ${nombreEstudiante}:`;
            
            const ejemplo = await llamarGeminiAPI(prompt);
            this.addMessage(ejemplo, 'bot', false, true); // Con efecto de escritura
            
        } catch (error) {
            this.addMessage("Te doy un ejemplo práctico para que sea más fácil de entender. ¿Te ayuda?", 'bot', false, true);
        }
    }
    
    async generateAIResponse(userMessage) {
        try {
            const adaptaciones = generarPromptHibrido(estadoGlobal.perfil);
            const nombreEstudiante = estadoGlobal.perfil?.nombre_visible || 'estudiante';
            const nivelEstudiante = estadoGlobal.perfil?.dimensiones?.comprension_lectora || 'medio';
            
            let instruccionesEspecificas = "";
            let longitudMaxima = 120;
            let incluyeBotones = false;
            
            if (nivelEstudiante === "bajo") {
                instruccionesEspecificas = `
INSTRUCCIONES ESPECIALES PARA ESTUDIANTE CON DIFICULTADES:
- Respuesta MÁXIMO 60 palabras
- Explicá UNA SOLA idea por vez
- Usá ejemplos súper simples de la vida cotidiana
- SIEMPRE preguntá si entendió antes de continuar
- Agregá al final: ¿Entendiste? ¿Te explico algo más?
- Usá emojis para hacer más visual
- Dividí conceptos complejos en pasos pequeños`;
                longitudMaxima = 60;
                incluyeBotones = true;
            } else if (nivelEstudiante === "medio") {
                instruccionesEspecificas = `
INSTRUCCIONES PARA ESTUDIANTE NIVEL MEDIO:
- Respuesta MÁXIMO 90 palabras  
- Podés explicar 2 conceptos relacionados
- Usá ejemplos claros y concretos
- Preguntá ocasionalmente si necesita más detalles
- Equilibrá información con verificación de comprensión`;
                longitudMaxima = 90;
                incluyeBotones = false;
            } else {
                instruccionesEspecificas = `
INSTRUCCIONES PARA ESTUDIANTE AVANZADO:
- Respuesta MÁXIMO 120 palabras
- Podés usar terminología técnica apropiada
- Conectá múltiples conceptos
- Preguntá si quiere profundizar en aspectos específicos`;
                longitudMaxima = 120;
                incluyeBotones = false;
            }
            
            const prompt = `
Eres un tutor educativo especializado que acompaña al estudiante ${nombreEstudiante}. 

PERFIL DEL ESTUDIANTE: ${nombreEstudiante}
${adaptaciones}

${instruccionesEspecificas}

EXPLICACIÓN SOBRE LA QUE PUEDE PREGUNTAR:
"""${this.explicacionContexto}"""

PREGUNTA DEL ESTUDIANTE: "${userMessage}"

REGLAS FUNDAMENTALES:
- Adaptá tu respuesta según las dimensiones pedagógicas del estudiante SIN mencionarlas
- Responde SOLO basándote en el contenido de la explicación proporcionada
- Si la pregunta no está relacionada, redirigí amigablemente al tema
- Máximo ${longitudMaxima} palabras en tu respuesta
- Usá párrafos cortos separados por doble salto de línea
- Sé cálido, motivador y usa español rioplatense (vos, sos, etc.)
- Terminá con una pregunta que verifique comprensión

Respuesta pedagógica para ${nombreEstudiante}:`;

            const response = await llamarGeminiAPI(prompt);
            
            this.hideTypingIndicator();
            
            // ✅ REGISTRAR RESPUESTA IA EN MÉTRICAS
            if (window.lumaiTracker) {
                window.lumaiTracker.recordCustomEvent('ai_response_generated', {
                    responseLength: response.length,
                    maxWordsAllowed: longitudMaxima,
                    hasQuickButtons: incluyeBotones,
                    profileType: estadoGlobal.perfil?.nombre_visible
                });
            }
            
            if (incluyeBotones) {
                const respuestaConBotones = response + `

<div class="quick-response-buttons">
    <button class="quick-btn">✅ Sí, entendí</button>
    <button class="quick-btn">❓ No entendí bien</button>
    <button class="quick-btn">🔄 Explicá de otra forma</button>
</div>`;
                this.addMessage(respuestaConBotones, 'bot', true, false); // Con botones, sin efecto de escritura
            } else {
                this.addMessage(response, 'bot', false, true); // 🎯 CON EFECTO DE ESCRITURA
            }
            
        } catch (error) {
            console.error('Error generando respuesta:', error);
            this.hideTypingIndicator();
            
            // ✅ REGISTRAR ERROR EN MÉTRICAS
            if (window.lumaiTracker) {
                window.lumaiTracker.recordCustomEvent('ai_response_error', {
                    error: error.message,
                    profileType: estadoGlobal.perfil?.nombre_visible
                });
            }
            
            const mensajesError = {
                "N1": "¡Uy! 🎈 Tuve un problemita técnico. ¿Podés preguntarme de nuevo? ¡Estoy acá para ayudarte!",
                "N2": "Lo siento mucho, tuve una dificultad técnica. 🌸 ¿Podrías repetir tu pregunta? Te voy a ayudar.",
                "N3": "Disculpá, hubo un error técnico temporal. ¿Podrías reformular tu pregunta? Estoy para asistirte."
            };
            
            const mensajeError = mensajesError[estadoGlobal.perfil?.nombre_visible] || 
                              "Lo siento, tuve un problema al procesar tu pregunta. ¿Podrías intentar de nuevo?";
            
            this.addMessage(mensajeError, 'bot', false, true); // Con efecto de escritura
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