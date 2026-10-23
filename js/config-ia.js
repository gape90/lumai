// js/config-ia.js - Clave de la IA y límites de uso (se cambia acá, en un solo lugar)
// =============================================================================
// CLAVE_INCORPORADA: si se pega acá, LumAI funciona en todas las computadoras sin pedirla.
//   ATENCIÓN: el repositorio es público, así que quien abra el código puede ver la clave.
//   Por eso, ANTES de pegarla, en Google AI Studio / Google Cloud hay que:
//     1) restringirla por sitio web (referrers): https://gape90.github.io/*
//     2) restringirla a la API "Generative Language API"
//     3) ponerle un tope de cuota / gasto al proyecto
//   Esas tres cosas son el límite que realmente protege; los de abajo son una ayuda más.
//   Si queda vacía (''), LumAI pide la clave una vez en cada computadora, como hasta ahora.
// =============================================================================
export const CLAVE_INCORPORADA = '';

// Límites por computadora (navegador). Si se pasa alguno, LumAI sigue funcionando sin IA
// (guarda lo que el alumno hizo y avisa que no pudo revisarlo) y retoma cuando pasa el tiempo.
export const LIMITES_IA = {
  porMinuto: 12,            // evita bucles o toques repetidos
  porHora: 120,
  porDia: 400,              // una compu compartida por varios alumnos
  maxCaracteresPedido: 30000, // un pedido más largo que esto no se envía
  maxTokensSalida: 8192     // techo de la respuesta de la IA
};
