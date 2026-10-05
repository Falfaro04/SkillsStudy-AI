import { html, Icon, PassMeter, MasteryMap, CircledNumber, Callout } from '../ui.js';
import { cursoActual, ir, cambiarCurso, todosLosCursos, update, editarCurso } from '../store.js';
import {
  gradeSummary, buildPlan, overdueTasks, taskDone, clashes, nextEvaluation, recommendTopic, fmtLongToday,
  fmtDate, fmtRange, fmtGrade, fmtNum, daysBetween, parseISO, today, fmtDaysLeft, isExam, evalTopics, TIPOS,
} from '../model.js';

const tipoLabel = (t) => (TIPOS.find(([v]) => v === t) || [, 'Evaluación'])[1];

// "Necesitás 71 de promedio en lo que falta": la frase que todo estudiante calcula.
export function NeedHero({ course }) {
  const g = gradeSummary(course);
  const esc = course.escala || 100;
  const pts = (v) => fmtNum(esc === 10 ? v / 10 : v, 1);
  const n = g.pending.length;
  if (g.status === 'vacio') {
    return html`<div class="need"><p class="need-lead">Todavía no hay evaluaciones con porcentaje.</p>
      <p class="need-sub">Agregalas en <button class="link" onClick=${editarCurso}>Datos del curso</button> para calcular cuánto necesitás.</p></div>`;
  }
  if (g.status === 'posible') {
    return html`<div class="need">
      <p class="need-lead">Necesitás</p>
      <p class="need-figure"><${CircledNumber} value=${fmtGrade(g.needed, esc, { ceil: true })} /> <span class="need-tail">de promedio en ${g.graded.length ? 'lo que falta' : 'todo el curso'}</span></p>
      <p class="need-sub">${g.graded.length
        ? `Llevás ${pts(g.earned)} de ${pts(g.gradedWeight)} puntos posibles. Quedan ${pts(g.remaining)} en juego en ${n} ${n === 1 ? 'evaluación' : 'evaluaciones'}.`
        : `Todavía no tenés notas. Anotalas conforme te las entreguen y este número se ajusta solo.`}</p>
    </div>`;
  }
  if (g.status === 'asegurado') {
    return html`<div class="need"><p class="need-lead">Aprobado asegurado</p>
      <p class="need-figure"><${CircledNumber} value="✓" tone="good" /> <span class="need-tail">aunque saqués 0 en lo que falta</span></p>
      <p class="need-sub">Con lo que llevás terminás con al menos ${fmtGrade(g.finalIfAvg(0), esc)}. Lo que saqués de aquí en adelante sube tu promedio.</p></div>`;
  }
  if (g.status === 'imposible') {
    return html`<div class="need"><p class="need-lead">Con lo que queda ya no alcanza el ${fmtGrade(g.pass, esc)}</p>
      <p class="need-figure"><${CircledNumber} value=${fmtGrade(g.maxFinal, esc)} tone="crit" /> <span class="need-tail">es lo máximo si sacás ${esc} en todo</span></p>
      <p class="need-sub">Preguntá al profesor si el curso tiene examen de reposición, ampliación o extraordinario, y qué nota pide.</p></div>`;
  }
  const ok = g.status === 'aprobado';
  return html`<div class="need"><p class="need-lead">${ok ? 'Curso aprobado' : 'No alcanzó la nota de aprobación'}</p>
    <p class="need-figure"><${CircledNumber} value=${fmtGrade(g.final, esc)} tone=${ok ? 'good' : 'crit'} /> <span class="need-tail">nota final</span></p>
    <p class="need-sub">${ok ? 'Ya tenés todas las notas del curso.' : 'Preguntá al profesor si hay examen de reposición o ampliación.'}</p></div>`;
}

export function TaskList({ course, tasks, empty }) {
  if (!tasks.length) return html`<p class="muted">${empty || 'Nada pendiente.'}</p>`;
  const accion = (t) => {
    if (t.tipo === 'quest') return ['Hacer quest', () => { update((s) => { s.questTema = t.temaId; }); ir('estudiar', 'quests'); }];
    if (t.tipo === 'simulacro') return ['Ir al simulacro', () => { update((s) => { s.simEv = t.evId; }); ir('simulacro'); }];
    if (t.tipo === 'estudiar' && (course.material || []).length) return ['Abrir material', () => ir('estudiar', 'material')];
    return null;
  };
  return html`<ul class="tasks">${tasks.map((t) => {
    const done = taskDone(course, t);
    const a = accion(t);
    return html`<li class=${`task${done ? ' is-done' : ''}`} key=${t.id}>
      <label class="task-check">
        <input type="checkbox" id=${'tk-' + t.id} checked=${done} onChange=${() => cambiarCurso((c) => {
          c.plan = c.plan || { hechos: {} };
          c.plan.hechos = c.plan.hechos || {};
          c.plan.hechos[t.id] = !done;
        })} />
        <span class="task-text">${t.texto}${t.detalle ? html`<span class="task-detail">${t.detalle}</span>` : null}${t.semana ? html`<span class="task-detail">De la semana ${t.semana}</span>` : null}</span>
      </label>
      ${a && !done ? html`<button class="btn btn-quiet btn-sm" onClick=${a[1]}>${a[0]}</button>` : null}
    </li>`;
  })}</ul>`;
}

