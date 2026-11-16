"""Assemble an authorized production root with an already verified snapshot."""
import importlib.util
import json
from pathlib import Path
import tempfile

spec=importlib.util.spec_from_file_location('puzlwerk_baseline',Path(__file__).with_name('baseline.py'))
baseline=importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)

def prepare(source, destination, sha, run, attempt, nonce, verified_snapshot, legacy=False, previous=None):
    destination=Path(destination)
    if destination.exists(): raise ValueError('Destination exists')
    if verified_snapshot is None and legacy is not True: raise ValueError('Verified snapshot required')
    if verified_snapshot is not None and previous is None: raise ValueError('Previous receipt required')
    if verified_snapshot is None and previous is not None: raise ValueError('Unexpected previous receipt')
    with tempfile.TemporaryDirectory(dir=destination.parent, prefix='.puzl-production-') as temp:
        root=Path(temp)/'root'
        baseline.stage(source,root,sha,run,attempt,nonce)
        if (root/'pr-preview').exists(): raise ValueError('Production root contains reserved preview namespace')
        candidate=Path(temp)/'candidate'
        if verified_snapshot is None:
            root.rename(candidate)
        else:
            baseline.merge_production(verified_snapshot,root,candidate)
        receipt=baseline.make_receipt(candidate,sha,run,attempt,nonce,previous=previous)
        (candidate/baseline.RECEIPT).write_text(json.dumps(receipt,separators=(',',':'))+'\n')
        candidate.rename(destination)
        return receipt
