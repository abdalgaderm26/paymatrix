import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../api/client';
import type { IService } from '../types';

export default function ServicesPage() {
  const [services, setServices] = useState<IService[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<IService | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price_usd: '', type: 'digital_product', delivery_details: '' });

  const fetchServices = () => {
    setLoading(true);
    api.get('/services?limit=100').then(r => { setServices(r.data.services); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchServices(); }, []);

  const openCreate = () => {
    setForm({ name: '', description: '', price_usd: '', type: 'digital_product', delivery_details: '' });
    setEditing(null); setModal('create');
  };

  const openEdit = (s: IService) => {
    setForm({ name: s.name, description: s.description, price_usd: String(s.price_usd), type: s.type, delivery_details: s.delivery_details });
    setEditing(s); setModal('edit');
  };

  const handleSubmit = async () => {
    const data = { ...form, price_usd: parseFloat(form.price_usd) };
    if (modal === 'create') await api.post('/services', data);
    else if (editing) await api.put(`/services/${editing._id}`, data);
    setModal(null); fetchServices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    await api.delete(`/services/${id}`);
    fetchServices();
  };

  const handleToggle = async (id: string) => {
    await api.patch(`/services/${id}/toggle`);
    fetchServices();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">إدارة الخدمات</h1>
          <p className="text-slate-500 mt-1">{services.length} خدمة</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm font-medium">
          <Plus size={18} /> إضافة خدمة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : services.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-400">لا توجد خدمات. اضغط "إضافة خدمة" للبدء.</div>
        ) : services.map(s => (
          <div key={s._id} className="bg-white rounded-2xl border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 text-lg">{s.name}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{s.description || 'بدون وصف'}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {s.is_active ? 'مفعّلة' : 'معطّلة'}
              </span>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">${s.price_usd}</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{s.type === 'subscription' ? 'اشتراك' : 'منتج رقمي'}</span>
            </div>

            {s.delivery_details && (
              <p className="text-xs text-slate-400 mb-4 bg-slate-50 p-3 rounded-lg line-clamp-2">📋 {s.delivery_details}</p>
            )}

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => handleToggle(s._id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-xs">
                {s.is_active ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} className="text-slate-400" />}
                {s.is_active ? 'تعطيل' : 'تفعيل'}
              </button>
              <button onClick={() => openEdit(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors text-xs">
                <Pencil size={14} /> تعديل
              </button>
              <button onClick={() => handleDelete(s._id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors text-xs">
                <Trash2 size={14} /> حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-5">{modal === 'create' ? '➕ إضافة خدمة جديدة' : '✏️ تعديل الخدمة'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1.5 block">اسم الخدمة *</label>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1.5 block">الوصف</label>
                <textarea className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none resize-none h-20" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1.5 block">السعر (USD) *</label>
                  <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none" value={form.price_usd} onChange={e => setForm({ ...form, price_usd: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1.5 block">النوع</label>
                  <select className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="digital_product">منتج رقمي</option>
                    <option value="subscription">اشتراك</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1.5 block">تفاصيل التسليم</label>
                <textarea className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none resize-none h-20" placeholder="ما سيظهر للمشتري بعد الشراء..." value={form.delivery_details} onChange={e => setForm({ ...form, delivery_details: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors">{modal === 'create' ? 'إضافة' : 'حفظ التعديلات'}</button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
