"""Digest a bounded production tree, excluding only reserved publisher state."""
import hashlib
import os
from pathlib import Path

MAX_FILES = 10000
MAX_BYTES = 512 * 1024 * 1024
RECEIPT = '.puzlwerk-publication.json'

def digest(source, include_previews=False):
    root = Path(source)
    if root.is_symlink() or not root.is_dir() or not (root/'index.html').is_file() or (root/'index.html').is_symlink():
        raise ValueError('Missing production root')
    files = []
    size = 0
    for directory, dirs, names in os.walk(root, followlinks=False):
        parent = Path(directory)
        for name in dirs + names:
            path = parent/name
            rel = path.relative_to(root)
            if path.is_symlink() or not (path.is_file() or path.is_dir()):
                raise ValueError('Unsafe production entry')
            if not include_previews and len(rel.parts) == 1 and name == 'pr-preview' and path.is_dir():
                dirs.remove(name)
                continue
            if len(rel.parts) == 1 and name == RECEIPT and path.is_file():
                continue
            if path.is_file():
                size += path.stat().st_size
                files.append((rel.as_posix(), path))
                if size > MAX_BYTES or len(files) > MAX_FILES:
                    raise ValueError('Production snapshot exceeds budget')
    result = hashlib.sha256(b'puzlwerk-production-tree-v1\0')
    for name, path in sorted(files):
        encoded = name.encode('utf-8')
        data = path.read_bytes()
        result.update(len(encoded).to_bytes(8, 'big'))
        result.update(encoded)
        result.update(len(data).to_bytes(8, 'big'))
        result.update(hashlib.sha256(data).digest())
    return result.hexdigest()

def make_receipt(root, sha, run, attempt, nonce):
    import re
    if not isinstance(sha, str) or not re.fullmatch('[a-f0-9]{40}', sha):
        raise ValueError('Invalid source SHA')
    if type(run) is not int or run < 1 or type(attempt) is not int or attempt < 1:
        raise ValueError('Invalid run identity')
    if not isinstance(nonce, str) or not re.fullmatch('[a-f0-9]{32}', nonce):
        raise ValueError('Invalid nonce')
    return {'schema': 1, 'sha': sha, 'run': run, 'attempt': attempt,
            'nonce': nonce, 'root': digest(root),
            'snapshot': digest(root, include_previews=True)}

def stage(source, destination, sha, run, attempt, nonce):
    import json
    import shutil
    source, destination = Path(source), Path(destination)
    if destination.exists() or destination.resolve().is_relative_to(source.resolve()):
        raise ValueError('Unsafe staging destination')
    if source.is_symlink() or not source.is_dir():
        raise ValueError('Missing production source')
    for directory, dirs, names in os.walk(source, followlinks=False):
        for name in dirs + names:
            path = Path(directory)/name
            if path.is_symlink() or not (path.is_file() or path.is_dir()):
                raise ValueError('Unsafe production source entry')
    shutil.copytree(source, destination, ignore=lambda directory, names: [name for name in names if name.startswith('.')])
    receipt = make_receipt(destination, sha, run, attempt, nonce)
    (destination/RECEIPT).write_text(json.dumps(receipt, separators=(',', ':')) + '\n')
    return receipt

def merge_production(current, production, destination):
    """Combine verified snapshot previews with a separately authorized root."""
    import shutil
    current, production, destination = map(Path, (current, production, destination))
    if destination.exists() or destination.resolve().is_relative_to(current.resolve()) or destination.resolve().is_relative_to(production.resolve()):
        raise ValueError('Unsafe merge destination')
    digest(current, include_previews=True)
    digest(production, include_previews=True)
    if (production/'pr-preview').exists():
        raise ValueError('Production root contains reserved preview namespace')
    shutil.copytree(production, destination, ignore=lambda directory, names: [RECEIPT] if Path(directory)==production and RECEIPT in names else [])
    if (current/'pr-preview').exists():
        shutil.copytree(current/'pr-preview', destination/'pr-preview')

if __name__ == '__main__':
    import secrets
    import sys
    stage(sys.argv[1], sys.argv[2], os.environ['GITHUB_SHA'], int(os.environ['GITHUB_RUN_ID']),
          int(os.environ['GITHUB_RUN_ATTEMPT']), secrets.token_hex(16))
