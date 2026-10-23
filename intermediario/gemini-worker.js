// Intermediario de LumAI (Cloudflare Worker)
// Guarda la clave de Gemini en secreto y le habla a Google en nombre de LumAI.
// La clave se carga en Cloudflare como secreto (nunca va en este archivo). Se usa el secreto llamado
// GEMINI_KEY o, si el nombre quedó distinto, cualquier secreto que sea una clave de Google (empieza con "AIza").

const PERMITIDOS = [
  'https://gape90.github.io',   // LumAI publicado
  'http://localhost:8765',      // pruebas en la compu
  'http://localhost:8000',
  'http://127.0.0.1:8765'
];
const MODELO = 'gemini-3.1-flash-lite';
const MAX_CARACTERES = 60000;   // tamaño máximo de un pedido
const MAX_TOKENS = 8192;        // techo de la respuesta

export default {
  async fetch(request, env) {
    const origen = request.headers.get('Origin') || '';
    const permitido = PERMITIDOS.includes(origen);
    const cors = {
      'Access-Control-Allow-Origin': permitido ? origen : PERMITIDOS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const responder = (estado, objeto) => new Response(JSON.stringify(objeto), {
      status: estado, headers: { ...cors, 'Content-Type': 'application/json' }
    });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!permitido) return responder(403, { error: { message: 'Sitio no autorizado' } });
    if (request.method !== 'POST') return responder(405, { error: { message: 'Solo POST' } });
    const clave = env.GEMINI_KEY || Object.values(env).find(v => typeof v === 'string' && v.startsWith('AIza'));
    if (!clave) return responder(500, { error: { message: 'Falta cargar la clave de Gemini como secreto en Cloudflare' } });

    const texto = await request.text();
    if (texto.length > MAX_CARACTERES) return responder(413, { error: { message: 'Pedido demasiado largo' } });

    let cuerpo;
    try { cuerpo = JSON.parse(texto); } catch (e) { return responder(400, { error: { message: 'Pedido inválido' } }); }
    if (!Array.isArray(cuerpo.contents)) return responder(400, { error: { message: 'Pedido inválido' } });

    // Solo se reenvía lo necesario, con el techo de tokens fijado acá
    const pedido = {
      contents: cuerpo.contents,
      generationConfig: {
        ...(cuerpo.generationConfig || {}),
        maxOutputTokens: Math.min(Number(cuerpo.generationConfig?.maxOutputTokens) || MAX_TOKENS, MAX_TOKENS)
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify(pedido)
      });
      return new Response(await r.text(), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) {
      return responder(502, { error: { message: 'No se pudo conectar con Gemini' } });
    }
  }
};
