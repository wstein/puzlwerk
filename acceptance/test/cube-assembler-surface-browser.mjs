import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const shader=JSON.parse(await readFile(new URL('../fixtures/cube-assembler-solved-2/surface-shader-oracle.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {const page=await browser.newPage();const result=await page.evaluate(({vertex,fragment})=>{
 const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});if(!gl)throw Error('No WebGL');
 function compile(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
 const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
 function attr(name,values,n){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);const a=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,0,0)}
 attr('a_position',[-1,-1,0,3,-1,0,-1,3,0],3);const I=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);for(const name of ['u_mvp','u_model'])gl.uniformMatrix4fv(gl.getUniformLocation(p,name),false,I);gl.uniform3fv(gl.getUniformLocation(p,'u_lightDir1'),[1.5,2.5,2]);gl.uniform3fv(gl.getUniformLocation(p,'u_lightDir2'),[-2,-1,-2]);gl.uniform3fv(gl.getUniformLocation(p,'u_cameraPos'),[0,0,6.6]);gl.viewport(0,0,1,1);gl.disable(gl.BLEND);
 const inputs=[{normal:[0,0,1],color:[.8,.2,.1],occlusion:1},{normal:[0,1,0],color:[.8,.2,.1],occlusion:1},{normal:[0,0,1],color:[.8,.2,.1],occlusion:.58},{normal:[0,0,-1],color:[.11,.11,.12],occlusion:1}];
 return inputs.map(input=>{attr('a_normal',Array(3).fill(input.normal).flat(),3);attr('a_color',Array(3).fill(input.color).flat(),3);attr('a_occlusion',Array(3).fill(input.occlusion),1);gl.drawArrays(gl.TRIANGLES,0,3);const rgba=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,rgba);return {...input,rgba:Array.from(rgba)}});
 },shader);const path=new URL('../fixtures/cube-assembler-solved-2/surface-gpu-samples.json',import.meta.url);if(process.env.RECORD_ORACLE==='1')console.log(JSON.stringify(result,null,2));else {const expected=JSON.parse(await readFile(path,'utf8'));assert.deepEqual(result,expected.samples);console.log(JSON.stringify(result));}}finally{await browser.close()}
