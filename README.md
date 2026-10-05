# SkillsStudy AI

Prototipo de un micro-SaaS para estudiantes universitarios: subís el programa del curso en PDF y la app arma el camino para pasarlo. Dice qué estudiar cada semana, cuánto necesitás sacar y cómo practicar lo que más pesa.

## Qué hace

- **Programa del curso → plan.** Claude lee el PDF y saca fechas, porcentajes y temas. Vos confirmás los datos antes de crear el plan semana por semana.
- **¿Cuánto necesito?** Con las notas que anotás, calcula el promedio que te falta para aprobar e incluye un simulador "¿y si…?".
- **Alerta de choque** cuando una semana tiene varias evaluaciones.
- **Menú al seleccionar texto** del material: más simple, un ejemplo, traducir o por qué importa, en tres niveles.
- **Quests** de 5 preguntas por tema, que repiten lo que fallás y desbloquean el tema siguiente.
- **Mapa de dominio** de cada tema en rojo, amarillo o verde.
- **Simulacro de examen** cronometrado, con proyección de la nota final.
- **Técnica Feynman:** explicás un tema con tus palabras y Claude te dice qué entendiste, qué te falta y qué está mal.

La especificación completa de la v1 (qué hace y qué no) está en [SPEC.md](SPEC.md).

## Verla

- **En GitHub Pages:** https://falfaro04.github.io/SkillsStudy-AI/. Muestra el curso de ejemplo y permite crear cursos a mano. Las funciones con IA no están disponibles aquí y los datos se guardan en tu navegador.
- **Con IA:** como Artifact de claude.ai, para quien tenga acceso y sesión iniciada.

## Cómo está hecho

- Página web publicada como Artifact de claude.ai. Usa las capacidades `sample` (llamar a Claude con la cuenta de quien la usa), `db` y `user` (guardar los cursos de cada persona en su espacio privado).
- Sin compilación: Preact + htm desde jsDelivr, módulos ES en `js/` y pdf.js desde cdnjs para leer los PDF en el navegador.
- Fuera de claude.ai funciona con un curso de ejemplo y guarda en el navegador. Las funciones con IA solo funcionan dentro de claude.ai.

Los detalles para desarrollar están en [CLAUDE.md](CLAUDE.md).

## Probar en local

```bash
python tools/dev_server.py
```

Después abrí http://127.0.0.1:8765. Para probar la subida de un programa usá [muestras/programa-ejemplo.pdf](muestras/programa-ejemplo.pdf), un programa ficticio que se regenera con `python tools/make_sample_pdf.py`.
