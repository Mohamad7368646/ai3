#!/usr/bin/env python3
"""
AI Image Generation Service with Logo Support
"""
import os
import base64
import io
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
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
    logo_base64: Optional[str] = None
    logo_description: Optional[str] = None

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
        
        # Build the prompt with logo description if provided
        logo_part = ""
        if request.logo_description:
            logo_part = f" The clothing has a custom logo/design on the front: {request.logo_description}."
        elif request.logo_base64:
            logo_part = " The clothing features a custom printed logo/design prominently displayed on the front center."
        
        # Create enhanced prompt for fashion design
        enhanced_prompt = f"""Professional fashion photography: A {request.clothing_type} clothing item displayed on a mannequin or flat lay.
Design details: {request.prompt}.
{f'Primary color: {request.color}.' if request.color else ''}
{logo_part}
Style: High-end fashion catalog photography, clean white/light gray background, professional studio lighting, sharp details, fabric texture visible, premium quality clothing, fashion e-commerce style photo."""
        
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
