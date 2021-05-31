# Design Princicples

This document details general design and engineering principles deployed in the implementation of Convex.

## Apply Judgement

Principle are rarely absolute. There are allways tradeoffs in engineering decisions that must be considered. Discussion is encouraged to ensure relevant aspects are considered from a number of perspectives.

## Security First

Convex is a system intended to support high value economic transactions. As such, security issues should be automatically regarded as the highest priority. We MUST NOT release core software with known servere security defects.

## Favour Simple over Convenient

Especially in API design, there may be a tendency to want to add new features for user convenience, e.g. additional optional arguments for Core functions.

In such cases we SHOULD stongly resist the temptation to add additional complexity, and prefer the simplest possible implementation, especially within core Convex functionality. It is more important that core functionality is clean, simple and maintainable than easy to use. Users have a powerful language with macro capabilities if they wish to implement more convenient programmatic interfaces appropriate for their own use case or design tastes.

## Design for Composition

Convex features should be explicitly designed to compose to enable higher-order functionality to be built from simple, regular, well-behaved components.

## Think Agebraically

Wherever possible, consideration should be given of the algebraic properties of Functions and Values. An algebraic approach lends itself well to cleaner, simpler definitions and well-behaved functionality.

Algebraic thinking may also be usefull when thinking about the "zero" case of function arities. This might be considered by treating the varargs parameter as a vector where consideration should be given to the case where this vector is empty e.g. 

- `(apply + []) -> 0`
- `(apply conj coll []) => 'coll'`
- `(apply * []) => 1`
- `(apply assoc m []) => m`

## Always be additive

We can add functionality, we can't remove it (at least in released versions of Convex). We MUST always continue to support existing released functionality, since users may be depending on it.

This principle also applies to error conditions. We can permissibly turn a failure into a sucess (e.g. defining a function that was previously undeclared) but cannot turn a success into a failure (e.g. removing a core function).


## Values are Immutable

We adopt immutablility as a standard principle for all Values in Convex. Immutability is important for several reasons:

- Enables hash codes to be used as a proxy for Value Identity
- Enables stuctural sharing in persistent data structures
- Easier to reason about immutable values, especially with pure functions
- Better suited for concurrency

Mutability in implementations is permitted (e.g. a mutable cached value for perfomance reasons), however such mutability should not be externally visible (e.g. should not affect the Encoding of Values)

## Favour Explicit over Implicit

We prefer to avoid implicit behaviour, and require operations to be explicitly requested.

This principle manifests, for example, in casting functions that generally avoid performing implicit casts between different Types.

## Bounded Resources

In most cases, it is necessary to place a bound on the size of resources used. This is essential to ensure that the CVM does not ever attempt to process data of unbounded size, which could allow DoS attacks by adversaries constructing arbitrarily sized input.

Where CVM input may be effectively unbounded (e.g. the size of data structures such as Vectors), the CVM MUST never attempt O(n) or greater operations on such structures unless these operations are protected by roesource constraints (e.g. accounting for juice costs, memory allowances). 
