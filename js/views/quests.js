import { html, useState, useEffect, useRef, Icon, StatusChip, Thinking, Callout } from '../ui.js';
import { S, cursoActual, perfilActual, cambiarCurso, cambiarPerfil, update, ir, textosDelCurso } from '../store.js';
import { generarPreguntas, mensajeError, esPermanente } from '../ai.js';
import {
  mastery, addResult, questUnlocked, pickQuestions, shuffleOptions, unseenCount, levelInfo, streakDays, touchStreak,
  relevantText, isExam, isNum, evalTopics, fmtNum, fmtDate, NIVELES,
} from '../model.js';

export function XpBar({ compact }) {
  const p = perfilActual();
  const lv = levelInfo(p.xp || 0);
  const racha = streakDays(p);
  return html`<div class=${`xp${compact ? ' xp-compact' : ''}`}>
    <div class="xp-top"><span class="xp-level">Nivel ${lv.nivel}</span><span class="xp-num">${lv.dentro} / ${lv.meta} XP</span></div>
    <div class="xp-track" role="progressbar" aria-label="Experiencia para el siguiente nivel" aria-valuemin="0" aria-valuemax=${lv.meta} aria-valuenow=${lv.dentro}><i style=${{ width: `${(lv.dentro / lv.meta) * 100}%` }}></i></div>
    <p class="xp-streak"><${Icon} n="flame" size=${16} /> ${racha ? `${racha} ${racha === 1 ? 'día' : 'días'} seguidos estudiando` : 'Estudiá hoy para empezar una racha'}</p>
  </div>`;
}

// Completa el banco de preguntas de uno o varios temas. Devuelve un mensaje si no se pudo.
export async function asegurarPreguntas(temas, faltan, { estilo = '', signal } = {}) {
  if (faltan <= 0) return null;
  if (S.ia === false) return S.iaBloqueo || mensajeError({ code: 'sin_ia' });
  const c = cursoActual();
  const query = temas.map((t) => `${t.nombre} ${t.resumen || ''}`).join(' ');
  const contexto = relevantText(textosDelCurso(c), query, temas.length > 1 ? 16000 : 12000);
  const evitar = temas.flatMap((t) => (c.banco?.[t.id] || []).map((q) => q.pregunta));
  try {
    const nuevas = await generarPreguntas({ curso: c.nombre, temas, contexto, n: Math.min(Math.max(faltan, 5), 12), evitar, estilo, signal });
    if (!nuevas.length) return 'Claude no devolvió preguntas válidas. Probá de nuevo.';
    cambiarCurso((cc) => {
      cc.banco = cc.banco || {};
      nuevas.forEach((q) => { cc.banco[q.temaId] = [...(cc.banco[q.temaId] || []), q]; });
    });
    return null;
  } catch (e) {
    if (esPermanente(e)) update((s) => { s.ia = false; s.iaBloqueo = mensajeError(e); });
    return mensajeError(e) || 'Se detuvo la preparación de preguntas.';
  }
}

