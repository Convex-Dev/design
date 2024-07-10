# Convex Design & Documentation

This repository is dedicated to Convex Design and Documentation

## Key Documents

- [Convex Manifesto](papers/manifesto.md)
- [Convex White Paper (Draft)](papers/convex-whitepaper.md)

## Current CADs

Convex Architecture Documents (CADs) are defined for standards relating to the Convex network and ecosystem, in a manner inspired by Internet RFCs.

| Code                             | Title                            | Status     | Editor
| ------------------               | -------------------------------- | ---------- | -----------
| [CAD000](cad/000_principles)     | Design principles                | Active     | mikera
| [CAD001](cad/001_arch)           | Vision & Architecture            | Active     | mikera
| [CAD002](cad/002_values)         | CVM Values                       | Active     | mikera
| [CAD003](cad/003_encoding)       | Encoding Format                  | Active     | mikera
| [CAD004](cad/004_accounts)       | Account Model                    | Pending    | mikera
| [CAD005](cad/005_cvmex)          | CVM Execution                    | Initial    | mikera
| [CAD006](cad/006_memory)         | Memory Accounting                | Active     | mikera
| [CAD007](cad/007_juice)          | Juice Accounting                 | Pending    | mikera
| [CAD008](cad/008_compiler)       | Convex Lisp Compiler             | Pending    | mikera
| [CAD009](cad/009_expanders)      | Expanders and Macros             | Pending    | mikera
| [CAD010](cad/010_transactions)   | Transactions                     | Pending    | mikera
| [CAD011](cad/011_errors)         | Error Handling                   | Active     | mikera
| [CAD012](cad/012_numerics)       | Numerics                         | Pending    | mikera
| [CAD013](cad/013_metadata)       | Metadata                         | Initial    | helins
| [CAD014](cad/014_cns)            | CNS Registry                     | Pending    | mikera
| [CAD015](cad/015_peercomms)      | Peer Connection Protocol         | Pending    | mikera
| [CAD016](cad/016_peerstake)      | Peer Staking                     | Pending    | mikera
| [CAD017](cad/017_peerops)        | Peer Operations                  | Pending    | mikera
| [CAD018](cad/018_scheduler)      | Scheduler                        | Pending    | mikera
| [CAD019](cad/019_assets)         | Asset Model                      | Draft      | mikera
| [CAD020](cad/020_tokenomics)     | Tokenomics                       | Draft      | mikera
| [CAD021](cad/021_observability)  | Observability                    | Draft      | mikera
| [CAD022](cad/022_trustmon)       | Trust Monitors                   | Draft      | mikera
| [CAD023](cad/023_keystore)       | Local Key Store                  | Draft      | mikera
| [CAD024](cad/024_data_lattice)   | Data Lattice                     | Draft      | mikera
| [CAD025](cad/025_wallet)         | HD Wallets                       | Draft      | mikera
| [CAD026](cad/026_lisp)           | Convex Lisp                      | Draft      | mikera
| [CAD027](cad/027_log)            | Event Logging                    | Draft      | mikera
| [CAD028](cad/028_dlfs)           | Data Lattice File System         | Draft      | mikera
| [CAD029](cad/029_fungible)       | Fungible Token Standard          | Draft      | mikera
| [CAD029](cad/030_torus)          | Torus DEX                        | Draft      | wildyelir

## Convex Project Repositories

There are the key repositories managed under the Convex-Dev organisation on GitHub.

The main [Convex repository](https://github.com/Convex-Dev/convex) is the primary code base, and includes important modules including:
- `convex-core` - the core Convex data structures and algorithms including CPoS
- `convex-peer` - Convex peer implementation and P2P networking
- `convex-gui` - Convex Desktop GUI Application
- `convex-restapi` - REST API Server implementation

| Name                                                         | Description                                   | Status     | Lead Dev.
| -------------                                                | --------------------------------              | ---------- | -----
| [Convex](https://github.com/Convex-Dev/convex)               | Main Convex distribution                      | Active     | mikera
| [Convex Design](https://github.com/Convex-Dev/design)        | Architecture and design documents             | Active     | mikera
| [convex-web](https://github.com/Convex-Dev/convex-web)       | Website and live sandbox (convex.world)       | Active     | pedrorgirardi
| [convexity](https://github.com/Convex-Dev/convexity)         | Mobile application and wallet                 | Active     | pedrorgirardi
| [convex-api-py](https://github.com/Convex-Dev/convex-api-py) | Python REST client                            | Active     | billbsing
| [convex-api-js](https://github.com/Convex-Dev/convex-api-js) | NodeJS REST client                            | Active     | billbsing
| [convex.cljc](https://github.com/Convex-Dev/convex.cljc)     | Clojure libraries, Convex Lisp Runner         | Active     | helins

## Ecosystem Projects

We maintain a list of [Ecosystem Projects](ecosystem/index.md) as a shared resource for the community. 

If you would like your project listed, please send a PR for the linked page.

## Contributing

Contributions to this repository are welcome. Contributors may clarify existing design documents, or propose new formal specification changes to Convex by opening issues or pull requests.

For questions and broader discussions, please join the Convex Discord channel (https://discord.com/invite/xfYGq4CT7v).

Contributors are recommended to consult the broader community first before developing new proposals or improvements.

## License

Copyright 2020-24 Convex Foundation (UK) and contributors.

Contributors retain copyright in their contributions, but agree that the Convex Foundation may freely distribute these contributions under any license of its choice.

In exchange for using the information contained within this repository, you agree not to hold the Convex Foundation, its affiliates or any other party in the Convex ecosystem liable for any possible claim for damages arising from any decision you make based in whole or in part on information made available to you through this repository.
