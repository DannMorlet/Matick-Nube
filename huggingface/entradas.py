"""Preparación de adjuntos y búsqueda para Matick Nube."""
import base64
import io
import re
from pathlib import Path
from urllib.parse import urlsplit

import pymupdf
import requests
from ddgs import DDGS
from PIL import Image, ImageOps

FORMATOS = [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".txt", ".md", ".csv", ".json"]
BUSQUEDA = re.compile(r"\b(busca(?:r|me)?|búscame|investiga|consulta|internet|en línea|fuentes|hoy|ayer|actual(?:es|mente|izado)?|reciente[s]?|últim[oa]s?|noticias|clima|pronóstico|cotización|precio|este año)\b", re.I)


def preparar_archivo(ruta):
    archivo = Path(ruta)
    ext = archivo.suffix.lower()
    if ext not in FORMATOS or archivo.stat().st_size > 10 * 1024**2:
        raise ValueError("Elige un formato admitido y archivos de hasta 10 MB.")
    if ext in {".png", ".jpg", ".jpeg", ".webp"}:
        with Image.open(archivo, formats=["PNG", "JPEG", "WEBP"]) as img:
            if img.width * img.height > 20_000_000:
                raise ValueError("La imagen supera los 20 megapíxeles.")
            img.thumbnail((1024, 1024))
            buffer = io.BytesIO()
            ImageOps.exif_transpose(img).convert("RGB").save(buffer, format="JPEG", quality=88)
        uri = "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()
        return {"type": "image_url", "image_url": {"url": uri}}
    if ext == ".pdf":
        with pymupdf.open(archivo) as doc:
            if doc.needs_pass:
                raise ValueError("El PDF está protegido con contraseña.")
            texto = "\n".join(doc[i].get_text()[:5000] for i in range(min(len(doc), 10)))
            if not texto.strip():
                raise ValueError("El PDF no contiene texto seleccionable. Adjunta la página como imagen.")
    else:
        with archivo.open("rb") as contenido:
            texto = contenido.read(36000).decode("utf-8-sig", errors="replace")
    return {"type": "text", "text": f"Extracto de {archivo.name}:\n{texto[:9000]}"}


def buscar(consulta):
    try:
        filas = DDGS(timeout=5).text(consulta[:300], region="mx-es", max_results=3)
    except Exception:
        filas = []
    if not filas:
        # Segundo proveedor para consultas de referencia.
        r = requests.get("https://es.wikipedia.org/w/api.php", params={
            "action": "query", "generator": "search", "gsrsearch": consulta[:300],
            "gsrlimit": 3, "prop": "extracts|info", "exintro": 1, "explaintext": 1,
            "exsentences": 2, "inprop": "url", "format": "json",
        }, headers={"User-Agent": "MatickNube/1.0 (huggingface.co/spaces/danymorlet/Matick-Nube)"}, timeout=5)
        r.raise_for_status()
        filas = [{"title": p["title"], "href": p["fullurl"], "body": p.get("extract", "")}
                 for p in r.json().get("query", {}).get("pages", {}).values()]
    return [f"{f['title']} — {f.get('body', '')[:700]}\n{f['href']}" for f in filas
            if urlsplit(f.get("href", "")).scheme in {"https", "http"}][:3]
