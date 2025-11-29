from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
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
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()

# Create API router
api_router = APIRouter(prefix="/api")

# AI Clients
image_gen = OpenAIImageGeneration(api_key=os.environ.get('EMERGENT_LLM_KEY'))

# Models
class UserMeasurements(BaseModel):
    chest: Optional[float] = None  # cm
    waist: Optional[float] = None
    hips: Optional[float] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    preferred_size: Optional[str] = None  # S, M, L, XL, XXL

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    measurements: Optional[UserMeasurements] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_admin: bool = False

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
    color: Optional[str] = None
    view_angle: Optional[str] = "front"  # front, side, back
    phone_number: Optional[str] = None
    user_photo_base64: Optional[str] = None
    logo_base64: Optional[str] = None

class ShowcaseDesign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    image_base64: str
    clothing_type: str
    likes_count: int = 0
    is_featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    discount_percentage: float  # 0-100
    discount_amount: Optional[float] = None  # Fixed amount
    is_active: bool = True
    max_uses: Optional[int] = None
    current_uses: int = 0
    expiry_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    design_id: Optional[str] = None
    design_image_base64: str
    prompt: str
    phone_number: str
    size: Optional[str] = None
    color: Optional[str] = None
    price: float
    discount: float = 0
    final_price: float
    coupon_code: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str  # order_status, promotion, system
    is_read: bool = False
    related_order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DesignCreatePreview(BaseModel):
    prompt: str
    clothing_type: Optional[str] = None
    template_id: Optional[str] = None
    logo_base64: Optional[str] = None
    user_photo_base64: Optional[str] = None
    color: Optional[str] = None
    view_angle: Optional[str] = "front"

class DesignSave(BaseModel):
    prompt: str
    image_base64: str
    clothing_type: Optional[str] = None
    template_id: Optional[str] = None
    color: Optional[str] = None
    phone_number: Optional[str] = None
    user_photo_base64: Optional[str] = None
    logo_base64: Optional[str] = None

class OrderCreate(BaseModel):
    design_image_base64: str
    prompt: str
    phone_number: str
    size: Optional[str] = None
    color: Optional[str] = None
    design_id: Optional[str] = None
    notes: Optional[str] = None
    coupon_code: Optional[str] = None

class MeasurementsUpdate(BaseModel):
    chest: Optional[float] = None
    waist: Optional[float] = None
    hips: Optional[float] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    preferred_size: Optional[str] = None

class PriceCalculation(BaseModel):
    base_price: float
    size_adjustment: float
    complexity_adjustment: float
    total_price: float
    currency: str = "SAR"

class OrderResponse(BaseModel):
    id: str
    user_id: str
    design_image_base64: str
    prompt: str
    phone_number: str
    size: Optional[str]
    color: Optional[str]
    price: float
    discount: float
    final_price: float
    coupon_code: Optional[str]
    status: str
    created_at: str
    notes: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    is_read: bool
    related_order_id: Optional[str]
    created_at: str

class CouponValidation(BaseModel):
    valid: bool
    discount_percentage: float
    discount_amount: Optional[float]
    message: str

class DesignResponse(BaseModel):
    id: str
    user_id: str
    prompt: str
    image_base64: str
    created_at: str
    is_favorite: bool
    clothing_type: Optional[str] = None
    color: Optional[str] = None

class PreviewResponse(BaseModel):
    image_base64: str

class PromptEnhanceRequest(BaseModel):
    prompt: str
    clothing_type: str
    color: Optional[str] = None

class PromptEnhanceResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str

class ShowcaseResponse(BaseModel):
    id: str
    title: str
    description: str
    image_base64: str
    clothing_type: str
    likes_count: int
    is_featured: bool

