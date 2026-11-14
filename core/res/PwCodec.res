type errorCode =
  | Syntax
  | TooLarge
  | TooDeep
  | DuplicateKey
  | NotInteger
  | NegativeZero
  | WrongType
  | MissingField
  | UnknownField
  | BadSchema
  | BadRevision
  | BadId
  | BadValue
  | DuplicateId
  | DuplicateSlot
  | PieceMismatch
  | DefinitionMismatch
  | BadSticker
  | BadOrientation
  | PositionRule

type error = {code: errorCode, path: string}

exception Bad(error)
let bad = (code, path) => throw(Bad({code, path}))

type sticker = {id: PwId.t, normal: PwShell.vec, up: PwShell.vec, color: option<PwId.t>}
type piece = {id: PwId.t, home: PwShell.slot, stickers: array<sticker>}
type movePolicy = OuterWide | Any
type definition = {
  id: PwId.t,
  size: PwShell.size,
  movePolicy: movePolicy,
  pieces: array<piece>,
}
type state = {definitionId: PwId.t, poses: array<PwPose.t>}

let definitionId = (d: definition) => d.id
let size = (d: definition) => d.size
let movePolicy = (d: definition) => d.movePolicy
let pieces = (d: definition) => d.pieces->Array.map(p => {...p, stickers: Array.copy(p.stickers)})

// ---- typed access to the parsed JSON ----------------------------------------------------------

let fromJsonCode = (c: PwJson.errorCode) =>
  switch c {
  | Syntax => Syntax
  | TooLarge => TooLarge
  | TooDeep => TooDeep
  | DuplicateKey => DuplicateKey
  | NotInteger => NotInteger
  | NegativeZero => NegativeZero
  }

let obj = (path, json, keys): array<(string, PwJson.t)> =>
  switch json {
  | PwJson.Obj(entries) =>
    entries->Array.forEach(((k, _)) =>
      if !(keys->Array.includes(k)) {
        bad(UnknownField, path ++ "." ++ k)
      }
    )
    entries
  | _ => bad(WrongType, path)
  }

let field = (entries, path, name) =>
  switch entries->Array.find(((k, _)) => k == name) {
  | Some((_, v)) => v
  | None => bad(MissingField, path ++ "." ++ name)
  }

let optField = (entries, name) =>
  entries->Array.find(((k, _)) => k == name)->Option.map(Pair.second)

let str = (path, json) =>
  switch json {
  | PwJson.Str(s) => s
  | _ => bad(WrongType, path)
  }

let num = (path, json) =>
  switch json {
  | PwJson.Num(n) => n
  | _ => bad(WrongType, path)
  }

let arr = (path, json) =>
  switch json {
  | PwJson.Arr(items) => items
  | _ => bad(WrongType, path)
  }

let id = (path, json) =>
  switch PwId.make(str(path, json)) {
  | Ok(v) => v
  | Error(_) => bad(BadId, path)
  }

let ints = (path, json, ~length) => {
  let items = arr(path, json)
  let values =
    items->Array.mapWithIndex((item, i) => num(path ++ "[" ++ Int.toString(i) ++ "]", item))
  if values->Array.length != length {
    bad(BadValue, path)
  }
  values
}

let vec = (path, json): PwShell.vec => {
  let v = ints(path, json, ~length=3)
  {x: v->Array.getUnsafe(0), y: v->Array.getUnsafe(1), z: v->Array.getUnsafe(2)}
}

let slotOf = (size, path, json) =>
  switch PwShell.makeSlot(size, vec(path, json)) {
  | Ok(s) => s
  | Error(_) => bad(BadValue, path)
  }

let header = (entries, path, schema) => {
  if str(path ++ ".schema", field(entries, path, "schema")) != schema {
    bad(BadSchema, path ++ ".schema")
  }
  switch field(entries, path, "revision") {
  | PwJson.Num(1) => ()
  | PwJson.Num(_) => bad(BadRevision, path ++ ".revision")
  | _ => bad(WrongType, path ++ ".revision")
  }
}

let vecJson = (v: PwShell.vec) => PwJson.Arr([Num(v.x), Num(v.y), Num(v.z)])
let byId = (a, b) => String.compare(PwId.toString(a), PwId.toString(b))

let parseText = text =>
  switch PwJson.parse(text) {
  | Ok(j) => j
  | Error({code, path}) => bad(fromJsonCode(code), path)
  }

let guard = f =>
  try Ok(f()) catch {
  | Bad(e) => Error(e)
  }

// ---- definition ---------------------------------------------------------------------------------

let isUnitAxis = (v: PwShell.vec) => abs(v.x) + abs(v.y) + abs(v.z) == 1

