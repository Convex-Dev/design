---
sidebar_position: 4
---

# Account Management

Learn how to create, manage, and secure Convex accounts using key pairs in Java.

## Key Concepts

### Account

An **Account** represents an identity on the Convex network with:

- **Address** - Unique numeric identifier (e.g., `#1234`)
- **Key Pair** - Ed25519 cryptographic keys for signing
- **Balance** - Convex Coins (copper) owned by the account
- **Sequence** - Transaction counter (starts at 0)
- **Environment** - Variables and functions defined by the account

### AKeyPair

An **AKeyPair** contains Ed25519 cryptographic keys:

- **Account Key** - Public key shared with the network (32 bytes)
- **Seed** - Private key material, used for signing (32 bytes)

**⚠️ Never share your seed!** Anyone with it can control your account.

## Creating Key Pairs

### Generate New Keys

Create a new random key pair:

```java
import convex.core.crypto.AKeyPair;

// Generate fresh Ed25519 keys
AKeyPair keyPair = AKeyPair.generate();

System.out.println("Public key: " + keyPair.getAccountKey());
// Example: 0x36d8c5c40dbe2d1b0131acf41c38b9d37ebe04d85...
```

### Create from Seed

Restore keys from a 32-byte seed:

```java
import convex.core.data.Blob;

// 32-byte seed (keep secret!)
byte[] seed = new byte[32];
// ... load seed from secure storage ...

AKeyPair keyPair = AKeyPair.create(seed);

System.out.println("Restored public key: " + keyPair.getAccountKey());
```

### Create from Hex String

```java
// Seed as hex string
String seedHex = "5b32f8ff94d1f901098fa41a4045449726849dda5e1a3de34ae123037418795c";

Blob seedBlob = Blob.fromHex(seedHex);
AKeyPair keyPair = AKeyPair.create(seedBlob.getBytes());
```

## Exporting Keys

### Export Seed

Save the seed bytes securely:

```java
import java.nio.file.Files;
import java.nio.file.Path;

AKeyPair keyPair = AKeyPair.generate();

// Get seed bytes (32 bytes)
byte[] seed = keyPair.getSeed();

// Save to file (should be encrypted in production!)
Path keyFile = Path.of("keypair.dat");
Files.write(keyFile, seed);

System.out.println("Keys saved to " + keyFile);
```

**Best Practices:**
- Encrypt seed before saving to disk
- Store in secure location with appropriate file permissions
- Make multiple backups
- Never commit to version control

### Export as Hex

Get seed as a hex string:

```java
byte[] seed = keyPair.getSeed();
String seedHex = Blob.create(seed).toHexString();

System.out.println("Seed (hex): " + seedHex);
// 5b32f8ff94d1f901098fa41a4045449726849dda5e1a3de34ae123037418795c
```

## Account Setup

### Configure Convex Client

Set your account address and key pair:

```java
import convex.api.Convex;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;

Convex convex = Convex.connect("https://peer.convex.live");

// Generate or load key pair
AKeyPair keyPair = AKeyPair.generate();

// Set key pair for signing
convex.setKeyPair(keyPair);

// Set account address
Address myAddress = Address.create(1234);
convex.setAddress(myAddress);

System.out.println("Account configured: " + myAddress);
```

### Get Current Configuration

```java
// Get current address
Address address = convex.getAddress();
System.out.println("Address: " + address);

// Get current key pair
AKeyPair keyPair = convex.getKeyPair();
System.out.println("Public key: " + keyPair.getAccountKey());
```

## Creating Accounts

### Request Account Creation

On test networks, you can request account creation from the peer:

```java
// Generate key pair
AKeyPair keyPair = AKeyPair.generate();

// On test networks, some peers provide account creation
// This typically requires calling a specific API endpoint
// or using the peer's faucet service

// For development, you may need to use the Convex Desktop
// or CLI tools to create initial accounts
```

**Note**: On production networks, someone with an existing funded account must create your account for you. See the [Faucet Guide](/docs/tutorial/coins/faucet) for details.

### Load Existing Account

Reconstruct account from saved keys and known address:

```java
import java.nio.file.Files;
import java.nio.file.Path;

// Load seed from file
Path keyFile = Path.of("keypair.dat");
byte[] seed = Files.readAllBytes(keyFile);

// Create key pair
AKeyPair keyPair = AKeyPair.create(seed);

// Configure convex client
convex.setKeyPair(keyPair);
convex.setAddress(Address.create(1234));  // Your known address

System.out.println("Loaded account: #" + convex.getAddress());
```