# Templates with pricing info
TEMPLATES = [
    {
        "id": "casual-shirt",
        "name": "قميص كاجوال",
        "type": "shirt",
        "description": "قميص كاجوال بسيط وأنيق",
        "prompt": "casual button-up shirt, comfortable fit, modern design",
        "base_price": 150
    },
    {
        "id": "formal-shirt",
        "name": "قميص رسمي",
        "type": "shirt",
        "description": "قميص رسمي للمناسبات",
        "prompt": "formal dress shirt, elegant, professional look",
        "base_price": 200
    },
    {
        "id": "hoodie",
        "name": "هودي عصري",
        "type": "hoodie",
        "description": "هودي مريح وعصري",
        "prompt": "modern hoodie, comfortable, streetwear style",
        "base_price": 250
    },
    {
        "id": "tshirt",
        "name": "تيشيرت بسيط",
        "type": "tshirt",
        "description": "تيشيرت قطني بسيط",
        "prompt": "simple cotton t-shirt, basic design, comfortable",
        "base_price": 100
    },
    {
        "id": "dress",
        "name": "فستان أنيق",
        "type": "dress",
        "description": "فستان أنيق للمناسبات",
        "prompt": "elegant dress, modern design, sophisticated",
        "base_price": 350
    },
    {
        "id": "jacket",
        "name": "جاكيت رياضي",
        "type": "jacket",
        "description": "جاكيت رياضي مريح",
        "prompt": "sporty jacket, comfortable, modern athletic wear",
        "base_price": 300
    }
]

# Color suggestions based on color theory
COLOR_PALETTES = {
    "classic": ["#000000", "#FFFFFF", "#1a1a1a", "#f5f5f5", "#2c3e50"],
    "warm": ["#e74c3c", "#e67e22", "#f39c12", "#d35400", "#c0392b"],
    "cool": ["#3498db", "#2980b9", "#1abc9c", "#16a085", "#2c3e50"],
    "earth": ["#8b7355", "#a0826d", "#6d4c41", "#8d6e63", "#5d4037"],
    "pastel": ["#fad0c4", "#a8d8ea", "#aa96da", "#fcbad3", "#d4f1f4"],
    "vibrant": ["#9b59b6", "#e74c3c", "#f39c12", "#1abc9c", "#3498db"]
}

# Size chart
SIZE_CHART = {
    "XS": {"chest": 85, "waist": 70, "hips": 90, "adjustment": 0},
    "S": {"chest": 90, "waist": 75, "hips": 95, "adjustment": 0},
    "M": {"chest": 95, "waist": 80, "hips": 100, "adjustment": 10},
    "L": {"chest": 100, "waist": 85, "hips": 105, "adjustment": 20},
    "XL": {"chest": 105, "waist": 90, "hips": 110, "adjustment": 30},
    "XXL": {"chest": 110, "waist": 95, "hips": 115, "adjustment": 40}
}

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

def suggest_size(measurements: UserMeasurements) -> str:
    """Suggest best size based on user measurements"""
    if not measurements or not measurements.chest:
        return "M"  # Default
    
    chest = measurements.chest
    best_size = "M"
    min_diff = float('inf')
    
    for size, dims in SIZE_CHART.items():
        diff = abs(dims["chest"] - chest)
        if diff < min_diff:
            min_diff = diff
            best_size = size
    
    return best_size

def calculate_price(template_id: str, size: str = "M", has_custom_elements: bool = False) -> PriceCalculation:
    """Calculate price based on template, size, and complexity"""
    template = next((t for t in TEMPLATES if t["id"] == template_id), None)
    base_price = template["base_price"] if template else 150
    
    size_adjustment = SIZE_CHART.get(size, {}).get("adjustment", 0)
    complexity_adjustment = 50 if has_custom_elements else 0
    
    total = base_price + size_adjustment + complexity_adjustment
    
    return PriceCalculation(
        base_price=base_price,
        size_adjustment=size_adjustment,
        complexity_adjustment=complexity_adjustment,
        total_price=total
    )

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

# Measurements Routes
@api_router.put("/user/measurements")
async def update_measurements(measurements: MeasurementsUpdate, current_user: User = Depends(get_current_user)):
    measurements_dict = measurements.model_dump(exclude_none=True)
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"measurements": measurements_dict}}
    )
    
    suggested_size = suggest_size(UserMeasurements(**measurements_dict))
    
    return {
        "message": "تم حفظ المقاسات بنجاح",
        "suggested_size": suggested_size,
        "measurements": measurements_dict
    }

