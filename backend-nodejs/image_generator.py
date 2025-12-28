#!/usr/bin/env python3
"""
AI Image Generation Service with Logo and User Photo Composition
"""
import os
import base64
import io
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from PIL import Image

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

# Logo position options
LOGO_POSITIONS = {
    "center": "center chest",
    "left": "upper left chest",
    "right": "upper right chest", 
    "bottom": "bottom center"
}

class ImageRequest(BaseModel):
    prompt: str
    clothing_type: str = "t-shirt"
    color: str = ""
    logo_base64: Optional[str] = None
    logo_description: Optional[str] = None
    logo_position: Optional[str] = "center"  # center, left, right, bottom
    user_photo_base64: Optional[str] = None
    view_angle: Optional[str] = "front"

class ImageResponse(BaseModel):
    success: bool
    image_base64: str = ""
    composite_image_base64: str = ""
    revised_prompt: str = ""
    error: str = ""

def decode_base64_image(base64_str: str) -> Image.Image:
    """Decode a base64 string to PIL Image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        image_data = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(image_data))
    except Exception as e:
        raise ValueError(f"Failed to decode image: {e}")

def encode_image_to_base64(image: Image.Image, format: str = "PNG") -> str:
    """Encode PIL Image to base64 string"""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def blend_logo_on_design(design_image: Image.Image, logo_image: Image.Image, position: str = "center") -> Image.Image:
    """
    Blend a logo onto the design image at the specified position
    """
    design = design_image.copy()
    
    # Ensure design is in RGBA mode
    if design.mode != 'RGBA':
        design = design.convert('RGBA')
    
    # Resize logo to appropriate size (about 20-30% of design width)
    design_width, design_height = design.size
    logo_max_width = int(design_width * 0.25)
    logo_max_height = int(design_height * 0.25)
    
    # Maintain aspect ratio
    logo_image = logo_image.convert('RGBA')
    logo_width, logo_height = logo_image.size
    ratio = min(logo_max_width / logo_width, logo_max_height / logo_height)
    new_logo_size = (int(logo_width * ratio), int(logo_height * ratio))
    logo_resized = logo_image.resize(new_logo_size, Image.Resampling.LANCZOS)
    
    # Calculate position based on option
    logo_w, logo_h = logo_resized.size
    
    if position == "center":
        # Center of the chest area (approximately upper-middle)
        x = (design_width - logo_w) // 2
        y = int(design_height * 0.25)  # Upper-middle area
    elif position == "left":
        # Upper left chest
        x = int(design_width * 0.15)
        y = int(design_height * 0.2)
    elif position == "right":
        # Upper right chest
        x = int(design_width * 0.85) - logo_w
        y = int(design_height * 0.2)
    elif position == "bottom":
        # Bottom center
        x = (design_width - logo_w) // 2
        y = int(design_height * 0.65)
    else:
        # Default to center
        x = (design_width - logo_w) // 2
        y = int(design_height * 0.25)
    
    # Paste logo with transparency
    design.paste(logo_resized, (x, y), logo_resized)
    
    return design

def create_composite_with_user_photo(design_image: Image.Image, user_photo: Image.Image) -> Image.Image:
    """
    Create a side-by-side composite image showing user photo next to the design
    """
    # Convert to RGB for final output
    design = design_image.convert('RGB')
    user = user_photo.convert('RGB')
    
    # Get dimensions
    design_width, design_height = design.size
    
    # Resize user photo to match design height while maintaining aspect ratio
    user_width, user_height = user.size
    ratio = design_height / user_height
    new_user_width = int(user_width * ratio)
    user_resized = user.resize((new_user_width, design_height), Image.Resampling.LANCZOS)
    
    # Create composite canvas
    total_width = design_width + new_user_width + 40  # 40px gap
    composite = Image.new('RGB', (total_width, design_height), (255, 255, 255))
    
    # Paste user photo on the left
    composite.paste(user_resized, (0, 0))
    
    # Paste design on the right
    composite.paste(design, (new_user_width + 40, 0))
    
    # Add decorative separator line
    from PIL import ImageDraw
    draw = ImageDraw.Draw(composite)
    separator_x = new_user_width + 20
    draw.line([(separator_x, 20), (separator_x, design_height - 20)], fill=(212, 175, 55), width=3)
    
    return composite

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
        
        # Build the prompt with logo description and position if provided
        logo_part = ""
        logo_position_text = LOGO_POSITIONS.get(request.logo_position, "center chest")
        
        if request.logo_description:
            logo_part = f" The clothing has a custom logo/design on the {logo_position_text}: {request.logo_description}."
        elif request.logo_base64:
            logo_part = f" The clothing features a custom printed logo/design prominently displayed on the {logo_position_text}."
        
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
        
        if not images or len(images) == 0:
            return ImageResponse(
                success=False,
                error="No image was generated"
            )
        
        # Convert generated image to PIL Image
        generated_image = Image.open(io.BytesIO(images[0]))
        
        # Process logo if provided - blend it onto the design
        design_with_logo = generated_image
        if request.logo_base64:
            try:
                logo_image = decode_base64_image(request.logo_base64)
                design_with_logo = blend_logo_on_design(
                    generated_image, 
                    logo_image, 
                    request.logo_position or "center"
                )
                print(f"Logo blended successfully at position: {request.logo_position}")
            except Exception as e:
                print(f"Warning: Could not blend logo: {e}")
                design_with_logo = generated_image
        
        # Encode the design (with logo if applied)
        design_base64 = encode_image_to_base64(design_with_logo.convert('RGB'), "PNG")
        
        # Create composite with user photo if provided
        composite_base64 = ""
        if request.user_photo_base64:
            try:
                user_photo = decode_base64_image(request.user_photo_base64)
                composite_image = create_composite_with_user_photo(design_with_logo, user_photo)
                composite_base64 = encode_image_to_base64(composite_image, "PNG")
                print("Composite image with user photo created successfully")
            except Exception as e:
                print(f"Warning: Could not create composite with user photo: {e}")
        
        return ImageResponse(
            success=True,
            image_base64=design_base64,
            composite_image_base64=composite_base64,
            revised_prompt=enhanced_prompt
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
