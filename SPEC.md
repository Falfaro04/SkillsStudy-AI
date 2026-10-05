# SkillsStudy AI — especificación de la v1 (prototipo)

**Una frase:** el estudiante sube el programa de su curso en PDF y la app le arma el camino para pasarlo: qué estudiar cada semana, cuánto necesita sacar y cómo practicar lo que más pesa.

**Para quién:** estudiantes universitarios de Costa Rica (UNED, UCR, TEC, privadas) que cursan por cuatrimestre o semestre y reciben un programa del curso con cronograma y porcentajes.

**Promesa:** "pasar el curso", no "estudiar más". Cada pantalla responde una de tres preguntas: ¿me ayuda a pasar?, ¿me hace volver?, ¿se lo paso a mis compañeros?

---

## Qué hace la v1

### Núcleo

| # | Función | Cómo funciona |
|---|---------|---------------|
| 1 | Subir el programa | PDF (texto extraído en el navegador con pdf.js) o texto pegado. Claude extrae curso, fechas, porcentajes y temas. |
| 2 | Confirmar los datos | Tabla editable antes de crear nada. Avisa si los porcentajes no suman 100 y si falta alguna fecha. Una fecha mal leída cuesta la confianza del estudiante, así que este paso es obligatorio. |
| 3 | Plan semana por semana | Se calcula sin IA a partir de las fechas: temas de la semana, repasos antes de cada evaluación y horas sugeridas que suben según lo que pesa lo que viene. Lo que quedó pendiente pasa solo a la semana actual. |
| 4 | Calculadora "¿cuánto necesito?" | Con las notas que anota, dice el promedio que necesita en lo que falta para llegar a la nota de aprobación. |
| 5 | Alerta de choque | Avisa las semanas con 2 o más evaluaciones, sumando todos sus cursos. |

### Las cinco funciones de estudio

| # | Función | Cómo funciona |
|---|---------|---------------|
| 6 | Menú al seleccionar texto | En el material del curso, al seleccionar texto aparecen: explicar más simple, dar un ejemplo, traducir y por qué importa. Tiene tres niveles: 12 años, normal y nivel examen. |
| 7 | Quests adaptativas | Misiones de 5 preguntas por tema. Una pregunta fallada vuelve al final de la quest y en la siguiente sale primero. Con 4 de 5 se completa la quest y se desbloquea el tema siguiente. Da experiencia (XP). |
| 8 | Mapa de dominio | Cada tema en rojo, amarillo o verde según los últimos resultados, con ícono y texto (no solo color). Recomienda el tema que más puntos vale y peor va. |
| 9 | Simulacro de examen | Cronometrado, con los temas de una evaluación real del curso. Opcionalmente imita el estilo de exámenes anteriores pegados por el estudiante. Al final proyecta la nota del curso. |
| 10 | Técnica Feynman | El estudiante explica un tema con sus palabras y Claude le dice qué entendió bien, qué le falta y qué está mal, usando solo el material del curso. |

### Reglas de producto

- Ayuda a **aprender**, nunca a hacer la tarea: no hay parafraseador para entregar trabajos.
- Claude responde con el material del curso cuando existe y lo dice cuando algo no está en el material.
- Si un dato no aparece en el PDF, queda vacío para que el estudiante lo complete. No se inventa.
- Escala configurable (0–100 o 0–10) y nota de aprobación por curso (por defecto 70).

---

## Qué NO hace la v1

- Recordatorios por correo o WhatsApp. El prototipo no puede enviar mensajes, así que van en la v2 con backend.
- Biblioteca compartida de cursos ni páginas públicas por curso (v2).
- Cobro (v2). Modelo previsto: gratis 1 curso, premium por cuatrimestre.
- Foros, red social, mercado de tutores, app nativa, tablas de posiciones.
- Modo rescate, tarjetas de repaso con repetición espaciada, audio-resumen (lista de ideas para después).
- PDFs escaneados (sin texto): se pide pegar el texto.

---

## Cómo está construido el prototipo

- Página web publicada como **Artifact de claude.ai**, con tres capacidades:
  - `sample`: llama a Claude desde la página, con la cuenta de quien la usa. No hace falta una API key.
  - `db` + `user`: guarda los cursos de cada persona en su espacio privado.
- Sin paso de compilación: Preact + htm desde jsDelivr y pdf.js desde cdnjs.
- Si no hay sesión de claude.ai, la página funciona con el **curso de ejemplo** y guarda en el navegador.

### Límites conocidos del prototipo

- Cada estudiante necesita una cuenta de claude.ai para usar las funciones con IA, que gastan su propio uso.
- Para que alguien guarde sus cursos en su cuenta de claude.ai, debe tener acceso de **Colaborador** o superior.
- Con un link público, cada visitante guarda en su propio navegador: si cambia de navegador o borra los datos del sitio, pierde sus cursos.

### Camino a la v2 (micro-SaaS real)

Backend propio (por ejemplo Next.js + Supabase + API de Claude), cuentas, cobro por cuatrimestre, recordatorios, biblioteca de cursos y páginas públicas por curso para SEO.

---

## Cómo validar antes de la v2

1. Conseguir 10 estudiantes con el PDF de un curso real.
2. Que usen el prototipo durante un mes, o hacerles el plan con él.
3. Preguntar si pagarían ₡2.500 por cuatrimestre. Si 3 o más dicen que sí, se construye la v2.
