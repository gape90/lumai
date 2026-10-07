// js/config.js - Configuración central de LUMAI con sistema de métricas integrado
// ===============================================================================
// ✅ VERSIÓN CORREGIDA: Perfil N0 con límites FLEXIBLES (2-4 oraciones recomendadas, hasta 5 máximo)

// ==================== CONFIGURACIÓN GLOBAL ====================
// 🔑 La clave de Gemini ya NO va en el código (V91): se pide una vez y queda en el navegador.

export const configuracion = {
  maxTokensDefault: 10000,  // Base (se ajusta por perfil en ai-engine.js)
  temperaturaDefault: 0.6, // ⚡ OPTIMIZADO: Balance precisión/velocidad
  tiempoEsperaDefault: 5000,
  maxIntentos: 3
};

// ==================== CONFIGURACIÓN DE MÉTRICAS ====================
export const configuracionMetricas = {
  // Configuración del sistema de tracking
  habilitado: true,
  almacenamientoLocal: true,
  clave: 'lumai_evaluation_data',
  
  // Configuración de reportes
  contraseñaDocente: 'lumai2024',
  rutaReportes: 'reportes.html',
  
  // Configuración de análisis
  conceptosAutomaticos: true,
  detectarPatrones: true,
  
  // Configuración de exportación
  formatosDisponibles: ['json', 'csv', 'txt'],
  
  // Configuración de limpieza automática
  limpiezaAutomatica: false,
  diasRetencion: 90,
  
  // Eventos personalizados a capturar
  eventosPersonalizados: [
    'profile_determined',
    'content_generation_started',
    'content_generation_completed',
    'activities_started',
    'activity_mastered',
    'support_window_triggered',
    'session_ended'
  ]
};

// ==================== CONFIGURACIÓN DE ACTIVIDADES POR PERFIL ====================
export const ACTIVIDADES_POR_PERFIL = {
  'N0': ['exploradores-sonido', 'puente-palabras', 'aventura-silabas', 'supermercado'],
  'N1': ['sopa-de-letras', 'race', 'basketball', 'multiple-choice', 'verdadero-falso', 'skater'],
  'N2': ['sopa-de-letras', 'race', 'basketball', 'multiple-choice', 'verdadero-falso', 'skater'],
  'N3': ['sopa-de-letras', 'race', 'basketball', 'multiple-choice', 'verdadero-falso', 'skater']
};

// ==================== SISTEMA DE RONDAS PEDAGÓGICAS ====================
export const configuracionActividades = {
  // Criterios para considerar una actividad como "dominada"
  criteriosDominio: {
    'N0': 1,  // N0 necesita solo 1 completación perfecta
    'N1': 2,  // N1 necesita 2 completaciones perfectas  
    'N2': 2,  // N2 necesita 2 completaciones perfectas
    'N3': 3   // N3 necesita 3 completaciones perfectas
  },
  
  // Tracking de intentos por actividad
  trackingIntentos: {},
  
  // Resetear tracking de intentos
  resetearTracking: function() {
    this.trackingIntentos = {};
    console.log('🔄 Tracking de actividades reseteado');
  },
  
  // Registrar intento de actividad
  registrarIntento: function(tipoActividad, exito) {
    if (!this.trackingIntentos[tipoActividad]) {
      this.trackingIntentos[tipoActividad] = {
        intentos: 0,
        completacionesPerfectas: 0
      };
    }
    
    this.trackingIntentos[tipoActividad].intentos++;
    if (exito) {
      this.trackingIntentos[tipoActividad].completacionesPerfectas++;
    }
    
    console.log(`📊 ${tipoActividad}: ${this.trackingIntentos[tipoActividad].completacionesPerfectas} completaciones perfectas de ${this.trackingIntentos[tipoActividad].intentos} intentos`);
    
    return this.trackingIntentos[tipoActividad];
  },
  
  // Verificar si actividad está dominada
  estaActividadDominada: function(tipoActividad, perfil) {
    const datos = this.trackingIntentos[tipoActividad];
    if (!datos) return false;
    
    const criterio = this.criteriosDominio[perfil] || 2;
    const dominada = datos.completacionesPerfectas >= criterio;
    
    if (dominada) {
      console.log(`🎯 ACTIVIDAD DOMINADA: ${tipoActividad} (${datos.completacionesPerfectas}/${criterio})`);
    }
    
    return dominada;
  },
  
  // Obtener actividades no dominadas
  obtenerActividadesNoDominadas: function(perfil) {
    const actividadesPerfil = ACTIVIDADES_POR_PERFIL[perfil] || ACTIVIDADES_POR_PERFIL['N1'];
    
    const noDominadas = actividadesPerfil.filter(actividad => {
      return !this.estaActividadDominada(actividad, perfil);
    });
    
    console.log(`🎮 Actividades no dominadas para ${perfil}:`, noDominadas);
    return noDominadas;
  },
  
  // Obtener estadísticas de progreso
  obtenerEstadisticas: function(perfil) {
    const actividadesPerfil = ACTIVIDADES_POR_PERFIL[perfil] || ACTIVIDADES_POR_PERFIL['N1'];
    const dominadas = actividadesPerfil.filter(act => this.estaActividadDominada(act, perfil));
    
    return {
      total: actividadesPerfil.length,
      dominadas: dominadas.length,
      pendientes: actividadesPerfil.length - dominadas.length,
      porcentajeProgreso: Math.round((dominadas.length / actividadesPerfil.length) * 100)
    };
  }
};

