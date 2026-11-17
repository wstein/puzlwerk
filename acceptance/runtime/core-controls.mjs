import {Quaternion} from 'three';
import {parseNotation} from '../packages/core-viewer-bridge/src/index.mjs';

/** Controls use Core notation and the same policy-checked player as pointer play. */
export function addCoreMoves(container,{player,stage,size,setStatus}){
 const physical=new Quaternion(),colors={x:0xd9493f,y:0xf4f4f4,z:0x4caf67},families=[...(size===3?['M','E','S']:[]),'x','y','z'];
 for(const family of families)for(const suffix of ['',"'",'2']){
  const token=family+suffix,button=document.createElement('button');button.textContent=token;container.append(button);
  button.addEventListener('click',async()=>{
   for(const control of container.querySelectorAll('button'))control.disabled=true;
   try{const parsed=parseNotation(size,token);if(!parsed.ok)throw Error(parsed.error.code);const move=parsed.value,result=await player.turn(move.axis,move.layers,move.turns,250);if(!result.ok)throw Error(result.error.code);
    if('xyz'.includes(family)){physical.premultiply(new Quaternion(...move.rotation)).normalize();const shown=stage.setOrientationIndicator({physicalOrientation:physical.toArray(),solverFrame:[0,0,0,1],colors});if(!shown.ok)throw Error(`Core move committed; indicator: ${shown.error.code}`);}
    setStatus(`Shared Core changed by ${token}; native comparison state is unchanged.`);
   }catch(error){setStatus(`Error: ${error.message}`)}finally{for(const control of container.querySelectorAll('button'))control.disabled=false;}
  });
 }
}
