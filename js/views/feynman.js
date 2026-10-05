import { html, useState, useEffect, useRef, Thinking, Callout } from '../ui.js';
import { S, cursoActual, cambiarCurso, cambiarPerfil, update, textosDelCurso } from '../store.js';
import { revisarFeynman, mensajeError, esPermanente } from '../ai.js';
import { addResult, recommendTopic, relevantText, touchStreak, todayISO, fmtDate, uid } from '../model.js';

const palabras = (s) => (s.trim().match(/\S+/g) || []).length;

function Resultado({ r }) {
  const tono = r.puntaje >= 80 ? 'good' : r.puntaje >= 50 ? 'warn' : 'crit';
  return html`<div class="fy-result">
    <div class="fy-score">
      <span class=${`fy-num tone-${tono}`}>${r.puntaje}</span>
      <span class="fy-label">${r.puntaje >= 90 ? 'Podrías enseñarlo' : r.puntaje >= 70 ? 'Entendés lo central' : r.puntaje >= 50 ? 'Vas en camino' : 'Hay confusiones importantes'}</span>
    </div>
    <div class="fy-cols">
      ${r.bien.length ? html`<div class="fy-col fy-bien"><h3><span aria-hidden="true">✓</span> Lo que entendiste bien</h3><ul>${r.bien.map((x) => html`<li>${x}</li>`)}</ul></div>` : null}
      ${r.falta.length ? html`<div class="fy-col fy-falta"><h3><span aria-hidden="true">◐</span> Lo que te falta</h3><ul>${r.falta.map((x) => html`<li>${x}</li>`)}</ul></div>` : null}
      ${r.errores.length ? html`<div class="fy-col fy-error"><h3><span aria-hidden="true">!</span> Revisá esto</h3><ul>${r.errores.map((x) => html`<li>${x}</li>`)}</ul></div>` : null}
    </div>
    ${r.pregunta ? html`<p class="fy-q"><span>Para profundizar:</span> ${r.pregunta}</p>` : null}
  </div>`;
}

export function Feynman() {
  const c = cursoActual();
  const temas = c.temas || [];
  const inicial = S.feynmanTema || recommendTopic(c)?.tema.id || temas[0]?.id;
  const [temaId, setTemaId] = useState(inicial);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [ultimo, setUltimo] = useState(null);
  const ctl = useRef(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const tema = temas.find((t) => t.id === temaId) || temas[0];
  if (!tema) return html`<p class="muted">Este curso no tiene temas todavía.</p>`;
  const n = palabras(texto);
  const historia = [...(c.feynman || [])].reverse();

  const revisar = async () => {
    setError(null);
    setUltimo(null);
    if (S.ia === false) { setError(S.iaBloqueo || mensajeError({ code: 'sin_ia' })); return; }
    const ac = new AbortController();
    ctl.current = ac;
    setEstado('pensando');
    try {
      const contexto = relevantText(textosDelCurso(c), `${tema.nombre} ${tema.resumen || ''}`, 12000);
      const r = await revisarFeynman({ curso: c.nombre, tema, contexto, explicacion: texto, signal: ac.signal });
      const entrada = { id: uid('fy'), temaId: tema.id, fecha: todayISO(), texto, resultado: r };
      cambiarCurso((cc) => {
        cc.feynman = [...(cc.feynman || []), entrada].slice(-12);
        addResult(cc, tema.id, r.puntaje / 100);
      });
      cambiarPerfil((p) => { p.xp = (p.xp || 0) + 15; touchStreak(p); });
      setUltimo(entrada);
      setTexto('');
    } catch (e) {
      if (esPermanente(e)) update((s) => { s.ia = false; s.iaBloqueo = mensajeError(e); });
      setError(mensajeError(e) || null);
    } finally {
      setEstado(null);
    }
  };

  return html`<div class="stack">
    <p class="lede">Explicá un tema con tus palabras, como si se lo enseñaras a un compañero que faltó a clase. Claude lo compara con el material del curso y te dice qué entendiste, qué te falta y qué está mal.</p>
    <section class="card fy" aria-labelledby="fy-h">
      <h2 id="fy-h" class="visually-hidden">Tu explicación</h2>
      <label class="field"><span>Tema</span>
        <select id="fy-tema" value=${tema.id} onChange=${(e) => { setTemaId(e.currentTarget.value); update((s) => { s.feynmanTema = e.currentTarget.value; }); }}>
          ${temas.map((t, i) => html`<option value=${t.id}>${i + 1}. ${t.nombre}</option>`)}
        </select>
      </label>
      <label class="field"><span>Explicá «${tema.nombre}» sin mirar el material</span>
        <textarea id="fy-texto" rows="9" value=${texto} disabled=${estado === 'pensando'} onInput=${(e) => setTexto(e.currentTarget.value)}
          placeholder="Empezá por la idea principal. Después un ejemplo. Si no sabés cómo explicar una parte, ahí está lo que tenés que repasar."></textarea>
      </label>
      <div class="fy-actions">
        <span class=${`count${n >= 80 ? ' is-ok' : ''}`}>${n} ${n === 1 ? 'palabra' : 'palabras'}${n < 80 ? ' · recomendado: 80 o más' : ''}</span>
        <button class="btn btn-primary" disabled=${n < 20 || estado === 'pensando'} onClick=${revisar}>Revisar mi explicación</button>
      </div>
      ${estado === 'pensando' ? html`<${Thinking} label="Claude está comparando tu explicación con el material…" onStop=${() => ctl.current?.abort()} />` : null}
      ${error ? html`<${Callout} tone="error">${error}<//>` : null}
      ${ultimo ? html`<${Resultado} r=${ultimo.resultado} />` : null}
    </section>

    ${historia.length ? html`<section aria-labelledby="fy-hist">
      <h2 id="fy-hist" class="section-title">Explicaciones anteriores</h2>
      <ul class="fy-history">${historia.map((h) => {
        const t = temas.find((x) => x.id === h.temaId);
        return html`<li key=${h.id}><details>
          <summary><span class="fy-hist-score">${h.resultado.puntaje}</span><span class="fy-hist-tema">${t?.nombre || 'Tema eliminado'}</span><span class="fy-hist-date">${fmtDate(h.fecha)}</span></summary>
          <blockquote class="explain-quote">${h.texto}</blockquote>
          <${Resultado} r=${h.resultado} />
        </details></li>`;
      })}</ul>
    </section>` : null}
  </div>`;
}
