// js/activities-manager.js - Gestor de Actividades CON MENSAJES EMERGENTES
// ================================================================
// ✅ CORREGIDO: Nombre del alumno desde sessionStorage
// ✅ CORREGIDO: Nombre de actividad amigable (evita [object Object])
// ✅ CORREGIDO: Botón "Entendido" ahora VISIBLE y funcional
// ✅ MEJORADO: Mensajes en español argentino natural y motivadores
// ✅ AGREGADO: Animación tipo "pop" con bounce al aparecer el modal
// ================================================================

import { estadoGlobal, obtenerActividadesParaPerfil } from './config.js';

// ==================== CONFIGURACIÓN Y ESTADO ====================

let actividadesDisponibles = [];
let secuenciaActual = [];
let indiceSecuencia = 0;
let actividadesRealizadasN0 = [];

// Control del flujo secuencial N0
let flujoSecuencialN0 = {
    actividades: ['exploradores-sonido', 'aventura-silabas', 'supermercado', 'puente-palabras'],
    indiceActual: 0,
    enProgreso: false
};

// Control de llamadas duplicadas
let procesamientoEnCurso = false;
let mensajeFinalMostrado = false;

// ==================== INICIALIZACIÓN POR PERFIL ====================

function inicializarActividadesPorPerfil() {
    const nombrePerfil = estadoGlobal.perfil?.nombre_visible;
    
    if (!nombrePerfil) {
        console.warn('⚠️ No hay perfil definido, usando actividades por defecto');
        const datosSession = JSON.parse(sessionStorage.getItem('datosLumai') || '{}');
        if (datosSession.perfil) {
            console.log(`🔧 Usando perfil de datosSession: ${datosSession.perfil}`);
            actividadesDisponibles = obtenerActividadesParaPerfil(datosSession.perfil);
            return;
        }
        // 'skater' desactivado temporalmente (en revisión)
        actividadesDisponibles = ["multiple-choice", "verdadero-falso", "basketball", "race", "sopa-de-letras"];
        return;
    }
    
    actividadesDisponibles = obtenerActividadesParaPerfil(nombrePerfil);
    console.log(`🎯 Actividades configuradas para perfil ${nombrePerfil}:`, actividadesDisponibles);
    
    if (nombrePerfil === 'N0') {
        flujoSecuencialN0.indiceActual = 0;
        flujoSecuencialN0.enProgreso = false;
        actividadesRealizadasN0 = [];
        mensajeFinalMostrado = false;
        console.log('🎯 Sistema N0 activado: Flujo secuencial de 4 actividades');
        console.log('📋 Secuencia:', flujoSecuencialN0.actividades);
    }
    
    secuenciaActual = [];
    indiceSecuencia = 0;
}

// ==================== GESTIÓN DE ACTIVIDADES ====================

export async function cargarActividad() {
    try {
        console.log('🎯 Iniciando carga de actividad...');
        
        if (procesamientoEnCurso) {
            console.log('⚠️ Ya hay una actividad cargándose, ignorando llamada duplicada');
            return;
        }
        procesamientoEnCurso = true;
        
        await limpiarCompletamenteActividades();
        
        if (actividadesDisponibles.length === 0) {
            inicializarActividadesPorPerfil();
        }
        
        const tipoActividad = obtenerSiguienteActividad();
        
        if (!tipoActividad) {
            console.log('🎉 ¡Todas las actividades completadas!');
            if (estadoGlobal.perfil?.nombre_visible === 'N0') {
                mostrarMensajeFinalN0();
            } else {
                mostrarMensajeFinalTodasCompletadas();
            }
            procesamientoEnCurso = false;
            return;
        }
        
        estadoGlobal.actividadActual = tipoActividad;
        console.log(`🎮 Cargando actividad: ${tipoActividad}`);
        
        // ⏳ V91: aviso mientras la IA prepara la actividad (antes la pantalla quedaba vacía)
        const contenedorEspera = estadoGlobal.elementosDOM?.actividadesEl || document.getElementById('actividades');
        if (contenedorEspera) {
            contenedorEspera.innerHTML = `
                <div style="text-align:center;padding:60px 20px;">
                    <div style="font-size:3em;animation:lumaiGirar 1.5s linear infinite;display:inline-block;">⏳</div>
                    <p style="font-size:1.3em;color:#00509e;font-weight:600;margin-top:15px;">Estoy preparando tu actividad...</p>
                    <p style="color:#666;">Esto puede tardar unos segundos.</p>
                </div>
                <style>@keyframes lumaiGirar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>`;
        }
        
        await cargarModuloActividad(tipoActividad);
        
        procesamientoEnCurso = false;
        console.log(`✅ Actividad ${tipoActividad} cargada correctamente`);
        
    } catch (error) {
        procesamientoEnCurso = false;
        console.error('❌ Error cargando actividad:', error);
        throw error;
    }
}

