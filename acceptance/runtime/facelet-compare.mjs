const faces=['u','r','f','d','l','b'];
export function visibleColorsMatch(native,candidate) {
  return faces.every(face=>Array.isArray(native?.[face]) && Array.isArray(candidate?.[face]) && native[face].length===4 && candidate[face].length===4 && native[face].every((value,index)=>value===candidate[face][index]));
}
