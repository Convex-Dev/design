# Account Control

Convex has a unique feature with **account controllers**. Account controllers can execute code in the context of accounts that they control allowing powerful capabilities such as:
- Resetting an account's public key
- Switching to a different controller
- Updating code within an account

There are two primary uses for account controllers:
- Providing a way to backup and restore a user's account
- Allowing an autonomous actor to be upgraded or modified by another user or actor

## Checking for a controller

Account records are publicly visible as as part of the Convex global state, you you can examine an account at any time to see if a controller is set.

Remember to run this in "Query" mode so that you don't pay any transaction fees:

```clojure
(account #1567)

;; Result will look something like this:
=> {:sequence 0,
    :key 0x89b5142678bfef7a2245af5ae5b9ab1e10c282b375fa297c5aaeccc48ac97cac,
    :balance 5000000000,
    :allowance 0,
    :holdings nil,
    :controller #202,
    :environment nil,
    :metadata nil,
    :parent nil}
```

If the `:controller` field is `nil` there is no controller. Otherwise the controller is the value specified, in this case the account `#202`.

## Running code in an account you control

If you are the controller for another account, you can do the following:

```clojure
(eval-as #1567 '(def some-data [1 2 3]))
```

This will run the quoted code in the context of the controlled account (in this case `#1567`). A controller can *execute arbitrary code*, in this case we are defining some new data in the account with the symbol `some-data`.

:::tip
When using `eval-as` always remember to "quote" the code with `'` or `` ` `` to ensure that you send the literal code to the controlled account, rather than evaluating it as an expression in your own account! 

If unsure you can use `(assert *caller*)` in your code to ensure that the code is being run in the controlled account.
:::

Assuming you ran the above in "Transact" mode, you can verify that this change has actually occurred in the controlled account:

```clojure
#1567/some-data
=> [1 2 3]
```

## Common control actions

At this point is should be clear that you can effectively do anything in the controlled account! But here are some of the most common things you may wish to do:

### Reset a public key for a user account

Suppose your friend lost their key pair. Luckily, they set you as a controller for their account so you can reset their key! Just get them to give you their new public key and using this do:

```clojure
(eval-as #1567 
  '(set-key 0x89b5142678bfef7a2245af5ae5b9ab1e10c282b375fa297c5aaeccc48ac97cac))
```

Et voila! They can now use their account again 😃.

### Upgrade an actor

Let's say you want to upgrade an actor you already created to add a new callable function. As the account controller, this is no problem!

```clojure
(eval-as #1567
  '(defn ^:callable account-info [] (account *address*)))
```

This will run the `defn` in the controlled account, defining a new callable function which you can now call in the usual way:

```clojure
(call #1567 (account-info))
```

It is *strongly recommended* that you add tests to such upgrade operations, so that you can verify that you have not broken anything and that the actor functions as intended. If you run such tests in the same transaction that does the upgrade, then you can ensure that the upgrade gets rolled back in case of failure:

```clojure
(do 
  ;; Run the upgrade first
  (eval-as #1567
    '(defn ^:callable account-info [] (account *address*)))
  
  ;; Test that the function works
  (if (call #1567 (account-info))
    :OK
    (fail :ERROR "Upgrade failed, rolling back changes"))
  )
```

### Clear the controller

You've been working on your awesome smart contract actor for months, and it has been battle tested and security audited with a growing fan base of loyal users. Originally, you set yourself as the controller so you could upgrade and make fixes to the actor, but now you are 100% convinced it is perfect and want to make it immutable:

```clojure
(eval-as #1567 
  '(set-controller nil))
```

:::warning
Only do this if you are *really* sure you want the actor to be immutable forever. There's no way back if you remove your final access capability as a controller.
:::