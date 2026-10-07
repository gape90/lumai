// js/lumai-metrics-tracker.js - Sistema de Métricas para LUMAI
// ==============================================================

class LumaiMetricsTracker {
    constructor() {
        this.storageKey = 'lumai_evaluation_data';
        this.currentSession = null;
        this.isSessionActive = false;
        this.evaluationData = null; // ✅ AGREGADO: Referencia a datos en memoria
        
        console.log('📊 LumaiMetricsTracker iniciado');
        this.initializeStorage();
    }
    
    // ==================== INICIALIZACIÓN ====================
    
    initializeStorage() {
        try {
            let data = this.loadData();
            if (!data) {
                data = {
                    version: '1.0',
                    students: {},
                    createdAt: new Date().toISOString(),
                    lastUpdate: new Date().toISOString()
                };
                this.saveData(data);
                console.log('📊 Almacenamiento de métricas inicializado');
            } else {
                console.log('📊 Datos de métricas existentes cargados');
            }
            
            // ✅ AGREGADO: Mantener referencia en memoria
            this.evaluationData = data;
            
        } catch (error) {
            console.error('❌ Error inicializando almacenamiento:', error);
        }
    }
    
    loadData() {
        try {
            const rawData = localStorage.getItem(this.storageKey);
            if (!rawData) return null;
            
            const data = JSON.parse(rawData);
            // ✅ AGREGADO: Actualizar referencia en memoria
            this.evaluationData = data;
            return data;
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            return null;
        }
    }
    
    // ✅ CORREGIDO: Manejo de parámetro data opcional
    saveData(data) {
        try {
            // ✅ ARREGLO PRINCIPAL: Si no se pasa data, usar evaluationData o crear nuevo
            if (!data) {
                data = this.evaluationData || {
                    version: '1.0',
                    students: {},
                    createdAt: new Date().toISOString()
                };
            }
            
            data.lastUpdate = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            
            // ✅ AGREGADO: Actualizar referencia en memoria
            this.evaluationData = data;
            
            console.log('💾 Datos guardados en localStorage');
            return true;
        } catch (error) {
            console.error('❌ Error guardando datos:', error);
            return false;
        }
    }
    
    // ==================== GESTIÓN DE SESIONES ====================
    
    startSession(studentData) {
        try {
            if (this.isSessionActive) {
                console.warn('⚠️ Ya hay una sesión activa');
                return false;
            }
            
            const session = {
                studentName: studentData.nombre || studentData.name || 'Estudiante',
                subject: studentData.materia || studentData.subject || 'Materia',
                topic: studentData.tema || studentData.topic || 'Tema',
                profile: studentData.perfil || studentData.profile || 'N2',
                startTime: new Date().toISOString(),
                endTime: null,
                timeSpent: 0,
                correctAnswers: 0,
                totalAnswers: 0,
                activities: [],
                errors: [],
                customEvents: []
            };
            
            this.currentSession = session;
            this.isSessionActive = true;
            
            // Registrar evento de inicio
            this.recordCustomEvent('session_started', {
                profile: session.profile,
                subject: session.subject,
                topic: session.topic
            });
            
            console.log('🚀 Sesión iniciada para:', session.studentName, '-', session.subject);
            return true;
            
        } catch (error) {
            console.error('❌ Error iniciando sesión:', error);
            return false;
        }
    }
    
    endSession() {
        try {
            if (!this.isSessionActive || !this.currentSession) {
                console.warn('⚠️ No hay sesión activa para finalizar');
                return false;
            }
            
            // Completar datos de la sesión
            this.currentSession.endTime = new Date().toISOString();
            this.currentSession.timeSpent = new Date(this.currentSession.endTime) - new Date(this.currentSession.startTime);
            
            // Guardar la sesión en los datos persistentes
            this.saveSessionToStorage();
            
            // Limpiar sesión actual
            this.isSessionActive = false;
            const sessionData = this.currentSession;
            this.currentSession = null;
            
            console.log('🏁 Sesión finalizada');
            return sessionData;
            
        } catch (error) {
            console.error('❌ Error finalizando sesión:', error);
            return false;
        }
    }
    
