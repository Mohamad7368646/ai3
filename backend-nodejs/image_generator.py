#!/usr/bin/env python3
"""
Simple FastAPI service for AI image generation using Emergent LLM Key
"""
import os
import base64
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Image Generator Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageRequest(BaseModel):
    prompt: str
    clothing_type: str = "t-shirt"
    color: str = ""

class ImageResponse(BaseModel):
    success: bool
    image_base64: str = ""
    revised_prompt: str = ""
    error: str = ""

@app.get("/health")
async def health():
    return {"status": "ok", "service": "image-generator"}

@app.post("/generate", response_model=ImageResponse)
async def generate_image(request: ImageRequest):
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        # Create enhanced prompt for fashion design
        enhanced_prompt = f"Professional fashion design: {request.clothing_type} clothing item. Design details: {request.prompt}. {f'Color: {request.color}.' if request.color else ''} High-quality product photography style, clean white background, studio lighting, fashion catalog style, detailed fabric texture visible, professional clothing design."
        
        # Initialize image generator
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        # Generate image
        images = await image_gen.generate_images(
            prompt=enhanced_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            # Convert to base64
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            return ImageResponse(
                success=True,
                image_base64=image_base64,
                revised_prompt=enhanced_prompt
            )
        else:
            return ImageResponse(
                success=False,
                error="No image was generated"
            )
            
    except Exception as e:
        print(f"Error generating image: {e}")
        return ImageResponse(
            success=False,
            error=str(e)
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
