// Componentes compartidos. Preact + htm desde jsDelivr (globales UMD).
import { NIVELES, fmtGrade, fmtNum, gradeSummary, mastery, topicPoints } from './model.js';

export const { h, render, Fragment } = window.preact;
export const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } = window.preactHooks;
export const html = window.htm.bind(h);

// ---------- Íconos (trazo, heredan el color) ----------

const P = {
  hoy: 'M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
  plan: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8.5 3.5v4M15.5 3.5v4',
  notas: 'M6 3.5h9l3.5 3.5v13.5H6zM15 3.5V7h3.5M9 12h6M9 15.5h6M9 8.5h3',
  estudiar: 'M4 5.5c2.8-1 5.4-.8 8 1 2.6-1.8 5.2-2 8-1V19c-2.8-1-5.4-.8-8 1-2.6-1.8-5.2-2-8-1zM12 6.5V20',
  simulacro: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M9.5 2.5h5',
  mas: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13z',
  flame: 'M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 3-5.5 3.6-9.3 2.6 1.6 3.7 3.7 3.9 5.4 1-.7 1.6-1.9 1.7-3.1 2 1.7 3.8 4.2 3.8 7 0 3.6-2.6 6.2-6.5 6.2z',
  upload: 'M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 15v4.5h14V15',
  close: 'M6 6l12 12M18 6 6 18',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  spark: 'M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9z',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13',
  edit: 'M4.5 19.5l1-4 10-10 3 3-10 10zM13.5 7.5l3 3',
  copy: 'M8 8h11v12H8zM5 16V4h11',
  alert: 'M12 4 2.8 20h18.4zM12 10v4.5M12 17.2v.3',
  doc: 'M6 3.5h8l4 4v13H6zM14 3.5v4h4',
};
export const Icon = ({ n, size = 20, label }) => html`<svg class="ico" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden=${label ? null : 'true'} role=${label ? 'img' : null} aria-label=${label || null}><path d=${P[n]} /></svg>`;

// ---------- Estado de dominio: color + ícono + texto ----------

export function StatusChip({ nivel, score, small }) {
  const s = NIVELES[nivel] || NIVELES.nada;
  return html`<span class=${`chip ${s.cls}${small ? ' chip-sm' : ''}`}>
    <span class="chip-ico" aria-hidden="true">${s.icon}</span>${s.label}${score != null ? html`<span class="chip-num">${score} %</span>` : null}
  </span>`;
}

