"""Genera muestras/programa-ejemplo.pdf: un programa de curso ficticio para probar la subida de PDF.

PDF mínimo escrito a mano (Helvetica, WinAnsi), sin dependencias.
Uso: python tools/make_sample_pdf.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'muestras', 'programa-ejemplo.pdf')

W, H = 612, 792
LEFT, TOP, BOTTOM = 56, 740, 60

# (tipo, contenido). Tipos: h1, h2, p, row (columnas), gap
DOC = [
    ('h1', 'Programa del curso: Matemática General'),
    ('p', 'Universidad de Ejemplo · Escuela de Ciencias Exactas · Documento ficticio para probar Aprobado'),
    ('p', 'Código: MA-101 · Créditos: 3 · II cuatrimestre 2026 · Modalidad a distancia con tutorías presenciales'),
    ('gap', ''),
    ('h2', '1. Descripción'),
    ('p', 'El curso desarrolla las herramientas de álgebra y funciones que se usan en los cursos de administración, '
          'contaduría y economía. Se enfatiza la resolución de problemas aplicados y la interpretación de resultados.'),
    ('h2', '2. Objetivo general'),
    ('p', 'Aplicar conceptos de álgebra, funciones, sistemas de ecuaciones y matemática financiera básica en la '
          'solución de problemas del entorno profesional.'),
    ('h2', '3. Contenidos'),
    ('p', 'Tema 1. Conjuntos y números reales: operaciones, intervalos y valor absoluto.'),
    ('p', 'Tema 2. Ecuaciones e inecuaciones lineales y cuadráticas.'),
    ('p', 'Tema 3. Funciones: dominio, ámbito, gráficas, función lineal y cuadrática.'),
    ('p', 'Tema 4. Funciones exponenciales y logarítmicas, y sus aplicaciones al crecimiento.'),
    ('p', 'Tema 5. Sistemas de ecuaciones lineales y matrices.'),
    ('p', 'Tema 6. Matemática financiera básica: interés simple y compuesto.'),
    ('h2', '4. Cronograma'),
    ('p', 'El cuatrimestre inicia el lunes 7 de setiembre y finaliza el sábado 12 de diciembre de 2026.'),
    ('row', ['Semana', 'Fechas', 'Contenido']),
    ('row', ['1 - 2', '7 al 19 de setiembre', 'Tema 1. Conjuntos y números reales']),
    ('row', ['3 - 4', '21 de setiembre al 3 de octubre', 'Tema 2. Ecuaciones e inecuaciones']),
    ('row', ['5 - 7', '5 al 24 de octubre', 'Tema 3. Funciones']),
    ('row', ['8 - 10', '26 de octubre al 14 de noviembre', 'Tema 4. Exponenciales y logaritmos']),
    ('row', ['11 - 13', '16 de noviembre al 5 de diciembre', 'Tema 5. Sistemas y matrices']),
    ('row', ['14', '7 al 12 de diciembre', 'Tema 6. Matemática financiera básica']),
    ('h2', '5. Evaluación'),
    ('row', ['Rubro', 'Porcentaje', 'Fecha de aplicación o entrega']),
    ('row', ['Tarea 1 (temas 1 y 2)', '10 %', 'sábado 26 de setiembre']),
    ('row', ['Quiz en línea (tema 3)', '5 %', 'viernes 16 de octubre']),
    ('row', ['Examen parcial I (temas 1 a 3)', '25 %', 'sábado 24 de octubre']),
    ('row', ['Tarea 2 (tema 4)', '10 %', 'sábado 14 de noviembre']),
    ('row', ['Examen parcial II (temas 4 y 5)', '25 %', 'sábado 5 de diciembre']),
    ('row', ['Proyecto de aplicación (temas 3 a 6)', '25 %', 'viernes 11 de diciembre']),
    ('row', ['Total', '100 %', '']),
    ('gap', ''),
    ('p', 'La nota mínima de aprobación es 7,0 en una escala de 0 a 10. Quien obtenga una nota final entre 6,0 y 6,9 '
          'tiene derecho a un examen de reposición, según el reglamento de evaluación.'),
    ('h2', '6. Bibliografía'),
    ('p', 'Texto base del curso, unidades 1 a 6. Materiales complementarios en el entorno virtual.'),
]


def esc(s):
    return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def wrap(text, size):
    max_chars = int((W - 2 * LEFT) / (size * 0.5))
    words, lines, cur = text.split(), [], ''
    for w in words:
        if len(cur) + len(w) + 1 > max_chars and cur:
            lines.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}'.strip()
    if cur:
        lines.append(cur)
    return lines


def layout():
    pages, ops, y = [], [], TOP

    def need(h):
        nonlocal ops, y
        if y - h < BOTTOM:
            pages.append(ops)
            ops, y = [], TOP

    def text(font, size, x, yy, s):
        ops.append(f'BT /{font} {size} Tf 1 0 0 1 {x} {yy:.1f} Tm ({esc(s)}) Tj ET')

    for kind, content in DOC:
        if kind == 'h1':
            need(30)
            text('F2', 18, LEFT, y, content)
            y -= 28
        elif kind == 'h2':
            need(30)
            y -= 8
            text('F2', 12.5, LEFT, y, content)
            y -= 20
        elif kind == 'p':
            for line in wrap(content, 10.5):
                need(16)
                text('F1', 10.5, LEFT, y, line)
                y -= 15
            y -= 4
        elif kind == 'row':
            need(16)
            xs = [LEFT, LEFT + 215, LEFT + 300] if len(content) == 3 and content[1].endswith('%') or content[1] == 'Porcentaje' else [LEFT, LEFT + 70, LEFT + 260]
            bold = content[0] in ('Semana', 'Rubro', 'Total')
            for x, cell in zip(xs, content):
                if cell:
                    text('F2' if bold else 'F1', 10, x, y, cell)
            y -= 15
        elif kind == 'gap':
            y -= 8
    pages.append(ops)
    return pages


def build():
    pages = layout()
    objs = []
    objs.append('<< /Type /Catalog /Pages 2 0 R >>')
    kids = ' '.join(f'{5 + 2 * i} 0 R' for i in range(len(pages)))
    objs.append(f'<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>')
    objs.append('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    objs.append('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    for i, ops in enumerate(pages):
        stream = '\n'.join(ops).encode('cp1252')
        objs.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {W} {H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {6 + 2 * i} 0 R >>')
        objs.append((f'<< /Length {len(stream)} >>\nstream\n'.encode('ascii'), stream, b'\nendstream'))
    out = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
    offsets = []
    for n, obj in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f'{n} 0 obj\n'.encode('ascii')
        out += b''.join(obj) if isinstance(obj, tuple) else obj.encode('cp1252')
        out += b'\nendobj\n'
    xref = len(out)
    out += f'xref\n0 {len(objs) + 1}\n0000000000 65535 f \n'.encode('ascii')
    for off in offsets:
        out += f'{off:010d} 00000 n \n'.encode('ascii')
    out += f'trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode('ascii')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'wb') as f:
        f.write(out)
    print(f'{OUT} · {len(pages)} páginas · {len(out)} bytes')


if __name__ == '__main__':
    build()
