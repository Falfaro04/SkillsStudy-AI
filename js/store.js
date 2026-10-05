// Estado de la app y dónde se guarda: db de claude.ai (privado por usuario), navegador o memoria.
import { buildDemo, DEMO_TEXTOS, demoPerfil } from './demo.js';

export const S = {
  boot: false,          // true mientras se cargan los cursos guardados
  persist: 'memoria',   // 'db' | 'local' | 'memoria'
  ia: null,             // null: comprobando · true · false
  iaBloqueo: null,      // mensaje cuando Claude quedó bloqueado en esta visita
  perfil: { xp: 0, racha: null, cursoActivo: null },
  cursos: {},
  textos: {},
  demo: buildDemo(),
  demoPerfil: demoPerfil(),
  viendoDemo: true,
  ruta: 'hoy',
  sub: 'material',
  toast: null,
};

const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export function update(fn) {
  if (fn) fn(S);
  subs.forEach((f) => f());
}

export const listaCursos = () => Object.values(S.cursos).sort((a, b) => (a.creado || 0) - (b.creado || 0));
export const cursoActual = () => (S.viendoDemo ? S.demo : S.cursos[S.perfil.cursoActivo]) || S.demo;
export const perfilActual = () => (S.viendoDemo ? S.demoPerfil : S.perfil);
export const textoMaterial = (id) => S.textos[id] ?? DEMO_TEXTOS[id] ?? '';
export const textosDelCurso = (c) => (c.material || []).map((m) => textoMaterial(m.id));
export const todosLosCursos = () => (S.viendoDemo ? [S.demo] : listaCursos());

let toastTimer;
export function toast(msg, tipo = 'info') {
  clearTimeout(toastTimer);
  update((s) => { s.toast = { msg, tipo }; });
  toastTimer = setTimeout(() => update((s) => { s.toast = null; }), 5000);
}

export function ir(ruta, sub) {
  update((s) => {
    s.ruta = ruta;
    if (sub) s.sub = sub;
  });
  try { if (location.hash !== '#' + ruta) history.replaceState(null, '', '#' + ruta); } catch { /* sin historial */ }
  window.scrollTo({ top: 0 });
}

export function editarCurso() {
  S.editar = true;
  ir('nuevo');
}
export function nuevoCurso() {
  S.editar = false;
  ir('nuevo');
}

// ---------- Persistencia ----------

const LS_KEY = 'aprobado:v1';
const HINT_KEY = 'aprobado:tiene-cursos';
let col = null;

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }

export const tieneCursosGuardados = () => lsGet(HINT_KEY) === '1';

const clean = (o) => JSON.parse(JSON.stringify(o));

function aplicarCarga({ perfil, cursos, textos }) {
  if (perfil) S.perfil = { ...S.perfil, ...perfil };
  if (cursos) S.cursos = cursos;
  if (textos) S.textos = textos;
  const ids = Object.keys(S.cursos);
  if (ids.length) {
    if (!S.cursos[S.perfil.cursoActivo]) S.perfil.cursoActivo = listaCursos()[0].id;
    S.viendoDemo = false;
  }
  lsSet(HINT_KEY, ids.length ? '1' : '0');
}

export async function initPersistence() {
  let db = null;
  let user = null;
  try {
    if (window.claude?.use) [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
  } catch { /* sin capacidades */ }
  let id = null;
  let puedeEscribir = null;
  if (db && user) {
    try { id = await user.id(); } catch { id = null; }
    // Quien entra por un link público solo puede leer: guarda en su navegador desde el principio.
    try { puedeEscribir = await user.can('data.write'); } catch { puedeEscribir = null; }
  }
  if (db && id && puedeEscribir !== false) {
    try {
      col = db.collection(`data/users/${id}`);
      const snap = await col.get();
      const carga = { cursos: {}, textos: {} };
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data) return;
        if (d.id === 'perfil') carga.perfil = data;
        else if (d.id.startsWith('curso-')) carga.cursos[data.id] = clean(data);
        else if (d.id.startsWith('mat-')) carga.textos[data.id] = data.texto || '';
      });
      S.persist = 'db';
      update(() => aplicarCarga(carga));
      return;
    } catch {
      col = null;
    }
  }
  const raw = lsGet(LS_KEY);
  S.persist = lsSet('aprobado:test', '1') ? 'local' : 'memoria';
  let carga = {};
  try { carga = raw ? JSON.parse(raw) : {}; } catch { carga = {}; }
  update(() => aplicarCarga(carga));
}

