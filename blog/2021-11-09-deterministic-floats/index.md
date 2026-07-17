---
slug: deterministic-floats
title: "Floating point on a deterministic machine"
authors: [mikera, claude]
tags: [convex, cvm, data-structures]
---

Blockchain folklore says you can't have floating point in consensus.
Ethereum has no floats. Most chains follow suit, and everyone does token
maths with painful fixed-point workarounds as a result. Convex 0.7.2 takes
a different position: the CVM supports IEEE 754 double-precision floats,
in consensus, deterministically. The folklore is wrong — but it's wrong in
an interesting way.

<!-- truncate -->

The folklore didn't come from nowhere: floating point *has* burned
distributed systems before. But the culprit was never the arithmetic. IEEE
754 operations are precisely specified — every conforming processor
computes the same bits for the same inputs. Ask two machines for `0.1 + 0.2`
and both return exactly `0.30000000000000004` — surprising, but identically
surprising everywhere.

The real problems live at the edges:

- **NaN is not one value.** The IEEE encoding allows a huge space of
  distinct NaN bit patterns, and different hardware produces different
  ones. If a value's identity is its bytes — and in Convex, everything
  is content-addressed, so it is — two NaNs with different payloads are
  different values, and consensus diverges.
- **Legacy hardware paths.** Old x87 instructions computed at 80-bit
  precision internally, giving subtly different results depending on
  compiler flags. Modern SSE2 arithmetic doesn't have this problem, and the
  JVM guarantees strict 64-bit semantics for doubles.

So the fix isn't to ban floats. It's to close the actual gaps. As of 0.7.2
the CVM admits exactly **one** NaN: the canonical quiet NaN,
`0x7ff8000000000000`, written `##NaN` in Convex Lisp. Any operation that
would produce a NaN produces that one. Non-canonical NaN encodings simply
cannot exist as CVM values, so every peer hashes, stores and transmits the
identical cell.

Meanwhile the numerics stay faithfully IEEE, including the famous edge
cases:

```clojure
(== ##NaN ##NaN)
=> false
```

Numerically, NaN is not equal to itself — as IEEE 754 specifies, and as
numerical software expects. As a *value*, though, `##NaN` is just another
cell with a fixed encoding, so it works as a map key or a structure element
like anything else.

Why bother? Because doubles are the default number format of real-world
computing. Sensor readings, exchange rates, ML model weights, game physics —
it's all doubles. A platform that wants real applications, not just token
transfers, should speak the number format that real applications use. It
just has to do so with its eyes open.
