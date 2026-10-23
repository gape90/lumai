// js/ui-controller.js - Controlador Principal de LUMAI CON MÉTRICAS
// ✅ CORRECCIÓN: Agregado event listener para botón de síntesis de voz
// ================================================================

import { 
    estadoGlobal, 
    datosSession, 
    obtenerPerfilPorNombre,
    generarPromptHibrido,
    validarDatosRequeridos,
    inicializarConfig
} from './config.js';

import { 
    llamarGeminiAPI,
    activarSintesisVoz,  // ⭐ CORREGIDO: Nombre correcto de la función
    detenerSintesisVoz,
    generateExplanation
} from './ai-engine.js';

import { 
    cargarActividad
} from './activities-manager.js';

import { 
    configurarChatFlotante
} from './ui-helper.js';

import './lumai-metrics-tracker.js';

import { renderizarClase, claseATexto } from './clase-renderer.js';
import { corregirRespuestaIA } from './chat-tutor.js';
import { buscarClaseBase } from './clases-base.js';
import { cargarReglas, calcularAjustes, perfilDesdePlantilla } from './adaptacion.js';

// ==================== ESTADO Y CONFIGURACIÓN ====================

let explicacionGenerada = '';
let actividadEnCurso = false;

// ==================== INICIALIZACIÓN PRINCIPAL ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LUMAI UI Controller iniciando...');
    
    if (window.location.pathname.includes('explicacion.html')) {
        inicializarAplicacionPrincipal();
    }
});

async function inicializarAplicacionPrincipal() {
    try {
        console.log('🔍 DEBUG: Contenido completo de sessionStorage:');
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            console.log(`   ${key}: ${value}`);
        }
        
        if (!validarDatosSessionConDebug()) {
            mostrarError('Datos de sesión inválidos. Redirigiendo al inicio...');
            setTimeout(function() {
                window.location.href = 'index.html';
            }, 3000);
            return;
        }

        if (!inicializarConfig()) {
            mostrarError('Error inicializando configuración. Redirigiendo al inicio...');
            setTimeout(function() {
                window.location.href = 'index.html';
            }, 3000);
            return;
        }

        configurarElementosDOM();
        inicializarEstadoBotones();
        inicializarSistemaMetricas();
        await generarContenidoEducativo();
        configurarChatFlotante();
        configurarEventos();  // ⭐ Esta función ahora incluye el event listener del botón
        
        console.log('✅ LUMAI inicializado completamente');
        
    } catch (error) {
        console.error('❌ Error inicializando LUMAI:', error);
        mostrarError('Error inicializando la aplicación. Por favor, recarga la página.');
    }
}

// ==================== VALIDACIÓN DE DATOS ====================

function validarDatosSessionConDebug() {
    console.log('🔍 Iniciando validación de datos de sesión...');
    
    const posiblesClaves = ['datosLumai', 'datosFormulario', 'datosSession'];
    let datosEncontrados = null;
    let claveUsada = null;
    
    for (let i = 0; i < posiblesClaves.length; i++) {
        const clave = posiblesClaves[i];
        const datos = sessionStorage.getItem(clave);
        console.log(`🔍 Verificando clave '${clave}':`, datos ? 'ENCONTRADA ✅' : 'NO ENCONTRADA ❌');
        
        if (datos) {
            try {
                datosEncontrados = JSON.parse(datos);
                claveUsada = clave;
                console.log(`✅ Datos encontrados en '${clave}':`, datosEncontrados);
                break;
            } catch (e) {
                console.warn(`⚠️ Error parseando datos de '${clave}':`, e);
            }
        }
    }
    
    if (!datosEncontrados) {
        console.error('❌ No se encontraron datos válidos en sessionStorage');
        return false;
    }
    
    console.log(`📦 Usando datos de: ${claveUsada}`);
    
    Object.assign(datosSession, {
        materia: datosEncontrados.materia || datosEncontrados.subject || '',
        tema: datosEncontrados.tema || datosEncontrados.topic || '',
        nombreAlumno: datosEncontrados.nombreAlumno || datosEncontrados.studentName || '',
        perfilSeleccionado: datosEncontrados.perfilSeleccionado || datosEncontrados.profile || 'N2',
        ciclo: datosEncontrados.ciclo || ''
    });
    
    console.log('📊 Datos de sesión configurados:', datosSession);
    
    if (!datosSession.materia || !datosSession.tema) {
        console.error('❌ Faltan datos críticos (materia o tema)');
        return false;
    }
    
    console.log('✅ Validación de datos completada exitosamente');
    return true;
}

