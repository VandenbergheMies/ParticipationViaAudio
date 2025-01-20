from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from transformers import (
    AutoModelForSpeechSeq2Seq, AutoProcessor,
    pipeline
)

from config.settings import Config

def create_app():
    app = FastAPI()


    # Mount the frontend folder to serve static files
    app.mount("/frontend", StaticFiles(directory="frontend/src/"), name="frontend")

        
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize models
    processor = AutoProcessor.from_pretrained(Config.MODELS['whisper'])
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        Config.MODELS['whisper'],
        torch_dtype=Config.TORCH_DTYPE,
        low_cpu_mem_usage=True,
        use_safetensors=True
    ).to(Config.DEVICE)

    whisper_pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        device=Config.DEVICE,
    )
    
    # Include routers
    app.include_router(router)
    
    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)