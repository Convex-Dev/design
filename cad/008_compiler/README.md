# Compiler

## Overview

Convex includes an on-chain compiler as part of the CVM. The compiler is responsible for taking Convex Lisp source code forms and compiling these down to low level CVM Ops.

The compiler is designed for Convex Lisp, which is a natural fit the Lambda Calculus features of the CVM. However alternative language front-ends are possible for Convex providing that these are able to compile down to either Convex Lisp (as an intermediate language) or CVM Ops (the basic operations of the CVM)

## Phases

The Compiler operates in two phases, expansion and compilation.

These phases can be accessed in several ways:
- The `eval` runtime function function can be used to perform both phases of the Compiler and execute the result.
- The `expand` runtime function can be used to perform expansion alone, typically using the `*initial-expander*`.
- The `compile` runtime function can be used to execute the expansion and compilation phase (i.e. without execution).

## Expansion

Expansion takes a form (usually defined in Convex Lisp, but can be an alternate language or DSL) and fully expands this to an expanded Form suitable for compilation.

Expansion follows the general mechanism outlined in *Dybvig, R.K., Friedman, D.P. & Haynes, C.T. Expansion-passing style: A general macro mechanism* which provides a powerful framework for composable expanders, more powerful and flexible than traditional macro mechanisms.

An expanded form may include:
- Convex Lisp forms excluding macros and expanders (these should already have been fully expanded)
- Syntax Objects, which may be used to annotate certain values with metadata
- Raw CVM Ops (already compiled)

## Compilation

Compilation takes an Expanded form and converts it into a CVM Op (which typically includes a tree of child Ops), according to the compilation rules specified below.

NOTE: Compilation of already compiled CVM Ops is simply the identity function: The pass-though of CVM Ops in this way is useful for implementations of custom languages on the CVM - for example, arbitrary languages can be compiled and executed within an `eval` operation through the use of custom Expanders.

### Overall Form handling

- If the input is already a CVM Op, it is returned directly as the output
- If the input is a symbol, the symbol is compiled as a symbolic lookup in the current environment (see below)
- If the input is an empty data structure, the Output is a Constant Op for the data structure
- If the input is a List:
  - Lists starting with special symbols denoting CVM Ops (e.g. `do`, `def`) are compiled as the appropriate Op, with remaining list elements handled according to the special op definition
  - List starting with special symbol relating to quoting (e.g. `quote`, `unquote`) are handled according to quoting semantics  
  - Otherwise, the output is an Invoke Op, invoking the compiled first element as a function, with the remaining elements compiled as arguments
- If the input is `Map`, `Set` or `Vector`, the output is an Invoke Op calling one of the following constructor functions, with each argument formed by compiling the corresponding element of the data structure in sequential order:
  - `(vector arg1 arg2 ... argN)`
  - `(hash-map k1 v1 k2 v2 ... kN vN)`
  - `(hash-set arg1 arg2 ... argN)`
- Otherwise, a Constant Op is produced which returns the Input unchanged

NOTE: If construction of a List is required, users should either quote the list or use the constructor `(list arg1 arg2 ... argN)` explicitly to avoid interpretation as a function application.

### Symbolic lookup

When compiling a symbol, the following possibilities are checked in turn:
1. If the symbol references a lexically defined value on the stack (e.g. from `let`) then it is compiled as a direct `Local` lookup Op
2. If the symbol references a special op e.g. `*balance*` it is compiled to the appropriate `Special` CVM op (see below)
3. If the symbol starts with `#` a check is performed to see if it matches a core definition such as `#%count`, in which case that value is used as a constant
4. If the symbol references an existing value in the current environment, then:
  1. If that symbol is defined with `^:static` metadata flag it is compiled as a constant equal to that defined value
  2. Otherwise, a `Lookup` op is created to refer to the exiting definition
5. Otherwise, a dynamic `Lookup` op is constructed to resolve the symbol at runtime

### Special Ops

Special Ops are conventionally named with "earmuffs" like `*address*` are are intended to provide efficient access to CVM execution information from the current convex. 

Developers SHOULD prefer Special Ops over alternate methods of accessing such information, as it is likely to be benefit from special optimisations in the CVM and correspondingly lower juice costs.

The Special Ops available are defined in [CAD005](../005_cvmex/README.md)

### Quoting

The special symbol `quote` leaves its argument unexpanded and unevaluated.

Quote is most useful where developers wish to express CVM data structures (which may include Convex forms) without evaluating them.

The compiler MUST compile `quote` forms to a `Constant` CVM op

### Compiler Errors

If the Compiler encounters any unexpected input, it MUST return an Error (often `:COMPILE` or `:SYNTAX`). 

However, Clients SHOULD NOT rely on a specific Error Code, because:
- Expanders may produce arbitrary Error Codes
- More specific CVM Errors such as `:JUICE` or `:DEPTH` may occur in some cases
- Compilation Error Codes may be changed in future Network Upgrades

Users making use of the Compiler SHOULD ensure that they avoid error cases as far as possible by ensuring that they only provide correct input.

### Compiler Costs

The Expansion Phase incurs a Juice Cost according to the cost of any expanders used (which may be user defined in regular CVM code). The `*initial-expander*` incurs small constant costs for each element expanded. In normal usage, expansion costs are therefore usually `O(n)` in the size of the Form being expanded, but can be arbitrarily large if custom macros or expanders are used.

The Compilation Phase incurs a constant Juice Cost for each node of the Expanded Form processed. Compilation costs are therefore never more than `O(n)` in the size of the Expanded Form.

Juice Consumed is accounted for in the normal way (i.e. it will be charged for as part of the transaction executing the compiler, and the transaction will fail if any limits are exceeded). 

