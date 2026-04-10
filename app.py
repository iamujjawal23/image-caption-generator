import os
import io
import pickle
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from PIL import Image

app = FastAPI(title="Image Captioning API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models
caption_model = None
feature_extractor = None
tokenizer = None
max_length = 34
img_size = 224

@app.on_event("startup")
def load_models():
    global caption_model, feature_extractor, tokenizer
    try:
        model_path = "models/model.keras"
        feature_extractor_path = "models/feature_extractor.keras"
        tokenizer_path = "models/tokenizer.pkl"

        caption_model = load_model(model_path)
        feature_extractor = load_model(feature_extractor_path)

        with open(tokenizer_path, "rb") as f:
            tokenizer = pickle.load(f)
        
        print("Models loaded successfully.")
    except Exception as e:
        print(f"Error loading models: {e}")

@app.post("/api/generate-caption")
async def generate_caption(file: UploadFile = File(...)):
    if caption_model is None or feature_extractor is None or tokenizer is None:
        raise HTTPException(status_code=500, detail="Models are not loaded on server.")
    
    try:
        # Read the uploaded image inside memory
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Preprocess the image
        if image.mode != "RGB":
            image = image.convert("RGB")
            
        image = image.resize((img_size, img_size))
        img_arr = img_to_array(image) / 255.0  # Normalize pixel values
        img_arr = np.expand_dims(img_arr, axis=0)
        
        # Extract image features
        image_features = feature_extractor.predict(img_arr, verbose=0)
        
        # Generate the caption
        in_text = "startseq"
        for _ in range(max_length):
            sequence = tokenizer.texts_to_sequences([in_text])[0]
            sequence = pad_sequences([sequence], maxlen=max_length)
            yhat = caption_model.predict([image_features, sequence], verbose=0)
            yhat_index = np.argmax(yhat)
            word = tokenizer.index_word.get(yhat_index, None)
            
            if word is None:
                break
            in_text += " " + word
            if word == "endseq":
                break
                
        caption = in_text.replace("startseq", "").replace("endseq", "").strip()
        
        return JSONResponse(content={"caption": caption})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files for the frontend, but only if the directory exists
# We will create 'public' directory in the next steps.
os.makedirs("public", exist_ok=True)
app.mount("/", StaticFiles(directory="public", html=True), name="public")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
