# Convex Lisp

## Overview 

Convex Lisp is a general purpose, high level programming language for the Convex Virtual Machine (CVM), designed to facilitate effective construction of smart contracts, digital assets and open economic systems.

While the CVM itself is language agnostic, we developed a Lisp dialect as the first language for Convex for a number of key reasons:
- Productivity: general recognition of Lisp as a highly productive and flexible language
- The advantages of a homoiconic language for constructing code with powerful macros and DSL capabilities
- The ability to create a small and efficient [compiler](../008_compiler) suitable for on-chain code compilation 
- Familiarity for developers of existing Lisp-based languages such as **Clojure**, **Scheme**, **Racket** or **Common Lisp**

This CAD outlines the key elements of Convex Lisp. It is intended as an **introduction and programmer's guide**: more detailed specifications for particular aspects are provided in other CADs

## Key features

- Emphasis on **functional programming** with support for the **lambda calculus**
- Pure **immutable data structures** with highly optimised implementations for usage in decentralised systems 
- Powerful **macro capabilities**, following the Expansion-passing Style developed by Dybvig, Friedman & Haynes
- Automatic **memory management**, including [memory accounting](../006_memory)
- Elegant **syntax** largely inspired by Clojure
- **On-chain compiler** (smart contracts writing smart contracts....)

## Interactive development

Convex Lisp is designed to support *interactive usage*. By compressing the traditional write / compile / test / debug cycle, developers can write code more efficiently and work directly with (including modifying) a running program.

Typically, developers will make use of a REPL (Read-Eval-Print-Loop) which executes expressions directly to return a result (and possibly also modifying the CVM state). REPLs can be used in local test environments, or directly on a deployed Convex network.

It is possible (though *not usually recommended*, for obvious security and risk reasons) to enable REPL capabilities on live production code.

Examples below are suitable for execution at a Convex Lisp REPL.

## Values and data types

Convex Lisp provides a rich set of data types suitable for general purpose development. These include:
- a *superset of JSON* for easy interoperability with web based systems
- large immutable persistent data structures with automatic structural sharing for efficiency

For more detailed specification see [CAD002](../002_values)

### Basic literal values

Literal values are expressions that evaluate to themselves as a constant. These include numbers, strings, booleans etc.

```clojure
1
=> 1

"Hello"
=> "Hello"

true
=> true
```

### Blobs

Blobs are arbitrary length sequences of byte data. These are particularly useful in Convex for:
- Representing cryptographic values such as hashes and Ed25519 public keys
- Allowing applications to store custom data in their own encodings

Blobs can be easily constructed as literals by prefixing `0x` to a hexadecimal representation of the byte data

```clojure
;; A small Blob literal
0x1234ee99
=> 0x1234ee99

;; Can use functions like `count` to get the length of a Blob
(count 0x12e5)
=> 2
```

### Data structures

Vectors are the most basic data structure, representing an indexed sequence of elements. They can be constructed by square brackets `[ ... ]` or with the core function `vector` 

```clojure
[1 2 3]
=> [1 2 3]

(vector true 0x1234 "Hello")
=> [true 0x1234 "Hello"]
```

### Keywords

Keywords are symbolic names preceded by a colon (`:`)

```clojure
;; Keywords are literals that evaluate to themselves
:hello
=> :hello
```

Keywords of this form have been popularised in the Clojure language. Keywords are typically used to represent short human-readable keys in data structures or possible values in set of flags. The reference CVM implementation may perform some optimisations to make this type of usage more efficient.

### Symbols

Symbols are symbolic names used to refer to other values. They are similar to Keywords, however they are treated differently by the compiler as they are used to look up values in the current context / environment.

```clojure
;; `count` refers to the core runtime function. This prints as `count` but is NOT the symbol: the result is a function
count
=> count

;; Trying to evaluate a symbol that is undefined will result in an :UNDECLARED error
foo
=> :UNDECLARED error

;; You can define a symbol to refer to any value you like, e.g. a Vector. This will consume some CVM memory.
(def bar [1 2 3])

;; Once a symbol is defined in the environment, it will evaluate to the value itself
bar 
=> [1 2 3]
```

You may want to use a Symbol as a value without performing any lookup. In this case, you need need to **quote** the Symbol, so that the symbol itself will be returned (rather than the value that it refers to). This can be done in two ways:

```clojure
;; Quoting with the single quotation mark
'foo
=> foo

;; Quoting with the `quote` special form:
(quote foo)
=> foo
```

If in doubt whether to use Symbols or Keywords, the following may be helpful:
- Symbols are best used in core where you are referring to values defined in the current environment (e.g. using `def`)
- Keywords are best when you want to use them as keys in data structures or literal / constant values since they do not require quoting for such usage

## Functions

Functions are values in Convex Lisp that can be applied to a set of arguments.

