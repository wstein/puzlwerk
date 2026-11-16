import {createHash} from 'node:crypto';
export function verifyRecord(record,{sha,number,manifest}) {
  if (!record || typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha) ||
      !Number.isSafeInteger(number) || number < 1 || !Buffer.isBuffer(manifest) || manifest.length > 4*1024*1024 ||
      record.viewerHead !== sha || record.base !== `/puzlwerk/pr-preview/pr-${number}/` ||
      record.manifestSha256 !== createHash('sha256').update(manifest).digest('hex') ||
      !Array.isArray(record.routes) || record.routes.length > 10000) return false;
  let cases;
  try { cases=JSON.parse(manifest.toString('utf8')).cases; } catch { return false; }
  if (!Array.isArray(cases)) return false;
  const expected=cases.map(x=>x?.route);
  const valid=route=>typeof route==='string' && /^acceptance\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(route);
  return expected.length===record.routes.length && expected.every(valid) &&
    new Set(expected).size===expected.length && expected.every((route,index)=>route===record.routes[index]);
}
