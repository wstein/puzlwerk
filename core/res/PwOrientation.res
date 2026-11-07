type t = array<int>
type error = BadLength | BadEntry | NotOrthogonal | Reflection

let at = (m: array<int>, i, j) => m->Array.getUnsafe(3 * i + j)

let column = (m, j) => (at(m, 0, j), at(m, 1, j), at(m, 2, j))

let dot = ((a, b, c), (d, e, f)) => a * d + b * e + c * f

let det = m =>
  at(m, 0, 0) * (at(m, 1, 1) * at(m, 2, 2) - at(m, 1, 2) * at(m, 2, 1)) -
  at(m, 0, 1) * (at(m, 1, 0) * at(m, 2, 2) - at(m, 1, 2) * at(m, 2, 0)) +
  at(m, 0, 2) * (at(m, 1, 0) * at(m, 2, 1) - at(m, 1, 1) * at(m, 2, 0))

let make = (a: array<int>) =>
  if a->Array.length != 9 {
    Error(BadLength)
  } else if a->Array.some(v => v < -1 || v > 1) {
    Error(BadEntry)
  } else {
    // O^T O = I: the columns are orthonormal.
    let orthonormal = ref(true)
    for i in 0 to 2 {
      for j in 0 to 2 {
        let expected = i == j ? 1 : 0
        if dot(column(a, i), column(a, j)) != expected {
          orthonormal := false
        }
      }
    }
    if !orthonormal.contents {
      Error(NotOrthogonal)
    } else if det(a) != 1 {
      Error(Reflection)
    } else {
      Ok(Array.copy(a))
    }
  }

let identity = [1, 0, 0, 0, 1, 0, 0, 0, 1]

let toArray = o => Array.copy(o)

let apply = (o, v: PwShell.vec): PwShell.vec => {
  x: at(o, 0, 0) * v.x + at(o, 0, 1) * v.y + at(o, 0, 2) * v.z,
  y: at(o, 1, 0) * v.x + at(o, 1, 1) * v.y + at(o, 1, 2) * v.z,
  z: at(o, 2, 0) * v.x + at(o, 2, 1) * v.y + at(o, 2, 2) * v.z,
}

let compose = (a, b) =>
  Array.fromInitializer(~length=9, idx => {
    let i = idx / 3
    let j = mod(idx, 3)
    at(a, i, 0) * at(b, 0, j) + at(a, i, 1) * at(b, 1, j) + at(a, i, 2) * at(b, 2, j)
  })

let transpose = o => Array.fromInitializer(~length=9, idx => at(o, mod(idx, 3), idx / 3))

let equal = (a, b) => a == b

// All 3^9 candidate matrices in lexicographic order, filtered by make.
let group = {
  let found = []
  for idx in 0 to 19682 {
    let rest = ref(idx)
    let digits = Array.make(~length=9, 0)
    for p in 8 downto 0 {
      digits->Array.setUnsafe(p, mod(rest.contents, 3) - 1)
      rest := rest.contents / 3
    }
    switch make(digits) {
    | Ok(o) => found->Array.push(o)
    | Error(_) => ()
    }
  }
  found
}

let all = () => Array.copy(group)