// ==================== FUNCIÓN PARA SUGERIR EMOJIS SEGÚN EL TEMA ====================
function obtenerSugerenciasEmojis(tema) {
  const sugerencias = {
    'colores': '🌈 🎨 🌸 🌊 ☀️',
    'color': '🌈 🎨 🌸 🌊 ☀️',
    'agua': '💧 🌊 🚿 🏊‍♂️ 🐠',
    'animales': '🐶 🐱 🦁 🐘 🦋',
    'números': '🔢 1️⃣ 2️⃣ 3️⃣ ➕',
    'numeros': '🔢 1️⃣ 2️⃣ 3️⃣ ➕',
    'plantas': '🌱 🌸 🌺 🌻 🌳',
    'comida': '🍎 🍞 🥛 🌮 🥕',
    'familia': '👨‍👩‍👧‍👦 ❤️ 🏠 👶 👴',
    'cuerpo': '👀 👂 👃 ✋ 🦷',
    'tiempo': '☀️ 🌧️ ❄️ 🌬️ 🌈',
    'transporte': '🚗 🚌 ✈️ 🚲 🚂',
    'formas': '⭐ 🔺 ⭕ 🔶 💎',
    'letras': '🔤 📝 ✏️ 📚 🎓',
    'sonidos': '🎵 🎶 🔊 👂 🎼',
    'casa': '🏠 🛏️ 🚪 🪟 🛋️',
    'juegos': '⚽ 🎲 🧸 🎈 🎪',
    'pentagrama': '🎵 🎶 🎼 🎹 🎸',
    'música': '🎵 🎶 🎼 🎹 🎸',
    'musica': '🎵 🎶 🎼 🎹 🎸'
  };
  
  // Buscar coincidencias parciales
  const temaLower = tema.toLowerCase();
  for (const [clave, emojis] of Object.entries(sugerencias)) {
    if (temaLower.includes(clave) || clave.includes(temaLower)) {
      return emojis;
    }
  }
  
  return '🌟 😊 ✨ (buscar emojis apropiados para el tema)';
}

// ==================== PERFILES DE ESTUDIANTES ====================
export const perfiles = {
  // ✅ PERFIL N0 - CON LÍMITES FLEXIBLES
  N0: {
    nombre_visible: "N0",
    nombre_alumno: "", // Se asigna dinámicamente
    edad: 13,
    dimensiones: {
      lectoescritura: "muy_bajo",
      atencion_sostenida: "muy_bajo", 
      procesamiento_informacion: "muy_bajo",
      memoria_trabajo: "muy_bajo",
      comprension_lectora: "muy_bajo",
      comprension_oral: "muy_bajo",
      razonamiento_logico: "muy_bajo",
      autonomia: "muy_bajo",
      regulacion_emocional: "muy_bajo"
    },
    usa_sintesis_voz: true,
    nivel_basketball: "muy_bajo",
    requiere_mayusculas: true,
    contrasena: "n012",
    
    // ✅ MODIFICADO: Límites flexibles
    adaptaciones_texto: {
      // LÍMITES RECOMENDADOS (ideales)
      min_oraciones: 2,
      max_oraciones: 4,
      min_palabras_por_oracion: 3,
      max_palabras_por_oracion: 6,
      
      // ✅ NUEVO: LÍMITES ABSOLUTOS (máximo permitido si es necesario)
      max_oraciones_absoluto: 5,        // Puede llegar hasta 5 oraciones
      max_palabras_absoluto: 10,         // Puede llegar hasta 10 palabras
      
      palabras_recomendadas: "3-6",
      vocabulario_nivel: "muy_simple",
      emojis_minimos: 0,
      emojis_maximos: 3,                 // Máximo 3 por oración
      solo_emojis_relevantes: true,
      usa_mayusculas: true,
      puntuacion_obligatoria: true
    },
    
    // Juegos especiales para N0
    juegos_especiales: [
      'audio-texto',
      'imagen-sonido', 
      'palabras-simples'
    ],
    
    // Configuración de métricas por perfil
    configuracion_metricas: {
      frecuencia_feedback: 'muy_alta',
      detalle_errores: 'muy_basico',
      analisis_conceptos: 'visual',
      tiempo_sesion_promedio: 15, // minutos
      requiere_sintesis_voz: true
    }
  },
  
  N1: {
    nombre_visible: "N1",
    nombre_alumno: "",
    edad: 13,
    dimensiones: {
      lectoescritura: "bajo",
      atencion_sostenida: "bajo", 
      procesamiento_informacion: "bajo",
      memoria_trabajo: "bajo",
      comprension_lectora: "bajo",
      comprension_oral: "bajo",
      razonamiento_logico: "bajo",
      autonomia: "bajo",
      regulacion_emocional: "bajo"
    },
    usa_sintesis_voz: true,
    nivel_basketball: "bajo",
    requiere_mayusculas: true,
    contrasena: "n123",
    
    configuracion_metricas: {
      frecuencia_feedback: 'alta',
      detalle_errores: 'basico',
      analisis_conceptos: 'simple',
      tiempo_sesion_promedio: 15
    }
  },
  N2: {
    nombre_visible: "N2", 
    nombre_alumno: "",
    edad: 15,
    dimensiones: {
      lectoescritura: "medio",
      atencion_sostenida: "medio",
      procesamiento_informacion: "medio", 
      memoria_trabajo: "medio",
      comprension_lectora: "medio",
      comprension_oral: "medio",
      razonamiento_logico: "medio",
      autonomia: "medio",
      regulacion_emocional: "medio"
    },
    usa_sintesis_voz: false,
    nivel_basketball: "medio",
    requiere_mayusculas: false,
    contrasena: "n234",
    
    configuracion_metricas: {
      frecuencia_feedback: 'media',
      detalle_errores: 'intermedio',
      analisis_conceptos: 'detallado',
      tiempo_sesion_promedio: 25
    }
  },
  N3: {
    nombre_visible: "N3",
    nombre_alumno: "",
    edad: 17,
    dimensiones: {
      lectoescritura: "alto",
      atencion_sostenida: "alto",
      procesamiento_informacion: "alto",
      memoria_trabajo: "alto", 
      comprension_lectora: "alto",
      comprension_oral: "alto",
      razonamiento_logico: "alto",
      autonomia: "alto",
      regulacion_emocional: "alto"
    },
    usa_sintesis_voz: false,
    nivel_basketball: "alto",
    requiere_mayusculas: false,
    contrasena: "n345",
    
    configuracion_metricas: {
      frecuencia_feedback: 'baja',
      detalle_errores: 'avanzado',
      analisis_conceptos: 'completo',
      tiempo_sesion_promedio: 35
    }
  }
};

