---
slug: convex-lisp-advanced
title: Advanced Lisp Guide
sidebar_position: 2
authors: [mikera, helins]
tags: [convex, developer, lisp]
---

If you've got this far, you may be interested in some of the more advanced features of Convex Lisp. This section is intended for people who want to know more about how Convex Lisp works.

## Compiler Phases

How does 'Code as Data' actually work? The secret is in understanding the phases of the Convex Lisp compiler.

### 1. Reading

Reading is the first phase that parses source code as text into CVM data structures (technically known as a *form*, since it is data that is structured to be used as code)

```clojure
"(foo :bar :baz)" -> '(foo :bar :baz)
```

The Convex Lisp reader is part of the Convex platform code but outside the scope of the CVM - there's no good reason for doing parsing on-chain when it can be performed easily and cheaply by clients. This means that you can't parse code from Strings on-chain, but this isn't a significant limitation: you can just parse off-chain and pass in the resulting data structure (skipping the reading phase)

### 2. Expansion

Expansion is the second phase of the compiler. Expansion takes the raw form data structures and translates them into expanded forms, which are a representation of the Convex Lisp Abstract Syntax Tree (AST)

```clojure
;; `if` is a macro that gets expanded to `cond`
(expand '(if :bar :baz)) 
=> (cond :bar :baz)
```

In this phase, any macros are applied to the forms analysed, which has the effect of replacing them with the macro expansion.

This means that arbitrary CVM code in macros *can* be executed during expansion - which in turn can be sometimes useful, e.g. in smart contract code that wishes to generate code based on analysing the CVM state.

Expansion can be performed either on-chain (with the `expand` core function) or off-chain.

### 3. Compilation

In the third phase, forms are *compiled* into *Ops*, which are the low-level instructions that can be executed by the CVM.

```clojure
<expanded-form> -> Op
```

