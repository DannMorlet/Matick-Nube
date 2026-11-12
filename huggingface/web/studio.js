const $ = id => document.getElementById(id);
let chats = [];
try { chats = JSON.parse(sessionStorage.getItem("matick.chats") || "[]"); } catch {}
let actual = chats[0], ocupado = false, archivos = [], eventos = [], modoWeb = "auto";
const modal = document.querySelector("dialog");
function guardar() {
  try { sessionStorage.setItem("matick.chats", JSON.stringify(chats)); } catch {}
}
function nuevo() {
  if (ocupado) return;
  actual = {nombre:"Nueva conversación", mensajes:[]};
  archivos = []; eventos = []; $("entrada").value = "";
  pintar(); $("entrada").focus();
}
function mensaje(rol, texto) {
  const caja = document.createElement("article"), nombre = document.createElement("b"), contenido = document.createElement("div");
  caja.className = "mensaje " + (rol === "user" ? "usuario" : "");
  nombre.textContent = rol === "user" ? "Tú" : "Matick";
  contenido.textContent = texto; caja.append(nombre, contenido); $("chat").append(caja);
  return contenido;
}
function listar(destino, filtro = "") {
  destino.replaceChildren();
  for (const c of chats.filter(c => c.nombre.toLowerCase().includes(filtro.toLowerCase()))) {
    const b = document.createElement("button"); b.textContent = c.nombre; b.className = c === actual ? "activo" : "";
    b.onclick = () => { if (ocupado) return; actual = c; eventos = []; archivos = []; $("entrada").value = ""; pintar(); modal.close(); };
    destino.append(b);
  }
}
function pintar() {
  $("chat").replaceChildren(); for (const m of actual.mensajes) mensaje(m.role, m.content);
  $("bienvenida").hidden = actual.mensajes.length > 0; listar($("lista"), $("filtro").value);
  $("eventos").textContent = eventos.join("\n") || "Sin tareas en curso";
  $("adjuntos").replaceChildren(); $("aviso").textContent = "";
}
function registrar(texto) {
  eventos.push(texto); $("eventos").textContent = eventos.join("\n"); $("aviso").textContent = texto;
  if (modal.open && $("seccion").textContent === "Actividad de esta conversación") $("detalle").textContent = eventos.join("\n");
}
function abrir(titulo, contenido) {
  $("seccion").textContent = titulo; $("detalle").textContent = contenido; if (!modal.open) modal.showModal();
}
document.addEventListener("click", e => {
  const accion = e.target.closest("[data-accion]")?.dataset.accion;
  if (accion === "nuevo") nuevo();
  if (accion === "modelo") abrir("Modelo activo", "Matick Gemma 4 E2B Mexicano v3 · Q4_K_M\nContexto compartido de 16,384 tokens.\nEstado del servidor: " + $("estado").textContent);
  if (accion === "motor") abrir("Motor de inferencia", "llama.cpp · CPU de Hugging Face\nLa generación y el análisis de imágenes se ejecutan en la nube.");
  if (accion === "herramientas") abrir("Herramientas", "Visión: PNG, JPEG y WebP.\nLectura: PDF con texto, TXT, Markdown, CSV y JSON.\nInternet: búsqueda automática, siempre activa o apagada. Cambia el modo con el botón Internet.");
  if (accion === "actividad") abrir("Actividad de esta conversación", eventos.join("\n") || "Sin tareas en curso.");
  if (accion === "panel") {
    if (innerWidth <= 1150) abrir("Actividad de esta conversación", eventos.join("\n") || "Sin tareas en curso.");
    else document.body.classList.toggle("sin-panel");
  }
  if (accion === "historial") {
    abrir("Conversaciones", ""); const btn = document.createElement("button"); btn.textContent = "Nueva conversación"; btn.onclick = () => { modal.close(); nuevo(); };
    const lista = document.createElement("div"); listar(lista); $("detalle").append(btn, lista);
  }
  if ((accion === "archivo" || accion === "imagen") && !ocupado) {
    $("archivo").accept = accion === "imagen" ? ".png,.jpg,.jpeg,.webp" : ".png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.pdf";
    $("archivo").click();
  }
});
$("cerrar").onclick = () => modal.close();
$("filtro").oninput = () => listar($("lista"), $("filtro").value);
$("web").onclick = () => {
  modoWeb = ({auto:"si", si:"no", no:"auto"})[modoWeb];
  $("web").textContent = "⌕  Internet · " + ({auto:"automático",si:"activado",no:"apagado"})[modoWeb];
};
function adjuntos() {
  $("adjuntos").replaceChildren();
  archivos.forEach((f, i) => { const b = document.createElement("button"); b.type = "button"; b.textContent = f.name + " ×"; b.onclick = () => { archivos.splice(i,1); adjuntos(); }; $("adjuntos").append(b); });
}
$("archivo").onchange = () => {
  const seleccion = archivos.concat(Array.from($("archivo").files));
  if (seleccion.length > 3 || seleccion.some(f => f.size > 10*1024*1024)) $("aviso").textContent = "Elige hasta tres archivos de 10 MB cada uno.";
  else archivos = seleccion;
  $("archivo").value = ""; adjuntos();
};
async function estado() {
  try { const r = await fetch("/api/estado"); $("estado").textContent = (await r.json()).estado; }
  catch { $("estado").textContent = "Sin conexión"; }
}
$("editor").onsubmit = async e => {
  e.preventDefault(); const texto = $("entrada").value.trim();
  if (ocupado || (!texto && !archivos.length)) return;
  ocupado = true; $("enviar").disabled = true;
  const envio = new FormData(); envio.set("texto", texto); envio.set("web", modoWeb);
  envio.set("historial", JSON.stringify(actual.mensajes.slice(-12).map(m=>({...m,content:m.content.slice(0,1500)}))));
  archivos.forEach(f => envio.append("archivos", f));
  const pregunta = [texto, ...archivos.map(f => "📎 " + f.name)].filter(Boolean).join("\n");
  $("bienvenida").hidden = true; mensaje("user", pregunta); const salida = mensaje("assistant", ""); eventos = []; registrar("Solicitud enviada");
  try {
    const r = await fetch("/api/chat", {method:"POST",body:envio});
    if (!r.ok) throw Error((await r.json()).detail || "No se pudo enviar el mensaje.");
    const reader = r.body.pipeThrough(new TextDecoderStream()).getReader(); let buffer = "", completo = false;
    while (true) {
      const {value,done} = await reader.read(); if (done) break;
      buffer += value; const lineas = buffer.split("\n"); buffer = lineas.pop();
      for (const linea of lineas.filter(Boolean)) {
        const {tipo,valor} = JSON.parse(linea);
        if (tipo === "error") throw Error(valor);
        if (tipo === "texto") salida.append(document.createTextNode(valor));
        if (tipo === "estado" || tipo === "fin") registrar(valor);
        if (tipo === "uso") registrar(valor + " tokens en esta solicitud");
        if (tipo === "fin") completo = true;
      }
    }
    if (!completo) throw Error("La conexión se interrumpió. Puedes reenviar el mensaje.");
    if (!actual.mensajes.length) { actual.nombre = (texto || archivos[0].name).slice(0,48); chats.unshift(actual); }
    actual.mensajes.push({role:"user",content:pregunta},{role:"assistant",content:salida.textContent});
    $("entrada").value = ""; archivos = []; adjuntos(); guardar(); listar($("lista"));
  } catch (err) { registrar(err.message); salida.textContent ||= err.message; }
  finally { ocupado = false; $("enviar").disabled = false; estado(); }
};
$("entrada").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {e.preventDefault(); $("editor").requestSubmit();} };
actual ? pintar() : nuevo(); estado(); setInterval(estado, 15000);