// ==================== DATOS DE SESIÓN ====================
export let datosSession = {};

// ==================== ESTADO GLOBAL ====================
export const estadoGlobal = {
  perfil: null,
  materia: "",
  tema: "",
  tiposActividades: [
    'exploradores-sonido',
    'puente-palabras',
    'aventura-silabas',
    'supermercado',
    "sopa-de-letras",
    "race", 
    "basketball",
    "multiple-choice",
    "verdadero-falso",
    "skater"
  ],
  actividadActual: null,
  respuestasCompletadas: 0,
  respuestasCorrectas: 0,
  totalActividadesCompletadas: 0,
  actividadesCompletadasPerfectamente: [],
  explicacionGenerada: "",
  elementosDOM: {},
  
  secuenciaActividades: [],
  indiceSecuencia: 0,
  tipoActualIndex: -1,
  
  trackingHabilitado: configuracionMetricas.habilitado,
  sesionMetricas: null,
  ultimaActividad: null
};

// ==================== FUNCIONES DE INICIALIZACIÓN ====================

export function validarDatosRequeridos() {
  const datos = sessionStorage.getItem('datosLumai');
  
  if (!datos) {
    console.error("No hay datos de sesión en sessionStorage");
    return false;
  }

  try {
    const datosParseados = JSON.parse(datos);
    const camposRequeridos = ['nombreAlumno', 'perfil', 'materia', 'ciclo', 'tema'];
    
    for (const campo of camposRequeridos) {
      if (!datosParseados[campo] || datosParseados[campo].trim() === '') {
        console.error(`Campo requerido faltante: ${campo}`);
        return false;
      }
    }

    if (!perfiles[datosParseados.perfil]) {
      console.error(`Perfil inválido: ${datosParseados.perfil}`);
      return false;
    }

    console.log("Datos de sesión validados correctamente");
    return true;
    
  } catch (error) {
    console.error("Error al parsear datos de sesión:", error);
    return false;
  }
}

export function inicializarConfig() {
  try {
    const datos = sessionStorage.getItem('datosLumai');
    
    if (!datos) {
      throw new Error("No se encontraron datos de sesión");
    }

    datosSession = JSON.parse(datos);
    
    let nombrePerfil = datosSession.perfil || 'N2';
    
    if (datosSession.contrasena) {
      if (datosSession.contrasena.toLowerCase() === 'n012') nombrePerfil = 'N0';
      else if (datosSession.contrasena.toLowerCase() === 'n123') nombrePerfil = 'N1';
      else if (datosSession.contrasena.toLowerCase() === 'n234') nombrePerfil = 'N2';
      else if (datosSession.contrasena.toLowerCase() === 'n345') nombrePerfil = 'N3';
    }
    
    const perfilBase = perfiles[nombrePerfil];
    if (!perfilBase) {
      throw new Error(`Perfil no encontrado: ${nombrePerfil}`);
    }

    estadoGlobal.perfil = {
      ...perfilBase,
      nombre_alumno: datosSession.nombreAlumno
    };

    estadoGlobal.materia = datosSession.materia;
    estadoGlobal.tema = datosSession.tema;

    console.log("Configuración inicializada:", {
      perfil: estadoGlobal.perfil.nombre_visible,
      alumno: estadoGlobal.perfil.nombre_alumno,
      materia: estadoGlobal.materia,
      tema: estadoGlobal.tema,
      requiere_mayusculas: estadoGlobal.perfil.requiere_mayusculas
    });

    // ✅ Log actualizado con límites flexibles
    if (nombrePerfil === 'N0') {
      console.log('🎯 PERFIL N0 ACTIVADO CON LÍMITES FLEXIBLES:');
      console.log('   • RECOMENDADO: 2-4 oraciones, 3-6 palabras c/u');
      console.log('   • ABSOLUTO: hasta 5 oraciones, hasta 10 palabras');
      console.log('   • COMPENSACIÓN: permitida si mantiene ideas completas');
      console.log('   • EMOJIS: Máximo 3 por oración, solo relevantes');
      console.log('   • Síntesis de voz activada');
      console.log('   • TODO EN MAYÚSCULAS');
    }

    configurarSistemaMetricas();

    return true;
    
  } catch (error) {
    console.error("Error inicializando configuración:", error);
    return false;
  }
}

