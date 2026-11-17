import {parseNotation} from '../packages/core-viewer-bridge/src/index.mjs';

/** Controls use Core notation and the same policy-checked player as pointer play. */
export function addCoreMoves(container,{player,stage,size,setStatus}){
 const families=[...(size===3?['M','E','S']:[]),'x','y','z'];
 for(const family of families)for(const suffix of ['',"'",'2']){
  const token=family+suffix,button=document.createElement('button');button.textContent=token;container.append(button);
  button.addEventListener('click',async()=>{
   for(const control of container.querySelectorAll('button'))control.disabled=true;
   try{const parsed=parseNotation(size,token);if(!parsed.ok)throw Error(parsed.error.code);const move=parsed.value,result=await player.turn(move.axis,move.layers,move.turns,250);if(!result.ok)throw Error(result.error.code);
    refreshIndicator(player,stage);
    setStatus(`Shared Core changed by ${token}; native comparison state is unchanged.`);
   }catch(error){setStatus(`Error: ${error.message}`)}finally{for(const control of container.querySelectorAll('button'))control.disabled=false;}
  });
 }
}

/** Indicator is a passive reference frame; logical cube moves never rotate its geometry. */
export function refreshIndicator(player,stage){
 const frame=player.colorFrame();if(!frame.ok)return frame;const [u,r,f]=frame.value;
 return stage.setOrientationIndicator({physicalOrientation:[0,0,0,1],solverFrame:[0,0,0,1],colors:{x:Number.parseInt(r.slice(1),16),y:Number.parseInt(u.slice(1),16),z:Number.parseInt(f.slice(1),16)}});
}
