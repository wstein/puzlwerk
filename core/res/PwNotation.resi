// SPDX-License-Identifier: EUPL-1.2 OR AGPL-3.0-or-later
// Bounded notation: outer and wide turns, 3x3 M/E/S, and 2x2/3x3 x/y/z.
// Prime and 2 suffixes are supported. Lowercase wide aliases and unsupported
// sizes fail as UnsupportedAlias; malformed tokens fail as UnknownToken.
// Tokens are whitespace-separated; start/stop are UTF-16 offsets.
type errorKind = UnknownToken | UnsupportedAlias | BadWidth | InputTooLong
type error = {kind: errorKind, start: int, stop: int}
let maxInputLength: int
let parse: (PwShell.size, string) => result<array<PwMove.t>, error>