export function ClashAlerts({ limit = 2 }) {
  const list = clashes(todosLosCursos()).slice(0, limit);
  if (!list.length) return null;
  const varios = todosLosCursos().length > 1;
  return html`<div class="stack-sm">${list.map((cl) => html`<${Callout} tone="warn" title=${`Semana del ${fmtRange(cl.start, cl.end)}:`}>
    ${cl.items.length} evaluaciones que suman ${fmtNum(cl.peso)} % de nota (${cl.items.map((i) => `${i.ev.nombre}${varios ? ' de ' + i.curso.nombre : ''}, ${fmtDate(i.d, { weekday: true })}`).join('; ')}). Empezá a prepararlas desde antes.
  <//>`)}</div>`;
}

export function Hoy() {
  const c = cursoActual();
  const plan = buildPlan(c);
  const wk = plan.current && plan.current <= plan.weeks.length ? plan.weeks[plan.current - 1] : null;
  const overdue = overdueTasks(c, plan);
  const next = nextEvaluation(c);
  const rec = recommendTopic(c);
  const esc = c.escala || 100;
  const weekLabel = plan.current === 0 ? 'El curso todavía no empieza' : plan.current > plan.weeks.length ? 'El curso ya terminó' : `Semana ${plan.current} de ${plan.weeks.length}`;

  return html`<div class="view">
    <header class="page-head">
      <p class="eyebrow">${c.nombre} · ${weekLabel}</p>
      <h1>Hoy, ${fmtLongToday()}</h1>
    </header>

    <${ClashAlerts} />

    <div class="grid-hoy">
      <section class="card card-hero" aria-labelledby="h-camino">
        <h2 id="h-camino" class="card-label">Camino al aprobado</h2>
        <${NeedHero} course=${c} />
        <${PassMeter} course=${c} />
        <button class="btn btn-ghost" onClick=${() => ir('notas')}>Anotar notas <${Icon} n="arrow" size=${16} /></button>
      </section>

      <section class="card" aria-labelledby="h-prox">
        <h2 id="h-prox" class="card-label">Próxima evaluación</h2>
        ${next ? (() => {
          const d = parseISO(next.fecha);
          const dl = daysBetween(today(), d);
          const temas = evalTopics(c, next).map((id) => c.temas.find((t) => t.id === id)?.nombre).filter(Boolean);
          return html`<div class="next-ev">
            <p class="next-when"><span class=${`days${dl <= 7 ? ' is-near' : ''}`}>${fmtDaysLeft(dl)}</span> ${fmtDate(d, { weekday: true })}</p>
            <p class="next-name">${next.nombre}</p>
            <p class="next-meta">${tipoLabel(next.tipo)} · vale <b>${fmtNum(next.peso)} %</b> de la nota</p>
            ${temas.length ? html`<p class="next-temas">${temas.join(' · ')}</p>` : null}
            ${isExam(next)
              ? html`<button class="btn btn-primary" onClick=${() => { update((s) => { s.simEv = next.id; }); ir('simulacro'); }}>Hacer un simulacro</button>`
              : html`<button class="btn btn-ghost" onClick=${() => ir('plan')}>Ver el plan</button>`}
          </div>`;
        })() : html`<p class="muted">No hay evaluaciones pendientes con fecha.</p>`}
      </section>

      <section class="card span-2" aria-labelledby="h-semana">
        <div class="card-head">
          <h2 id="h-semana" class="card-label">Esta semana${wk ? html` <span class="card-label-sub">${fmtRange(wk.start, wk.end)} · ≈ ${fmtNum(wk.horas)} h sugeridas</span>` : null}</h2>
          <button class="btn btn-quiet btn-sm" onClick=${() => ir('plan')}>Plan completo</button>
        </div>
        ${wk ? html`<${TaskList} course=${c} tasks=${wk.tasks} empty="Esta semana no hay temas nuevos ni entregas. Buen momento para practicar lo que va flojo." />` : html`<p class="muted">${weekLabel}.</p>`}
        ${overdue.length ? html`<div class="overdue">
          <h3 class="mini-head">Pendiente de semanas anteriores</h3>
          <${TaskList} course=${c} tasks=${overdue} />
        </div>` : null}
      </section>

      <section class="card span-2" aria-labelledby="h-dominio">
        <div class="card-head">
          <h2 id="h-dominio" class="card-label">Mapa de dominio</h2>
          <button class="btn btn-quiet btn-sm" onClick=${() => ir('estudiar', 'quests')}>Todas las quests</button>
        </div>
        ${rec ? html`<div class="rec">
          <p><span class="rec-k">Te conviene practicar</span> <b>${rec.tema.nombre}</b>: vale ≈ ${esc === 10 ? fmtNum(rec.pts / 10, 1) : fmtNum(rec.pts, 0)} pts de lo que falta y ${rec.m.score == null ? 'todavía no lo practicaste' : `vas en ${rec.m.score} %`}.</p>
          <button class="btn btn-primary btn-sm" onClick=${() => { update((s) => { s.questTema = rec.tema.id; }); ir('estudiar', 'quests'); }}>Hacer la quest</button>
        </div>` : null}
        <${MasteryMap} course=${c} compact onPick=${(t) => { update((s) => { s.questTema = t.id; }); ir('estudiar', 'quests'); }} />
        <p class="hint">Cada tema se colorea con tus últimas respuestas en quests, simulacros y explicaciones Feynman. Los puntos son lo que ese tema vale en la nota final (escala ${esc}).</p>
      </section>
    </div>
  </div>`;
}
