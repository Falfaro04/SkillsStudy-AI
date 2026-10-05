import { html, useState, useEffect, useRef, Segmented, Thinking, Callout, StatusChip } from '../ui.js';
import { S, cursoActual, cambiarCurso, cambiarPerfil, update } from '../store.js';
import { asegurarPreguntas } from './quests.js';
import {
  addResult, evalTopics, isExam, isNum, gradeSummary, nextEvaluation, shuffleOptions, touchStreak, todayISO,
  fmtGrade, fmtNum, fmtDate, mastery, uid,
} from '../model.js';

// Reparte las preguntas entre los temas, con las menos vistas primero.
function armar(c, temaIds, n) {
  const stats = c.preguntaStats || {};
  const porTema = temaIds.map((id) => [...(c.banco?.[id] || [])]
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => (stats[a.id]?.visto || 0) - (stats[b.id]?.visto || 0)));
  const out = [];
  for (let r = 0; out.length < n; r++) {
    let alguna = false;
    porTema.forEach((lista) => {
      if (out.length < n && lista[r]) { out.push(lista[r]); alguna = true; }
    });
    if (!alguna) break;
  }
  return out.sort(() => Math.random() - 0.5).map(shuffleOptions);
}

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function Runner({ sim, setSim, onEntregar }) {
  const [ahora, setAhora] = useState(Date.now());
  const [confirmar, setConfirmar] = useState(false);
  useEffect(() => {
    if (!sim.fin) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sim.fin]);
  const resta = sim.fin ? sim.fin - ahora : null;
  useEffect(() => { if (resta != null && resta <= 0) onEntregar(); }, [resta != null && resta <= 0]);

  const q = sim.preguntas[sim.i];
  const elegir = (i) => setSim({ ...sim, resp: { ...sim.resp, [q.id]: i } });
  const faltan = sim.preguntas.filter((p) => sim.resp[p.id] == null).length;

  return html`<section class="card sim-run" aria-labelledby="sim-q">
    <div class="sim-top">
      <p class="eyebrow">Simulacro · ${sim.nombre}</p>
      ${resta != null ? html`<span class=${`timer${resta < 60000 ? ' is-low' : ''}`} role="timer" aria-label="Tiempo restante">${mmss(resta)}</span>` : html`<span class="timer">Sin límite</span>`}
    </div>
    <ol class="sim-nav" aria-label="Preguntas">
      ${sim.preguntas.map((p, i) => html`<li><button class=${`${i === sim.i ? 'is-now' : ''} ${sim.resp[p.id] != null ? 'is-answered' : ''}`}
        aria-label=${`Pregunta ${i + 1}${sim.resp[p.id] != null ? ', respondida' : ''}`} aria-current=${i === sim.i ? 'step' : null}
        onClick=${() => setSim({ ...sim, i })}>${i + 1}</button></li>`)}
    </ol>
    <h2 id="sim-q" class="q-text"><span class="q-num">${sim.i + 1}.</span> ${q.pregunta}</h2>
    <ul class="options">
      ${q.opciones.map((o, i) => html`<li><button class=${`option${sim.resp[q.id] === i ? ' is-picked' : ''}`} aria-pressed=${sim.resp[q.id] === i} onClick=${() => elegir(i)}>
        <span class="opt-key" aria-hidden="true">${'ABCD'[i]}</span><span>${o}</span></button></li>`)}
    </ul>
    <div class="sim-bottom">
      <button class="btn btn-ghost" disabled=${sim.i === 0} onClick=${() => setSim({ ...sim, i: sim.i - 1 })}>Anterior</button>
      ${sim.i < sim.preguntas.length - 1
        ? html`<button class="btn btn-primary" onClick=${() => setSim({ ...sim, i: sim.i + 1 })}>Siguiente</button>`
        : html`<button class="btn btn-primary" onClick=${() => (faltan ? setConfirmar(true) : onEntregar())}>Entregar</button>`}
    </div>
    ${sim.i < sim.preguntas.length - 1 ? html`<button class="link sim-early" onClick=${() => (faltan ? setConfirmar(true) : onEntregar())}>Entregar ya</button>` : null}
    ${confirmar ? html`<div class="confirm" role="alertdialog">
      <p>Te ${faltan === 1 ? 'falta 1 pregunta' : `faltan ${faltan} preguntas`} sin responder. Cuentan como incorrectas.</p>
      <div class="row-btns"><button class="btn btn-primary" onClick=${onEntregar}>Entregar igual</button><button class="btn btn-ghost" onClick=${() => setConfirmar(false)}>Seguir respondiendo</button></div>
    </div>` : null}
  </section>`;
}

