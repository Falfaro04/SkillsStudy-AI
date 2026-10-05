import { html } from '../ui.js';
import { S, cursoActual, ir } from '../store.js';
import { Material } from './material.js';
import { Quests } from './quests.js';
import { Feynman } from './feynman.js';

const TABS = [['material', 'Material'], ['quests', 'Quests'], ['feynman', 'Técnica Feynman']];

export function Estudiar() {
  const c = cursoActual();
  const sub = TABS.some(([k]) => k === S.sub) ? S.sub : 'material';
  return html`<div class="view">
    <header class="page-head">
      <p class="eyebrow">${c.nombre}</p>
      <h1>Estudiar</h1>
    </header>
    <nav class="subtabs" role="tablist" aria-label="Formas de estudiar">
      ${TABS.map(([k, l]) => html`<button role="tab" aria-selected=${sub === k} class=${sub === k ? 'is-on' : ''} onClick=${() => ir('estudiar', k)}>${l}</button>`)}
    </nav>
    ${sub === 'material' ? html`<${Material} key=${c.id} />` : sub === 'quests' ? html`<${Quests} key=${c.id} />` : html`<${Feynman} key=${c.id} />`}
  </div>`;
}
