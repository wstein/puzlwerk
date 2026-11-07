type rec t =
  | Null
  | Bool(bool)
  | Num(int)
  | Str(string)
  | Arr(array<t>)
  | Obj(array<(string, t)>)

type errorCode = Syntax | TooLarge | TooDeep | DuplicateKey | NotInteger | NegativeZero
type error = {code: errorCode, path: string}

let maxBytes = 16 * 1024 * 1024
let maxDepth = 64

exception Fail(error)

let fail = (code, path) => throw(Fail({code, path}))

let parse = text => {
  let len = text->String.length
  let pos = ref(0)
  let peek = () => text->String.get(pos.contents)->Option.getOr("")
  let advance = () => pos := pos.contents + 1
  let skipSpace = () => {
    while peek() == " " || peek() == "\n" || peek() == "\t" || peek() == "\r" {
      advance()
    }
  }
  let isDigit = c => c->String.length == 1 && c >= "0" && c <= "9"
  let expect = (c, path) =>
    if peek() == c {
      advance()
    } else {
      fail(Syntax, path)
    }
  let parseString = () => {
    expect("\"", "$")
    let out = ref("")
    let finished = ref(false)
    while !finished.contents {
      if pos.contents >= len {
        fail(Syntax, "$")
      }
      let c = peek()
      advance()
      if c == "\"" {
        finished := true
      } else if c == "\\" {
        let e = peek()
        advance()
        switch e {
        | "\"" => out := out.contents ++ "\""
        | "\\" => out := out.contents ++ "\\"
        | "/" => out := out.contents ++ "/"
        | "b" => out := out.contents ++ "\b"
        | "f" => out := out.contents ++ "\f"
        | "n" => out := out.contents ++ "\n"
        | "r" => out := out.contents ++ "\r"
        | "t" => out := out.contents ++ "\t"
        | "u" =>
          let hex = text->String.slice(~start=pos.contents, ~end=pos.contents + 4)
          let isHexDigit = ch =>
            (ch >= "0" && ch <= "9") || ch >= "a" && ch <= "f" || (ch >= "A" && ch <= "F")
          let allHex =
            hex->String.length == 4 &&
              [0, 1, 2, 3]->Array.every(i => hex->String.get(i)->Option.getOr("g")->isHexDigit)
          switch allHex ? Int.fromString(~radix=16, hex) : None {
          | Some(n) =>
            out := out.contents ++ String.fromCharCode(n)
            pos := pos.contents + 4
          | None => fail(Syntax, "$")
          }
        | _ => fail(Syntax, "$")
        }
      } else if c->String.charCodeAt(0)->Option.getOr(0) < 32 {
        fail(Syntax, "$")
      } else {
        out := out.contents ++ c
      }
    }
    out.contents
  }
  let parseNumber = path => {
    let start = pos.contents
    let negative = peek() == "-"
    if negative {
      advance()
    }
    if !isDigit(peek()) {
      fail(Syntax, "$")
    }
    let digitsStart = pos.contents
    while isDigit(peek()) {
      advance()
    }
    let digits = text->String.slice(~start=digitsStart, ~end=pos.contents)
    if digits->String.length > 1 && digits->String.startsWith("0") {
      fail(Syntax, "$")
    }
    let fractional = peek() == "." || peek() == "e" || peek() == "E"
    if fractional {
      fail(NotInteger, path)
    }
    if digits->String.length > 15 {
      fail(NotInteger, path)
    }
    if negative && digits == "0" {
      fail(NegativeZero, path)
    }
    // Int.fromString is None outside the 32-bit range: reject instead of decoding as 0.
    switch text->String.slice(~start, ~end=pos.contents)->Int.fromString {
    | Some(value) => value
    | None => fail(NotInteger, path)
    }
  }
  let literal = (word, value) =>
    if text->String.slice(~start=pos.contents, ~end=pos.contents + word->String.length) == word {
      pos := pos.contents + word->String.length
      value
    } else {
      fail(Syntax, "$")
    }
  let rec parseValue = (path, depth): t => {
    skipSpace()
    switch peek() {
    | "{" =>
      if depth >= maxDepth {
        fail(TooDeep, "$")
      }
      advance()
      let entries = []
      skipSpace()
      if peek() == "}" {
        advance()
      } else {
        let more = ref(true)
        while more.contents {
          skipSpace()
          let key = parseString()
          let keyPath = path ++ "." ++ key
          if entries->Array.some(((k, _)) => k == key) {
            fail(DuplicateKey, keyPath)
          }
          skipSpace()
          expect(":", "$")
          let value = parseValue(keyPath, depth + 1)
          entries->Array.push((key, value))
          skipSpace()
          if peek() == "," {
            advance()
          } else {
            expect("}", "$")
            more := false
          }
        }
      }
      Obj(entries)
    | "[" =>
      if depth >= maxDepth {
        fail(TooDeep, "$")
      }
      advance()
      let items = []
      skipSpace()
      if peek() == "]" {
        advance()
      } else {
        let more = ref(true)
        while more.contents {
          let value = parseValue(path ++ "[" ++ Int.toString(items->Array.length) ++ "]", depth + 1)
          items->Array.push(value)
          skipSpace()
          if peek() == "," {
            advance()
          } else {
            expect("]", "$")
            more := false
          }
        }
      }
      Arr(items)
    | "\"" => Str(parseString())
    | "t" => literal("true", Bool(true))
    | "f" => literal("false", Bool(false))
    | "n" => literal("null", Null)
    | c if c == "-" || isDigit(c) => Num(parseNumber(path))
    | _ => fail(Syntax, "$")
    }
  }
  if len > maxBytes {
    Error({code: TooLarge, path: "$"})
  } else {
    try {
      let value = parseValue("$", 0)
      skipSpace()
      if pos.contents < len {
        fail(Syntax, "$")
      }
      Ok(value)
    } catch {
    | Fail(e) => Error(e)
    }
  }
}

let escape = s => {
  let out = ref("\"")
  for i in 0 to s->String.length - 1 {
    let c = s->String.get(i)->Option.getOr("")
    let code = c->String.charCodeAt(0)->Option.getOr(0)
    out :=
      out.contents ++
      switch c {
      | "\"" => "\\\""
      | "\\" => "\\\\"
      | _ if code < 32 => "\\u" ++ Int.toString(code, ~radix=16)->String.padStart(4, "0")
      | _ => c
      }
  }
  out.contents ++ "\""
}

let rec toCanonical = json =>
  switch json {
  | Null => "null"
  | Bool(b) => b ? "true" : "false"
  | Num(n) => Int.toString(n)
  | Str(s) => escape(s)
  | Arr(items) => "[" ++ items->Array.map(toCanonical)->Array.join(",") ++ "]"
  | Obj(entries) =>
    "{" ++
    entries
    ->Array.toSorted(((a, _), (b, _)) => String.compare(a, b))
    ->Array.map(((k, v)) => escape(k) ++ ":" ++ toCanonical(v))
    ->Array.join(",") ++ "}"
  }
