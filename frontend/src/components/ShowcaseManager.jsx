import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Star, Eye, EyeOff, Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShowcaseManager({ token }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    prompt: "",
    clothing_type: "shirt",
    color: "",
    image_base64: "",
    tags: [],
    is_featured: false
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/showcase-designs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDesigns(response.data);
    } catch (error) {
      toast.error("فشل في تحميل التصاميم");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجا");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        setFormData({ ...formData, image_base64: base64 });
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingDesign) {
        await axios.put(
          `${API}/admin/showcase-designs/${editingDesign.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("تم تحديث التصميم بنجاح");
      } else {
        await axios.post(
          `${API}/admin/showcase-designs`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("تم إضافة التصميم بنجاح");
      }

      fetchDesigns();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التصميم؟")) return;

    try {
      await axios.delete(`${API}/admin/showcase-designs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("تم حذف التصميم بنجاح");
      fetchDesigns();
    } catch (error) {
      toast.error("فشل في حذف التصميم");
    }
  };

  const handleToggleFeatured = async (id) => {
    try {
      await axios.put(
        `${API}/admin/showcase-designs/${id}/toggle-featured`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("تم تحديث حالة التصميم");
      fetchDesigns();
    } catch (error) {
      toast.error("فشل في تحديث الحالة");
    }
  };

  const handleEdit = (design) => {
    setEditingDesign(design);
    setFormData({
      title: design.title,
      description: design.description,
      prompt: design.prompt,
      clothing_type: design.clothing_type,
      color: design.color || "",
      image_base64: design.image_base64,
      tags: design.tags || [],
      is_featured: design.is_featured
    });
    setImagePreview(`data:image/png;base64,${design.image_base64}`);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingDesign(null);
    setFormData({
      title: "",
      description: "",
      prompt: "",
      clothing_type: "shirt",
      color: "",
      image_base64: "",
      tags: [],
      is_featured: false
    });
    setImagePreview(null);
    setTagInput("");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#3E2723]">إدارة التصاميم الملهمة</h2>
          <p className="text-sm text-[#5D4037] mt-1">
            إجمالي التصاميم: {designs.length}
          </p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-gradient-to-l from-[#D4AF37] to-[#B8941F] hover:from-[#B8941F] hover:to-[#9A7A1A] text-white"
        >
          <Plus className="ml-2 w-4 h-4" />
          إضافة تصميم جديد
        </Button>
      </div>

      {/* Designs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {designs.map((design) => (
          <Card key={design.id} className="glass overflow-hidden">
            <div className="relative aspect-square bg-white">
              <img
                src={`data:image/png;base64,${design.image_base64}`}
                alt={design.title}
                className="w-full h-full object-cover"
              />
              {design.is_featured && (
                <div className="absolute top-2 right-2 bg-[#D4AF37] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  مميز
                </div>
              )}
              {!design.is_active && (
                <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  مخفي
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold text-[#3E2723] mb-2 line-clamp-1">{design.title}</h3>
              <p className="text-sm text-[#5D4037] mb-3 line-clamp-2">{design.description}</p>
              
              {/* Tags */}
              {design.tags && design.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {design.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="text-xs bg-[#D4AF37]/20 text-[#3E2723] px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleEdit(design)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                >
                  <Edit className="w-3 h-3 ml-1" />
                  تعديل
                </Button>
                <Button
                  onClick={() => handleToggleFeatured(design.id)}
                  variant="outline"
                  size="sm"
                  className={`${design.is_featured ? 'border-[#D4AF37] bg-[#D4AF37] text-white' : 'border-gray-300'}`}
                >
                  <Star className={`w-3 h-3 ${design.is_featured ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  onClick={() => handleDelete(design.id)}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-500 hover:text-white"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#3E2723]">
              {editingDesign ? "تعديل تصميم ملهم" : "إضافة تصميم ملهم جديد"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-2">
                صورة التصميم *
              </label>
              <div className="border-2 border-dashed border-[#D4AF37] rounded-lg p-4">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
                    <Button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData({ ...formData, image_base64: "" });
                      }}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer">
                    <Upload className="w-12 h-12 text-[#D4AF37] mb-2" />
                    <span className="text-sm text-[#5D4037]">اضغط لرفع صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      required={!editingDesign}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-2">
                العنوان *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: تيشيرت كاجوال أنيق"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-2">
                الوصف *
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف مختصر للتصميم..."
                rows={3}
                required
              />
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-2">
                Prompt التصميم *
              </label>
              <Textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="الوصف الذي سيستخدمه المستخدم عند اختيار هذا التصميم..."
                rows={2}
                required
              />
            </div>

            {/* Clothing Type & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3E2723] mb-2">
                  نوع الملبس *
                </label>
                <Select
                  value={formData.clothing_type}
                  onValueChange={(value) => setFormData({ ...formData, clothing_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shirt">قميص</SelectItem>
                    <SelectItem value="t-shirt">تيشيرت</SelectItem>
                    <SelectItem value="hoodie">هودي</SelectItem>
                    <SelectItem value="dress">فستان</SelectItem>
                    <SelectItem value="pants">بنطلون</SelectItem>
                    <SelectItem value="jacket">جاكيت</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3E2723] mb-2">
                  اللون
                </label>
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="مثال: أزرق"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-[#3E2723] mb-2">
                الوسوم (Tags)
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="أضف وسم..."
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-[#D4AF37]/20 text-[#3E2723] px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-600"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </span>
                ))}
              </div>
            </div>

            {/* Featured */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_featured" className="text-sm font-medium text-[#3E2723] cursor-pointer">
                تصميم مميز (Featured)
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-l from-[#D4AF37] to-[#B8941F] hover:from-[#B8941F] hover:to-[#9A7A1A] text-white"
              >
                {loading ? "جاري الحفظ..." : editingDesign ? "تحديث" : "إضافة"}
              </Button>
              <Button
                type="button"
                onClick={handleCloseDialog}
                variant="outline"
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
