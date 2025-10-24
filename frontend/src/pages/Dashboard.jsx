import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Heart, Trash2, LogOut, Loader2, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, designId: null });

  useEffect(() => {
    fetchDesigns();
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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("الرجاء إدخال وصف التصميم");
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/designs/generate`, { prompt });
      setDesigns([response.data, ...designs]);
      setPrompt("");
      toast.success("تم إنشاء التصميم بنجاح!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل في إنشاء التصميم");
    } finally {
      setGenerating(false);
    }
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
        {/* Design Generator */}
        <div className="glass rounded-3xl p-8 mb-12 shadow-2xl" data-testid="design-generator">
          <h2 className="text-3xl font-bold text-[#3E2723] mb-6">صمم ملابسك الآن</h2>
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="صف التصميم الذي تريده... مثال: قميص كاجوال باللون الأزرق الفاتح مع طبعة ورود صغيرة"
              className="min-h-[120px] text-lg resize-none border-2 border-[#D4AF37]/30 focus:border-[#D4AF37]"
              disabled={generating}
              data-testid="design-prompt-input"
            />
            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] hover:from-[#B8941F] hover:to-[#9A7A1A] text-white text-lg py-6 shadow-xl"
              data-testid="generate-design-btn"
            >
              {generating ? (
                <>
                  <Loader2 className="ml-2 w-5 h-5 animate-spin" />
                  جاري التصميم...
                </>
              ) : (
                <>
                  <Sparkles className="ml-2 w-5 h-5" />
                  توليد التصميم
                </>
              )}
            </Button>
          </div>
          {generating && (
            <div className="mt-6 p-4 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30" data-testid="generating-notice">
              <p className="text-[#5D4037] text-center">
                ⏱️ جاري إنشاء تصميمك... قد يستغرق الأمر حتى دقيقة واحدة
              </p>
            </div>
          )}
        </div>

        {/* Designs Grid */}
        <div data-testid="designs-section">
          <h2 className="text-3xl font-bold text-[#3E2723] mb-6">تصاميمي ({designs.length})</h2>
          
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