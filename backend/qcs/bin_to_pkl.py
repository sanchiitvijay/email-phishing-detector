from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import joblib
import io
import binascii

SHARED_KEY = "2d1fce35e4e4c1e3227aecbb8db2fe77f46a228441dfc867c6dcf1ea41ca94c5"

def decrypt_model(encrypted_model, shared_key, iv):
    """
    Decrypts the encrypted model using AES with CFB mode.
    """
    shared_key_bytes = binascii.unhexlify(shared_key)[:32]

    cipher = Cipher(algorithms.AES(shared_key_bytes), modes.CFB(iv), backend=default_backend())
    decryptor = cipher.decryptor()

    return decryptor.update(encrypted_model) + decryptor.finalize()

def bin_to_pkl():
    """
    Reads an encrypted model from a .bin file, decrypts it, and saves the decrypted model to a .pkl file.
    """
    with open("models/pq_encrypted_model.bin", "rb") as f:
        iv = f.read(16)  
        encrypted_model = f.read()  

    decrypted_model_bytes = decrypt_model(encrypted_model, SHARED_KEY, iv)

    decrypted_model_io = io.BytesIO(decrypted_model_bytes)
    decrypted_model = joblib.load(decrypted_model_io)

    decrypted_model_path = "decrypted_randomForest.pkl"
    joblib.dump(decrypted_model, decrypted_model_path)
    print(f"Decrypted model saved successfully to {decrypted_model_path}")

# Run the function
bin_to_pkl()
