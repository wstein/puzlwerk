type errorKind = UnknownToken | UnsupportedAlias | BadWidth | InputTooLong
type error = {kind: errorKind, start: int, stop: int}

let maxInputLength = 100000

let isSpace = c => c == " " || c == "\n" || c == "\t" || c == "\r"
let isDigit = c => c >= "0" && c <= "9" && c->String.length == 1
let isFace = c => c == "R" || c == "L" || c == "U" || c == "D" || c == "F" || c == "B"
let isAlias = c =>
  c == "M" ||
  c == "E" ||
  c == "S" ||
  c == "x" ||
  c == "y" ||
  c == "z" ||
  c == "r" ||
  c == "l" ||
  c == "u" ||
  c == "d" ||
  c == "f" ||
  c == "b"

let isSuffix = s => s == "" || s == "'" || s == "2"

let parseToken = (size, token): result<PwMove.t, errorKind> => {
  let n = PwShell.sizeToInt(size)
  let len = token->String.length
  let at = i => token->String.get(i)->Option.getOr("")
  let digits = ref(0)
  while digits.contents < len && isDigit(at(digits.contents)) {
    digits := digits.contents + 1
  }
  let d = digits.contents
  let face = at(d)
  let rest = token->String.slice(~start=d + 1)
  if d == 0 && isAlias(face) && isSuffix(rest) {
    Error(UnsupportedAlias)
  } else if !isFace(face) {
    Error(UnknownToken)
  } else {
    let wide = rest->String.startsWith("w")
    let suffix = wide ? rest->String.slice(~start=1) : rest
    if !isSuffix(suffix) || d > 0 && !wide || (d > 1 && at(0) == "0") {
      Error(UnknownToken)
    } else if d > 6 {
      Error(BadWidth)
    } else {
      let width = if !wide {
        1
      } else if d == 0 {
        2
      } else {
        token->String.slice(~start=0, ~end=d)->Int.fromString->Option.getOr(0)
      }
      if wide && (width < 2 || width >= n) {
        Error(BadWidth)
      } else {
        let positive = face == "R" || face == "U" || face == "F"
        let axis = switch face {
        | "R" | "L" => PwMove.X
        | "U" | "D" => PwMove.Y
        | _ => PwMove.Z
        }
        let layers = Array.fromInitializer(~length=width, i => positive ? n - width + i : i)
        let base = positive ? -1 : 1
        let turns = suffix == "'" ? -base : suffix == "2" ? 2 : base
        switch PwMove.make(size, axis, layers, turns) {
        | Ok(m) => Ok(m)
        | Error(_) => panic("PwNotation: generated an invalid move")
        }
      }
    }
  }
}

let parse = (size, text) =>
  if text->String.length > maxInputLength {
    Error({kind: InputTooLong, start: 0, stop: text->String.length})
  } else {
    let len = text->String.length
    let moves = []
    let failure = ref(None)
    let i = ref(0)
    while failure.contents == None && i.contents < len {
      if isSpace(text->String.get(i.contents)->Option.getOr("")) {
        i := i.contents + 1
      } else {
        let start = i.contents
        while i.contents < len && !isSpace(text->String.get(i.contents)->Option.getOr("")) {
          i := i.contents + 1
        }
        let token = text->String.slice(~start, ~end=i.contents)
        switch parseToken(size, token) {
        | Ok(m) => moves->Array.push(m)
        | Error(kind) => failure := Some({kind, start, stop: i.contents})
        }
      }
    }
    switch failure.contents {
    | Some(e) => Error(e)
    | None => Ok(moves)
    }
  }
