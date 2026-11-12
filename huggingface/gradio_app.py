"""Interfaz clara de Matick Studio LM sobre el servicio gratuito ZeroGPU."""
import ctypes
import os
from pathlib import Path
import spaces
import torch
import gradio as gr
from huggingface_hub import hf_hub_download

for directorio in (Path(torch.__file__).parent / "lib", Path(torch.__file__).parent.parent / "nvidia/cuda_runtime/lib"):
    for nombre in ("libcudart.so.12", "libcudart.so"):
        ruta = directorio / nombre
        if ruta.is_file():
            try:
                ctypes.CDLL(str(ruta), mode=ctypes.RTLD_GLOBAL)
            except OSError:
                pass

MODELO = hf_hub_download("danymorlet/Matick-Gemma-4-E2B-Mexicano-v3-GGUF",
    "Matick-Gemma-4-E2B-Mexicano-v3+EmbeddingGemma-2-Q4_K_M.gguf")

@spaces.GPU(duration=60)
def generar(mensajes):
    from llama_cpp import Llama
    with Llama(model_path=MODELO, n_ctx=16384, n_gpu_layers=-1, verbose=False) as motor:
        resultado = motor.create_chat_completion(messages=mensajes, max_tokens=512, temperature=0.6)
        return resultado["choices"][0]["message"].get("content") or "Intenta reformular tu mensaje."


def responder(mensaje, historial):
    texto = (mensaje or "").strip()
    if not texto or len(texto) > 8000:
        return "Escribe un mensaje de hasta 8,000 caracteres."
    mensajes = [{"role":"system", "content":"Eres Matick. Responde en español mexicano de forma clara y útil."}]
    for item in (historial or [])[-12:]:
        contenido = item.get("content")
        if isinstance(contenido, list):
            contenido = " ".join(p.get("text", "") for p in contenido if isinstance(p, dict) and p.get("type") == "text")
        if item.get("role") in ("user","assistant") and isinstance(contenido,str) and contenido:
            mensajes.append({"role":item["role"],"content":contenido[:1500]})
    mensajes.append({"role":"user","content":texto})
    try:
        return generar(mensajes)
    except Exception as error:
        mensaje_error = str(error).lower()
        if "quota" in mensaje_error or "limit" in mensaje_error or "exceeded" in mensaje_error:
            return "Hugging Face agotó la cuota gratuita de GPU de esta sesión. Revisa tu cuota en Hugging Face e intenta cuando se restablezca."
        raise gr.Error("El servidor no pudo completar la respuesta. Intenta nuevamente en un momento.") from error


CSS = """
:root,body,.dark,.gradio-container{
 color-scheme:light!important;--body-background-fill:#fffcf6!important;--background-fill-primary:#fff!important;
 --background-fill-secondary:#fff9e8!important;--block-background-fill:#fff!important;--input-background-fill:#fff!important;
 --body-text-color:#211b10!important;--block-title-text-color:#211b10!important;--block-label-text-color:#715633!important;
 --input-text-color:#211b10!important;--input-placeholder-color:#88785f!important;--border-color-primary:#f0cb76!important;
 --border-color-accent:#ffc52b!important;--neutral-950:#211b10!important;--neutral-50:#fffdf7!important;
 --color-accent-soft:#fff0bb!important;--button-secondary-background-fill:#fffaf0!important;
 --button-secondary-text-color:#493716!important;--button-secondary-border-color:#efcc7c!important;
 --button-primary-background-fill:#ffc321!important;--button-primary-text-color:#332400!important;
 background:#fffcf6!important;color:#211b10!important}
.gradio-container{max-width:none!important;padding:0!important;margin:0!important;font-family:"Segoe UI",system-ui,sans-serif!important}
#encabezado{height:auto;min-height:68px;background:#fff;border-bottom:1px solid #e3ded4;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:12px 26px;color:#211b10}
#encabezado strong{font-size:14px}#encabezado em{font-style:normal;font-weight:400;color:#806749;margin-left:12px}
#nube{background:#ffc323;border:5px solid #ffecb5;border-radius:30px;padding:6px 36px;font-weight:700}
#encabezado small{color:#6b634f}.led{display:inline-block;background:#13ac7a;width:8px;height:8px;border-radius:100%;margin-right:6px}
#distribucion{gap:0!important;min-height:calc(100dvh - 70px)}
#lateral{background:#f5f4f2!important;border-right:1px solid #dfdcd7;padding:32px 22px!important;min-width:210px!important;max-width:240px!important}
.marca{display:flex;align-items:center;gap:12px;color:#211b10}.marca .logo{width:37px;height:37px;border-radius:12px;background:#142746;color:white;display:grid;place-items:center;font-size:23px}.marca b{font-size:23px}.marca small{display:block;font-size:11px;margin-top:3px;color:#8c714a}
.lista{margin-top:34px;color:#67573d;line-height:2.5}.lista strong{color:#352a19}.lista small{display:block;line-height:1.5;color:#8b795d;margin:22px 0}
#principal{padding:clamp(35px,7vh,75px) clamp(16px,5vw,90px) 40px!important;background:#fffcf6!important;min-width:0!important}
#bienvenida{text-align:center;margin-bottom:24px;color:#211b10}
.rayo{width:57px;height:57px;display:grid;place-items:center;margin:0 auto 18px;border-radius:18px;border:1px solid #f7ac18;background:linear-gradient(135deg,#fff0bb,#ffd775);color:#ef7943;font-size:37px;font-weight:700}
#bienvenida h1{font-size:32px;letter-spacing:-1px;margin:8px 0;font-weight:750;color:#211b10!important}
#bienvenida p{font-size:14px;color:#82694a;margin:12px 0 0}
#chat{border:1px solid #f0d186!important;border-radius:18px!important;background:#fff!important;color:#211b10!important}
#chat .message,#chat .prose,#chat p,#chat li,#chat span{color:#211b10!important}
#chat [data-role="user"]{background:#fff1c2!important}
#conversacion{border:1px solid #ffc248;border-radius:23px;padding:12px!important;background:#fff!important;box-shadow:0 12px 30px #af811018}
#conversacion textarea{background:#fff!important;color:#211b10!important;font-size:14px!important;min-height:80px!important}
#conversacion button{border-radius:20px!important}
#modelo{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;font-size:12px;color:#4c3c1e}
#modelo span{border-radius:20px;background:#fff8e6;border:1px solid #f0d388;padding:6px 12px}
#modelo span:first-child{background:#dcf6ed;border-color:#95dbca}
#panel{background:#fff6da!important;border-left:1px solid #efd688;padding:25px 16px!important;min-width:225px!important;max-width:265px!important}
#panel h3{font-size:14px;color:#211b10;margin:0 0 20px}
.tarjeta{border:1px solid #f1dba3;border-radius:16px;background:white;padding:17px 14px;margin-bottom:16px;color:#211b10}
.tarjeta small{display:block;color:#7e7059;font-size:12px;line-height:1.6;margin-top:8px}
#nota{font-size:11px;color:#8b7757;text-align:center;margin-top:20px;line-height:1.6}
footer{display:none!important}
@media(max-width:1050px){#panel{display:none!important}#principal{padding-left:24px!important;padding-right:24px!important}}
@media(max-width:700px){#lateral{display:none!important}#encabezado{padding:10px 16px}#encabezado small{display:none}#nube{padding:5px 22px}#principal{padding:28px 12px!important}#bienvenida h1{font-size:28px}}
"""