// ==================== SISTEMA DE MÉTRICAS ====================

function inicializarSistemaMetricas() {
    if (!window.lumaiTracker) {
        console.warn('⚠️ Sistema de métricas no disponible');
        return;
    }
    
    try {
        const studentData = {
            nombre: datosSession.nombreAlumno || 'Estudiante',
            materia: datosSession.materia || 'Materia no especificada',
            tema: datosSession.tema || 'Tema no especificado',
            perfil: estadoGlobal.perfil ? estadoGlobal.perfil.nombre_visible : 'N2'
        };

        console.log('📊 Iniciando tracking con datos:', studentData);

        const trackingStarted = window.lumaiTracker.startSession(studentData);
        
        if (trackingStarted) {
            console.log('📊 Sistema de métricas iniciado para:', studentData.nombre);
            
            window.lumaiTracker.recordCustomEvent('profile_determined', {
                profileName: estadoGlobal.perfil ? estadoGlobal.perfil.nombre_visible : 'N2',
                profileType: estadoGlobal.perfil ? estadoGlobal.perfil.nombre_visible : 'N2'
            });
        } else {
            console.warn('⚠️ No se pudo iniciar el tracking de métricas');
        }

        window.addEventListener('beforeunload', function() {
            if (window.lumaiTracker) {
                window.lumaiTracker.endSession();
            }
        });

    } catch (error) {
        console.error('❌ Error inicializando sistema de métricas:', error);
    }
}

// ==================== CONFIGURACIÓN DOM ====================

function configurarElementosDOM() {
    estadoGlobal.elementosDOM = {
        explicacionEl: document.getElementById('contenido'),
        actividadesEl: document.getElementById('actividades'),
        btnIniciarActividades: document.getElementById('btnVerActividades'),
        btnVolverExplicacion: null,
        btnFinalizarClase: document.getElementById('btnFinalizarClase'),
        btnSintesisVoz: document.getElementById('leerExplicacion'),
        loadingEl: null,
        ventanaModalEl: null,
        tituloMateriaEl: document.getElementById('tituloMateria'),
        tituloTemaEl: document.getElementById('tituloTema'),
        navExplicacionEl: document.getElementById('nav-explicacion')
    };

    if (estadoGlobal.elementosDOM.tituloMateriaEl && datosSession.materia) {
        estadoGlobal.elementosDOM.tituloMateriaEl.textContent = datosSession.materia;
    }
    
    if (estadoGlobal.elementosDOM.tituloTemaEl && datosSession.tema) {
        estadoGlobal.elementosDOM.tituloTemaEl.textContent = datosSession.tema;
    }

    if (!estadoGlobal.elementosDOM.btnVolverExplicacion && estadoGlobal.elementosDOM.navExplicacionEl) {
        const btnVolver = document.createElement('button');
        btnVolver.id = 'btnVolverExplicacion';
        btnVolver.innerHTML = '📚 Volver a Explicación';
        btnVolver.style.display = 'none';
        estadoGlobal.elementosDOM.navExplicacionEl.insertBefore(btnVolver, estadoGlobal.elementosDOM.btnFinalizarClase);
        estadoGlobal.elementosDOM.btnVolverExplicacion = btnVolver;
    }

    if (!estadoGlobal.elementosDOM.ventanaModalEl) {
        const modal = document.createElement('div');
        modal.id = 'ventana-modal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        document.body.appendChild(modal);
        estadoGlobal.elementosDOM.ventanaModalEl = modal;
    }

    const elementosCriticos = ['explicacionEl', 'actividadesEl', 'btnIniciarActividades', 'btnFinalizarClase'];
    for (let i = 0; i < elementosCriticos.length; i++) {
        const elemento = elementosCriticos[i];
        if (!estadoGlobal.elementosDOM[elemento]) {
            console.warn(`⚠️ Elemento DOM crítico no encontrado: ${elemento}`);
        } else {
            console.log(`✅ Elemento DOM encontrado: ${elemento}`);
        }
    }
    
    console.log('🔗 Elementos DOM configurados correctamente');
}

