// Todo lo que se le pide a Claude. Cada llamada es independiente: el prompt lleva instrucciones, datos y formato.
import { isNum, todayISO, uid } from './model.js';

let samplePromise = null;
export function getSample() {
  if (!samplePromise) {
    samplePromise = window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);
  }
  return samplePromise;
}

const PERMANENTES = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
export const esPermanente = (e) => PERMANENTES.includes(e?.code);

export function mensajeError(e) {
  switch (e?.code) {
    case 'cancelled': return '';
    case 'not_granted': return 'Esta página no tiene permiso para usar Claude. Podés darlo desde el menú de permisos del artifact y recargar.';
    case 'sampling_disabled': return 'Claude no está disponible para tu cuenta u organización.';
    case 'rate_limited': return 'Llegaste al límite de solicitudes por ahora. Esperá un momento y probá de nuevo.';
    case 'session_expired': return 'Tu sesión de claude.ai expiró. Volvé a iniciar sesión y recargá la página.';
    case 'prompt_too_large': return 'El texto es demasiado largo para enviarlo de una vez. Probá con una parte más corta.';
    case 'refused': return 'Claude no respondió a esta solicitud. Probá con otro texto.';
    case 'empty_completion': return 'Claude no devolvió nada. Probá con una solicitud más corta.';
    case 'invalid_json': return 'La respuesta llegó incompleta. Probá de nuevo.';
    case 'sin_ia': return 'Las funciones con Claude solo están disponibles al abrir SkillsStudy AI en claude.ai con tu sesión iniciada.';
    default: return 'Se cortó la conexión con Claude. Probá de nuevo.';
  }
}

async function need() {
  const sample = await getSample();
  if (!sample) throw { code: 'sin_ia', message: 'sample no disponible' };
  return sample;
}

const ESTILO = 'Escribí en español de Costa Rica, claro y directo. Cuando sirva un ejemplo, usá situaciones cotidianas de Costa Rica (colones, sodas, buses, la U).';

// ---------- 1. Leer el programa del curso ----------

export async function extraerPrograma(texto, { signal, onText } = {}) {
  const sample = await need();
  const prompt = `Leé el programa de un curso universitario y extraé los datos para planificar el estudio.

Respondé SOLO con un objeto JSON con esta forma:
{"nombre": string, "institucion": string|null, "periodo": string|null, "escala": 100 o 10, "notaAprobacion": number|null, "inicio": "AAAA-MM-DD"|null, "fin": "AAAA-MM-DD"|null,
 "evaluaciones": [{"nombre": string, "tipo": "parcial"|"examen"|"quiz"|"tarea"|"proyecto"|"laboratorio"|"otro", "peso": number, "fecha": "AAAA-MM-DD"|null, "temas": [number]}],
 "temas": [{"nombre": string, "semana": number|null, "resumen": string}],
 "avisos": [string]}

Reglas:
- No inventes nada. Si un dato no aparece, usá null.
- "peso" es el porcentaje de la nota final, sin el símbolo %.
- "notaAprobacion" va en la misma escala del curso (por ejemplo 7 en escala de 10, o 70 en escala de 100).
- "temas" de cada evaluación son los números (empezando en 1) de los temas que evalúa, según la lista "temas". Si el programa no lo dice, dejá [].
- Agrupá el contenido en unidades o capítulos: entre 3 y 15 temas. "semana" es la semana del curso (la semana 1 es la de inicio) en que se ve el tema. "resumen" es una frase corta.
- Si una fecha no trae año, deducilo del periodo o de las demás fechas. Si no se puede saber, null.
- Si una evaluación tiene un rango de fechas, usá la fecha de entrega o la última.
- En "avisos" anotá en una frase cada dato ambiguo o faltante que el estudiante deba revisar (máximo 4).

Hoy es ${todayISO()}.

PROGRAMA DEL CURSO:
"""
${texto.slice(0, 60000)}
"""`;
  const r = await sample.json(prompt, { signal, onText, modelTier: 'default' });
  return normalizarPrograma(r);
}

