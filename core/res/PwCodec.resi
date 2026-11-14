// Versioned canonical codec for definitions and states, wire schema v1
// (specs/001-core-foundation/contracts/wire-v1.md). Decoding is strict and returns validated,
// opaque values; encoding is canonical; hashes are "sha256:" plus the hex SHA-256 of the
// canonical bytes. Structural validity here is not a reachability certificate.
type errorCode =
  | Syntax
  | TooLarge
  | TooDeep
  | DuplicateKey
  | NotInteger
  | NegativeZero
  | WrongType
  | MissingField
  | UnknownField
  | BadSchema
  | BadRevision
  | BadId
  | BadValue
  | DuplicateId
  | DuplicateSlot
  | PieceMismatch
  | DefinitionMismatch
  | BadSticker
  | BadOrientation
  | PositionRule

type error = {code: errorCode, path: string}

type sticker = {id: PwId.t, normal: PwShell.vec, up: PwShell.vec, color: option<PwId.t>}
type piece = {id: PwId.t, home: PwShell.slot, stickers: array<sticker>}

type definition
type state

let decodeDefinition: string => result<definition, error>
let encodeDefinition: definition => string
let hashDefinition: definition => string
let definitionId: definition => PwId.t
let size: definition => PwShell.size
// The piece catalog sorted by piece ID (a copy): home slot and stickers of every piece.
let pieces: definition => array<piece>

let decodeState: (definition, string) => result<state, error>
let encodeState: state => string
let hashState: state => string

// The home state: every piece at its home slot with the identity orientation.
let homeState: definition => state
// The poses of a state, sorted by piece ID (a copy).
let poses: state => array<PwPose.t>
// Validates the poses against the definition with the checks of decodeState.
let stateOfPoses: (definition, array<PwPose.t>) => result<state, error>