// ==================== SISTEMA DE ROTACIÓN ====================

function obtenerSiguienteActividad() {
    const esPerfilN0 = estadoGlobal.perfil?.nombre_visible === 'N0';
    
    if (esPerfilN0) {
        if (flujoSecuencialN0.indiceActual >= flujoSecuencialN0.actividades.length) {
            console.log('🎉 N0: ¡Todas las actividades del flujo secuencial completadas!');
            return null;
        }
        
        const siguienteActividad = flujoSecuencialN0.actividades[flujoSecuencialN0.indiceActual];
        console.log(`🎮 N0: Siguiente actividad secuencial: ${siguienteActividad} (${flujoSecuencialN0.indiceActual + 1}/${flujoSecuencialN0.actividades.length})`);
        
        return siguienteActividad;
        
    } else {
        const actividadesPendientes = actividadesDisponibles.filter(actividad => 
            !estadoGlobal.actividadesCompletadasPerfectamente.includes(actividad)
        );
        
        console.log(`🎯 Actividades pendientes: ${actividadesPendientes.join(', ')}`);
        console.log(`✅ Actividades completadas: ${estadoGlobal.actividadesCompletadasPerfectamente.join(', ')}`);
        
        if (actividadesPendientes.length === 0) {
            console.log('🎉 ¡Todas las actividades completadas!');
            return null;
        }
        
        if (secuenciaActual.length === 0 || indiceSecuencia >= secuenciaActual.length) {
            secuenciaActual = [...actividadesPendientes];
            barajarArray(secuenciaActual);
            indiceSecuencia = 0;
            console.log(`🔄 Nueva secuencia aleatoria: ${secuenciaActual.join(', ')}`);
        }

        const siguiente = secuenciaActual[indiceSecuencia];
        indiceSecuencia++;
        
        console.log(`🎮 Siguiente actividad: ${siguiente} (${indiceSecuencia}/${secuenciaActual.length})`);
        return siguiente;
    }
}

// ==================== CARGA DE MÓDULOS ====================

async function cargarModuloActividad(tipo) {
    try {
        let modulo;
        
        switch (tipo) {
            case 'exploradores-sonido':
                modulo = await import('./activities/activity-exploradores-sonido.js');
                break;
            case 'puente-palabras':
                modulo = await import('./activities/activity-puente-palabras.js');
                break;
            case 'aventura-silabas':
                modulo = await import('./activities/activity-aventura-silabas.js');
                break;
            case 'supermercado':
                modulo = await import('./activities/activity-supermercado.js');
                break;
            case 'sopa-de-letras':
                modulo = await import('./activities/activity-sopa-de-letras.js');
                break;
            case 'race':
                modulo = await import('./activities/activity-carrera-conocimiento.js');
                break;
            case 'basketball':
                modulo = await import('./activities/activity-basketball.js');
                break;
            case 'multiple-choice':
                modulo = await import('./activities/activity-mc.js');
                break;
            case 'verdadero-falso':
                modulo = await import('./activities/activity-vf.js');
                break;
            case 'skater':
                modulo = await import('./activities/activity-skater.js');
                break;
            default:
                throw new Error(`Tipo de actividad no soportado: ${tipo}`);
        }

        if (modulo.generarActividad) {
            estadoGlobal.actividadActual = await modulo.generarActividad();
        }

        if (modulo.renderizar) {
            await modulo.renderizar();
        }

    } catch (error) {
        console.error(`❌ Error cargando módulo ${tipo}:`, error);
        throw error;
    }
}

