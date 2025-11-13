---
slug: deployment
title: Deployment
sidebar_position: 1
---

## Actor deployment

Actors are typically deployed with the `deploy` function, which does the following:

- Creates a new, empty account in the CVM state
- Executes some code in that account
- Returns the address of the new account

You can use `deploy` to create a new actor. 

## Testing

It is **extremely important** to ensure that the deployed code is correct - you may lose control of the account and/or have a non-working actor. A good idea is to test the deployment within a query:

```clojure
;; Run in a query to check everything works
(let [code <ACTOR-CODE>
      test-output (query 
                    (def ACTOR (deploy code))
                    (run-some-tests ACTOR))]
    
    ;; Do the actual deploy only if test results were satisfactory
    (if (tests-successful? test-output)
       (deploy code)
       (fail :FATAL "Something went wrong in deployment tests")))
```

Since code executed in `query` is rolled back, it is safe to test the deployment in this way. 

Since the whole transaction is atomic, if the deployment worked in the test phase then it should work identically for the actual deployment (in some very unusual circumstances it might behave differently, e.g. if your deployed code depends on something in the CVM execution context that is not rolled back like `*juice*`)




