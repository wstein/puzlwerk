"""Check a previously verified snapshot and issue a receipt after preview changes."""
import importlib.util
import json
from pathlib import Path
import secrets
import sys
spec=importlib.util.spec_from_file_location('puzlwerk_baseline',Path(__file__).with_name('baseline.py'))
baseline=importlib.util.module_from_spec(spec); spec.loader.exec_module(baseline)
mode, directory, previous_file = sys.argv[1:4]
root=Path(directory); data=Path(previous_file).read_bytes()
if len(data)>32768: raise ValueError('Receipt too large')
previous=json.loads(data)
if baseline.digest(root)!=previous.get('root'): raise ValueError('Production root changed')
if mode=='verify':
    if baseline.digest(root,include_previews=True)!=previous.get('snapshot'): raise ValueError('Snapshot changed')
elif mode=='issue':
    sha,run,attempt=sys.argv[4:7]
    receipt=baseline.make_receipt(root,sha,int(run),int(attempt),secrets.token_hex(16),previous=previous.get('nonce'))
    (root/baseline.RECEIPT).write_text(json.dumps(receipt,separators=(',',':'))+'\n')
    print(json.dumps(receipt,separators=(',',':')))
else: raise ValueError('Unknown operation')