// ==================== COMPLETAR ACTIVIDADES ====================

export function completarRespuesta(respuestaEsCorrecta) {
    if (!respuestaEsCorrecta) return;
    
    estadoGlobal.respuestasCompletadas++;
    estadoGlobal.respuestasCorrectas++;
    
    console.log(`📊 Progreso: ${estadoGlobal.respuestasCorrectas}/${estadoGlobal.respuestasCompletadas} respuestas correctas`);
}

export function completarActividadCompleta(dominada) {
    const tipoActividad = estadoGlobal.actividadActual;
    const esPerfilN0 = estadoGlobal.perfil?.nombre_visible === 'N0';
    
    if (!tipoActividad) {
        console.error('❌ No hay actividad actual para completar');
        return;
    }
    
    // ✅ CORRECCIÓN: Extraer el string del tipo de actividad
    const tipoActividadString = typeof tipoActividad === 'string' 
        ? tipoActividad 
        : (tipoActividad.tipo || tipoActividad);
    
    console.log(`🎯 Completando actividad: ${tipoActividadString} (dominada: ${dominada})`);
    
    if (esPerfilN0) {
        console.log('🎯 N0: Actividad completada en flujo secuencial');
        
        if (!actividadesRealizadasN0.includes(tipoActividadString)) {
            actividadesRealizadasN0.push(tipoActividadString);
        }
        
        flujoSecuencialN0.indiceActual++;
        
        if (flujoSecuencialN0.indiceActual >= flujoSecuencialN0.actividades.length) {
            console.log('🎉 N0: ¡Flujo secuencial completado!');
        } else {
            console.log(`🎯 N0: Preparando siguiente actividad (${flujoSecuencialN0.indiceActual + 1}/${flujoSecuencialN0.actividades.length})`);
        }
        
    } else {
        estadoGlobal.totalActividadesCompletadas++;
        
        // ✅ CORRECCIÓN: Usar el string para verificar y guardar
        if (dominada && !estadoGlobal.actividadesCompletadasPerfectamente.includes(tipoActividadString)) {
            estadoGlobal.actividadesCompletadasPerfectamente.push(tipoActividadString);
            console.log(`✅ Actividad dominada: ${tipoActividadString}`);
        }
        
        mostrarMensajeCompletacionActividad(tipoActividadString, dominada);
    }
}

// ==================== SISTEMA DE MENSAJES EMERGENTES ====================

function obtenerNombreActividadAmigable(tipoActividad) {
    const nombres = {
        'multiple-choice': 'Opción Múltiple',
        'verdadero-falso': 'Verdadero o Falso',
        'basketball': 'Basketball',
        'skater': 'Skater',
        'race': 'Carrera del Conocimiento',
        'sopa-de-letras': 'Sopa de Letras'
    };
    
    if (typeof tipoActividad === 'string') {
        return nombres[tipoActividad] || tipoActividad;
    }
    
    if (tipoActividad && tipoActividad.tipo) {
        return nombres[tipoActividad.tipo] || tipoActividad.tipo;
    }
    
    return 'esta actividad';
}

function obtenerNombreAlumno() {
    const datosSession = JSON.parse(sessionStorage.getItem('datosLumai') || '{}');
    if (datosSession.nombreAlumno) {
        return datosSession.nombreAlumno;
    }
    
    if (estadoGlobal.perfil?.nombre_visible && !['N0', 'N1', 'N2', 'N3'].includes(estadoGlobal.perfil.nombre_visible)) {
        return estadoGlobal.perfil.nombre_visible;
    }
    
    return 'amigo';
}