There are only a small number of Op types on the CVM, which are roughly based on the fundamental operations required to implement the [Lambda Calculus](https://en.wikipedia.org/wiki/Lambda_calculus). Important ones are:

- **Cond** - Performs a conditional branch
- **Constant** - Loads a constant value
- **Def** - Creates a definition in the environment
- **Do** - Executes a structured sequence of Ops sequentially
- **Invoke** - Executes a function with optional arguments
- **Lambda** - Creates a function
- **Let** - Defines a scope for local variables
- **Lookup** - Looks up a value from a definition in the environment

Ops can be nested, e.g. an Op of type **Do** may contain multiple child Ops. In this way, single Ops can be used to represent whole programs or algorithms.

Normally, users don't need to interact directly with Ops. There are cases where it may be marginally more efficient to construct Ops off-chain and send them directly for execution, but this is an optimisation probably only worthwhile for applications doing very large numbers of transactions.

### 4. Execution

The final phase is execution, where Ops are executed in the CVM context. The Op may update the CVM state in various ways, and it may also return a result, so the process of Op execution can be informally viewed as a state update:

```
<Old CVM State> + <Op> => <New CVM State> + <Result>
```

Results from Op execution can be either:

- A valid CVM data object
- An exceptional result (e.g. an error or early return value)

Convex Ops are technically a form of [p-code](https://en.wikipedia.org/wiki/P-code_machine), analogous in many ways to Java bytecode. Using Ops gives a few big advantages:

- Ops can be executed efficiently many times (avoiding the more expensive phases of parsing, expansion and compilation).
- Ops are very compact in terms of memory used - making them ideal for network transmission and efficient use of on-chain storage.
- We can improve the underlying performance and implementation details of the CVM without breaking CVM code that has been compiled to Ops.
- Ops are designed to match up with the runtime and security checks that the CVM must perform when executing code securely on-chain.

## Destructuring

It is common that data is passed in a data structure, and you wish to access specific elements of the structure. Convex supports basic destructuring of sequential data structures:

```clojure
(defn name [user]
  (let [[name age attributes & flags] user]
    name))

(name ["Bob" 67 {:favourite-colour "Green"} :some-extra-flag])
 => "Bob"
```

The `&` symbol can be user to indicate an arbitrary number of following elements. Such elements are bound as a single vector.

```clojure
(defn restargs [_ & more]
  more)

(restargs 1 2 3 4)
 => [2 3 4]
```

The `_` symbol is used to ignore an argument. Nothing is bound for the corresponding position.

While often convenient, destructuring can make code harder to read, so use judiciously.

## Macros

We've actually used a couple of macros already in this guide: `if`, `undef` and `defn` are all examples of macros.

A macro is a procedure that generates new code at compile time (technically, in the *expansion* phase of the compiler). Macros are an incredibly powerful tool that allows you to enhance the Convex Lisp language with new capabilities and syntax.

As a simple example, let's consider a macro that allows you to use 'infix' notation for mathematical expressions, i.e. instead of writing `(+ 1 2)` we want to write `1 + 2`. It is possible to do this with a simple macro that rewrites the infix expression into the expected Lisp format:

```clojure
(defmacro infix [arg1 operator arg2]
  (list operator arg1 arg2))

(infix 1 + 3)
=> 4
```

What is happening here? The macro defines an expander function that takes three arguments `[arg1 operator arg2]` and then outputs a list starting with the operator. This transforms `1 + 3` into the list `(+ 1 3)` which can then be executed normally. We can see the effect of macro expansion by using the `expand` function, which performs the expansion of a form without evaluating it:

```clojure
(expand '(infix 1 + 3))
=> (+ 1 3)
```

Macros are powerful tools, but should only be used when needed - they are more complicated to use and understand than regular functions. The best use cases for macros are usually:

- Writing new syntax / language extensions that need to make use of arguments *without* evaluating them beforehand. If you are happy to use arguments after regular evaluation, then regular functions are probably a better fit.
- Situations where you want code to be evaluated at compile-time, e.g. to avoid repeatedly performing the same expensive computation at runtime.

## Transactions and state rollback

The CVM is a state machine, and the execution of ops often leads to changes in the CVM state. Usually this is desirable (because you want a digital asset transfer to be executed, for example) however sometimes you need a greater level of control for security or integrity reasons.

### Atomic transactions

A transaction on Convex either succeeds (with a result value) or fails (with an error code and optional message / metadata).

If a transaction fails then *all state changes that happen within the transaction* are rolled back. Transactions are therefore **atomic** from the perspective of any external observer.

This is important because it prevents a situation where a transaction is only partially completed. The only state changes that can happen in relation to a failed transaction are those external to the transaction itself (e.g. juice accounting). 

### Actor calls

Calling an actor creates a new execution context (effectively a fork of the CVM). Like an overall transaction, this will either succeed or fail. Again, if there is any failure, all CVM changes made within the scope of the `call` are rolled back.

```clojure
;; an actor with a callable function that changes state but cannot succeed
(def bad-actor (deploy
  '(defn ^:callable will-fail []
     (def test 10) ;; make a state change first
     (fail)        ;; then fail
     )))

;; the call fails as expected
(call bad-actor (will-fail)
=> Exception: :ASSERT nil

;; this fails because the definition of `test` has been rolled back
bad-actor/test
=> Exception: :UNDECLARED test
```

### `rollback` instruction 

You can terminate a transaction or actor call with `(rollback :value)`, which causes the current execution context to stop with the given value as a result. 

This returns the transaction to the `*caller*` of the current actor, or terminates the transaction if there is no `*caller*` (i.e. we are in a top level transaction). This is typically used when unexpected has happened, or an attempt to perform some work failed, but you do not want to throw an error. Presumably the caller will know what they want to do in this situation.

### `halt` instruction

You can terminate a transaction or actor call with `(halt :value)`, which causes the current execution context to stop with the given value as a result, but keep any CVM state changes.

This returns the transaction to the `*caller*` of the current actor, or terminates the transaction if there is no `*caller*` (i.e. we are in a top level transaction). This is typically used to exit processing early when everything is successfully completed and the desired result is known.

### `query` expression

Often you want to execute some code to determine the result, but do not want any CVM changes to occur. You can do this by wrapping any code in `(query ...)`. The example below 

```clojure
;; if I deployed a new actor, what address would I get?
(def next-actor-address  (query (deploy :this-is-not-important)))
=> #68796

;; The new actor account wan't actually created!
(account next-actor-address)
=> nil
```

Note that code within queries may still fail, with the error propagated back to the calling code.#

`query` is particularly useful when executing code that *shouldn't* make state changes but you don't entirely trust it. A typical example would be calling a 3rd party actor to read some data - it protects you against unintended or malicious CVM state changes in what should be a read-only operation. 

Such calls might also open up security vulnerabilities like reentrancy attacks if the actor calls back into your code, but again `query` protects you, because any such changes are rolled back and it doesn't matter even if an attacker does manage to compromise your code: they can't do anything.

## Exception Handling

**WARNING**: error handling on the CVM is a risky business. It is always safer to fail a transaction than to attempt to handle an error - so only do this if you really know what you are doing

### `try` expressions

The CVM supports a `try` expression similar to many general purpose languages that support exception handling. The semantics of `try` are:

1. Attempt the first expression
2. If the expression succeeds, return its result and finish (including any CVM state changes)
3. If expression fails with a catchable error **roll back** any CVM state changes and proceed
4. If more expressions exist, continue to attempt each expression in turn as in 2. above
5. If all expressions fail, return the result of the last expression (which could be an error)

Example:

```clojure
(try 
  (+ :foo :bar)   ;; this will fail due to bad argument types
  :ALTERNATIVE)=> :ALTERNATIVE
```

### Rollback behaviour

The atomic rollback feature of `try` is critical for smart contract safety. In the event of failure, the CVM state will be as it was before the failing expression. 

For example, the following code performs some digital asset transactions (which typically involved nested calls to actors that modify CVM state). If any one of these fails, the entire `do` block is atomically rolled back before `alternative-handling` is attempted.

```clojure
(try
  (do
    (asset-transfer-1) 
    (asset-transfer-2) 
    (asset-transfer-3))
  (alternative-handling))
```

This pattern of ensuring a set of actions either all succeed or are all rolled back is quite common in more sophisticated smart contract code. In effect, the `try` block lets you attempt an atomic sub-transaction.

You can furthermore wrap code in `query` to discard CVM state changes even in the case of success. This enables speculative execution of arbitrary code, even with `eval` on untrusted code:

```clojure
(defn would-code-succeed? [dangerous-code]
  (try 
    (query
      (eval dangerous-code)
      true)
    false))

;; assuming you have 1 gold at least
(would-code-succeed? '(transfer #11 1000000000))
=> true

;; A transfer of this size is impossible
(would-code-succeed? '(transfer #11 1000000000000000001))
=> false
```

The most you can lose here is the value of your juice: the transfer (or any other state changes) won't actually happen.

### Uncatchable errors

Note: Some CVM errors are impossible to recover from: such errors are regarded as *uncatchable*.

This usually isn't a concern because there is nothing you can do anyway to continue effectively. e.g. `:JUICE` failures are pointless to catch because any error handling code will immediately also fail due to `:JUICE`.
