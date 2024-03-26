# Convex Lisp

## Overview 

Convex provides an implementation of Lisp as a powerful and convenient high level language for development of code suitable for execution on the CVM.

We chose Lisp as the first language for Convex for a number of key reasons:
- Productivity: general recognition of Lisp as a highly productive and flexible language
- The advantages of a homoiconic language for constructing code with powerful macros and DSL capabilities
- The ability to create a small and efficient [compiler](../008_compiler) suitable for on-chain code compilation 
- Familiarity for developers of existing Lisp-based languages such as **Clojure**, **Scheme**, **Racket** or **Common Lisp**

This CAD outlines the key elements of Convex Lisp. It is intended as a introduction and guide: more detailed specifications for particular aspects are provided in other CADs

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
;; Quoting with the single quote mark
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
    
    

