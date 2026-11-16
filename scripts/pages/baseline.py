"""Digest a bounded production tree, excluding only reserved publisher state."""
import hashlib
import os
from pathlib import Path

MAX_FILES = 10000
MAX_BYTES = 512 * 1024 * 1024
RECEIPT = '.puzlwerk-publication.json'

def digest(source):
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
            if len(rel.parts) == 1 and name == 'pr-preview' and path.is_dir():
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
