# Compiler

## Overview

Convex includes an on-chain Compiler as part of the CVM. The Compiler is responsible for taking Convex Lisp source code forms and compiling these down to low level CVM Ops.

The Compiler is designed for Convex Lisp, which is a natural fit the Lambda Calculus features of the CVM. However alternative language front-ends are possible for Convex providing that these are able to compile down to either Convex Lisp (as an intermediate language) or CVM Ops (the basic operations of the CVM)

## Phases

The Compiler operates in two phases, Expansion and Compilation.

These phases can be accessed in serveral ways:
- The `eval` Runtime Function function can be used to perform both phases of the Compiler and execute the result.
- The `compile` Runtime Function can be used to execute the Compilation phase alone.
- The `expand` Runtime Function can be used to perform Expansion alone, typically using the `*initial-expander*`.

### Expansion

Expansion takes a Form (usually defined in Convex Lisp, but can be an alternate language) and fully expands this to an Expanded Form. 

An Expanded Form may include:
- Convex Lisp forms excluding Macros and Expanders (these should already have been fully expanded)
- Syntax Objects, which may be used to annotate certain values with metadata
- Raw CVM Ops (already compiled)

### Compilation

Compilation takes an Expanded form and converts it into a CVM Op (which typically includes a tree of child Ops), according to the compilation rules specified below.

Compilation of already compiled CVM Ops is simply the identity function: The pass-though of CVM Ops in this way is useful for implementations of custom languages on the CVM - for example, arbitrary languages can be compiled and executed within an `eval` operation through the use of custom Expanders.

## Compilation Rules

The Compiler takes the Expanded Form passed to the Compilation Phase as Input and returns an Outut which is a CVM Op.

### Overall Input handling

- If the Input is a CVM Op, it is returned directly as the Output
- If the Input is an empty data structure, the Output is a Constant Op for the data structure
- If the Input is a List:
  - Lists starting with Special Symbols denoting CVM Ops (e.g. `do`, `def`) are compiled as the appropriate Op, with remaining list elements handled according to the special op definition
  - List starting with Special Symbol relating to quoting (e.g. `quote`, `unquote`) are handled according to quoting semantics  
  - Otherwise, the Output is an Invoke Op, invoking the compiled first element as a function, with the remaining elements compiled as arguments
- If the Input is a Vector, the Output is the result of compiling `(vector arg1 arg2 ... argN)` where the `argX` values are the Output from compiling each element of the Vector in order
- If the Input is a Map, the Output is the result of compiling `(hash-map k1 v1 k2 v2 ... kN vN)` where the keys and values are the Output from compiling each key and value of the Map in order
- If the Input is a Set, the Output is the result of compiling `(hash-set arg1 arg2 ... argN)` where the `argX` values are the Output from compiling each element of the Set in order
- Otherwise, a Constant Op is produced which returns the Input unchanged

### Special Ops

### Quoting

## Compiler Errors

If the Compiler encounters any unexpected input, it MUST return an Error (usually `:COMPILE`). 

However, Clients SHOULD NOT rely on a specific Error Code, because:
- Expanders may produce arbitrary Error Codes
- More specific CVM Errors such as `:JUICE` or `:DEPTH` may occur in some cases
- Compilation Error Codes may be changed in future Network Upgrades

Users making use of the Compiler SHOULD ensure that they avoid error cases as far as possible by ensuring that they only provide correct input.

## Compiler Costs

The Expansion Phase incurs a Juice Cost according to the cost of any expanders used (which may be user defined in regular CVM code). The `*initial-expander*` incurs small constant costs for each element expanded. In normal usage, expansion costs are therefore usually `O(n)` in the size of the Form being expanded, but can be arbitrarily large if custom macros or expanders are used.

The Compilation Phase incurs a constant Juice Cost for each node of the Expanded Form processed. Compilation costs are therefore never more than `O(n)` in the size of the Expanded Form.

Juice Consumed is accounted for in the normal way (i.e. it will be charged for as part of the transaction executing the compiler, and the transaction will fail if any limits are exceeded). 

