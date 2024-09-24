# CAD013: Metadata

## Overview

The CVM provides a powerful facility for attaching a metadata map to a defined symbol. The purpose of metadata is to provide any information on a defined symbol independent of the value this symbol holds.

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

## Standard structures

For some purposes, metadata must follow at least a set of contraints so that the CVM or any external consumer has access to relevant information.

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
          :signature   [{:params  [a b]
                         :returns Number}]
          :type        :function}}

  :implementation...)
```

Documentation map MAY contain any of the key-values described in the following subsections.

#### `:description`

String describing the symbol in human language .

TODO. Also a vector of strings where each string is a paragraph for easier formatting?

#### `:errors`

Assuming the symbol is callable, map of `error code` to `string` describing in human language how and why calling this function might fail.

See also [CAD 011](../011_errors/README.md) about errors.

#### `:examples`

Assuming the symbol is callable, vector of examples where an example is a map which MAY contain:

| Key | Value |
|---|---|
| `:code` | String, excerpt of code demonstrating a function call |

TODO. Should it be a string? Is it for memory issues?
TODO. Should it also have a `:return` key-value?

#### `:signature`

Assuming the symbol is callable, vector of signatures where a signature is a map which MAY contain:

| Key | Value |
|---|---|
| `:params` | Vector of parameters |
| `:returns` | Type of returned value |

TODO. Is there a list of supported types for `:returns`? More future-proof to have a human-readable string?

#### `:type`

Keyword designating what category the symbol belongs to:

| Keyword | Meaning |
|---|---|
| `:function` | Symbol is a regular function |
| `:macro` | Symbol is a macro |

TODO. What about other values?

### Expanders

As described in [CAD 009](../009_expanders/README.md), expanders MUST have at least `{:expander true}` in their metadata.

TODO. Use `:expander?` for consistency.

TODO. Example here? Or rather in CAD009?


TODO. Other sections besides documentation and expanders?
