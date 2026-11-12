const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {once}=require('node:events');
async function escuchar(servidor){servidor.listen(0,'127.0.0.1');await once(servidor,'listening');return `http://127.0.0.1:${servidor.address().port}`;}
test('la interfaz envía la conversación al motor y valida las solicitudes',async()=>{
  let recibido;
  const motor=http.createServer(async(req,res)=>{if(req.url==='/health'){res.writeHead(200);return res.end('{}');}let cuerpo='';for await(const bloque of req)cuerpo+=bloque;recibido=JSON.parse(cuerpo);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:'¡Hola!'}}],usage:{total_tokens:3}}));});
  process.env.LLAMA_URL=await escuchar(motor);
  const {manejar}=require('../servidor');const app=http.createServer(manejar);const base=await escuchar(app);
  try{
    const inicio=await fetch(base+'/');assert.equal(inicio.status,200);assert.match(await inicio.text(),/Matick Nube/);
    assert.equal((await fetch(base+'/api/estado')).status,200);
    const malo=await fetch(base+'/api/chat',{method:'POST',body:JSON.stringify({mensajes:[{role:'system',content:'x'}]})});assert.equal(malo.status,400);
    const bueno=await fetch(base+'/api/chat',{method:'POST',body:JSON.stringify({mensajes:[{role:'user',content:'Hola'}]})});assert.deepEqual(await bueno.json(),{respuesta:'¡Hola!',uso:{total_tokens:3}});assert.equal(recibido.messages.at(-1).content,'Hola');assert.equal(recibido.messages[0].role,'system');
  }finally{app.close();motor.close();}
});
