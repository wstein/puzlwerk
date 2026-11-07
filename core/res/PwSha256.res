// Constants of FIPS 180-4 as signed 32-bit integers.
let k = [
  1116352408,
  1899447441,
  -1245643825,
  -373957723,
  961987163,
  1508970993,
  -1841331548,
  -1424204075,
  -670586216,
  310598401,
  607225278,
  1426881987,
  1925078388,
  -2132889090,
  -1680079193,
  -1046744716,
  -459576895,
  -272742522,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  -1740746414,
  -1473132947,
  -1341970488,
  -1084653625,
  -958395405,
  -710438585,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  -2117940946,
  -1838011259,
  -1564481375,
  -1474664885,
  -1035236496,
  -949202525,
  -778901479,
  -694614492,
  -200395387,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  -2067236844,
  -1933114872,
  -1866530822,
  -1538233109,
  -1090935817,
  -965641998,
]

let h0 = [
  1779033703,
  -1150833019,
  1013904242,
  -1521486534,
  1359893119,
  -1694144372,
  528734635,
  1541459225,
]

let rotr = (x, n) => x->Int.shiftRightUnsigned(n)->Int.bitwiseOr(x->Int.shiftLeft(32 - n))

let utf8 = text => {
  let bytes = []
  let len = text->String.length
  let i = ref(0)
  while i.contents < len {
    let cp = text->String.codePointAt(i.contents)->Option.getOr(0)
    i := i.contents + (cp > 0xFFFF ? 2 : 1)
    if cp < 0x80 {
      bytes->Array.push(cp)
    } else if cp < 0x800 {
      bytes->Array.push(0xC0->Int.bitwiseOr(cp->Int.shiftRightUnsigned(6)))
      bytes->Array.push(0x80->Int.bitwiseOr(cp->Int.bitwiseAnd(0x3F)))
    } else if cp < 0x10000 {
      bytes->Array.push(0xE0->Int.bitwiseOr(cp->Int.shiftRightUnsigned(12)))
      bytes->Array.push(0x80->Int.bitwiseOr(cp->Int.shiftRightUnsigned(6)->Int.bitwiseAnd(0x3F)))
      bytes->Array.push(0x80->Int.bitwiseOr(cp->Int.bitwiseAnd(0x3F)))
    } else {
      bytes->Array.push(0xF0->Int.bitwiseOr(cp->Int.shiftRightUnsigned(18)))
      bytes->Array.push(0x80->Int.bitwiseOr(cp->Int.shiftRightUnsigned(12)->Int.bitwiseAnd(0x3F)))
      bytes->Array.push(0x80->Int.bitwiseOr(cp->Int.shiftRightUnsigned(6)->Int.bitwiseAnd(0x3F)))
      bytes->Array.push(0x80->Int.bitwiseOr(cp->Int.bitwiseAnd(0x3F)))
    }
  }
  bytes
}

let hex = text => {
  let bytes = utf8(text)
  let len = bytes->Array.length
  bytes->Array.push(0x80)
  while mod(bytes->Array.length, 64) != 56 {
    bytes->Array.push(0)
  }
  // 64-bit big-endian bit length; inputs are far below 2^29 bytes, so the high word is the top bits.
  let bitsHigh = len->Int.shiftRightUnsigned(29)
  let bitsLow = len->Int.shiftLeft(3)
  for shift in 3 downto 0 {
    bytes->Array.push(bitsHigh->Int.shiftRightUnsigned(shift * 8)->Int.bitwiseAnd(0xFF))
  }
  for shift in 3 downto 0 {
    bytes->Array.push(bitsLow->Int.shiftRightUnsigned(shift * 8)->Int.bitwiseAnd(0xFF))
  }
  let h = Array.copy(h0)
  let w = Array.make(~length=64, 0)
  let blocks = bytes->Array.length / 64
  for b in 0 to blocks - 1 {
    for t in 0 to 15 {
      let o = b * 64 + t * 4
      let byte = j => bytes->Array.getUnsafe(o + j)
      w->Array.setUnsafe(
        t,
        byte(0)
        ->Int.shiftLeft(24)
        ->Int.bitwiseOr(byte(1)->Int.shiftLeft(16))
        ->Int.bitwiseOr(byte(2)->Int.shiftLeft(8))
        ->Int.bitwiseOr(byte(3)),
      )
    }
    for t in 16 to 63 {
      let w15 = w->Array.getUnsafe(t - 15)
      let w2 = w->Array.getUnsafe(t - 2)
      let s0 =
        rotr(w15, 7)->Int.bitwiseXor(rotr(w15, 18))->Int.bitwiseXor(w15->Int.shiftRightUnsigned(3))
      let s1 =
        rotr(w2, 17)->Int.bitwiseXor(rotr(w2, 19))->Int.bitwiseXor(w2->Int.shiftRightUnsigned(10))
      w->Array.setUnsafe(t, w->Array.getUnsafe(t - 16) + s0 + w->Array.getUnsafe(t - 7) + s1)
    }
    let a = ref(h->Array.getUnsafe(0))
    let bb = ref(h->Array.getUnsafe(1))
    let c = ref(h->Array.getUnsafe(2))
    let d = ref(h->Array.getUnsafe(3))
    let e = ref(h->Array.getUnsafe(4))
    let f = ref(h->Array.getUnsafe(5))
    let g = ref(h->Array.getUnsafe(6))
    let hh = ref(h->Array.getUnsafe(7))
    for t in 0 to 63 {
      let s1 =
        rotr(e.contents, 6)
        ->Int.bitwiseXor(rotr(e.contents, 11))
        ->Int.bitwiseXor(rotr(e.contents, 25))
      let ch =
        e.contents
        ->Int.bitwiseAnd(f.contents)
        ->Int.bitwiseXor(e.contents->Int.bitwiseNot->Int.bitwiseAnd(g.contents))
      let t1 = hh.contents + s1 + ch + k->Array.getUnsafe(t) + w->Array.getUnsafe(t)
      let s0 =
        rotr(a.contents, 2)
        ->Int.bitwiseXor(rotr(a.contents, 13))
        ->Int.bitwiseXor(rotr(a.contents, 22))
      let maj =
        a.contents
        ->Int.bitwiseAnd(bb.contents)
        ->Int.bitwiseXor(a.contents->Int.bitwiseAnd(c.contents))
        ->Int.bitwiseXor(bb.contents->Int.bitwiseAnd(c.contents))
      let t2 = s0 + maj
      hh := g.contents
      g := f.contents
      f := e.contents
      e := d.contents + t1
      d := c.contents
      c := bb.contents
      bb := a.contents
      a := t1 + t2
    }
    let add = (i, v) => h->Array.setUnsafe(i, h->Array.getUnsafe(i) + v)
    add(0, a.contents)
    add(1, bb.contents)
    add(2, c.contents)
    add(3, d.contents)
    add(4, e.contents)
    add(5, f.contents)
    add(6, g.contents)
    add(7, hh.contents)
  }
  h
  ->Array.map(x => {
    let unsigned = Int.toFloat(x) +. (x < 0 ? 4294967296.0 : 0.0)
    unsigned->Float.toString(~radix=16)->String.padStart(8, "0")
  })
  ->Array.join("")
}
