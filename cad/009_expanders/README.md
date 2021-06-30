# Expanders and Macros

## Overview

The CVM provides the facility for advanced macro capabilities for on-chain code generation.

Macros are run at compile time, and can perform arbitrary code transformations.

## Key Components

### Forms

Forms are code represented as data, in the manner of Lisp, e.g. a List

`(+ 1 2)`

Where the list contains the Symbol ` ``+` followed by the Long values `1` and `2`.

### Expanders

Expanders are functions that transform code as a Convex Lisp form into a replacement form. Expander functions have the signature:

`(fn [x e] ....)`

Where:
- `x` is the Form to be transformed
- `e` is a Continuation Expander, i.e. another Expander which may be called recursively to expand further forms.

Expanders MUST have the metadata `{:expander true}` set in order to be recognised as Expanders by the compiler Expansion Phase.

Typically an Expander will:
- Perform some specialised code expansion
- Call the Continuation Expander on the result and / or parts of the result with the pattern `(e z e)`

However Expanders are extremely flexible. It is perfectly possible to create Expanders which vary this logic. e.g.

- Changing the Continuation Expander call to `(e z identity)` will cause the continuation expander to expand only once (useful e.g. for debugging and tests)
- Omitting any calls to the continuation expander gives this Expander the final say on the resulting form
- Using itself as the continuation expander, an expander can implement a custom language.

For more information, it is woth referring to the 1988 paper "Expansion-passing style: A general macro mechanism" (Dybvig, Friedman & Haynes) which describes this elegant approach in more detail.

### Macros

A Macro is a specialised instanceof an Expander, with the following additional restrictions:

- It is declared using the pattern `(macro [arg1 arg2 arg3 ....])`, effectivly destructuring the form passed to the Exapnder into individual arguments. This is often more convenient and intuitive than defining Expanders directly.
- A Macro always calls the Continuation Expander as its final step on the result of the Macro. In normal usage, this implements the standard expecation that Lisp macros will be expanded recursively until a final non-macro form is produced. This also means that if a custom language is defined by the continution expander, the macro will continue expansion logic using this same custom langauge.

### Initial Expander

The core library defines `*initial-expander*` as an Expander that expands Convex Lisp. Unless explicitly overriden, this will also be the Continuation Expander for all Convex Lisp forms. The standard Convex Lisp Expansion Phase is therefore implemented by:

`(*initial-expander* form *initial-expander*)`

The initial expander executes the following logic when passed the parameters `[x e]`:

- If the Form `x` is a List which starts with an Expander `m` defined in the current Environment, return the result of calling `(m x e)`
- Otherwise, if the form is a data structure (List, Vector, Map or Set) then expand each element `y` of the data structure with `(e y e)` and return the resulting data structure.
- Otherwise, return the form unchanged

### Implementation Notes

- `*initial-expander*` is implemented in optimised Java for performance reasons
- Expanders MAY make use of tail recursion to avoid consuming CVM stack depth on multiple expansions, since the call to the Continuation Expander often occurs in tail position.








