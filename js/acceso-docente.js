// js/acceso-docente.js - Acceso al panel docente (reportes y perfiles)
// =============================================================================
// La contraseña no está escrita en el código: se guarda su huella SHA-256 (con un
// prefijo fijo). Quien lea el código no puede saber la contraseña a partir de la huella.
// Es una protección básica: como LumAI no tiene servidor, alguien con conocimientos
// técnicos podría saltearla. Por eso los reportes no deben contener datos de salud.
//
// Para cambiar la contraseña: calcular la huella SHA-256 de "lumai-docente-v1:" + nueva
// contraseña y reemplazar HUELLA. Por ejemplo, en la consola del navegador:
//   LumaiDocente.huella('nueva-clave').then(console.log)
// =============================================================================
(function () {
  const PREFIJO = 'lumai-docente-v1:';
  const HUELLA = 'bb0bc7ce35ed55670120a63ebb258eacd4674dd01dac9e28e2eba05139357796';
  const MARCA = 'lumai_docente_activo';

  // SHA-256 en JavaScript puro (sirve también si la página se abre sin https)
  function sha256(texto) {
    const k = [];
    let n = 2;
    while (k.length < 64) {
      let primo = true;
      for (let d = 2; d * d <= n; d++) if (n % d === 0) { primo = false; break; }
      if (primo) k.push((Math.pow(n, 1 / 3) % 1) * 4294967296 | 0);
      n++;
    }
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const bytes = Array.from(new TextEncoder().encode(texto));
    const largoBits = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (largoBits >>> (i * 8)) & 0xff);
    const rotar = (x, r) => (x >>> r) | (x << (32 - r));
    for (let i = 0; i < bytes.length; i += 64) {
      const w = [];
      for (let j = 0; j < 16; j++) w[j] = (bytes[i + 4 * j] << 24) | (bytes[i + 4 * j + 1] << 16) | (bytes[i + 4 * j + 2] << 8) | bytes[i + 4 * j + 3];
      for (let j = 16; j < 64; j++) {
        const s0 = rotar(w[j - 15], 7) ^ rotar(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rotar(w[j - 2], 17) ^ rotar(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let j = 0; j < 64; j++) {
        const t1 = (hh + (rotar(e, 6) ^ rotar(e, 11) ^ rotar(e, 25)) + ((e & f) ^ (~e & g)) + k[j] + w[j]) | 0;
        const t2 = ((rotar(a, 2) ^ rotar(a, 13) ^ rotar(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  window.LumaiDocente = {
    huella: async (clave) => sha256(PREFIJO + clave),
    verificar: async (clave) => sha256(PREFIJO + String(clave || '')) === HUELLA,
    // La sesión docente dura mientras la pestaña esté abierta
    marcar: () => { try { sessionStorage.setItem(MARCA, '1'); } catch (e) {} },
    activo: () => { try { return sessionStorage.getItem(MARCA) === '1'; } catch (e) { return false; } },
    salir: () => { try { sessionStorage.removeItem(MARCA); } catch (e) {} }
  };
})();