// ==================== FUNCIÓN PARA OBTENER ACTIVIDADES POR PERFIL ====================
export function obtenerActividadesParaPerfil(nombrePerfil) {
  const actividadesPerfil = ACTIVIDADES_POR_PERFIL[nombrePerfil];
  
  if (!actividadesPerfil) {
    console.warn(`⚠️ Perfil ${nombrePerfil} no encontrado en configuración de actividades, usando N2`);
    return ACTIVIDADES_POR_PERFIL['N2'];
  }
  
  console.log(`🎯 Actividades para perfil ${nombrePerfil}:`, actividadesPerfil);
  return actividadesPerfil;
}

// ==================== ADAPTACIONES POR PERFIL ====================

export const parametrosCognitivosBase = {
  // ✅ MODIFICADO: Actualizado con límites flexibles
  muy_bajo: {
    lectoescritura: "RECOMENDADO: 2-4 ORACIONES, 3-6 PALABRAS - ABSOLUTO: hasta 5 oraciones, hasta 10 palabras - PUNTOS OBLIGATORIOS",
    emojis: "MÁXIMO 3 EMOJIS POR ORACIÓN - SOLO SI SON RELEVANTES",
    atencion_sostenida: "UNA INSTRUCCIÓN A LA VEZ - PASOS MUY PEQUEÑOS",
    procesamiento_informacion: "RITMO MUY PAUSADO - REPETICIONES FRECUENTES",
    memoria_trabajo: "INFORMACIÓN MUY LIMITADA - RECORDATORIOS CONSTANTES",
    comprension_lectora: "APOYO VISUAL SIEMPRE - VOCABULARIO BÁSICO",
    comprension_oral: "SÍNTESIS DE VOZ OBLIGATORIA - FRASES MUY CORTAS",
    razonamiento_logico: "RELACIONES MUY SIMPLES - UN PASO A LA VEZ",
    autonomia: "GUÍA CONSTANTE - PASOS MUY PEQUEÑOS",
    regulacion_emocional: "REFUERZO MUY POSITIVO - CELEBRAR PEQUEÑOS LOGROS"
  },
  
  bajo: {
    lectoescritura: "TEXTOS MÁXIMO 30 PALABRAS - ORACIONES MÁXIMO 6 PALABRAS - UN CONCEPTO POR VEZ",
    emojis: "MÁXIMO 1 EMOJI POR ORACIÓN Y SOLO SI ES RELEVANTE AL CONTENIDO, MAXIMO 3 EN TODO EL TEXTO",
    atencion_sostenida: "UNA INSTRUCCIÓN POR VEZ - DIVIDIR TAREAS EN PASOS PEQUEÑOS",
    procesamiento_informacion: "TIEMPO EXTRA PARA PROCESAR - INSTRUCCIONES CLARAS Y LENTAS",
    memoria_trabajo: "REPETIR INFORMACIÓN CLAVE - USAR ESQUEMAS VISUALES",
    comprension_lectora: "VOCABULARIO SIMPLE - ORACIONES CORTAS - CONCEPTOS CONCRETOS",
    comprension_oral: "ACTIVAR SÍNTESIS DE VOZ - REPETIR INSTRUCCIONES IMPORTANTES",
    razonamiento_logico: "PASOS EXPLÍCITOS - RELACIONES CAUSA-EFECTO SIMPLES",
    autonomia: "GUÍA CONSTANTE - FEEDBACK FRECUENTE - VALIDACIÓN CONTINUA",
    regulacion_emocional: "LENGUAJE POSITIVO - MANEJO CUIDADOSO DE ERRORES - MOTIVACIÓN CONSTANTE"
  },
  medio: {
    lectoescritura: "TEXTOS 80-120 PALABRAS - ORACIONES 12-15 PALABRAS",
    emojis: "MÁXIMO 1 EMOJI POR ORACIÓN Y SOLO SI ES RELEVANTE AL CONTENIDO, MAXIMO 3 EN TODO EL TEXTO",
    atencion_sostenida: "INSTRUCCIONES ORGANIZADAS SECUENCIALMENTE",
    procesamiento_informacion: "RITMO MODERADO - VERIFICACIÓN OCASIONAL",
    memoria_trabajo: "ORGANIZACIÓN DE INFORMACIÓN EN BLOQUES",
    comprension_lectora: "VOCABULARIO INTERMEDIO - ALGUNAS ABSTRACCIONES",
    comprension_oral: "SÍNTESIS DE VOZ OPCIONAL - INSTRUCCIONES CLARAS",
    razonamiento_logico: "CONEXIONES LÓGICAS INTERMEDIAS",
    autonomia: "GUÍA MODERADA - REFUERZO POSITIVO REGULAR",
    regulacion_emocional: "APOYO EMOCIONAL EQUILIBRADO - MANEJO CONSTRUCTIVO DE ERRORES"
  },
  alto: {
    lectoescritura: "TEXTOS EXTENSOS 150+ PALABRAS - ORACIONES COMPLEJAS",
    atencion_sostenida: "MÚLTIPLES INSTRUCCIONES SIMULTÁNEAS",
    procesamiento_informacion: "RITMO RÁPIDO - PROCESAMIENTO INDEPENDIENTE",
    memoria_trabajo: "MANEJO DE INFORMACIÓN COMPLEJA SIMULTÁNEA",
    comprension_lectora: "VOCABULARIO AVANZADO - CONCEPTOS ABSTRACTOS",
    comprension_oral: "SIN SÍNTESIS DE VOZ - INSTRUCCIONES COMPLEJAS",
    razonamiento_logico: "RAZONAMIENTO ABSTRACTO - RELACIONES COMPLEJAS",
    autonomia: "TRABAJO AUTÓNOMO - MÍNIMA SUPERVISIÓN",
    regulacion_emocional: "AUTORREGULACIÓN - MANEJO INDEPENDIENTE DE DESAFÍOS"
  }
};

