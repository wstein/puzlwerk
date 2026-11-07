// Bounded text notation (Q2, approved 2026-11-07): outer faces R L U D F B with a prime or 2 suffix,
// and wide moves Rw / kRw (2 <= k < N). Slices (M/E/S), global rotations (x/y/z) and lowercase wide
// aliases fail as UnsupportedAlias; everything else unknown fails as UnknownToken. Tokens are
// separated by space, tab, CR or LF. start and stop are UTF-16 offsets of the offending token.
type errorKind = UnknownToken | UnsupportedAlias | BadWidth | InputTooLong
type error = {kind: errorKind, start: int, stop: int}
let maxInputLength: int
let parse: (PwShell.size, string) => result<array<PwMove.t>, error>
