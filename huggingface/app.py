"""Matick Nube para Hugging Face Spaces con ZeroGPU y llama.cpp."""
import ctypes
import os
from pathlib import Path
import spaces
import torch
import gradio as gr
from huggingface_hub import hf_hub_download

# La librería CUDA que acompaña a PyTorch se carga antes del motor.
for directorio in [Path(torch.__file__).resolve().parent / "lib", Path(torch.__file__).resolve().parent.parent / "nvidia" / "cuda_runtime" / "lib"]:
    for nombre in ("libcudart.so.12", "libcudart.so"):
        archivo = directorio / nombre
        if archivo.is_file():
            try:
                ctypes.CDLL(str(archivo), mode=ctypes.RTLD_GLOBAL)
            except OSError:
                pass

REPOSITORIO = "danymorlet/Matick-Gemma-4-E2B-Mexicano-v3-GGUF"
ARCHIVO = "Matick-Gemma-4-E2B-Mexicano-v3+EmbeddingGemma-2-Q4_K_M.gguf"
MODELO = hf_hub_download(repo_id=REPOSITORIO, filename=ARCHIVO)

@spaces.GPU(duration=60)
def responder(mensaje, historial):
    """Una llamada usa GPU solo durante la generación y libera el motor al terminar."""
    from llama_cpp import Llama
    mensaje = (mensaje or "").strip()
    if not mensaje:
        return "Escribe un mensaje para comenzar."
    if len(mensaje) > 8000:
        return "El mensaje es demasiado largo. Intenta con menos de 8,000 caracteres."
    mensajes = [{"role": "system", "content": "Eres Matick, un asistente útil. Responde en español mexicano."}]
    for item in (historial or [])[-12:]:
        if isinstance(item, dict) and item.get("role") in ("user", "assistant") and isinstance(item.get("content"), str):
            mensajes.append({"role": item["role"], "content": item["content"][:8000]})
    mensajes.append({"role": "user", "content": mensaje})
    motor = Llama(model_path=MODELO, n_ctx=4096, n_gpu_layers=-1, verbose=False)
    try:
        salida = motor.create_chat_completion(messages=mensajes, max_tokens=512, temperature=0.7)
        return salida["choices"][0]["message"].get("content") or "No pude generar una respuesta. Intenta de nuevo."
    finally:
        motor.close()

CSS = """
.gradio-container {max-width: 940px !important; margin:auto !important; background: #fffcf5 !important; font-family: Inter, system-ui, sans-serif !important;}
#barra {align-items:center; border-bottom:1px solid #eee7d9; padding: 12px 0;}
#marca {font-weight:750; font-size:18px; color:#211a0c;} #nube {text-align:center; background:linear-gradient(135deg,#ffe467,#ffbb09); border:1px solid #f2b818; border-radius:100px; padding:9px 22px; font-weight:700; color:#342700;}
#inicio {text-align:center; padding:55px 10px 16px;} #inicio h1 {font-size:36px; letter-spacing:-1px; margin:12px 0;} #inicio p {color:#817055;} #emblema {display:inline-block; background:#ffd055; border:1px solid #f2b818; border-radius:18px; padding:15px; font-size:25px;}
#chatbot {border:1px solid #f0d083 !important; border-radius:20px !important; background:#fff !important;} footer {visibility:hidden;}
"""
with gr.Blocks(title="Matick Nube", css=CSS, theme=gr.themes.Soft(primary_hue="amber")) as demo:
    with gr.Row(elem_id="barra"):
        gr.Markdown("**☁ Matick Nube**", elem_id="marca", scale=3)
        gr.Markdown("☁ Nube", elem_id="nube", scale=1)
    gr.HTML('<div id="inicio"><span id="emblema">☁</span><h1>¿En qué trabajamos?</h1><p>Tu espacio para crear, aprender y experimentar con Matick.</p></div>')
    gr.ChatInterface(fn=responder, chatbot=gr.Chatbot(height=330, label="Conversación con Matick", elem_id="chatbot"),
                     textbox=gr.Textbox(placeholder="Escribe a Matick Nube…", label="Tu mensaje", max_lines=6),
                     title=None, description="✦ Matick Gemma 4 E2B Mexicano v3 · llama.cpp · ZeroGPU")
    gr.Markdown("Matick puede cometer errores. Verifica la información importante. El servicio gratuito tiene límites de uso y puede requerir espera.")

if __name__ == "__main__":
    demo.queue(default_concurrency_limit=1).launch(server_name="0.0.0.0", server_port=int(os.environ.get("PORT", "7860")), ssr_mode=False)