// Outward normals of the faces a slot exposes: one signed unit vector per coordinate at +-(N-1).
let exposed = (n, slot) => {
  let v = PwShell.toVec(slot)
  let top = n - 1
  let result = []
  if v.x == top || v.x == -top {
    result->Array.push(({x: v.x / top, y: 0, z: 0}: PwShell.vec))
  }
  if v.y == top || v.y == -top {
    result->Array.push(({x: 0, y: v.y / top, z: 0}: PwShell.vec))
  }
  if v.z == top || v.z == -top {
    result->Array.push(({x: 0, y: 0, z: v.z / top}: PwShell.vec))
  }
  result
}

let decodeDefinitionExn = text => {
  let root = "$"
  let entries = obj(
    root,
    parseText(text),
    ["schema", "revision", "id", "size", "convention", "movePolicy", "pieces"],
  )
  header(entries, root, "puzlwerk.definition")
  let defId = id("$.id", field(entries, root, "id"))
  let size = switch PwShell.makeSize(num("$.size", field(entries, root, "size"))) {
  | Ok(s) => s
  | Error(_) => bad(BadValue, "$.size")
  }
  let n = PwShell.sizeToInt(size)
  if str("$.convention", field(entries, root, "convention")) != "cube-shell-v1" {
    bad(BadValue, "$.convention")
  }
  let movePolicy = switch str("$.movePolicy", field(entries, root, "movePolicy")) {
  | "outer-wide" => OuterWide
  | "any" => Any
  | _ => bad(BadValue, "$.movePolicy")
  }
  let pieceIds = Map.make()
  let stickerIds = Map.make()
  let homes = Map.make()
  let pieces = arr("$.pieces", field(entries, root, "pieces"))->Array.mapWithIndex((pj, i) => {
    let pp = "$.pieces[" ++ Int.toString(i) ++ "]"
    let pe = obj(pp, pj, ["id", "home", "stickers"])
    let pid = id(pp ++ ".id", field(pe, pp, "id"))
    if pieceIds->Map.has(PwId.toString(pid)) {
      bad(DuplicateId, pp ++ ".id")
    }
    pieceIds->Map.set(PwId.toString(pid), true)
    let home = slotOf(size, pp ++ ".home", field(pe, pp, "home"))
    let homeKey = JSON.stringifyAny(PwShell.toVec(home))->Option.getOr("")
    if homes->Map.has(homeKey) {
      bad(DuplicateSlot, pp ++ ".home")
    }
    homes->Map.set(homeKey, true)
    let faces = exposed(n, home)
    let sp = pp ++ ".stickers"
    let seen = []
    let stickers = arr(sp, field(pe, pp, "stickers"))->Array.mapWithIndex((sj, j) => {
      let kp = sp ++ "[" ++ Int.toString(j) ++ "]"
      let se = obj(kp, sj, ["id", "normal", "up", "color"])
      let sid = id(kp ++ ".id", field(se, kp, "id"))
      if stickerIds->Map.has(PwId.toString(sid)) {
        bad(DuplicateId, kp ++ ".id")
      }
      stickerIds->Map.set(PwId.toString(sid), true)
      let normal = vec(kp ++ ".normal", field(se, kp, "normal"))
      if !(faces->Array.some(f => f == normal)) || seen->Array.some(f => f == normal) {
        bad(BadSticker, kp ++ ".normal")
      }
      seen->Array.push(normal)
      let up = vec(kp ++ ".up", field(se, kp, "up"))
      if !isUnitAxis(up) || up.x * normal.x + up.y * normal.y + up.z * normal.z != 0 {
        bad(BadSticker, kp ++ ".up")
      }
      let color = optField(se, "color")->Option.map(c => id(kp ++ ".color", c))
      {id: sid, normal, up, color}
    })
    if stickers->Array.length != faces->Array.length {
      bad(BadSticker, sp)
    }
    {id: pid, home, stickers: stickers->Array.toSorted((a, b) => byId(a.id, b.id))}
  })
  if pieces->Array.length != PwShell.slotCount(size) {
    bad(PieceMismatch, "$.pieces")
  }
  {id: defId, size, movePolicy, pieces: pieces->Array.toSorted((a, b) => byId(a.id, b.id))}
}

let decodeDefinition = text => guard(() => decodeDefinitionExn(text))

