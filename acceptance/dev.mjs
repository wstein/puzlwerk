import {createServer} from 'node:http';
import {mkdtemp,readFile,realpath,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from './build.mjs';

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.wasm':'application/wasm'};
export function parseHost(args) {
 if(args.length===0)return '127.0.0.1';
 if(args.length!==2||args[0]!=='--host'||!args[1]||args[1].startsWith('-'))throw Error('Usage: --host <address>');
 return args[1];
}
export async function startServer(directory,port=4174,host='127.0.0.1') {
 const root=await realpath(directory);
 const server=createServer(async(req,res)=>{
  try {
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   const raw=(req.url??'').split('?')[0], decoded=decodeURIComponent(raw);
   if(!decoded.startsWith('/') || decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some(part=>part==='.'||part==='..')){res.writeHead(400);res.end('Invalid path');return;}
   let file=resolve(root,'.'+decoded);
   if(file!==root&&!file.startsWith(root+sep)){res.writeHead(400);res.end('Invalid path');return;}
   if((await stat(file)).isDirectory()) file=join(file,'index.html');
   file=await realpath(file);
   if(!file.startsWith(root+sep)){res.writeHead(400);res.end('Invalid path');return;}
   const data=await readFile(file);res.writeHead(200,{'content-type':types[extname(file).toLowerCase()]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data);
  } catch(error) {res.writeHead(error instanceof URIError?400:404);res.end('Not found');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
 return server;
}
async function main(){
 const port=process.env.PORT===undefined?4174:Number(process.env.PORT);
 const host=parseHost(process.argv.slice(2));
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer from 1 to 65535');
 const directory=await mkdtemp(join(tmpdir(),'puzlwerk-acceptance-'));
 try {
  await build('/',directory);const server=await startServer(directory,port,host);
  console.log(`http://${host}:${server.address().port}/`);
  const stop=()=>server.close(()=>rm(directory,{recursive:true,force:true}).then(()=>process.exit(0)));
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
 } catch(error){await rm(directory,{recursive:true,force:true});throw error;}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
