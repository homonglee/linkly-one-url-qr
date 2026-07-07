#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, urlencode
from urllib.request import Request, urlopen
import json
import os
import re
import socket

ROOT = os.path.dirname(os.path.abspath(__file__))
CUSTOM_DOMAIN = "https://go.linkly.store"


def _json(handler, status, payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(data)


def _valid_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc) and "." in parsed.netloc
    except Exception:
        return False


def _slugify(text: str) -> str:
    text = (text or "").strip().lower()
    text = re.sub(r"[^a-z0-9가-힣_-]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:42]


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Always serve from this app directory, regardless of shell cwd.
        rel = urlparse(path).path.lstrip("/") or "index.html"
        rel = os.path.normpath(rel).replace("..", "")
        return os.path.join(ROOT, rel)

    def log_message(self, fmt, *args):
        print("%s - - [%s] %s" % (self.address_string(), self.log_date_time_string(), fmt % args), flush=True)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/shorten":
            qs = parse_qs(parsed.query)
            long_url = (qs.get("url") or [""])[0].strip()
            slug = _slugify((qs.get("slug") or [""])[0])
            campaign = (qs.get("campaign") or [""])[0].strip()
            if not _valid_url(long_url):
                return _json(self, 400, {"ok": False, "error": "http:// 또는 https:// 로 시작하는 올바른 URL을 입력해 주세요."})
            api_url = "https://tinyurl.com/api-create.php?" + urlencode({"url": long_url})
            try:
                req = Request(api_url, headers={"User-Agent": "Hermes-Linkly-Preview/1.0"})
                short_url = urlopen(req, timeout=12).read().decode("utf-8").strip()
                if not short_url.startswith("http"):
                    raise RuntimeError(short_url)
            except Exception as e:
                return _json(self, 502, {"ok": False, "error": f"단축 링크 생성 API 연결에 실패했습니다: {e}"})
            display_url = f"{CUSTOM_DOMAIN}/{slug}" if slug else short_url.replace("https://", "")
            return _json(self, 200, {
                "ok": True,
                "shortUrl": short_url,
                "displayUrl": display_url,
                "qrUrl": short_url,
                "slug": slug,
                "campaign": campaign,
                "provider": "TinyURL public API",
            })
        return super().do_GET()


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


if __name__ == "__main__":
    port = int(os.environ.get("PORT") or free_port())
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"SERVING http://127.0.0.1:{port}", flush=True)
    httpd.serve_forever()
