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
- Elegant **Lisp syntax** largely inspired by Clojure
- **On-chain compiler** (smart contracts writing smart contracts....)

## Interactive development

Convex Lisp is designed to support *interactive usage*. By compressing the traditional write / compile / test / debug cycle, developers can write code more efficiently and work directly with (including modifying) a running program.

Typically, developers will make use of a REPL (Read-Eval-Print-Loop) which executes expressions directly to return a result (and possibly also modifying the CVM state). REPLs can be used in local test environments, or directly on a deployed Convex network.

It is possible (though *not usually recommended*, for obvious security and risk reasons) to enable REPL capabilities on live production code. This capability can be used to hot-fix and upgrade running CVM code.

Examples given in this CAD are suitable for execution at a Convex Lisp REPL.

## Expressions and Forms

Convex Lisp code operates through the evaluation of expressions. Expressions are represented as CVM data structured as a "form" - a data value that represents code. In this sense "code is data" because the language is represented in its own data structures. This property is sometimes termed **homoiconicity*.

Typically, a form is a List where the first element represents the operation and the following elements represent arguments, e.g.:

```clojure
(operation arg1 arg2 .... argN)
```

Each element it itself a form - so forms can be nested to construct more complex expressions.

At the lowest level, forms will be a single (non-compound) data value that does not contain any further elements. These are sometimes called "atoms":

```clojure
;; the following are all atomic forms

1

hello

"This is a string"
```

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

### Data Structures

#### Vectors

Vectors are the most basic data structure, representing an indexed sequence of elements. They can be constructed by square brackets `[ ... ]` or with the core function `vector` 

```clojure
[1 2 3]
=> [1 2 3]

(vector true 0x1234 "Hello")
=> [true 0x1234 "Hello"]
```

#### Lists

Lists are sequential data structures most commonly used for expressing Convex Lisp code. They are representuing be surrounding zero or more elements with regular parentheses `( )`. Because they are interpreted as code, if you want to construct a list literal you must quote it to suppress evaluations with `'( )` or use the constructor function `list`

```clojure
;; Note single quote symbol needed to produce a literal List
'(1 2 3)
=> (1 2 3)

;; This also works
(quote (1 2 3))
=> (1 2 3)

;; This fails, because it gets interpreted as a function application, and "1" isn't a function!
(1 2 3)
=> Exception: :CAST Can't convert value of type Integer to type Function

;; List constructor is also useful, especially if you want to compute elements to be the result of some expression 
(list 1 2 (+ 1 2))
=> (1 2 3)
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

It is sometimes useful to use a Symbol as a value in itself (without performing any lookup). In this case, it is possible to **quote** the Symbol, so that the symbol itself will be returned (rather than the value that it refers to). This can be done in two ways:

```clojure
;; Quoting with the single quotation mark
'foo
=> foo

;; Quoting with the `quote` special form:
(quote foo)
=> foo
```



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

## Equality and comparisons

### Value equality

The `=` function tests for equality between any values, returning a Boolean that is `true` if and only if all values are equal:

```clojure
(= 123 123)
=> true

(= :foo "foo")
=> false
```

Value equality in Convex Lisp is **strict** and corresponds exactly with identity of CVM values (i.e. they must have the same encoding and Value Id)

### Numerical equality

The `==` function tests for numerical equality. This is *less strict* than `=`. In particular it should be noted that Integers and Doubles can be numerically equal while not being identical CVM values (i.e. equality according to `=`)

```clojure
(= 1 1.0)
=> false
 
(== 1 1.0)
=> true
```

### Numerical comparison

The `<`, `>`, `<=` and `>=` symbols perform numerical comparison in the conventional fashion. Note that they support variable arities and mixtures of numerical types:

```clojure
(< 1 3)
=> true

(>= 2.0 2)
=> true

(> 10 2 4.3)
=> false
```

## The `nil` value

The value `nil` is an important special value. Its usage may depend on context: it is typically used to mean "no answer" or "not found".

Frequently, it is used to indicate when something is not found in a data structure, e.g.

```
;; Trying to `get` a value from a map for a key that does not exist.
(get {:foo 1, :bar 2} :baz)
=> nil
```

When passed to functions that expect a data structure, `nil` usually indicates an empty data structure:

```clojure
;; Concatenating vectors with `nil`
(concat [1 2] nil [3 4])
=> [1 2 3 4]

