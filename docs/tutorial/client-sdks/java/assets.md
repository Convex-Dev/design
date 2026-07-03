---
sidebar_position: 7
---

# Assets

Convex has no special "token" primitive — fungible tokens and named assets are ordinary [actors](/docs/cad/fungible) you deploy and call. This guide issues and moves a fungible token from Java using the CVM-typed `convex.api.Convex` client.

:::note Which client?
These examples use the typed `convex.api.Convex` client (CVM values and `Result`), consistent with the rest of the Java guide — see [Clients](clients.md). The `convex.java.asset` package (`TokenBuilder`, `Fungible`) offers convenience wrappers built over the simpler `ConvexJSON` client; handy for quick scripts, but the typed client preserves full CVM type fidelity.
:::

The snippets below assume a connected `Convex convex` with a key pair and address set (see [Clients](clients.md)), and that `myAddress` is your account's `Address`.

## Deploy a token

```java
import convex.api.Convex;
import convex.core.Result;
import convex.core.lang.Reader;
import convex.core.cvm.Address;

Result deploy = convex.transact(Reader.read(
    "(deploy [(@convex.fungible/build-token {:supply 1000000})])")).get();
Address token = (Address) deploy.getValue();   // the token's actor address
```

## Check a balance

```java
Result r = convex.query(Reader.read(
    "(@convex.fungible/balance " + token + " " + myAddress + ")")).get();
long balance = ((Number) r.getValue()).longValue();   // 1000000
```

## Transfer tokens

The generic `convex.asset` library moves any asset; the amount is paired with the token as `[token amount]`:

```java
Address recipient = /* ... */;
convex.transact(Reader.read(
    "(@convex.asset/transfer " + recipient + " [" + token + " 1000])")).get();
```

## Convenience: TokenBuilder

If you are using the `ConvexJSON` client, the `convex.java.asset` package wraps the same operations in a fluent API:

```java
import convex.java.asset.TokenBuilder;
import convex.java.asset.Fungible;

Fungible token = new TokenBuilder().withSupply(1_000_000).deploy(convexJSON);
long balance = token.getBalance();
```

## See Also

- [CAD029: Fungible Token Standard](/docs/cad/fungible)
- [Transactions](transactions.md) — submitting and confirming transactions
- [Clients](clients.md) — choosing the right Java client