function QuestRunner({ run, setRun, tema }) {
  const item = run.cola[run.i];
  const q = item?.q;
  const responder = (idx) => {
    if (run.elegida != null || !q) return;
    const ok = idx === q.correcta;
    const primera = { ...run.primera };
    let xp = run.xp;
    const cola = [...run.cola];
    if (!item.retry) {
      primera[q.id] = ok;
      xp += ok ? 10 : 0;
      cambiarCurso((c) => {
        c.preguntaStats = c.preguntaStats || {};
        const s = c.preguntaStats[q.id] || { visto: 0 };
        c.preguntaStats[q.id] = { visto: s.visto + 1, ultimaMal: !ok };
        addResult(c, run.temaId, ok ? 1 : 0);
      });
      if (!ok) cola.push({ q, retry: true });
    } else if (ok) xp += 5;
    setRun({ ...run, elegida: idx, primera, xp, cola });
  };

  const terminar = () => {
    const c = cursoActual();
    const total = Object.keys(run.primera).length;
    const aciertos = Object.values(run.primera).filter(Boolean).length;
    const meta = Math.ceil(total * 0.8);
    const paso = total > 0 && aciertos >= meta;
    const antes = c.quests?.[run.temaId] || {};
    const idx = c.temas.findIndex((t) => t.id === run.temaId);
    const siguiente = c.temas[idx + 1];
    const desbloqueo = paso && !antes.completada && siguiente && !c.quests?.[siguiente.id]?.completada ? siguiente : null;
    cambiarCurso((cc) => {
      cc.quests = cc.quests || {};
      cc.quests[run.temaId] = { completada: !!antes.completada || paso, mejor: Math.max(antes.mejor || 0, aciertos), intentos: (antes.intentos || 0) + 1 };
    });
    const ganado = run.xp + (paso ? 20 : 0);
    cambiarPerfil((p) => { p.xp = (p.xp || 0) + ganado; touchStreak(p); });
    setRun({ ...run, fin: { aciertos, total, meta, paso, ganado, despues: mastery(cursoActual(), run.temaId), desbloqueo } });
  };

  const siguiente = () => {
    if (run.i + 1 >= run.cola.length) terminar();
    else setRun({ ...run, i: run.i + 1, elegida: null });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (run.fin || e.target.closest?.('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      const n = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
      if (n >= 0 && k.length === 1) responder(n);
      else if (e.key === 'Enter' && run.elegida != null) siguiente();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (run.fin) {
    const f = run.fin;
    const antesN = NIVELES[run.antes.nivel];
    return html`<section class="card quest-end" aria-live="polite">
      <p class="eyebrow">Quest · ${tema.nombre}</p>
      <h2 class="quest-score">${f.aciertos} de ${f.total} <span>a la primera</span></h2>
      <p class=${`chip ${f.paso ? 'st-good' : 'st-warn'}`}><span class="chip-ico" aria-hidden="true">${f.paso ? '✓' : '◐'}</span>${f.paso ? 'Quest completada' : `Necesitás ${f.meta} de ${f.total} para completarla`}</p>
      <dl class="kv kv-row">
        <div><dt>Experiencia</dt><dd>+${f.ganado} XP</dd></div>
        <div><dt>Dominio del tema</dt><dd>${antesN.label}${run.antes.score != null ? ` (${run.antes.score} %)` : ''} → <b>${NIVELES[f.despues.nivel].label} (${f.despues.score} %)</b></dd></div>
      </dl>
      ${f.desbloqueo ? html`<p class="unlock"><${Icon} n="spark" /><span>Desbloqueaste <b>${f.desbloqueo.nombre}</b>.</span></p>` : null}
      ${!f.paso ? html`<p class="hint">Las preguntas que fallaste salen primero en la próxima quest de este tema.</p>` : null}
      <div class="row-btns">
        <button class="btn btn-primary" onClick=${() => setRun({ again: run.temaId })}>Otra quest de este tema</button>
        <button class="btn btn-ghost" onClick=${() => setRun(null)}>Volver a las quests</button>
      </div>
    </section>`;
  }

  const ok = run.elegida != null && run.elegida === q.correcta;
  return html`<section class="card quest" aria-labelledby="q-text">
    <div class="quest-top">
      <p class="eyebrow">Quest · ${tema.nombre}</p>
      <button class="btn btn-quiet btn-sm" onClick=${() => setRun(null)}>Salir</button>
    </div>
    <ol class="dots-progress" aria-label=${`Pregunta ${run.i + 1} de ${run.cola.length}`}>
      ${run.cola.map((it, i) => {
        const r = it.retry ? null : run.primera[it.q.id];
        return html`<li class=${`${i === run.i ? 'is-now' : ''} ${r === true ? 'is-ok' : r === false ? 'is-bad' : ''} ${it.retry ? 'is-retry' : ''}`}></li>`;
      })}
    </ol>
    ${item.retry ? html`<p class="retry-note">Otra oportunidad con esta</p>` : null}
    <h2 id="q-text" class="q-text">${q.pregunta}</h2>
    <ul class="options">
      ${q.opciones.map((o, i) => {
        const st = run.elegida == null ? '' : i === q.correcta ? 'is-right' : i === run.elegida ? 'is-wrong' : 'is-dim';
        return html`<li><button class=${`option ${st}`} disabled=${run.elegida != null} onClick=${() => responder(i)}>
          <span class="opt-key" aria-hidden="true">${'ABCD'[i]}</span><span>${o}</span>
        </button></li>`;
      })}
    </ul>
    ${run.elegida != null ? html`<div class=${`feedback ${ok ? 'is-ok' : 'is-bad'}`} aria-live="polite">
      <p><b>${ok ? 'Correcto.' : 'No era esa.'}</b> ${q.explicacion}</p>
      ${!ok && !item.retry ? html`<p class="hint">Esta pregunta vuelve al final de la quest.</p>` : null}
      <button class="btn btn-primary" onClick=${siguiente} autofocus>${run.i + 1 >= run.cola.length ? 'Ver resultado' : 'Siguiente'}</button>
    </div>` : html`<p class="hint">Atajos: teclas 1 a 4 para responder, Enter para seguir.</p>`}
  </section>`;
}

export function Quests() {
  const c = cursoActual();
  const [run, setRun] = useState(null);
  const [gen, setGen] = useState(null);
  const [err, setErr] = useState(null);
  const ctl = useRef(null);

  useEffect(() => () => ctl.current?.abort(), []);
  useEffect(() => {
    if (!run && S.questTema) document.getElementById('quest-' + S.questTema)?.scrollIntoView({ block: 'center' });
  }, [run]);

  const empezar = async (tema) => {
    setErr(null);
    const cc = cursoActual();
    const bank = cc.banco?.[tema.id] || [];
    const stats = cc.preguntaStats || {};
    const frescas = unseenCount(bank, stats) + bank.filter((q) => stats[q.id]?.ultimaMal).length;
    if (bank.length < 5 || (frescas < 3 && S.ia)) {
      const ac = new AbortController();
      ctl.current = ac;
      setGen(tema);
      const msg = await asegurarPreguntas([tema], 6, { signal: ac.signal });
      setGen(null);
      if (msg && (cursoActual().banco?.[tema.id] || []).length < 3) { setErr(msg); return; }
    }
    const pool = cursoActual().banco?.[tema.id] || [];
    const qs = pickQuestions(pool, cursoActual().preguntaStats || {}, 5).map(shuffleOptions);
    update((s) => { s.questTema = tema.id; });
    setRun({ temaId: tema.id, cola: qs.map((q) => ({ q, retry: false })), i: 0, elegida: null, primera: {}, xp: 0, antes: mastery(cursoActual(), tema.id) });
  };

  useEffect(() => {
    if (run?.again) {
      const t = c.temas.find((x) => x.id === run.again);
      setRun(null);
      if (t) empezar(t);
    }
  }, [run]);

  if (run && !run.again) {
    const tema = c.temas.find((t) => t.id === run.temaId);
    if (tema) return html`<${QuestRunner} run=${run} setRun=${setRun} tema=${tema} />`;
  }

  const temas = c.temas || [];
  const jefes = (c.evaluaciones || []).filter((e) => isExam(e) && !isNum(e.nota));

  return html`<div class="stack">
    <div class="quest-intro">
      <p class="lede">Misiones cortas de 5 preguntas por tema. Lo que fallás vuelve hasta que lo domines. Con 4 de 5 completás la quest y se desbloquea el tema siguiente.</p>
      <${XpBar} />
    </div>
    ${gen ? html`<${Thinking} label=${`Claude está preparando preguntas sobre ${gen.nombre}…`} onStop=${() => ctl.current?.abort()} />` : null}
    ${err ? html`<${Callout} tone="error">${err}<//>` : null}
    ${!temas.length ? html`<p class="muted">Este curso no tiene temas. Agregalos en Datos del curso.</p>` : null}
    <ol class="quest-list">
      ${temas.map((t, i) => {
        const m = mastery(c, t.id);
        const q = c.quests?.[t.id];
        const libre = questUnlocked(c, t.id);
        const n = (c.banco?.[t.id] || []).length;
        return html`<li id=${'quest-' + t.id} key=${t.id} class=${`quest-row${S.questTema === t.id ? ' is-target' : ''}${libre ? '' : ' is-locked'}${q?.completada ? ' is-done' : ''}`}>
          <span class="quest-n" aria-hidden="true">${q?.completada ? html`<${Icon} n="check" size=${18} />` : libre ? i + 1 : html`<${Icon} n="lock" size=${16} />`}</span>
          <div class="quest-info">
            <b>${t.nombre}</b>
            <span class="quest-meta">${q?.completada ? 'Completada' : libre ? 'Disponible' : `Completá «${temas[i - 1].nombre}» para desbloquearla`}${n ? ` · ${n} preguntas` : ''}${q?.mejor != null ? ` · mejor: ${q.mejor} de 5` : ''}</span>
          </div>
          <${StatusChip} nivel=${m.nivel} score=${m.score} small />
          <button class=${`btn btn-sm ${libre ? 'btn-primary' : 'btn-ghost'}`} disabled=${!!gen} onClick=${() => empezar(t)}>${q?.completada ? 'Repetir' : libre ? 'Empezar' : 'Empezar igual'}</button>
        </li>`;
      })}
    </ol>
    ${jefes.length ? html`<div class="bosses">
      ${jefes.map((ev) => html`<div class="boss">
        <span class="boss-k">Jefe final</span>
        <b class="boss-name">${ev.nombre}</b>
        <span class="boss-meta">${fmtDate(ev.fecha, { weekday: true })} · ${fmtNum(ev.peso)} % · ${evalTopics(c, ev).map((id) => c.temas.find((t) => t.id === id)?.nombre).filter(Boolean).join(', ')}</span>
        <button class="btn btn-ghost btn-sm" onClick=${() => { update((s) => { s.simEv = ev.id; }); ir('simulacro'); }}>Enfrentarlo en un simulacro</button>
      </div>`)}
    </div>` : null}
  </div>`;
}
