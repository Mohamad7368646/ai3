import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Users, Package, Image, Tag, TrendingUp, DollarSign, 
  Edit, Trash2, Plus, X, Search, CheckCircle, Clock, 
  XCircle, ShoppingCart, Phone, Mail, Calendar, Award, Sparkles, Eye, UserX
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import ShowcaseManager from "../components/ShowcaseManager";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total_users: 0,
    total_orders: 0,
    total_designs: 0,
    pending_orders: 0,
    completed_orders: 0,
    total_revenue: 0
  });
  
  // Data
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [coupons, setCoupons] = useState([]);
  
  // Modals
  const [editUserModal, setEditUserModal] = useState({ open: false, user: null });
  const [createCouponModal, setCreateCouponModal] = useState(false);
  const [viewDesignModal, setViewDesignModal] = useState({ open: false, design: null });
  const [couponUsageModal, setCouponUsageModal] = useState({ open: false, coupon: null, usages: [] });
  const [deleteUserModal, setDeleteUserModal] = useState({ open: false, user: null });
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (activeTab === "overview") fetchStats();
    if (activeTab === "users") fetchUsers();
    if (activeTab === "orders") fetchOrders();
    if (activeTab === "designs") fetchDesigns();
    if (activeTab === "coupons") fetchCoupons();
    // showcase tab is handled by ShowcaseManager component
  }, [activeTab]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error("فشل في تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error("فشل في تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/orders`);
      setOrders(response.data);
    } catch (error) {
      toast.error("فشل في تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  };

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/designs`);
      setDesigns(response.data);
    } catch (error) {
      toast.error("فشل في تحميل التصاميم");
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      // Admin should see all coupons, not just active ones
      const response = await axios.get(`${API}/coupons`);
      setCoupons(response.data);
    } catch (error) {
      toast.error("فشل في تحميل الكوبونات");
      console.error("Fetch coupons error:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserLimit = async (userId, newLimit) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/designs-limit`, { designs_limit: newLimit });
      toast.success("تم تحديث حد التصاميم");
      fetchUsers();
      setEditUserModal({ open: false, user: null });
    } catch (error) {
      toast.error("فشل في تحديث الحد");
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status`, { status });
      toast.success("تم تحديث حالة الطلب");
      fetchOrders();
    } catch (error) {
      toast.error("فشل في تحديث الحالة");
    }
  };

  const createCoupon = async (couponData) => {
    // Validate inputs
    if (!couponData.code || !couponData.code.trim()) {
      toast.error("الرجاء إدخال كود الكوبون");
      return;
    }
    
    if (!couponData.discount_percentage || couponData.discount_percentage <= 0 || couponData.discount_percentage > 100) {
      toast.error("الرجاء إدخال نسبة خصم صحيحة (1-100)");
      return;
    }
    
    try {
      await axios.post(`${API}/coupons`, couponData);
      toast.success("تم إنشاء الكوبون بنجاح");
      fetchCoupons();
      setCreateCouponModal(false);
      
      // Clear inputs
      document.getElementById('couponCode').value = '';
      document.getElementById('couponDiscount').value = '';
      document.getElementById('couponExpiry').value = '';
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل في إنشاء الكوبون");
    }
  };

  const deleteCoupon = async (couponId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الكوبون؟")) return;
    
    try {
      await axios.delete(`${API}/coupons/${couponId}`);
      toast.success("تم حذف الكوبون");
      fetchCoupons();
    } catch (error) {
      toast.error("فشل في حذف الكوبون");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    const labels = {
      pending: "قيد الانتظار",
      processing: "قيد المعالجة",
      completed: "مكتمل",
      cancelled: "ملغي"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    o.user_info?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F0E8] via-[#E8DCC8] to-[#F5F0E8]">
      {/* Header */}
      <header className="glass border-b border-[#3E2723]/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#D4AF37] to-[#B8941F] rounded-xl">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#3E2723]">لوحة تحكم المدير</h1>
              <p className="text-sm text-[#5D4037]">مرحباً، {user?.username}</p>
            </div>
          </div>
          <Button onClick={onLogout} variant="outline" className="border-[#3E2723]">
            خروج
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="glass rounded-2xl p-2 mb-8">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: "overview", label: "نظرة عامة", icon: TrendingUp },
              { id: "users", label: "المستخدمين", icon: Users },
              { id: "orders", label: "الطلبات", icon: Package },
              { id: "designs", label: "التصاميم", icon: Image },
              { id: "showcase", label: "التصاميم الملهمة", icon: Sparkles },
              { id: "coupons", label: "الكوبونات", icon: Tag }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-l from-[#D4AF37] to-[#B8941F] text-white"
                    : "text-[#5D4037] hover:bg-white/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="glass border-[#D4AF37]/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-[#5D4037]">إجمالي المستخدمين</CardTitle>
                <Users className="w-4 h-4 text-[#D4AF37]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#3E2723]">{stats.total_users}</div>
              </CardContent>
            </Card>

            <Card className="glass border-[#D4AF37]/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-[#5D4037]">إجمالي الطلبات</CardTitle>
                <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#3E2723]">{stats.total_orders}</div>
                <p className="text-xs text-[#5D4037] mt-1">
                  قيد الانتظار: {stats.pending_orders} | مكتمل: {stats.completed_orders}
                </p>
              </CardContent>
            </Card>

            <Card className="glass border-[#D4AF37]/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-[#5D4037]">إجمالي التصاميم</CardTitle>
                <Image className="w-4 h-4 text-[#D4AF37]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#3E2723]">{stats.total_designs}</div>
              </CardContent>
            </Card>

            <Card className="glass border-[#D4AF37]/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-[#5D4037]">الإيرادات الكلية</CardTitle>
                <DollarSign className="w-4 h-4 text-[#D4AF37]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#3E2723]">{stats.total_revenue} ر.س</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#3E2723]">إدارة المستخدمين</h2>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5D4037]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث..."
                  className="pr-10 w-64"
                />
              </div>
            </div>
            
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#D4AF37]/10">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-[#3E2723]">اسم المستخدم</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-[#3E2723]">البريد</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-[#3E2723]">حد التصاميم</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-[#3E2723]">المستخدم</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-[#3E2723]">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-t border-[#3E2723]/10">
                        <td className="px-4 py-3 text-sm text-[#3E2723]">{user.username}</td>
                        <td className="px-4 py-3 text-sm text-[#5D4037]">{user.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded ${
                            user.designs_limit === -1 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.designs_limit === -1 ? 'غير محدود' : `${user.designs_used || 0}/${user.designs_limit}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#5D4037]">
                          {new Date(user.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditUserModal({ open: true, user })}
                            className="text-xs"
                          >
                            <Edit className="w-3 h-3 ml-1" />
                            تعديل الحد
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#3E2723]">إدارة الطلبات</h2>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="w-64"
              />
            </div>
            
            <div className="grid gap-4">
              {filteredOrders.map(order => (
                <Card key={order.id} className="glass">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img 
                        src={`data:image/png;base64,${order.design_image_base64}`}
                        alt="Design"
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-[#3E2723]">{order.user_info?.username}</p>
                            <p className="text-sm text-[#5D4037]">{order.prompt}</p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex gap-4 text-xs text-[#5D4037] mt-2">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.phone_number}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Select
                          value={order.status}
                          onValueChange={(val) => updateOrderStatus(order.id, val)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="processing">قيد المعالجة</SelectItem>
                            <SelectItem value="completed">مكتمل</SelectItem>
                            <SelectItem value="cancelled">ملغي</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Designs Tab */}
        {activeTab === "designs" && (
          <div>
            <h2 className="text-2xl font-bold text-[#3E2723] mb-6">جميع التصاميم</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {designs.map(design => (
                <Card key={design.id} className="glass overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setViewDesignModal({ open: true, design })}>
                  <img 
                    src={`data:image/png;base64,${design.image_base64}`}
                    alt="Design"
                    className="w-full h-48 object-cover"
                  />
                  <CardContent className="p-4">
                    <p className="font-semibold text-[#3E2723] mb-1">{design.user_info?.username}</p>
                    <p className="text-sm text-[#5D4037] mb-2 line-clamp-2">{design.prompt}</p>
                    {design.phone_number && (
                      <p className="text-xs text-[#5D4037] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {design.phone_number}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Showcase Designs Tab */}
        {activeTab === "showcase" && (
          <ShowcaseManager token={localStorage.getItem('token')} />
        )}

        {/* Coupons Tab */}
        {activeTab === "coupons" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#3E2723]">إدارة الكوبونات</h2>
              <Button onClick={() => setCreateCouponModal(true)} className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F]">
                <Plus className="w-4 h-4 ml-2" />
                إضافة كوبون
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map(coupon => (
                <Card key={coupon.id} className="glass">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-lg font-bold text-[#3E2723]">{coupon.code}</p>
                        <p className="text-sm text-[#5D4037]">خصم {coupon.discount_percentage}%</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCoupon(coupon.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {coupon.expiry_date && (
                      <p className="text-xs text-[#5D4037]">
                        ينتهي: {new Date(coupon.expiry_date).toLocaleDateString('ar-EG')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      <Dialog open={editUserModal.open} onOpenChange={(open) => setEditUserModal({ open, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل حد التصاميم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المستخدم: {editUserModal.user?.username}</Label>
              <p className="text-sm text-[#5D4037]">الحد الحالي: {editUserModal.user?.designs_limit}</p>
            </div>
            <div>
              <Label>الحد الجديد</Label>
              <Input 
                type="number" 
                id="newLimit"
                defaultValue={editUserModal.user?.designs_limit}
                placeholder="أدخل الحد الجديد (-1 لغير محدود)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserModal({ open: false, user: null })}>
              إلغاء
            </Button>
            <Button 
              onClick={() => {
                const newLimit = parseInt(document.getElementById('newLimit').value);
                updateUserLimit(editUserModal.user.id, newLimit);
              }}
              className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F]"
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Coupon Modal */}
      <Dialog open={createCouponModal} onOpenChange={setCreateCouponModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء كوبون جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>كود الكوبون</Label>
              <Input id="couponCode" placeholder="مثال: SUMMER2025" />
            </div>
            <div>
              <Label>نسبة الخصم (%)</Label>
              <Input id="couponDiscount" type="number" placeholder="20" />
            </div>
            <div>
              <Label>تاريخ الانتهاء (اختياري)</Label>
              <Input id="couponExpiry" type="date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCouponModal(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={() => {
                const code = document.getElementById('couponCode').value;
                const discount = parseFloat(document.getElementById('couponDiscount').value);
                const expiry = document.getElementById('couponExpiry').value;
                
                createCoupon({
                  code,
                  discount_percentage: discount,
                  expiry_date: expiry ? `${expiry}T23:59:59` : null
                });
              }}
              className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F]"
            >
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Design Modal */}
      <Dialog open={viewDesignModal.open} onOpenChange={(open) => setViewDesignModal({ open, design: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل التصميم</DialogTitle>
          </DialogHeader>
          {viewDesignModal.design && (
            <div className="space-y-4">
              <img 
                src={`data:image/png;base64,${viewDesignModal.design.image_base64}`}
                alt="Design"
                className="w-full rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-[#3E2723]">المستخدم</p>
                  <p className="text-[#5D4037]">{viewDesignModal.design.user_info?.username}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#3E2723]">البريد</p>
                  <p className="text-[#5D4037]">{viewDesignModal.design.user_info?.email}</p>
                </div>
                {viewDesignModal.design.phone_number && (
                  <div>
                    <p className="font-semibold text-[#3E2723]">رقم الهاتف</p>
                    <p className="text-[#5D4037]">{viewDesignModal.design.phone_number}</p>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[#3E2723]">التاريخ</p>
                  <p className="text-[#5D4037]">{new Date(viewDesignModal.design.created_at).toLocaleString('ar-EG')}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-[#3E2723] mb-1">الوصف</p>
                <p className="text-[#5D4037]">{viewDesignModal.design.prompt}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
