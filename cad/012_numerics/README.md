# Numerics

## Overview

The CVM implements numerical operations similar to those available in typical programming languages. Most basic numerical operations are provided as Runtime Functions such as `+`, `sqrt`, `max` etc.

CVM numerical capabilities are primarily intended to support the kind of calculations likely to be required in on-chain decentralised applications. More sophisticated numerical calculations, particularly those that require significant computational power, should normally be performed off-chain.

## Numeric Tower

The numeric Tower is defined as follows:
- Double
- Long

Operations that have arguments of different levels perform an implicit cast to the level of the highest argument.

## Numeric Equality

Numerical equality can be checked with the `==` Function. 

This differs from Value equality `=` in several ways, and is consistent with the IEEE754 specification. In particular, Users should note that:
- `(== ##NaN ##NaN) => false` 
- `(== 0.0 -0.0) => true`
- `(== 5 5.0) => true`

## Numeric Comparison

Numerical comparisons can be performed with `<`, `>`, `<=`, `>=`. 

These generally behave in the expected way, support variadic arguments and are consistent with `==`. Examples are given below:

- `(< 1 2 3) => true`
- `(< 1 3 2) => false`
- `(>= 3 3) => true`

## Explicit Casting to Numeric Values

Certain types can be explicitly cast to Numeric Values using Runtime Functions `(long x)` and `(double x)`

## Recommendations

Users SHOULD perform checks on the validity of numeric arguments before executing numerical operations. In particular:

- Be aware of the possibility of `##NaN`, `##Inf` or `##-Inf` as a result from Double operations
- Check for risk of 64-bit overflow with Long values. 
 
If precise Long accuracy is not required, user SHOULD consider performing calculations on large numbers with Double to avoid overflow risks.

Users SHOULD NOT use the CVM for complex or intensive numerical computations, e.g. modelling fluid dynamics. Such computations are better performed off-chain.
