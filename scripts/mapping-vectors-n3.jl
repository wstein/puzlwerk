#!/usr/bin/env julia
#
# Mapping vectors, step 2 of specs/006-shared-model/plan.md, part 1 (N=3):
# Orbit64 V2 picture facelets (F4) -> wire-v1 `puzlwerk.state`, canonical bytes and hash.
#
#   julia scripts/mapping-vectors-n3.jl generate   write test/fixtures/mapping/n3-picture-wire.txt and .provenance
#   julia scripts/mapping-vectors-n3.jl check      regenerate in memory and compare with the committed files
#
# Julia standard library only. Independent of the ReScript core: the state is read off the facelet
# letters by integer arithmetic, from the frame rules of ADR 0008 and the face-up table (F1).
# The solved row of F4 defines which sticker is home on which facelet, so no slot table is needed.
# Direction here: facelets -> state. test/mapping-vectors.test.mjs goes the other way (state -> facelets).
using SHA

const ROOT = dirname(@__DIR__)
const F4 = joinpath(ROOT, "test", "fixtures", "conformance", "f4-3x3-picture.txt")
const DEF3 = joinpath(ROOT, "test", "fixtures", "wire", "definition-3.json")
const OUTDIR = joinpath(ROOT, "test", "fixtures", "mapping")
const OUT = joinpath(OUTDIR, "n3-picture-wire.txt")
const PROV = joinpath(OUTDIR, "n3-picture-wire.provenance")
const SELF = "scripts/mapping-vectors-n3.jl"
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

# Face-up table: faces U R F D L B, outward normal and the direction toward row 0.
const FACES = "URFDLB"
const NORMAL = [(0, 1, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0), (-1, 0, 0), (0, 0, -1)]
const UP = [(0, 0, -1), (0, 1, 0), (0, 1, 0), (0, 0, 1), (0, 1, 0), (0, 1, 0)]

cross(a, b) = (a[2] * b[3] - a[3] * b[2], a[3] * b[1] - a[1] * b[3], a[1] * b[2] - a[2] * b[1])
dot(a, b) = a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
add(a, b) = (a[1] + b[1], a[2] + b[2], a[3] + b[3])
scale(k, a) = (k * a[1], k * a[2], k * a[3])
neg(a) = scale(-1, a)

"Doubled slot coordinates of facelet f = 9 face + 3 row + col: right = up x normal, row 0 toward up."
function slot(f)
    face, rest = divrem(f, 9)
    row, col = divrem(rest, 3)
    right = cross(UP[face+1], NORMAL[face+1])
    add(add(scale(2, NORMAL[face+1]), scale(2 * (col - 1), right)), scale(2 * (1 - row), UP[face+1]))
end

facelet_class(f) = begin
    row, col = divrem(f % 9, 3)
    (row == 1 && col == 1) ? :center : ((row == 1 || col == 1) ? :midge : :corner)
end

"Clockwise quarter turns seen from outside about the unit axis m: v -> m (m.v) - m x v."
turn_clockwise(m, v) = add(scale(dot(m, v), m), neg(cross(m, v)))

"The rotation (row-major, nine integers) with O.a1 = b1, O.a2 = b2; a1, a2 orthogonal unit axis vectors."
function rotation(a1, a2, b1, b2)
    a = (a1, a2, cross(a1, a2))
    b = (b1, b2, cross(b1, b2))
    # O = sum_k b_k a_k^T, because the a_k are an orthonormal basis
    [sum(b[k][i] * a[k][j] for k in 1:3) for i in 1:3 for j in 1:3]
end

function parse_rows(path)
    rows = NamedTuple[]
    for line in eachline(path)
        (isempty(line) || startswith(line, "#")) && continue
        entry, moves, facelets, token, canonical = split(line, '|'; limit = 5)
        push!(rows, (entry = entry, moves = moves, facelets = facelets, token = token, canonical = canonical))
    end
    rows
end

squeeze(s) = replace(s, " " => "")
value(c) = findfirst(==(c), ALPHABET) - 1

"home[(class, value)] = home facelet of that sticker, from the solved row of entry 4."
function home_table(rows)
    solved = only(r for r in rows if r.entry == "4" && r.moves == "")
    s = squeeze(solved.facelets)
    @assert length(s) == 54
    Dict((facelet_class(f), value(s[f+1])) => f for f in 0:53)
end

"Home slot -> piece ID, read from the wire definition (the `home` and `id` keys of each piece)."
function piece_ids()
    text = read(DEF3, String)
    ids = Dict{NTuple{3,Int},String}()
    for m in eachmatch(r"\"home\":\[(-?\d+),(-?\d+),(-?\d+)\],\"id\":\"([A-Z]+)\"", text)
        ids[(parse(Int, m[1]), parse(Int, m[2]), parse(Int, m[3]))] = m[4]
    end
    @assert length(ids) == 26
    ids
end

