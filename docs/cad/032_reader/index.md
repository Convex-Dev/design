# CAD032: CVX Reader

## Overview

Convex presents users with a rich variety of decentralised data structures.

There is a common requirement for such data structures to be presented in text format. The Reader is a software component that can read CVM Values from a standard `.CVX` file format.

The Convex reader format is defined in an [ANTLR grammar](https://github.com/Convex-Dev/convex/blob/develop/convex-core/src/main/antlr4/convex/core/lang/reader/antlr/Convex.g4)

## Format

### Basic Literals

Most basic values are available as literals in the reader.

```clojure
;; Integers - can be big integers
1                            
456576575675675676586787888  

;; Doubles
1.0
-1e89
##Inf               ; Positive Infinity
##NaN               ; Not-a-number

;; Strings 
"Hello World"                
"My name is \"Shady\""    ; escaping works like Java

;; Booleans
true
false

;; Nil value
nil
```

### Data structures

```clojure
;; Vectors
[1 2 3]

;; Lists
(+ 2 3 4)

;; Sets
#{:foo :bar}

;; Maps
{:a 1, :b 2}

;; Index (note: uses tagged reader syntax)
#Index {0x1234 :foo}
```

### Symbols

Symbols consist of alphanumeric characters plus any of: `.*+!-_?$%&=<>:#`

Examples:

```
foo
this-is-a-descriptive-name
mysym1456757
*hello*
+++<>+++
```

Symbols cannot start with a number, `:` or `#` (since these map to other readable types). These characters *are* valid elsewhere in the symbol.

Symbols MUST be 1-128 UTF-8 characters in length. This restriction has two purposes:
- It ensure that symbols are *always* embedded values
- It discourages excessive name lengths: symbols are intended for human readability!
- Empty symbols would be problematic for many reasons

Note: 

### Keywords

Keywords start with `:` and are followed by a symbolic name with the same rules as a Symbol.

Examples:

```
:foo
:name
:special-key
```

### Whitespace

Whitespace is any combination of space, tab, comma and newline characters.

Line comments are also considered whitespace. A line comment is the semicolon `;` to the end of the line

```clojure
;;;; This is a line comment

[some symbols]   ; This is also a comment that will be treated as whitespace

Whitespace MAY be omitted in cases where there is no ambiguity, e.g.:

```clojure
(+(+ 2 3)(+ 4 5))
```

### Syntax Objects

A syntax object is a value with attached metadata. Conceptually, syntax objects can be considered as wrapped values with a metadata map.

Syntax objects can be specified in the Reader with the `^` symbol preceding some metadata value and the value to wrap. The exact handling of the metadata depends on its type: 

```clojure
;; A Syntax object with the value [1 2 3] and the metadata {:foo bar}
^{:foo bar} [1 2 3]       

;; Special handling for Symbol - adds the metadata {:tag SomeSymbol}
^SomeSymbol 127

;; Special handling for Keyword - adds the metadata {:test true}
^:test (fn [] (test-name))
```

Note: The Convex Lisp compiler generally compiles syntax objects to and expression that returns the value, rather than the syntax object itself. So you may need to quote a syntax object if you wish to obtain one in CVM code:

```clojure
^:foo [1 2 3]
=> [1 2 3]

(quote ^:foo [1 2 3])
=> ^{:foo true} [1 2 3]

;; This also works, but may be confusing.
'^{:foo true} [1 2 3]
=> ^{:foo true} [1 2 3]
```

### Tagged values

The reader supported **tagged values** where custom tags indicate how a value should be interpreted.

```clojure
;; You can tag with #Index to signify an Index rather than a regular map
#Index {0x :empty-blob}
=> #Index {0x :empty-blob}

;; A CVM Result record
#Result {:id 2,:result 2}

;; A signed value
#Signed {:public-key 0x8556aba53e4de38cc4e8775b546261c803eb0b09bd9d8868ebefd469f6e93e37,
         :signature 0xb85f149acac95790d2bccdd8c3bf32ac603e8a34a9378684ba073bb2065455d56056a5240283b4d1d39f1d04c69cf53acc5236710fa8d76ecfe2e8e9795f9502,
         :value {:origin #12,:sequence 5,:command 1}}
```

Currently, this is mostly useful for CVM types such as records which do not have a direct data structure representation. In the future, this may be extended to allow more custom types.

## Usage

### Java API

Most functions of the reader are available through the static `convex.core.lang.Reader` class in the `convex-core` module. The reader takes arbitrary character strings and returns an appropriate Convex data value.

Example usage:

```java
import convex.core.lang.Reader

// These will throw a ClassCastException if the value is not of the correct type
AVector<ACell> myVector = Reader.read("[1 2 3]");
AInteger myVector = Reader.read("546456456");
Symbol sym = Reader.read("foobar");
```

:::danger
If receiving symbols as strings from untrusted sources, ensure these are passed through the reader and result in a valid symbol rather than used directly. This is to avoid possible code injection attacks. The string `"filler-symbol (malicious-code)"` is an instructive example.
:::

## Conventions

### `.cvx` File Extensions

Files intended to be read by the reader conventionally utilise a `.cvx` extension. 

Applications SHOULD name readable files with the `.cvx` extension.


### Mime Types

The mime type used for Convex reader compatible files is `application/cvx`

Applications SHOULD return `application/cvx` as the `Content-Type` header in response to HTTP requests that return `.cvx` readable text files.