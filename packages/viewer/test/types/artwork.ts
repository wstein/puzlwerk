import type {ArtworkReplacement,CubeProjection,CubeScene} from '@puzlwerk/viewer';
const sourceFace={normal:[0,0,1],up:[0,1,0],color:'#ff0000'} as const;
const picture={widths:[1,1],faces:{U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'}};
const replacement:ArtworkReplacement={appearance:{construction:'stickerless',frameColor:null},picture,stickers:[{id:'s',color:'#ffffff',sourceFace,picture:{face:'F',layerIndex:[0,1,1]}}]};
const projection:CubeProjection={pieces:[{id:'p',transform:{position:[0,0,0],rotation:[0,0,0,1]},stickers:[{id:'s',transform:{position:[0,0,.5],rotation:[0,0,0,1]},size:[.8,.8],color:'#ffffff',sourceFace,picture:{face:'F',layerIndex:[0,1,1]}}]}],picture};
declare const scene:CubeScene;void scene.setArtwork(replacement);void projection;
// @ts-expect-error Construction is restricted to the source modes.
const bad:ArtworkReplacement={appearance:{construction:'other'},stickers:[]};void bad;
