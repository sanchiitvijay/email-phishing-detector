from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from apimodels import UrlRequest
from qcs.bin_to_pkl import bin_to_pkl
from models import temp
import os
import uuid

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

@app.post("/fishy/")
async def check_fishy(reqBody: UrlRequest):
    try:
        url = reqBody.url
        res = temp.check_fishy(url)
        return JSONResponse(status_code=200, content=res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking fishy: {str(e)}")

@app.post("/check_url/")
async def check_url(reqBody: UrlRequest):
    try:
        decrypted_model_path = f"models/decrypted_randomForest.pkl"

        bin_to_pkl()  

        url = reqBody.url
        res = rf.process_url(url, model_path=decrypted_model_path)  

        if os.path.exists(decrypted_model_path):
            os.remove(decrypted_model_path)

        return JSONResponse(status_code=200, content=res)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing URL: {str(e)}")