@api_router.get("/size-chart")
async def get_size_chart():
    return SIZE_CHART

# Templates Routes
@api_router.get("/templates")
async def get_templates():
    return TEMPLATES

# Color Palettes
@api_router.get("/color-palettes")
async def get_color_palettes():
    return COLOR_PALETTES

# Showcase Designs
@api_router.get("/showcase", response_model=List[ShowcaseResponse])
async def get_showcase_designs():
    designs = await db.showcase_designs.find({}, {"_id": 0}).sort("likes_count", -1).limit(12).to_list(12)
    return [
        ShowcaseResponse(
            id=d['id'],
            title=d['title'],
            description=d['description'],
            image_base64=d['image_base64'],
            clothing_type=d['clothing_type'],
            likes_count=d.get('likes_count', 0),
            is_featured=d.get('is_featured', False)
        )
        for d in designs
    ]

# Prompt Enhancement
@api_router.post("/prompt/enhance", response_model=PromptEnhanceResponse)
async def enhance_prompt(request: PromptEnhanceRequest, current_user: User = Depends(get_current_user)):
    try:
        llm = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=str(uuid.uuid4()),
            system_message="""أنت خبير في تصميم الأزياء. مهمتك تحسين وصف تصميم الملابس ليكون أكثر دقة واحترافية.
قواعد التحسين:
1. أضف تفاصيل عن القماش والجودة
2. حدد الألوان بدقة
3. أضف تفاصيل عن القصة والتصميم
4. اجعل الوصف باللغة الإنجليزية للحصول على أفضل نتائج
5. كن محدداً ومختصراً (2-3 جمل)
قدم فقط الوصف المحسّن بدون أي نص إضافي."""
        )
        
        color_info = f" with {request.color} color" if request.color else ""
        user_prompt = f"نوع الملبس: {request.clothing_type}\nاللون: {request.color or 'any'}\nالوصف: {request.prompt}"
        
        response = await llm.chat(
            messages=[{"role": "user", "content": user_prompt}],
            model="gpt-4o"
        )
        
        enhanced = response['choices'][0]['message']['content'].strip()
        
        return PromptEnhanceResponse(
            original_prompt=request.prompt,
            enhanced_prompt=enhanced + color_info
        )
    except Exception as e:
        logger.error(f"Error enhancing prompt: {str(e)}")
        color_info = f" in {request.color}" if request.color else ""
        return PromptEnhanceResponse(
            original_prompt=request.prompt,
            enhanced_prompt=f"Professional {request.clothing_type}: {request.prompt}{color_info}, high quality fabric, modern design"
        )