// ==================== CONTROL DEL BOTÓN ====================

function inicializarEstadoBotones() {
    document.body.classList.add('modo-explicacion');
    document.body.classList.remove('modo-actividades');
    
    const btnLeerExplicacion = document.getElementById('leerExplicacion');
    if (btnLeerExplicacion) {
        btnLeerExplicacion.classList.remove('ocultar-boton-lectura');
        btnLeerExplicacion.classList.add('mostrar-boton-lectura');
        btnLeerExplicacion.style.display = 'block';
        btnLeerExplicacion.style.visibility = 'visible';
        btnLeerExplicacion.style.opacity = '1';
        console.log('🔄 Estado inicial configurado - Botón visible');
    }
}

function ocultarBotonLectura() {
    console.log('🎯 Iniciando ocultación del botón "Escuchar Explicación"...');
    
    document.body.classList.remove('modo-explicacion');
    document.body.classList.add('modo-actividades');
    
    if (estadoGlobal.elementosDOM.btnSintesisVoz) {
        estadoGlobal.elementosDOM.btnSintesisVoz.style.display = 'none';
        estadoGlobal.elementosDOM.btnSintesisVoz.style.visibility = 'hidden';
        estadoGlobal.elementosDOM.btnSintesisVoz.style.opacity = '0';
    }

    const btnLeerExplicacion = document.getElementById('leerExplicacion');
    if (btnLeerExplicacion) {
        btnLeerExplicacion.classList.add('ocultar-boton-lectura');
        btnLeerExplicacion.classList.remove('mostrar-boton-lectura');
        btnLeerExplicacion.style.setProperty('display', 'none', 'important');
        btnLeerExplicacion.style.setProperty('visibility', 'hidden', 'important');
        btnLeerExplicacion.style.setProperty('opacity', '0', 'important');
        console.log('✅ Botón "Escuchar Explicación" ocultado');
    }
}

function mostrarBotonLectura() {
    console.log('🎯 Iniciando visualización del botón "Escuchar Explicación"...');
    
    document.body.classList.remove('modo-actividades');
    document.body.classList.add('modo-explicacion');
    
    if (estadoGlobal.elementosDOM.btnSintesisVoz) {
        estadoGlobal.elementosDOM.btnSintesisVoz.style.display = 'block';
        estadoGlobal.elementosDOM.btnSintesisVoz.style.visibility = 'visible';
        estadoGlobal.elementosDOM.btnSintesisVoz.style.opacity = '1';
    }

    const btnLeerExplicacion = document.getElementById('leerExplicacion');
    if (btnLeerExplicacion) {
        btnLeerExplicacion.classList.remove('ocultar-boton-lectura');
        btnLeerExplicacion.classList.add('mostrar-boton-lectura');
        btnLeerExplicacion.style.setProperty('display', 'block', 'important');
        btnLeerExplicacion.style.setProperty('visibility', 'visible', 'important');
        btnLeerExplicacion.style.setProperty('opacity', '1', 'important');
        console.log('✅ Botón "Escuchar Explicación" mostrado');
    }
}