;; Intersecting sets with `nil`
(intersection nil #{1 2 3})
 => #{}

;; Merging maps with `nil` leaves then unchanged
(merge {:foo 1} nil)
=> {:foo 1}

;; `nil` is considered to be `empty?`
(empty? nil)
=> true
```

NOTE: while `nil` may behave like an empty data structure in some contexts, it is a distinct value from the empty data structures (`[]` `()` `{}` and `#{}`). None of these values should be considered equal to each other. In particular, functions that are expected to return a data structure should normally produce an empty data structure rather than `nil` if they succeed.

When used in conditional expressions, `nil` is considered as `false` (see section on conditional expressions for more details)

When used in JSON-like data structures, `nil` may be considered to map to the JSON value `null`.


## Conditional Expressions

### `if` macro

The most common form of conditional expression is the `if` macro, which evaluates the first (test) expression to determine whether the second (true) or third (false) expression should be evaluated to determine the final result.

```clojure
(if true
  "This will be the result"
  "This will never happen")
```

The `false` branch may be omitted, in which case the result will be `nil`

### `cond` special form

If multiple test expressions are required, the `cond` special form allows this, returning the result for the first conditional expression matched (or an optional default expression if none match).

```clojure
(def a 13)

(cond
  (< a 10) "a is too small")
  (> a 20) "a is too big")
  "a is just right")
```

NOTE: The `if` macro expands to a `cond` expression in the standard Convex Lisp implementation. Using `cond` may be mildly more efficient in performance sensitive code, as it avoids one additional step of macro expansion. 

### Truthiness

In conditional expressions, results are determined by whether the evaluation of a test expression is "truthy" (like `true`) or "falsey" (like `false`).

The rule is simple:
- `false` or the value `nil` are considered "falsey"
- `true` or *any other value* are considered "truthy"

NOTE: A key reason for this is for convenience and simplifying code: `(if (not (nil? (lookup-thing a b))) ...)` can often become `(if (lookup-thing a b) ...)`. This is consistent with behaviour in other Lisps, where it is frequently referred to as "nil-punning". 

## Other syntax

### Whitespace

The Convex Lisp reader does not distinguish between different types of whitespace. Any number of tabs, commas, spaces and new lines are all considered equivalent. Programmers may find this useful for formatting source code for better readability.

```clojure
(+ 3,4)
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

## Metadata

Convex Lisp supports metadata on any value. When metadata is applied to a value, it creates a Syntax object, which wraps both the metadata and the annotated value.

The `^` symbol may be used to add metadata to a value and create a Syntax object, or you can use the `syntax` function to construct one:

```clojure
;; A syntax object adding a metadata map to a vector (Note the quote: compilation would otherwise strip the metadata)
(quote ^{:foo "This is a metadata value"} [1 2 3])
=> ^{:foo "This is a metadata value"} [1 2 3]

;; The `syntax` core function can be used to construct the same syntax object as above
(syntax [1 2 3] {:foo "This is a metadata value"})
=> ^{:foo "This is a metadata value"} [1 2 3]

;; Metadata can be empty
(syntax [1 2 3])
 => ^{} [1 2 3]

;; A keyword can be used as a shortcut to set a single metadata flag to true
```clojure
(= ^:mark [1] ^{:mark true} [1])
 => true
```

Syntax objects can be wrapped and unwrapped with `syntax`, `meta` and `unsyntax`:

```clojure
;; Unwrap the value from a syntax object
(unsyntax (syntax [1 2 3] {:some :metadata})
=> [1 2 3]

;; Unwrap the metadata from a syntax object
(meta (syntax [1 2 3] {:some :metadata}))
 => {:some :metadata}
```

Metadata can be attached to any definition in the environment:

```clojure
;; Define a symbol with metadata
(def myval ^{:level 12} [1 2 3])

;; Lookup metadata for a symbol 
(lookup-meta 'myval)
 => {:level 12}
```

Key use cases for metadata:

- Control **behaviour of definitions** in the environment e.g.:
 - The `:callable` metadata tag indicates a callable actor function
 - The `:static` metadata tag indicates a definition that should be inlined by the compiler
- Provide **on-chain documentation** for key functions, conventionally stored under the `:doc` field of metadata
- Allow custom expansion / compilation logic for DSLs, e.g. type annotations

```clojure
;; example of accessing documentation metadata via the `doc` macro
(doc count)
 => {:description "Returns the number of elements in the given collection, blob, or string.",:signature [{:return Long,:params [coll]}],:errors {:CAST "If the argument is not a countable object."},:examples [{:code "(count [1 2 3])"}]}
```

## The Reader

The Convex Lisp Reader is a software component that converts UTF-8 strings into CVM data structures.

E.g. the String "(+ 1 2 3)" is converted by the Reader into the list `(+ 1 2 3)`containing 4 elements  where the first element is the Symbol `+` and the following elements are Integers.

The Reader is **not available on chain** - it is intended for use in tools that communicate with the Convex network, such as a REPL terminal.

The reader syntax in the `convex-core` reference implementation is available as a [ANTLR Grammar](https://github.com/Convex-Dev/convex/blob/develop/convex-core/src/main/antlr4/convex/core/lang/reader/antlr/Convex.g4)

NOTE: Use of the Reader is not mandatory: it is possible to construct Convex Lisp forms programmatically (or even directly build pre-compiled CVM Ops)  rather than parsing a String via the Reader. This may offer marginal performance benefits in some applications, e.g. JVM based systems that need to construct a large number of transactions.

## Coding Conventions

The following conventions are recommended and/or generally utilised in Convex Lisp libraries:

### Hyphenation

Hyphens are generally preferred for symbol names, e.g. `do-something` (rather than `do_something` or `doSomething`). This makes no difference to the CVM, but is primarily done for consistency with other Lisp based languages.

### Constant naming

Prefer capitalised names like `PRICE` for global configuration variables and constants. This is to differentiate clearly from local, temporary or dynamically changing values.

### Keywords vs. Symbols

If in doubt whether to use Symbols or Keywords, the following may be helpful:
- Symbols are best when referring to values defined in the current environment (e.g. using `def`)
- Keywords are best as keys in data structures or literal / constant values since they do not require quoting for such usage

### Clojure Consistency

Where possible, coding style should be consistent with Clojure which shares a very similar syntax to Convex Lisp.

The [Clojure Style Guide](https://github.com/bbatsov/clojure-style-guide) may be informative.

## Notable Differences vs. other languages on decentralised VMs

Many decentralised systems offer virtual machines that are Turing complete and can execute code using one or more general purpose programming languages. Ability to do this however does not mean that it is easy to build efficient, secure and capable decentralised economic systems. 

We believe the following features of Convex Lisp, among others, offer substantive improvements over typical existing solutions:

- **Functional Programming**: full support for the lamdba calculus and first class functions
- **Code is data**: Convex Lisp is a fully homoiconic language, with code expressed in its own data structures
- **On chain compiler**: Convex Lisp on-chain code can perform code generation, compile and deploy new Convex Lisp code
- **Big Integer support**: arbitrary precisions integers are supported as standard, avoiding risks of overflow (e.g. 256-bit fixed words)
- **Floating point support**: Full IEEE754 Double compatibility, which are more suitable than integer mathematics for many purposes
- **Orthogonal Persistence**: storage is automatic, with no need to explicitly store data. Extremely large data structures are supported (including larger than machine memory) and are loaded when accessed on demand.
- **Extra Types**: A full range of general purpose value types including: Sets, literal Keywords, sorted BlobMaps, UTF-8 Strings, Blobs etc.
- **Memory accounting**: Economic system for memory management. See [CAD006](../006_memory)
- **Powerful macro capability**: ability to fully customise the language with expanders. See also [CAD009](../009_expanders)

We hope that developers will find the tools provided in Convex Lisp a compelling solution as we continue to build open economic systems.




