// Lógica pura: fechas, notas, plan semanal, dominio y quests. Sin DOM ni red.

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9);
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- Fechas (siempre locales, formato AAAA-MM-DD) ----------

export function parseISO(s) {
  if (!s || typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const today = () => startOfDay(new Date());
export const todayISO = () => toISO(today());
export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
export function startOfWeek(d) {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7)); // lunes
}
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function fmtDate(d, { weekday = false } = {}) {
  if (typeof d === 'string') d = parseISO(d);
  if (!d) return 'Sin fecha';
  return `${weekday ? DIAS[d.getDay()] + ' ' : ''}${d.getDate()} ${MESES[d.getMonth()]}`;
}
export function fmtLongToday(d = today()) {
  return `${DIAS_LARGO[d.getDay()]} ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`;
}
export function fmtRange(a, b) {
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MESES[b.getMonth()]}`;
  return `${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]}`;
}
export function fmtDaysLeft(n) {
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  if (n === -1) return 'ayer';
  if (n < 0) return `hace ${-n} días`;
  return `en ${n} días`;
}

// ---------- Números y notas ----------

export function fmtNum(v, dec = 1) {
  if (!isNum(v)) return '—';
  return v.toLocaleString('es-CR', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}
// Las notas se guardan de 0 a 100. La escala del curso solo cambia cómo se muestran.
export function fmtGrade(v, escala = 100, { ceil = false } = {}) {
  if (!isNum(v)) return '—';
  if (escala === 10) {
    const x = ceil ? Math.ceil(v) / 10 : Math.round(v) / 10;
    return x.toLocaleString('es-CR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return String(ceil ? Math.ceil(v - 1e-9) : Math.round(v));
}
export const toInternal = (v, escala) => (escala === 10 ? v * 10 : v);
export const fromInternal = (v, escala) => (escala === 10 ? v / 10 : v);

export const EXAM_TYPES = ['parcial', 'examen', 'quiz'];
export const TIPOS = [
  ['parcial', 'Parcial'], ['examen', 'Examen'], ['quiz', 'Quiz'], ['tarea', 'Tarea'],
  ['proyecto', 'Proyecto'], ['laboratorio', 'Laboratorio'], ['otro', 'Otro'],
];
export const isExam = (ev) => EXAM_TYPES.includes(ev.tipo);

export function gradeSummary(course) {
  const evs = course.evaluaciones || [];
  const total = sum(evs.map((e) => e.peso || 0));
  const graded = evs.filter((e) => isNum(e.nota));
  const pending = evs.filter((e) => !isNum(e.nota));
  const gradedWeight = sum(graded.map((e) => e.peso || 0));
  const earned = sum(graded.map((e) => ((e.peso || 0) * e.nota) / 100));
  const remaining = total - gradedWeight;
  const pass = isNum(course.notaAprobacion) ? course.notaAprobacion : 70;
  const target = (pass * total) / 100;
  const lost = gradedWeight - earned;
  const finalIfAvg = (avg) => (total > 0 ? ((earned + (remaining * avg) / 100) / total) * 100 : null);
  let needed = null;
  let status;
  if (total <= 0) status = 'vacio';
  else if (remaining <= 1e-6) status = earned + 1e-9 >= target ? 'aprobado' : 'reprobado';
  else {
    needed = ((target - earned) / remaining) * 100;
    status = needed <= 0 ? 'asegurado' : needed > 100 ? 'imposible' : 'posible';
  }
  const currentAvg = gradedWeight > 0 ? (earned / gradedWeight) * 100 : null;
  return {
    total, earned, lost, remaining, gradedWeight, pass, target, needed, status, currentAvg,
    graded, pending, finalIfAvg, maxFinal: finalIfAvg(100),
    final: remaining <= 1e-6 && total > 0 ? (earned / total) * 100 : null,
  };
}

// ---------- Semanas y plan ----------

export function courseWeeks(course) {
  let start = parseISO(course.inicio);
  let end = parseISO(course.fin);
  const evDates = (course.evaluaciones || []).map((e) => parseISO(e.fecha)).filter(Boolean);
  if (!start) start = evDates.length ? addDays(new Date(Math.min(...evDates)), -35) : today();
  if (!end || end < start) end = evDates.length ? new Date(Math.max(...evDates, start)) : addDays(start, 7 * 15);
  const weeks = [];
  for (let d = startOfWeek(start), n = 1; d <= end && n <= 30; d = addDays(d, 7), n++) {
    weeks.push({ n, start: d, end: addDays(d, 6) });
  }
  return weeks;
}
export function weekOf(weeks, date) {
  if (!date || !weeks.length) return null;
  const n = Math.floor(daysBetween(weeks[0].start, date) / 7) + 1;
  return clamp(n, 1, weeks.length);
}
export function currentWeek(weeks) {
  if (!weeks.length) return null;
  const t = today();
  if (t < weeks[0].start) return 0;
  if (t > weeks[weeks.length - 1].end) return weeks.length + 1;
  return weekOf(weeks, t);
}

// Semana de cada tema: la del programa o, si falta, repartida en orden.
export function topicWeeks(course, nWeeks) {
  const temas = course.temas || [];
  const out = {};
  const known = temas.filter((t) => isNum(t.semana));
  temas.forEach((t, i) => {
    if (isNum(t.semana)) out[t.id] = clamp(Math.round(t.semana), 1, nWeeks);
    else if (!known.length) out[t.id] = clamp(1 + Math.floor((i * Math.max(nWeeks - 2, 1)) / Math.max(temas.length, 1)), 1, nWeeks);
  });
  // Temas sin semana entre temas con semana: la del anterior.
  let last = 1;
  temas.forEach((t) => {
    if (out[t.id]) last = out[t.id];
    else out[t.id] = last;
  });
  return out;
}

const roundHalf = (x) => Math.round(x * 2) / 2;

export function buildPlan(course) {
  const weeks = courseWeeks(course);
  if (!weeks.length) return { weeks: [], current: null };
  const tw = topicWeeks(course, weeks.length);
  const evs = (course.evaluaciones || []).map((e) => ({ ...e, w: weekOf(weeks, parseISO(e.fecha)) }));
  const temaById = Object.fromEntries((course.temas || []).map((t) => [t.id, t]));
  const plan = weeks.map((w) => ({ ...w, tasks: [], evs: [], temas: [], horas: 2 }));

  (course.temas || []).forEach((t) => {
    const wk = plan[tw[t.id] - 1];
    if (!wk) return;
    wk.temas.push(t);
    wk.tasks.push({ id: `t-${t.id}-leer`, tipo: 'estudiar', texto: `Estudiar: ${t.nombre}`, temaId: t.id });
    wk.tasks.push({ id: `t-${t.id}-quest`, tipo: 'quest', texto: `Quest: ${t.nombre}`, temaId: t.id });
  });

  evs.forEach((ev) => {
    if (!ev.w) return;
    const wk = plan[ev.w - 1];
    wk.evs.push(ev);
    const before = plan[ev.w - 2];
    if (isExam(ev)) {
      const where = before || wk;
      const temas = (ev.temas || []).map((id) => temaById[id]?.nombre).filter(Boolean);
      where.tasks.push({ id: `e-${ev.id}-repaso`, tipo: 'repaso', texto: `Repasar para ${ev.nombre} (${fmtNum(ev.peso)} %)`, evId: ev.id, detalle: temas.join(', ') });
      where.tasks.push({ id: `e-${ev.id}-simulacro`, tipo: 'simulacro', texto: `Simulacro de ${ev.nombre}`, evId: ev.id });
    } else {
      for (let k = 2; k >= 1; k--) {
        const pw = plan[ev.w - 1 - k];
        if (pw) pw.tasks.push({ id: `e-${ev.id}-avance-${k}`, tipo: 'avance', texto: `Avanzar: ${ev.nombre}`, evId: ev.id });
      }
      wk.tasks.push({ id: `e-${ev.id}-entrega`, tipo: 'entrega', texto: `Entregar: ${ev.nombre} (${fmtNum(ev.peso)} %)`, evId: ev.id });
    }
  });

  // Más horas cuando lo que viene pesa más.
  plan.forEach((wk, i) => {
    const near = [...wk.evs, ...(plan[i + 1]?.evs || [])];
    wk.horas = clamp(roundHalf(2 + wk.temas.length * 1 + sum(near.map((e) => (e.peso || 0) * 0.12))), 2, 14);
  });

  return { weeks: plan, current: currentWeek(weeks) };
}

export function taskDone(course, task) {
  if (course.plan?.hechos?.[task.id]) return true;
  if (task.tipo === 'quest') return !!course.quests?.[task.temaId]?.completada;
  if (task.tipo === 'simulacro') return (course.simulacros || []).some((s) => s.evId === task.evId);
  return false;
}

// Tareas de semanas pasadas que siguen pendientes y todavía tienen sentido.
export function overdueTasks(course, plan) {
  if (!plan.current || plan.current < 2) return [];
  const evById = Object.fromEntries((course.evaluaciones || []).map((e) => [e.id, e]));
  const t = today();
  const out = [];
  plan.weeks.slice(0, Math.min(plan.current - 1, plan.weeks.length)).forEach((wk) => {
    wk.tasks.forEach((task) => {
      if (taskDone(course, task)) return;
      if (task.evId) {
        const ev = evById[task.evId];
        if (!ev || isNum(ev.nota)) return;
        const d = parseISO(ev.fecha);
        if (d && d < t) return;
      }
      out.push({ ...task, semana: wk.n });
    });
  });
  return out;
}

// Semanas con 2 o más evaluaciones, sumando todos los cursos.
export function clashes(courses) {
  const byWeek = new Map();
  const t = today();
  courses.forEach((c) => {
    (c.evaluaciones || []).forEach((ev) => {
      const d = parseISO(ev.fecha);
      if (!d || d < t) return;
      const key = toISO(startOfWeek(d));
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key).push({ curso: c, ev, d });
    });
  });
  return [...byWeek.entries()]
    .filter(([, items]) => items.length >= 2)
    .map(([key, items]) => {
      const start = parseISO(key);
      return { start, end: addDays(start, 6), items: items.sort((a, b) => a.d - b.d), peso: sum(items.map((i) => i.ev.peso || 0)) };
    })
    .sort((a, b) => a.start - b.start);
}

export function nextEvaluation(course) {
  const t = today();
  return (course.evaluaciones || [])
    .filter((e) => !isNum(e.nota) && parseISO(e.fecha) && parseISO(e.fecha) >= t)
    .sort((a, b) => parseISO(a.fecha) - parseISO(b.fecha))[0] || null;
}

// ---------- Dominio por tema ----------

export function mastery(course, temaId) {
  const r = course.dominio?.[temaId]?.r || [];
  if (!r.length) return { score: null, n: 0, nivel: 'nada' };
  let num = 0;
  let den = 0;
  r.forEach((v, i) => {
    const w = Math.pow(0.85, r.length - 1 - i);
    num += w * v;
    den += w;
  });
  const score = Math.round((num / den) * 100);
  return { score, n: r.length, nivel: score >= 80 ? 'dominado' : score >= 50 ? 'camino' : 'flojo' };
}
export function addResult(course, temaId, value) {
  course.dominio = course.dominio || {};
  const d = course.dominio[temaId] || { r: [] };
  d.r = [...d.r, clamp(value, 0, 1)].slice(-12);
  course.dominio[temaId] = d;
}

export const NIVELES = {
  nada: { label: 'Sin practicar', icon: '○', cls: 'st-none' },
  flojo: { label: 'Flojo', icon: '!', cls: 'st-crit' },
  camino: { label: 'En camino', icon: '◐', cls: 'st-warn' },
  dominado: { label: 'Dominado', icon: '✓', cls: 'st-good' },
};

// Temas que una evaluación cubre; si el programa no lo dice, todos.
export function evalTopics(course, ev) {
  const ids = (ev.temas || []).filter((id) => (course.temas || []).some((t) => t.id === id));
  return ids.length ? ids : (course.temas || []).map((t) => t.id);
}

// Puntos de la nota final que dependen de cada tema.
export function topicPoints(course, { soloPendientes = false } = {}) {
  const pts = Object.fromEntries((course.temas || []).map((t) => [t.id, 0]));
  (course.evaluaciones || []).forEach((ev) => {
    if (soloPendientes && isNum(ev.nota)) return;
    const ids = evalTopics(course, ev);
    ids.forEach((id) => { pts[id] += (ev.peso || 0) / ids.length; });
  });
  return pts;
}

// El tema que más conviene practicar: ya visto en clase, vale mucho de lo que falta y va mal.
export function recommendTopic(course) {
  const plan = buildPlan(course);
  const tw = topicWeeks(course, plan.weeks.length || 1);
  const pend = topicPoints(course, { soloPendientes: true });
  const cur = plan.current ?? 1;
  let best = null;
  (course.temas || []).forEach((t) => {
    if (cur && tw[t.id] > cur) return;
    const m = mastery(course, t.id);
    const gap = m.score == null ? 0.7 : (100 - m.score) / 100;
    const value = (pend[t.id] || 0) * gap;
    if (value > 0 && (!best || value > best.value)) best = { tema: t, value, pts: pend[t.id], m };
  });
  return best;
}

// ---------- Quests ----------

export function questUnlocked(course, temaId) {
  const temas = course.temas || [];
  const i = temas.findIndex((t) => t.id === temaId);
  if (i <= 0) return true;
  return !!course.quests?.[temas[i - 1].id]?.completada || !!course.quests?.[temaId]?.completada;
}

// Primero lo que falló la última vez, después lo nunca visto, después lo más viejo.
export function pickQuestions(bank, stats = {}, n = 5) {
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  const rank = (q) => {
    const s = stats[q.id];
    if (!s) return [1, 0];
    if (s.ultimaMal) return [0, s.visto || 0];
    return [2, s.visto || 0];
  };
  return shuffled
    .sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      return ra[0] - rb[0] || ra[1] - rb[1];
    })
    .slice(0, n);
}
export const unseenCount = (bank, stats = {}) => bank.filter((q) => !stats[q.id]).length;

export function shuffleOptions(q) {
  const order = q.opciones.map((_, i) => i).sort(() => Math.random() - 0.5);
  return { ...q, opciones: order.map((i) => q.opciones[i]), correcta: order.indexOf(q.correcta) };
}

// ---------- Experiencia y racha ----------

export const XP_POR_NIVEL = 200;
export function levelInfo(xp = 0) {
  return { nivel: Math.floor(xp / XP_POR_NIVEL) + 1, dentro: xp % XP_POR_NIVEL, meta: XP_POR_NIVEL };
}
export function touchStreak(perfil) {
  const hoy = todayISO();
  const r = perfil.racha || { ultimo: null, dias: 0 };
  if (r.ultimo === hoy) return;
  const ayer = toISO(addDays(today(), -1));
  perfil.racha = { ultimo: hoy, dias: r.ultimo === ayer ? r.dias + 1 : 1 };
}
export function streakDays(perfil) {
  const r = perfil?.racha;
  if (!r?.ultimo) return 0;
  const gap = daysBetween(parseISO(r.ultimo), today());
  return gap <= 1 ? r.dias : 0;
}

// ---------- Material: buscar el contexto de un tema ----------

const STOP = new Set('de la el los las y en del a un una por con para que es se al lo su sus o como más'.split(' '));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function relevantText(textos, query, maxChars = 12000) {
  const all = textos.filter(Boolean).join('\n\n');
  if (all.length <= maxChars) return all;
  const words = norm(query).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const paras = all.split(/\n{2,}/);
  const scored = paras.map((p, i) => {
    const np = norm(p);
    let s = 0;
    words.forEach((w) => { if (np.includes(w)) s += 1; });
    return { i, p, s };
  });
  const keep = new Set();
  let size = 0;
  for (const it of [...scored].sort((a, b) => b.s - a.s)) {
    if (it.s === 0 && keep.size) break;
    for (const j of [it.i - 1, it.i, it.i + 1]) {
      if (j < 0 || j >= paras.length || keep.has(j)) continue;
      if (size + paras[j].length > maxChars) continue;
      keep.add(j);
      size += paras[j].length;
    }
    if (size >= maxChars * 0.9) break;
  }
  if (!keep.size) return all.slice(0, maxChars);
  return [...keep].sort((a, b) => a - b).map((j) => paras[j]).join('\n\n');
}
