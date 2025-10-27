from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
from emergentintegrations.llm.openai import LlmChat

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()

# Create API router
api_router = APIRouter(prefix="/api")

# AI Clients
image_gen = OpenAIImageGeneration(api_key=os.environ.get('EMERGENT_LLM_KEY'))
llm_client = LlmChat(api_key=os.environ.get('EMERGENT_LLM_KEY'))

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Design(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    prompt: str
    image_base64: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_favorite: bool = False
    clothing_type: Optional[str] = None
    template_id: Optional[str] = None
    has_logo: bool = False
    has_user_photo: bool = False

class DesignCreate(BaseModel):
    prompt: str
    clothing_type: Optional[str] = None
    template_id: Optional[str] = None
    logo_base64: Optional[str] = None
    user_photo_base64: Optional[str] = None

class DesignResponse(BaseModel):
    id: str
    user_id: str
    prompt: str
    image_base64: str
    created_at: str
    is_favorite: bool
    clothing_type: Optional[str] = None

class PromptEnhanceRequest(BaseModel):
    prompt: str
    clothing_type: str

class PromptEnhanceResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str

# Templates
TEMPLATES = [
    {
        "id": "casual-shirt",
        "name": "قميص كاجوال",
        "type": "shirt",
        "description": "قميص كاجوال بسيط وأنيق",
        "prompt": "casual button-up shirt, comfortable fit, modern design"
    },
    {
        "id": "formal-shirt",
        "name": "قميص رسمي",
        "type": "shirt",
        "description": "قميص رسمي للمناسبات",
        "prompt": "formal dress shirt, elegant, professional look"
    },
    {
        "id": "hoodie",
        "name": "هودي عصري",
        "type": "hoodie",
        "description": "هودي مريح وعصري",
        "prompt": "modern hoodie, comfortable, streetwear style"
    },
    {
        "id": "tshirt",
        "name": "تيشيرت بسيط",
        "type": "tshirt",
        "description": "تيشيرت قطني بسيط",
        "prompt": "simple cotton t-shirt, basic design, comfortable"
    },
    {
        "id": "dress",
        "name": "فستان أنيق",
        "type": "dress",
        "description": "فستان أنيق للمناسبات",
        "prompt": "elegant dress, modern design, sophisticated"
    },
    {
        "id": "jacket",
        "name": "جاكيت رياضي",
        "type": "jacket",
        "description": "جاكيت رياضي مريح",
        "prompt": "sporty jacket, comfortable, modern athletic wear"
    }
]

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="بيانات المصادقة مطلوبة")
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="بيانات المصادقة غير صالحة")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="بيانات المصادقة غير صالحة")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="المستخدم غير موجود")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

