# Creating Accounts

You need an account to transact on Convex. Maybe you have one already, but would like to give on to a friend so that they can also get into the Convex ecosystem early!

This recipe is all how to create accounts for yourself or other users.

## The Basics

An account has a numerical address, which is conventionally displayed with a `#` e.g.

```
#202
```

Addresses are allocated sequentially as new accounts are created - so get in early if you want a rare 3 or 4 digit account number!

User accounts also have a public key, which is a 32-byte hex string that looks like this:

```
0x89b5142678bfef7a2245af5ae5b9ab1e10c282b375fa297c5aaeccc48ac97cac
```

The public key ensures that only users with the correct private key can sign transactions for the account. To ensure you have the correct public key, Convex Desktop also displays identicons like the following which are a visual representation of the public Key:

![An Identicon image for the public key 0x89b5142678bfef7a2245af5ae5b9ab1e10c282b375fa297c5aaeccc48ac97cac](identicon.png)

## Making a user account

So if you want to make an account for a new user there are three steps:

1. Get the user to create and **give you their public key** - this is needed because you want them to be able to sign transactions for their own account right away!
2. Create the **account on Convex**, which will allocate a new address like `#1567`
3. Tell the user their **account address**, so they can start using it (theoretically, they can also search on the Convex global state to find which account(s) match their public key, but it's easier if you just tell them 🙂)

You can do this with a single "Transact" command at the Convex terminal:

```clojure
;; Create a new account with the specified public key
(create-account 0x89b5142678bfef7a2245af5ae5b9ab1e10c282b375fa297c5aaeccc48ac97cac)
```

This command will return the account address created:

```
#1567
```

And the new account is good to go!

:::warning
A new account created this way has zero coins, and can *only* be used with the public key you entered. If the user made a mistake (e.g. lost their public key or somebody mistyped it), you just wasted your own coins creating a useless account. Read on for tips to mitigate this risk...
:::

## Transferring some coins

A user account is useless unless it has some coins in it (which are needed to execute transactions, paying juice fees etc.). So typically, you will also want to transfer some coins to the new account. Again, this is a simple one line command:

```clojure
;; Send 10 CVM to the new account. Be careful with the number of zeros!
(transfer #1567 10000000000)
```

Assuming you have >10 CVM in your own account, this transfer will succeed and put exactly 10 CVM in the destination user account. Account `#1567` is now ready to transact!

:::tip
Just remember that each convex coin is subdivided into 1 billion coppers, so a transfer needs an extra 9 zeros: 10 CVM = 10,000,000,000 coppers 
:::

## Adding a controller for account recovery

There's a risk above that the user loses their private key, and the account and any coins transferred to it will be forever lost.... 😢 

That's a situation you usually want to avoid, so you can solve the problem by setting a **controller** that will be able to recover the account and funds if something goes wrong. The controller would typically be the same account creating the new account, but you need to set this at account creation time (after this point, the account is outside your control).

You can do this with the following code:

```clojure
;; Deploy a new account, setting the key and controller account
;; Note the ' : you want to quote the code so it runs in the newly deployed account, not your own!
(deploy '(do 
  (assert *caller*)   ; This is a safety check to make sure the *caller* exists
  (set-key 0x89b5142678bfef7a2245af5ae5b9ab1e10c282b375fa297c5aaeccc48ac97cac) 
  (set-controller *caller*)))
```

## Putting it all together

So we've seen that a good strategy for issuing new accounts is to create them with the correct public key, set a controller for account recovery, and send some CVM so the new user can get going.

To automate this, you might want to create a helper function:

```clojure
(defn distribute [key coins]
  (let [code `(do 
                (assert *caller*)   ; Safety check to make sure the *caller* exists
                (set-key ~key)      ; Set key for the account, ~key unquotes the function argument
                (set-controller *caller*))  ; Set the controller for account recovery
        addr (deploy code)]
    (transfer addr (* coins 1000000000))
    addr))               ; finally return the new address
```

With this defined, you can now distribute new accounts with 5 CVM as follows:

```clojure
(distribute 0x89b5142678bfef7a2245af5ae5b9ab1e10c282b375fa297c5aaeccc48ac97cac 5)
```

## Removing the controller

Once a user has received their account and is successfully using it, they may wish to remove the controller (or set to to something else) so that the original account creator no longer has control. This can be done with the following command:

```clojure
(set-controller nil)
```

A better option is to set it to the account address of someone you trust:

```clojure
(set-controller #14) ;; Assuming #14 is a someone you trust to restore your account in an emergency
```

