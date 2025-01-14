import requests
import json

# Define the API endpoint
# url = "http://13.61.146.108/fishy"
url="http://13.61.146.108/"

# Set up the headers, including the authorization token
headers = {
    "Content-Type": "application/json",
    # "Authorization": "Bearer DEVPIPLAYSOCIALAUTH@4",
}

# Define the request body
data = {
    "url":"pornhub.com"
}

try:
    # Make the POST request
    response = requests.post(url, json=data, headers=headers)
    
    # Print the status code and response in a readable format
    print("Status Code:", response.status_code)
    if response.status_code == 200:
        users=json.dumps(response.json(), indent=4)
        print("Response JSON:")
        print(users)  # Pretty print the JSON response
        # with open("users.txt","w") as f:
        #     f.write(users)
    else:
        print("Error Response JSON:")
        print(json.dumps(response.json(), indent=4))  # Pretty print the error JSON
except requests.exceptions.RequestException as e:
    # Handle exceptions such as network issues
    print("An error occurred:", e)


