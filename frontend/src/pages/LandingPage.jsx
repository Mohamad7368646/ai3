import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Wand2, Heart, TrendingUp } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LandingPage({ onLogin }) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload = authMode === "login" 
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      
      onLogin(response.data.access_token, response.data.user);
      toast.success(authMode === "login" ? "تم تسجيل الدخول بنجاح!" : "تم إنشاء الحساب بنجاح!");
      setShowAuth(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-[#E8DCC8] to-[#F5F0E8] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#D4AF37]/20 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#3E2723]/10 to-transparent rounded-full blur-3xl"></div>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="text-center mb-16 fade-in">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl">
              <Sparkles className="w-16 h-16 text-[#D4AF37]" />
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#3E2723] mb-6 leading-tight" data-testid="main-heading">
            استوديو تصميم الأزياء
          </h1>
          <p className="text-lg sm:text-xl text-[#5D4037] max-w-2xl mx-auto mb-8" data-testid="main-subtitle">
            صمم ملابسك الخاصة بلمسة من الذكاء الاصطناعي - حول أفكارك إلى تصاميم احترافية فورية
          </p>
          <Button
            onClick={() => setShowAuth(true)}
            className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] hover:from-[#B8941F] hover:to-[#9A7A1A] text-white text-lg px-12 py-6 rounded-xl shadow-2xl hover:shadow-[#D4AF37]/30 transition-all duration-300 hover:scale-105"
            data-testid="get-started-btn"
          >
            <Wand2 className="ml-2 w-6 h-6" />
            ابدأ التصميم الآن
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20">
          <div className="glass rounded-3xl p-8 card-hover" data-testid="feature-card-ai">
            <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8941F] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#3E2723] mb-4">ذكاء اصطناعي متقدم</h3>
            <p className="text-[#5D4037] leading-relaxed">
              احصل على تصاميم احترافية فورية باستخدام أحدث تقنيات الذكاء الاصطناعي
            </p>
          </div>

          <div className="glass rounded-3xl p-8 card-hover" data-testid="feature-card-custom">
            <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8941F] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#3E2723] mb-4">تخصيص كامل</h3>
            <p className="text-[#5D4037] leading-relaxed">
              صف تصميمك بكلماتك واحصل على نتائج تطابق رؤيتك الإبداعية
            </p>
          </div>

          <div className="glass rounded-3xl p-8 card-hover" data-testid="feature-card-save">
            <div className="bg-gradient-to-br from-[#D4AF37] to-[#B8941F] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#3E2723] mb-4">حفظ ومشاركة</h3>
            <p className="text-[#5D4037] leading-relaxed">
              احتفظ بتصاميمك المفضلة وشاركها مع الآخرين بكل سهولة
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 glass rounded-3xl p-12 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div data-testid="stat-designs">
              <div className="text-5xl font-bold text-[#D4AF37] mb-2">1000+</div>
              <div className="text-[#5D4037] text-lg">تصميم يومي</div>
            </div>
            <div data-testid="stat-users">
              <div className="text-5xl font-bold text-[#D4AF37] mb-2">500+</div>
              <div className="text-[#5D4037] text-lg">مصمم نشط</div>
            </div>
            <div data-testid="stat-satisfaction">
              <div className="text-5xl font-bold text-[#D4AF37] mb-2">98%</div>
              <div className="text-[#5D4037] text-lg">رضا المستخدمين</div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Dialog */}
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="sm:max-w-md" dir="rtl" data-testid="auth-dialog" aria-describedby="auth-dialog-description">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#3E2723] text-center">
              {authMode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
            </DialogTitle>
            <p id="auth-dialog-description" className="sr-only">
              {authMode === "login" ? "نموذج تسجيل الدخول للوصول إلى حسابك" : "نموذج إنشاء حساب جديد"}
            </p>
          </DialogHeader>

          <Tabs value={authMode} onValueChange={setAuthMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6" data-testid="auth-tabs">
              <TabsTrigger value="login" data-testid="login-tab">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">حساب جديد</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
                <div>
                  <label className="block text-sm font-medium text-[#3E2723] mb-2">
                    اسم المستخدم
                  </label>
                  <Input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    data-testid="login-username-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3E2723] mb-2">
                    كلمة المرور
                  </label>
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    data-testid="login-password-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] hover:from-[#B8941F] hover:to-[#9A7A1A] text-white"
                  data-testid="login-submit-btn"
                >
                  {loading ? "جاري التحميل..." : "دخول"}
                </Button>
                
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#3E2723]/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-[#5D4037]">أو</span>
                  </div>
                </div>
                
                {/* Google Sign In Button */}
                <Button
                  type="button"
                  onClick={() => {
                    const redirectUrl = `${window.location.origin}/dashboard`;
                    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
                  }}
                  variant="outline"
                  className="w-full border-2 border-[#3E2723]/20 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5"
                >
                  <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  تسجيل الدخول بحساب Google
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
                <div>
                  <label className="block text-sm font-medium text-[#3E2723] mb-2">
                    اسم المستخدم
                  </label>
                  <Input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    data-testid="register-username-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3E2723] mb-2">
                    البريد الإلكتروني
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    data-testid="register-email-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3E2723] mb-2">
                    كلمة المرور
                  </label>
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                    data-testid="register-password-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-l from-[#D4AF37] to-[#B8941F] hover:from-[#B8941F] hover:to-[#9A7A1A] text-white"
                  data-testid="register-submit-btn"
                >
                  {loading ? "جاري التحميل..." : "إنشاء حساب"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}