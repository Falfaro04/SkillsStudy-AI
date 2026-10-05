import { html, useState, PassMeter, Callout } from '../ui.js';
import { cursoActual, cambiarCurso, ir, update, borrarCurso, toast, editarCurso } from '../store.js';
import { gradeSummary, fmtGrade, fmtNum, fmtDate, isNum, toInternal, fromInternal, TIPOS } from '../model.js';
import { NeedHero } from './hoy.js';

const tipoLabel = (t) => (TIPOS.find(([v]) => v === t) || [, 'Evaluación'])[1];
const parseNum = (s) => {
  const v = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};

// Texto local mientras se escribe ("7," no se borra); el modelo se actualiza cuando el número es válido.
function GradeInput({ ev, escala }) {
  const show = (v) => (isNum(v) ? String(fmtNum(fromInternal(v, escala), escala === 10 ? 2 : 1)) : '');
  const [txt, setTxt] = useState(show(ev.nota));
  const [bad, setBad] = useState(false);
  const commit = (raw) => {
    setTxt(raw);
    if (raw.trim() === '') {
      setBad(false);
      if (isNum(ev.nota)) cambiarCurso((c) => { c.evaluaciones.find((e) => e.id === ev.id).nota = null; });
      return;
    }
    const v = parseNum(raw);
    if (v == null || v < 0 || v > escala) { setBad(true); return; }
    setBad(false);
    cambiarCurso((c) => { c.evaluaciones.find((e) => e.id === ev.id).nota = toInternal(v, escala); });
  };
  return html`<span class="grade-in">
    <input id=${'nota-' + ev.id} type="text" inputmode="decimal" autocomplete="off" placeholder="—"
      aria-label=${`Nota de ${ev.nombre}, de 0 a ${escala}`} aria-invalid=${bad}
      class=${bad ? 'is-bad' : ''} value=${txt} onInput=${(e) => commit(e.currentTarget.value)} />
    ${bad ? html`<span class="field-err">De 0 a ${escala}</span>` : null}
  </span>`;
}

function WhatIf({ course }) {
  const g = gradeSummary(course);
  const esc = course.escala || 100;
  const [avg, setAvg] = useState(() => Math.round(Math.min(100, Math.max(g.needed ?? g.pass, 0))));
  if (!g.pending.length || g.total <= 0) return null;
  const final = g.finalIfAvg(avg);
  const ok = final + 1e-9 >= g.pass;
  return html`<section class="card" aria-labelledby="h-whatif">
    <h2 id="h-whatif" class="card-label">¿Y si…?</h2>
    <label class="whatif" for="whatif">
      <span>Si sacás <b class="big-inline">${fmtGrade(avg, esc)}</b> en promedio en lo que falta</span>
      <input id="whatif" type="range" min="0" max="100" step=${esc === 10 ? 1 : 1} value=${avg} onInput=${(e) => setAvg(+e.currentTarget.value)} />
    </label>
    <p class="whatif-out">terminás con <b class="big-inline">${fmtGrade(final, esc)}</b>
      <span class=${`chip ${ok ? 'st-good' : 'st-crit'}`}><span class="chip-ico" aria-hidden="true">${ok ? '✓' : '!'}</span>${ok ? 'Aprobás' : 'No alcanza'}</span></p>
  </section>`;
}

