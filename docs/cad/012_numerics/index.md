# CAD012: Numerics

## Overview

The CVM implements numerical operations similar to those available in typical programming languages. Most basic numerical operations are provided as runtime functions such as `+`, `sqrt`, `max` etc.

CVM numerical capabilities are designed to support the kind of calculations likely to be required in on-chain decentralised applications. 

Floating point vales are fully supported on the CVM. This is because we believe floating point numerics are often important for functionality such as:
- Probability calculations in prediction markets
- Exponential growth rates
- Dividing up shares in asset pools
- Computing statistics such as moving averages

However, compute intensive numerical operations should normally be performed off-chain. Hence we do not offer any special support in the CVM for operations such as tensor multiplication. You can do these on your GPU, and summarise or hash the result to put on chain if required.

## Numeric Tower

The numeric tower is defined as follows:
- Double (64 bit double precision floating point)
- Integer, which can be divided into:
    - Big Integer (65-32768 bits)
    - Long (64 bits or less) 

### Double

Doubles are 64-bit double precision floating point values as defined in the IEEE754 standard.

Certain special values are supported:

- `##Inf` is positive infinity (hex 0x7ff0000000000000)
- `##-Inf` is negative infinity (hex 0xfff0000000000000)
- `##NaN` is a unique "not a number" value (hex 0x7ff8000000000000)
- `-0.0` is the IEEE754 negative zero (hex 0x8000000000000000)
- `1.7976931348623157e+308` is the maximum value (hex 0x7fefffffffffffff)

### Integers

Integers are signed integer values.

The CVM natively supports big integer values: Currently the maximum size of an Integer is 4096 bytes (32,768 bits). This MAY be extended in the future.

Longs are 64-bit signed integer values. They are the subset of Integers that fit within 64 bits, which is convenient for implementation on most modern hardware.

Usually, developers don't need to worry about whether they are using Longs or "big" Integers. The CVM converts between the two automatically as required (preferring the more efficient Long values where possible). However, staying within Long range is recommended because it usually results in lower juice costs / transactions fees.

## Numeric Equality

Numerical equality can be checked with the `==` Function. 

This differs from value equality (`=`) in several ways, and is consistent with the IEEE754 specification. In particular, Users should note that:
- `(== ##NaN ##NaN) => false` 
- `(== 0.0 -0.0) => true`
- `(== 5 5.0) => true`

In general: prefer `==` if you want to compare values on a numerical basis, `=` if you want exact value / representational equality (e.g. for consistency of hash values). 

## Numerical functions

The CVM has built-in support for a wide range of functions which operate on numerical values. Some examples:

```clojure
;; Regular addition. Supports any number of arguments
(+ 2 3 4)
=> 9

;; Subtraction
(- 100 30)
=> 70

;; Negation (subtraction with just one argument)
(- 17)
=> -17

;; Integer division
(div 1234 100)
=> 12

;; Integer modulus
(mod 1234 100)
=> 34
```

Some numerical functions are defined to always result in `Double` values:

```clojure
;; Note: Numerical division results in doubles. Use `div` or `quot` if you want integer division!
(/ 1 2)
=> 0.5

;; Square root
(sqrt 16)
=> 4.0

;; Exponential function
(exp 1)
=> 2.7182818284590455
```

There are also several predicates designed to work with numerical values:

```clojure
;; zero? is equivalent to numerical comparison with any zero value
(zero? -0.0)
=> true

;; long? tests if a value is an integer in the long range (64 bits)
(long? 6786)
=> true

;; number? tests for any numeric type
(number? 0.12)
=> true
```

Where an equivalent IEEE764 function exists using double-precision floating point values, the CVM behaves the same as the IEEE754 standard.

## Numeric Comparison

Numerical comparisons can be performed with `<`, `>`, `<=`, `>=`. 

These generally behave in the expected way, support variadic arguments and are consistent with `==`. Examples are given below:

- `(< 1 2 3) => true`
- `(< 1 3 2) => false`
- `(>= 3 3) => true`

## Numeric promotion

Many numerical functions promote to the largest number type used in the sequence Integer -> Double, e.g. the `+` function:

```clojure
;; Using Integer arguments results in an Integer
(+ 10 20)
=> 30

;; Any Double argument causes the result to be Double
(+ 1 1.2)
=> 1.2

;; Functions using Long values that overflow Long range automatically promote to full (big) Integers:
(* 9999999999999 9999999999999)
=> 99999999999980000000000001
```

Use of a non-numeric type in a numerical function usually results in a `:CAST` error:

```clojure
(+ 1 0x00)
```

## Conversion to Numeric Types

Certain types can be explicitly cast to numeric values the using runtime casting functions `(long x)`, `(int x)` and `(double x)`

If these functions succeed, it is guaranteed that the result will be a value of the expected numeric type.

It is worth noting some of the more esoteric conversions to Integers possible:

```clojure
;; Characters convert to their Unicode code point
(int \c)
=> 99

;; Hex values are treated as two's complement integers (sign extended if necessary)
(int 0x00ffff)
=> 65535

;; Booleans convert to 1 / 0
(int true)
=> 1

;; Doubles convert to integers (rounding towards zero, like Java casts)
(int -2.7)
=> -2

;; Can get the numerical value of an address with `int` or `long`
(int #1234)
=> 1234
```

## General Recommendations

Users SHOULD perform checks on the validity of numeric arguments before executing numerical operations. In particular:

- Be aware of the possibility of `##NaN`, `##Inf` or `##-Inf` as a result from Double operations
- Check for risk of 64-bit overflow if relying upon Long values. 
- Be careful accepting arguments from untrusted sources and casting them directly to numeric values. You might get unexpected results. If in doubt, check arguments with predicates like `int?` first.

Users SHOULD NOT use the CVM for complex or intensive numerical computations, e.g. modelling fluid dynamics. Such computations are better performed off-chain.