export function generarPromptHibrido(perfil) {
  const adaptaciones = [];
  
  // ✅ MODIFICADO: Adaptaciones con límites flexibles
  if (perfil.nombre_visible === 'N0') {
    adaptaciones.push("LECTOESCRITURA: RECOMENDADO 2-4 oraciones de 3-6 palabras - ABSOLUTO hasta 5 oraciones de hasta 10 palabras");
    adaptaciones.push("PUNTUACIÓN: CADA ORACIÓN DEBE TERMINAR CON PUNTO (.)");
    adaptaciones.push("EMOJIS: MÁXIMO 3 POR ORACIÓN - SOLO SI SON RELEVANTES");
    adaptaciones.push("COMPENSACIÓN: Si oración larga (7-10 pal.) → menos oraciones (2-3). Si más oraciones (5) → oraciones cortas (3-5 pal.)");
    adaptaciones.push("VOCABULARIO: MUY SIMPLE Y CONCRETO");
    adaptaciones.push("ATENCIÓN: UNA INSTRUCCIÓN A LA VEZ - PASOS MUY PEQUEÑOS");
    adaptaciones.push("PROCESAMIENTO: RITMO MUY PAUSADO - REPETICIONES FRECUENTES");
    adaptaciones.push("MEMORIA: INFORMACIÓN MUY LIMITADA - RECORDATORIOS CONSTANTES");
    adaptaciones.push("COMPRENSIÓN: APOYO VISUAL SIEMPRE - VOCABULARIO BÁSICO");
    adaptaciones.push("RAZONAMIENTO: RELACIONES MUY SIMPLES - UN PASO A LA VEZ");
    adaptaciones.push("AUTONOMÍA: GUÍA CONSTANTE - PASOS MUY PEQUEÑOS");
    adaptaciones.push("EMOCIONAL: REFUERZO MUY POSITIVO - CELEBRAR PEQUEÑOS LOGROS");
    adaptaciones.push("SÍNTESIS DE VOZ: ACTIVADA OBLIGATORIAMENTE");
  } else {
    Object.entries(perfil.dimensiones).forEach(([dimension, nivel]) => {
      if (parametrosCognitivosBase[nivel] && parametrosCognitivosBase[nivel][dimension]) {
        adaptaciones.push(`${dimension.toUpperCase()}: ${parametrosCognitivosBase[nivel][dimension]}`);
      }
    });
  }

  if (perfil.requiere_mayusculas) {
    adaptaciones.push("FORMATO DE TEXTO: TODO EN MAYÚSCULAS (excepto emojis y números)");
  }

  return adaptaciones.length > 0 ? 
    `ADAPTACIONES PARA ${perfil.nombre_alumno.toUpperCase()}:\n${adaptaciones.join('\n')}` : 
    `ADAPTACIONES ESTÁNDAR PARA ${perfil.nombre_alumno.toUpperCase()}`;
}

// ==================== FUNCIONES ESPECÍFICAS PARA PERFIL N0 ====================

export function esPerfilN0() {
  return estadoGlobal.perfil?.nombre_visible === 'N0';
}

export function obtenerAdaptacionesN0() {
  if (!esPerfilN0()) return null;
  return estadoGlobal.perfil.adaptaciones_texto;
}

export function obtenerPromptGeneracion(tema, materia) {
  const perfil = estadoGlobal.perfil;
  if (!perfil) return "";
  
  if (perfil.nombre_visible === 'N0') {
    const emojisRecomendados = obtenerSugerenciasEmojis(tema);
    const nombreAlumno = perfil.nombre_alumno.toUpperCase();
    
    // ✅ El prompt completo se genera en ai-engine.js
    return `TEMA: "${tema}" | MATERIA: ${materia} | ALUMNO: ${nombreAlumno} | EMOJIS: ${emojisRecomendados}`;
  }
  
  const promptsBase = {
    N1: `Eres LUMAI. Explica "${tema}" de ${materia} para estudiantes con dificultades de aprendizaje. 
         Usa oraciones cortas (máximo 8 palabras), vocabulario simple y ejemplos concretos.`,
    
    N2: `Eres LUMAI. Explica "${tema}" de ${materia} de forma clara y estructurada.
         Usa oraciones de 8-12 palabras y ejemplos prácticos.`,
    
    N3: `Eres LUMAI. Proporciona una explicación completa sobre "${tema}" de ${materia}.
         Incluye conceptos avanzados, relaciones complejas y análisis crítico.`
  };
  
  return promptsBase[perfil.nombre_visible] || promptsBase['N2'];
}

// ==================== CONFIGURACIONES DE ACTIVIDADES ====================