function mostrarMensajeCompletacionActividad(tipoActividad, dominada) {
    const perfil = estadoGlobal.perfil;
    const nombreAlumno = obtenerNombreAlumno();
    const nombreActividad = obtenerNombreActividadAmigable(tipoActividad);
    
    let mensaje = '';
    let emoji = '';
    
    const nivelEmocional = perfil?.dimensiones?.regulacion_emocional || 'medio';
    
    if (dominada) {
        emoji = '🎉';
        
        if (nivelEmocional === 'bajo') {
            mensaje = `¡Qué crack ${nombreAlumno}! 

¡Completaste ${nombreActividad} perfectamente! 

¡Lo hiciste re bien, todas las respuestas correctas! 

¡Sos un genio! 🌟✨`;
        } else if (nivelEmocional === 'medio') {
            mensaje = `¡Excelente ${nombreAlumno}! 

Completaste ${nombreActividad} exitosamente.

¡Todas las respuestas correctas! 

¡Seguí así! 👏`;
        } else {
            mensaje = `Muy bien ${nombreAlumno}.

Completaste ${nombreActividad} correctamente.

Todas las respuestas fueron acertadas.

Continuá con la siguiente. ✅`;
        }
        
    } else {
        emoji = '👍';
        
        if (nivelEmocional === 'bajo') {
            mensaje = `¡Muy bien ${nombreAlumno}! 

Completaste ${nombreActividad}.

¡Dale para adelante, lo estás haciendo bárbaro! 

Seguimos practicando juntos. 💪😊`;
        } else if (nivelEmocional === 'medio') {
            mensaje = `¡Bien hecho ${nombreAlumno}! 

Completaste ${nombreActividad}.

Vamos con la siguiente actividad. 👍`;
        } else {
            mensaje = `${nombreAlumno}, completaste ${nombreActividad}.

Continuemos con la próxima. ✓`;
        }
    }
    
    console.log('💬 Mostrando mensaje de completación:', { 
        tipoActividad, 
        nombreActividad,
        nombreAlumno,
        dominada, 
        nivelEmocional 
    });
    
    mostrarModal(mensaje, emoji, () => {
        console.log('🎮 Usuario hizo clic en Entendido, cargando siguiente actividad...');
        setTimeout(() => {
            cargarActividad();
        }, 500);
    });
}

function mostrarMensajeFinalTodasCompletadas() {
    const perfil = estadoGlobal.perfil;
    const nombreAlumno = obtenerNombreAlumno();
    const nivelEmocional = perfil?.dimensiones?.regulacion_emocional || 'medio';
    
    let mensaje = '';
    
    if (nivelEmocional === 'bajo') {
        mensaje = `¡FELICITACIONES ${nombreAlumno.toUpperCase()}! 🎊

¡Completaste TODAS las actividades! 

¡Sos un groso, aprendiste un montón! 

¡Lo hiciste increíble! 

🌟✨🎉✨🌟`;
    } else if (nivelEmocional === 'medio') {
        mensaje = `¡Felicitaciones ${nombreAlumno}! 🎯

Completaste todas las actividades exitosamente.

¡Excelente trabajo en tu aprendizaje! 

👏🌟`;
    } else {
        mensaje = `¡Excelente trabajo ${nombreAlumno}! ✅

Completaste todas las actividades disponibles.

Tu desempeño fue muy bueno.

🎯`;
    }
    
    console.log('🎊 Mostrando mensaje final de todas las actividades completadas');
    
    mostrarModal(mensaje, '🏆', null, true);
}