let definitionJson = (d: definition) => {
  let s = id => PwJson.Str(PwId.toString(id))
  PwJson.Obj([
    ("schema", Str("puzlwerk.definition")),
    ("revision", Num(1)),
    ("id", s(d.id)),
    ("size", Num(PwShell.sizeToInt(d.size))),
    ("convention", Str("cube-shell-v1")),
    ("movePolicy", Str(d.movePolicy == OuterWide ? "outer-wide" : "any")),
    (
      "pieces",
      Arr(
        d.pieces->Array.map(p => PwJson.Obj([
          ("id", s(p.id)),
          ("home", vecJson(PwShell.toVec(p.home))),
          (
            "stickers",
            Arr(
              p.stickers->Array.map(k => PwJson.Obj(
                Array.concat(
                  [("id", s(k.id)), ("normal", vecJson(k.normal)), ("up", vecJson(k.up))],
                  switch k.color {
                  | Some(c) => [("color", s(c))]
                  | None => []
                  },
                ),
              )),
            ),
          ),
        ])),
      ),
    ),
  ])
}

let encodeDefinition = d => PwJson.toCanonical(definitionJson(d))
let hashDefinition = d => "sha256:" ++ PwSha256.hex(encodeDefinition(d))

// ---- state --------------------------------------------------------------------------------------

let decodeStateExn = (definition: definition, text) => {
  let root = "$"
  let entries = obj(root, parseText(text), ["schema", "revision", "definitionId", "poses"])
  header(entries, root, "puzlwerk.state")
  let did = id("$.definitionId", field(entries, root, "definitionId"))
  if !PwId.equal(did, definition.id) {
    bad(DefinitionMismatch, "$.definitionId")
  }
  let homes = Map.make()
  definition.pieces->Array.forEach(p => homes->Map.set(PwId.toString(p.id), p.home))
  let seenIds = Map.make()
  let seenSlots = Map.make()
  let poses = arr("$.poses", field(entries, root, "poses"))->Array.mapWithIndex((pj, i) => {
    let pp = "$.poses[" ++ Int.toString(i) ++ "]"
    let pe = obj(pp, pj, ["pieceId", "position", "orientation"])
    let pid = id(pp ++ ".pieceId", field(pe, pp, "pieceId"))
    if seenIds->Map.has(PwId.toString(pid)) {
      bad(DuplicateId, pp ++ ".pieceId")
    }
    seenIds->Map.set(PwId.toString(pid), true)
    let home = switch homes->Map.get(PwId.toString(pid)) {
    | Some(h) => h
    | None => bad(PieceMismatch, pp ++ ".pieceId")
    }
    let position = slotOf(definition.size, pp ++ ".position", field(pe, pp, "position"))
    let orientation = switch PwOrientation.make(
      ints(pp ++ ".orientation", field(pe, pp, "orientation"), ~length=9),
    ) {
    | Ok(o) => o
    | Error(_) => bad(BadOrientation, pp ++ ".orientation")
    }
    let pose = PwPose.make(pid, position, orientation)
    if !PwPose.positionMatchesHome(pose, home) {
      bad(PositionRule, pp)
    }
    let slotKey = JSON.stringifyAny(PwShell.toVec(position))->Option.getOr("")
    if seenSlots->Map.has(slotKey) {
      bad(DuplicateSlot, pp ++ ".position")
    }
    seenSlots->Map.set(slotKey, true)
    pose
  })
  if poses->Array.length != definition.pieces->Array.length {
    bad(PieceMismatch, "$.poses")
  }
  {
    definitionId: did,
    poses: poses->Array.toSorted((a, b) => byId(PwPose.pieceId(a), PwPose.pieceId(b))),
  }
}

let decodeState = (definition, text) => guard(() => decodeStateExn(definition, text))

let stateJson = (definitionId, poses) => PwJson.Obj([
  ("schema", Str("puzlwerk.state")),
  ("revision", Num(1)),
  ("definitionId", Str(PwId.toString(definitionId))),
  (
    "poses",
    Arr(
      poses->Array.map(p => PwJson.Obj([
        ("pieceId", Str(PwId.toString(PwPose.pieceId(p)))),
        ("position", vecJson(PwShell.toVec(PwPose.position(p)))),
        (
          "orientation",
          Arr(PwOrientation.toArray(PwPose.orientation(p))->Array.map(n => PwJson.Num(n))),
        ),
      ])),
    ),
  ),
])

let encodeState = (s: state) => PwJson.toCanonical(stateJson(s.definitionId, s.poses))

let homeState = (d: definition) => {
  definitionId: d.id,
  poses: d.pieces->Array.map(p => PwPose.make(p.id, p.home, PwOrientation.identity)),
}

let poses = (s: state) => Array.copy(s.poses)

let stateOfPoses = (d: definition, poses) =>
  decodeState(d, PwJson.toCanonical(stateJson(d.id, poses)))

let hashState = s => "sha256:" ++ PwSha256.hex(encodeState(s))