function Resultados({ sim, c, onOtra }) {
  const r = sim.resultado;
  const esc = c.escala || 100;
  const ev = c.evaluaciones.find((e) => e.id === sim.evId);
  let proy = null;
  if (ev && !isNum(ev.nota)) {
    const hipotesis = { ...c, evaluaciones: c.evaluaciones.map((e) => (e.id === ev.id ? { ...e, nota: r.puntaje } : e)) };
    proy = gradeSummary(hipotesis);
  }
  return html`<div class="stack">
    <section class="card sim-res" aria-live="polite">
      <p class="eyebrow">Resultado · ${sim.nombre}</p>
      <p class="sim-big"><span>${fmtGrade(r.puntaje, esc)}</span> <small>${r.correctas} de ${r.total} correctas</small></p>
      ${proy ? html`<p class="sim-proj">${proy.status === 'posible'
        ? `Si sacás eso en ${ev.nombre}, después necesitarías ${fmtGrade(proy.needed, esc, { ceil: true })} de promedio en lo que falta.`
        : proy.status === 'asegurado' ? `Si sacás eso en ${ev.nombre}, ya tendrías el curso aprobado.`
        : proy.status === 'imposible' ? `Con esa nota en ${ev.nombre} ya no alcanzaría para aprobar: hay que subirla.`
        : proy.status === 'aprobado' ? `Con esa nota en ${ev.nombre} terminarías el curso aprobado, con ${fmtGrade(proy.final, esc)}.`
        : `Con esa nota en ${ev.nombre} terminarías con ${fmtGrade(proy.final, esc)}: no alcanza.`}</p>` : null}
      <h3 class="mini-head">Por tema</h3>
      <ul class="bars">${Object.entries(r.porTema).map(([id, [ok, tot]]) => {
        const t = c.temas.find((x) => x.id === id);
        const m = mastery(c, id);
        return html`<li>
          <span class="bar-label">${t?.nombre || 'Tema'}</span>
          <span class="bar-track" role="img" aria-label=${`${ok} de ${tot}`}><i style=${{ width: `${(ok / tot) * 100}%` }}></i></span>
          <span class="bar-num">${ok}/${tot}</span>
          <${StatusChip} nivel=${m.nivel} small />
        </li>`;
      })}</ul>
      <div class="row-btns"><button class="btn btn-primary" onClick=${onOtra}>Otro simulacro</button></div>
    </section>
    <section aria-labelledby="rev-h">
      <h2 id="rev-h" class="section-title">Revisión</h2>
      <ol class="review">${sim.preguntas.map((p, i) => {
        const mia = sim.resp[p.id];
        const ok = mia === p.correcta;
        return html`<li class=${ok ? 'is-ok' : 'is-bad'}><details open=${!ok}>
          <summary><span class="rev-mark" aria-hidden="true">${ok ? '✓' : '✕'}</span> ${i + 1}. ${p.pregunta}</summary>
          <p>${mia == null ? 'Sin responder.' : ok ? `Respondiste: ${p.opciones[mia]}` : html`Respondiste: <s>${p.opciones[mia]}</s>`}</p>
          ${!ok ? html`<p><b>Correcta:</b> ${p.opciones[p.correcta]}</p>` : null}
          <p class="muted">${p.explicacion}</p>
        </details></li>`;
      })}</ol>
    </section>
  </div>`;
}

