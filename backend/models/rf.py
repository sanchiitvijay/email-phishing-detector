import pickle
# from models.feature_extactor import extract_url_features
from feature_extactor import extract_url_features
import joblib
import numpy as np

try:
    with open(r'randomForest.pkl', 'rb') as f:
        data = pickle.load(f)
except FileNotFoundError:
    data = None

def process_url(url):
    # url = request.json.get('url')
    print(url)
    # Extract features from the new data
    features = extract_url_features(url)
    new_data = np.array(features).reshape(1, -1)

    # Load the trained model
    # classifier = joblib.load(r"models\randomForest.pkl")
    classifier = joblib.load(r"models/decrypted_randomForest.pkl")

    # Predict the class for the new data
    prediction = classifier.predict(new_data)
    data = "abc" 

    # Print the predicted class
    if prediction[0]==1:
        print("Phishy URL")
        data = "Phishy Url\nBe cautious"
    else:
        print(f"Legitimate URL")
        data = "Legitimate Url \n Safe to browse"

    processed_result = {
        "input_url": url,
        "data": data,
        "message": "Processed successfully"
    }
    
    return processed_result


if __name__ == '__main__':
    result=process_url("abc")
    print(result)