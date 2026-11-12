const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');
const raiz = path.join(__dirname, 'publico');
const modelo = process.env.LLAMA_URL || 'http://127.0.0.1:8081';
const puerto = Number(process.env.PORT || 8080);
const archivos = {'/':'index.html','/estilo.css':'estilo.css','/app.js':'app.js','/logo.png':'logo.png'};
const tipos = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
let ocupado = false;
function json(res,codigo,dato){res.writeHead(codigo,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(dato));}
async function cuerpo(req){let partes=[], n=0;for await(const parte of req){n+=parte.length;if(n>50000)throw new Error('La solicitud es demasiado grande.');partes.push(parte);}return JSON.parse(Buffer.concat(partes).toString('utf8'));}
function mensajesValidos(m){return Array.isArray(m) && m.length>0 && m.length<=20 && m.every(x=>x && ['user','assistant'].includes(x.role) && typeof x.content==='string' && x.content.length>0 && x.content.length<=8000) && m[m.length-1].role==='user';}
async function manejar(req,res){
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET' && archivos[url.pathname]){try{const archivo=path.join(raiz,archivos[url.pathname]);res.writeHead(200,{'Content-Type':tipos[path.extname(archivo)],'X-Content-Type-Options':'nosniff'});res.end(await fs.readFile(archivo));}catch{json(res,404,{error:'Archivo no encontrado.'});}return;}
  if(req.method==='GET' && url.pathname==='/api/estado'){try{const r=await fetch(modelo+'/health',{signal:AbortSignal.timeout(3000)});return json(res,r.ok?200:503,{disponible:r.ok,ocupado});}catch{return json(res,503,{disponible:false,ocupado});}}
  if(req.method==='POST' && url.pathname==='/api/chat'){
    if(ocupado)return json(res,429,{error:'Matick está atendiendo otra solicitud. Intenta de nuevo en un momento.'});
    let data;try{data=await cuerpo(req);}catch{return json(res,400,{error:'No se pudo leer la solicitud.'});}
    if(!mensajesValidos(data.mensajes))return json(res,400,{error:'Revisa los mensajes de la conversación.'});
    ocupado=true;
    try{
      const upstream=await fetch(modelo+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'matick-gemma',messages:[{role:'system',content:'Eres Matick, un asistente útil. Responde en español mexicano.'},...data.mensajes],max_tokens:768,stream:false}),signal:AbortSignal.timeout(240000)});
      if(!upstream.ok)return json(res,502,{error:'El motor no pudo procesar la solicitud.'});
      const respuesta=await upstream.json(); const texto=respuesta.choices?.[0]?.message?.content;
      if(typeof texto!=='string')return json(res,502,{error:'El motor devolvió una respuesta inesperada.'});
      return json(res,200,{respuesta:texto,uso:respuesta.usage||null});
    }catch{return json(res,503,{error:'El modelo aún no está disponible. Intenta más tarde.'});}finally{ocupado=false;}
  }
  return json(res,404,{error:'Ruta no encontrada.'});
}
if(require.main===module)http.createServer((req,res)=>manejar(req,res).catch(()=>{if(!res.headersSent)json(res,500,{error:'Ocurrió un error.'});else res.end();})).listen(puerto,'0.0.0.0',()=>console.log(`Matick Nube disponible en el puerto ${puerto}`));
module.exports={manejar,mensajesValidos};