function normalizarPrograma(r) {
  if (!r || typeof r !== 'object') throw { code: 'invalid_json', message: 'sin objeto' };
  const escala = r.escala === 10 ? 10 : 100;
  const temas = (Array.isArray(r.temas) ? r.temas : []).slice(0, 20).map((t) => ({
    id: uid('t'),
    nombre: String(t?.nombre || '').trim() || 'Tema sin nombre',
    semana: isNum(t?.semana) ? Math.round(t.semana) : null,
    resumen: String(t?.resumen || '').trim(),
  }));
  const fecha = (f) => (typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : null);
  const tipos = ['parcial', 'examen', 'quiz', 'tarea', 'proyecto', 'laboratorio', 'otro'];
  const evaluaciones = (Array.isArray(r.evaluaciones) ? r.evaluaciones : []).slice(0, 30).map((e) => ({
    id: uid('ev'),
    nombre: String(e?.nombre || '').trim() || 'Evaluación',
    tipo: tipos.includes(e?.tipo) ? e.tipo : 'otro',
    peso: isNum(e?.peso) ? e.peso : isNum(parseFloat(e?.peso)) ? parseFloat(e.peso) : 0,
    fecha: fecha(e?.fecha),
    temas: (Array.isArray(e?.temas) ? e.temas : []).map((n) => temas[n - 1]?.id).filter(Boolean),
    nota: null,
  }));
  let nota = isNum(r.notaAprobacion) ? r.notaAprobacion : null;
  if (nota != null && escala === 10) nota *= 10;
  if (nota != null && (nota <= 0 || nota > 100)) nota = null;
  return {
    nombre: String(r.nombre || '').trim(),
    institucion: r.institucion ? String(r.institucion) : '',
    periodo: r.periodo ? String(r.periodo) : '',
    escala,
    notaAprobacion: nota ?? 70,
    inicio: fecha(r.inicio),
    fin: fecha(r.fin),
    temas,
    evaluaciones,
    avisos: (Array.isArray(r.avisos) ? r.avisos : []).map(String).slice(0, 4),
  };
}

// ---------- 2. Menú al seleccionar texto ----------

export const ACCIONES = {
  simple: { label: 'Más simple', pide: 'Explicá el fragmento con palabras más simples, sin perder lo importante.' },
  ejemplo: { label: 'Un ejemplo', pide: 'Dá un ejemplo concreto que ilustre el fragmento. Si tiene números, mostrá el cálculo paso a paso.' },
  traducir: { label: 'Traducir', pide: 'Traducí el fragmento al español. Si ya está en español, traducilo al inglés. Respondé solo con la traducción.' },
  importa: { label: '¿Por qué importa?', pide: 'Explicá por qué este fragmento importa en el curso y cómo podría aparecer en un examen.' },
};
export const NIVELES_EXPLICACION = {
  '12': { label: '12 años', pide: 'Explicalo como para alguien de 12 años: sin jerga y con una comparación de la vida diaria.' },
  normal: { label: 'Normal', pide: 'Nivel universitario introductorio.' },
  examen: { label: 'Examen', pide: 'Con la precisión y los términos técnicos que pediría un examen.' },
};

export async function explicar({ accion, nivel, seleccion, contexto, curso, signal, onText }) {
  const sample = await need();
  const a = ACCIONES[accion];
  const n = NIVELES_EXPLICACION[nivel];
  const prompt = `Sos tutor del curso "${curso}". Un estudiante seleccionó este fragmento de su material:
"""
${seleccion.slice(0, 2000)}
"""

Párrafo donde aparece, como contexto:
"""
${contexto.slice(0, 3000)}
"""

Tarea: ${a.pide}
${accion === 'traducir' ? '' : `Nivel: ${n.pide}\nMáximo 150 palabras. Podés usar viñetas con "- " y **negrita** para lo clave. Sin títulos.`}
${ESTILO}`;
  return sample(prompt, { signal, onText, modelTier: accion === 'traducir' ? 'quick' : 'default' });
}

// ---------- 3. Preguntas para quests y simulacros ----------

function validarPreguntas(arr, temaIds) {
  if (!Array.isArray(arr)) throw { code: 'invalid_json', message: 'sin arreglo' };
  return arr
    .filter((p) => p && typeof p.pregunta === 'string' && Array.isArray(p.opciones) && p.opciones.length === 4
      && Number.isInteger(p.correcta) && p.correcta >= 0 && p.correcta < 4)
    .map((p) => ({
      id: uid('q'),
      temaId: temaIds.length === 1 ? temaIds[0] : temaIds[(Number(p.tema) || 1) - 1] || temaIds[0],
      pregunta: p.pregunta.trim(),
      opciones: p.opciones.map((o) => String(o).trim()),
      correcta: p.correcta,
      explicacion: String(p.explicacion || '').trim(),
    }));
}