// ==================== GENERACIÓN DE CONTENIDO ====================

// Nivel del alumno (N0 a N3), el mismo que usa config.js a partir de la contraseña
function nivelDelAlumno() {
    try {
        const datos = JSON.parse(sessionStorage.getItem('datosLumai') || '{}');
        const porClave = { n012: 'N0', n123: 'N1', n234: 'N2', n345: 'N3' };
        return porClave[String(datos.contrasena || '').toLowerCase()] || datos.perfil || 'N2';
    } catch (e) {
        return 'N2';
    }
}

// Perfil de 13 dimensiones del alumno. Viene dentro del código que le dio el docente
// (perfiles.html). Si entró con una contraseña por nivel (n012...), se usa la plantilla
// de inicio de ese nivel (N0 a N3).
// Si en este navegador hay un perfil guardado para el alumno
// (localStorage 'lumai_perfiles_dimensiones' = { "nombre del alumno": { dimension: grado } }),
// ese perfil tiene prioridad. El perfil nunca se envía a la IA.
function perfilDelAlumno(reglas) {
    try {
        const datos = JSON.parse(sessionStorage.getItem('datosLumai') || '{}');
        if (datos.perfilDimensiones) return { perfil: datos.perfilDimensiones, origen: 'código del alumno' };
    } catch (e) { /* sin código de perfil */ }
    try {
        const guardados = JSON.parse(localStorage.getItem('lumai_perfiles_dimensiones') || '{}');
        const clave = String(datosSession.nombreAlumno || '').trim().toLowerCase();
        if (guardados[clave]) return { perfil: guardados[clave], origen: 'ficha del docente' };
    } catch (e) { /* sin perfiles guardados */ }
    const nivel = nivelDelAlumno();
    return { perfil: perfilDesdePlantilla(reglas, nivel), origen: `plantilla ${nivel}` };
}

