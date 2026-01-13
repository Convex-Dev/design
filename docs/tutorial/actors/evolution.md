---
slug: evolution
title: Evolution
sidebar_position: 2
---

Convex is designed for real-time dApps and self-sovereign economic systems.

This is a rapidly evolving space, and it is likely that actors will need to be upgraded to access new capabilities. While in an ideal world, you might want actors be be completely immutable in terms of their behaviour, in practice this is often not desirable and you want to upgrade and evolve them.


## Upgradable Actors

A key risk of developing smart contracts is that once they are live, significant losses may occur if bugs are found. Losses could be from theft by malicious actors that manage to exploit a security weakness, or a bug that causes assets to be permanently lost.

It is therefore *an option* to make actors upgradable. This is a trade-off: You gain the ability to patch problems in the original smart contract, but also open up the possibility that this upgrade feature itself may be exploited by attackers or accidentally misused.

## Example approach - Account controller

The simplest way to make an actor upgradable is to the the `*controller*` account feature, which allows the controller account to use the `eval-as` function to update the actor.

```clojure
;; Deploy an empty, upgradable actor that is empty but has the controller set
;; Note: *caller* within deployed code is always the account that called deploy
(def UP-ACTOR 
  (deploy '(set-controller *caller*)))

;; add a callable function to the actor
(eval-as UP-ACTOR
  '(defn ^:callable hello [] "Hello upgrade!"))

;; Check the newly added function works!
(call UP-ACTOR (hello))
=> "Hello upgrade!"
```



## Example approach - Trusted upgrade

You can also write a `:callable` function that performs the upgrade. This requires slightly more code than simple setting a `*controller*` however it has some advantages:
- You can write custom logic to validate whether the caller has upgrade rights
- You can make the upgrade specific to a particular part or feature of the actor
- This can be more secure than allowing a general `eval-as` 

```clojure
;; deploy an upgradable Actor
(def UPGRADABLE
  (deploy 
    '(do
       ;; make the initial deployer be the owner
       (def owner *caller*)
       
       ;; initial version of the upgradable function
       (defn ^:callable get-version [] 
         "Version 1")

       ;; upgrade function (only callable by owner)
       (defn ^:callable upgrade [new-impl]
          (if (= *caller* owner)
            (set! get-version new-impl )
            (fail :TRUST "Not authorised to upgrade"))))))

;; Check initial version of function
(call UPGRADABLE (get-version))
=> "Version 1"    

;; Check we are the owner!
(= *address* UPGRADABLE/owner)
=> true       

;; Upgrade the callable function to a new function definition
(call UPGRADABLE 
  (upgrade (fn [] (str "Version " (inc 1) " - dynamically computed"))))
        
;; Call the new function
(call UPGRADABLE (get-version))
=> "Version 2 - dynamically computed" 
```

## Security Risks

Adding a general-purpose upgrade feature like this lets you correct bugs or add new enhancements to actors, but it opens the risk that the same mechanism could be used to compromise the actor's behaviour if an attacker were able to impersonate the owner, and also creates the risk that the actor may be permanently disabled by the owner by mistake. 
 
As always, you must perform your own security analysis to determine whether this trade-off is worthwhile for actors that you deploy.

Here are some recommended security practices for upgradable actors:

### Security of Owner / Controller account

Compromise of the controller account is the biggest risk, as this account may be able to make arbitrary changes to the actor. Ideally, for this account:

- Highest security measures should be used - ideally air-gapped usage with secure physical backups
- Upgrade transaction should be signed offline then transferred to an internet-connected computer for submission to the network

### Bundle the upgrade code with checks

By adding checks to the upgrade code that fail if an assumption is not met, you can ensure an automatic rollback of any failed upgrade

## Immutable actors

If you are sure your actor logic will never change, you can make it immutable. This is done by:

- Setting `*key*` to `nil` so that no external transactions will be accepted
- Setting `*controller*` to `nil` so that no external transactions will be accepted
- Ensuring there are no callable functions that can make changes to any code (e.g. using `eval` or `defn`) 

The above are true by default when you call `deploy`, so the following will make an immutable actor:

```clojure
(deploy 
  ;; Accept any offered coins
  '(defn ^:callable receive-coin [_ _ _] (accept *offer*))

  ;; Let anyone collect coins (a public donation, if you like....)
  '(defn ^:callable collect-coins [] (transfer *caller* *balance*)))
```

If you have an existing actor that you want to make immutable, you will need to remove any upgradability. This can be done with something like the following (if you are the controller of the actor):

```clojure
(eval-as ACTOR
  '(do 
     ;; Safety check to make sure we are not accidentally making ourselves immutable!
     ;; - Must execute in a called account (in this case via eval-as)
     ;; - Must not run in the account of the *caller* itself
     (assert *caller* (not (= *caller* *address*)))  
     
     (set-controller nil)     ;; Remove controller
     (set-key nil)            ;; Remove any external account key
     (undef upgrade-function) ;; Remove any callable function that allows upgrades
     ))
```


