#!/usr/bin/env python3
"""Generate and check the core pose conformance fixtures of ADR 0008 (F1-F7).

  generate --flix DIR --cubacle DIR   write test/fixtures/conformance/*
  check    --flix DIR --cubacle DIR   regenerate in memory, compare the bytes
                                      with the committed files, and check the
                                      recorded input hashes against the sources
  provenance                          offline: the committed outputs match the
                                      SHA-256 recorded in their provenance files

DIR is a git checkout of wstein/flix-orbit64 and of wstein/cubacle. Inputs are
read with `git show <pinned commit>:<path>`, so the working tree state of the
checkouts does not matter. Python standard library only; run it as
`python3 -I scripts/conformance-fixtures.py ...`.

The fixtures are derived here by integer arithmetic, independent of the core
implementation, from the frame and move rules of the data model and from the
Orbit64 vectors. Nothing is edited by hand.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "test", "fixtures", "conformance")
SELF = "scripts/conformance-fixtures.py"

PUZLWERK_URL = "https://github.com/wstein/puzlwerk"
PUZLWERK_COMMIT = "b791c344dc689433c01833376e35307f72711e06"
FLIX_URL = "https://github.com/wstein/flix-orbit64"
FLIX_COMMIT = "a046e34adcdc212a69ce3dcc24b2e47b7fabfbe5"
CUBACLE_URL = "https://github.com/wstein/cubacle"
CUBACLE_COMMIT = "5c5d3025241a4588c59f084af46173d4178ffed1"
CUBACLE_VECTORS = "tests/fixtures/orbit64_v2_picture_facelets.txt"
CUBACLE_PROVENANCE = "tests/fixtures/orbit64_v2_picture_facelets.provenance"

FACES = "URFDLB"
NORMAL = {"U": (0, 1, 0), "R": (1, 0, 0), "F": (0, 0, 1), "D": (0, -1, 0), "L": (-1, 0, 0), "B": (0, 0, -1)}
# ADR 0002 / data model "Frames and integer coordinates": up vector per face.
UP = {"F": (0, 1, 0), "B": (0, 1, 0), "R": (0, 1, 0), "L": (0, 1, 0), "U": (0, 0, -1), "D": (0, 0, 1)}
ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"


# ---- integer linear algebra ------------------------------------------------
def mv(m, v):
    return tuple(sum(m[i][j] * v[j] for j in range(3)) for i in range(3))


def mm(a, b):
    return tuple(tuple(sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)) for i in range(3))


def tr(m):
    return tuple(tuple(m[j][i] for j in range(3)) for i in range(3))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def det(m):
    return sum(m[0][j] * cross(m[1], m[2])[j] for j in range(3))


def flat(m):
    return [m[i][j] for i in range(3) for j in range(3)]


IDENT = ((1, 0, 0), (0, 1, 0), (0, 0, 1))


def positive_quarter(axis):
    """Right-hand +90 degrees about the positive axis (data model, Moves)."""
    images = {
        0: ((1, 0, 0), (0, 0, 1), (0, -1, 0)),  # columns: e0->e0, e1->e2, e2->-e1
        1: ((0, 0, -1), (0, 1, 0), (1, 0, 0)),
        2: ((0, 1, 0), (-1, 0, 0), (0, 0, 1)),
    }[axis]
    # images are the columns of the matrix
    return tr(images)


def power(m, k):
    k %= 4
    out = IDENT
    for _ in range(k):
        out = mm(m, out)
    return out


def rotation(axis, turns):
    return power(positive_quarter(axis), turns)


def clockwise_about(n, v):
    """One clockwise quarter turn of v seen from outside along the outward normal n."""
    c = cross(n, v)
    return (-c[0], -c[1], -c[2])


def classify(m):
    t = m[0][0] + m[1][1] + m[2][2]
    return {3: "identity", -1: "half", 1: "quarter", 0: "third"}[t]


# ---- output formatting -----------------------------------------------------
def dump(obj, indent=0):
    pad = "  " * indent
    if isinstance(obj, dict):
        items = [f"{pad}  {json.dumps(k)}: {dump(v, indent + 1)}" for k, v in obj.items()]
        return "{\n" + ",\n".join(items) + "\n" + pad + "}"
    if isinstance(obj, list):
        if all(not isinstance(x, (dict, list)) for x in obj):
            return "[" + ", ".join(json.dumps(x) for x in obj) + "]"
        items = [f"{pad}  {dump(v, indent + 1)}" for v in obj]
        return "[\n" + ",\n".join(items) + "\n" + pad + "]"
    return json.dumps(obj)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git_show(repo, commit, path):
    return subprocess.run(["git", "-C", repo, "show", f"{commit}:{path}"], check=True, capture_output=True).stdout


# ---- sources ---------------------------------------------------------------
def frame_faces(frame_flix):
    """Rank -> physical faces in the slots U R F D L B, from Orbit64.Frame.facesAt."""
    table = {}
    body = frame_flix.split("def facesAt", 1)[1]
    for line in body.splitlines():
        m = re.match(r"\s*case\s+(\d+|_)\s*=>\s*(.*)", line)
        if not m:
            continue
        rank = 23 if m.group(1) == "_" else int(m.group(1))
        table[rank] = "".join(re.findall(r"Face\.([URFDLB])", m.group(2)))
    assert sorted(table) == list(range(24)) and all(len(v) == 6 for v in table.values())
    return table


def frame_matrix(slots):
    """O with O.n(face) = n(slot) for the face that occupies each reference slot."""
    cols = [None, None, None]
    for slot, face in zip(FACES, slots):
        if face in "RUF":
            cols[NORMAL[face].index(1)] = NORMAL[slot]
    o = tr(tuple(cols))
    assert det(o) == 1
    for slot, face in zip(FACES, slots):
        assert mv(o, NORMAL[face]) == NORMAL[slot]
    return o


def wire_turns(rank):
    if rank < 16:
        return rank // 4, 0, rank % 4
    return 0, (1 if rank < 20 else 3), rank % 4


def wire_matrix(rank):
    x, z, y = wire_turns(rank)
    # clockwise quarter turns are -1 about the positive axis
    return mm(rotation(1, -y), mm(rotation(2, -z), rotation(0, -x)))


def f1(frame_flix):
    table = frame_faces(frame_flix)
    faces = []
    for f in FACES:
        n, u = NORMAL[f], UP[f]
        faces.append({"face": f, "normal": list(n), "up": list(u), "right": list(cross(u, n))})
    rotations = []
    for rank in range(24):
        o = frame_matrix(table[rank])
        assert o == wire_matrix(rank), rank
        x, z, y = wire_turns(rank)
        rotations.append({
            "rank": rank,
            "turns": {"x": x, "z": z, "y": y},
            "slots": " ".join(table[rank]),
            "class": classify(o),
            "o": flat(o),
            "bodyFrame": flat(tr(o)),
            "oEqualsTransposed": o == tr(o),
        })
    return dump({
        "fixture": "F1",
        "title": "Whole-cube rotations as SO(3,Z), the transposed Cubistry v1 BodyFrame and the Orbit64 frame rank",
        "convention": {
            "frame": "+X right, +Y up, +Z front, right-handed",
            "o": "row-major nine integers; column j is O.e_j; a piece starts with O=I, hence p=O.home",
            "bodyFrame": "Cubistry v1 BodyFrame: the same rotation stored as the transposed matrix, row-major",
            "slots": "the physical faces occupying the reference slots U R F D L B (Orbit64 frame rank)",
            "turns": "clockwise quarter turns applied as x, then z, then y (rotation about the positive axis by -1)",
            "class": "identity, half (180 degrees), quarter (90 degrees), third (120 degrees about a corner diagonal)",
        },
        "faces": faces,
        "rotations": rotations,
    }) + "\n"


def f2():
    matrices = {a: flat(positive_quarter(i)) for i, a in enumerate("XYZ")}
    layers = {"2": {"outer": [-1, 1]}, "3": {"outer": [-2, 2], "all": [-2, 0, 2]}}
    moves = []
    base = {  # name: axis, side (+1 positive outer layer, -1 negative outer layer), turns about positive axis
        "R": (0, 1, -1), "L": (0, -1, 1), "U": (1, 1, -1), "D": (1, -1, 1), "F": (2, 1, -1), "B": (2, -1, 1),
    }
    for name, (axis, side, turns) in base.items():
        for suffix, mult in (("", 1), ("2", 2), ("'", -1)):
            t = turns * mult
            t = 2 if t % 4 == 2 else t
            moves.append({
                "move": name + suffix, "axis": "XYZ"[axis], "turns": t,
                "layers": {"2": [side], "3": [2 * side]},
                "rotation": flat(rotation(axis, t)),
            })
    for name, axis in (("x", 0), ("y", 1), ("z", 2)):
        for suffix, t in (("", -1), ("2", 2), ("'", 1)):
            moves.append({
                "move": name + suffix, "axis": "XYZ"[axis], "turns": t,
                "layers": {"2": [-1, 1], "3": [-2, 0, 2]},
                "rotation": flat(rotation(axis, t)),
            })
    examples = [
        {"text": "data model: +Z, +1 maps (x,y,z) to (-y,x,z); the N=2 piece at (1,-1,1) reaches (1,1,1)",
         "axis": "Z", "turns": 1, "from": [1, -1, 1], "to": list(mv(rotation(2, 1), (1, -1, 1)))},
        {"text": "data model: F sends a front-top-right slot to front-bottom-right",
         "axis": "Z", "turns": -1, "from": [1, 1, 1], "to": list(mv(rotation(2, -1), (1, 1, 1)))},
        {"text": "R is X with layer N-1 and turns -1: the front-bottom-right slot reaches front-top-right",
         "axis": "X", "turns": -1, "from": [1, -1, 1], "to": list(mv(rotation(0, -1), (1, -1, 1)))},
    ]
    assert examples[0]["to"] == [1, 1, 1] and examples[1]["to"] == [1, -1, 1] and examples[2]["to"] == [1, 1, 1]
    return dump({
        "fixture": "F2",
        "title": "Move signs: axis, layer coordinates and signed quarter turns",
        "convention": {
            "positive": "right-hand rotation about the positive axis; 180 degrees is +2",
            "outwardClockwise": "F, R, U are -1 on the positive outer layer; B, L, D are +1 on the negative outer layer",
            "rotations": "x, y, z select all layers with the sign of R, U, F (-1); pinned by the Orbit64 vectors in F4",
            "layers": "doubled centered integer coordinates: N=2 uses -1, 1; N=3 uses -2, 0, 2",
            "poseUpdate": "selected pieces: (p, O) becomes (R.p, R.O)",
        },
        "positiveQuarter": matrices,
        "moves": moves,
        "examples": examples,
    }) + "\n"


# ---- F3: 2x2 Cubistry v1 ---------------------------------------------------
def f3(print_json):
    doc = json.loads(print_json)
    assert doc["print"]["topology"] == {"kind": "cube", "size": 2}
    homes = {c["id"]: tuple(c["position"]) for c in doc["print"]["cubies"]}
    base = {"R": (0, 1, -1), "L": (0, -1, 1), "U": (1, 1, -1), "D": (1, -1, 1), "F": (2, 1, -1), "B": (2, -1, 1)}
    witnesses = []
    for w in doc["witnesses"]:
        state = {i: [homes[i], IDENT] for i in homes}  # position, O
        for token in w["word"].split():
            m = re.fullmatch(r"([URFDLB])(2|')?", token)
            assert m, token
            axis, side, turns = base[m.group(1)]
            t = turns * {None: 1, "2": 2, "'": -1}[m.group(2)]
            r = rotation(axis, t)
            for i, (p, o) in state.items():
                if p[axis] == side:
                    state[i] = [mv(r, p), mm(r, o)]
        cubies = []
        for i in sorted(state):
            p, o = state[i]
            assert mv(o, homes[i]) == p and det(o) == 1
            cubies.append({
                "id": i, "home": list(homes[i]), "position": list(p),
                "bodyFrame": [list(row) for row in tr(o)],
                "o": flat(o),
                "oEqualsTransposed": o == tr(o),
            })
        witnesses.append({"value": w["value"], "word": w["word"], "cubies": cubies})
    return dump({
        "fixture": "F3",
        "title": "Cubistry v1 2x2 witnesses: BodyFrame cubies mapped to core poses",
        "convention": {
            "bodyFrame": "cubie.orientation of cubistry.state: rows are the images of the piece axes; the core O is its transposed matrix",
            "n2": "N=2 positions are -1 and 1 in both models, no scaling",
            "check": "position = O.home for every cubie",
        },
        "witnesses": witnesses,
    }) + "\n"


# ---- F4, F5: Orbit64 picture vectors --------------------------------------
def picture_rows(vectors, ids):
    rows = []
    for line in vectors.decode().splitlines():
        if not line or line.startswith("#"):
            continue
        if int(line.split("|", 1)[0]) in ids:
            rows.append(line)
    return rows


HEADER = (
    "# Orbit64 V2 picture facelet vectors: registry entry id | moves | facelets | token | canonical facelets.\n"
    "# Rows copied unchanged from {path} of https://github.com/wstein/cubacle (AGPL-3.0-or-later),\n"
    "# which copies them from test/TestV2FaceletPictureData.flix of https://github.com/wstein/flix-orbit64\n"
    "# (Apache-2.0, Werner Stein). Facelets are six blocks in the order U R F D L B, nine letters each,\n"
    "# read row-major from the face-up reference of the face. The canonical column is empty when the\n"
    "# facelets are already canonical. {what}\n"
    "# Regenerate with scripts/conformance-fixtures.py; do not edit by hand.\n"
)


def f4_rows(vectors):
    rows = picture_rows(vectors, {4, 5})
    assert len(rows) == 82
    return HEADER.format(
        path=CUBACLE_VECTORS,
        what="Entries 4 (3x3 picture canonical) and 5 (3x3 picture framed): 82 rows, including the x, y and z rows.",
    ) + "\n".join(rows) + "\n"


def f5_rows(vectors):
    rows = picture_rows(vectors, {8, 9, 12, 13})
    assert len(rows) == 18
    return HEADER.format(
        path=CUBACLE_VECTORS,
        what="Entries 8 and 9 (4x4 picture canonical, framed; 8 rows) and 12 and 13 (5x5; 10 rows). "
             "Smoke test only: sizes 4-7 are not certified (ADR 0008).",
    ) + "\n".join(rows) + "\n"


def blocks(facelets):
    parts = facelets.split(" ")
    assert len(parts) == 6 and all(len(p) == 9 for p in parts)
    return dict(zip(FACES, parts))


def cw_block(b):
    return "".join(b[(2 - j) * 3 + i] for i in range(3) for j in range(3))


def center_twist(face, o):
    """Clockwise quarter turns from the reference of the current face to O.u0."""
    slot = next(s for s in FACES if NORMAL[s] == mv(o, NORMAL[face]))
    target = mv(o, UP[face])
    v = UP[slot]
    for r in range(4):
        if v == target:
            return slot, r
        v = clockwise_about(NORMAL[slot], v)
    raise AssertionError("O.u0 is not in the tangent plane")


WORDS = ["x", "x2", "x'", "y", "y2", "y'", "z", "z2", "z'"]


def word_matrix(word):
    axis = "xyz".index(word[0])
    t = {"": -1, "2": 2, "'": 1}[word[1:]]
    return rotation(axis, t)


def f4_twists(vectors, frame_table):
    rows = [r.split("|") for r in picture_rows(vectors, {5})]
    framed = {r[1]: r for r in rows}
    solved = blocks(framed[""][2])
    out = []
    for word in WORDS:
        o = word_matrix(word)
        row = framed[word]
        got = blocks(row[2])
        rank = ALPHABET.index(row[3][-1])
        assert frame_matrix(frame_table[rank]) == o, word
        centers = []
        for face in FACES:
            slot, r = center_twist(face, o)
            # the old block of `face` now sits at `slot`, turned clockwise r times
            b = solved[face]
            for _ in range(r):
                b = cw_block(b)
            letter = ALPHABET[ALPHABET.index(solved[face][4]) + r]
            assert got[slot] == b[:4] + letter + b[5:], (word, face, slot, r)
            centers.append({"face": face, "slot": slot, "twist": r, "centerLetter": letter})
        out.append({
            "word": word, "frameRank": rank, "o": flat(o), "bodyFrame": flat(tr(o)),
            "framedToken": row[3], "centers": centers,
        })
    return dump({
        "fixture": "F4",
        "title": "Whole-cube rotations x, y, z: frame rank and center twist derived from O and checked against the framed picture rows",
        "convention": {
            "twist": "clockwise quarter turns, seen from outside, from the reference direction of the center's current face to O.u0 (u0: home reference of the center)",
            "centers": "face: home face of the center; slot: face it occupies after the rotation",
            "check": "rows of entry 5: the block at the slot equals the home block of the face turned clockwise by the twist; its center cell shows the home center letter advanced by the twist (U A-D, R E-H, F I-L, D M-P, L Q-T, B U-X)",
        },
        "rotations": out,
    }) + "\n"


# ---- F6, F7 ----------------------------------------------------------------
def quarter_turns_pass(normal, target_up, up, group):
    v = target_up
    for k in range(4):
        if k in group and v == up:
            return True
        v = clockwise_about(normal, v)
    return False


def f6():
    groups = {"C1": [0], "C2": [0, 2], "C4": [0, 1, 2, 3]}
    periods = {"C1": 4, "C2": 2, "C4": 1}
    cases = [
        ("up equals the target up", (0, 0, 1), (0, 1, 0), (0, 1, 0)),
        ("one quarter turn off (data model example)", (0, 0, 1), (0, 1, 0), (1, 0, 0)),
        ("half turn off (data model example)", (0, 0, 1), (0, 1, 0), (0, -1, 0)),
        ("three quarter turns off", (0, 0, 1), (0, 1, 0), (-1, 0, 0)),
        ("normal tilted away from +Z", (1, 0, 0), (0, 1, 0), (0, 1, 0)),
    ]
    out = []
    for text, n, tu, u in cases:
        if n != (0, 0, 1):
            result = {k: False for k in groups}
        else:
            result = {k: quarter_turns_pass(n, tu, u, g) for k, g in groups.items()}
        out.append({"text": text, "normal": list(n), "targetNormal": [0, 0, 1], "targetUp": list(tu), "up": list(u), "pass": result})
    assert out[1]["pass"] == {"C1": False, "C2": False, "C4": True}
    assert out[2]["pass"] == {"C1": False, "C2": True, "C4": True}
    return dump({
        "fixture": "F6",
        "title": "Sticker symmetry groups C1/C2/C4 against solver goal periods 4/2/1",
        "convention": {
            "groups": "quarter turns about the target world normal that count as the same optical goal",
            "period": "solver-3x3-picture symmetry entry: 4 requires the exact original up, 2 permits a half turn, 1 ignores the rotation",
            "trap": "C1 (360 degree motif symmetry) is period 4, never period 1; C4 (90 degree motif symmetry) is period 1",
            "cubistry": "equivalentQuarterTurns lists the allowed quarter turns: [0], [0, 2], [0, 1, 2, 3]",
        },
        "terms": [
            {"group": k, "quarterTurns": groups[k], "goalPeriod": periods[k], "equivalentQuarterTurns": groups[k]}
            for k in groups
        ],
        "cases": out,
    }) + "\n"


def f7():
    facelet_order, center_order = "URFDLB", "ULFRBD"
    sample = {"U": 0, "R": 1, "F": 2, "D": 3, "L": 0, "B": 1}
    assert facelet_order != center_order
    return dump({
        "fixture": "F7",
        "title": "Center order: facelets are URFDLB, center orientations and goal periods are ULFRBD",
        "faceletOrder": facelet_order,
        "centerOrder": center_order,
        "centerIndexOfFaceletIndex": [center_order.index(f) for f in facelet_order],
        "faceletIndexOfCenterIndex": [facelet_order.index(f) for f in center_order],
        "sample": {
            "byFace": sample,
            "inCenterOrder": [sample[f] for f in center_order],
            "inFaceletOrder": [sample[f] for f in facelet_order],
            "centerOrderReadAsFaceletOrder": {f: sample[center_order[i]] for i, f in enumerate(facelet_order)},
        },
    }) + "\n"


# ---- provenance and driver -------------------------------------------------
def provenance(name, out_text, repo_url, commit, inputs, license_, note, extra=()):
    lines = [
        f"# Origin of test/fixtures/conformance/{name}. Checked by test/conformance-fixtures.test.mjs",
        f"# and by `python3 -I {SELF} provenance|check`.",
        f"# {note}",
        f"source_repository={repo_url}",
        f"source_commit={commit}",
    ]
    lines += list(extra)
    for path, data in inputs:
        lines.append(f"input_path={path}")
        lines.append(f"input_sha256={sha(data)}")
    lines.append(f"output_sha256={sha(out_text.encode())}")
    lines.append(f"license={license_}")
    lines.append(f"generator={SELF}")
    lines.append(f"regenerate=python3 -I {SELF} check --flix <flix-orbit64 checkout> --cubacle <cubacle checkout>")
    return "\n".join(lines) + "\n"


def build(flix, cubacle):
    local = lambda p: git_show(ROOT, PUZLWERK_COMMIT, p)
    frame_src = git_show(flix, FLIX_COMMIT, "src/Orbit64/Frame.flix")
    vectors = git_show(cubacle, CUBACLE_COMMIT, CUBACLE_VECTORS)
    cub_prov = git_show(cubacle, CUBACLE_COMMIT, CUBACLE_PROVENANCE).decode()
    flix_vec_sha = re.search(r"^input_sha256=(\w+)", cub_prov, re.M).group(1)
    flix_vec_commit = re.search(r"^flix_commit=(\w+)", cub_prov, re.M).group(1)
    assert flix_vec_commit == FLIX_COMMIT
    data_model = local("specs/001-core-foundation/data-model.md")
    cubistry = local("test/fixtures/cubistry-42-43.json")
    solver_doc = local("docs/knowledge-base/solver-3x3-picture.md")
    centers_api = local("packages/solver-3x3-picture/src/index.d.ts")
    frame_table = frame_faces(frame_src.decode())
    vec_text = vectors.decode()
    out = {}

    def add(name, text, prov):
        out[name] = text
        out[name.rsplit(".", 1)[0] + ".provenance"] = prov

    t = f1(frame_src.decode())
    add("f1-frames.json", t, provenance(
        "f1-frames.json", t, FLIX_URL, FLIX_COMMIT, [("src/Orbit64/Frame.flix", frame_src)], "Apache-2.0",
        "Frame rank table of the Orbit64 reference; faces, up and right from specs/001-core-foundation/data-model.md (Frames and integer coordinates)."))
    t = f2()
    add("f2-move-signs.json", t, provenance(
        "f2-move-signs.json", t, PUZLWERK_URL, PUZLWERK_COMMIT, [("specs/001-core-foundation/data-model.md", data_model)], "AGPL-3.0-or-later",
        "Derived from the Moves section of the data model; x, y, z signs are pinned by f4-3x3-picture-rotations.json."))
    t = f3(cubistry)
    add("f3-2x2-v1.json", t, provenance(
        "f3-2x2-v1.json", t, PUZLWERK_URL, PUZLWERK_COMMIT, [("test/fixtures/cubistry-42-43.json", cubistry)], "AGPL-3.0-or-later",
        "Replay of the two witnesses of the pinned Cubistry print (see that file for its own source revision)."))
    t = f4_rows(vectors)
    flix_extra = [f"upstream_repository={FLIX_URL}", f"upstream_commit={flix_vec_commit}",
                  "upstream_input_path=test/TestV2FaceletPictureData.flix", f"upstream_input_sha256={flix_vec_sha}"]
    add("f4-3x3-picture.txt", t, provenance(
        "f4-3x3-picture.txt", t, CUBACLE_URL, CUBACLE_COMMIT, [(CUBACLE_VECTORS, vectors)], "Apache-2.0 (vectors), AGPL-3.0-or-later (copy)",
        "82 of the 174 rows: entries 4 and 5.", flix_extra))
    t = f4_twists(vectors, frame_table)
    add("f4-3x3-picture-rotations.json", t, provenance(
        "f4-3x3-picture-rotations.json", t, CUBACLE_URL, CUBACLE_COMMIT,
        [(CUBACLE_VECTORS, vectors), ("src/Orbit64/Frame.flix (flix-orbit64 @ upstream_commit)", frame_src)],
        "Apache-2.0 (vectors), AGPL-3.0-or-later (copy)",
        "Derived from the x, y, z rows of entry 5 and the frame table; the generator asserts every block.", flix_extra))
    t = f5_rows(vectors)
    add("f5-nxn-smoke.txt", t, provenance(
        "f5-nxn-smoke.txt", t, CUBACLE_URL, CUBACLE_COMMIT, [(CUBACLE_VECTORS, vectors)], "Apache-2.0 (vectors), AGPL-3.0-or-later (copy)",
        "18 of the 174 rows: entries 8, 9, 12 and 13. Not certified.", flix_extra))
    t = f6()
    add("f6-symmetry.json", t, provenance(
        "f6-symmetry.json", t, PUZLWERK_URL, PUZLWERK_COMMIT,
        [("specs/001-core-foundation/data-model.md", data_model), ("docs/knowledge-base/solver-3x3-picture.md", solver_doc)],
        "AGPL-3.0-or-later", "Terms from the data model (Goals and symmetry) and the solver note (symmetry)."))
    t = f7()
    add("f7-center-order.json", t, provenance(
        "f7-center-order.json", t, PUZLWERK_URL, PUZLWERK_COMMIT,
        [("packages/solver-3x3-picture/src/index.d.ts", centers_api), ("docs/knowledge-base/solver-3x3-picture.md", solver_doc)],
        "AGPL-3.0-or-later", "Orders from the solver API: facelets URFDLB, centerOrientations and symmetry ULFRBD."))
    return out


def read_recorded(path):
    rec = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or "=" not in line:
                continue
            k, v = line.rstrip("\n").split("=", 1)
            rec.setdefault(k, []).append(v)
    return rec


def cmd_provenance():
    names = sorted(n for n in os.listdir(OUT) if n.endswith(".provenance"))
    assert len(names) == 8, names
    for n in names:
        stem = n[: -len(".provenance")]
        rec = read_recorded(os.path.join(OUT, n))
        outs = [f for f in os.listdir(OUT) if f.rsplit(".", 1)[0] == stem and not f.endswith(".provenance")]
        assert len(outs) == 1, (n, outs)
        with open(os.path.join(OUT, outs[0]), "rb") as f:
            found = sha(f.read())
        assert rec["output_sha256"] == [found], f"{n}: output hash differs"
        assert len(rec["source_commit"][0]) == 40
        assert all(len(h) == 64 for h in rec["input_sha256"])
        print(f"ok {n}")


def cmd_generate(args, write):
    files = build(args.flix, args.cubacle)
    bad = 0
    for name, text in sorted(files.items()):
        path = os.path.join(OUT, name)
        if write:
            os.makedirs(OUT, exist_ok=True)
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(text)
            print(f"wrote {name}")
        else:
            with open(path, encoding="utf-8", newline="") as f:
                same = f.read() == text
            print(("ok " if same else "DIFFERS ") + name)
            bad += not same
    return 1 if bad else 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["generate", "check", "provenance"])
    p.add_argument("--flix")
    p.add_argument("--cubacle")
    a = p.parse_args()
    if a.command == "provenance":
        return cmd_provenance() or 0
    if not (a.flix and a.cubacle):
        p.error("--flix and --cubacle are required")
    return cmd_generate(a, a.command == "generate")


if __name__ == "__main__":
    sys.exit(main())