// Una escritura a la vez por documento; ráfagas agrupadas.
const timers = {};
const pending = new Map();
const inflight = new Set();
let localTimer;
let avisoLocal = false;

function queue(key, data) {
  if (S.persist !== 'db') return guardarLocal();
  pending.set(key, data);
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => flush(key), 500);
}

async function flush(key, intento = 0) {
  if (inflight.has(key) || !pending.has(key)) return;
  const data = pending.get(key);
  pending.delete(key);
  inflight.add(key);
  try {
    if (data === null) await col.doc(key).delete();
    else await col.doc(key).set(data);
  } catch (e) {
    if (e?.code === 'unavailable' && intento === 0) {
      if (!pending.has(key)) pending.set(key, data);
      setTimeout(() => flush(key, 1), 800 + Math.random() * 1200);
    } else if (e?.code === 'quota_exceeded') {
      toast('Se llenó el espacio de tus datos. Eliminá materiales o cursos que ya no usés.', 'error');
    } else {
      S.persist = 'local';
      guardarLocal();
      toast('No se pudo guardar en tu cuenta de claude.ai. Por ahora se guarda solo en este navegador.', 'error');
    }
  } finally {
    inflight.delete(key);
    if (pending.has(key)) flush(key);
  }
}

function guardarLocal() {
  if (S.persist === 'memoria') return;
  clearTimeout(localTimer);
  localTimer = setTimeout(() => {
    const ok = lsSet(LS_KEY, JSON.stringify({ perfil: S.perfil, cursos: S.cursos, textos: S.textos }));
    lsSet(HINT_KEY, Object.keys(S.cursos).length ? '1' : '0');
    if (!ok && !avisoLocal) {
      avisoLocal = true;
      toast('El navegador no tiene espacio para guardar todo el material. Tus cursos y notas sí se guardan mientras tengas esta pestaña abierta.', 'error');
    }
  }, 400);
}

// Los documentos tienen un máximo de 256 KiB: se recorta el historial más viejo.
function recortar(c) {
  const d = clean(c);
  let size = JSON.stringify(d).length;
  if (size < 230000) return d;
  d.feynman = (d.feynman || []).slice(-6);
  d.simulacros = (d.simulacros || []).slice(-6);
  Object.keys(d.banco || {}).forEach((k) => { d.banco[k] = d.banco[k].slice(-30); });
  size = JSON.stringify(d).length;
  if (size >= 250000) Object.keys(d.banco || {}).forEach((k) => { d.banco[k] = d.banco[k].slice(-15); });
  return d;
}

export function guardarCurso(c) {
  if (!c || c.demo) return;
  c.actualizado = Date.now();
  queue('curso-' + c.id, recortar(c));
}
export function guardarPerfil() {
  if (S.viendoDemo && !Object.keys(S.cursos).length) return;
  queue('perfil', clean(S.perfil));
}
export function guardarTexto(matId, cursoId, titulo, texto) {
  S.textos[matId] = texto;
  queue('mat-' + matId, { id: matId, cursoId, titulo, texto });
}
export function borrarTexto(matId) {
  delete S.textos[matId];
  queue('mat-' + matId, null);
}
export function borrarCurso(c) {
  (c.material || []).forEach((m) => borrarTexto(m.id));
  delete S.cursos[c.id];
  queue('curso-' + c.id, null);
  const quedan = listaCursos();
  S.perfil.cursoActivo = quedan[0]?.id || null;
  if (!quedan.length) S.viendoDemo = true;
  guardarPerfil();
  if (S.persist !== 'db') guardarLocal();
}

// Cambios al curso visible: muta, guarda y vuelve a pintar.
export function cambiarCurso(fn) {
  const c = cursoActual();
  fn(c);
  guardarCurso(c);
  update();
}
export function cambiarPerfil(fn) {
  const p = perfilActual();
  fn(p);
  if (!S.viendoDemo) guardarPerfil();
  update();
}
