import { html, useState } from '../ui.js';
import { cursoActual, editarCurso } from '../store.js';
import { buildPlan, overdueTasks, fmtRange, fmtDate, fmtNum, fmtGrade, isExam, isNum, parseISO, TIPOS } from '../model.js';
import { TaskList, ClashAlerts } from './hoy.js';

const tipoLabel = (t) => (TIPOS.find(([v]) => v === t) || [, 'Evaluación'])[1];

export function Plan() {
  const c = cursoActual();
  const plan = buildPlan(c);
  const [verPasadas, setVerPasadas] = useState(false);
  const overdue = overdueTasks(c, plan);
  const cur = plan.current;
  const sinFechas = !(c.evaluaciones || []).some((e) => parseISO(e.fecha));
  const wk = cur && cur <= plan.weeks.length ? plan.weeks[cur - 1] : null;
  const semanas = plan.weeks.filter((w) => verPasadas || !cur || w.n >= cur);
  const pasadas = cur ? Math.min(cur - 1, plan.weeks.length) : 0;

  return html`<div class="view">
    <header class="page-head">
      <p class="eyebrow">${c.nombre}</p>
      <h1>Plan semana por semana</h1>
      <p class="lede">${wk ? `Esta semana: ≈ ${fmtNum(wk.horas)} h. ` : ''}Las semanas antes de cada evaluación tienen más horas, según lo que vale. Lo que quede pendiente pasa solo a la semana actual.</p>
    </header>

    ${sinFechas ? html`<div class="callout callout-warn"><div><strong>Faltan fechas.</strong> Sin las fechas de las evaluaciones el plan es aproximado. <button class="link" onClick=${editarCurso}>Completar datos del curso</button></div></div>` : null}
    <${ClashAlerts} limit=${4} />

    ${pasadas > 0 ? html`<label class="toggle-line"><input type="checkbox" id="ver-pasadas" checked=${verPasadas} onChange=${(e) => setVerPasadas(e.currentTarget.checked)} /> Mostrar las ${pasadas} ${pasadas === 1 ? 'semana pasada' : 'semanas pasadas'}</label>` : null}

    <ol class="weeks">
      ${semanas.map((w) => {
        const isCur = w.n === cur;
        const isPast = cur && w.n < cur;
        return html`<li class=${`week${isCur ? ' is-current' : ''}${isPast ? ' is-past' : ''}`} key=${w.n}>
          <div class="week-side">
            <span class="week-n">Semana ${w.n}</span>
            <span class="week-dates">${fmtRange(w.start, w.end)}</span>
            <span class="week-hours">≈ ${fmtNum(w.horas)} h</span>
            ${isCur ? html`<span class="pill pill-pen">Esta semana</span>` : null}
          </div>
          <div class="week-main">
            ${w.evs.length ? html`<div class="week-evs">
              ${w.evs.map((ev) => html`<span class=${`ev-pill${isExam(ev) ? ' is-exam' : ''}`}>
                <b>${ev.nombre}</b> · ${tipoLabel(ev.tipo)} · ${fmtDate(ev.fecha, { weekday: true })} · ${fmtNum(ev.peso)} %${isNum(ev.nota) ? html` · nota ${fmtGrade(ev.nota, c.escala)}` : null}
              </span>`)}
              ${w.evs.length >= 2 ? html`<span class="chip st-warn chip-sm"><span class="chip-ico" aria-hidden="true">!</span>${w.evs.length} evaluaciones</span>` : null}
            </div>` : null}
            ${w.temas.length ? html`<p class="week-temas">Temas nuevos: ${w.temas.map((t) => t.nombre).join(' · ')}</p>` : null}
            <${TaskList} course=${c} tasks=${w.tasks} empty="Semana libre: repasá lo que va flojo en el mapa de dominio." />
            ${isCur && overdue.length ? html`<div class="overdue">
              <h3 class="mini-head">Pendiente de semanas anteriores</h3>
              <${TaskList} course=${c} tasks=${overdue} />
            </div>` : null}
          </div>
        </li>`;
      })}
    </ol>
  </div>`;
}
