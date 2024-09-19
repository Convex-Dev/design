# Peer Container

Convex is packaged in the Peer Container for easy deployment via Docker-based systems

![Docker Peer Container](peer-container.png)

## Installation

To run the peer container locally, you will need to install [Docker](https://www.docker.com/). You can use either the Docker CLI or Docker Desktop.

The Peer Container is packaged as a docker container available on DockerHub

- [Peer Container on DockerHub](https://hub.docker.com/repository/docker/convexlive/convex)

The latest version is general available in docker as `convexlive/convex:latest`

To run the peer container locally, you will need to install [Docker]()

## Running a Peer Container

Running the Peer Container is a one-liner:

```bash
docker run --name my-peer -d convexlive/convex:latest -p 8080:8080
```

This will run a default peer, with port 8080 mapped.

However, to operate a peer effectively some configuration is required.

### SSL Certificates

If you want your peer to use HTTPS (highly recommended) you probably want to provide SSL certificates.

### Peer Keys

Each peer require a "peer key", which is an Ed25119 key pair. The public key is used to identify the peer on the network, and the private key is used by the peer to sign its interactions with the lattice / CPoS consensus.

### Controller keys

We recommend that you DO NOT add peer controller keys to a Convex peer container. Reasons for this:
- Peer controller keys have control over significant economic assets, in particular the peer's stake on the Convex Network
- If the system running the docker container is compromised, the controller key may be stolen

Instead, is is best to operate the Peer Container with a peer key alone, and use a separate mechanism (e.g. a hardware wallet or air-gapped laptop) for signing transactions that require the controller key.