export async function generarPreguntas({ curso, temas, contexto, n = 6, evitar = [], estilo = '', signal, onText }) {
  const sample = await need();
  const lista = temas.map((t, i) => `${i + 1}. ${t.nombre}${t.resumen ? ' — ' + t.resumen : ''}`).join('\n');
  const prompt = `Creá ${n} preguntas de selección única para practicar el curso "${curso}".
${temas.length === 1 ? `Tema: ${temas[0].nombre}${temas[0].resumen ? ' — ' + temas[0].resumen : ''}` : `Repartilas entre estos temas:\n${lista}`}

${contexto ? `Basate SOLO en este material del curso:\n"""\n${contexto}\n"""` : 'No hay material del curso: basate en el contenido estándar de ese tema en un curso universitario introductorio.'}

Reglas:
- 4 opciones por pregunta y una sola correcta. Los distractores deben ser errores comunes y creíbles.
- Variá la dificultad: unas fáciles, la mayoría medias y alguna difícil. Al menos un tercio de aplicación (casos o cálculos).
- La explicación dice en una o dos frases por qué la correcta es correcta.
${evitar.length ? `- No repitas estas preguntas:\n${evitar.slice(-25).map((p) => '  * ' + p).join('\n')}` : ''}
${estilo ? `- Imitá el estilo y el nivel de estas preguntas de exámenes anteriores del curso (no las copies):\n"""\n${estilo.slice(0, 6000)}\n"""` : ''}
${ESTILO}

Respondé SOLO con un arreglo JSON, sin texto antes ni después:
[{"pregunta": "...", "opciones": ["...", "...", "...", "..."], "correcta": 0, "explicacion": "..."${temas.length > 1 ? ', "tema": 1' : ''}}]`;
  const r = await sample.json(prompt, { signal, onText, modelTier: 'default', cache: false });
  return validarPreguntas(r, temas.map((t) => t.id));
}

// ---------- 4. Técnica Feynman ----------

export async function revisarFeynman({ curso, tema, contexto, explicacion, signal, onText }) {
  const sample = await need();
  const prompt = `Sos tutor del curso "${curso}". Un estudiante usa la técnica Feynman: explicó con sus palabras el tema "${tema.nombre}" como si se lo enseñara a un compañero.

${contexto ? `Material del curso (la referencia correcta):\n"""\n${contexto}\n"""` : `No hay material del curso. Tema: ${tema.nombre}${tema.resumen ? ' — ' + tema.resumen : ''}. Usá el contenido estándar de un curso universitario introductorio.`}

Explicación del estudiante:
"""
${explicacion.slice(0, 6000)}
"""

Evaluá la explicación contra el material. Sé específico, honesto y amable. Hablale de vos.
- "bien": lo que explicó correctamente (máximo 3).
- "falta": ideas centrales del tema que no mencionó (máximo 3).
- "errores": afirmaciones incorrectas o confusas, cada una con la corrección (máximo 3; [] si no hay).
- "puntaje": de 0 a 100. 90 o más: podría enseñarlo. 70: entiende lo central. Menos de 50: tiene confusiones importantes.
- "pregunta": una pregunta para que profundice en lo que más le falta.

Respondé SOLO con este JSON:
{"puntaje": 0, "bien": ["..."], "falta": ["..."], "errores": ["..."], "pregunta": "..."}`;
  const r = await sample.json(prompt, { signal, onText, modelTier: 'default', cache: false });
  const list = (x) => (Array.isArray(x) ? x.map(String).filter(Boolean).slice(0, 3) : []);
  if (!r || typeof r !== 'object') throw { code: 'invalid_json', message: 'sin objeto' };
  return {
    puntaje: isNum(r.puntaje) ? Math.max(0, Math.min(100, Math.round(r.puntaje))) : 0,
    bien: list(r.bien),
    falta: list(r.falta),
    errores: list(r.errores),
    pregunta: String(r.pregunta || ''),
  };
}
