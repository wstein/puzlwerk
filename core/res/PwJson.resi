// Strict JSON for the wire format: no duplicate keys, integers only (no fraction, exponent or
// negative zero), bounded size and depth. Errors carry the JSON path of the offending value.
type rec t =
  | Null
  | Bool(bool)
  | Num(int)
  | Str(string)
  | Arr(array<t>)
  | Obj(array<(string, t)>)

type errorCode = Syntax | TooLarge | TooDeep | DuplicateKey | NotInteger | NegativeZero
type error = {code: errorCode, path: string}

let maxBytes: int
let maxDepth: int
let parse: string => result<t, error>
// Canonical text: object keys sorted by code unit, no whitespace; strings are escaped minimally.
let toCanonical: t => string
