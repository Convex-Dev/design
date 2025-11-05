---
title: Convex Desktop
authors: [convex]
tags: [convex]
sidebar_position: 0
---

# Convex Desktop

Convex Desktop is a GUI tool for interacting with Convex. Designed for developers and power users, it puts all the capabilities of Convex at your fingertips.

![Convex Desktop Screenshot](convex-desktop.png)

## Installation

Convex Desktop requires:
- A recent version of Java (21+, Java 22 recommended)
- A GUI based operating system (e.g. Windows, Linux or MacOS)
- A copy of the `convex.jar` executable jar file

Java is available from multiple providers, we recommend:
- [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)
- [Eclipse Temurin JDK](https://adoptium.net/temurin/releases/) 

Snapshots of the `convex.jar` file are currently available here: [Convex Snapshots](https://drive.google.com/drive/folders/1AZdyuZOmC70i_TtuEW3uEKvjYLOqIMiv?usp=sharing)

## Running Convex Desktop

If Java is correctly configured, you should be able to run Convex Desktop simply by double-clicking on the `convex.jar` file which will run Convex Desktop as an executable. On some systems, you may need to grant permissions to run a downloaded executable file.

Alternatively, to run Convex Desktop, you can run the following command from the command prompt, script or GUI shortcut:

```
java -jar convex.jar desktop
```

## Introduction for non-crypto Developers

### What is Convex?

- A platform for building decentralised applications (dApps)  
- Provides sub-second performance at 10k+ transactions per second (TPS) on a public or private network  
- Immutable data stores, securely encrypted

### Convex Desktop

- Create Convex accounts and Peers via a graphical user interface (GUI) for operating networks
- Allows developers to generate test networks and secure crypto keys prior to production use
- Prepare and test transactions before committing to execution or paying fees
- Manage a wallet for storing keys and account balances
- In production, earn fees for staking and operating Peers 
- Use for global scale payments and gaming

### Getting Started

- Compatible with Windows, Linux, and MacOS
- Requires Java 21 or higher
- Download the latest convex.jar from Convex Snapshots
- Learn Convex Lisp for more advanced functions

<img width="462" alt="image" src="https://github.com/user-attachments/assets/a8fe1f34-50d1-4dfb-bf77-d0a3d86ef20b" />




## Step 1a: Hacker Tools KeyGen
<img width="428" alt="image" src="https://github.com/user-attachments/assets/33c74dff-de8c-41a3-ac57-b76ec5d02081" />

- Click Generate – 12 words appear in seed Phrase
- Enter Passphrase (lower case)
- Record both somewhere safe. DON’T LOSE
- Ignore Key Derivation
- Copy Private Ed25519 seed somewhere safe. DON’T LOSE. DON’T SHARE. This is also known as Private Key
- Copy Ed25519 Public Key. Can be shared
- Remember identicon.  It will be useful later
- Normalise mnemonic sets lower case
- Click Add to keyring
## Step 1b: Hacker Tools Load Keystore
<img width="460" alt="image" src="https://github.com/user-attachments/assets/213b510c-de97-45db-a5cf-fedfabcb310f" />

- Icon for swift recognition 
- Public key to share
- Source = location of keystore 
- Lock for extra security, keep separate from other keys and passphrases.
