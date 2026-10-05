"""Servidor local para probar Aprobado.

Envuelve index.html con el mismo esqueleto que agrega el Artifact al publicar,
así la página se ve igual que en claude.ai. Fuera de claude.ai no hay Claude ni
base de datos: la app usa el curso de ejemplo y guarda en el navegador.

Uso: python tools/dev_server.py [puerto]
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

SKELETON = (
    '<!doctype html><html><head><meta charset=utf8>'
    '<meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">'
    '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}'
    'body{margin:0;font:14px system-ui,sans-serif;background:#f8f8f7}img{max-width:100%}[hidden]{display:none!important}</style>'
    '</head><body>{page}</body></html>'
)


class Handler(http.server.SimpleHTTPRequestHandler):
    # En Windows el registro puede decir que .js es text/plain y los módulos no cargan.
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0].split('#')[0]
        if path in ('/', '/index.html'):
            with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
                body = SKELETON.replace('{page}', f.read()).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler) as httpd:
        print(f'Aprobado en http://127.0.0.1:{PORT}', flush=True)
        httpd.serve_forever()
