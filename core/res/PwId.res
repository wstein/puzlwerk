type t = string
type error = Empty | BadChar

let isIdChar = code =>
  (code >= 48 && code <= 57) ||
  code >= 65 && code <= 90 ||
  code >= 97 && code <= 122 ||
  code == 46 ||
  code == 95 ||
  code == 58 ||
  code == 45

let make = s => {
  let n = s->String.length
  if n == 0 {
    Error(Empty)
  } else {
    let bad = ref(false)
    for i in 0 to n - 1 {
      if !isIdChar(s->String.charCodeAt(i)->Option.getOr(-1)) {
        bad := true
      }
    }
    bad.contents ? Error(BadChar) : Ok(s)
  }
}

let toString = id => id
let equal = (a: t, b: t) => a == b
