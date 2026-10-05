// Extrae el texto de un PDF en el navegador. pdf.js se carga solo cuando hace falta.
const BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let loading = null;

function cargarPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = BASE + 'pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = () => {
        loading = null;
        reject(new Error('No se pudo cargar el lector de PDF. Revisá tu conexión y probá de nuevo.'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// Une líneas cortadas y deja párrafos separados por una línea en blanco.
// Una línea mucho más corta que lo normal cierra el párrafo: así no se pegan filas de tablas ni listas.
export function limpiarTexto(raw) {
  const lines = raw.replace(/\r/g, '').split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim());
  const lens = lines.filter(Boolean).map((l) => l.length).sort((a, b) => a - b);
  const tipica = lens.length ? lens[Math.floor(lens.length * 0.75)] : 80;
  const out = [];
  let buf = '';
  let ultima = '';
  const flush = () => { if (buf) out.push(buf); buf = ''; };
  lines.forEach((line) => {
    if (!line) { flush(); ultima = ''; return; }
    if (!buf) { buf = line; ultima = line; return; }
    const prevEnds = /[.:;?!»”)]$/.test(ultima);
    const prevCorta = ultima.length < tipica * 0.7;
    const looksHeading = line.length < 60 && /^([A-ZÁÉÍÓÚÑ0-9]|[IVX]+\.|\d+[.)])/.test(line) && prevEnds;
    if (/-$/.test(buf) && /^[a-záéíóúñ]/.test(line)) buf = buf.slice(0, -1) + line;
    else if (prevCorta || looksHeading || /^[•\-–▪●]\s/.test(line)) { flush(); buf = line; }
    else buf += ' ' + line;
    ultima = line;
  });
  flush();
  return out.join('\n\n');
}

const crudoDe = (raw) => raw.replace(/\r/g, '').split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();

export async function pdfATexto(file, onProgress = () => {}) {
  const lib = await cargarPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await lib.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
  } catch (e) {
    if (e?.name === 'PasswordException') throw new Error('El PDF tiene contraseña. Quitásela y probá de nuevo.');
    throw new Error('No se pudo abrir el PDF. Puede estar dañado.');
  }
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress(i, doc.numPages);
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let s = '';
    let lastY = null;
    tc.items.forEach((it) => {
      const y = it.transform ? it.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && !s.endsWith('\n')) s += '\n';
      s += it.str;
      if (it.hasEOL) s += '\n';
      if (y !== null) lastY = y;
    });
    pages.push(s);
  }
  const raw = pages.join('\n\n');
  const texto = limpiarTexto(raw);
  if (texto.replace(/\s/g, '').length < 150) {
    throw new Error('Este PDF no tiene texto seleccionable: parece escaneado. Pegá el texto o usá otro PDF.');
  }
  // texto: párrafos para leer; crudo: líneas tal cual, para que Claude lea tablas y cronogramas.
  return { texto, crudo: crudoDe(raw), paginas: doc.numPages };
}