Key properties:
- They are full first class values, i.e. can be stored in data structure or passed as arguments to other functions
- They can optionally support variable arity (i.e. variable numbers of arguments)
- They operate as closures over lexically defined values

### Applying functions

Function application is performed by evaluating a List where the function to be applied is the first element of the list, and the following elements are the arguments:

```clojure
;; The `+` function adds together any number of numerical values
(+ 1 2 3 4)
=> 10

;; The `count` function counts the number of elements in a data structure:
(count [1 2 3 5 8])
=> 5 
```

If the number of arguments might be variable, you can use `apply` to apply a function to a sequence of arguments.

```clojure
(def numbers [1 2 3 4 5])

(apply * numbers)
=> 60
```

### Defining functions

Functions are typically defined with the `defn` macro, which creates a function and stores it in the current environment.

```clojure
(defn square [x]
  (* x x))
  
(square 12)
=> 144  
```

Functions can support multiple arities by specifying different combinations of parameter lists:

```clojure
;; A function with arity 1 and 2 specified
(defn greet 
  ([a] 
    (str "Hello " a))
  ([a b]
    (str "Hello " a " and b)))
    
(greet "Bob")
=> "Hello Bob"

(greet "Bill" "Ben")
=> "Hello Bill and Ben"   
```    

Functions can also support fully variadic arguments using the `&` symbol preceding a variadic argument

```clojure
(defn average [& nums]
  (/ (apply + nums) (count nums)))
  
(average 1.0 2.0 3.0 4.0)
=> 2.5  
```

### Anonymous functions

Sometimes, it can be convenient to create a function without storing it against a symbol in the environment. This can be done with the `(fn [...] ...)` anonymous function constructor.

```clojure
(reduce 
  (fn [a b] (+ a (* b b)))
  [0 1 2 3])
=> 14
```

## Floating point

Convex Lisp supports IEE754 double precision floating point mathematics with a built-in `Double` type. This is an important for many domains where Integer values may be inconvenient or introduce inaccuracies, e.g. in statistical or pricing applications. `Double` support is also important so that Convex Lisp can express a superset of JSON.

```clojure
;; Double values are lietrals, just like Integers
12.45
=> 12.45

;; Mathematical operations are supported for Doubles 
(+ 1.2 3.4)
=> 4.6

;; Some mathematical operations always produce double results
(sqrt 16)
=> 4.0

;; Truncation to IEE754 Double precision is automatic when required
12.6678347835634789562349785632948756
 => 12.667834783563478
```

In general, operations that mix Integer and Double values will return a Double value.

```clojure
(+ 1 2.0)
=> 3.0

(+ 1 2)
=> 3
```

There are special Double literals for NaN and +/- Infinity. Applications using Double values should be aware of expressions that might produce such results and handle them accordingly.    
    
```clojure
(sqrt -1)
=> ##NaN

(/ 1 0)
=> ##Inf

(- 4 ##Inf)
 => ##-Inf
 ```

## Other syntax

### Whitespace

The Convex Lisp reader does not distinguish between different types of whitespace. Any number of tabs, spaces and new lines are all considered equivalent. Developers may find this useful for formatting source code for better readability.

```clojure
(+ 3 4)
=> 7

( + 3 4 )
=> 7

(+
  3
  4)
=> 7
```

In some cases, whitespace MAY be omitted, where the syntax is unambiguous to the reader. This is NOT RECOMMENDED, since it may harm legibility and does not result in any on-chain data savings.

```cloure
(+(+ 1 2)(+ 3 4))
```


### Comments

Line comments include any text after a semicolon `;` up to the end of the line. Comments are considered whitespace by the reader:

```
; This is a comment

;;;;; So is this
```

The reader macro `#_` can be used to instruct the reader to ignore any single form. This can be useful for temporarily ignoring chunks of code:

```clojure
(+ 1 #_(this is a
          block of code
          which will not compile
          and is ignored) 
    2 3)
 => 6
```

## The Reader

The Convex Lisp Reader is a software component that converts UTF8 strings into CVM data structures.

E.g. the String "(+ 1 2 3)" is converted by the Reader into the list `(+ 1 2 3)`containing 4 elements  where the first element is the Symbol `+` and the following elements are Integers.

The Reader is **not available on chain** - it is intended for use in tools that communicate with the Convex network, such as a REPL terminal.

The reader syntax in the `convex-core` reference implementation is available as a [ANTLR Grammar](https://github.com/Convex-Dev/convex/blob/develop/convex-core/src/main/antlr4/convex/core/lang/reader/antlr/Convex.g4)

NOTE: Use of the Reader is not mandatory: it is possible to construct Convex Lisp forms programmatically (or even directly build pre-compiled CVM Ops)  rather than parsing a String via the Reader. This may offer marginal performance benefits in some applications, e.g. JVM based systems that need to construct a large number of transactions.

