"use strict";
const $ = id => document.getElementById(id);
const key = "matick.cloud.conversations.v2", projectKey = "matick.cloud.projects.v1";
function saved(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } }
let sessions = saved(key, {chat:[],work:[]}), projects = saved(projectKey,[]);
if (!sessions || !Array.isArray(sessions.chat) || !Array.isArray(sessions.work)) sessions = {chat:[],work:[]};
if (!Array.isArray(projects)) projects = [];
let tab = "work", busy = false, files = [], events = [], modeWeb = "auto", careful = false, speak = false, server = null;
let spriteType = "idle", spriteIndex = 0, spriteRemaining = 0;
const frames = {idle:6,waving:4,review:6,failed:8};
function announce(msg) { $("announcement").textContent = msg; }
function persist() {
  try {
    sessions.chat = sessions.chat.slice(-80);
    sessions.work = sessions.work.slice(-80);
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch { announce("No se pudo guardar el historial en este navegador."); }
}
function persistProjects() { try { localStorage.setItem(projectKey, JSON.stringify(projects)); } catch { announce("No se pudo guardar el proyecto."); } }
function modal(title,message) {
  $("modal-title").textContent=title;
  $("modal-body").replaceChildren();
  const p=document.createElement("p"); p.textContent=message; $("modal-body").append(p);
  if (!$("modal").open) $("modal").showModal();
}
$("close").onclick=()=> $("modal").close();
function play(type) { spriteType=type; spriteIndex=0; spriteRemaining=type==="idle"?0:frames[type]*2; }
function tick() {
  const img=$("clare-sprite");
  const src="/clare/"+spriteType+"/"+String(spriteIndex).padStart(2,"0")+".png";
  if(img.getAttribute("src")!==src) img.src=src;
  spriteIndex=(spriteIndex+1)%(frames[spriteType]||6);
  if(spriteRemaining>0 && --spriteRemaining===0) play("idle");
}
$("clare-sprite").onerror=()=> { $("clare-sprite").onerror=null; $("clare-sprite").src="/matick.png"; };
$("clare-action").onclick=()=> { play("waving"); announce("Mini Clare te saluda."); };
setInterval(tick,160);
function bubble(role, content) {
  const node=document.createElement("article"); node.className="message"+(role==="user"?" user":"");
  const author=document.createElement("strong");author.textContent=role==="user"?"Tú":"Matick Nube";
  const text=document.createElement("div");text.className="reply-text";text.textContent=content;
  node.append(author,text);$("chat").append(node);$("chat").scrollTop=$("chat").scrollHeight;
  return text;
}
function drawChat() {
  $("chat").replaceChildren();
  for(const message of sessions[tab]||[]) bubble(message.role,message.content);
  $("welcome").hidden=(sessions[tab]||[]).length>0;
}
function el(tag,text,className) {
  const node=document.createElement(tag);
  if(text!==undefined) node.textContent=text;
  if(className) node.className=className;
  return node;
}
function projectPage() {
  const root=$("page-content"); root.replaceChildren();
  const card=el("div",undefined,"panel-card");
  card.append(el("b","Proyectos guardados en este navegador"),el("small","No se sincronizan con GitHub ni con la PC."));
  const input=el("input");input.className="inline-input";input.placeholder="Nombre del proyecto";input.maxLength=70;
  const create=el("button","＋ Crear proyecto");create.onclick=()=>{
    const name=input.value.trim(); if(!name) return;
    projects.push({name,created:new Date().toLocaleDateString("es-MX")});
    persistProjects();projectPage();
  };
  card.append(input,create);root.append(card);
  for(const item of projects) {
    const c=el("div",undefined,"panel-card");
    c.append(el("b",item.name),el("small","Creado: "+item.created));
    const open=el("button","Conversar sobre esto");
    open.onclick=()=> { setTab("work"); $("input").value="Quiero trabajar en el proyecto: "+item.name+"\n"; $("input").focus(); };
    c.append(open);root.append(c);
  }
}
function card(head,body) {
  const c=el("div",undefined,"panel-card");c.append(el("b",head),el("small",body));return c;
}
function renderPage() {
  const root=$("page-content");root.replaceChildren();
  const headings={projects:"Proyectos y tareas",live:"En vivo",more:"Más opciones"};
  $("page-heading").textContent=headings[tab]||"";
  if(tab==="projects") { projectPage(); return; }
  if(tab==="live") {
    root.append(card("Servidor Matick Nube",server?server.estado:"Sin información del servidor"));
    root.append(card("Modelo",server?.modelo||"Sin verificar"));
    root.append(card("Actividad de la conversación",events.join("\n")||"Sin tareas en curso."));
    const b=el("button","⟳ Comprobar ahora");b.className="panel-card";b.onclick=checkStatus;root.append(b);
  }
  if(tab==="more") {
    root.append(card("Conexión principal","https://danymorlet-matick-nube.hf.space/"));
    root.append(card("Herramientas disponibles","Chat con IA, búsqueda web, adjuntos de imagen, PDF con texto y documentos cortos."));
    root.append(card("Funciones de la PC que no están en este Space","MCP local, NPU, archivos de Windows, agentes de escritorio y control del sistema."));
    const reset=el("button","Borrar conversación de "+(tab==="work"?"Trabajo":"Chat"));
    reset.className="panel-card";reset.onclick=()=>{if(confirm("¿Borrar el historial guardado de Chat y Trabajo?")){sessions={chat:[],work:[]};persist();announce("Historial borrado.");}};
    root.append(reset);
  }
}
function setTab(next) {
  if(!["chat","work","projects","live","more"].includes(next))return;
  tab=next;
  document.querySelectorAll("[data-tab]").forEach(b=>{
    const selected=b.dataset.tab===next; b.classList.toggle("selected",selected);
    if(selected)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
    b.querySelector("span")?.classList.toggle("selected-icon",selected);
  });
  const conversation=next==="chat"||next==="work";
  $("home").hidden=!conversation;$("other-page").hidden=conversation;
  if(conversation) drawChat(); else renderPage();
}
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function log(message) { events.push(message); events=events.slice(-30);announce(message);if(tab==="live")renderPage(); }
function showAttachment() {
  $("attachments").replaceChildren();
  files.forEach((file,index)=>{
    const btn=el("button",file.name+" ×");btn.type="button";
    btn.onclick=()=>{if(!busy){files.splice(index,1);showAttachment();}};
    $("attachments").append(btn);
  });
}
$("files").onchange=()=>{
  const chosen=files.concat(Array.from($("files").files||[]));
  $("files").value="";
  if(chosen.length>3||chosen.some(f=>f.size>10*1024*1024)){modal("Adjuntos","Hasta tres archivos de máximo 10 MB cada uno.");return;}
  files=chosen;showAttachment();
};
$("think").onclick=()=>{
  careful=!careful;$("think").setAttribute("aria-pressed",String(careful));
  announce(careful?"Respuestas más detalladas activadas.":"Respuestas normales activadas.");
};
$("web").onclick=()=>{
  modeWeb=({auto:"si",si:"no",no:"auto"})[modeWeb];
  $("web").textContent="🌐 Internet · "+({auto:"auto",si:"activo",no:"apagado"})[modeWeb];
};
$("voice").onclick=()=>{
  if(!("speechSynthesis" in window)){modal("Voz","El navegador no permite la lectura en voz alta.");return;}
  speak=!speak;$("voice").setAttribute("aria-pressed",String(speak));
  if(!speak) window.speechSynthesis.cancel();
  announce(speak?"Lectura de respuestas activada.":"Lectura de respuestas desactivada.");
};
async function checkStatus() {
  try{
    const response=await fetch("/api/estado",{cache:"no-store",signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error("HTTP "+response.status);
    server=await response.json();
    $("model-indicator").textContent=(server.disponible?"● ":"○ ")+(server.disponible?(server.modelo||"Modelo en línea"):server.estado);
    $("model-indicator").classList.toggle("online",!!server.disponible);
  }catch{
    server={disponible:false,estado:"Sin conexión con Matick Nube"};
    $("model-indicator").textContent="○ Sin conexión";$("model-indicator").classList.remove("online");
  }
  if(tab==="live")renderPage();
}
function handleAction(action){
  if(action==="new"){
    if(busy){modal("En proceso","La respuesta está en curso. Intenta al terminar.");return;}
    if(confirm("¿Empezar nueva conversación y borrar el historial de esta sección?")){
      const target=(tab==="chat"||tab==="work")?tab:"work";
      sessions[target]=[];persist();files=[];showAttachment();setTab(target);$("input").value="";play("waving");
    }
  }else if(action==="menu"){
    modal("Matick Studio LM Cloud","Trabajo: chat con herramientas disponibles en la nube.\nChat: conversación normal.\nProyectos: lista guardada en este dispositivo.\nEn vivo: estado y actividad real del servidor.\nMás: opciones y límites.");
  }else if(action==="attach"||action==="vision"){
    if(busy)return;$("files").accept=action==="vision"?".png,.jpg,.jpeg,.webp":".png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.pdf";$("files").click();
  }else if(action==="models"){
    modal("Modelo de Matick Nube",(server?.modelo||"Matick Gemma 4 E2B Mexicano v3")+"\n"+(server?.estado||"Estado sin verificar")+"\nLa selección de varios modelos todavía no está habilitada en este servidor.");
  }else if(action==="tools"){
    modal("Herramientas de la nube","Disponibles: chat por llama.cpp, búsqueda web (automática/activada/apagada), visión con imágenes y lectura de PDF con texto, TXT, MD, CSV y JSON. No ejecuta herramientas de Windows.");
  }else if(action==="mcp"||action==="skills"||action==="npu"||action==="agent"){
    const names={mcp:"MCP",skills:"Habilidades",npu:"NPU",agent:"Agente de PC"};
    modal(names[action]+" · no disponible aquí","Esta función de Matick Studio LM de Windows no está conectada al Space. El servidor usa llama.cpp remoto y únicamente sus herramientas documentadas.");
  }else if(action==="ideas"){
    $("input").value="Dame tres ideas prácticas para mejorar mi proyecto, indicando la más sencilla de implementar.";
    setTab("work");$("input").focus();
  }else if(action==="media"){
    modal("Multimedia","Puedes adjuntar imágenes para describirlas. La generación y edición de imágenes todavía no está implementada en Matick Nube.");
  }else if(action==="motor"){
    modal("Motor de inferencia","Matick Nube ejecuta llama.cpp en el servidor de Hugging Face. No utiliza la NPU ni la GPU de tu teléfono.");
  }else if(action==="check"){checkStatus();announce("Comprobando conexión.");}
  else if(action==="projects")setTab("projects");
  else if(action==="activity")setTab("live");
}
document.addEventListener("click",e=>{const button=e.target.closest("[data-action]");if(button)handleAction(button.dataset.action);});
function speakReply(text){
  if(!speak||!("speechSynthesis" in window))return;
  const utterance=new SpeechSynthesisUtterance(text.slice(0,1200));utterance.lang="es-MX";
  speechSynthesis.cancel();speechSynthesis.speak(utterance);
}
$("editor").onsubmit=async e=>{
  e.preventDefault();
  const prompt=$("input").value.trim();if(busy||(!prompt&&!files.length))return;
  const currentTab=tab,current=sessions[currentTab],attachments=files.slice();
  const history=current.slice(-12).map(m=>({role:m.role,content:m.content.slice(0,1200)}));
  const question=[prompt,...attachments.map(f=>"📎 "+f.name)].filter(Boolean).join("\n");
  const data=new FormData();data.set("texto",prompt);data.set("historial",JSON.stringify(history));
  data.set("web",modeWeb);data.set("modo",careful?"detallado":"normal");
  attachments.forEach(f=>data.append("archivos",f));
  busy=true;$("send").disabled=true;$("welcome").hidden=true;play("review");events=[];log("Solicitud enviada a Matick Nube");
  bubble("user",question);const output=bubble("assistant","");let full="",finished=false;
  try{
    const response=await fetch("/api/chat",{method:"POST",body:data});
    if(!response.ok){let problem="HTTP "+response.status;try{problem=(await response.json()).detail||problem;}catch{}throw Error(problem);}
    if(!response.body)throw Error("Tu navegador no permitió leer la respuesta.");
    const reader=response.body.getReader(), decoder=new TextDecoder();let buffer="";
    function process(line){
      if(!line.trim())return;
      const event=JSON.parse(line);
      if(event.tipo==="error")throw Error(event.valor||"Error de inferencia");
      if(event.tipo==="texto"){full+=event.valor;output.textContent=full;$("chat").scrollTop=$("chat").scrollHeight;}
      if(event.tipo==="estado"||event.tipo==="fin")log(event.valor);
      if(event.tipo==="fin")finished=true;
      if(event.tipo==="uso")log(event.valor+" tokens usados");
    }
    while(true){
      const chunk=await reader.read();if(chunk.done)break;
      buffer+=decoder.decode(chunk.value,{stream:true});
      const lines=buffer.split("\n");buffer=lines.pop();
      lines.forEach(process);
    }
    buffer+=decoder.decode();if(buffer.trim())process(buffer);
    if(!finished||!full.trim())throw Error("El motor no completó la respuesta. Puedes reenviar el mensaje.");
    current.push({role:"user",content:question},{role:"assistant",content:full});persist();
    $("input").value="";files=[];showAttachment();play("waving");speakReply(full);
  }catch(error){
    const msg=error instanceof Error?error.message:String(error);
    log("Falló: "+msg);play("failed");output.textContent="No se recibió una respuesta completa: "+msg;
    announce("Tu mensaje sigue en el editor para reintentar.");
  }finally{
    busy=false;$("send").disabled=false;checkStatus();
  }
};
$("input").onkeydown=e=>{
  if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){
    e.preventDefault();$("editor").requestSubmit();
  }
};
setTab("work");checkStatus();setInterval(checkStatus,15000);