# Auth Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="اسم المستخدم موجود بالفعل")
    
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل بالفعل")
    
    user = User(
        username=user_data.username,
        email=user_data.email
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['password'] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")
    
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    user_obj = User(**{k: v for k, v in user.items() if k != 'password'})
    access_token = create_access_token(data={"sub": user_obj.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Templates Routes
@api_router.get("/templates")
async def get_templates():
    return TEMPLATES

# Prompt Enhancement
@api_router.post("/prompt/enhance", response_model=PromptEnhanceResponse)
async def enhance_prompt(request: PromptEnhanceRequest, current_user: User = Depends(get_current_user)):
    try:
        system_prompt = f"""أنت خبير في تصميم الأزياء. مهمتك تحسين وصف تصميم الملابس ليكون أكثر دقة واحترافية.
نوع الملبس: {request.clothing_type}

قواعد التحسين:
1. أضف تفاصيل عن القماش والجودة
2. حدد الألوان بدقة
3. أضف تفاصيل عن القصة والتصميم
4. اجعل الوصف باللغة الإنجليزية للحصول على أفضل نتائج
5. كن محدداً ومختصراً (2-3 جمل)

الوصف الأصلي: {request.prompt}

قدم فقط الوصف المحسّن بدون أي نص إضافي."""
        
        response = await llm_client.generate(
            prompt=system_prompt,
            model="gpt-4o",
            max_tokens=150
        )
        
        enhanced = response.strip()
        
        return PromptEnhanceResponse(
            original_prompt=request.prompt,
            enhanced_prompt=enhanced
        )
    except Exception as e:
        logger.error(f"Error enhancing prompt: {str(e)}")
        return PromptEnhanceResponse(
            original_prompt=request.prompt,
            enhanced_prompt=f"Professional {request.clothing_type}: {request.prompt}, high quality fabric, modern design, detailed stitching"
        )

# Design Routes
@api_router.post("/designs/generate", response_model=DesignResponse)
async def generate_design(design_data: DesignCreate, current_user: User = Depends(get_current_user)):
    try:
        # Build enhanced prompt
        base_prompt = f"Professional fashion design: {design_data.prompt}"
        
        if design_data.clothing_type:
            base_prompt = f"{design_data.clothing_type} design: {design_data.prompt}"
        
        # Add logo instruction if provided
        if design_data.logo_base64:
            base_prompt += ", with custom logo placement on chest area"
        
        # Add virtual try-on instruction if user photo provided
        if design_data.user_photo_base64:
            base_prompt += ", displayed on a person, realistic fit and drape"
        
        enhanced_prompt = f"{base_prompt}. High quality, detailed clothing design, modern style, clean white background, professional photography"
        
        # Generate image using AI
        images = await image_gen.generate_images(
            prompt=enhanced_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="فشل في توليد التصميم")
        
        # Convert to base64
        image_base64 = base64.b64encode(images[0]).decode('utf-8')
        
        # Create design document
        design = Design(
            user_id=current_user.id,
            prompt=design_data.prompt,
            image_base64=image_base64,
            clothing_type=design_data.clothing_type,
            template_id=design_data.template_id,
            has_logo=bool(design_data.logo_base64),
            has_user_photo=bool(design_data.user_photo_base64)
        )
        
        design_dict = design.model_dump()
        design_dict['created_at'] = design_dict['created_at'].isoformat()
        
        await db.designs.insert_one(design_dict)
        
        return DesignResponse(
            id=design.id,
            user_id=design.user_id,
            prompt=design.prompt,
            image_base64=design.image_base64,
            created_at=design_dict['created_at'],
            is_favorite=design.is_favorite,
            clothing_type=design.clothing_type
        )
    
    except Exception as e:
        logger.error(f"Error generating design: {str(e)}")
        raise HTTPException(status_code=500, detail=f"خطأ في توليد التصميم: {str(e)}")

@api_router.get("/designs", response_model=List[DesignResponse])
async def get_designs(current_user: User = Depends(get_current_user)):
    designs = await db.designs.find({"user_id": current_user.id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return [
        DesignResponse(
            id=d['id'],
            user_id=d['user_id'],
            prompt=d['prompt'],
            image_base64=d['image_base64'],
            created_at=d['created_at'] if isinstance(d['created_at'], str) else d['created_at'].isoformat(),
            is_favorite=d.get('is_favorite', False),
            clothing_type=d.get('clothing_type')
        )
        for d in designs
    ]

@api_router.put("/designs/{design_id}/favorite")
async def toggle_favorite(design_id: str, current_user: User = Depends(get_current_user)):
    design = await db.designs.find_one({"id": design_id, "user_id": current_user.id})
    
    if not design:
        raise HTTPException(status_code=404, detail="التصميم غير موجود")
    
    new_favorite_status = not design.get('is_favorite', False)
    await db.designs.update_one(
        {"id": design_id},
        {"$set": {"is_favorite": new_favorite_status}}
    )
    
    return {"is_favorite": new_favorite_status}

@api_router.delete("/designs/{design_id}")
async def delete_design(design_id: str, current_user: User = Depends(get_current_user)):
    result = await db.designs.delete_one({"id": design_id, "user_id": current_user.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="التصميم غير موجود")
    
    return {"message": "تم حذف التصميم بنجاح"}

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في استوديو تصميم الأزياء بالذكاء الاصطناعي"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()