with gr.Blocks(title="Matick Studio LM · Nube") as demo:
    gr.HTML('<header id="encabezado"><strong>Matick Studio LM <em>/ Nube</em></strong><span id="nube">Nube</span><small><i class="led"></i>Matick en la nube</small></header>')
    with gr.Row(elem_id="distribucion"):
        with gr.Column(scale=1, min_width=210, elem_id="lateral"):
            gr.HTML('<div class="marca"><span class="logo">☁</span><div><b>Matick</b><small>Studio LM · Morlet</small></div></div><div class="lista"><strong>Conversación en la nube</strong><br>◈ &nbsp; Gemma 4 E2B<br>ϟ &nbsp; llama.cpp<small>Escribe en el chat para comenzar.<br>Usa el botón de reinicio del chat para abrir una conversación nueva.</small></div>')
        with gr.Column(scale=5, min_width=300, elem_id="principal"):
            gr.HTML('<section id="bienvenida"><div class="rayo">ϟ</div><h1>¿En qué trabajamos?</h1><p>Tu espacio para crear, aprender y experimentar con Matick.</p></section>')
            with gr.Group(elem_id="conversacion"):
                gr.ChatInterface(fn=responder, chatbot=gr.Chatbot(height=240,label="Conversación",elem_id="chat"),
                    textbox=gr.Textbox(placeholder="Trabaja con Matick Studio LM…  (Enter envía · Shift + Enter nueva línea)",label="Tu mensaje",max_lines=6),
                    title=None, description=None)
            gr.HTML('<div id="modelo"><span>◈ &nbsp; Matick Gemma 4 E2B Mexicano v3</span><span>✳ &nbsp; llama.cpp</span><span>16,384 tokens de contexto</span></div><p id="nota">Versión de texto en la nube. La disponibilidad y el tiempo de uso dependen de la cuota gratuita de Hugging Face.</p>')
        with gr.Column(scale=1, min_width=225, elem_id="panel"):
            gr.HTML('<h3>Panel de Matick</h3><section class="tarjeta"><b>☁ &nbsp; Servicio en la nube</b><small>Hugging Face · ZeroGPU</small></section><section class="tarjeta"><b>Modelo</b><small>Matick Gemma 4 E2B<br>Mexicano v3 · llama.cpp</small></section><section class="tarjeta"><b>Uso gratuito</b><small>Hugging Face asigna una cuota por sesión o cuenta. Si aparece un límite, espera a que se restablezca.</small></section>')
if __name__ == "__main__":
    demo.queue(default_concurrency_limit=1).launch(server_name="0.0.0.0",server_port=int(os.environ.get("PORT","7860")),
        ssr_mode=False,css=CSS,theme=gr.themes.Soft(primary_hue="amber"))
