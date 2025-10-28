import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Heart, Trash2, LogOut, Loader2, Download, Upload, Wand2, Save, Edit, X, Phone, ShoppingCart, Package } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, designId: null });
  const [templates, setTemplates] = useState([]);
  const [activeView, setActiveView] = useState("templates");
  
  // Design State
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  
  // Preview State (in-page)
  const [generatedDesign, setGeneratedDesign] = useState(null);
  
  // Order State
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderImagePreview, setOrderImagePreview] = useState(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    fetchDesigns();
    fetchTemplates();
  }, []);

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

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error("Failed to fetch templates");
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

  const handleOrderImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOrderImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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
        save_to_gallery: false
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
    
    try {
      const response = await axios.post(`${API}/designs/save`, {
        prompt: generatedDesign.prompt,
        image_base64: generatedDesign.image_base64,
        clothing_type: generatedDesign.clothing_type,
        template_id: generatedDesign.template_id,
        logo_base64: logoPreview ? logoPreview.split(',')[1] : null,
        user_photo_base64: userPhotoPreview ? userPhotoPreview.split(',')[1] : null
      });
      
      setDesigns([response.data, ...designs]);
      toast.success("تم حفظ التصميم في معرضك!");
      setActiveView("gallery");
    } catch (error) {
      toast.error("فشل في حفظ التصميم");
    }
  };

  const handleSubmitOrder = async () => {
    if (!phoneNumber.trim()) {
      toast.error("الرجاء إدخال رقم الهاتف");
      return;
    }
    
    if (!orderImagePreview) {
      toast.error("الرجاء رفع صورة");
      return;
    }

    setSubmittingOrder(true);
    try {
      await axios.post(`${API}/orders/create`, {
        design_image_base64: generatedDesign.image_base64,
        prompt: generatedDesign.prompt,
        phone_number: phoneNumber,
        uploaded_image_base64: orderImagePreview.split(',')[1]
      });
      
      toast.success("تم إرسال الطلب بنجاح! سنتواصل معك قريباً");
      setShowOrderForm(false);
      setPhoneNumber("");
      setOrderImagePreview(null);
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

  const downloadImage = (imageBase64, prompt) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `design-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-[#E8DCC8] to-[#F5F0E8]" data-testid="dashboard-page">
      {/* Header */}
      <header className="glass border-b border-[#3E2723]/10 sticky top-0 z-50 backdrop-blur-xl" data-testid="dashboard-header">
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
            <Button
              onClick={() => {
                resetDesigner();
                setActiveView("templates");
              }}
              variant="outline"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
              data-testid="new-design-btn"
            >
              <Sparkles className="ml-2 w-4 h-4" />
              تصميم جديد
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="border-[#3E2723] text-[#3E2723] hover:bg-[#3E2723] hover:text-white"
              data-testid="logout-btn"
            >
              <LogOut className="ml-2 w-4 h-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="glass rounded-2xl p-2 mb-8 flex gap-2" data-testid="nav-tabs">
          <button
            onClick={() => setActiveView("templates")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeView === "templates"
                ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white shadow-lg"
                : "text-[#5D4037] hover:bg-white/50"
            }`}
            data-testid="tab-templates"
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
            data-testid="tab-customize"
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
            data-testid="tab-gallery"
          >
            معرضي ({designs.length})
          </button>
        </div>

        {/* Templates View */}
        {activeView === "templates" && (
          <div className="fade-in" data-testid="templates-view">
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
                  data-testid={`template-card-${template.id}`}
                >
                  <div className="relative h-64 bg-gradient-to-br from-[#D4AF37]/10 to-[#B8941F]/10 flex items-center justify-center">
                    <div className="text-6xl">
                      {template.type === "shirt" && "👔"}
                      {template.type === "tshirt" && "👕"}
                      {template.type === "hoodie" && "🧥"}
                      {template.type === "dress" && "👗"}
                      {template.type === "jacket" && "🧥"}
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#5D4037]">انقر للتخصيص</span>
                      <Wand2 className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                  </CardContent>
                </Card>
              ))}</div>
          </div>
        )}

        {/* Customize View */}
        {activeView === "customize" && selectedTemplate && (
          <div className="fade-in" data-testid="customize-view">
            <div className="glass rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-[#3E2723]">تخصيص: {selectedTemplate.name}</h2>
                  <p className="text-[#5D4037]">{selectedTemplate.description}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActiveView("templates")}
                  data-testid="back-to-templates"
                >
                  تغيير القالب
                </Button>
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
                      className="min-h-[120px] text-lg border-2 border-[#D4AF37]/30 focus:border-[#D4AF37]"
                      data-testid="design-prompt-input"
                    />
                  </div>

                  <Button
                    onClick={enhancePrompt}
                    disabled={enhancing || !prompt.trim()}
                    variant="outline"
                    className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                    data-testid="enhance-prompt-btn"
                  >
                    {enhancing ? (
                      <>
                        <Loader2 className="ml-2 w-4 h-4 animate-spin" />
                        جاري التحسين...
                      </>
                    ) : (
                      <>
                        <Sparkles className="ml-2 w-4 h-4" />
                        تحسين الوصف بالذكاء الاصطناعي
                      </>
                    )}
                  </Button>

                  {enhancedPrompt && (
                    <div className="p-4 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30">
                      <p className="text-sm font-semibold text-[#3E2723] mb-2">الوصف المحسّن:</p>
                      <p className="text-[#5D4037]">{enhancedPrompt}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#3E2723]">شعار (اختياري)</Label>
                      <div className="border-2 border-dashed border-[#D4AF37]/50 rounded-xl p-4 text-center hover:border-[#D4AF37] transition-colors h-32 flex items-center justify-center">
                        {logoPreview ? (
                          <div className="relative w-full h-full">
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                            <button
                              onClick={() => setLogoPreview(null)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                            <Upload className="w-8 h-8 text-[#D4AF37] mb-1" />
                            <p className="text-xs text-[#5D4037]">رفع شعار</p>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                              data-testid="logo-upload"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* User Photo Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#3E2723]">صورتك (اختياري)</Label>
                      <div className="border-2 border-dashed border-[#D4AF37]/50 rounded-xl p-4 text-center hover:border-[#D4AF37] transition-colors h-32 flex items-center justify-center">
                        {userPhotoPreview ? (
                          <div className="relative w-full h-full">
                            <img src={userPhotoPreview} alt="User" className="w-full h-full object-cover rounded" />
                            <button
                              onClick={() => setUserPhotoPreview(null)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                            <Upload className="w-8 h-8 text-[#D4AF37] mb-1" />
                            <p className="text-xs text-[#5D4037]">رفع صورة</p>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                              data-testid="photo-upload"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white py-6 text-lg"
                    data-testid="generate-design-btn"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="ml-2 w-5 h-5 animate-spin" />
                        جاري إنشاء تصميمك... (قد يستغرق دقيقة)
                      </>
                    ) : (
                      <>
                        <Sparkles className="ml-2 w-5 h-5" />
                        إنشاء التصميم الآن
                      </>
                    )}
                  </Button>
                </div>

                {/* Right: Design Preview */}
                <div className="space-y-4">
                  <div className="w-full aspect-square bg-gradient-to-br from-[#D4AF37]/5 to-[#B8941F]/5 rounded-3xl border-2 border-dashed border-[#D4AF37]/30 flex items-center justify-center overflow-hidden">
                    {generatedDesign ? (
                      <img 
                        src={`data:image/png;base64,${generatedDesign.image_base64}`}
                        alt="Generated Design" 
                        className="w-full h-full object-contain"
                        data-testid="generated-design-preview"
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
                        data-testid="save-to-gallery-btn"
                      >
                        <Save className="ml-2 w-5 h-5" />
                        حفظ في معرضي
                      </Button>
                      <Button
                        onClick={() => setShowOrderForm(true)}
                        variant="outline"
                        className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white py-4"
                        data-testid="order-design-btn"
                      >
                        <ShoppingCart className="ml-2 w-5 h-5" />
                        أعجبني! أريد طلبه
                      </Button>
                      <Button
                        onClick={() => downloadImage(generatedDesign.image_base64, generatedDesign.prompt)}
                        variant="outline"
                        className="w-full py-4"
                        data-testid="download-design-btn"
                      >
                        <Download className="ml-2 w-5 h-5" />
                        تحميل التصميم
                      </Button>
                    </div>
                  )}

                  {/* Order Form */}
                  {showOrderForm && (
                    <div className="glass rounded-2xl p-6 space-y-4 fade-in" data-testid="order-form">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-[#3E2723]">إتمام الطلب</h3>
                        <button 
                          onClick={() => setShowOrderForm(false)}
                          className="text-[#5D4037] hover:text-[#3E2723]"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-[#3E2723] mb-2 block">
                          رقم الهاتف
                        </Label>
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="05xxxxxxxx"
                          className="w-full"
                          data-testid="phone-input"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-[#3E2723] mb-2 block">
                          رفع صورة توضيحية
                        </Label>
                        <div className="border-2 border-dashed border-[#D4AF37]/50 rounded-xl p-4 text-center hover:border-[#D4AF37] transition-colors">
                          {orderImagePreview ? (
                            <div className="relative">
                              <img src={orderImagePreview} alt="Order" className="w-full h-32 object-cover rounded mb-2" />
                              <Button
                                onClick={() => setOrderImagePreview(null)}
                                variant="destructive"
                                size="sm"
                              >
                                <X className="ml-2 w-4 h-4" />
                                إزالة
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <Upload className="w-12 h-12 text-[#D4AF37] mx-auto mb-2" />
                              <p className="text-sm text-[#5D4037]">اضغط لرفع صورة</p>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={handleOrderImageUpload}
                                className="hidden"
                                data-testid="order-image-upload"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={handleSubmitOrder}
                        disabled={submittingOrder || !phoneNumber.trim() || !orderImagePreview}
                        className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white py-4"
                        data-testid="submit-order-btn"
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gallery View */}
        {activeView === "gallery" && (
          <div className="fade-in" data-testid="gallery-view">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-[#3E2723] mb-3">معرض تصاميمي</h2>
              <p className="text-lg text-[#5D4037]">جميع تصاميمك المحفوظة ({designs.length})</p>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-20" data-testid="loading-designs">
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
              </div>
            ) : designs.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center" data-testid="no-designs">
                <Sparkles className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                <p className="text-xl text-[#5D4037] mb-4">لا توجد تصاميم محفوظة بعد</p>
                <Button
                  onClick={() => setActiveView("templates")}
                  className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white"
                >
                  <Sparkles className="ml-2 w-5 h-5" />
                  ابدأ التصميم الآن
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {designs.map((design) => (
                  <Card key={design.id} className="glass overflow-hidden card-hover" data-testid={`design-card-${design.id}`}>
                    <div className="relative aspect-square bg-white">
                      <img
                        src={`data:image/png;base64,${design.image_base64}`}
                        alt={design.prompt}
                        className="w-full h-full object-cover"
                        data-testid={`design-image-${design.id}`}
                      />
                      <button
                        onClick={() => toggleFavorite(design.id, design.is_favorite)}
                        className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-transform"
                        data-testid={`favorite-btn-${design.id}`}
                      >
                        <Heart
                          className={`w-6 h-6 ${
                            design.is_favorite
                              ? "fill-red-500 text-red-500"
                              : "text-[#5D4037]"
                          }`}
                        />
                      </button>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <p className="text-[#3E2723] line-clamp-2" data-testid={`design-prompt-${design.id}`}>
                        {design.prompt}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => downloadImage(design.image_base64, design.prompt)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                          data-testid={`download-btn-${design.id}`}
                        >
                          <Download className="ml-2 w-4 h-4" />
                          تحميل
                        </Button>
                        <Button
                          onClick={() => setDeleteDialog({ open: true, designId: design.id })}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          data-testid={`delete-btn-${design.id}`}
                        >
                          <Trash2 className="ml-2 w-4 h-4" />
                          حذف
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, designId: null })}>
        <AlertDialogContent dir="rtl" data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف التصميم نهائياً ولا يمكن استرجاعه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel-btn">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              data-testid="delete-confirm-btn"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