// Si hay una clase base (contenidos/clases) para la materia y el tema, se muestra
// esa clase en cápsulas y no se le pide la explicación a la IA.
async function mostrarClaseBaseSiExiste() {
    const clase = await buscarClaseBase({
        materia: datosSession.materia,
        tema: datosSession.tema,
        ciclo: datosSession.ciclo
    });
    if (!clase || !estadoGlobal.elementosDOM.explicacionEl) return false;

    // Adaptación al perfil del alumno con reglas fijas (contenidos/reglas-adaptacion.json)
    let ajustes = null;
    try {
        const reglas = await cargarReglas();
        const { perfil, origen } = perfilDelAlumno(reglas);
        ajustes = calcularAjustes(perfil, reglas, clase.materia);
        estadoGlobal.adaptacionClase = { origen, perfil, motivos: ajustes.motivos };
        estadoGlobal.ajustes = ajustes;   // los juegos también se adaptan con estas perillas
        estadoGlobal.perfilDimensiones = perfil;
        console.log('🧩 Adaptación de la clase:', origen, ajustes);
    } catch (error) {
        console.warn('⚠️ No se pudo adaptar la clase; se muestra la versión base:', error);
    }

    // El nombre del alumno se usa solo acá, en el navegador: nunca se envía a la IA
    renderizarClase(clase, estadoGlobal.elementosDOM.explicacionEl, {
        ajustes,
        dimensiones: estadoGlobal.perfilDimensiones || null,   // solo para decidir cómo escribe en Mi carpeta; no se guarda ni se envía
        corregir: (datos) => corregirRespuestaIA(datos),   // LumAI lee lo que escribe el alumno (no recibe su nombre)
        asistente: true,   // botones "preguntale a LumAI" que abren el chat
        nombreAlumno: datosSession.nombreAlumno,
        rutaImagenes: 'img/',
        rutaImagenesClase: 'img/clases/',
        mostrarTitulo: false   // el tema ya se muestra en el encabezado de LumAI
    });

    // El botón "Escucha la explicación" solo aparece en perfiles que usan la voz
    document.body.classList.toggle('sin-voz', !((estadoGlobal.ajustes || {}).voz >= 1));

    // "Nos ponemos a prueba" se habilita recién al llegar a la última pantalla de la clase
    const btnJuego = estadoGlobal.elementosDOM.btnIniciarActividades;
    if (btnJuego) {
        btnJuego.textContent = '🎮 ¡Nos ponemos a prueba!';
        btnJuego.disabled = true;
        btnJuego.title = 'Se activa cuando llegás al final de la clase';
        btnJuego.setAttribute('aria-disabled', 'true');
        if (!estadoGlobal.cierreEscuchado) {
            estadoGlobal.cierreEscuchado = true;
            document.addEventListener('lumai:cierre', () => {
                btnJuego.disabled = false;
                btnJuego.removeAttribute('aria-disabled');
                btnJuego.title = '';
            });
        }
    }

    // Las actividades, la lectura en voz alta y el chat usan el texto de la clase
    const texto = claseATexto(clase);
    explicacionGenerada = texto;
    estadoGlobal.explicacionGenerada = texto;
    estadoGlobal.claseBase = clase.id;

    if (estadoGlobal.elementosDOM.tituloTemaEl) {
        estadoGlobal.elementosDOM.tituloTemaEl.textContent = clase.titulo;
    }

    if (window.lumaiTracker && window.lumaiTracker.isSessionActive) {
        const resumen = (clase.capsulas || []).map(c => `<li><strong>${c.titulo}</strong>: ${String(c.idea_clave || '').replace(/\*\*/g, '')}</li>`).join('');
        window.lumaiTracker.recordCustomEvent('explanation_content_saved', {
            origen: 'clase_base',
            claseId: clase.id,
            explicacion: texto,
            explicacionHTML: `<p><strong>Clase base:</strong> ${clase.titulo}</p><ol>${resumen}</ol>`,
            materia: datosSession.materia || 'N/A',
            tema: datosSession.tema || 'N/A',
            contentLength: texto.length
        });
    }
    console.log('📘 Clase base mostrada:', clase.id);
    return true;
}

async function generarContenidoEducativo() {
    mostrarCargando(true);

    if (await mostrarClaseBaseSiExiste()) {
        mostrarCargando(false);
        return;
    }

    // Tema sin clase base: igual se calculan las perillas del perfil para adaptar los juegos
    try {
        const reglas = await cargarReglas();
        const { perfil } = perfilDelAlumno(reglas);
        estadoGlobal.ajustes = calcularAjustes(perfil, reglas, datosSession.materia);
        estadoGlobal.perfilDimensiones = perfil;
    } catch (error) {
        console.warn('⚠️ No se pudieron calcular los ajustes para los juegos:', error);
    }
    
    try {
        console.log('🤖 Generando contenido educativo con IA...');
        
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('content_generation_started', {
                subject: datosSession.materia,
                topic: datosSession.tema
            });
        }

        const respuestaIA = await generateExplanation(
            datosSession.tema,
            datosSession.materia,
            estadoGlobal.perfil
        );
        
        if (respuestaIA) {
            explicacionGenerada = respuestaIA;
            estadoGlobal.explicacionGenerada = respuestaIA;
            
            mostrarCargando(false);
            renderizarExplicacion(respuestaIA);
            guardarExplicacionEnMetricas(respuestaIA);

            if (window.lumaiTracker) {
                window.lumaiTracker.recordCustomEvent('content_generation_completed', {
                    contentLength: respuestaIA.length,
                    hasVoiceSynthesis: estadoGlobal.perfil ? estadoGlobal.perfil.usa_sintesis_voz : false
                });
            }
            
            console.log('✅ Contenido educativo generado correctamente');
            
        } else {
            throw new Error('No se pudo generar contenido con IA');
        }
        
    } catch (error) {
        console.error('❌ Error generando contenido:', error);
        
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('content_generation_failed', {
                error: error.message
            });
        }
        
        mostrarCargando(false);
        mostrarContenidoFallback();
    }
}

