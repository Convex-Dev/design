---
slug: big-integers
title: "Integers that don't overflow"
authors: [mikera, claude]
tags: [convex, cvm, data-structures]
---

Convex 0.7.10 starts landing **arbitrary-precision integers, native in
the CVM**. Multiply two enormous numbers and you get the right answer. Not
a wrapped answer, not a reverted transaction, not a number shaved to fit a
256-bit word. The right answer.

<!-- truncate -->

```clojure
(* 99999999999999999999 99999999999999999999)
=> 9999999999999999999800000000000000000001
```

Small integers stay exactly what they were — fast 64-bit longs, which cover
almost everything real programs do. When a result outgrows 64 bits, the CVM
promotes it to a big integer automatically, currently up to 32,768 bits.
One integer type, no ceremony at the boundary.

## Overflow is a policy, and most platforms chose badly

Every platform has to decide what happens when arithmetic exceeds the
machine word. The mainstream blockchain answer is a 256-bit word that
either wraps silently (the source of a long series of token-supply
exploits) or reverts. A whole defensive-programming culture — SafeMath and
friends — exists because the VM's default answer to "what is a + b?" was
sometimes wrong.

We find that backwards. Arithmetic on money should not have sharp edges at
powers of two. A financial platform's integers should behave like the
integers you learned at school: closed under addition and multiplication,
no surprises at 2^63 or 2^256. If the maths is correct by construction, an
entire category of exploit simply doesn't exist.

## No free supercomputing

The obvious objection: doesn't arbitrary precision let someone burden peers
with thousand-digit multiplications? This is where juice accounting earns
its keep. Operations on big integers cost juice in proportion to the work —
the bigger the operands, the more you pay. Honest users doing money maths
in long-sized numbers pay long-sized costs; someone who wants to multiply
4,000-byte integers can do so, at a price that reflects what they're asking
several thousand peers to compute. Deterministic costs for deterministic
work.

## Why 32,768 bits is more interesting than it sounds

Beyond not-overflowing, large integers make serious number theory possible
on-chain. Modular exponentiation over 2048- or 4096-bit numbers is the core
operation of RSA-style cryptography, accumulators and a fair amount of the
verifiable-computation literature.
Whether or not those land on Convex soon, we'd rather the numeric
foundations didn't rule them out.

This first release is part one — the type, promotion rules and core
operations — with follow-up work refining behaviour and costs across the
full numeric tower in 0.7.11. It's the least glamorous kind of feature:
one that removes an entire class of bugs by making the correct thing the
only thing.
