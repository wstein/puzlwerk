"""Extract a bounded previously deployed Pages artifact for explicit bootstrap."""
import importlib.util, io, json, re, secrets, sys, tarfile, tempfile, zipfile
from pathlib import Path, PurePosixPath
spec=importlib.util.spec_from_file_location('puzlwerk_baseline',Path(__file__).with_name('baseline.py'))
baseline=importlib.util.module_from_spec(spec); spec.loader.exec_module(baseline)

def assemble(archive,destination,expected_root,expected_snapshot,sha,run,attempt,nonce):
 destination=Path(destination)
 if destination.exists(): raise ValueError('Destination exists')
 if not all(isinstance(x,str) and re.fullmatch('[a-f0-9]{64}',x) for x in (expected_root,expected_snapshot)): raise ValueError('Invalid expected hashes')
 with zipfile.ZipFile(archive) as z:
  entries=z.infolist()
  if len(entries)!=1 or entries[0].filename!='artifact.tar' or entries[0].file_size>512*1024*1024: raise ValueError('Invalid Pages artifact')
  data=z.read(entries[0])
 with tempfile.TemporaryDirectory(dir=destination.parent,prefix='.puzl-bootstrap-') as tmp:
  root=Path(tmp)/'site'; root.mkdir(); seen=set(); total=0
  with tarfile.open(fileobj=io.BytesIO(data),mode='r:*') as tar:
   members=tar.getmembers()
   if len(members)>10000: raise ValueError('Too many entries')
   for member in members:
    name=member.name
    if name in ('.','./') and member.isdir(): continue
    if name.startswith('./'): name=name[2:]
    name=name.rstrip('/'); parts=PurePosixPath(name).parts
    if (not name or name.startswith('/') or '\\' in name or ':' in name or '%' in name or str(PurePosixPath(name))!=name or any(x in ('.','..') or x.startswith('.') for x in parts) or name in seen or not (member.isfile() or member.isdir())): raise ValueError('Unsafe Pages artifact entry')
    seen.add(name); total+=member.size
    if member.size>64*1024*1024 or total>512*1024*1024: raise ValueError('Pages artifact exceeds budget')
    target=root/name
    if member.isdir(): target.mkdir(parents=True,exist_ok=True); continue
    target.parent.mkdir(parents=True,exist_ok=True)
    with tar.extractfile(member) as source, target.open('wb') as output:
     while chunk:=source.read(1024*1024): output.write(chunk)
  if baseline.digest(root)!=expected_root or baseline.digest(root,include_previews=True)!=expected_snapshot: raise ValueError('Bootstrap hashes mismatch')
  receipt=baseline.make_receipt(root,sha,run,attempt,nonce)
  (root/baseline.RECEIPT).write_text(json.dumps(receipt,separators=(',',':'))+'\n')
  root.rename(destination)
  return receipt

if __name__=='__main__':
 import os
 assemble(sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4],os.environ['GITHUB_SHA'],int(os.environ['GITHUB_RUN_ID']),int(os.environ['GITHUB_RUN_ATTEMPT']),secrets.token_hex(16))
