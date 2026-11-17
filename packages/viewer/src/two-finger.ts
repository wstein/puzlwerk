// SPDX-License-Identifier: AGPL-3.0-or-later
// Thresholds from CubeAssembler CubeGesture.res (91fc2144cbcf2734f84ee3a93c70b8ed503a5151).
export type TwoFingerLock='undecided'|'tilt'|'pinch';
type Point=readonly [number,number];export type Pair=readonly [Point,Point];
export const midpoint=(p:Pair):Point=>[(p[0][0]+p[1][0])/2,(p[0][1]+p[1][1])/2];
export const spread=(p:Pair)=>Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);
export function twoFingerMotion(before:Pair,after:Pair){const a=midpoint(before),b=midpoint(after),s=spread(before);return {dx:b[0]-a[0],dy:b[1]-a[1],scale:s>0?spread(after)/s:1}}
export function twoFingerLock(startSpread:number,currentSpread:number,travel:number,lock:TwoFingerLock):TwoFingerLock{if(lock!=='undecided')return lock;const change=Math.abs(currentSpread-startSpread);if(change>=Math.max(24,.15*startSpread)&&change>travel)return 'pinch';if(travel>=16&&travel>change)return 'tilt';return 'undecided'}
