import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Heart, Trash2, LogOut, Loader2, Wand2, Save, Edit, X, Phone, ShoppingCart, Package, Palette, Ruler, Eye, TrendingUp, Bell, Moon, Sun, Tag, Truck } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VIEW_ANGLES = [
  { value: "front", label: "أمامي", icon: "👔" },
  { value: "side", label: "جانبي", icon: "🔄" },
  { value: "back", label: "خلفي", icon: "🔙" }
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export default function Dashboard({ user, onLogout }) {
  const { isDark, toggleTheme } = useTheme();
  
  const [designs, setDesigns] = useState([]);
  const [showcaseDesigns, setShowcaseDesigns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, designId: null });
  const [templates, setTemplates] = useState([]);
  const [colorPalettes, setColorPalettes] = useState({});
  const [sizeChart, setSizeChart] = useState({});
  const [activeView, setActiveView] = useState("showcase");
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Design State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedPalette, setSelectedPalette] = useState("classic");
  const [selectedViewAngle, setSelectedViewAngle] = useState("front");
  const [selectedSize, setSelectedSize] = useState("M");
  
  // Preview State
  const [generatedDesign, setGeneratedDesign] = useState(null);
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  
  // Coupon State
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  
  // Order State
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  
  // Measurements Dialog
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [measurements, setMeasurements] = useState({
    chest: "",
    waist: "",
    hips: "",
    height: "",
    weight: ""
  });
  const [suggestedSize, setSuggestedSize] = useState("");

  useEffect(() => {
    fetchDesigns();
    fetchTemplates();
    fetchShowcase();
    fetchColorPalettes();
    fetchSizeChart();
    fetchOrders();
    fetchNotifications();
    fetchCoupons();
  }, []);

  useEffect(() => {
    if (selectedTemplate && selectedSize) {
      calculatePrice();
    }
  }, [selectedTemplate, selectedSize, logoPreview]);

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/designs`);
      setDesigns(response.data);
    } catch (error) {
      toast.error("فشل في تحميل التصاميم");
    } finally {
      setLoading(false);
    }
  };

  const fetchShowcase = async () => {
    try {
      const response = await axios.get(`${API}/showcase`);
      setShowcaseDesigns(response.data);
    } catch (error) {
      console.error("Failed to fetch showcase");
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error("Failed to fetch templates");
    }
  };

  const fetchColorPalettes = async () => {
    try {
      const response = await axios.get(`${API}/color-palettes`);
      setColorPalettes(response.data);
    } catch (error) {
      console.error("Failed to fetch color palettes");
    }
  };

  const fetchSizeChart = async () => {
    try {
      const response = await axios.get(`${API}/size-chart`);
      setSizeChart(response.data);
    } catch (error) {
      console.error("Failed to fetch size chart");
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Failed to fetch orders");
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
      
      // Get unread count
      const unreadResponse = await axios.get(`${API}/notifications/unread-count`);
      setUnreadCount(unreadResponse.data.count);
    } catch (error) {
      console.error("Failed to fetch notifications");
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await axios.get(`${API}/coupons`);
      setAvailableCoupons(response.data);
    } catch (error) {
      console.error("Failed to fetch coupons");
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Failed to mark notification as read");
    }
  };

  const validateCouponCode = async () => {
    if (!couponCode.trim() || !calculatedPrice) {
      toast.error("الرجاء إدخال كود الكوبون");
      return;
    }

    setValidatingCoupon(true);
    try {
      const response = await axios.post(`${API}/coupons/validate`, null, {
        params: {
          code: couponCode,
          amount: calculatedPrice.total_price
        }
      });

      if (response.data.valid) {
        setAppliedCoupon(response.data);
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
        setAppliedCoupon(null);
      }
    } catch (error) {
      toast.error("فشل في التحقق من الكوبون");
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const calculatePrice = async () => {
    if (!selectedTemplate) return;
    
    try {
      const response = await axios.post(`${API}/calculate-price`, null, {
        params: {
          template_id: selectedTemplate.id,
          size: selectedSize,
          has_logo: !!logoPreview
        }
      });
      setCalculatedPrice(response.data);
    } catch (error) {
      console.error("Failed to calculate price");
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setPrompt(template.prompt);
    setGeneratedDesign(null);
    setShowOrderForm(false);
    setActiveView("customize");
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveMeasurements = async () => {
    try {
      const response = await axios.put(`${API}/user/measurements`, {
        chest: parseFloat(measurements.chest) || null,
        waist: parseFloat(measurements.waist) || null,
        hips: parseFloat(measurements.hips) || null,
        height: parseFloat(measurements.height) || null,
        weight: parseFloat(measurements.weight) || null
      });
      
      setSuggestedSize(response.data.suggested_size);
      setSelectedSize(response.data.suggested_size);
      toast.success(`تم حفظ المقاسات! المقاس المقترح: ${response.data.suggested_size}`);
      setShowMeasurements(false);
    } catch (error) {
      toast.error("فشل في حفظ المقاسات");
    }
  };

  const enhancePrompt = async () => {
    if (!prompt.trim() || !selectedTemplate) {
      toast.error("الرجاء إدخال وصف واختيار قالب");
      return;
    }

    setEnhancing(true);
    try {
      const response = await axios.post(`${API}/prompt/enhance`, {
        prompt: prompt,
        clothing_type: selectedTemplate.type,
        color: selectedColor
      });
      setEnhancedPrompt(response.data.enhanced_prompt);
      toast.success("تم تحسين الوصف بنجاح!");
    } catch (error) {
      toast.error("فشل في تحسين الوصف");
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("الرجاء إدخال وصف التصميم");
      return;
    }

    setGenerating(true);
    try {
      const finalPrompt = enhancedPrompt || prompt;
      
      const payload = {
        prompt: finalPrompt,
        clothing_type: selectedTemplate?.type,
        template_id: selectedTemplate?.id,
        logo_base64: logoPreview ? logoPreview.split(',')[1] : null,
        user_photo_base64: userPhotoPreview ? userPhotoPreview.split(',')[1] : null,
        color: selectedColor,
        view_angle: selectedViewAngle
      };

      const response = await axios.post(`${API}/designs/preview`, payload);
      
      setGeneratedDesign({
        image_base64: response.data.image_base64,
        prompt: finalPrompt,
        clothing_type: selectedTemplate?.type,
        template_id: selectedTemplate?.id,
        color: selectedColor
      });
      
      toast.success("تم إنشاء التصميم بنجاح!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل في إنشاء التصميم");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!generatedDesign) return;
    
    try {
      const response = await axios.post(`${API}/designs/save`, {
        prompt: generatedDesign.prompt,
        image_base64: generatedDesign.image_base64,
        clothing_type: generatedDesign.clothing_type,
        template_id: generatedDesign.template_id,
        color: selectedColor
      });
      
      setDesigns([response.data, ...designs]);
      toast.success("تم حفظ التصميم في معرضك!");
    } catch (error) {
      toast.error("فشل في حفظ التصميم");
    }
  };

  const handleSubmitOrder = async () => {
    if (!phoneNumber.trim()) {
      toast.error("الرجاء إدخال رقم الهاتف");
      return;
    }

    setSubmittingOrder(true);
    try {
      await axios.post(`${API}/orders/create`, {
        design_image_base64: generatedDesign.image_base64,
        prompt: generatedDesign.prompt,
        phone_number: phoneNumber,
        size: selectedSize,
        color: selectedColor,
        design_id: generatedDesign.template_id
      });
      
      toast.success("تم إرسال الطلب بنجاح! سنتواصل معك قريباً");
      setShowOrderForm(false);
      setPhoneNumber("");
    } catch (error) {
      toast.error("فشل في إرسال الطلب");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const resetDesigner = () => {
    setSelectedTemplate(null);
    setPrompt("");
    setEnhancedPrompt("");
    setLogoPreview(null);
    setUserPhotoPreview(null);
    setGeneratedDesign(null);
    setShowOrderForm(false);
    setSelectedColor("");
    setSelectedViewAngle("front");
  };

  const toggleFavorite = async (designId, currentStatus) => {
    try {
      const response = await axios.put(`${API}/designs/${designId}/favorite`);
      setDesigns(designs.map(d => 
        d.id === designId ? { ...d, is_favorite: response.data.is_favorite } : d
      ));
      toast.success(response.data.is_favorite ? "تمت إضافة التصميم للمفضلة" : "تمت إزالة التصميم من المفضلة");
    } catch (error) {
      toast.error("فشل في تحديث المفضلة");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/designs/${deleteDialog.designId}`);
      setDesigns(designs.filter(d => d.id !== deleteDialog.designId));
      toast.success("تم حذف التصميم بنجاح");
    } catch (error) {
      toast.error("فشل في حذف التصميم");
    } finally {
      setDeleteDialog({ open: false, designId: null });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-[#E8DCC8] to-[#F5F0E8]" data-testid="dashboard-page">
      {/* Header */}
      <header className="glass border-b border-[#3E2723]/10 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#D4AF37] to-[#B8941F] rounded-xl shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#3E2723]">استوديو التصميم</h1>
              <p className="text-sm text-[#5D4037]">مرحباً، {user?.username}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {/* Notifications Bell */}
            <div className="relative">
              <Button
                onClick={() => setShowNotifications(!showNotifications)}
                variant="outline"
                size="icon"
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute left-0 mt-2 w-80 glass rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto" dir="rtl">
                  <div className="p-4 border-b border-[#3E2723]/10">
                    <h3 className="font-bold text-[#3E2723]">الإشعارات</h3>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[#5D4037]">
                      لا توجد إشعارات
                    </div>
                  ) : (
                    <div className="divide-y divide-[#3E2723]/10">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 cursor-pointer hover:bg-[#D4AF37]/10 transition-colors ${
                            !notif.is_read ? 'bg-[#D4AF37]/5' : ''
                          }`}
                          onClick={() => markNotificationAsRead(notif.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full ${!notif.is_read ? 'bg-[#D4AF37]' : 'bg-gray-300'}`} />
                            <div className="flex-1">
                              <h4 className="font-semibold text-[#3E2723] mb-1">{notif.title}</h4>
                              <p className="text-sm text-[#5D4037]">{notif.message}</p>
                              <p className="text-xs text-[#5D4037] mt-1">
                                {new Date(notif.created_at).toLocaleDateString('ar-EG')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="icon"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <Button
              onClick={() => {
                resetDesigner();
                setActiveView("showcase");
              }}
              variant="outline"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
            >
              <Sparkles className="ml-2 w-4 h-4" />
              تصميم جديد
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="border-[#3E2723] text-[#3E2723] hover:bg-[#3E2723] hover:text-white"
            >
              <LogOut className="ml-2 w-4 h-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="glass rounded-2xl p-2 mb-8 flex gap-2">
          <button
            onClick={() => setActiveView("showcase")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeView === "showcase"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50"
            }`}
          >
            <TrendingUp className="inline ml-2 w-4 h-4" />
            تصاميم ملهمة
          </button>
          <button
            onClick={() => setActiveView("templates")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeView === "templates"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50"
            }`}
          >
            القوالب الجاهزة
          </button>
          <button
            onClick={() => setActiveView("customize")}
            disabled={!selectedTemplate}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeView === "customize"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            تخصيص التصميم
          </button>
          <button
            onClick={() => setActiveView("gallery")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeView === "gallery"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50"
            }`}
          >
            معرضي ({designs.length})
          </button>
        </div>

        {/* Showcase View */}
        {activeView === "showcase" && (
          <div className="fade-in">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-[#3E2723] mb-3">تصاميم ناجحة تلهمك</h2>
              <p className="text-lg text-[#5D4037]">اكتشف أفضل التصاميم من مصممين آخرين</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {showcaseDesigns.map((design) => (
                <Card key={design.id} className="glass overflow-hidden card-hover group">
                  <div className="relative aspect-square bg-white">
                    <img
                      src={`data:image/png;base64,${design.image_base64}`}
                      alt={design.title}
                      className="w-full h-full object-cover"
                    />
                    {design.is_featured && (
                      <div className="absolute top-2 right-2 bg-[#D4AF37] text-white px-3 py-1 rounded-full text-xs font-bold">
                        مميز
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-[#3E2723] mb-1">{design.title}</h3>
                    <p className="text-sm text-[#5D4037] line-clamp-2 mb-2">{design.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#5D4037]">❤️ {design.likes_count} إعجاب</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#D4AF37] hover:text-white hover:bg-[#D4AF37]"
                        onClick={() => setActiveView("templates")}
                      >
                        ابدأ التصميم
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <Button
                onClick={() => setActiveView("templates")}
                className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white text-lg px-12 py-6"
              >
                <Sparkles className="ml-2 w-5 h-5" />
                ابدأ تصميمك الخاص
              </Button>
            </div>
          </div>
        )}

        {/* Templates View */}
        {activeView === "templates" && (
          <div className="fade-in">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-[#3E2723] mb-3">اختر قالبك المفضل</h2>
              <p className="text-lg text-[#5D4037]">ابدأ بقالب جاهز وخصصه حسب ذوقك</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="glass overflow-hidden card-hover cursor-pointer group"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="relative h-64 bg-gradient-to-br from-[#D4AF37]/10 to-[#B8941F]/10 flex items-center justify-center">
                    <div className="text-6xl">
                      {template.type === "shirt" && "👔"}
                      {template.type === "tshirt" && "👕"}
                      {template.type === "hoodie" && "🧥"}
                      {template.type === "dress" && "👗"}
                      {template.type === "jacket" && "🧥"}
                    </div>
                    <div className="absolute top-4 left-4 bg-[#D4AF37] text-white px-3 py-1 rounded-lg text-sm font-bold">
                      من {template.base_price} ر.س
                    </div>
                    <div className="absolute inset-0 bg-[#D4AF37]/0 group-hover:bg-[#D4AF37]/10 transition-all flex items-center justify-center">
                      <Button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-[#3E2723] hover:bg-[#D4AF37] hover:text-white">
                        <Edit className="ml-2 w-4 h-4" />
                        تخصيص الآن
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-bold text-[#3E2723] mb-2">{template.name}</h3>
                    <p className="text-[#5D4037] mb-4">{template.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Customize View */}
        {activeView === "customize" && selectedTemplate && (
          <div className="fade-in">
            <div className="glass rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-[#3E2723]">تخصيص: {selectedTemplate.name}</h2>
                  <p className="text-[#5D4037]">{selectedTemplate.description}</p>
                  {calculatedPrice && (
                    <div className="mt-2 text-2xl font-bold text-[#D4AF37]">
                      السعر: {calculatedPrice.total_price} ر.س
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSizeChart(true)}
                    className="border-[#D4AF37] text-[#D4AF37]"
                  >
                    <Ruler className="ml-2 w-4 h-4" />
                    جدول المقاسات
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("templates")}
                  >
                    تغيير القالب
                  </Button>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left: Customization Options */}
                <div className="space-y-6">
                  <div>
                    <Label className="text-lg font-semibold text-[#3E2723] mb-3 block">
                      وصف التصميم
                    </Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="صف التصميم الذي تريده بالتفصيل..."
                      className="min-h-[100px] text-lg border-2 border-[#D4AF37]/30 focus:border-[#D4AF37]"
                    />
                  </div>

                  {/* Color Palette Selector */}
                  <div>
                    <Label className="text-lg font-semibold text-[#3E2723] mb-3 block flex items-center">
                      <Palette className="ml-2 w-5 h-5" />
                      اختر اللون
                    </Label>
                    <Select value={selectedPalette} onValueChange={setSelectedPalette}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر مجموعة ألوان" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">كلاسيك</SelectItem>
                        <SelectItem value="warm">دافئ</SelectItem>
                        <SelectItem value="cool">بارد</SelectItem>
                        <SelectItem value="earth">ترابي</SelectItem>
                        <SelectItem value="pastel">باستيل</SelectItem>
                        <SelectItem value="vibrant">نابض</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="grid grid-cols-5 gap-2 mt-3">
                      {colorPalettes[selectedPalette]?.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                            selectedColor === color ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* View Angle Selector */}
                  <div>
                    <Label className="text-lg font-semibold text-[#3E2723] mb-3 block flex items-center">
                      <Eye className="ml-2 w-5 h-5" />
                      زاوية العرض
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {VIEW_ANGLES.map((angle) => (
                        <button
                          key={angle.value}
                          onClick={() => setSelectedViewAngle(angle.value)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            selectedViewAngle === angle.value
                              ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                              : 'border-gray-300 hover:border-[#D4AF37]/50'
                          }`}
                        >
                          <div className="text-3xl mb-1">{angle.icon}</div>
                          <div className="text-sm font-semibold">{angle.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-lg font-semibold text-[#3E2723] flex items-center">
                        <Ruler className="ml-2 w-5 h-5" />
                        المقاس
                      </Label>
                      <Button
                        variant="link"
                        onClick={() => setShowMeasurements(true)}
                        className="text-[#D4AF37]"
                      >
                        أدخل مقاساتك
                      </Button>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {SIZES.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`p-3 rounded-lg border-2 font-bold transition-all ${
                            selectedSize === size
                              ? 'border-[#D4AF37] bg-[#D4AF37] text-white'
                              : 'border-gray-300 hover:border-[#D4AF37]'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={enhancePrompt}
                      disabled={enhancing || !prompt.trim()}
                      variant="outline"
                      className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                    >
                      {enhancing ? (
                        <Loader2 className="ml-2 w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="ml-2 w-4 h-4" />
                      )}
                      تحسين الوصف
                    </Button>

                    <Button
                      onClick={handleGenerate}
                      disabled={generating || !prompt.trim()}
                      className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white"
                    >
                      {generating ? (
                        <Loader2 className="ml-2 w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="ml-2 w-5 h-5" />
                      )}
                      إنشاء التصميم
                    </Button>
                  </div>

                  {enhancedPrompt && (
                    <div className="p-4 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30">
                      <p className="text-sm font-semibold text-[#3E2723] mb-2">الوصف المحسّن:</p>
                      <p className="text-[#5D4037] text-sm">{enhancedPrompt}</p>
                    </div>
                  )}
                </div>

                {/* Right: Design Preview */}
                <div className="space-y-4">
                  <div className="w-full aspect-square bg-gradient-to-br from-[#D4AF37]/5 to-[#B8941F]/5 rounded-3xl border-2 border-dashed border-[#D4AF37]/30 flex items-center justify-center overflow-hidden">
                    {generatedDesign ? (
                      <img 
                        src={`data:image/png;base64,${generatedDesign.image_base64}`}
                        alt="Generated Design" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <Sparkles className="w-20 h-20 text-[#D4AF37] mx-auto mb-4 opacity-50" />
                        <p className="text-[#5D4037] text-lg">سيظهر تصميمك هنا</p>
                      </div>
                    )}
                  </div>

                  {/* Actions when design is generated */}
                  {generatedDesign && !showOrderForm && (
                    <div className="space-y-3">
                      <Button
                        onClick={handleSaveToGallery}
                        className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white py-4"
                      >
                        <Save className="ml-2 w-5 h-5" />
                        حفظ في معرضي
                      </Button>
                      <Button
                        onClick={() => setShowOrderForm(true)}
                        variant="outline"
                        className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white py-4"
                      >
                        <ShoppingCart className="ml-2 w-5 h-5" />
                        أعجبني! أريد طلبه
                      </Button>
                    </div>
                  )}

                  {/* Simple Order Form */}
                  {showOrderForm && (
                    <div className="glass rounded-2xl p-6 space-y-4 fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-[#3E2723]">إتمام الطلب</h3>
                        <button 
                          onClick={() => setShowOrderForm(false)}
                          className="text-[#5D4037] hover:text-[#3E2723]"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-4 bg-[#D4AF37]/10 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-[#5D4037]">المقاس:</span>
                          <span className="font-bold text-[#3E2723]">{selectedSize}</span>
                        </div>
                        {selectedColor && (
                          <div className="flex justify-between mb-2">
                            <span className="text-[#5D4037]">اللون:</span>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-6 h-6 rounded border-2 border-gray-300"
                                style={{ backgroundColor: selectedColor }}
                              />
                              <span className="font-bold text-[#3E2723]">{selectedColor}</span>
                            </div>
                          </div>
                        )}
                        {calculatedPrice && (
                          <div className="flex justify-between pt-2 border-t border-[#D4AF37]/30">
                            <span className="text-[#5D4037]">السعر الإجمالي:</span>
                            <span className="font-bold text-[#D4AF37] text-xl">
                              {calculatedPrice.total_price} ر.س
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-[#3E2723] mb-2 block">
                          <Phone className="inline ml-2 w-4 h-4" />
                          رقم الهاتف للتواصل
                        </Label>
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="05xxxxxxxx"
                          className="w-full text-lg"
                          dir="ltr"
                        />
                      </div>

                      <Button
                        onClick={handleSubmitOrder}
                        disabled={submittingOrder || !phoneNumber.trim()}
                        className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white py-4"
                      >
                        {submittingOrder ? (
                          <>
                            <Loader2 className="ml-2 w-5 h-5 animate-spin" />
                            جاري الإرسال...
                          </>
                        ) : (
                          <>
                            <Package className="ml-2 w-5 h-5" />
                            إرسال الطلب
                          </>
                        )}
                      </Button>
                      
                      <p className="text-xs text-center text-[#5D4037]">
                        سيتم التواصل معك خلال 24 ساعة لتأكيد الطلب والدفع
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gallery View */}
        {activeView === "gallery" && (
          <div className="fade-in">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-[#3E2723] mb-3">معرض تصاميمي</h2>
              <p className="text-lg text-[#5D4037]">جميع تصاميمك المحفوظة ({designs.length})</p>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
              </div>
            ) : designs.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <Sparkles className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                <p className="text-xl text-[#5D4037] mb-4">لا توجد تصاميم محفوظة بعد</p>
                <Button
                  onClick={() => setActiveView("showcase")}
                  className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white"
                >
                  <Sparkles className="ml-2 w-5 h-5" />
                  ابدأ التصميم الآن
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {designs.map((design) => (
                  <Card key={design.id} className="glass overflow-hidden card-hover">
                    <div className="relative aspect-square bg-white">
                      <img
                        src={`data:image/png;base64,${design.image_base64}`}
                        alt={design.prompt}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => toggleFavorite(design.id, design.is_favorite)}
                        className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <Heart
                          className={`w-6 h-6 ${
                            design.is_favorite
                              ? "fill-red-500 text-red-500"
                              : "text-[#5D4037]"
                          }`}
                        />
                      </button>
                      {design.color && (
                        <div 
                          className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-white shadow-lg"
                          style={{ backgroundColor: design.color }}
                        />
                      )}
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <p className="text-[#3E2723] line-clamp-2">{design.prompt}</p>
                      <Button
                        onClick={() => setDeleteDialog({ open: true, designId: design.id })}
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="ml-2 w-4 h-4" />
                        حذف
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Measurements Dialog */}
      <Dialog open={showMeasurements} onOpenChange={setShowMeasurements}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#3E2723]">
              أدخل مقاساتك
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>محيط الصدر (سم)</Label>
              <Input
                type="number"
                value={measurements.chest}
                onChange={(e) => setMeasurements({...measurements, chest: e.target.value})}
                placeholder="95"
              />
            </div>
            <div>
              <Label>محيط الخصر (سم)</Label>
              <Input
                type="number"
                value={measurements.waist}
                onChange={(e) => setMeasurements({...measurements, waist: e.target.value})}
                placeholder="80"
              />
            </div>
            <div>
              <Label>محيط الوركين (سم)</Label>
              <Input
                type="number"
                value={measurements.hips}
                onChange={(e) => setMeasurements({...measurements, hips: e.target.value})}
                placeholder="100"
              />
            </div>
            <Button
              onClick={saveMeasurements}
              className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white"
            >
              حفظ واقتراح المقاس
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Size Chart Dialog */}
      <Dialog open={showSizeChart} onOpenChange={setShowSizeChart}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#3E2723]">
              جدول المقاسات
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#D4AF37] text-white">
                <tr>
                  <th className="p-3">المقاس</th>
                  <th className="p-3">الصدر (سم)</th>
                  <th className="p-3">الخصر (سم)</th>
                  <th className="p-3">الوركين (سم)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(sizeChart).map(([size, dims]) => (
                  <tr key={size} className="border-b hover:bg-[#D4AF37]/10">
                    <td className="p-3 font-bold text-center">{size}</td>
                    <td className="p-3 text-center">{dims.chest}</td>
                    <td className="p-3 text-center">{dims.waist}</td>
                    <td className="p-3 text-center">{dims.hips}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, designId: null })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف التصميم نهائياً ولا يمكن استرجاعه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
