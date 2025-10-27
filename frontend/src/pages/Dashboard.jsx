import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Heart, Trash2, LogOut, Loader2, Download, Upload, Wand2, ChevronRight, ChevronLeft, Image as ImageIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CLOTHING_TYPES = [
  { id: "shirt", name: "قميص", icon: "👔" },
  { id: "tshirt", name: "تيشيرت", icon: "👕" },
  { id: "hoodie", name: "هودي", icon: "🧥" },
  { id: "dress", name: "فستان", icon: "👗" },
  { id: "jacket", name: "جاكيت", icon: "🧥" },
  { id: "pants", name: "بنطال", icon: "👖" },
];

export default function Dashboard({ user, onLogout }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, designId: null });
  
  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [userPhotoFile, setUserPhotoFile] = useState(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState(null);
  const [enhancing, setEnhancing] = useState(false);

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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
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
      setUserPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const enhancePrompt = async () => {
    if (!prompt.trim() || !selectedType) {
      toast.error("الرجاء إدخال وصف واختيار نوع الملبس");
      return;
    }

    setEnhancing(true);
    try {
      const response = await axios.post(`${API}/prompt/enhance`, {
        prompt: prompt,
        clothing_type: selectedType
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
        clothing_type: selectedType,
        template_id: selectedTemplate?.id,
        logo_base64: logoPreview ? logoPreview.split(',')[1] : null,
        user_photo_base64: userPhotoPreview ? userPhotoPreview.split(',')[1] : null
      };

      const response = await axios.post(`${API}/designs/generate`, payload);
      setDesigns([response.data, ...designs]);
      
      // Reset wizard
      resetWizard();
      toast.success("تم إنشاء التصميم بنجاح!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل في إنشاء التصميم");
    } finally {
      setGenerating(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedType("");
    setSelectedTemplate(null);
    setPrompt("");
    setEnhancedPrompt("");
    setLogoFile(null);
    setLogoPreview(null);
    setUserPhotoFile(null);
    setUserPhotoPreview(null);
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

  const filteredTemplates = templates.filter(t => !selectedType || t.type === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-[#E8DCC8] to-[#F5F0E8]" data-testid="dashboard-page">
      {/* Header */}
      <header className="glass border-b border-[#3E2723]/10 sticky top-0 z-50" data-testid="dashboard-header">
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
          <Button
            onClick={onLogout}
            variant="outline"
            className="border-[#3E2723] text-[#3E2723] hover:bg-[#3E2723] hover:text-white transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="ml-2 w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Design Wizard */}
        <Tabs value="create" className="mb-12">
          <TabsList className="glass w-full justify-start mb-6" data-testid="main-tabs">
            <TabsTrigger value="create" className="text-lg px-6">إنشاء تصميم جديد</TabsTrigger>
            <TabsTrigger value="gallery" className="text-lg px-6">معرض التصاميم ({designs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="glass rounded-3xl p-8 shadow-2xl" data-testid="design-wizard">
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                      currentStep >= step 
                        ? 'bg-gradient-to-br from-[#D4AF37] to-[#B8941F] text-white' 
                        : 'bg-gray-200 text-gray-500'
                    } font-bold transition-all`}>
                      {step}
                    </div>
                    {step < 4 && (
                      <div className={`flex-1 h-1 mx-2 ${
                        currentStep > step ? 'bg-[#D4AF37]' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Choose Type */}
              {currentStep === 1 && (
                <div className="space-y-6 fade-in" data-testid="step-1">
                  <h2 className="text-3xl font-bold text-[#3E2723] mb-4">الخطوة 1: اختر نوع الملبس</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {CLOTHING_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                          selectedType === type.id
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-lg'
                            : 'border-gray-200 hover:border-[#D4AF37]/50'
                        }`}
                        data-testid={`type-${type.id}`}
                      >
                        <div className="text-4xl mb-2">{type.icon}</div>
                        <div className="text-sm font-semibold text-[#3E2723]">{type.name}</div>
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={!selectedType}
                    className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white py-6 text-lg"
                    data-testid="next-step-1"
                  >
                    التالي
                    <ChevronLeft className="mr-2" />
                  </Button>
                </div>
              )}

              {/* Step 2: Choose Template or Custom */}
              {currentStep === 2 && (
                <div className="space-y-6 fade-in" data-testid="step-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-bold text-[#3E2723]">الخطوة 2: اختر قالب أو صمم من الصفر</h2>
                    <Button variant="outline" onClick={() => setCurrentStep(1)} data-testid="back-step-2">
                      <ChevronRight className="ml-2" />
                      السابق
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Custom Design Option */}
                    <button
                      onClick={() => {
                        setSelectedTemplate(null);
                        setCurrentStep(3);
                      }}
                      className="p-6 rounded-2xl border-2 border-dashed border-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all"
                      data-testid="custom-design-btn"
                    >
                      <Wand2 className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
                      <h3 className="font-bold text-[#3E2723] mb-2">تصميم مخصص</h3>
                      <p className="text-sm text-[#5D4037]">ابدأ من الصفر</p>
                    </button>

                    {/* Templates */}
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setPrompt(template.prompt);
                          setCurrentStep(3);
                        }}
                        className="p-6 rounded-2xl border-2 border-gray-200 hover:border-[#D4AF37] hover:shadow-lg transition-all text-right"
                        data-testid={`template-${template.id}`}
                      >
                        <h3 className="font-bold text-[#3E2723] mb-2">{template.name}</h3>
                        <p className="text-sm text-[#5D4037]">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Customize Design */}
              {currentStep === 3 && (
                <div className="space-y-6 fade-in" data-testid="step-3">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-bold text-[#3E2723]">الخطوة 3: تخصيص التصميم</h2>
                    <Button variant="outline" onClick={() => setCurrentStep(2)} data-testid="back-step-3">
                      <ChevronRight className="ml-2" />
                      السابق
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-lg font-semibold text-[#3E2723] mb-2 block">
                        وصف التصميم
                      </Label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="صف التصميم الذي تريده بالتفصيل... مثال: قميص أزرق فاتح مع طبعة ورود صغيرة على الصدر"
                        className="min-h-[100px] text-lg border-2 border-[#D4AF37]/30"
                        data-testid="design-prompt-input"
                      />
                    </div>

                    <Button
                      onClick={enhancePrompt}
                      disabled={enhancing || !prompt.trim()}
                      variant="outline"
                      className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
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

                    <div className="grid md:grid-cols-2 gap-4 mt-6">
                      {/* Logo Upload */}
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold text-[#3E2723]">رفع شعار (اختياري)</Label>
                        <div className="border-2 border-dashed border-[#D4AF37]/50 rounded-xl p-6 text-center hover:border-[#D4AF37] transition-colors">
                          {logoPreview ? (
                            <div className="relative">
                              <img src={logoPreview} alt="Logo" className="w-32 h-32 object-contain mx-auto mb-2" />
                              <Button
                                onClick={() => {
                                  setLogoFile(null);
                                  setLogoPreview(null);
                                }}
                                variant="destructive"
                                size="sm"
                              >
                                إزالة
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <Upload className="w-12 h-12 text-[#D4AF37] mx-auto mb-2" />
                              <p className="text-sm text-[#5D4037]">اضغط لرفع الشعار</p>
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
                        <Label className="text-lg font-semibold text-[#3E2723]">رفع صورتك (اختياري)</Label>
                        <div className="border-2 border-dashed border-[#D4AF37]/50 rounded-xl p-6 text-center hover:border-[#D4AF37] transition-colors">
                          {userPhotoPreview ? (
                            <div className="relative">
                              <img src={userPhotoPreview} alt="User" className="w-32 h-32 object-cover rounded-lg mx-auto mb-2" />
                              <Button
                                onClick={() => {
                                  setUserPhotoFile(null);
                                  setUserPhotoPreview(null);
                                }}
                                variant="destructive"
                                size="sm"
                              >
                                إزالة
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <ImageIcon className="w-12 h-12 text-[#D4AF37] mx-auto mb-2" />
                              <p className="text-sm text-[#5D4037]">اضغط لرفع صورتك</p>
                              <p className="text-xs text-[#5D4037]/70 mt-1">لرؤية التصميم عليك</p>
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
                  </div>

                  <Button
                    onClick={() => setCurrentStep(4)}
                    disabled={!prompt.trim()}
                    className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white py-6 text-lg"
                    data-testid="next-step-3"
                  >
                    معاينة وتوليد
                    <ChevronLeft className="mr-2" />
                  </Button>
                </div>
              )}

              {/* Step 4: Preview and Generate */}
              {currentStep === 4 && (
                <div className="space-y-6 fade-in" data-testid="step-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-3xl font-bold text-[#3E2723]">الخطوة 4: معاينة وتوليد</h2>
                    <Button variant="outline" onClick={() => setCurrentStep(3)} data-testid="back-step-4">
                      <ChevronRight className="ml-2" />
                      السابق
                    </Button>
                  </div>

                  <div className="glass rounded-2xl p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold text-[#3E2723] mb-2">نوع الملبس:</h3>
                      <p className="text-[#5D4037]">
                        {CLOTHING_TYPES.find(t => t.id === selectedType)?.name}
                      </p>
                    </div>

                    {selectedTemplate && (
                      <div>
                        <h3 className="font-semibold text-[#3E2723] mb-2">القالب المختار:</h3>
                        <p className="text-[#5D4037]">{selectedTemplate.name}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-[#3E2723] mb-2">الوصف:</h3>
                      <p className="text-[#5D4037]">{enhancedPrompt || prompt}</p>
                    </div>

                    {(logoPreview || userPhotoPreview) && (
                      <div className="flex gap-4">
                        {logoPreview && (
                          <div>
                            <h3 className="font-semibold text-[#3E2723] mb-2">الشعار:</h3>
                            <img src={logoPreview} alt="Logo" className="w-20 h-20 object-contain border rounded" />
                          </div>
                        )}
                        {userPhotoPreview && (
                          <div>
                            <h3 className="font-semibold text-[#3E2723] mb-2">صورتك:</h3>
                            <img src={userPhotoPreview} alt="User" className="w-20 h-20 object-cover rounded border" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white py-8 text-xl shadow-2xl"
                    data-testid="generate-final-btn"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="ml-2 w-6 h-6 animate-spin" />
                        جاري إنشاء التصميم... (قد يستغرق دقيقة)
                      </>
                    ) : (
                      <>
                        <Sparkles className="ml-2 w-6 h-6" />
                        توليد التصميم الآن
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={resetWizard}
                    variant="outline"
                    className="w-full"
                    data-testid="reset-wizard-btn"
                  >
                    إعادة البداية
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="gallery">
            {/* Designs Grid */}
            <div data-testid="designs-section">
              {loading ? (
                <div className="flex justify-center items-center py-20" data-testid="loading-designs">
                  <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
                </div>
              ) : designs.length === 0 ? (
                <div className="glass rounded-3xl p-12 text-center" data-testid="no-designs">
                  <Sparkles className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                  <p className="text-xl text-[#5D4037]">لا توجد تصاميم بعد. ابدأ بإنشاء تصميمك الأول!</p>
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
                        {design.clothing_type && (
                          <div className="absolute top-4 right-4 px-3 py-1 bg-[#D4AF37] text-white text-sm rounded-full">
                            {CLOTHING_TYPES.find(t => t.id === design.clothing_type)?.name || design.clothing_type}
                          </div>
                        )}
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
          </TabsContent>
        </Tabs>
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