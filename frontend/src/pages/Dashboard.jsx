import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Heart, Trash2, LogOut, Loader2, Wand2, Save, Edit, X, Phone, ShoppingCart, Package, Ruler, Eye, TrendingUp, Bell, Moon, Sun, Tag, Truck } from "lucide-react";
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
  const [selectedPalette, setSelectedPalette] = useState("classic");
  const [selectedViewAngle, setSelectedViewAngle] = useState("front");
  const [selectedSize, setSelectedSize] = useState("M");
  
  // Preview State
  const [generatedDesign, setGeneratedDesign] = useState(null);
  
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
    fetchSizeChart();
    fetchOrders();
    fetchNotifications();
    fetchCoupons();
  }, []);

  useEffect(() => {
    // Remove price calculation since we don't need pricing anymore
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
    if (!couponCode.trim()) {
      toast.error("الرجاء إدخال كود الكوبون");
      return;
    }

    setValidatingCoupon(true);
    try {
      const response = await axios.post(`${API}/coupons/validate`, null, {
        params: {
          code: couponCode,
          amount: 100 // Default amount for validation
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
        clothing_type: selectedTemplate.type
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
        view_angle: selectedViewAngle
      };

      const response = await axios.post(`${API}/designs/preview`, payload);
      
      setGeneratedDesign({
        image_base64: response.data.image_base64,
        prompt: finalPrompt,
        clothing_type: selectedTemplate?.type,
        template_id: selectedTemplate?.id
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
    
    // Ask for phone number if not provided
    if (!phoneNumber.trim()) {
      toast.error("الرجاء إدخال رقم هاتفك للتواصل معك لاحقاً");
      setShowOrderForm(true);
      return;
    }
    
    try {
      const response = await axios.post(`${API}/designs/save`, {
        prompt: generatedDesign.prompt,
        image_base64: generatedDesign.image_base64,
        clothing_type: generatedDesign.clothing_type,
        template_id: generatedDesign.template_id,
        phone_number: phoneNumber,
        user_photo_base64: userPhotoPreview ? userPhotoPreview.split(',')[1] : null,
        logo_base64: logoPreview ? logoPreview.split(',')[1] : null
      });
      
      setDesigns([response.data, ...designs]);
      toast.success("✨ تم حفظ التصميم في معرضك بنجاح!");
      setPhoneNumber(""); // Reset phone number after save
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
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#D4AF37] to-[#B8941F] rounded-lg sm:rounded-xl shadow-lg">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-[#3E2723]">استوديو التصميم</h1>
              <p className="text-xs sm:text-sm text-[#5D4037] hidden sm:block">مرحباً، {user?.username}</p>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-3">
            {/* Notifications Bell */}
            <div className="relative">
              <Button
                onClick={() => setShowNotifications(!showNotifications)}
                variant="outline"
                size="icon"
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white relative h-9 w-9 sm:h-10 sm:w-10"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs">
                    {unreadCount}
                  </span>
                )}
              </Button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 glass rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto" dir="rtl">
                  <div className="p-3 sm:p-4 border-b border-[#3E2723]/10">
                    <h3 className="font-bold text-[#3E2723] text-sm sm:text-base">الإشعارات</h3>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[#5D4037] text-sm">
                      لا توجد إشعارات
                    </div>
                  ) : (
                    <div className="divide-y divide-[#3E2723]/10">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 sm:p-4 cursor-pointer hover:bg-[#D4AF37]/10 transition-colors ${
                            !notif.is_read ? 'bg-[#D4AF37]/5' : ''
                          }`}
                          onClick={() => markNotificationAsRead(notif.id)}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.is_read ? 'bg-[#D4AF37]' : 'bg-gray-300'}`} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[#3E2723] mb-1 text-sm">{notif.title}</h4>
                              <p className="text-xs sm:text-sm text-[#5D4037]">{notif.message}</p>
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
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white h-9 w-9 sm:h-10 sm:w-10"
            >
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>

            <Button
              onClick={() => {
                resetDesigner();
                setActiveView("showcase");
              }}
              variant="outline"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white hidden md:flex h-9 sm:h-10 text-sm"
            >
              <Sparkles className="ml-2 w-3 h-3 sm:w-4 sm:h-4" />
              تصميم جديد
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="border-[#3E2723] text-[#3E2723] hover:bg-[#3E2723] hover:text-white h-9 sm:h-10 text-sm"
            >
              <LogOut className="ml-2 w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Navigation Tabs */}
        <div className="glass rounded-xl sm:rounded-2xl p-1.5 sm:p-2 mb-6 sm:mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 sm:gap-2 min-w-max sm:min-w-0">
          <button
            onClick={() => setActiveView("showcase")}
            className={`flex-shrink-0 sm:flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
              activeView === "showcase"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50"
            }`}
          >
            <TrendingUp className="inline ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
            تصاميم ملهمة
          </button>
          <button
            onClick={() => setActiveView("templates")}
            className={`flex-shrink-0 sm:flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
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
            className={`flex-shrink-0 sm:flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
              activeView === "customize"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            تخصيص التصميم
          </button>
          <button
            onClick={() => setActiveView("gallery")}
            className={`flex-shrink-0 sm:flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
              activeView === "gallery"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50"
            }`}
          >
            معرضي ({designs.length})
          </button>
          <button
            onClick={() => setActiveView("orders")}
            className={`flex-shrink-0 sm:flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
              activeView === "orders"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50"
            }`}
          >
            <Truck className="inline ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
            طلباتي ({orders.length})
          </button>
          <button
            onClick={() => setActiveView("coupons")}
            className={`flex-shrink-0 sm:flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
              activeView === "coupons"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50"
            }`}
          >
            <Tag className="inline ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
            الكوبونات
          </button>
          </div>
        </div>

        {/* Showcase View */}
        {activeView === "showcase" && (
          <div className="fade-in">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#3E2723] mb-2 sm:mb-3">تصاميم ناجحة تلهمك</h2>
              <p className="text-base sm:text-lg text-[#5D4037]">اكتشف أفضل التصاميم من مصممين آخرين</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {showcaseDesigns.map((design) => (
                <Card key={design.id} className="glass overflow-hidden card-hover group">
                  <div className="relative aspect-square bg-white">
                    <img
                      src={`data:image/png;base64,${design.image_base64}`}
                      alt={design.title}
                      className="w-full h-full object-cover"
                    />
                    {design.is_featured && (
                      <div className="absolute top-2 right-2 bg-[#D4AF37] text-white px-2 sm:px-3 py-1 rounded-full text-xs font-bold">
                        مميز
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 sm:p-4">
                    <h3 className="font-bold text-[#3E2723] mb-1 text-sm sm:text-base">{design.title}</h3>
                    <p className="text-xs sm:text-sm text-[#5D4037] line-clamp-2 mb-2">{design.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#5D4037]">❤️ {design.likes_count} إعجاب</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#D4AF37] hover:text-white hover:bg-[#D4AF37] text-xs sm:text-sm h-8"
                        onClick={() => setActiveView("templates")}
                      >
                        ابدأ التصميم
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-8 sm:mt-12 text-center">
              <Button
                onClick={() => setActiveView("templates")}
                className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white text-base sm:text-lg px-8 sm:px-12 py-4 sm:py-6"
              >
                <Sparkles className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                ابدأ تصميمك الخاص
              </Button>
            </div>
          </div>
        )}

        {/* Templates View */}
        {activeView === "templates" && (
          <div className="fade-in">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#3E2723] mb-2 sm:mb-3">اختر قالبك المفضل</h2>
              <p className="text-base sm:text-lg text-[#5D4037]">ابدأ بقالب جاهز وخصصه حسب ذوقك</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="glass overflow-hidden card-hover cursor-pointer group"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="relative h-48 sm:h-64 bg-gradient-to-br from-[#D4AF37]/10 to-[#B8941F]/10 flex items-center justify-center">
                    <div className="text-5xl sm:text-6xl">
                      {template.type === "shirt" && "👔"}
                      {template.type === "tshirt" && "👕"}
                      {template.type === "hoodie" && "🧥"}
                      {template.type === "dress" && "👗"}
                      {template.type === "jacket" && "🧥"}
                    </div>
                    <div className="absolute inset-0 bg-[#D4AF37]/0 group-hover:bg-[#D4AF37]/10 transition-all flex items-center justify-center">
                      <Button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-[#3E2723] hover:bg-[#D4AF37] hover:text-white text-sm">
                        <Edit className="ml-2 w-3 h-3 sm:w-4 sm:h-4" />
                        تخصيص الآن
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4 sm:p-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#3E2723] mb-2">{template.name}</h3>
                    <p className="text-sm sm:text-base text-[#5D4037] mb-4">{template.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Customize View */}
        {activeView === "customize" && selectedTemplate && (
          <div className="fade-in">
            <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                <div className="w-full sm:w-auto">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#3E2723]">تخصيص: {selectedTemplate.name}</h2>
                  <p className="text-sm sm:text-base text-[#5D4037]">{selectedTemplate.description}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setShowSizeChart(true)}
                    className="border-[#D4AF37] text-[#D4AF37] flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10"
                  >
                    <Ruler className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">جدول المقاسات</span>
                    <span className="sm:hidden">المقاسات</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("templates")}
                    className="flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10"
                  >
                    <span className="hidden sm:inline">تغيير القالب</span>
                    <span className="sm:hidden">تغيير</span>
                  </Button>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                {/* Left: Customization Options */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <Label className="text-base sm:text-lg font-semibold text-[#3E2723] mb-2 sm:mb-3 block">
                      وصف التصميم
                    </Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="صف التصميم الذي تريده بالتفصيل..."
                      className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base md:text-lg border-2 border-[#D4AF37]/30 focus:border-[#D4AF37]"
                    />
                  </div>

                  {/* View Angle Selector */}
                  <div>
                    <Label className="text-base sm:text-lg font-semibold text-[#3E2723] mb-2 sm:mb-3 block flex items-center">
                      <Eye className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                      زاوية العرض
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {VIEW_ANGLES.map((angle) => (
                        <button
                          key={angle.value}
                          onClick={() => setSelectedViewAngle(angle.value)}
                          className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${
                            selectedViewAngle === angle.value
                              ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                              : 'border-gray-300 hover:border-[#D4AF37]/50'
                          }`}
                        >
                          <div className="text-2xl sm:text-3xl mb-0.5 sm:mb-1">{angle.icon}</div>
                          <div className="text-xs sm:text-sm font-semibold">{angle.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <Label className="text-base sm:text-lg font-semibold text-[#3E2723] flex items-center">
                        <Ruler className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                        المقاس
                      </Label>
                      <Button
                        variant="link"
                        onClick={() => setShowMeasurements(true)}
                        className="text-[#D4AF37] text-xs sm:text-sm p-0 h-auto"
                      >
                        أدخل مقاساتك
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {SIZES.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`p-2.5 sm:p-3 rounded-lg border-2 font-bold transition-all text-sm sm:text-base ${
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Button
                      onClick={enhancePrompt}
                      disabled={enhancing || !prompt.trim()}
                      variant="outline"
                      className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white h-10 sm:h-11 text-sm sm:text-base"
                    >
                      {enhancing ? (
                        <Loader2 className="ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <Sparkles className="ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                      تحسين الوصف
                    </Button>

                    <Button
                      onClick={handleGenerate}
                      disabled={generating || !prompt.trim()}
                      className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white h-10 sm:h-11 text-sm sm:text-base"
                    >
                      {generating ? (
                        <Loader2 className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <Sparkles className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                      إنشاء التصميم
                    </Button>
                  </div>

                  {enhancedPrompt && (
                    <div className="p-3 sm:p-4 bg-[#D4AF37]/10 rounded-lg sm:rounded-xl border border-[#D4AF37]/30">
                      <p className="text-xs sm:text-sm font-semibold text-[#3E2723] mb-1 sm:mb-2">الوصف المحسّن:</p>
                      <p className="text-[#5D4037] text-xs sm:text-sm">{enhancedPrompt}</p>
                    </div>
                  )}
                </div>

                {/* Right: Design Preview */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="w-full aspect-square bg-gradient-to-br from-[#D4AF37]/5 to-[#B8941F]/5 rounded-2xl sm:rounded-3xl border-2 border-dashed border-[#D4AF37]/30 flex items-center justify-center overflow-hidden">
                    {generatedDesign ? (
                      <img 
                        src={`data:image/png;base64,${generatedDesign.image_base64}`}
                        alt="Generated Design" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-[#D4AF37] mx-auto mb-3 sm:mb-4 opacity-50" />
                        <p className="text-[#5D4037] text-sm sm:text-base md:text-lg">سيظهر تصميمك هنا</p>
                      </div>
                    )}
                  </div>

                  {/* Actions when design is generated */}
                  {generatedDesign && !showOrderForm && (
                    <div className="space-y-2 sm:space-y-3">
                      <Button
                        onClick={handleSaveToGallery}
                        className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white py-3 sm:py-4 hover:scale-105 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden text-sm sm:text-base"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
                        <Save className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-bounce" />
                        <span className="font-bold">حفظ في معرضي</span>
                      </Button>
                      <Button
                        onClick={() => setShowOrderForm(true)}
                        variant="outline"
                        className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white py-3 sm:py-4 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
                      >
                        <ShoppingCart className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                        أعجبني! أريد طلبه
                      </Button>
                    </div>
                  )}

                  {/* Simple Order Form */}
                  {showOrderForm && (
                    <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 fade-in">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-[#3E2723]">إتمام الطلب</h3>
                        <button 
                          onClick={() => setShowOrderForm(false)}
                          className="text-[#5D4037] hover:text-[#3E2723] p-1"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-3 sm:p-4 bg-[#D4AF37]/10 rounded-lg">
                        <div className="flex justify-between">
                          <span className="text-[#5D4037] text-sm sm:text-base">المقاس:</span>
                          <span className="font-bold text-[#3E2723] text-sm sm:text-base">{selectedSize}</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs sm:text-sm font-semibold text-[#3E2723] mb-2 block">
                          <Phone className="inline ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          رقم الهاتف للتواصل
                        </Label>
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="05xxxxxxxx"
                          className="w-full text-base sm:text-lg h-11 sm:h-12"
                          dir="ltr"
                        />
                      </div>

                      <Button
                        onClick={handleSubmitOrder}
                        disabled={submittingOrder || !phoneNumber.trim()}
                        className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white py-3 sm:py-4 text-sm sm:text-base"
                      >
                        {submittingOrder ? (
                          <>
                            <Loader2 className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                            جاري الإرسال...
                          </>
                        ) : (
                          <>
                            <Package className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
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

        {/* My Orders View */}
        {activeView === "orders" && (
          <div className="fade-in">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#3E2723] mb-2 sm:mb-3">طلباتي</h2>
              <p className="text-base sm:text-lg text-[#5D4037]">تتبع حالة طلباتك ({orders.length})</p>
            </div>

            {orders.length === 0 ? (
              <div className="glass rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
                <Truck className="w-12 h-12 sm:w-16 sm:h-16 text-[#D4AF37] mx-auto mb-3 sm:mb-4" />
                <p className="text-lg sm:text-xl text-[#5D4037] mb-3 sm:mb-4">لا توجد طلبات بعد</p>
                <Button
                  onClick={() => setActiveView("showcase")}
                  className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white text-sm sm:text-base"
                >
                  ابدأ الطلب الأول
                </Button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {orders.map((order) => (
                  <Card key={order.id} className="glass overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6" dir="rtl">
                        {/* Order Image */}
                        <div className="w-full sm:w-24 md:w-32 h-24 sm:h-24 md:h-32 flex-shrink-0 rounded-lg sm:rounded-xl overflow-hidden bg-white">
                          <img
                            src={`data:image/png;base64,${order.design_image_base64}`}
                            alt="Design"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Order Details */}
                        <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-[#3E2723] text-base sm:text-lg mb-1">
                                طلب #{order.id.substring(0, 8)}
                              </h3>
                              <p className="text-xs sm:text-sm text-[#5D4037] line-clamp-2">{order.prompt}</p>
                            </div>
                            <span
                              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap ${
                                order.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : order.status === "processing"
                                  ? "bg-blue-100 text-blue-700"
                                  : order.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {order.status === "pending"
                                ? "قيد الانتظار"
                                : order.status === "processing"
                                ? "قيد التنفيذ"
                                : order.status === "completed"
                                ? "مكتمل"
                                : "ملغي"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div>
                              <span className="text-[#5D4037]">المقاس:</span>{" "}
                              <span className="font-bold text-[#3E2723]">{order.size || "غير محدد"}</span>
                            </div>
                            <div>
                              <span className="text-[#5D4037]">رقم الهاتف:</span>{" "}
                              <span className="font-bold text-[#3E2723]">{order.phone_number}</span>
                            </div>
                            <div>
                              <span className="text-[#5D4037]">التاريخ:</span>{" "}
                              <span className="font-bold text-[#3E2723]">
                                {new Date(order.created_at).toLocaleDateString("ar-EG")}
                              </span>
                            </div>
                          </div>

                          {order.notes && (
                            <div className="pt-3 border-t border-[#3E2723]/10">
                              <div className="text-sm text-[#5D4037] italic">
                                &ldquo;{order.notes}&rdquo;
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coupons View */}
        {activeView === "coupons" && (
          <div className="fade-in">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#3E2723] mb-2 sm:mb-3">الكوبونات المتاحة</h2>
              <p className="text-base sm:text-lg text-[#5D4037]">احصل على خصومات رائعة</p>
            </div>

            {availableCoupons.length === 0 ? (
              <div className="glass rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
                <Tag className="w-12 h-12 sm:w-16 sm:h-16 text-[#D4AF37] mx-auto mb-3 sm:mb-4" />
                <p className="text-lg sm:text-xl text-[#5D4037]">لا توجد كوبونات متاحة حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {availableCoupons.map((coupon, idx) => (
                  <Card
                    key={idx}
                    className="glass overflow-hidden border-2 border-[#D4AF37] hover:shadow-2xl transition-all card-hover"
                  >
                    <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8941F] p-4 sm:p-6 text-white">
                      <Tag className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3" />
                      <div className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2">
                        {coupon.discount_percentage}%
                      </div>
                      <div className="text-xs sm:text-sm opacity-90">خصم على طلبك</div>
                    </div>
                    <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4" dir="rtl">
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-[#3E2723] bg-[#D4AF37]/10 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg inline-block tracking-wider">
                          {coupon.code}
                        </div>
                      </div>
                      <p className="text-[#5D4037] text-center text-sm sm:text-base">{coupon.description}</p>
                      {coupon.min_purchase > 0 && (
                        <p className="text-xs text-[#5D4037] text-center">
                          الحد الأدنى للشراء: {coupon.min_purchase} ر.س
                        </p>
                      )}
                      {coupon.expiry_date && (
                        <p className="text-xs text-[#5D4037] text-center">
                          صالح حتى: {new Date(coupon.expiry_date).toLocaleDateString("ar-EG")}
                        </p>
                      )}
                      <Button
                        onClick={() => {
                          // Try modern clipboard API first, fallback to textarea method
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(coupon.code)
                              .then(() => {
                                toast.success("تم نسخ الكوبون!");
                              })
                              .catch(() => {
                                // Fallback method
                                const textArea = document.createElement("textarea");
                                textArea.value = coupon.code;
                                textArea.style.position = "fixed";
                                textArea.style.left = "-999999px";
                                document.body.appendChild(textArea);
                                textArea.focus();
                                textArea.select();
                                try {
                                  document.execCommand('copy');
                                  toast.success("تم نسخ الكوبون!");
                                } catch (err) {
                                  toast.error("فشل نسخ الكوبون");
                                }
                                document.body.removeChild(textArea);
                              });
                          } else {
                            // Fallback for older browsers
                            const textArea = document.createElement("textarea");
                            textArea.value = coupon.code;
                            textArea.style.position = "fixed";
                            textArea.style.left = "-999999px";
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            try {
                              document.execCommand('copy');
                              toast.success("تم نسخ الكوبون!");
                            } catch (err) {
                              toast.error("فشل نسخ الكوبون");
                            }
                            document.body.removeChild(textArea);
                          }
                        }}
                        className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white text-sm sm:text-base h-10 sm:h-11"
                      >
                        نسخ الكود
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gallery View */}
        {activeView === "gallery" && (
          <div className="fade-in">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#3E2723] mb-2 sm:mb-3">معرض تصاميمي</h2>
              <p className="text-base sm:text-lg text-[#5D4037]">جميع تصاميمك المحفوظة ({designs.length})</p>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-12 sm:py-20">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#D4AF37] animate-spin" />
              </div>
            ) : designs.length === 0 ? (
              <div className="glass rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-[#D4AF37] mx-auto mb-3 sm:mb-4" />
                <p className="text-lg sm:text-xl text-[#5D4037] mb-3 sm:mb-4">لا توجد تصاميم محفوظة بعد</p>
                <Button
                  onClick={() => setActiveView("showcase")}
                  className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white text-sm sm:text-base"
                >
                  <Sparkles className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                  ابدأ التصميم الآن
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                        className="absolute top-2 sm:top-4 left-2 sm:left-4 p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        <Heart
                          className={`w-5 h-5 sm:w-6 sm:h-6 ${
                            design.is_favorite
                              ? "fill-red-500 text-red-500"
                              : "text-[#5D4037]"
                          }`}
                        />
                      </button>
                    </div>
                    <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <p className="text-[#3E2723] line-clamp-2 text-sm sm:text-base">{design.prompt}</p>
                      <Button
                        onClick={() => setDeleteDialog({ open: true, designId: design.id })}
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs sm:text-sm h-8 sm:h-9"
                      >
                        <Trash2 className="ml-1.5 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4" />
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