// ---------- Texto de Claude: **negrita** y viñetas, sin HTML ----------

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part) => (part.startsWith('**') && part.endsWith('**') && part.length > 4 ? html`<strong>${part.slice(2, -2)}</strong>` : part));
}
export function RichText({ text }) {
  const blocks = [];
  let list = null;
  String(text || '').split('\n').forEach((raw) => {
    const line = raw.trim();
    const m = /^([-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (m) {
      if (!list) { list = []; blocks.push({ list }); }
      list.push(m[2]);
      return;
    }
    list = null;
    if (line) blocks.push({ p: line.replace(/^#+\s*/, '') });
  });
  return html`<div class="rich">${blocks.map((b) => (b.list ? html`<ul>${b.list.map((li) => html`<li>${inline(li)}</li>`)}</ul>` : html`<p>${inline(b.p)}</p>`))}</div>`;
}

// ---------- Número de la nota encerrado a mano, como en un examen corregido ----------

export function CircledNumber({ value, tone = 'pen' }) {
  return html`<span class=${`circled tone-${tone}`}>
    <span class="circled-num">${value}</span>
    <svg class="circled-ring" viewBox="0 0 120 80" preserveAspectRatio="none" aria-hidden="true">
      <path d="M86 9C66 1 25 4 11 22-3 40 14 66 50 72c34 6 63-6 64-28C115 23 92 10 60 9 47 8 37 11 31 15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" pathLength="1" />
    </svg>
  </span>`;
}

// ---------- Camino al aprobado: barra de 0 a 100 puntos con la línea de aprobación ----------

export function PassMeter({ course, big }) {
  const [tip, setTip] = useState(null);
  const g = gradeSummary(course);
  if (g.total <= 0) return html`<p class="muted">Agregá evaluaciones con su porcentaje para ver tu camino al aprobado.</p>`;
  const k = 100 / g.total; // si los porcentajes no suman 100, se normaliza
  const earned = g.earned * k;
  const lost = g.lost * k;
  const rest = g.remaining * k;
  const esc = course.escala || 100;
  const pts = (v) => fmtNum(v * (esc === 10 ? 0.1 : 1), 1);
  const segs = [
    { cls: 'seg-earned', v: earned, label: 'Ganados' },
    { cls: 'seg-lost', v: lost, label: 'Perdidos' },
    { cls: 'seg-rest', v: rest, label: 'En juego' },
  ].filter((s) => s.v > 0.05);
  let acc = 0;
  segs.forEach((s) => { s.mid = acc + s.v / 2; acc += s.v; });
  return html`<figure class=${`meter${big ? ' meter-big' : ''}`}>
    <div class="meter-track" role="img" aria-label=${`Ganados ${pts(earned)}, perdidos ${pts(lost)}, en juego ${pts(rest)} de ${esc}. Aprobás con ${fmtGrade(g.pass, esc)}.`}>
      ${segs.map((s, i) => html`<div class=${`meter-seg ${s.cls}${i === 0 ? ' is-first' : ''}${i === segs.length - 1 ? ' is-last' : ''}`} style=${{ flexGrow: s.v }}
        onMouseEnter=${() => setTip(s)} onMouseLeave=${() => setTip(null)}></div>`)}
      <div class="meter-pass" style=${{ left: `${g.pass}%` }}><span>Aprobás con ${fmtGrade(g.pass, esc)}</span></div>
      ${tip ? html`<div class="meter-tip" style=${{ left: `${Math.min(Math.max(tip.mid, 12), 88)}%` }}>${tip.label}: <b>${pts(tip.v)}</b> pts</div>` : null}
    </div>
    <div class="meter-scale" aria-hidden="true"><span>0</span><span>${esc}</span></div>
    <figcaption class="legend">
      ${[
        ['seg-earned', 'Ganados', earned],
        ['seg-lost', 'Perdidos', lost],
        ['seg-rest', 'En juego', rest],
      ].map(([cls, label, v]) => html`<span class=${`legend-item${tip && tip.label === label ? ' is-hot' : ''}`}><i class=${`sw ${cls}`}></i>${label} <b>${pts(v)}</b></span>`)}
    </figcaption>
  </figure>`;
}

// ---------- Mapa de dominio ----------

export function MasteryMap({ course, onPick, compact }) {
  const pts = topicPoints(course);
  const temas = course.temas || [];
  const fmtPts = (v) => (course.escala === 10 ? fmtNum(v / 10, 1) : fmtNum(v, 0));
  if (!temas.length) return html`<p class="muted">Este curso todavía no tiene temas.</p>`;
  return html`<ol class=${`mastery${compact ? ' mastery-compact' : ''}`}>
    ${temas.map((t, i) => {
      const m = mastery(course, t.id);
      return html`<li>
        <button class=${`tile ${NIVELES[m.nivel].cls}`} onClick=${() => onPick && onPick(t)} title=${onPick ? `Practicar ${t.nombre}` : t.nombre}>
          <span class="tile-n">Tema ${i + 1}</span>
          <span class="tile-name">${t.nombre}</span>
          <span class="tile-foot"><${StatusChip} nivel=${m.nivel} score=${m.score} small /><span class="tile-pts">≈ ${fmtPts(pts[t.id])} pts</span></span>
        </button>
      </li>`;
    })}
  </ol>`;
}

// ---------- Pequeños bloques ----------

export const Callout = ({ tone = 'info', title, children }) => html`<div class=${`callout callout-${tone}`} role=${tone === 'error' ? 'alert' : null}>
  ${tone === 'warn' || tone === 'error' ? html`<${Icon} n="alert" size=${18} />` : html`<${Icon} n="spark" size=${18} />`}
  <div>${title ? html`<strong>${title}</strong> ` : null}${children}</div>
</div>`;

export function Thinking({ label = 'Claude está pensando…', onStop }) {
  return html`<div class="thinking" role="status"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${label}
    ${onStop ? html`<button class="btn btn-quiet btn-sm" onClick=${onStop}>Detener</button>` : null}</div>`;
}

export function Segmented({ value, options, onChange, label }) {
  return html`<div class="seg" role="radiogroup" aria-label=${label}>
    ${options.map(([v, l]) => html`<button role="radio" aria-checked=${value === v} class=${value === v ? 'is-on' : ''} onClick=${() => onChange(v)}>${l}</button>`)}
  </div>`;
}

// Copia al portapapeles dentro del clic; si el visor no deja, selecciona el texto.
export async function copiar(texto, el) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    if (el) {
      const r = document.createRange();
      r.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }
    return false;
  }
}
