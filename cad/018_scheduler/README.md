# Scheduler

Error handling is a critical feature of all good code, and therefore requires special consideration on the CVM.

## General Design Principles

### Concept of State timestamps

### Guaranteed execution

### Security

### Execution costs

The scheduler MUST impose a low overhead per scheduled operation, maximum O(log N) with the size of the schedule. This is necessary to prevent DoS attacks thorugh excessive scheduling operations.

The account performing a schedule operation MUST be charges fair costs for execution and memory usage. Again, this is necessary to prevent DoS attacks.

The scheduler MUST reclaim memory by deallocating any state associated with any goven scheduled operation. This is necessary to avoid long term state growth problems.

## Operations

### Schedule

### Query until

### Drop

