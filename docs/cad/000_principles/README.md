# CAD000: Design Principles

We are building a platform for global decentralised computation and data, based on lattice technology and as a shared public utility network. As such, we are developing a set of open standards based on sound principles and values that will serve the long term vision.

This document details general design and engineering principles deployed in the implementation and documentation of Convex. All CADs should refer to and align with these principles.

## Technical Principles

### Values are Immutable

We adopt immutability for all values in Convex. Immutability is important for several reasons:

- Enables hash codes to be used for value identity (value IDs) - essential for content-addressable storage
- Enables structural sharing in persistent data structures, especially when shared on the lattice
- Easier to reason about immutable values, especially with pure functions
- Better suited for concurrency

Mutability may occur as an implementation detail (e.g. a mutable cached value for performance reasons), however such mutability should not be externally visible (e.g. should not affect the encoding of values or CVM behaviour). 

A useful presentation on the topic: https://www.infoq.com/presentations/Value-Values/

### Bounded Resources

We are building a system for distributed computation and data in the context of a global internet where many parties with access to the Convex network may be untrusted.

It is therefore necessary to place a bound on the size of resources used. This is essential to ensure that the CVM does not ever attempt to process data of unbounded size, which could allow DoS attacks by adversaries constructing arbitrarily sized input.

Where input to Convex may be effectively unbounded (e.g. the size of data structures such as Vectors), implementations MUST NOT attempt O(n) or greater operations on such structures unless these operations are protected by resource constraints (e.g. accounting for juice costs, memory allowances). 

## General Design Philosophy

### Security First

Convex supports high value economic transactions. As such, security issues should be automatically regarded as the highest priority. We MUST NOT release core software with known severe security defects that might place digital assets at risk.

We SHOULD use existing, proven algorithms and cryptography wherever practical: there is no need to "reinvent the wheel" in crypto.

### Favour Simplicity

Especially in API design, there is a tendency to want to add new features for user convenience, e.g. additional optional arguments for core functions.

In such cases we SHOULD strongly resist the temptation to add additional complexity, and prefer the simplest possible implementation, especially within core Convex functionality. It is more important that core functionality is clean, simple and maintainable than superficially easy to use. Users have a powerful language with macro capabilities if they wish to implement more convenient programmatic interfaces appropriate for their own use case or design tastes.

An Excellent talk by Rich Hickey on this topic: https://www.infoq.com/presentations/Simple-Made-Easy-QCon-London-2012/

### Design for Composition

Convex features should be explicitly designed to compose to enable higher-order functionality to be built from simple, regular, well-behaved components. In general, pure functions and immutable data compose well.

### Think Algebraically

Wherever possible, consideration should be given of the algebraic properties of Functions and Values. An algebraic approach lends itself well to cleaner, simpler definitions and well-behaved functionality. As far as possible, we want Convex functionality to behave as pure mathematical constructs.

For example, algebraic thinking may be useful when thinking about the "zero" case of function arities. This might be considered by treating the varargs parameter as a vector where consideration should be given to the case where this vector is empty e.g. 

- `(apply + []) -> 0`
- `(apply conj coll []) => coll`
- `(apply * []) => 1`
- `(apply assoc m []) => m`

### Always be additive

We can add functionality, we can't remove it (at least in released versions of Convex). We MUST always continue to support existing released functionality that users are depending on in production environments.

This principle also applies to error conditions. We can permissibly turn a failure into a success (e.g. defining a function that was previously undeclared) but cannot turn a success into a failure (e.g. removing a core function).

### Favour Explicit over Implicit

We prefer to avoid implicit behaviour, and generally require operations to be explicitly requested. It is better to throw an Error rather than having implicit behaviour (which creates implementation complexity and may not be what the user intended).

This principle manifests, for example, in the idea that most functions should avoid performing implicit casts between different Types. If a user wants a value to be cast to a different type, they should specify it explicitly, e.g. `(+ 1 (long 0x1234))` works but `(+ 1 0x1234)` should not.

### Avoid Scope Creep

Convex is designed to facilitate on-chain transactions and smart contracts between multiple participants, providing foundational capabilities for open economic systems: the Internet of Value. 

Many types of software are a poor fit for a publicly accessible and globally validated state machine such as the Convex CVM, e.g. text processing, AI models or data analytics. We SHOULD NOT add features and complexity to support use cases in the CVM that do not belong there in the first case.

Such features MAY make sense in P2P off-chain usage, e.g. the Data Lattice. We encourage experimentation in off-chain environments before consideration for CVM inclusion.

### Apply Judgement

Principles are rarely absolute. There are always trade-offs in engineering decisions that must be considered. Discussion is encouraged to ensure relevant aspects are considered from a number of perspectives.

## CAD Style Conventions

Literal code (e.g. Convex Lisp forms) should be quoted in a fixed width font `(like this)`

Type names like the Convex Vector or the Java type Object should be capitalised. They SHOULD NOT be quoted as code unless they are intended as a code example.

Where possible, follow RFC style MUST, SHOULD, MAY, SHOULD NOT etc. in formal specifications.



