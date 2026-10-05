"""Servidor local para probar SkillsStudy AI.

Sirve la carpeta del proyecto tal cual, igual que GitHub Pages. Fuera de claude.ai no hay
Claude ni base de datos: la app usa el curso de ejemplo y guarda en el navegador.

Uso: python tools/dev_server.py [puerto]
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    # En Windows el registro puede decir que .js es text/plain y los módulos no cargan.
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler) as httpd:
        print(f'SkillsStudy AI en http://127.0.0.1:{PORT}', flush=True)
        httpd.serve_forever()
