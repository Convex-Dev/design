---
slug: tagged-values
title: Reader upgrades
authors: [convex]
tags: [convex, reader, convex-lisp]
---

The Reader converts text into data. It's a key component in making Convex based apps work effectively:

- **Source Code** the reader transforms code like `(transfer #101 1000000)` into trees of code ready for compilation on the CVM.
- **Arbitrary Data** can be specified in `.cvx` text files like `[{:name "Bob" :age 42} {:name "Sarah" :age 37}]`

In preparation for Protonet, we've been putting the final touches on the Reader. So what's new?

<!-- truncate -->

### Performance Upgrades

The Convex Reader is now about **10x faster than before**. It can now parse now about 15 MB/s of CVX data files into lattice data structures per thread, up from about 1.5 MB/s before. 

That's pretty fast: remember we are transforming text into full cryptographically verifiable lattice data structures here, not simply scanning a file to gather statistics. It's certainly comparable to high-performance JSON parsing libraries that produce full object trees.

What is all means is that you can implement high performance APIs that take `application/cvx` data as input, such as in the Convex REST API Server.

### Tagged Values

The Reader now supports **tagged values**. Tagged values are used to specify special data types that the Reader otherwise wouldn't be able to produce directly. As a motivating example, consider the `Index` type that maps blob keys to values:

```clojure
;; You can construct and Index with the `index` function
(index 0x1234 :bob)
=> #Index {0x1234 :bob}

;; However if you try to specify it as a literal, you just get regular map:
{0x1234 :bob}
=> {0x1234 :bob}

;; These are not the same thing! An Index is a special type distinct from a map
;; NOTE: Different type => different lattice encoding => different hash => not equal!
(= {0x1234 :bob} (index 0x1234 :bob))
=> false

;; But now you can use a tagged value to create an index directly :-)
#Index {0x1234 :bob}
=> #Index {0x1234 :bob}

;; This produces the exact Index value we expect
(= #Index {0x1234 :bob} (index 0x1234 :bob))
=> true
```

Tagged values were inspired by Clojure's Extensible Data Notation (EDN) that allows developers to support custom types in the Clojure Reader. We don't need anything quite as sophisticated on the CVM yet (since customer user-defined types probably won't be coming until Convex v2), but it's a very handy tool already for dealing with the specialised CVM types that do exist.

### Learn More

Full Reader specifications are outlined in [CAD032](/docs/cad/032_reader). For anyone wanting to work on the Reader or CVM data translation in general it's a great place to get started! 