# Design Routes - Preview
@api_router.post("/designs/preview", response_model=PreviewResponse)
async def preview_design(design_data: DesignCreatePreview, current_user: User = Depends(get_current_user)):
    try:
        base_prompt = f"Professional fashion design: {design_data.prompt}"
        
        if design_data.clothing_type:
            base_prompt = f"{design_data.clothing_type} design: {design_data.prompt}"
        
        if design_data.color:
            base_prompt += f", {design_data.color} color"
        
        if design_data.view_angle and design_data.view_angle != "front":
            base_prompt += f", {design_data.view_angle} view"
        
        if design_data.logo_base64:
            base_prompt += ", with custom logo on chest"
        
        if design_data.user_photo_base64:
            base_prompt += ", on a person, realistic fit"
        
        enhanced_prompt = f"{base_prompt}. High quality, detailed clothing design, modern style, clean background, professional photography"
        
        images = await image_gen.generate_images(
            prompt=enhanced_prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if not images or len(images) == 0:
            raise HTTPException(status_code=500, detail="فشل في توليد التصميم")
        
        image_base64 = base64.b64encode(images[0]).decode('utf-8')
        
        return PreviewResponse(image_base64=image_base64)
    
    except Exception as e:
        logger.error(f"Error generating design preview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"خطأ في توليد التصميم: {str(e)}")

# Design Routes - Save
@api_router.post("/designs/save", response_model=DesignResponse)
async def save_design(design_data: DesignSave, current_user: User = Depends(get_current_user)):
    try:
        design = Design(
            user_id=current_user.id,
            prompt=design_data.prompt,
            image_base64=design_data.image_base64,
            clothing_type=design_data.clothing_type,
            template_id=design_data.template_id,
            color=design_data.color,
            phone_number=design_data.phone_number,
            user_photo_base64=design_data.user_photo_base64,
            logo_base64=design_data.logo_base64
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
            clothing_type=design.clothing_type,
            color=design.color
        )
    except Exception as e:
        logger.error(f"Error saving design: {str(e)}")
        raise HTTPException(status_code=500, detail=f"خطأ في حفظ التصميم: {str(e)}")

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
            clothing_type=d.get('clothing_type'),
            color=d.get('color')
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

# Pricing
@api_router.post("/calculate-price", response_model=PriceCalculation)
async def calculate_design_price(template_id: str, size: str = "M", has_logo: bool = False):
    return calculate_price(template_id, size, has_logo)

# Order Routes
@api_router.post("/orders/create", response_model=OrderResponse)
async def create_order(order_data: OrderCreate, current_user: User = Depends(get_current_user)):
    try:
        # Calculate price
        template = next((t for t in TEMPLATES if t["type"] == order_data.design_id), TEMPLATES[0])
        price_calc = calculate_price(template["id"], order_data.size or "M", False)
        
        # Apply coupon if provided
        discount = 0
        final_price = price_calc.total_price
        
        if order_data.coupon_code:
            coupon = await db.coupons.find_one({
                "code": order_data.coupon_code.upper(),
                "is_active": True
            })
            
            if coupon:
                # Check expiry
                if coupon.get("expiry_date"):
                    expiry = datetime.fromisoformat(coupon["expiry_date"]) if isinstance(coupon["expiry_date"], str) else coupon["expiry_date"]
                    if expiry < datetime.now(timezone.utc):
                        raise HTTPException(status_code=400, detail="انتهت صلاحية الكوبون")
                
                # Check max uses
                if coupon.get("max_uses") and coupon.get("current_uses", 0) >= coupon["max_uses"]:
                    raise HTTPException(status_code=400, detail="تم استخدام الكوبون بالكامل")
                
                # Calculate discount
                if coupon.get("discount_percentage"):
                    discount = (price_calc.total_price * coupon["discount_percentage"]) / 100
                elif coupon.get("discount_amount"):
                    discount = coupon["discount_amount"]
                
                final_price = max(0, price_calc.total_price - discount)
                
                # Update coupon usage
                await db.coupons.update_one(
                    {"code": order_data.coupon_code.upper()},
                    {"$inc": {"current_uses": 1}}
                )
        
        order = Order(
            user_id=current_user.id,
            design_id=order_data.design_id,
            design_image_base64=order_data.design_image_base64,
            prompt=order_data.prompt,
            phone_number=order_data.phone_number,
            size=order_data.size,
            color=order_data.color,
            price=price_calc.total_price,
            discount=discount,
            final_price=final_price,
            coupon_code=order_data.coupon_code,
            notes=order_data.notes
        )
        
        order_dict = order.model_dump()
        order_dict['created_at'] = order_dict['created_at'].isoformat()
        
        await db.orders.insert_one(order_dict)
        
        # Create notification
        notification = Notification(
            user_id=current_user.id,
            title="تم استلام طلبك",
            message=f"تم استلام طلبك بنجاح! سنتواصل معك قريباً على الرقم {order_data.phone_number}",
            type="order_status",
            related_order_id=order.id
        )
        
        notification_dict = notification.model_dump()
        notification_dict['created_at'] = notification_dict['created_at'].isoformat()
        await db.notifications.insert_one(notification_dict)
        
        return OrderResponse(
            id=order.id,
            user_id=order.user_id,
            design_image_base64=order.design_image_base64,
            prompt=order.prompt,
            phone_number=order.phone_number,
            size=order.size,
            color=order.color,
            price=order.price,
            discount=order.discount,
            final_price=order.final_price,
            coupon_code=order.coupon_code,
            status=order.status,
            created_at=order_dict['created_at'],
            notes=order.notes
        )
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"خطأ في إنشاء الطلب: {str(e)}")

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user.id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return [
        OrderResponse(
            id=o['id'],
            user_id=o['user_id'],
            design_image_base64=o['design_image_base64'],
            prompt=o['prompt'],
            phone_number=o['phone_number'],
            size=o.get('size'),
            color=o.get('color'),
            price=o['price'],
            discount=o.get('discount', 0),
            final_price=o.get('final_price', o['price']),
            coupon_code=o.get('coupon_code'),
            status=o.get('status', 'pending'),
            created_at=o['created_at'] if isinstance(o['created_at'], str) else o['created_at'].isoformat(),
            notes=o.get('notes')
        )
        for o in orders
    ]

# Coupon Routes
@api_router.get("/coupons")
async def get_available_coupons(current_user: User = Depends(get_current_user)):
    """Get all active and non-expired coupons"""
    coupons = await db.coupons.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    # Filter out expired coupons
    active_coupons = []
    for coupon in coupons:
        if coupon.get("expiry_date"):
            expiry = datetime.fromisoformat(coupon["expiry_date"]) if isinstance(coupon["expiry_date"], str) else coupon["expiry_date"]
            if expiry < datetime.now(timezone.utc):
                continue
        
        # Check if max uses reached
        if coupon.get("max_uses") and coupon.get("current_uses", 0) >= coupon["max_uses"]:
            continue
            
        active_coupons.append({
            "code": coupon["code"],
            "discount_percentage": coupon.get("discount_percentage", 0),
            "discount_amount": coupon.get("discount_amount"),
            "description": coupon.get("description", ""),
            "expiry_date": coupon.get("expiry_date"),
            "min_purchase": coupon.get("min_purchase", 0)
        })
    
    return active_coupons

@api_router.post("/coupons/validate")
async def validate_coupon(code: str, amount: float, current_user: User = Depends(get_current_user)):
    coupon = await db.coupons.find_one({
        "code": code.upper(),
        "is_active": True
    })
    
    if not coupon:
        return CouponValidation(
            valid=False,
            discount_percentage=0,
            discount_amount=None,
            message="الكوبون غير صالح"
        )
    
    # Check expiry
    if coupon.get("expiry_date"):
        expiry = datetime.fromisoformat(coupon["expiry_date"]) if isinstance(coupon["expiry_date"], str) else coupon["expiry_date"]
        if expiry < datetime.now(timezone.utc):
            return CouponValidation(
                valid=False,
                discount_percentage=0,
                discount_amount=None,
                message="انتهت صلاحية الكوبون"
            )
    
    # Check max uses
    if coupon.get("max_uses") and coupon.get("current_uses", 0) >= coupon["max_uses"]:
        return CouponValidation(
            valid=False,
            discount_percentage=0,
            discount_amount=None,
            message="تم استخدام الكوبون بالكامل"
        )
    
    return CouponValidation(
        valid=True,
        discount_percentage=coupon.get("discount_percentage", 0),
        discount_amount=coupon.get("discount_amount"),
        message="تم تطبيق الخصم بنجاح!"
    )

# Notifications Routes
@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return [
        NotificationResponse(
            id=n['id'],
            title=n['title'],
            message=n['message'],
            type=n['type'],
            is_read=n.get('is_read', False),
            related_order_id=n.get('related_order_id'),
            created_at=n['created_at'] if isinstance(n['created_at'], str) else n['created_at'].isoformat()
        )
        for n in notifications
    ]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"is_read": True}}
    )
    return {"message": "تم تحديث الإشعار"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: User = Depends(get_current_user)):
    count = await db.notifications.count_documents({
        "user_id": current_user.id,
        "is_read": False
    })
    return {"count": count}

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