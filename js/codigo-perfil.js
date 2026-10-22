// js/codigo-perfil.js - Código de perfil del alumno (sin guardar datos en ningún lado)
// =============================================================================
// El docente arma el perfil (13 dimensiones + intereses) y LumAI lo convierte en un
// código corto, por ejemplo K7QM-29XA-P. El alumno entra con su nombre y ese código,
// y LumAI obtiene el perfil del propio código. No existe ninguna lista de perfiles:
// ni en el sitio, ni en GitHub, ni en un servidor. El nombre nunca forma parte del código.
//
// Formato (versión 1): 8 caracteres de datos + 1 dígito de control, en base 32 (Crockford,
// sin I, L, O ni U para evitar confusiones). Los datos se mezclan para que perfiles
// parecidos no den códigos parecidos, y llevan un número al azar: dos alumnos con el
// mismo perfil reciben códigos distintos.
//
// IMPORTANTE: el orden de DIMENSIONES, GRADOS e INTERESES no se puede cambiar sin
// invalidar los códigos ya entregados. Para agregar algo, crear una versión 2.
//
// Uso (script común, sin módulos):  window.LumaiCodigo.crear(perfil, interes)
//                                    window.LumaiCodigo.leer('K7QM-29XA-P')
// =============================================================================
(function () {
  const DIMENSIONES = ['lectoescritura', 'comprension_lectora', 'comprension_oral', 'razonamiento',
    'memoria_trabajo', 'atencion', 'velocidad', 'motricidad', 'canal_acceso',
    'tolerancia_frustracion', 'sentido_numerico', 'sensibilidad_sensorial', 'previsibilidad'];
  const GRADOS = ['generalizado', 'extenso', 'limitado', 'tipico', 'fortaleza'];
  const INTERESES = ['Sin indicar', 'Fútbol y deportes', 'Música', 'Animales', 'Dinosaurios', 'Videojuegos',
    'Dibujo y arte', 'Ciencia y espacio', 'Autos y motos', 'Cocina', 'Tecnología y robots',
    'Naturaleza y plantas', 'Baile', 'Superhéroes y cómics', 'Historia y misterios', 'Moda'];
  const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const BITS = 40n;
  const MASCARA = (1n << BITS) - 1n;
  const A = 0x5DEECE66Dn;            // impar: la mezcla es reversible
  const B = 0xB2F3A1C9E7n & MASCARA;
  const MAXIMO = (5n ** 13n) * 16n * 32n;

  function inversoModular(a, m) {
    let [r0, r1] = [a, m];
    let [s0, s1] = [1n, 0n];
    while (r1 !== 0n) {
      const q = r0 / r1;
      [r0, r1] = [r1, r0 - q * r1];
      [s0, s1] = [s1, s0 - q * s1];
    }
    return ((s0 % m) + m) % m;
  }
  const A_INV = inversoModular(A, 1n << BITS);

  function control(valores) {
    // Pesos impares: cualquier error en un solo carácter cambia el dígito de control
    return valores.reduce((s, v, i) => s + v * (2 * i + 1), 0) % 32;
  }

  function crear(perfil, interes, azar) {
    perfil = perfil || {};
    let d = 0n;
    for (const dim of DIMENSIONES) {
      const g = GRADOS.indexOf(perfil[dim] || 'tipico');
      d = d * 5n + BigInt(g < 0 ? 3 : g);
    }
    const i = Math.max(0, INTERESES.indexOf(interes));
    const sal = BigInt(azar === undefined ? Math.floor(Math.random() * 32) : azar % 32);
    const v = (d * 16n + BigInt(i)) * 32n + sal;
    let x = (v * A + B) & MASCARA;
    const valores = [];
    for (let k = 0; k < 8; k++) { valores.unshift(Number(x & 31n)); x >>= 5n; }
    valores.push(control(valores));
    const t = valores.map(v2 => ALFABETO[v2]).join('');
    return `${t.slice(0, 4)}-${t.slice(4, 8)}-${t[8]}`;
  }

  function normalizar(codigo) {
    return String(codigo || '').toUpperCase().replace(/[\s-]/g, '')
      .replace(/O/g, '0').replace(/[IL]/g, '1');
  }

  function leer(codigo) {
    const c = normalizar(codigo);
    if (c.length !== 9) return null;
    const valores = [...c].map(ch => ALFABETO.indexOf(ch));
    if (valores.some(v => v < 0)) return null;
    if (control(valores.slice(0, 8)) !== valores[8]) return null;
    let x = 0n;
    for (const v of valores.slice(0, 8)) x = (x << 5n) | BigInt(v);
    const v = ((x - B) * A_INV) & MASCARA;
    if (v >= MAXIMO) return null;
    const interes = INTERESES[Number((v / 32n) % 16n)];
    let d = v / 512n;
    const grados = [];
    for (let k = 0; k < DIMENSIONES.length; k++) { grados.unshift(GRADOS[Number(d % 5n)]); d /= 5n; }
    const perfil = {};
    DIMENSIONES.forEach((dim, k) => { if (grados[k] !== 'tipico') perfil[dim] = grados[k]; });
    return { perfil, interes };
  }

  // Nivel general aproximado (N0 a N3) para las partes de LumAI que todavía usan niveles
  function nivelAproximado(perfil) {
    const peor = ['lectoescritura', 'comprension_lectora']
      .map(dim => GRADOS.indexOf((perfil || {})[dim] || 'tipico'))
      .reduce((a, b) => Math.min(a, b), 3);
    return ['N0', 'N1', 'N2', 'N3', 'N3'][peor];
  }

  window.LumaiCodigo = { crear, leer, normalizar, nivelAproximado, DIMENSIONES, GRADOS, INTERESES };
})();
