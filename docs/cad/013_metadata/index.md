# CAD013: Metadata

## Overview

The CVM provides a facility for attaching a metadata map to a defined symbol. The purpose of metadata is to provide any information on a defined symbol independent of the value this symbol holds.

Some metadata information, if specified, MUST follow a particular structure for external purposes. For instance, this CAD describes how to document a symbol by following an expected structure.

Other information in metadata CAN follow any arbitrary structure. Creators of such SHOULD collaborate with the community to establish useful standards where appropriate (which may include updates to this CAD)

## Usage

### Declaring metadata

Metadata is a map containing any arbitrary set of key-values. It is specified after the defined symbol, prefixed with `^`:

```clojure
(def some-symbol
  ^{:my ["meta" :data]}
  42)
```

As in other Lisps, `^:flag` is shorthand for `^{:flag true}` — this is the usual way of setting boolean flags such as `:callable`.

### Retrieving metadata

The core library defines a function for retrieving metadata:

```clojure
(lookup-meta 'some-symbol)

;; Following previous example, returns `{:my ["meta" :data]}`
```

Each account stores a map of `symbol` to `metadata map` under `:metadata`:

```clojure
(get (account *address*)
     :metadata)

;; Following previous examples, returns `{'some-symbol {:my ["meta" :data]}}`
```

## Standard metadata keys

The following top-level metadata keys have defined meanings:

| Key | Meaning | Enforced by |
|-----|---------|-------------|
| `:doc` | Documentation map (see below) | Convention only |
| `:callable` | Function may be invoked on this account via `call` | CVM |
| `:expander` | Value is an expander (see [CAD009](../009_expanders/index.md)) | Compiler |
| `:special` | Symbol is a CVM special symbol (used in core metadata only) | Convention only |
| `:private` | Definition is internal and not part of the account's public interface | Convention only |

`:callable` is the one flag with direct CVM semantics: `(call actor (f ...))` succeeds only if `f` is defined in the target account with truthy `:callable` metadata. `:private` is advisory — the CVM does not restrict access to private definitions, so it MUST NOT be relied on for security.

Keys not listed here (and not `:doc` sub-keys below) are unreserved: applications MAY attach any additional metadata. Consumers MUST ignore metadata keys they do not recognise.

## Standard structures

For some purposes, metadata must follow at least a set of constraints so that the CVM or any external consumer has access to relevant information.

### Documentation

Attaching documentation to a symbol allows any user to gain insight about the purpose of that symbol. Notably, it can provide information regarding how a function is
intended to be used and why.

User MAY specify any information as described below. None is mandatory. When specified, structure MUST conform as expected by any external consumer.

A documentation map MAY be attached to metadata under `:doc`.

Reference example:

```clojure
(defn add

  ^{:doc {:description "Adds 2 numbers together."
          :errors      {:CAST "If an argument cannot be cast to a number"}
          :examples    [{:code "(add 2 3)"}]
          :signature   [{:params [a b]
                         :return Number}]
          :type        :function}}

  :implementation...)
```

Documentation map MAY contain any of the key-values described in the following subsections.

#### `:description`

Human-language description of the symbol: either a single string, or a vector of strings where each string is one paragraph. Both forms are used in the core library — use the vector form when the description benefits from paragraph breaks.

```clojure
:description ["First paragraph."
              "Second paragraph."]
```

#### `:errors`

Assuming the symbol is callable, map of `error code` to `string` describing in human language how and why calling this function might fail.

See also [CAD 011](../011_errors/index.md) about errors.

#### `:examples`

Assuming the symbol is callable, vector of examples where an example is a map which MAY contain:

| Key | Value |
|---|---|
| `:code` | String, excerpt of code demonstrating a function call |

`:code` is deliberately a string rather than a quoted form: it is display text for documentation tools, holds no cell references to other structures, and can show reader syntax exactly as a user would type it.

No other example keys are currently standardised (expected results, where useful, are conventionally shown within the `:code` string or the description). Consumers MUST ignore example keys they do not recognise; additional keys may be standardised by future updates to this CAD.

#### `:signature`

Assuming the symbol is callable, vector of signatures (one per arity) where a signature is a map which MAY contain:

| Key | Value |
|---|---|
| `:params` | Vector of parameter symbols, possibly including `&` for variadic arguments |
| `:return` | Symbol naming the type of the returned value |

`:return` values are descriptive type names from the CVM type system (e.g. `Boolean`, `Long`, `Double`, `String`, `Blob`, `Address`, `Vector`, `Map`, `Set`, `Sequence`, `DataStructure`, `Number`, `Any`). They are documentation for humans and tools — the CVM does not check them.

#### `:type`

Keyword designating what category the symbol belongs to:

| Keyword | Meaning |
|---|---|
| `:function` | Symbol is a regular function |
| `:macro` | Symbol is a macro |

Other values are not currently standardised and require an update to this CAD. Note that the core library marks special symbols with the top-level `:special` flag rather than a `:type` value.

### Expanders

As described in [CAD 009](../009_expanders/index.md), expanders MUST have at least `{:expander true}` in their metadata. This is how the compiler recognises that a definition should be applied as an expander during expansion.

The key is `:expander` (not `:expander?`): the flag was defined before the question-mark convention settled, and renaming it would break every existing expander definition, so the original spelling is retained.

Example (evaluate the `def` first — an expander must already be defined when a form using it is expanded, so defining and using it in the same form will not work):

```clojure
(def greet
  ^{:expander true}
  (fn [x e]
    (let [[_ name] x]
      (e `(str "Hello, " ~name) e))))

(greet "World")
;; => "Hello, World"
```

Macros are a special case of expanders: `defmacro` sets `:expander` metadata automatically. See CAD009 for expansion semantics.
