#!/usr/bin/env python3
"""Generate and check the wire v1 examples of the canonical state codec (T008).

  generate    write test/fixtures/wire/*
  check       regenerate in memory and compare the bytes with the committed files

Python standard library only; run as `python3 -I scripts/wire-examples.py ...`.
The examples are derived here by integer arithmetic, independent of the ReScript
core, from the data model (frames, face table, move rules) and the canonical JSON
rules of contracts/solver.md and contracts/wire-v1.md. The SHA-256 values in
index.json are computed here over the canonical bytes. Nothing is edited by hand.
"""
import hashlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "test", "fixtures", "wire")

# data model, "Frames and integer coordinates": outward normal and sticker up per face.
NORMAL = {"U": (0, 1, 0), "D": (0, -1, 0), "F": (0, 0, 1), "B": (0, 0, -1), "R": (1, 0, 0), "L": (-1, 0, 0)}
UP = {"F": (0, 1, 0), "B": (0, 1, 0), "R": (0, 1, 0), "L": (0, 1, 0), "U": (0, 0, -1), "D": (0, 0, 1)}
COLOR = {"U": "white", "D": "yellow", "F": "green", "B": "blue", "R": "red", "L": "orange"}
ORDER = "UDFBRL"


def mv(m, v):
    return tuple(sum(m[i][j] * v[j] for j in range(3)) for i in range(3))


def mm(a, b):
    return tuple(tuple(sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)) for i in range(3))


def flat(m):
    return [x for row in m for x in row]


IDENT = ((1, 0, 0), (0, 1, 0), (0, 0, 1))
# right-hand quarter turn about the positive axis, rows of the matrix (data model, "Moves")
QUARTER = {
    "X": ((1, 0, 0), (0, 0, -1), (0, 1, 0)),
    "Y": ((0, 0, 1), (0, 1, 0), (-1, 0, 0)),
    "Z": ((0, -1, 0), (1, 0, 0), (0, 0, 1)),
}


def rot(axis, turns):
    q = QUARTER[axis]
    if turns == 1:
        return q
    if turns == 2:
        return mm(q, q)
    return mm(mm(q, q), q)  # -1 is three quarter turns


def slots(n):
    d = [-(n - 1) + 2 * i for i in range(n)]
    return [(x, y, z) for x in d for y in d for z in d if max(abs(x), abs(y), abs(z)) == n - 1]


def faces_of(slot, n):
    t = n - 1
    out = []
    for f in ORDER:
        nv = NORMAL[f]
        if sum(a * b for a, b in zip(nv, slot)) == t:
            out.append(f)
    return out


def piece_id(slot, n):
    return "".join(faces_of(slot, n))


def definition(n):
    pieces = []
    for s in slots(n):
        fs = faces_of(s, n)
        pid = "".join(fs)
        stickers = [
            {"color": COLOR[f], "id": f"{pid}.{f}", "normal": list(NORMAL[f]), "up": list(UP[f])}
            for f in sorted(fs, key=lambda f: f"{pid}.{f}")
        ]
        pieces.append({"home": list(s), "id": pid, "stickers": stickers})
    pieces.sort(key=lambda p: p["id"])
    return {
        "convention": "cube-shell-v1",
        "id": f"cube{n}",
        "movePolicy": "outer-wide",
        "pieces": pieces,
        "revision": 1,
        "schema": "puzlwerk.definition",
        "size": n,
    }


def state(n, moves):
    poses = {}
    for s in slots(n):
        poses[piece_id(s, n)] = (s, IDENT)
    t = n - 1
    for axis, layers, turns in moves:
        r = rot(axis, turns)
        ai = "XYZ".index(axis)
        for pid, (p, o) in list(poses.items()):
            layer = (p[ai] + t) // 2
            if layer in layers:
                poses[pid] = (mv(r, p), mm(r, o))
    return {
        "definitionId": f"cube{n}",
        "poses": [
            {"orientation": flat(o), "pieceId": pid, "position": list(p)} for pid, (p, o) in sorted(poses.items())
        ],
        "revision": 1,
        "schema": "puzlwerk.state",
    }


def canon(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")


EXAMPLES = {
    "definition-2.json": lambda: definition(2),
    "state-2-home.json": lambda: state(2, []),
    # R U F' on the 2x2
    "state-2-scrambled.json": lambda: state(2, [("X", [1], -1), ("Y", [1], -1), ("Z", [1], 1)]),
    "definition-3.json": lambda: definition(3),
    "state-3-home.json": lambda: state(3, []),
    # R U R' U' Rw F2 x on the 3x3: outer, wide, half turn and an all-layer rotation (centers move)
    "state-3-scrambled.json": lambda: state(
        3,
        [("X", [2], -1), ("Y", [2], -1), ("X", [2], 1), ("Y", [2], 1), ("X", [1, 2], -1), ("Z", [2], 2), ("X", [0, 1, 2], -1)],
    ),
}


def build():
    files = {name: canon(make()) for name, make in EXAMPLES.items()}
    index = {name: {"bytes": len(b), "sha256": "sha256:" + hashlib.sha256(b).hexdigest()} for name, b in sorted(files.items())}
    files["index.json"] = json.dumps(index, indent=2, sort_keys=True).encode("ascii") + b"\n"
    return files


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    files = build()
    if cmd == "generate":
        os.makedirs(OUT, exist_ok=True)
        for name, data in files.items():
            with open(os.path.join(OUT, name), "wb") as fh:
                fh.write(data)
    elif cmd == "check":
        bad = [n for n, d in files.items() if not os.path.exists(os.path.join(OUT, n)) or open(os.path.join(OUT, n), "rb").read() != d]
        if bad:
            print("differs:", ", ".join(bad))
            sys.exit(1)
        print(f"ok: {len(files)} files")
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == "__main__":
    main()
