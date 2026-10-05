"""Arma build/artifact.html, la versión de index.html que se publica como Artifact de claude.ai.

index.html es una página completa (así funciona en GitHub Pages). El Artifact, en cambio,
recibe solo el contenido y le pone su propio esqueleto. Este script copia lo que está entre
las marcas <!-- artifact:inicio --> y <!-- artifact:fin --> (título, estilos, el #app y los scripts).

Uso: python tools/build_artifact.py
Después se publica build/artifact.html con los archivos de js/ al mismo URL del Artifact.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'index.html')
OUT = os.path.join(ROOT, 'build', 'artifact.html')


def main():
    with open(SRC, encoding='utf-8') as f:
        html = f.read()
    parts = re.findall(r'<!-- artifact:inicio[^>]*-->(.*?)<!-- artifact:fin -->', html, flags=re.S)
    if len(parts) != 2:
        raise SystemExit(f'Se esperaban 2 bloques marcados en index.html y hay {len(parts)}.')
    page = '\n'.join(p.strip('\n') for p in parts) + '\n'
    if not page.lstrip().startswith('<title>'):
        raise SystemExit('El primer bloque debe empezar con <title>: el Artifact busca el título al inicio.')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(page)
    print(f'{OUT} · {len(page)} caracteres')


if __name__ == '__main__':
    main()