export function Simulacro() {
  const c = cursoActual();
  const evs = (c.evaluaciones || []).filter((e) => !isNum(e.nota));
  const examenes = [...evs.filter(isExam), ...evs.filter((e) => !isExam(e))];
  const proxExamen = examenes.filter(isExam).sort((a, b) => String(a.fecha || '9').localeCompare(String(b.fecha || '9')))[0];
  const porDefecto = (S.simEv && c.evaluaciones.some((e) => e.id === S.simEv) && S.simEv) || proxExamen?.id || nextEvaluation(c)?.id || 'todo';
  const [evId, setEvId] = useState(porDefecto);
  const [n, setN] = useState(10);
  const [conTiempo, setConTiempo] = useState(true);
  const [estilo, setEstilo] = useState('');
  const [sim, setSim] = useState(null);
  const [prep, setPrep] = useState(false);
  const [err, setErr] = useState(null);
  const ctl = useRef(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const ev = c.evaluaciones.find((e) => e.id === evId);
  const temaIds = ev ? evalTopics(c, ev) : (c.temas || []).map((t) => t.id);
  const temas = temaIds.map((id) => c.temas.find((t) => t.id === id)).filter(Boolean);
  const nombre = ev ? ev.nombre : 'Todo el curso';
  const minutos = Math.round(n * 1.5);

  const empezar = async () => {
    setErr(null);
    const disponibles = temaIds.reduce((a, id) => a + (c.banco?.[id] || []).length, 0);
    if (disponibles < n || estilo.trim()) {
      const ac = new AbortController();
      ctl.current = ac;
      setPrep(true);
      const msg = await asegurarPreguntas(temas, Math.max(n - disponibles, estilo.trim() ? Math.min(n, 8) : 0), { estilo, signal: ac.signal });
      setPrep(false);
      if (msg) {
        const ahora = temaIds.reduce((a, id) => a + (cursoActual().banco?.[id] || []).length, 0);
        if (ahora < 3) { setErr(msg); return; }
        if (ahora < n) setErr(`${msg} El simulacro va con las ${ahora} preguntas que ya hay.`);
      }
    }
    const preguntas = armar(cursoActual(), temaIds, n);
    if (!preguntas.length) { setErr('No hay preguntas para estos temas todavía.'); return; }
    setSim({ id: uid('s'), evId: ev?.id || null, nombre, preguntas, i: 0, resp: {}, fin: conTiempo ? Date.now() + preguntas.length * 90000 : null });
  };

  const entregar = () => {
    if (!sim || sim.resultado) return;
    const porTema = {};
    let correctas = 0;
    sim.preguntas.forEach((p) => {
      const ok = sim.resp[p.id] === p.correcta;
      if (ok) correctas++;
      porTema[p.temaId] = porTema[p.temaId] || [0, 0];
      porTema[p.temaId][0] += ok ? 1 : 0;
      porTema[p.temaId][1] += 1;
    });
    const puntaje = (correctas / sim.preguntas.length) * 100;
    cambiarCurso((cc) => {
      cc.preguntaStats = cc.preguntaStats || {};
      sim.preguntas.forEach((p) => {
        const ok = sim.resp[p.id] === p.correcta;
        const s = cc.preguntaStats[p.id] || { visto: 0 };
        cc.preguntaStats[p.id] = { visto: s.visto + 1, ultimaMal: !ok };
        if (p.temaId) addResult(cc, p.temaId, ok ? 1 : 0);
      });
      cc.simulacros = [...(cc.simulacros || []), { id: sim.id, evId: sim.evId, nombre: sim.nombre, fecha: todayISO(), puntaje, correctas, total: sim.preguntas.length }].slice(-12);
    });
    cambiarPerfil((p) => { p.xp = (p.xp || 0) + correctas * 5 + 25; touchStreak(p); });
    setSim({ ...sim, resultado: { puntaje, correctas, total: sim.preguntas.length, porTema } });
    window.scrollTo({ top: 0 });
  };

  if (sim?.resultado) return html`<div class="view"><${Resultados} sim=${sim} c=${c} onOtra=${() => setSim(null)} /></div>`;
  if (sim) return html`<div class="view"><${Runner} sim=${sim} setSim=${setSim} onEntregar=${entregar} /></div>`;

  const historia = [...(c.simulacros || [])].reverse();
  return html`<div class="view">
    <header class="page-head">
      <p class="eyebrow">${c.nombre}</p>
      <h1>Simulacro de examen</h1>
      <p class="lede">Un examen de práctica con los temas de una evaluación real, con tiempo y sin ver las respuestas hasta entregar. Al final te dice qué nota necesitarías después.</p>
    </header>
    <section class="card sim-setup" aria-label="Preparar simulacro">
      <label class="field"><span>¿Para qué evaluación?</span>
        <select id="sim-ev" value=${evId} onChange=${(e) => { setEvId(e.currentTarget.value); update((s) => { s.simEv = e.currentTarget.value; }); }}>
          ${examenes.map((e) => html`<option value=${e.id}>${e.nombre} · ${fmtDate(e.fecha)} · ${fmtNum(e.peso)} %</option>`)}
          <option value="todo">Todo el curso</option>
        </select>
      </label>
      <p class="sim-temas"><span>Temas:</span> ${temas.map((t) => t.nombre).join(' · ') || 'Sin temas'}</p>
      <div class="sim-opts">
        <div class="field"><span id="sim-n-l">Preguntas</span><${Segmented} label="Cantidad de preguntas" value=${n} onChange=${setN} options=${[[5, '5'], [10, '10'], [15, '15']]} /></div>
        <div class="field"><span>Tiempo</span><${Segmented} label="Tiempo" value=${conTiempo} onChange=${setConTiempo} options=${[[true, `${minutos} min`], [false, 'Sin límite']]} /></div>
      </div>
      <details class="estilo">
        <summary>Imitar el estilo de exámenes anteriores (opcional)</summary>
        <label class="field"><span>Pegá preguntas de exámenes viejos de este curso. Claude crea preguntas nuevas con ese estilo y nivel.</span>
          <textarea id="sim-estilo" rows="5" value=${estilo} onInput=${(e) => setEstilo(e.currentTarget.value)}></textarea></label>
      </details>
      <button class="btn btn-primary btn-lg" disabled=${prep || !temas.length} onClick=${empezar}>Empezar simulacro</button>
      ${prep ? html`<${Thinking} label="Claude está preparando el examen…" onStop=${() => ctl.current?.abort()} />` : null}
      ${err ? html`<${Callout} tone="error">${err}<//>` : null}
    </section>
    ${historia.length ? html`<section aria-labelledby="sim-hist">
      <h2 id="sim-hist" class="section-title">Simulacros anteriores</h2>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th scope="col">Fecha</th><th scope="col">Evaluación</th><th scope="col" class="num">Correctas</th><th scope="col" class="num">Nota</th></tr></thead>
        <tbody>${historia.map((h) => html`<tr key=${h.id}><td class="mono">${fmtDate(h.fecha)}</td><td>${h.nombre}</td><td class="num mono">${h.correctas}/${h.total}</td><td class="num mono">${fmtGrade(h.puntaje, c.escala)}</td></tr>`)}</tbody>
      </table></div>
    </section>` : null}
  </div>`;
}
