# SkillsStudy AI

La carpeta y algunas claves internas (`aprobado:v1` en el navegador, el resaltado `aprobado`) conservan el nombre original del prototipo, "Aprobado". No se cambian porque así no se pierden datos guardados.

Prototipo de micro-SaaS para estudiantes universitarios de Costa Rica: suben el programa del curso en PDF y la app arma el plan para pasarlo. La especificación de la v1 (qué hace y qué no) está en [SPEC.md](SPEC.md).

## Cómo está hecho

- Se publica en dos lugares desde el mismo `index.html`, que es una página HTML completa:
  - **Artifact de claude.ai** (https://claude.ai/artifact/Tm7tpnwsjK8YpiFY92i6ND), con IA y guardado por usuario. El Artifact recibe solo el contenido y le pone su propio esqueleto: correr `python tools/build_artifact.py`, que copia lo que está entre las marcas `<!-- artifact:inicio -->` / `<!-- artifact:fin -->` a `build/artifact.html`, y publicar ese archivo con `url` del Artifact y los `js/` que hayan cambiado en `files`. Todo lo que el Artifact necesite (título, estilos, scripts) tiene que quedar dentro de las marcas.
  - **GitHub Pages** (https://falfaro04.github.io/SkillsStudy-AI/), desde la rama `main`, carpeta raíz. Se actualiza solo con cada push. Ahí no hay Claude ni `db`: funciona con el curso de ejemplo y el navegador.
- Sin compilación. Preact + htm (UMD desde jsDelivr) y módulos ES en `js/`. pdf.js 3.11.174 se carga desde cdnjs solo al subir un PDF.
- Capacidades del Artifact (declararlas al publicar): `{"sample": {}, "db": {}, "user": {}}`.
  - `sample`: llama a Claude con la cuenta de quien usa la página. Todos los prompts están en `js/ai.js`.
  - `db` + `user`: cada usuario guarda en su espacio privado `data/users/<id>/` con documentos `perfil`, `curso-<id>` y `mat-<id>` (texto del material). Ver `js/store.js`.
  - Sin sesión de claude.ai (o abierto fuera del Artifact) se guarda en `localStorage` y las funciones con IA muestran un aviso.
- El CSP del Artifact solo permite scripts de cdnjs, jsDelivr, unpkg; estilos solo de Google Fonts. Nada de `fetch` a otros sitios.

## Archivos

- `js/model.js`: lógica pura (fechas, calculadora de notas, plan semanal, choques, dominio, quests). Las notas se guardan de 0 a 100; la escala del curso (100 o 10) solo cambia cómo se muestran.
- `js/store.js`: estado global `S`, `update()` para repintar, persistencia con una escritura a la vez por documento.
- `js/ui.js`: componentes compartidos (íconos, barra "camino al aprobado", mapa de dominio, texto de Claude).
- `js/views/`: una vista por sección (`hoy`, `plan`, `notas`, `estudiar` → `material`, `quests`, `feynman`; `simulacro`, `nuevo`).
- `js/demo.js`: curso de ejemplo (Contabilidad I) con fechas relativas a hoy, apuntes originales y 25 preguntas.
- `tools/dev_server.py`: servidor local (como GitHub Pages, con el tipo MIME correcto para `.js` en Windows). Está configurado como `aprobado` en `../.claude/launch.json`.
- `tools/build_artifact.py`: arma `build/artifact.html` para publicar en el Artifact (`build/` no se sube a git).
- `tools/make_sample_pdf.py`: genera `muestras/programa-ejemplo.pdf` (programa ficticio para probar la subida).

## Convenciones

- Textos de la interfaz en español de Costa Rica, con voseo ("Subí", "Necesitás").
- Colores siempre como tokens en `:root`, con sus versiones oscuras en los dos bloques de tema oscuro. `--mark` es el azul de los gráficos, validado con el script de la skill dataviz.
- Producto: ayudar a aprender, nunca hacer la tarea (no hay parafraseador para entregar trabajos).

## Probar

1. Iniciar el servidor `aprobado` desde el panel del navegador (o `python tools/dev_server.py`) y abrir http://localhost:8765.
2. Localmente no hay Claude ni `db`: se prueba con el curso de ejemplo y `localStorage`.
3. Las funciones con IA solo se prueban en el Artifact publicado, con sesión iniciada en claude.ai.