function renderizarExplicacion(contenido) {
    if (!estadoGlobal.elementosDOM.explicacionEl) return;
    
    try {
        estadoGlobal.elementosDOM.explicacionEl.innerHTML = contenido;
        console.log('📄 Explicación renderizada en el DOM');
    } catch (error) {
        console.error('❌ Error renderizando explicación:', error);
        mostrarContenidoFallback();
    }
}

function guardarExplicacionEnMetricas(contenidoHTML) {
    if (!window.lumaiTracker || !window.lumaiTracker.isSessionActive) {
        console.log('⚠️ Sistema de métricas no disponible para guardar explicación');
        return;
    }
    
    try {
        const htmlLimpio = contenidoHTML.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlLimpio;
        const textoLimpio = tempDiv.textContent || tempDiv.innerText || '';
        
        if (htmlLimpio.trim()) {
            window.lumaiTracker.recordCustomEvent('explanation_content_saved', {
                explicacion: textoLimpio.trim(),
                explicacionHTML: htmlLimpio,
                materia: datosSession.materia || 'N/A',
                tema: datosSession.tema || 'N/A',
                contentLength: textoLimpio.length
            });
            console.log('💾 Explicación HTML guardada en tracker');
        }
        
    } catch (error) {
        console.error('❌ Error guardando explicación en métricas:', error);
    }
}

function mostrarContenidoFallback() {
    if (!estadoGlobal.elementosDOM.explicacionEl) return;
    
    const contenidoFallback = `
        <h3>📚 ${datosSession.tema || 'Tema educativo'}</h3>
        <p>Estamos preparando el contenido personalizado para este tema.</p>
        <p>Mientras tanto, puedes comenzar con las actividades interactivas.</p>
        <p><strong>Materia:</strong> ${datosSession.materia || 'No especificada'}</p>
        <p><strong>Tema:</strong> ${datosSession.tema || 'No especificado'}</p>
    `;
    
    estadoGlobal.elementosDOM.explicacionEl.innerHTML = contenidoFallback;
    estadoGlobal.explicacionGenerada = contenidoFallback;
    console.log('📄 Contenido fallback mostrado');
}

// ==================== CONFIGURACIÓN DE EVENTOS ====================