## Account Properties

### Query Account Information

```java
import convex.core.lang.Reader;
import convex.core.Result;

Address myAddress = convex.getAddress();

// Query account info
Result result = convex.query(
    Reader.read("(get-account " + myAddress + ")"),
    Address.create(1)
).get();

if (!result.isError()) {
    AMap<?, ?> accountInfo = (AMap<?, ?>) result.getValue();

    // Extract properties
    Long balance = (Long) accountInfo.get(Keywords.BALANCE);
    Long sequence = (Long) accountInfo.get(Keywords.SEQUENCE);

    System.out.println("Balance: " + balance);
    System.out.println("Sequence: " + sequence);
}
```

### Check Balance

```java
Result result = convex.query(
    Reader.read("(balance " + myAddress + ")"),
    myAddress
).get();

if (!result.isError()) {
    long balanceCopper = ((Number) result.getValue()).longValue();
    double balanceCoins = balanceCopper / 1_000_000_000.0;

    System.out.println("Balance: " + balanceCoins + " CVX");
}
```

## Signing Transactions

Accounts sign transactions using their private keys:

```java
import convex.core.transactions.Invoke;
import convex.core.data.SignedData;

// The SDK handles signing automatically when you call transact()
Result result = convex.transact(Reader.read("(def x 42)")).get();

// For manual signing:
ATransaction tx = Invoke.create(myAddress, Reader.read("(def x 42)"));
SignedData<ATransaction> signed = keyPair.signData(tx);

// Submit signed transaction
Result manualResult = convex.transact(signed).get();
```

### Manual Signing

For advanced use cases, manually sign data:

```java
import convex.core.data.ABlob;
import convex.core.data.Hash;

// Data to sign
ABlob data = Blob.fromHex("7e2f1062f5fc51ed65a28b5945b49425aa42df6b7e67107efec357794096e05e");

// Sign with key pair
ASignature signature = keyPair.sign(data.getBytes());

System.out.println("Signature: " + signature);
```

## Transferring Account Control

Change the key pair that controls an account:

```java
// Generate new keys
AKeyPair newKeys = AKeyPair.generate();

// Set the new public key on-chain
String transaction = "(set-key " + newKeys.getAccountKey() + ")";

Result result = convex.transact(Reader.read(transaction)).get();

if (!result.isError()) {
    // Update local key pair
    convex.setKeyPair(newKeys);
    System.out.println("Account keys updated");

    // IMPORTANT: Save new keys before this step!
    byte[] newSeed = newKeys.getSeed();
    Files.write(Path.of("new_keypair.dat"), newSeed);
}
```

**⚠️ Warning**:
- Save new keys BEFORE transferring!
- Old keys will no longer work
- Losing new keys means losing account access forever

## Key Security Best Practices

### 1. Store Keys Securely

```java
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

// ✅ GOOD - Encrypted storage
public void saveKeysSecurely(AKeyPair keyPair, String password) throws Exception {
    byte[] seed = keyPair.getSeed();

    // Derive encryption key from password (use proper KDF in production)
    SecretKey key = deriveKey(password);

    // Encrypt seed
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key);
    byte[] encrypted = cipher.doFinal(seed);

    // Save encrypted seed
    Files.write(Path.of("keys.enc"), encrypted);
}

// ❌ BAD - Plaintext storage
// Don't do this in production!
Files.write(Path.of("keys.txt"), keyPair.getSeed());
```

### 2. Use Secure Random

```java
import java.security.SecureRandom;

// ✅ GOOD - AKeyPair.generate() uses SecureRandom internally
AKeyPair keyPair = AKeyPair.generate();

// ❌ BAD - Don't create seeds manually with weak RNG
// byte[] weakSeed = new Random().nextBytes(32);  // DON'T!
```

### 3. Clear Sensitive Data

```java
// Clear sensitive data from memory when done
byte[] seed = keyPair.getSeed();
try {
    // Use seed...
} finally {
    // Clear array
    Arrays.fill(seed, (byte) 0);
}
```

### 4. Separate Hot and Cold Wallets

```java
// Cold wallet - offline, secure storage
AKeyPair coldWallet = AKeyPair.generate();
byte[] coldSeed = coldWallet.getSeed();
// Store offline, never expose to network

// Hot wallet - online, small balance
AKeyPair hotWallet = AKeyPair.generate();
convex.setKeyPair(hotWallet);
convex.setAddress(Address.create(5678));
// Use for day-to-day transactions
```

### 5. Never Share Private Keys

