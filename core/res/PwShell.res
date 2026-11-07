type vec = {x: int, y: int, z: int}

type size = int
type sizeError = TooSmall | TooLarge
let minSize = 2
let maxSize = 64

let makeSize = n =>
  if n < minSize {
    Error(TooSmall)
  } else if n > maxSize {
    Error(TooLarge)
  } else {
    Ok(n)
  }

let sizeToInt = n => n

type slot = vec
type slotError = OutOfRange | BadParity | Interior

let abs = (n: int) => n < 0 ? -n : n

let makeSlot = (n, v) => {
  let top = n - 1
  let inRange = abs(v.x) <= top && abs(v.y) <= top && abs(v.z) <= top
  // D = {-(N-1), -(N-3), ..., N-1}: c + (N-1) is even.
  let parityOk = c => mod(abs(c + top), 2) == 0
  if !inRange {
    Error(OutOfRange)
  } else if !(parityOk(v.x) && parityOk(v.y) && parityOk(v.z)) {
    Error(BadParity)
  } else if abs(v.x) != top && abs(v.y) != top && abs(v.z) != top {
    Error(Interior)
  } else {
    Ok(v)
  }
}

let toVec = s => s

let slotCount = n => n * n * n - (n - 2) * (n - 2) * (n - 2)

let slots = n => {
  let top = n - 1
  let result = []
  for i in 0 to n - 1 {
    for j in 0 to n - 1 {
      for k in 0 to n - 1 {
        let v = {x: -top + 2 * i, y: -top + 2 * j, z: -top + 2 * k}
        if abs(v.x) == top || abs(v.y) == top || abs(v.z) == top {
          result->Array.push(v)
        }
      }
    }
  }
  result
}