export const configuracionesBasketball = {
  muy_bajo: { 
    numPelotas: 1, 
    velocidad: 0.6, 
    tiempoRespuesta: 12000, 
    numPreguntas: 3 
  },
  bajo: { 
    numPelotas: 3, 
    velocidad: 0.8, 
    tiempoRespuesta: 8000, 
    numPreguntas: 4 
  },
  medio: { 
    numPelotas: 6, 
    velocidad: 0.9, 
    tiempoRespuesta: 6000, 
    numPreguntas: 5 
  },
  alto: { 
    numPelotas: 10, 
    velocidad: 0.9, 
    tiempoRespuesta: 4000, 
    numPreguntas: 6 
  }
};

export function obtenerConfiguracionActividad(tipoActividad, perfil) {
  const configuraciones = {
    "exploradores-sonido": {
      muy_bajo: { frases: 3, velocidad: 0.7, repeticiones: 2, tiempoRespuesta: 15000 },
      bajo: { frases: 4, velocidad: 0.8, repeticiones: 1, tiempoRespuesta: 12000 },
      medio: { frases: 5, velocidad: 0.9, repeticiones: 1, tiempoRespuesta: 10000 },
      alto: { frases: 6, velocidad: 1.0, repeticiones: 1, tiempoRespuesta: 8000 }
    },
    "puente-palabras": {
      muy_bajo: { palabras: 4, conexiones: 2, tiempoRespuesta: 20000, ayuda: true },
      bajo: { palabras: 6, conexiones: 3, tiempoRespuesta: 15000, ayuda: true },
      medio: { palabras: 8, conexiones: 4, tiempoRespuesta: 12000, ayuda: false },
      alto: { palabras: 10, conexiones: 5, tiempoRespuesta: 10000, ayuda: false }
    },
    "aventura-silabas": {
      muy_bajo: { palabras: 3, silabas: 2, tiempoMuestra: 4000, ayudaVisual: true },
      bajo: { palabras: 4, silabas: 3, tiempoMuestra: 3000, ayudaVisual: true },
      medio: { palabras: 5, silabas: 4, tiempoMuestra: 2500, ayudaVisual: false },
      alto: { palabras: 6, silabas: 5, tiempoMuestra: 2000, ayudaVisual: false }
    },
    "supermercado": {
      muy_bajo: { productos: 3, categorias: 2, tiempoRespuesta: 15000, ayudaVisual: true },
      bajo: { productos: 5, categorias: 3, tiempoRespuesta: 12000, ayudaVisual: true },
      medio: { productos: 8, categorias: 4, tiempoRespuesta: 10000, ayudaVisual: false },
      alto: { productos: 10, categorias: 5, tiempoRespuesta: 8000, ayudaVisual: false }
    },
    basketball: {
      muy_bajo: { pelotas: 1, velocidad: 0.6, tiempoRespuesta: 12000, preguntas: 3 },
      bajo: { pelotas: 3, velocidad: 0.8, tiempoRespuesta: 8000, preguntas: 4 },
      medio: { pelotas: 6, velocidad: 0.9, tiempoRespuesta: 6000, preguntas: 5 },
      alto: { pelotas: 10, velocidad: 0.9, tiempoRespuesta: 4000, preguntas: 6 }
    },
    race: {
      muy_bajo: { velocidadMundo: 30, tiempoEntrePregunta: 1500, velocidadDescenso: 4, preguntas: 3 },
      bajo: { velocidadMundo: 50, tiempoEntrePregunta: 1200, velocidadDescenso: 6, preguntas: 4 },
      medio: { velocidadMundo: 70, tiempoEntrePregunta: 1000, velocidadDescenso: 8, preguntas: 6 },
      alto: { velocidadMundo: 80, tiempoEntrePregunta: 1000, velocidadDescenso: 12, preguntas: 7 }
    },
    "multiple-choice": {
      muy_bajo: { preguntas: 3, tiempoRespuesta: 15000, opciones: 3 },
      bajo: { preguntas: 3, tiempoRespuesta: 10000, opciones: 3 },
      medio: { preguntas: 4, tiempoRespuesta: 8000, opciones: 4 },
      alto: { preguntas: 5, tiempoRespuesta: 6000, opciones: 4 }
    },
    skater: {
      muy_bajo: { velocidad: 2, barriles: 3, tiempoAparicion: 200, preguntas: 3 },
      bajo: { velocidad: 3, barriles: 4, tiempoAparicion: 150, preguntas: 3 },
      medio: { velocidad: 4, barriles: 5, tiempoAparicion: 100, preguntas: 4 },
      alto: { velocidad: 5, barriles: 6, tiempoAparicion: 90, preguntas: 5 }
    },
    "sopa-de-letras": {
      muy_bajo: { grid: "6x6", direcciones: ["horizontal"] },
      bajo: { grid: "8x8", direcciones: ["horizontal", "vertical"] },
      medio: { grid: "10x10", direcciones: ["horizontal", "vertical", "reversa"] },
      alto: { grid: "12x12", direcciones: ["horizontal", "vertical", "diagonal", "reversa"] }
    },
    "verdadero-falso": {
      muy_bajo: { afirmaciones: 3, tiempoRespuesta: 15000 },
      bajo: { afirmaciones: 3, tiempoRespuesta: 12000 },
      medio: { afirmaciones: 4, tiempoRespuesta: 8000 },
      alto: { afirmaciones: 5, tiempoRespuesta: 6000 }
    }
  };

  const nivel = perfil.nivel_basketball;
  return configuraciones[tipoActividad]?.[nivel] || configuraciones[tipoActividad]?.medio || {};
}

// ==================== CONFIGURACIÓN DE ACTIVIDADES PARA MÉTRICAS ====================