export function Notas() {
  const c = cursoActual();
  const g = gradeSummary(c);
  const esc = c.escala || 100;
  const [borrando, setBorrando] = useState(false);
  const suma = g.total;
  const ptsOf = (ev) => (isNum(ev.nota) ? ((ev.peso || 0) * ev.nota) / 100 : null);
  const fmtPts = (v) => (v == null ? '—' : fmtNum(esc === 10 ? v / 10 : v, esc === 10 ? 2 : 1));

  return html`<div class="view">
    <header class="page-head">
      <p class="eyebrow">${c.nombre}</p>
      <h1>¿Cuánto necesito?</h1>
      <p class="lede">Anotá cada nota cuando te la den. La cuenta se hace sola con el porcentaje de cada evaluación.</p>
    </header>

    <div class="grid-notas">
      <section class="card card-hero" aria-label="Resumen de notas">
        <${NeedHero} course=${c} />
        <${PassMeter} course=${c} big />
      </section>

      <section class="card span-2" aria-labelledby="h-tabla">
        <div class="card-head">
          <h2 id="h-tabla" class="card-label">Tus notas <span class="card-label-sub">escala de 0 a ${esc} · aprobás con ${fmtGrade(g.pass, esc)}</span></h2>
        </div>
        ${Math.abs(suma - 100) > 0.01 && suma > 0 ? html`<${Callout} tone="warn" title=${`Los porcentajes suman ${fmtNum(suma)} %.`}>El cálculo se ajusta a ese total, pero revisá el programa. <button class="link" onClick=${editarCurso}>Corregir</button><//>` : null}
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th scope="col">Evaluación</th><th scope="col">Fecha</th><th scope="col" class="num">Peso</th><th scope="col" class="num">Nota</th><th scope="col" class="num">Aporta</th></tr></thead>
            <tbody>
              ${(c.evaluaciones || []).map((ev) => html`<tr key=${ev.id}>
                <th scope="row"><span class="ev-name">${ev.nombre}</span><span class="ev-type">${tipoLabel(ev.tipo)}</span></th>
                <td class="mono">${fmtDate(ev.fecha)}</td>
                <td class="num mono">${fmtNum(ev.peso)} %</td>
                <td class="num"><${GradeInput} ev=${ev} escala=${esc} key=${ev.id + ':' + esc} /></td>
                <td class="num mono">${fmtPts(ptsOf(ev))}</td>
              </tr>`)}
            </tbody>
            <tfoot><tr><th scope="row">Total</th><td></td><td class="num mono">${fmtNum(suma)} %</td><td></td><td class="num mono">${fmtPts(g.earned)}</td></tr></tfoot>
          </table>
        </div>
      </section>

      <${WhatIf} course=${c} key=${c.id} />

      <section class="card" aria-labelledby="h-datos">
        <h2 id="h-datos" class="card-label">Datos del curso</h2>
        <dl class="kv">
          <div><dt>Curso</dt><dd>${c.nombre}</dd></div>
          ${c.institucion ? html`<div><dt>Institución</dt><dd>${c.institucion}</dd></div>` : null}
          ${c.periodo ? html`<div><dt>Periodo</dt><dd>${c.periodo}</dd></div>` : null}
          <div><dt>Escala</dt><dd>0 a ${esc}</dd></div>
          <div><dt>Aprobás con</dt><dd>${fmtGrade(g.pass, esc)}</dd></div>
        </dl>
        <div class="row-btns">
          <button class="btn btn-ghost" onClick=${editarCurso}>Editar datos del curso</button>
          ${!c.demo && !borrando ? html`<button class="btn btn-quiet btn-danger" onClick=${() => setBorrando(true)}>Eliminar curso</button>` : null}
        </div>
        ${borrando ? html`<div class="confirm" role="alertdialog" aria-labelledby="del-q">
          <p id="del-q">¿Eliminar <b>${c.nombre}</b> con sus notas, material y progreso? No se puede deshacer.</p>
          <div class="row-btns">
            <button class="btn btn-danger" onClick=${() => { const n = c.nombre; update(() => borrarCurso(c)); setBorrando(false); ir('hoy'); toast(`Eliminaste ${n}.`); }}>Eliminar</button>
            <button class="btn btn-ghost" onClick=${() => setBorrando(false)}>Cancelar</button>
          </div>
        </div>` : null}
        ${c.demo ? html`<p class="hint">Es el curso de ejemplo: los cambios no se guardan.</p>` : null}
      </section>
    </div>
  </div>`;
}
