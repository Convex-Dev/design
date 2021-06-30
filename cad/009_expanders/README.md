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
- `e` is a continuation expander, i.e. another expander which may be called recursively to expand further forms.

Expanders MUST have the metadata `{:expander true}` set in order to be recognised as expanders.

Typically an 

### Macros

A Macro is a specialised instanceof an Expander, with the following additional restrictions:

- It is declared using the pattern `(macro [arg1 arg2 arg3 ....])`, effectivly destructuring the form passed to the Exapnder into individual arguments
- A Macro always calls the continuation expander as its final step on the result of the Macro.
