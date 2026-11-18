import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'};
createServer(async (req,res)=>{
  try {
    const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!path.startsWith(root+sep)) throw Error('Invalid path');
    const data=await readFile(path); res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream'}); res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT??4179),'127.0.0.1',()=>console.log(`http://127.0.0.1:${process.env.PORT??4179}/packages/viewer/demo/index.html`));
