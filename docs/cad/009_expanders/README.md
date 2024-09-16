# CAD009: Expanders and Macros

## Overview

The CVM provides the facility for advanced macro capabilities for on-chain code generation.

Macros are run at compile time, and can perform arbitrary code transformations. As such, they offer a number of advantages over regular functional code:

- They can perform optimisations, e.g. pre-computing certain values at compile time
- They can be used to extend the Convex Lisp language with new language constructs that would not be expressible as a regular function


## Key Components

### Forms

Forms are code represented as data, in the manner of Lisp, e.g. a List

`(+ 1 2)`

Where the list contains the Symbol `+` followed by the Long values `1` and `2`.

### Expanders

Expanders are functions that transform code as a Convex Lisp form into a replacement form. Expander functions have the signature:

`(fn [x e] ....)`

Where:
- `x` is the form to be transformed
- `e` is a continuation expander, i.e. another expander which may be called recursively to expand further forms.

Expanders stored in the environment MUST have the metadata `{:expander true}` set in order to be recognised as expanders by the compiler Expansion Phase.

Typically an Expander will:
- Perform some specialised code expansion
- Call the Continuation Expander on the result and / or parts of the result with the pattern `(e z e)`

However, Expanders are extremely flexible. It is perfectly possible to create Expanders which vary this logic. e.g.

- Changing the Continuation Expander call to `(e z identity)` will cause the continuation expander to expand only once (useful e.g. for debugging and tests)
- Omitting any calls to the continuation expander gives this Expander the final say on the resulting form
- Using itself as the continuation expander, an expander can implement a custom language.

For more information, it is worth referring to the 1988 paper "Expansion-passing style: A general macro mechanism" (Dybvig, Friedman & Haynes) which describes this elegant approach in more detail.

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

- `*initial-expander*` is implemented in optimised Java for performance reasons. It is however possible to implement custom expanders in pure Convex Lisp.
- Expanders MAY make use of tail recursion to avoid consuming CVM stack depth on multiple expansions, since the call to the Continuation Expander often occurs in tail position.

## Process

In the expansion phase of compilation, a source code form MUST be expanded according to the relevant expander (`*initial-expander*` by default)

If the relevant expander is `e` and the source form is `x`, the expanded form is the result of calling `(e x e)`

The expanded form SHOULD be a fully expanded form that will successfully compile in the current context, i.e. is valid code that requires no further expansion.   

## Examples

### Defining macros

Macros can be defined with `defmacro` and are simple expanders that return a transformed form (which may then be subject to further expansion). The example below is a macro that converts a tree-like source form into an arithmetic operation that returns the size of the tree.

```clojure
;; A macro that counts the number of nodes in a nested tree data structure (including the parent)
(defmacro tree-size [c]
  (cond
    (coll? c) (cons '+ 1 (map (fn [x] `(tree-size ~x) ) c))
    :else 1))

;; Using the macro is simple: just put in operation position (first element of list)
(tree-size [1 2 [3 4]])
=> 6

;; this is the full macro expansion of the above example
(expand '(tree-size [1 2 [3 4]]))
 => (+ 1 1 1 (+ 1 1 1))

;; This is a single stage of expansion
(expand-1 '(tree-size [1 2 [3 4]]))
 => (+ 1 (tree-size 1) (tree-size 2) (tree-size [3 4]))

;; Note this works totally fine on source code forms, which are not executed.
;; This wouldn't be possible with a regular function (you would need to quote the source code)
(tree-size (count [1 2 3]))
=> 6
```





