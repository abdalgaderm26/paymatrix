import { useEffect, useState } from 'react';
import { Save, Wallet, Plus, Trash2 } from 'lucide-react';
import api from '../api/client';

interface WalletSetting {
  key: string;
  value: string;
}

const WALLET_LABELS: Record<string, { label: string; icon: string }> = {
  USDT_TRC20: { label: 'USDT (TRC20)', icon: '🪙' },
  USDT_BEP20: { label: 'USDT (BEP20)', icon: '🪙' },
  BANKAK: { label: 'بنكك (SDG)', icon: '🏦' },
  FAWRY: { label: 'فوري (EGP)', icon: '💳' },
  VODAFONE_CASH: { label: 'فودافون كاش (EGP)', icon: '📱' },
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [customWallets, setCustomWallets] = useState<{ key: string; label: string; value: string }[]>([]);

  const fetchSettings = () => {
    setLoading(true);
    api.get('/settings').then(r => {
      const vals: Record<string, string> = {};
      (r.data.wallets || []).forEach((w: WalletSetting) => { vals[w.key] = w.value; });
      (r.data.platformSettings || []).forEach((s: WalletSetting) => { 
        vals[s.key] = s.value; 
        if (s.key === 'CUSTOM_WALLETS' && s.value) {
          try { setCustomWallets(JSON.parse(s.value)); } catch {}
        }
      });
      setEditValues(vals);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    await api.put(`/settings/${key}`, { value: editValues[key] });
    setSaving(null);
    fetchSettings();
  };

  const handleAddWallet = async () => {
    const name = prompt('أدخل اسم المحفظة (مثال: بنكك - الخرطوم):');
    if (!name) return;
    const newWallet = { key: `custom_${Date.now()}`, label: name, value: '' };
    const updated = [...customWallets, newWallet];
    setCustomWallets(updated);
    await api.put(`/settings/CUSTOM_WALLETS`, { value: JSON.stringify(updated) });
    fetchSettings();
  };

  const handleDeleteWallet = async (key: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحفظة؟')) return;
    const updated = customWallets.filter(w => w.key !== key);
    setCustomWallets(updated);
    await api.put(`/settings/CUSTOM_WALLETS`, { value: JSON.stringify(updated) });
    fetchSettings();
  };

  const handleSaveCustomWallet = async (key: string, value: string) => {
    setSaving(`custom_save_${key}`);
    const updated = customWallets.map(w => w.key === key ? { ...w, value } : w);
    setCustomWallets(updated);
    await api.put(`/settings/CUSTOM_WALLETS`, { value: JSON.stringify(updated) });
    setSaving(null);
    fetchSettings();
  };

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">إعدادات النظام</h1>
          <p className="text-slate-500 mt-1">إدارة بوابات الدفع والإعدادات العامة</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white"><Wallet size={20} /></div>
          <div>
            <h2 className="font-bold text-slate-800">إعدادات المنصة</h2>
            <p className="text-xs text-slate-400">إعدادات العملة وأسعار الصرف اللحظية</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="border border-slate-200/60 rounded-xl p-5 hover:border-purple-200 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 font-medium text-slate-700">
                <span className="text-lg">💱</span>
                سعر صرف 1 دولار بالجنيه السوداني (SDG)
              </label>
              <button
                onClick={() => handleSave('EXCHANGE_RATE_SDG')}
                disabled={saving === 'EXCHANGE_RATE_SDG'}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                <Save size={14} />
                {saving === 'EXCHANGE_RATE_SDG' ? 'حفظ...' : 'حفظ'}
              </button>
            </div>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-purple-500/20 outline-none font-mono"
              value={editValues['EXCHANGE_RATE_SDG'] || ''}
              onChange={e => setEditValues({ ...editValues, ['EXCHANGE_RATE_SDG']: e.target.value })}
              placeholder="مثال: 1970"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white"><Wallet size={20} /></div>
          <div>
            <h2 className="font-bold text-slate-800">بوابات الدفع والمحافظ</h2>
            <p className="text-xs text-slate-400">عدّل بيانات المحافظ التي تظهر للمستخدمين عند الإيداع</p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(WALLET_LABELS).map(([key, meta]) => (
            <div key={key} className="border border-slate-200/60 rounded-xl p-5 hover:border-blue-200 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="text-lg">{meta.icon}</span>
                  {meta.label}
                </label>
                <button
                  onClick={() => handleSave(key)}
                  disabled={saving === key}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  <Save size={14} />
                  {saving === key ? 'حفظ...' : 'حفظ'}
                </button>
              </div>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none resize-none h-16 font-mono"
                value={editValues[key] || ''}
                onChange={e => setEditValues({ ...editValues, [key]: e.target.value })}
                placeholder="أدخل بيانات المحفظة أو الحساب..."
                dir="ltr"
              />
            </div>
          ))}

          {/* Custom Wallets */}
          {customWallets.map(w => (
            <div key={w.key} className="border border-emerald-200/60 bg-emerald-50/30 rounded-xl p-5 hover:border-emerald-300 transition-colors relative group">
              <button 
                onClick={() => handleDeleteWallet(w.key)}
                className="absolute top-4 left-4 p-2 rounded-lg text-rose-500 hover:bg-rose-100 opacity-0 group-hover:opacity-100 transition-all font-bold"
                title="حذف هذه المحفظة"
              >
                <Trash2 size={16} />
              </button>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="text-lg">🏦</span>
                  {w.label}
                </label>
                <button
                  onClick={() => handleSaveCustomWallet(w.key, w.value)}
                  disabled={saving === `custom_save_${w.key}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-all"
                >
                  <Save size={14} />
                  {saving === `custom_save_${w.key}` ? 'حفظ...' : 'حفظ التعديل'}
                </button>
              </div>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-emerald-500/20 outline-none resize-none h-16 font-mono"
                value={w.value || ''}
                onChange={e => setCustomWallets(customWallets.map(cw => cw.key === w.key ? { ...cw, value: e.target.value } : cw))}
                placeholder="أدخل بيانات المحفظة أو الحساب..."
                dir="ltr"
              />
            </div>
          ))}

          <button 
            onClick={handleAddWallet}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-colors font-medium"
          >
            <Plus size={18} />
            إضافة محفظة / بنك جديد
          </button>
        </div>
      </div>
    </div>
  );
}
