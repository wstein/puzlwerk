import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const [moduleUrl,oracleFile]=process.argv.slice(2);if(!moduleUrl||!oracleFile)throw Error('Usage: <viewer-profile-module-url> <shadow-oracle.json>');
const oracle=JSON.parse(await readFile(oracleFile,'utf8'));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();await page.goto(new URL(moduleUrl).origin);await page.addScriptTag({type:'importmap',content:JSON.stringify({imports:{three:new URL('../three/build/three.module.js',moduleUrl).href}})});
 const result=await page.evaluate(async({url,padded})=>{
  const profile=await import(url);const THREE=await import('three');const shadow=profile.createCubeAssemblerShadow(2,new THREE.Object3D());const fragment=shadow.mesh.material.fragmentShader;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});if(!gl)throw Error('No WebGL');
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const vs=shader(gl.VERTEX_SHADER,'attribute vec2 p;uniform vec2 samplePoint;varying vec2 floorPosition;void main(){floorPosition=samplePoint;gl_Position=vec4(p,0.,1.);}'), fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);gl.uniform2fv(gl.getUniformLocation(program,'outline[0]'),new Float32Array(padded));gl.uniform1f(gl.getUniformLocation(program,'soft'),.4);gl.uniform1f(gl.getUniformLocation(program,'alpha'),.3);gl.viewport(0,0,1,1);gl.disable(gl.BLEND);
  return [[0,0],[1.4,0],[2,0],[3,3]].map(point=>{gl.uniform2fv(gl.getUniformLocation(program,'samplePoint'),point);gl.drawArrays(gl.TRIANGLES,0,3);const rgba=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,rgba);return [...rgba];});
 },{url:moduleUrl,padded:oracle.padded});
 const expected=[[0,0,0,76],[0,0,0,54],[0,0,0,15],[0,0,0,0]];for(let i=0;i<expected.length;i++)for(let j=0;j<4;j++)assert.ok(Math.abs(result[i][j]-expected[i][j])<=1,`sample ${i} channel ${j}: ${result[i][j]}`);
 console.log('PASS: native source SDF alpha samples 4/4 within one 8-bit level');
}finally{await browser.close();}