export const configuracionActividadesMetricas = {
  "multiple-choice": {
    metricas_especiales: ['tiempo_respuesta', 'patron_seleccion'],
    conceptos_automaticos: true,
    captura_intentos: true
  },
  "verdadero-falso": {
    metricas_especiales: ['confianza_respuesta', 'patron_vf'],
    conceptos_automaticos: true,
    captura_intentos: true
  },
  "basketball": {
    metricas_especiales: ['precision_movimiento', 'velocidad_reaccion'],
    conceptos_automaticos: false,
    captura_intentos: true
  },
  "skater": {
    metricas_especiales: ['coordinacion', 'timing'],
    conceptos_automaticos: false,
    captura_intentos: true
  },
  "race": {
    metricas_especiales: ['navegacion', 'velocidad_decision'],
    conceptos_automaticos: false,
    captura_intentos: true
  },
  "sopa-de-letras": {
    metricas_especiales: ['patron_busqueda', 'reconocimiento_palabras'],
    conceptos_automaticos: true,
    captura_intentos: false
  },
  "exploradores-sonido": {
    metricas_especiales: ['reconocimiento_auditivo', 'asociacion_conceptual'],
    conceptos_automaticos: true,
    captura_intentos: true
  },
  "puente-palabras": {
    metricas_especiales: ['logica_conexiones', 'razonamiento_verbal'],
    conceptos_automaticos: true,
    captura_intentos: true
  },
  "aventura-silabas": {
    metricas_especiales: ['division_silabica', 'reconocimiento_fonetico'],
    conceptos_automaticos: true,
    captura_intentos: true
  },
  "supermercado": {
    metricas_especiales: ['clasificacion', 'organizacion_conceptual'],
    conceptos_automaticos: true,
    captura_intentos: true
  }
};

// ==================== FUNCIONES DE MÉTRICAS ====================

export function configurarSistemaMetricas() {
  if (!configuracionMetricas.habilitado) {
    console.log('📊 Sistema de métricas deshabilitado');
    return false;
  }

  try {
    if (typeof window !== 'undefined' && window.lumaiTracker) {
      estadoGlobal.trackingHabilitado = true;
      console.log('✅ Sistema de métricas configurado correctamente');
      
      window.lumaiTracker.recordCustomEvent('metrics_system_configured', {
        profilesAvailable: Object.keys(perfiles).length,
        activitiesAvailable: estadoGlobal.tiposActividades.length,
        customEventsTracked: configuracionMetricas.eventosPersonalizados.length
      });
      
      return true;
    } else {
      console.warn('⚠️ Sistema de métricas no disponible');
      estadoGlobal.trackingHabilitado = false;
      return false;
    }
  } catch (error) {
    console.error('❌ Error configurando sistema de métricas:', error);
    estadoGlobal.trackingHabilitado = false;
    return false;
  }
}

export function obtenerConfiguracionMetricasPorPerfil(perfil) {
  if (!perfil || !perfil.configuracion_metricas) {
    return configuracionMetricas;
  }
  
  return {
    ...configuracionMetricas,
    ...perfil.configuracion_metricas
  };
}

export function analizarRendimientoPorPerfil(perfil) {
  if (!window.lumaiTracker || !perfil) {
    return null;
  }

  try {
    const datos = window.lumaiTracker.getAllData();
    const estudiantes = Object.values(datos.students || {});
    
    const estudiantesPerfil = estudiantes.filter(e => e.profile === perfil.nombre_visible);
    
    if (estudiantesPerfil.length === 0) {
      return null;
    }

    const totalSesiones = estudiantesPerfil.reduce((sum, e) => sum + (e.totalSessions || 0), 0);
    const totalTiempo = estudiantesPerfil.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0);
    const totalRespuestas = estudiantesPerfil.reduce((sum, e) => sum + (e.totalAnswers || 0), 0);
    const totalCorrectas = estudiantesPerfil.reduce((sum, e) => sum + (e.totalCorrectAnswers || 0), 0);

    return {
      cantidadEstudiantes: estudiantesPerfil.length,
      sesionesPromedio: totalSesiones / estudiantesPerfil.length,
      tiempoPromedio: totalTiempo / 1000 / 60 / estudiantesPerfil.length,
      precisionPromedio: totalRespuestas > 0 ? (totalCorrectas / totalRespuestas * 100) : 0,
      tiempoEsperado: perfil.configuracion_metricas?.tiempo_sesion_promedio || 25
    };
  } catch (error) {
    console.error('❌ Error analizando rendimiento por perfil:', error);
    return null;
  }
}

// ==================== FUNCIONES DE GESTIÓN DE PERFILES ====================

export function obtenerPerfilPorNombre(nombrePerfil) {
  const perfil = perfiles[nombrePerfil];
  
  if (!perfil) {
    console.warn(`⚠️ Perfil no encontrado: ${nombrePerfil}, usando N2 por defecto`);
    return perfiles.N2;
  }
  
  return perfil;
}

export function listarPerfilesDisponibles() {
  return Object.keys(perfiles);
}

export function obtenerPerfilPorIndice(indice) {
  const nombresPerfiles = Object.keys(perfiles);
  const nombrePerfil = nombresPerfiles[indice];
  
  if (!nombrePerfil) {
    console.warn(`⚠️ Índice de perfil inválido: ${indice}, usando N2 por defecto`);
    return perfiles.N2;
  }
  
  return perfiles[nombrePerfil];
}

// ==================== VALIDACIÓN Y DIAGNÓSTICO ====================

