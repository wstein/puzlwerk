// Doubled centered integer coordinates of the shell slots of an NxNxN cube (data model,
// "Frames and integer coordinates"). Right-handed frame: +X right, +Y up, +Z front.
type vec = {x: int, y: int, z: int}

type size
type sizeError = TooSmall | TooLarge
let minSize: int
let maxSize: int
let makeSize: int => result<size, sizeError>
let sizeToInt: size => int

type slot
type slotError = OutOfRange | BadParity | Interior
let makeSlot: (size, vec) => result<slot, slotError>
let toVec: slot => vec
let slotCount: size => int
let slots: size => array<slot>