function mostrarModal(mensaje, emoji = '💬', onCerrar = null, esFinal = false) {
    let modal = estadoGlobal.elementosDOM?.ventanaModalEl || document.getElementById('ventana-modal');
    
    if (!modal) {
        console.warn('⚠️ No se encontró modal existente, creando uno nuevo');
        modal = document.createElement('div');
        modal.id = 'ventana-modal';
        document.body.appendChild(modal);
        
        if (estadoGlobal.elementosDOM) {
            estadoGlobal.elementosDOM.ventanaModalEl = modal;
        }
    }
    
    const textoBoton = esFinal ? '🏠 Volver al Inicio' : '¡Entendido!';
    
    const estilosAnimacion = `
        <style id="modal-animations">
            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    backdrop-filter: blur(0px);
                }
                to {
                    opacity: 1;
                    backdrop-filter: blur(8px);
                }
            }
            
            @keyframes modalPopIn {
                0% {
                    opacity: 0;
                    transform: scale(0.7) translateY(-30px);
                }
                50% {
                    transform: scale(1.05);
                }
                100% {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            @keyframes emojiPulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.2);
                }
            }
        </style>
    `;
    
    if (!document.getElementById('modal-animations')) {
        document.head.insertAdjacentHTML('beforeend', estilosAnimacion);
    }
    
    modal.innerHTML = `
        <div style="
            background: white; 
            margin: 5% auto; 
            padding: 25px 30px; 
            border-radius: 20px; 
            width: 85%; 
            max-width: 480px; 
            text-align: center; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            animation: modalPopIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            position: relative;
        ">
            <div style="
                font-size: 3em; 
                margin-bottom: 15px;
                animation: emojiPulse 2s ease-in-out infinite;
            ">${emoji}</div>
            
            <h2 style="
                color: #28a745; 
                margin-bottom: 18px; 
                font-size: 1.5em;
                font-weight: bold;
            ">
                💬 LUMAI te dice:
            </h2>
            
            <div style="
                margin-bottom: 20px; 
                line-height: 1.5; 
                font-size: 1.05em; 
                color: #333;
                white-space: pre-line;
                font-weight: 500;
            ">
                ${mensaje}
            </div>
            
            <button 
                id="btn-cerrar-modal" 
                style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    border: none; 
                    padding: 12px 32px; 
                    border-radius: 12px; 
                    font-weight: bold; 
                    cursor: pointer; 
                    font-size: 1.1em;
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                "
                onmouseover="this.style.transform='translateY(-3px) scale(1.05)'; this.style.boxShadow='0 10px 30px rgba(102, 126, 234, 0.7)';"
                onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.5)';"
            >
                ${textoBoton}
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '999999';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.overflow = 'auto';
    modal.style.backgroundColor = 'rgba(0,0,0,0.75)';
    modal.style.backdropFilter = 'blur(8px)';
    modal.style.animation = 'modalFadeIn 0.3s ease-out';
    
    setTimeout(() => {
        const botonCerrar = document.getElementById('btn-cerrar-modal');
        if (botonCerrar) {
            console.log('✅ Botón "Entendido" encontrado y configurado');
            
            botonCerrar.onclick = () => {
                console.log('🖱️ Click en botón Entendido');
                cerrarModal();
                
                if (esFinal) {
                    console.log('🏠 Redirigiendo al inicio...');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 300);
                } else if (onCerrar) {
                    console.log('🎮 Ejecutando callback para cargar siguiente actividad...');
                    onCerrar();
                }
            };
        } else {
            console.error('❌ No se encontró el botón btn-cerrar-modal');
        }
    }, 100);
    
    modal.onclick = (event) => {
        if (event.target === modal) {
            console.log('⚠️ Click fuera del modal - no se cierra (debe usar el botón)');
        }
    };
}

function cerrarModal() {
    const modal = estadoGlobal.elementosDOM?.ventanaModalEl || document.getElementById('ventana-modal');
    if (modal) {
        modal.style.animation = 'modalFadeIn 0.2s ease-out reverse';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.innerHTML = '';
        }, 200);
    }
}

// ==================== FUNCIONES AUXILIARES ====================

async function limpiarCompletamenteActividades() {
    const actividadesContainer = estadoGlobal.elementosDOM?.actividadesEl || document.getElementById('actividades');
    if (actividadesContainer) {
        actividadesContainer.innerHTML = '';
        console.log('🧹 Contenedor de actividades limpiado');
    } else {
        console.warn('⚠️ No se encontró el contenedor de actividades para limpiar');
    }
    
    const estilosDinamicos = document.querySelectorAll('style[data-actividad]');
    estilosDinamicos.forEach(estilo => estilo.remove());
    
    estadoGlobal.respuestasCompletadas = 0;
    estadoGlobal.respuestasCorrectas = 0;
    
    console.log('🧹 DOM de actividades y estado limpiados correctamente');
}

function barajarArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function mostrarMensajeFinalN0() {
    if (mensajeFinalMostrado) {
        console.log('⚠️ N0: Mensaje final ya mostrado, evitando duplicado');
        return;
    }
    mensajeFinalMostrado = true;
    
    console.log('🎉 N0: Mostrando mensaje final');
    
    const nombreAlumno = obtenerNombreAlumno();
    
    const mensajeFinal = `¡FELICITACIONES ${nombreAlumno.toUpperCase()}! 

COMPLETASTE TODAS LAS ACTIVIDADES DE HOY.

¡LO HICISTE MUY BIEN!

AHORA PODÉS DESCANSAR O SEGUIR EXPLORANDO.`;

    const actividadesEl = estadoGlobal.elementosDOM.actividadesEl;
    if (actividadesEl) {
        actividadesEl.innerHTML = `
            <div style="
                text-align: center; 
                padding: 40px 20px; 
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                border-radius: 20px;
                margin: 20px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                font-family: 'Comic Sans MS', cursive;
            ">
                <div style="font-size: 4em; margin-bottom: 20px;">🎉</div>
                <h1 style="font-size: 2.5em; margin-bottom: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    ¡FELICITACIONES!
                </h1>
                <div style="font-size: 1.8em; line-height: 1.6; white-space: pre-line; margin-bottom: 30px;">
                    ${mensajeFinal}
                </div>
                <div style="font-size: 3em;">⭐🌟⭐</div>
            </div>
        `;
    }
}

// ==================== FUNCIONES DE EXTRACCIÓN ====================

export function extraerPalabrasClave() {
    const explicacion = estadoGlobal.explicacionGenerada || '';
    
    const oraciones = explicacion
        .split(/[.!?]+/)
        .map(oracion => oracion.trim())
        .filter(oracion => oracion.length > 10 && oracion.length < 100);
    
    const palabras = explicacion
        .toLowerCase()
        .replace(/[^\w\sáéíóúñü]/g, ' ')
        .split(/\s+/)
        .filter(palabra => palabra.length > 4 && palabra.length < 15)
        .filter(palabra => !['para', 'este', 'esta', 'estas', 'estos', 'donde', 'cuando', 'como', 'cual', 'cuales'].includes(palabra));
    
    const palabrasUnicas = [...new Set(palabras)].slice(0, 10);
    
    return {
        palabrasImportantes: palabrasUnicas,
        oracionesEducativas: oraciones.slice(0, 6),
        temaGeneral: estadoGlobal.tema || 'tema educativo'
    };
}

// ==================== EXPORTACIONES ====================

export {
    actividadesDisponibles,
    secuenciaActual,
    indiceSecuencia,
    inicializarActividadesPorPerfil,
    limpiarCompletamenteActividades,
    barajarArray,
    cerrarModal
};

window.cerrarModal = cerrarModal;

console.log("🎯 activities-manager.js COMPLETAMENTE CORREGIDO cargado");
console.log("✅ Correcciones: Nombre alumno + Nombre actividad + Botón visible + Mensajes argentinos + Animación pop");