export function validarConfiguracion() {
  const errores = [];
  
  if (!perfiles || Object.keys(perfiles).length === 0) {
    errores.push("No hay perfiles de estudiantes configurados");
  }
  
  if (!estadoGlobal.tiposActividades || estadoGlobal.tiposActividades.length === 0) {
    errores.push("No hay actividades configuradas");
  }
  
  if (configuracionMetricas.habilitado && !configuracionMetricas.clave) {
    errores.push("Configuración de métricas incompleta");
  }
  
  const dimensionesRequeridas = ['lectoescritura', 'atencion_sostenida', 'procesamiento_informacion'];
  dimensionesRequeridas.forEach(dim => {
    if (!parametrosCognitivosBase.bajo[dim]) {
      errores.push(`Falta configuración para dimensión: ${dim}`);
    }
  });
  
  // ✅ Validaciones actualizadas con límites flexibles
  if (perfiles.N0) {
    if (!perfiles.N0.adaptaciones_texto) {
      errores.push('Perfil N0 no tiene adaptaciones_texto definidas');
    }
    if (!perfiles.N0.adaptaciones_texto.max_oraciones_absoluto) {
      errores.push('Perfil N0 no tiene límite absoluto de oraciones');
    }
    if (!perfiles.N0.adaptaciones_texto.max_palabras_absoluto) {
      errores.push('Perfil N0 no tiene límite absoluto de palabras');
    }
    if (!perfiles.N0.adaptaciones_texto.solo_emojis_relevantes) {
      errores.push('Perfil N0 no tiene solo_emojis_relevantes configurado');
    }
  }
  
  if (!ACTIVIDADES_POR_PERFIL) {
    errores.push('Falta configuración ACTIVIDADES_POR_PERFIL');
  }
  
  if (!configuracionActividades || !configuracionActividades.criteriosDominio) {
    errores.push('Falta configuración del sistema de rondas pedagógicas');
  }
  
  if (errores.length > 0) {
    console.error('❌ Errores de configuración:', errores);
    return false;
  }
  
  console.log('✅ Configuración validada correctamente');
  console.log(`🎯 Perfiles disponibles: ${Object.keys(perfiles).join(', ')}`);
  console.log('🎮 Sistema de rondas pedagógicas configurado');
  console.log('✅ Límites flexibles N0 configurados correctamente');
  return true;
}

// ==================== UTILIDADES ====================

export function barajarArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function limpiarTextoParaVoz(texto) {
  return texto
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\sáéíóúüñ.,!?]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function obtenerNombreAlumno() {
  return estadoGlobal.perfil?.nombre_alumno || "Estudiante";
}

export function obtenerPerfilTecnico() {
  return estadoGlobal.perfil?.nombre_visible || "N2";
}

// ==================== DEBUG Y LOGS ====================

export function mostrarEstadoActual() {
  console.table({
    "Nombre Alumno": estadoGlobal.perfil?.nombre_alumno,
    "Perfil Técnico": estadoGlobal.perfil?.nombre_visible,
    "Materia": estadoGlobal.materia,
    "Tema": estadoGlobal.tema,
    "Mayúsculas": estadoGlobal.perfil?.requiere_mayusculas,
    "Síntesis Voz": estadoGlobal.perfil?.usa_sintesis_voz,
    "Tracking Habilitado": estadoGlobal.trackingHabilitado,
    "Es Perfil N0": esPerfilN0(),
    "Límites N0": esPerfilN0() ? 
      `RECOM: 2-4 orac, 3-6 pal | ABS: 5 orac, 10 pal` : 'N/A',
    "Emojis N0": esPerfilN0() ? `máx 3 por oración, solo relevantes` : 'N/A'
  });
  
  if (estadoGlobal.perfil && configuracionActividades) {
    const stats = configuracionActividades.obtenerEstadisticas(estadoGlobal.perfil.nombre_visible);
    console.log('📊 Estadísticas de Progreso:', stats);
  }
}

// ==================== INICIALIZACIÓN ====================

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    validarConfiguracion();
    configurarSistemaMetricas();
  });
}

window.lumaiDebug = {
  estadoGlobal,
  datosSession,
  perfiles,
  mostrarEstadoActual,
  obtenerNombreAlumno,
  obtenerPerfilTecnico,
  configuracionMetricas,
  configuracionActividades,
  configuracionActividadesMetricas,
  esPerfilN0,
  obtenerAdaptacionesN0,
  ACTIVIDADES_POR_PERFIL,
  obtenerActividadesParaPerfil,
  obtenerSugerenciasEmojis
};

// ==================== LOGGING ====================
console.log("⚙️ config.js CON LÍMITES FLEXIBLES cargado correctamente");
console.log(`📊 Sistema de métricas: ${configuracionMetricas.habilitado ? 'HABILITADO' : 'DESHABILITADO'}`);
console.log(`👥 Perfiles disponibles: ${Object.keys(perfiles).join(', ')}`);
console.log(`🎮 Actividades disponibles: ${estadoGlobal.tiposActividades.length}`);
console.log("🎯 PERFIL N0 - LÍMITES FLEXIBLES:");
console.log("   • RECOMENDADO: 2-4 oraciones, 3-6 palabras");
console.log("   • ABSOLUTO: hasta 5 oraciones, hasta 10 palabras");
console.log("   • COMPENSACIÓN: permitida si mantiene ideas completas");
console.log("   • Emojis: máx 3 por oración, solo relevantes");
