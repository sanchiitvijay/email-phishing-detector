from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class UrlRequest(BaseModel):
    url: str