```java
// ✅ GOOD - Share public key
System.out.println("My public key: " + keyPair.getAccountKey());

// ✅ GOOD - Share address
System.out.println("Send funds to: #" + myAddress);

// ❌ BAD - Never do this!
// System.out.println("My seed: " + Blob.create(keyPair.getSeed()));  // NEVER!
```

## Account Lifecycle

```java
import convex.api.Convex;
import convex.core.crypto.AKeyPair;
import convex.core.cvm.Address;
import java.nio.file.Files;
import java.nio.file.Path;

// 1. Generate keys
AKeyPair keyPair = AKeyPair.generate();

// 2. Save keys securely
Files.write(Path.of("keypair.dat"), keyPair.getSeed());

// 3. Create account on network (requires existing funded account)
// This step varies by network configuration

// 4. Configure client
Convex convex = Convex.connect("https://peer.convex.live");
convex.setKeyPair(keyPair);
convex.setAddress(Address.create(1234));

// 5. Use account
Result result = convex.transact(Reader.read("(def x 42)")).get();

// 6. Later: restore from backup
byte[] restoredSeed = Files.readAllBytes(Path.of("keypair.dat"));
AKeyPair restoredKeys = AKeyPair.create(restoredSeed);
convex.setKeyPair(restoredKeys);
```

## Common Patterns

### Development Account

Quick account setup for testing:

```java
public Convex createDevAccount() throws Exception {
    Convex convex = Convex.connect("https://peer.convex.live");

    AKeyPair keyPair = AKeyPair.generate();
    convex.setKeyPair(keyPair);

    // Assume test account at #1000
    convex.setAddress(Address.create(1000));

    return convex;
}
```

### Production Account

Secure account for production:

```java
public Convex loadProductionAccount() throws Exception {
    // Load from secure environment
    String keyPath = System.getenv("CONVEX_KEY_PATH");
    String addressStr = System.getenv("CONVEX_ADDRESS");

    byte[] seed = Files.readAllBytes(Path.of(keyPath));
    AKeyPair keyPair = AKeyPair.create(seed);

    Convex convex = Convex.connect("https://peer.convex.live");
    convex.setKeyPair(keyPair);
    convex.setAddress(Address.create(Long.parseLong(addressStr)));

    return convex;
}
```

### Key Rotation

Periodically rotate keys for security:

```java
public void rotateKeys(Convex convex, AKeyPair oldKeys) throws Exception {
    // Generate new keys
    AKeyPair newKeys = AKeyPair.generate();

    // Save new keys first!
    Files.write(Path.of("new_keypair.dat"), newKeys.getSeed());

    // Update on-chain
    Result result = convex.transact(
        Reader.read("(set-key " + newKeys.getAccountKey() + ")")
    ).get();

    if (!result.isError()) {
        // Update client
        convex.setKeyPair(newKeys);
        System.out.println("Keys rotated successfully");

        // Archive old keys securely
        Files.move(
            Path.of("keypair.dat"),
            Path.of("keypair.dat.old")
        );
    } else {
        System.err.println("Key rotation failed: " + result.getErrorCode());
    }
}
```

### Multiple Accounts

Manage multiple accounts:

```java
public class AccountManager {
    private final Convex convex;
    private final Map<String, AccountConfig> accounts = new HashMap<>();

    public void addAccount(String name, AKeyPair keyPair, Address address) {
        accounts.put(name, new AccountConfig(keyPair, address));
    }

    public void useAccount(String name) {
        AccountConfig config = accounts.get(name);
        if (config != null) {
            convex.setKeyPair(config.keyPair());
            convex.setAddress(config.address());
        }
    }

    record AccountConfig(AKeyPair keyPair, Address address) {}
}
```

## Working with Addresses

### Create Address from String

```java
// From string with # prefix
Address addr1 = Address.parse("#1234");

// From string without prefix
Address addr2 = Address.parse("1234");

// From long
Address addr3 = Address.create(1234L);
```

### Format Addresses

```java
Address address = Address.create(1234);

// Standard format
System.out.println("Address: " + address);  // #1234

// As long
long addressLong = address.longValue();

// In queries
String query = "(balance " + address + ")";
```

## Next Steps

- **[Query Guide](queries)** - Learn how to read network state
- **[Transaction Guide](transactions)** - Execute state-changing operations
- **[Convex Lisp Guide](/docs/tutorial/convex-lisp)** - Learn the smart contract language
- **[Recipes](/docs/tutorial/recipes)** - Common account patterns and examples
