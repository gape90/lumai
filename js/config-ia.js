// js/config-ia.js - Dirección del intermediario de IA (Cloudflare Worker)
// Si está completa, LumAI le habla al intermediario (que guarda la clave en secreto) y nunca pide la clave.
// Si queda vacía (''), LumAI pide la clave una vez en cada computadora, como antes.
export const URL_INTERMEDIARIO = 'https://lumai-ia.gape90.workers.dev';
