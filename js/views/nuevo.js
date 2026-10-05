import { html, useState, useRef, useEffect, Icon, Segmented, Thinking, Callout } from '../ui.js';
import { S, cursoActual, update, ir, toast, guardarCurso, guardarPerfil, listaCursos } from '../store.js';
import { extraerPrograma, mensajeError, esPermanente } from '../ai.js';
import { pdfATexto } from '../pdf.js';
import { uid, isNum, fmtNum, TIPOS, parseISO, toInternal, fromInternal } from '../model.js';

const vacio = () => ({
  nombre: '', institucion: '', periodo: '', escala: 100, notaAprobacion: 70, inicio: null, fin: null,
  temas: [], evaluaciones: [], avisos: [],
});
const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (s) => {
  const v = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};

// ---------- Paso 1: subir ----------

function Subir({ onTexto, onManual, error }) {
  const [modo, setModo] = useState('pdf');
  const [pegado, setPegado] = useState('');
  const [over, setOver] = useState(false);
  const take = (f) => f && onTexto({ file: f });
  return html`<div class="stack">
    <section class="card onboard">
      <${Segmented} label="Cómo agregar el programa" value=${modo} onChange=${setModo} options=${[['pdf', 'Subir PDF'], ['texto', 'Pegar texto']]} />
      ${modo === 'pdf' ? html`<label class=${`drop drop-big${over ? ' is-over' : ''}`}
          onDragOver=${(e) => { e.preventDefault(); setOver(true); }} onDragLeave=${() => setOver(false)}
          onDrop=${(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
          <${Icon} n="upload" size=${32} />
          <span class="drop-main">Arrastrá el PDF del programa del curso o <u>elegí el archivo</u></span>
          <span class="drop-sub">El que trae el cronograma y los porcentajes de evaluación. En la UNED suele llamarse «orientación del curso».</span>
          <input type="file" id="prog-file" accept=".pdf,application/pdf" class="visually-hidden" onChange=${(e) => take(e.currentTarget.files[0])} />
        </label>` : html`<div class="stack-sm">
          <label class="field"><span>Texto del programa</span><textarea id="prog-texto" rows="10" value=${pegado} onInput=${(e) => setPegado(e.currentTarget.value)} placeholder="Pegá aquí el programa, con el cronograma y la tabla de evaluación."></textarea></label>
          <button class="btn btn-primary" disabled=${pegado.trim().length < 80} onClick=${() => onTexto({ texto: pegado })}>Leer con Claude</button>
        </div>`}
      ${error ? html`<${Callout} tone="error">${error}<//>` : null}
      <p class="hint">Claude saca las fechas, los porcentajes y los temas. Antes de crear el plan, vos revisás todo.</p>
    </section>
    <p class="center-line">¿No tenés el programa a mano? <button class="link" onClick=${onManual}>Llenar los datos a mano</button></p>
  </div>`;
}

// ---------- Paso 3: confirmar ----------

function Confirmar({ draft, setDraft, texto, onGuardar, onCancelar, editando }) {
  const esc = draft.escala;
  const set = (fn) => { const d = clone(draft); fn(d); setDraft(d); };
  const suma = draft.evaluaciones.reduce((a, e) => a + (num(e.peso) || 0), 0);
  const sinFecha = draft.evaluaciones.filter((e) => !parseISO(e.fecha)).length;
  const [intento, setIntento] = useState(false);
  const errores = [];
  if (!draft.nombre.trim()) errores.push('Falta el nombre del curso.');
  if (!draft.evaluaciones.length) errores.push('Agregá al menos una evaluación.');
  if (draft.evaluaciones.some((e) => !(num(e.peso) > 0))) errores.push('Cada evaluación necesita un porcentaje mayor que 0.');

  const guardar = () => {
    setIntento(true);
    if (errores.length) return;
    onGuardar();
  };

  return html`<div class="confirm-grid">
    <div class="stack">
      ${draft.avisos?.length ? html`<${Callout} tone="warn" title="Revisá esto:">${draft.avisos.join(' ')}<//>` : null}
      <section class="card" aria-labelledby="c-datos">
        <h2 id="c-datos" class="card-label">Curso</h2>
        <div class="form-grid">
          <label class="field span-2"><span>Nombre del curso</span><input id="f-nombre" type="text" value=${draft.nombre} aria-invalid=${intento && !draft.nombre.trim()} onInput=${(e) => set((d) => { d.nombre = e.currentTarget.value; })} /></label>
          <label class="field"><span>Institución</span><input id="f-inst" type="text" value=${draft.institucion} onInput=${(e) => set((d) => { d.institucion = e.currentTarget.value; })} /></label>
          <label class="field"><span>Periodo</span><input id="f-periodo" type="text" value=${draft.periodo} placeholder="II cuatrimestre 2026" onInput=${(e) => set((d) => { d.periodo = e.currentTarget.value; })} /></label>
          <label class="field"><span>Inicio de clases</span><input id="f-inicio" type="date" value=${draft.inicio || ''} onInput=${(e) => set((d) => { d.inicio = e.currentTarget.value || null; })} /></label>
          <label class="field"><span>Fin del curso</span><input id="f-fin" type="date" value=${draft.fin || ''} onInput=${(e) => set((d) => { d.fin = e.currentTarget.value || null; })} /></label>
          <div class="field"><span>Escala de notas</span><${Segmented} label="Escala de notas" value=${esc} onChange=${(v) => set((d) => { d.escala = v; })} options=${[[100, '0 a 100'], [10, '0 a 10']]} /></div>
          <label class="field"><span>Nota para aprobar</span><input id="f-aprob" type="text" inputmode="decimal" value=${fmtNum(fromInternal(draft.notaAprobacion, esc), 1)}
            onChange=${(e) => set((d) => { const v = num(e.currentTarget.value); if (v != null && v > 0 && v <= esc) d.notaAprobacion = toInternal(v, esc); })} /></label>
        </div>
      </section>

      <section class="card" aria-labelledby="c-evs">
        <div class="card-head">
          <h2 id="c-evs" class="card-label">Evaluaciones</h2>
          <span class=${`sum-badge ${Math.abs(suma - 100) < 0.01 ? 'st-good' : 'st-warn'}`}>${Math.abs(suma - 100) < 0.01 ? '✓ ' : ''}Suman ${fmtNum(suma)} %</span>
        </div>
        ${sinFecha ? html`<p class="hint">${sinFecha === 1 ? '1 evaluación no tiene fecha' : `${sinFecha} evaluaciones no tienen fecha`}. El plan funciona mejor con todas.</p>` : null}
        <ol class="ev-edit">
          ${draft.evaluaciones.map((ev, i) => html`<li key=${ev.id} class="ev-row">
            <label class="field ev-nombre"><span>Nombre</span><input id=${'ev-n-' + ev.id} type="text" value=${ev.nombre} onInput=${(e) => set((d) => { d.evaluaciones[i].nombre = e.currentTarget.value; })} /></label>
            <label class="field ev-tipo"><span>Tipo</span><select id=${'ev-t-' + ev.id} value=${ev.tipo} onChange=${(e) => set((d) => { d.evaluaciones[i].tipo = e.currentTarget.value; })}>
              ${TIPOS.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select></label>
            <label class="field ev-peso"><span>Peso %</span><input id=${'ev-p-' + ev.id} type="text" inputmode="decimal" value=${ev.peso ?? ''}
              aria-invalid=${intento && !(num(ev.peso) > 0)} onInput=${(e) => set((d) => { d.evaluaciones[i].peso = num(e.currentTarget.value) ?? e.currentTarget.value; })} /></label>
            <label class=${`field ev-fecha${parseISO(ev.fecha) ? '' : ' is-missing'}`}><span>${parseISO(ev.fecha) ? 'Fecha' : 'Falta la fecha'}</span><input id=${'ev-f-' + ev.id} type="date" value=${ev.fecha || ''} onInput=${(e) => set((d) => { d.evaluaciones[i].fecha = e.currentTarget.value || null; })} /></label>
            <button class="btn btn-quiet btn-sm ev-del" aria-label=${`Quitar ${ev.nombre}`} onClick=${() => set((d) => { d.evaluaciones.splice(i, 1); })}><${Icon} n="trash" size=${16} /></button>
            ${draft.temas.length ? html`<div class="ev-temas" role="group" aria-label=${`Temas que evalúa ${ev.nombre}`}>
              <span>Evalúa los temas:</span>
              ${draft.temas.map((t, k) => {
                const on = (ev.temas || []).includes(t.id);
                return html`<button class=${`tchip${on ? ' is-on' : ''}`} aria-pressed=${on} title=${t.nombre}
                  onClick=${() => set((d) => { const e2 = d.evaluaciones[i]; e2.temas = on ? e2.temas.filter((x) => x !== t.id) : [...(e2.temas || []), t.id]; })}>${k + 1}</button>`;
              })}
              ${!(ev.temas || []).length ? html`<span class="hint-inline">ninguno marcado: cuenta como todos</span>` : null}
            </div>` : null}
          </li>`)}
        </ol>
        <button class="btn btn-ghost btn-sm" onClick=${() => set((d) => { d.evaluaciones.push({ id: uid('ev'), nombre: '', tipo: 'parcial', peso: '', fecha: null, temas: [], nota: null }); })}><${Icon} n="mas" size=${16} /> Agregar evaluación</button>
      </section>

      <section class="card" aria-labelledby="c-temas">
        <h2 id="c-temas" class="card-label">Temas</h2>
        <p class="hint">En el orden del curso. La semana es la del cronograma (la primera semana de clases es la 1).</p>
        <ol class="tema-edit">
          ${draft.temas.map((t, i) => html`<li key=${t.id}>
            <span class="tema-n">${i + 1}</span>
            <label class="field"><span class="visually-hidden">Nombre del tema ${i + 1}</span><input id=${'tm-n-' + t.id} type="text" value=${t.nombre} onInput=${(e) => set((d) => { d.temas[i].nombre = e.currentTarget.value; })} /></label>
            <label class="field tema-sem"><span class="visually-hidden">Semana</span><input id=${'tm-s-' + t.id} type="number" min="1" max="30" placeholder="Sem." value=${t.semana ?? ''} onInput=${(e) => set((d) => { d.temas[i].semana = num(e.currentTarget.value); })} /></label>
            <button class="btn btn-quiet btn-sm" aria-label=${`Quitar ${t.nombre}`} onClick=${() => set((d) => {
              const id = d.temas[i].id;
              d.temas.splice(i, 1);
              d.evaluaciones.forEach((e) => { e.temas = (e.temas || []).filter((x) => x !== id); });
            })}><${Icon} n="trash" size=${16} /></button>
          </li>`)}
        </ol>
        <button class="btn btn-ghost btn-sm" onClick=${() => set((d) => { d.temas.push({ id: uid('t'), nombre: '', semana: null, resumen: '' }); })}><${Icon} n="mas" size=${16} /> Agregar tema</button>
      </section>

      ${intento && errores.length ? html`<${Callout} tone="error">${errores.join(' ')}<//>` : null}
      <div class="row-btns sticky-actions">
        <button class="btn btn-primary btn-lg" onClick=${guardar}>${editando ? 'Guardar cambios' : 'Crear curso y plan'}</button>
        <button class="btn btn-ghost" onClick=${onCancelar}>Cancelar</button>
      </div>
    </div>
    ${texto ? html`<details class="card source" open>
      <summary>Texto del programa</summary>
      <pre class="source-text">${texto.slice(0, 40000)}</pre>
    </details>` : null}
  </div>`;
}

// ---------- Vista ----------

export function Nuevo() {
  const actual = cursoActual();
  const [editando] = useState(() => S.ruta === 'nuevo' && S.editar ? actual : null);
  const [paso, setPaso] = useState(editando ? 'confirmar' : 'subir');
  const [draft, setDraft] = useState(() => (editando ? clone({ ...editando, avisos: [] }) : vacio()));
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('');
  const [error, setError] = useState(null);
  const ctl = useRef(null);
  useEffect(() => () => { ctl.current?.abort(); S.editar = false; }, []);

  const leer = async ({ file, texto: pegado }) => {
    setError(null);
    setPaso('leyendo');
    let t = pegado || '';
    try {
      if (file) {
        setEstado('Abriendo el PDF…');
        const r = await pdfATexto(file, (i, n) => setEstado(`Leyendo la página ${i} de ${n}…`));
        t = r.crudo;
      }
    } catch (e) {
      setError(e.message || 'No se pudo leer el PDF.');
      setPaso('subir');
      return;
    }
    setTexto(t);
    if (S.ia === false) {
      setDraft(vacio());
      setError(null);
      setPaso('confirmar');
      toast('Claude no está disponible aquí: completá los datos mirando el texto del programa.', 'error');
      return;
    }
    const ac = new AbortController();
    ctl.current = ac;
    setEstado('Claude está leyendo el programa. Puede tardar hasta un minuto…');
    try {
      const d = await extraerPrograma(t, { signal: ac.signal, onText: () => setEstado('Recibiendo los datos…') });
      setDraft(d);
      setPaso('confirmar');
    } catch (e) {
      if (esPermanente(e)) update((s) => { s.ia = false; s.iaBloqueo = mensajeError(e); });
      if (e?.code === 'cancelled') { setPaso('subir'); return; }
      setError(`${mensajeError(e)} También podés llenar los datos a mano.`);
      setDraft(vacio());
      setPaso('subir');
    }
  };

  const guardar = () => {
    const d = clone(draft);
    d.nombre = d.nombre.trim();
    d.evaluaciones = d.evaluaciones.map((e) => ({ ...e, nombre: e.nombre.trim() || 'Evaluación', peso: num(e.peso) || 0, nota: isNum(e.nota) ? e.nota : null }));
    d.temas = d.temas.filter((t) => t.nombre.trim()).map((t) => ({ ...t, nombre: t.nombre.trim() }));
    delete d.avisos;
    if (editando) {
      update(() => { Object.assign(editando, d); });
      guardarCurso(editando);
      toast('Guardaste los cambios del curso.');
      ir('notas');
      return;
    }
    const curso = {
      ...d, id: uid('c'), material: [], dominio: {}, quests: {}, banco: {}, preguntaStats: {},
      plan: { hechos: {} }, feynman: [], simulacros: [], creado: Date.now(),
    };
    update((s) => {
      s.cursos[curso.id] = curso;
      s.perfil.cursoActivo = curso.id;
      s.viendoDemo = false;
    });
    guardarCurso(curso);
    guardarPerfil();
    ir('hoy');
    toast(listaCursos().length === 1 ? 'Listo: este es tu plan. Ahora subí el material en Estudiar.' : `Agregaste ${curso.nombre}.`);
  };

  const cancelar = () => { ctl.current?.abort(); ir(editando ? 'notas' : 'hoy'); };

  return html`<div class="view">
    <header class="page-head">
      <p class="eyebrow">${editando ? editando.nombre : paso === 'confirmar' ? 'Paso 2 de 2' : 'Paso 1 de 2'}</p>
      <h1>${editando ? 'Datos del curso' : paso === 'confirmar' ? 'Confirmá los datos' : 'Agregá un curso'}</h1>
      <p class="lede">${editando
        ? 'Cambiá lo que necesités. Tus notas y tu progreso se mantienen.'
        : paso === 'confirmar'
          ? 'Revisá cada fecha y porcentaje contra el programa. Si algo quedó vacío es porque no aparecía claro: completalo vos.'
          : 'Subí el programa y Claude arma el plan para pasar el curso.'}</p>
    </header>
    ${paso === 'subir' ? html`<${Subir} onTexto=${leer} onManual=${() => { setDraft(vacio()); setTexto(''); setPaso('confirmar'); }} error=${error} />` : null}
    ${paso === 'leyendo' ? html`<section class="card"><${Thinking} label=${estado} onStop=${() => { ctl.current?.abort(); }} /></section>` : null}
    ${paso === 'confirmar' ? html`<${Confirmar} draft=${draft} setDraft=${setDraft} texto=${texto} onGuardar=${guardar} onCancelar=${cancelar} editando=${!!editando} />` : null}
  </div>`;
}