"Wire-v1 state of a facelet string, as canonical JSON."
function state_of(facelets, home, ids)
    s = squeeze(facelets)
    @assert length(s) == 54
    stickers = Dict{String,Vector{NamedTuple}}()
    for f in 0:53
        cls = facelet_class(f)
        v = value(s[f+1])
        hf = cls == :center ? 9 * (v ÷ 4) + 4 : home[(cls, v)]
        piece = ids[slot(hf)]
        push!(get!(stickers, piece, NamedTuple[]), (
            home_face = hf ÷ 9, now_face = f ÷ 9, position = slot(f),
            twist = cls == :center ? v % 4 : 0, center = cls == :center))
    end
    @assert length(stickers) == 26
    poses = Tuple{String,NTuple{3,Int},Vector{Int}}[]
    for piece in sort(collect(keys(stickers)))
        st = stickers[piece]
        @assert all(x -> x.position == st[1].position, st) "$piece: stickers on different slots"
        if st[1].center
            @assert length(st) == 1
            x = st[1]
            n, u0 = NORMAL[x.home_face+1], UP[x.home_face+1]
            m = NORMAL[x.now_face+1]
            w = UP[x.now_face+1]
            for _ in 1:x.twist
                w = turn_clockwise(m, w)
            end
            o = rotation(n, u0, m, w)
        else
            @assert length(st) in (2, 3)
            n1, n2 = NORMAL[st[1].home_face+1], NORMAL[st[2].home_face+1]
            o = rotation(n1, n2, NORMAL[st[1].now_face+1], NORMAL[st[2].now_face+1])
            for x in st  # a corner's third sticker must agree
                got = Tuple(o[3*(i-1)+j] for i in 1:3 for j in 1:3)
                hn = NORMAL[x.home_face+1]
                img = (sum(o[j] * hn[j] for j in 1:3), sum(o[3+j] * hn[j] for j in 1:3), sum(o[6+j] * hn[j] for j in 1:3))
                @assert img == NORMAL[x.now_face+1] "$piece: inconsistent stickers"
            end
        end
        home_slot = only(k for (k, v) in ids if v == piece)
        img = Tuple(sum(o[3*(i-1)+j] * home_slot[j] for j in 1:3) for i in 1:3)
        @assert img == st[1].position "$piece: position rule"
        push!(poses, (piece, st[1].position, o))
    end
    items = ["{\"orientation\":[" * join(o, ",") * "],\"pieceId\":\"$p\",\"position\":[" * join(pos, ",") * "]}" for (p, pos, o) in poses]
    "{\"definitionId\":\"cube3\",\"poses\":[" * join(items, ",") * "],\"revision\":1,\"schema\":\"puzlwerk.state\"}"
end

sha(bytes) = bytes2hex(sha256(bytes))

function build()
    rows = parse_rows(F4)
    home = home_table(rows)
    ids = piece_ids()
    out = String[]
    push!(out, "# Mapping vectors N=3: Orbit64 V2 picture facelets (rows of F4) to wire-v1 puzlwerk.state.")
    push!(out, "# Row: registry entry | moves | column | token | facelets | sha256 of the canonical state bytes | canonical state JSON.")
    push!(out, "# Column `facelets` is the facelet string of the F4 row, `canonical` its canonical facelets (rows where F4 has them).")
    push!(out, "# The token is the Orbit64 V2 token of the F4 row, carried unchanged; it is not decoded here (part 2).")
    push!(out, "# Definition: test/fixtures/wire/definition-3.json (id cube3). Regenerate with $SELF; do not edit by hand.")
    for r in rows, (column, f) in (("facelets", r.facelets), ("canonical", r.canonical))
        isempty(f) && continue
        json = state_of(f, home, ids)
        push!(out, join([r.entry, r.moves, column, r.token, f, "sha256:" * sha(json), json], "|"))
    end
    join(out, "\n") * "\n"
end

function provenance(output)
    c = "5c5d3025241a4588c59f084af46173d4178ffed1"
    join([
        "# Origin of test/fixtures/mapping/n3-picture-wire.txt. Checked by test/mapping-vectors.test.mjs and by `julia $SELF check`.",
        "source_repository=https://github.com/wstein/puzlwerk",
        "input_path=test/fixtures/conformance/f4-3x3-picture.txt",
        "input_sha256=" * sha(read(F4)),
        "input_path=test/fixtures/wire/definition-3.json",
        "input_sha256=" * sha(read(DEF3)),
        "origin_repository=https://github.com/wstein/cubacle",
        "origin_commit=$c",
        "origin_note=facelet rows are the F4 copy of Cubacle tests/fixtures/orbit64_v2_picture_facelets.txt, from flix-orbit64 test/TestV2FaceletPictureData.flix at a046e34adcdc212a69ce3dcc24b2e47b7fabfbe5 (see test/fixtures/CONFORMANCE-NOTICE.md)",
        "output_sha256=" * sha(output),
        "license=AGPL-3.0-or-later (derived from the Cubacle copy); the Orbit64 vectors are Apache-2.0 at the origin (flix-orbit64, Werner Stein)",
        "generator=$SELF",
        "regenerate=julia $SELF check",
    ], "\n") * "\n"
end

function main(args)
    mode = isempty(args) ? "" : args[1]
    output = build()
    prov = provenance(output)
    if mode == "generate"
        mkpath(OUTDIR)
        write(OUT, output)
        write(PROV, prov)
        println("wrote $(OUT) and $(PROV)")
    elseif mode == "check"
        ok = read(OUT, String) == output && read(PROV, String) == prov
        println(ok ? "ok" : "differs")
        exit(ok ? 0 : 1)
    else
        println(stderr, "usage: julia $SELF generate|check")
        exit(2)
    end
end

main(ARGS)
