import { html, render, useState, useEffect, useRef, Icon } from './ui.js';
import {
  S, subscribe, update, ir, cursoActual, listaCursos, initPersistence, tieneCursosGuardados, guardarPerfil, nuevoCurso,
} from './store.js';
import { getSample } from './ai.js';
import { Hoy } from './views/hoy.js';
import { Plan } from './views/plan.js';
import { Notas } from './views/notas.js';
import { Estudiar } from './views/estudiar.js';
import { Simulacro } from './views/simulacro.js';
import { Nuevo } from './views/nuevo.js';
import { XpBar } from './views/quests.js';

const RUTAS = [
  ['hoy', 'Hoy'],
  ['plan', 'Plan'],
  ['notas', 'Notas'],
  ['estudiar', 'Estudiar'],
  ['simulacro', 'Simulacro'],
];
const VISTAS = { hoy: Hoy, plan: Plan, notas: Notas, estudiar: Estudiar, simulacro: Simulacro, nuevo: Nuevo };

const Brand = ({ lg }) => html`<span class=${`brand${lg ? ' brand-lg' : ''}`}><${Mark} />SkillsStudy<span class="brand-ai">AI</span></span>`;

const Mark = () => html`<svg class="mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
  <path d="M25.5 7.5C21.5 3.5 12 3 7 8 2 13 3.5 23.5 10.5 27.5c6.5 3.5 15 1.5 18-5 2.8-5.8 1-11.5-3.5-14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
  <path d="M10.5 16.5l4 4L22.5 11.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

function CourseSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const fuera = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const c = cursoActual();
  const cursos = listaCursos();
  const elegir = (id) => {
    update((s) => {
      if (id === 'demo') s.viendoDemo = true;
      else { s.viendoDemo = false; s.perfil.cursoActivo = id; }
      s.questTema = null;
      s.simEv = null;
      s.feynmanTema = null;
    });
    guardarPerfil();
    setOpen(false);
    if (S.ruta === 'nuevo') ir('hoy');
  };
  return html`<div class="switcher" ref=${ref}>
    <button class="switcher-btn" aria-haspopup="true" aria-expanded=${open} onClick=${() => setOpen(!open)}>
      <span class="switcher-k">${c.demo ? 'Curso de ejemplo' : c.periodo || 'Curso'}</span>
      <span class="switcher-name">${c.nombre}</span>
      <span class="switcher-caret" aria-hidden="true">▾</span>
    </button>
    ${open ? html`<ul class="switcher-menu">
      ${cursos.map((cc) => html`<li><button aria-current=${!S.viendoDemo && cc.id === S.perfil.cursoActivo ? 'true' : null} onClick=${() => elegir(cc.id)}>
        ${cc.nombre}${cc.periodo ? html`<small>${cc.periodo}</small>` : null}</button></li>`)}
      <li><button aria-current=${S.viendoDemo ? 'true' : null} onClick=${() => elegir('demo')}>${S.demo.nombre}<small>Curso de ejemplo</small></button></li>
      <li class="switcher-add"><button onClick=${() => { setOpen(false); nuevoCurso(); }}><${Icon} n="mas" size=${16} /> Agregar curso</button></li>
    </ul>` : null}
  </div>`;
}

function Estado() {
  const guardado = S.viendoDemo
    ? 'El curso de ejemplo no se guarda'
    : S.persist === 'db' ? 'Guardado en tu cuenta de claude.ai'
    : S.persist === 'local' ? 'Guardado solo en este navegador' : 'Sin guardar: el navegador bloquea el almacenamiento';
  const ia = S.ia === null ? 'Conectando con Claude…' : S.ia ? 'Claude conectado' : 'Claude no disponible en esta vista';
  return html`<ul class="status">
    <li><span class=${`dot ${S.viendoDemo || S.persist !== 'db' ? 'dot-muted' : 'dot-ok'}`} aria-hidden="true"></span>${guardado}</li>
    <li><span class=${`dot ${S.ia ? 'dot-ok' : 'dot-muted'}`} aria-hidden="true"></span>${ia}</li>
  </ul>`;
}

function Nav({ cls }) {
  return html`<nav class=${cls} aria-label="Secciones">
    ${RUTAS.map(([k, l]) => html`<button class=${S.ruta === k ? 'is-on' : ''} aria-current=${S.ruta === k ? 'page' : null} onClick=${() => ir(k)}>
      <${Icon} n=${k} size=${22} /><span>${l}</span></button>`)}
  </nav>`;
}

function App() {
  if (S.boot) {
    return html`<div class="booting"><${Brand} lg /><p>Abriendo tus cursos…</p></div>`;
  }
  const c = cursoActual();
  const View = VISTAS[S.ruta] || Hoy;
  return html`<div class="app">
    <aside class="rail">
      <${Brand} />
      <${CourseSwitcher} />
      <${Nav} cls="nav" />
      <button class="btn btn-ghost btn-sm rail-add" onClick=${nuevoCurso}><${Icon} n="mas" size=${16} /> Agregar curso</button>
      <div class="rail-foot">
        <${XpBar} compact />
        <${Estado} />
      </div>
    </aside>
    <div class="main-col">
      <header class="topbar">
        <${Brand} />
        <${CourseSwitcher} />
      </header>
      ${S.viendoDemo && S.ruta !== 'nuevo' ? html`<div class="demo-banner" role="note">
        <p><b>Estás viendo un curso de ejemplo.</b> Probá todo: anotá notas, hacé una quest o seleccioná texto en el material. Nada de esto se guarda.</p>
        <button class="btn btn-primary btn-sm" onClick=${nuevoCurso}>Subir mi programa</button>
      </div>` : null}
      <main id="main" class="main">
        <${View} key=${`${S.ruta}:${c.id}:${S.editar ? 'e' : 'n'}`} />
      </main>
      <footer class="foot-mobile"><${Estado} /></footer>
    </div>
    <${Nav} cls="tabbar" />
    ${S.toast ? html`<div class=${`toast toast-${S.toast.tipo}`} role="status">${S.toast.msg}</div>` : null}
  </div>`;
}

// ---------- Arranque ----------

const root = document.getElementById('app');
let pendiente = false;
const draw = () => {
  if (pendiente) return;
  pendiente = true;
  queueMicrotask(() => {
    pendiente = false;
    render(html`<${App} />`, root);
  });
};
subscribe(draw);

const rutaDelHash = () => {
  const h = location.hash.slice(1);
  return VISTAS[h] && h !== 'nuevo' ? h : null;
};
S.ruta = rutaDelHash() || 'hoy';
S.boot = tieneCursosGuardados();
draw();

window.addEventListener('hashchange', () => {
  const r = rutaDelHash();
  if (r && r !== S.ruta) update((s) => { s.ruta = r; });
});

getSample().then((sample) => update((s) => { if (s.ia !== false) s.ia = !!sample; }));

const respaldo = setTimeout(() => update((s) => { s.boot = false; }), 12000);
initPersistence()
  .catch(() => {})
  .finally(() => {
    clearTimeout(respaldo);
    update((s) => { s.boot = false; });
  });