    // ✅ MEJORADO: Auto-guardado más robusto
    saveSessionToStorage() {
        try {
            const data = this.loadData();
            if (!data) {
                console.error('❌ No se pudieron cargar datos para guardar sesión');
                return false;
            }
            
            const session = this.currentSession;
            if (!session) {
                console.error('❌ No hay sesión actual para guardar');
                return false;
            }
            
            const studentKey = `${session.studentName}_${session.subject}`.toLowerCase().replace(/\s+/g, '_');
            
            // Crear o actualizar estudiante
            if (!data.students[studentKey]) {
                data.students[studentKey] = {
                    name: session.studentName,
                    subject: session.subject,
                    profile: session.profile,
                    sessions: [],
                    firstSession: session.startTime,
                    lastSession: session.startTime,
                    totalSessions: 0,
                    totalTimeSpent: 0,
                    totalAnswers: 0,
                    totalCorrectAnswers: 0
                };
            }
            
            const student = data.students[studentKey];
            
            // Actualizar datos del estudiante
            student.sessions.push({...session});
            student.lastSession = session.startTime;
            student.totalSessions += 1;
            student.totalTimeSpent += session.timeSpent;
            student.totalAnswers += session.totalAnswers;
            student.totalCorrectAnswers += session.correctAnswers;
            student.profile = session.profile; // Actualizar perfil por si cambió
            
            // Guardar datos actualizados
            this.saveData(data);
            
            console.log('💾 Sesión guardada para estudiante:', student.name);
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando sesión:', error);
            return false;
        }
    }
    