function configurarEventos() {
    if (estadoGlobal.elementosDOM.btnIniciarActividades) {
        estadoGlobal.elementosDOM.btnIniciarActividades.addEventListener('click', function() {
            iniciarActividades();
        });
    }

    if (estadoGlobal.elementosDOM.btnVolverExplicacion) {
        estadoGlobal.elementosDOM.btnVolverExplicacion.addEventListener('click', function() {
            volverAExplicacion();
        });
    }

    if (estadoGlobal.elementosDOM.btnFinalizarClase) {
        estadoGlobal.elementosDOM.btnFinalizarClase.addEventListener('click', function() {
            finalizarClase();
        });
    }

    // ⭐⭐⭐ NUEVO: Event listener para el botón de síntesis de voz ⭐⭐⭐
    if (estadoGlobal.elementosDOM.btnSintesisVoz) {
        estadoGlobal.elementosDOM.btnSintesisVoz.addEventListener('click', function() {
            console.log('🔊 Botón de síntesis de voz presionado');
            
            // Registrar evento en métricas
            if (window.lumaiTracker) {
                window.lumaiTracker.recordCustomEvent('voice_synthesis_button_clicked', {
                    profileType: estadoGlobal.perfil?.nombre_visible,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Ejecutar síntesis de voz si hay explicación
            const textoPantalla = typeof window.lumaiTextoPantalla === 'function' ? window.lumaiTextoPantalla() : '';
            if (textoPantalla) {
                activarSintesisVoz(textoPantalla);
            } else if (estadoGlobal.explicacionGenerada) {
                activarSintesisVoz(estadoGlobal.explicacionGenerada);  // ⭐ CORREGIDO
            } else {
                console.warn('⚠️ No hay explicación generada para leer');
            }
        });
        console.log('✅ Event listener de síntesis de voz configurado correctamente');
    } else {
        console.warn('⚠️ Botón de síntesis de voz no encontrado en el DOM');
    }

    console.log('🔗 Eventos configurados correctamente');
}

// ==================== NAVEGACIÓN ====================

async function iniciarActividades() {
    if (actividadEnCurso) return;
    
    try {
        actividadEnCurso = true;
        
        if (window.lumaiTracker) {
            window.lumaiTracker.recordCustomEvent('activities_started', {
                fromExplanation: true
            });
        }
        
        if (estadoGlobal.elementosDOM.explicacionEl) {
            estadoGlobal.elementosDOM.explicacionEl.style.display = 'none';
        }
        if (estadoGlobal.elementosDOM.actividadesEl) {
            estadoGlobal.elementosDOM.actividadesEl.style.display = 'block';
        }

        if (estadoGlobal.elementosDOM.btnIniciarActividades) {
            estadoGlobal.elementosDOM.btnIniciarActividades.style.display = 'none';
        }
        if (estadoGlobal.elementosDOM.btnVolverExplicacion) {
            estadoGlobal.elementosDOM.btnVolverExplicacion.style.display = 'inline-block';
        }
        
        ocultarBotonLectura();
        
        // Detener síntesis de voz antes de iniciar actividades
        detenerSintesisVoz();
        
        await cargarActividad();
        
        console.log('🎮 Actividades iniciadas');
        
    } catch (error) {
        console.error('❌ Error iniciando actividades:', error);
        actividadEnCurso = false;
        mostrarError('Error cargando actividades. Por favor, intenta nuevamente.');
    }
}

function volverAExplicacion() {
    console.log('📚 Volviendo a la explicación...');
    
    if (window.lumaiTracker) {
        window.lumaiTracker.recordCustomEvent('returned_to_explanation', {
            fromActivities: true
        });
    }
    
    if (estadoGlobal.elementosDOM.explicacionEl) {
        estadoGlobal.elementosDOM.explicacionEl.style.display = 'block';
    }
    if (estadoGlobal.elementosDOM.actividadesEl) {
        estadoGlobal.elementosDOM.actividadesEl.style.display = 'none';
        estadoGlobal.elementosDOM.actividadesEl.innerHTML = '';
    }

    if (estadoGlobal.elementosDOM.btnIniciarActividades) {
        estadoGlobal.elementosDOM.btnIniciarActividades.style.display = 'inline-block';
    }
    if (estadoGlobal.elementosDOM.btnVolverExplicacion) {
        estadoGlobal.elementosDOM.btnVolverExplicacion.style.display = 'none';
    }
    
    mostrarBotonLectura();
    
    actividadEnCurso = false;
}

function finalizarClase() {
    console.log('🏁 Finalizando clase...');
    if (window.finalizandoClase) return;
    window.finalizandoClase = true;

    const nombre = String(datosSession?.nombreAlumno || '').trim();
    try { document.getElementById('floatingChatContainer')?.remove(); } catch (e) { /* sin chat */ }

    const salir = () => {
        if (window.lumaiTracker) {
            window.lumaiTracker.endSession();
        }
        sessionStorage.clear();
        window.location.href = 'index.html';
    };

    // Despedida cálida con el nombre (el nombre se usa solo acá, en el navegador)
    const velo = document.createElement('div');
    velo.setAttribute('role', 'dialog');
    velo.setAttribute('aria-modal', 'true');
    velo.setAttribute('aria-label', 'Despedida');
    velo.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,40,90,.92);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Poppins,system-ui,sans-serif';
    const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    velo.innerHTML = `
        <div style="background:#fff;border-radius:20px;max-width:460px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)">
            <img src="img/3.png" alt="" style="height:130px;margin-bottom:8px">
            <h2 style="margin:0 0 10px;color:#00509e;font-size:1.5rem">¡Hasta la próxima${nombre ? ', ' + esc(nombre) : ''}! 👋</h2>
            <p style="margin:0 0 18px;font-size:1.05rem;color:#1f2a37;line-height:1.5">Hoy aprendiste cosas nuevas y le pusiste ganas. Estoy orgulloso de vos. Descansá, y cuando quieras seguir, acá voy a estar para acompañarte. 💙</p>
            <button id="btnSalirDespedida" type="button" style="background:linear-gradient(135deg,#00509e,#1d74c9);color:#fff;border:none;border-radius:999px;padding:12px 28px;font-size:1rem;font-weight:700;cursor:pointer">Chau, LumAI 👋</button>
        </div>`;
    document.body.appendChild(velo);
    const b = velo.querySelector('#btnSalirDespedida');
    b.addEventListener('click', salir);
    b.focus();
    try { hablarDespedida(nombre); } catch (e) { /* sin voz */ }
    setTimeout(salir, 12000);
}

function hablarDespedida(nombre) {
    const aj = estadoGlobal.ajustes || {};
    if (aj.voz >= 1 && aj.voz_sin_auto !== true) {
        import('./voz.js').then(m => m.hablar(`Hasta la próxima${nombre ? ', ' + nombre : ''}. Hoy aprendiste cosas nuevas. Estoy orgulloso de vos.`, { ajustes: aj, mostrar: false }));
    }
}

// ==================== UTILIDADES ====================

function mostrarCargando(mostrar) {
    if (mostrar) {
        if (!estadoGlobal.elementosDOM.loadingEl) {
            const loading = document.createElement('div');
            loading.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.95);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            loading.innerHTML = `
                <div style="text-align: center;">
                    <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                    <h3 style="color: #00509e;">🧠 Pensando...</h3>
                    <p style="color: #666;">Generando contenido personalizado</p>
                </div>
            `;
            document.body.appendChild(loading);
            estadoGlobal.elementosDOM.loadingEl = loading;
        }
        estadoGlobal.elementosDOM.loadingEl.style.display = 'flex';
    } else {
        if (estadoGlobal.elementosDOM.loadingEl) {
            estadoGlobal.elementosDOM.loadingEl.style.display = 'none';
        }
    }
}

function mostrarError(mensaje) {
    const modal = estadoGlobal.elementosDOM.ventanaModalEl;
    if (!modal) return;
    
    const esExito = false;
    const icono = '❌';
    const color = '#dc3545';
    
    modal.innerHTML = `
        <div style="background: white; margin: 15% auto; padding: 30px; border-radius: 15px; width: 90%; max-width: 500px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <h3 style="color: ${color}; margin-bottom: 20px;">
                ${icono} Error
            </h3>
            <p style="margin-bottom: 25px; line-height: 1.6;">${mensaje}</p>
            <button onclick="cerrarModal()" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 12px 25px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px;">Entendido</button>
        </div>
    `;
    
    modal.style.display = 'block';
    
    modal.onclick = function(event) {
        if (event.target === modal) {
            cerrarModal();
        }
    };
}

window.cerrarModal = function() {
    if (estadoGlobal.elementosDOM && estadoGlobal.elementosDOM.ventanaModalEl) {
        estadoGlobal.elementosDOM.ventanaModalEl.style.display = 'none';
    }
};

window.volverAExplicacion = volverAExplicacion;
window.finalizarClase = finalizarClase;

// ==================== LOGGING ====================
console.log('🎮 ui-controller.js CORREGIDO cargado correctamente');
console.log('✅ Funcionalidades: Orquestación + Navegación + Chat + IA + TRACKING + BOTÓN SÍNTESIS VOZ ⭐');
