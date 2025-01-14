from nacl.public import PrivateKey, PublicKey, Box
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os
import joblib
import io

# Generate a post-quantum secure key pair using libsodium (via PyNaCl)
def generate_key_pair():
    private_key = PrivateKey.generate()  # Generate private key
    public_key = private_key.public_key  # Derive public key
    return private_key, public_key

# Encrypt model using AES
def encrypt_model(model_bytes, shared_key):
    iv = os.urandom(16)  # Initialization Vector for AES
    cipher = Cipher(algorithms.AES(shared_key[:32]), modes.CFB(iv))  # Use first 32 bytes
    encryptor = cipher.encryptor()
    encrypted_model = encryptor.update(model_bytes) + encryptor.finalize()
    return iv, encrypted_model

# Decrypt model using AES
def decrypt_model(encrypted_model, shared_key, iv):
    cipher = Cipher(algorithms.AES(shared_key[:32]), modes.CFB(iv))
    decryptor = cipher.decryptor()
    return decryptor.update(encrypted_model) + decryptor.finalize()

# Main process
if __name__ == "__main__":
    # Load the trained model
    model = joblib.load(r"D:\projects\cns\backend\models\randomForest.pkl")

    # Serialize model to bytes using BytesIO
    model_bytes_io = io.BytesIO()
    joblib.dump(model, model_bytes_io)
    model_bytes = model_bytes_io.getvalue()  # Get byte data

    # Key exchange (simulate secure key sharing)
    private_key_alice, public_key_alice = generate_key_pair()
    private_key_bob, public_key_bob = generate_key_pair()

    # Shared key generation using public-private key pairs
    box_alice = Box(private_key_alice, public_key_bob)
    shared_key_alice = box_alice.shared_key()

    box_bob = Box(private_key_bob, public_key_alice)
    shared_key_bob = box_bob.shared_key()

    assert shared_key_alice == shared_key_bob  # Ensure keys match

    print("Shared Key:", shared_key_alice.hex())

    # Encrypt the model
    iv, encrypted_model = encrypt_model(model_bytes, shared_key_alice)
    with open("pq_encrypted_model.bin", "wb") as f:
        f.write(iv + encrypted_model)
    print("Model encrypted successfully using post-quantum encryption!")

    encrypted_model_path = "encrypted_randomForest.pkl"
    joblib.dump(encrypted_model, encrypted_model_path)
    print(f"Encryypted model saved successfully to {encrypted_model_path}")


    # Decrypt the model
    with open("pq_encrypted_model.bin", "rb") as f:
        iv = f.read(16)  # Read IV from the file
        encrypted_model = f.read()  # Read the rest as encrypted model

    decrypted_model_bytes = decrypt_model(encrypted_model, shared_key_bob, iv)

    # Deserialize model from decrypted bytes
    decrypted_model_io = io.BytesIO(decrypted_model_bytes)
    decrypted_model = joblib.load(decrypted_model_io)
    print("Model decrypted successfully!")

    # Save the decrypted model to a file
    decrypted_model_path = "decrypted_randomForest.pkl"
    joblib.dump(decrypted_model, decrypted_model_path)
    print(f"Decrypted model saved successfully to {decrypted_model_path}")