    // ✅ AGREGADO: Auto-guardado periódico de sesión
    autoSaveSession() {
        try {
            if (this.isSessionActive && this.currentSession) {
                this.saveSessionToStorage();
                console.log('🔄 Auto-guardado de sesión realizado');
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error en auto-guardado:', error);
            return false;
        }
    }
    
    // ==================== REGISTRO DE RESPUESTAS ====================
    
    recordAnswer(question, userAnswer, correctAnswer, isCorrect, concept = 'General') {
        try {
            if (!this.isSessionActive || !this.currentSession) {
                console.warn('⚠️ No hay sesión activa para registrar respuesta');
                return false;
            }
            
            // Actualizar contadores de la sesión
            this.currentSession.totalAnswers += 1;
            if (isCorrect) {
                this.currentSession.correctAnswers += 1;
            } else {
                // Registrar error
                this.currentSession.errors.push({
                    concept: concept,
                    question: question,
                    userAnswer: userAnswer,
                    correctAnswer: correctAnswer,
                    timestamp: new Date().toISOString()
                });
            }
            
            // ✅ AGREGADO: Auto-guardado cada 5 respuestas
            if (this.currentSession.totalAnswers % 5 === 0) {
                this.autoSaveSession();
            }
            
            console.log('📝 Respuesta registrada:', isCorrect ? '✅' : '❌', `(${this.currentSession.correctAnswers}/${this.currentSession.totalAnswers})`);
            return true;
            
        } catch (error) {
            console.error('❌ Error registrando respuesta:', error);
            return false;
        }
    }
    
    // ==================== GESTIÓN DE ACTIVIDADES ====================
    
    startActivity(activityType) {
        if (this.currentSession) {
            this.recordCustomEvent('activity_started', {
                activityType: activityType,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    endActivity(completed = false, score = 0) {
        if (this.currentSession) {
            this.recordCustomEvent('activity_completed', {
                completed: completed,
                score: score,
                timestamp: new Date().toISOString()
            });
            
            // ✅ AGREGADO: Auto-guardado al finalizar actividad
            this.autoSaveSession();
        }
    }
    
    // ==================== EVENTOS PERSONALIZADOS ====================
    
    // ✅ MEJORADO: Auto-guardado en eventos críticos
    recordCustomEvent(eventType, eventData = {}) {
        try {
            if (!this.currentSession) {
                console.warn('⚠️ No hay sesión activa para registrar evento');
                return false;
            }
            
            const event = {
                type: eventType,
                data: eventData,
                timestamp: new Date().toISOString()
            };
            
            this.currentSession.customEvents.push(event);
            
            // ✅ AGREGADO: Auto-guardado en eventos importantes
            const criticalEvents = [
                'response_recorded', 
                'activity_completed', 
                'session_started',
                'explanation_content_saved'
            ];
            
            if (criticalEvents.includes(eventType)) {
                this.autoSaveSession();
            }
            
            console.log('🔔 Evento registrado:', eventType);
            return true;
            
        } catch (error) {
            console.error('❌ Error registrando evento:', error);
            return false;
        }
    }
    
    // ==================== ESTADÍSTICAS ====================
    
    getCurrentStats() {
        if (!this.currentSession) {
            return null;
        }
        
        const now = new Date();
        const startTime = new Date(this.currentSession.startTime);
        const duration = now - startTime;
        
        return {
            session: {
                isActive: this.isSessionActive,
                duration: duration,
                durationMinutes: Math.round(duration / 1000 / 60),
                correctAnswers: this.currentSession.correctAnswers,
                totalAnswers: this.currentSession.totalAnswers,
                accuracy: this.currentSession.totalAnswers > 0 
                    ? Math.round((this.currentSession.correctAnswers / this.currentSession.totalAnswers) * 100) 
                    : 0
            },
            student: {
                name: this.currentSession.studentName,
                subject: this.currentSession.subject,
                profile: this.currentSession.profile
            }
        };
    }
    
    getAllData() {
        return this.loadData();
    }
    
    // ==================== UTILIDADES ====================
    
    clearAllData() {
        try {
            localStorage.removeItem(this.storageKey);
            this.evaluationData = null; // ✅ AGREGADO: Limpiar referencia en memoria
            this.initializeStorage();
            console.log('🗑️ Todos los datos eliminados');
            return true;
        } catch (error) {
            console.error('❌ Error eliminando datos:', error);
            return false;
        }
    }
    
    exportData() {
        const data = this.loadData();
        if (!data) return null;
        
        return {
            ...data,
            exportedAt: new Date().toISOString()
        };
    }
    
    // ✅ AGREGADO: Método para forzar guardado manual
    forceSave() {
        try {
            if (this.isSessionActive && this.currentSession) {
                this.saveSessionToStorage();
                console.log('💾 Guardado forzado completado');
                return true;
            }
            console.warn('⚠️ No hay sesión activa para guardar');
            return false;
        } catch (error) {
            console.error('❌ Error en guardado forzado:', error);
            return false;
        }
    }
}

// ==================== INICIALIZACIÓN GLOBAL ====================

// Crear instancia global
window.lumaiTracker = new LumaiMetricsTracker();

// ✅ AGREGADO: Auto-guardado periódico cada 30 segundos
setInterval(() => {
    if (window.lumaiTracker && window.lumaiTracker.isSessionActive) {
        window.lumaiTracker.autoSaveSession();
    }
}, 30000); // 30 segundos

// ✅ AGREGADO: Guardado al cerrar/refrescar página
window.addEventListener('beforeunload', () => {
    if (window.lumaiTracker && window.lumaiTracker.isSessionActive) {
        window.lumaiTracker.forceSave();
    }
});

// Exponer funciones de debug
window.lumaiDebugMetrics = {
    showCurrentSession: () => console.log('Current session:', window.lumaiTracker.currentSession),
    showAllData: () => console.log('All data:', window.lumaiTracker.getAllData()),
    clearData: () => window.lumaiTracker.clearAllData(),
    getCurrentStats: () => console.log('Stats:', window.lumaiTracker.getCurrentStats()),
    forceSave: () => window.lumaiTracker.forceSave() // ✅ AGREGADO
};

console.log('📊 Sistema de métricas LUMAI cargado correctamente');
console.log('✅ Funcionalidades: Tracking transparente + Almacenamiento local + Análisis automático + Exportación de datos');
console.log('🔄 Auto-guardado: Cada 30 segundos + Eventos críticos + Al cerrar página');