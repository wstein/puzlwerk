// Validated identifiers: nonempty, case-sensitive ASCII from [A-Za-z0-9._:-].
type t
type error = Empty | BadChar
let make: string => result<t, error>
let toString: t => string
let equal: (t, t) => bool
