// An element of SO(3,Z): the 24 proper signed permutation matrices, stored row-major as nine
// integers. Entry (i,j) is row i, column j; column j is the image O.e_j (ADR 0008).
type t
type error = BadLength | BadEntry | NotOrthogonal | Reflection
let make: array<int> => result<t, error>
let identity: t
let toArray: t => array<int>
let apply: (t, PwShell.vec) => PwShell.vec
// compose(a, b) applies b first, then a (matrix product a.b).
let compose: (t, t) => t
// The transpose is the inverse.
let transpose: t => t
let equal: (t, t) => bool
let all: unit => array<t>
