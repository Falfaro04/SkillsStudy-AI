import { html, useState, useEffect, useRef, Icon, RichText, Segmented, Thinking, Callout, copiar } from '../ui.js';
import { S, cursoActual, cambiarCurso, textoMaterial, guardarTexto, borrarTexto, toast, update } from '../store.js';
import { ACCIONES, NIVELES_EXPLICACION, explicar, mensajeError, esPermanente } from '../ai.js';
import { pdfATexto, limpiarTexto } from '../pdf.js';
import { uid, fmtNum } from '../model.js';

const MAX_CHARS = 150000;

// ---------- Agregar material ----------

function AgregarMaterial({ onListo, onCancel }) {
  const [modo, setModo] = useState('pdf');
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [pegado, setPegado] = useState('');
  const [arrastrando, setArrastrando] = useState(false);

  const guardar = (tit, texto) => {
    const c = cursoActual();
    const id = uid('m');
    const corto = texto.length > MAX_CHARS;
    const final = corto ? texto.slice(0, MAX_CHARS) : texto;
    if (c.demo) S.textos[id] = final;
    else guardarTexto(id, c.id, tit, final);
    cambiarCurso((cc) => { cc.material = [...(cc.material || []), { id, titulo: tit, chars: final.length }]; });
    toast(corto ? `Se agregó ${tit}. Era muy largo: se guardaron las primeras ${fmtNum(MAX_CHARS / 1000, 0)} mil letras.` : `Se agregó ${tit}.`);
    onListo(id);
  };

  const leerPdf = async (file) => {
    if (!file) return;
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { setError('Ese archivo no es un PDF.'); return; }
    setError(null);
    setEstado('Abriendo el PDF…');
    try {
      const { texto } = await pdfATexto(file, (i, n) => setEstado(`Leyendo la página ${i} de ${n}…`));
      setEstado(null);
      guardar(file.name.replace(/\.pdf$/i, ''), texto);
    } catch (e) {
      setEstado(null);
      setError(e.message || 'No se pudo leer el PDF.');
    }
  };

  return html`<div class="card add-mat">
    <div class="card-head">
      <h2 class="card-label">Agregar material</h2>
      ${onCancel ? html`<button class="btn btn-quiet btn-sm" onClick=${onCancel}>Cancelar</button>` : null}
    </div>
    <${Segmented} label="Cómo agregar" value=${modo} onChange=${setModo} options=${[['pdf', 'Subir PDF'], ['texto', 'Pegar texto']]} />
    ${modo === 'pdf' ? html`<label class=${`drop${arrastrando ? ' is-over' : ''}`}
        onDragOver=${(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave=${() => setArrastrando(false)}
        onDrop=${(e) => { e.preventDefault(); setArrastrando(false); leerPdf(e.dataTransfer.files[0]); }}>
        <${Icon} n="upload" size=${28} />
        <span class="drop-main">Arrastrá un PDF aquí o <u>elegí el archivo</u></span>
        <span class="drop-sub">Apuntes, presentaciones exportadas a PDF o capítulos del libro. El texto se lee en tu navegador.</span>
        <input type="file" id="mat-file" accept=".pdf,application/pdf" class="visually-hidden" onChange=${(e) => leerPdf(e.currentTarget.files[0])} />
      </label>` : html`<div class="stack-sm">
        <label class="field"><span>Título</span><input id="mat-titulo" type="text" value=${titulo} placeholder="Por ejemplo: Capítulo 3, presentación de la semana 5" onInput=${(e) => setTitulo(e.currentTarget.value)} /></label>
        <label class="field"><span>Texto</span><textarea id="mat-texto" rows="8" value=${pegado} placeholder="Pegá aquí el texto del material" onInput=${(e) => setPegado(e.currentTarget.value)}></textarea></label>
        <button class="btn btn-primary" disabled=${pegado.trim().length < 40} onClick=${() => guardar(titulo.trim() || 'Material pegado', limpiarTexto(pegado))}>Agregar</button>
      </div>`}
    ${estado ? html`<${Thinking} label=${estado} />` : null}
    ${error ? html`<${Callout} tone="error">${error}<//>` : null}
  </div>`;
}

// ---------- Lector con menú al seleccionar ----------

function Lector({ texto, onPedir }) {
  const ref = useRef(null);
  const [pop, setPop] = useState(null);

  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    let t;
    const medir = () => {
      const sel = window.getSelection();
      const el = ref.current;
      if (!sel || sel.isCollapsed || !sel.rangeCount || !el) { setPop(null); return; }
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) { setPop(null); return; }
      const txt = sel.toString().trim();
      if (txt.length < 2) { setPop(null); return; }
      const r = range.getBoundingClientRect();
      const W = 340;
      const left = Math.max(8, Math.min(window.innerWidth - W - 8, r.left + r.width / 2 - W / 2));
      const top = coarse || r.top < 64 ? r.bottom + 10 : r.top - 52;
      const nodo = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
      const parrafo = nodo?.closest('p, h3')?.textContent || txt;
      setPop({ top, left, txt: txt.slice(0, 2000), parrafo, range: range.cloneRange() });
    };
    const onChange = () => { clearTimeout(t); t = setTimeout(medir, 120); };
    document.addEventListener('selectionchange', onChange);
    window.addEventListener('scroll', onChange, { passive: true });
    window.addEventListener('resize', onChange);
    return () => {
      clearTimeout(t);
      document.removeEventListener('selectionchange', onChange);
      window.removeEventListener('scroll', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  const elegir = (accion) => {
    if (!pop) return;
    try {
      if (window.CSS?.highlights && window.Highlight) {
        const hl = CSS.highlights.get('aprobado') || new Highlight();
        hl.add(pop.range);
        CSS.highlights.set('aprobado', hl);
      }
    } catch { /* resaltado opcional */ }
    onPedir(accion, pop.txt, pop.parrafo);
    window.getSelection()?.removeAllRanges();
    setPop(null);
  };

  const bloques = texto.split(/\n{2,}/).filter((b) => b.trim());
  return html`<div class="reader-shell">
    <article class="reader" ref=${ref} tabindex="0" aria-label="Material del curso. Seleccioná texto para ver opciones.">
      ${bloques.map((b, i) => (b.startsWith('## ') ? html`<h3 key=${i}>${b.slice(3)}</h3>` : html`<p key=${i}>${b}</p>`))}
    </article>
    ${pop ? html`<div class="selpop" role="toolbar" aria-label="Opciones para el texto seleccionado" style=${{ top: pop.top + 'px', left: pop.left + 'px' }}>
      ${Object.entries(ACCIONES).map(([k, a]) => html`<button onMouseDown=${(e) => e.preventDefault()} onClick=${() => elegir(k)}>${a.label}</button>`)}
    </div>` : null}
  </div>`;
}

// ---------- Panel de explicaciones ----------

function Panel({ items, nivel, setNivel, onStop, abierto, onCerrar }) {
  return html`<aside class=${`explain${abierto ? ' is-open' : ''}`} aria-label="Explicaciones">
    <div class="explain-head">
      <h2 class="card-label">Explicaciones</h2>
      <button class="btn btn-quiet btn-sm explain-close" onClick=${onCerrar} aria-label="Cerrar explicaciones"><${Icon} n="close" size=${18} /></button>
    </div>
    <${Segmented} label="Nivel de explicación" value=${nivel} onChange=${setNivel} options=${Object.entries(NIVELES_EXPLICACION).map(([k, v]) => [k, v.label])} />
    ${!items.length ? html`<div class="explain-empty">
      <p>Seleccioná cualquier parte del material y elegí:</p>
      <ul class="fake-menu" aria-hidden="true">${Object.values(ACCIONES).map((a) => html`<li>${a.label}</li>`)}</ul>
      <p class="hint">La explicación aparece aquí, al nivel que elijás arriba.</p>
    </div>` : html`<ol class="explain-list">${items.map((it) => html`<li class="explain-item" key=${it.id}>
      <p class="explain-meta">${ACCIONES[it.accion].label}${it.accion !== 'traducir' ? ` · ${NIVELES_EXPLICACION[it.nivel].label}` : ''}</p>
      <blockquote class="explain-quote">${it.seleccion.length > 220 ? it.seleccion.slice(0, 220) + '…' : it.seleccion}</blockquote>
      ${it.estado === 'pensando' && !it.texto ? html`<${Thinking} onStop=${onStop} />` : null}
      ${it.texto ? html`<div class="explain-body" id=${'exp-' + it.id}><${RichText} text=${it.texto} /></div>` : null}
      ${it.estado === 'pensando' && it.texto ? html`<button class="btn btn-quiet btn-sm" onClick=${onStop}>Detener</button>` : null}
      ${it.error ? html`<${Callout} tone="error">${it.error}<//>` : null}
      ${it.estado === 'listo' ? html`<button class="btn btn-quiet btn-sm" onClick=${async () => {
        const ok = await copiar(it.texto, document.getElementById('exp-' + it.id));
        toast(ok ? 'Copiado.' : 'Texto seleccionado: copialo con Ctrl+C.');
      }}><${Icon} n="copy" size=${16} /> Copiar</button>` : null}
    </li>`)}</ol>`}
  </aside>`;
}

export function Material() {
  const c = cursoActual();
  const mats = c.material || [];
  const [activo, setActivo] = useState(mats[0]?.id || null);
  const [agregando, setAgregando] = useState(false);
  const [borrando, setBorrando] = useState(null);
  const [items, setItems] = useState([]);
  const [nivel, setNivel] = useState('normal');
  const [abierto, setAbierto] = useState(false);
  const ctl = useRef(null);

  const actual = mats.find((m) => m.id === activo) || mats[0];

  useEffect(() => () => ctl.current?.abort(), []);

  const patch = (id, p) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const pedir = async (accion, seleccion, contexto) => {
    ctl.current?.abort();
    const id = uid('x');
    setItems((xs) => [{ id, accion, nivel, seleccion, texto: '', estado: 'pensando' }, ...xs.map((x) => (x.estado === 'pensando' ? { ...x, estado: 'listo' } : x))].slice(0, 12));
    setAbierto(true);
    if (S.ia === false) {
      patch(id, { estado: 'error', error: S.iaBloqueo || mensajeError({ code: 'sin_ia' }) });
      return;
    }
    const ac = new AbortController();
    ctl.current = ac;
    try {
      const { text, truncated } = await explicar({
        accion, nivel, seleccion, contexto, curso: c.nombre, signal: ac.signal,
        onText: ({ text: t }) => patch(id, { texto: t }),
      });
      patch(id, { texto: text, estado: 'listo', error: truncated ? 'La respuesta se cortó. Seleccioná un fragmento más corto.' : null });
    } catch (e) {
      if (esPermanente(e)) update((s) => { s.ia = false; s.iaBloqueo = mensajeError(e); });
      patch(id, { estado: e.text ? 'listo' : 'error', texto: e.text || '', error: mensajeError(e) || (e.text ? null : 'Detenido.') });
    }
  };

  if (!mats.length || agregando) {
    return html`<div class="stack">
      ${!mats.length ? html`<div class="empty">
        <h2>Subí el material del curso</h2>
        <p>Apuntes, presentaciones o capítulos. Después seleccioná cualquier parte y Claude te la explica más simple, con un ejemplo, traducida o te dice por qué importa. Las quests y la técnica Feynman también usan este material.</p>
      </div>` : null}
      <${AgregarMaterial} onListo=${(id) => { setActivo(id); setAgregando(false); }} onCancel=${mats.length ? () => setAgregando(false) : null} />
    </div>`;
  }

  return html`<div class="stack">
    <div class="mat-bar">
      <div class="mat-tabs" role="tablist" aria-label="Materiales">
        ${mats.map((m) => html`<button role="tab" aria-selected=${m.id === actual.id} class=${m.id === actual.id ? 'is-on' : ''} onClick=${() => { setActivo(m.id); setBorrando(null); }}>
          <${Icon} n="doc" size=${16} />${m.titulo}</button>`)}
      </div>
      <div class="row-btns">
        <button class="btn btn-ghost btn-sm" onClick=${() => setAgregando(true)}><${Icon} n="mas" size=${16} /> Agregar</button>
        <button class="btn btn-quiet btn-sm" onClick=${() => setBorrando(actual.id)} aria-label=${`Quitar ${actual.titulo}`}><${Icon} n="trash" size=${16} /></button>
      </div>
    </div>
    ${borrando ? html`<div class="confirm" role="alertdialog">
      <p>¿Quitar <b>${actual.titulo}</b> de este curso?</p>
      <div class="row-btns">
        <button class="btn btn-danger btn-sm" onClick=${() => {
          const id = borrando;
          if (!c.demo) borrarTexto(id); else delete S.textos[id];
          cambiarCurso((cc) => { cc.material = cc.material.filter((m) => m.id !== id); });
          setBorrando(null);
          setActivo(null);
        }}>Quitar</button>
        <button class="btn btn-ghost btn-sm" onClick=${() => setBorrando(null)}>Cancelar</button>
      </div>
    </div>` : null}
    <p class="hint hint-top">Seleccioná cualquier texto para explicarlo, ver un ejemplo, traducirlo o saber por qué importa.</p>
    <div class="study-grid">
      <${Lector} texto=${textoMaterial(actual.id)} onPedir=${pedir} key=${actual.id} />
      <${Panel} items=${items} nivel=${nivel} setNivel=${setNivel} onStop=${() => ctl.current?.abort()} abierto=${abierto} onCerrar=${() => setAbierto(false)} />
    </div>
    ${items.length && !abierto ? html`<button class="btn btn-primary explain-fab" onClick=${() => setAbierto(true)}>Ver explicaciones (${items.length})</button>` : null}
  </div>`;
}
