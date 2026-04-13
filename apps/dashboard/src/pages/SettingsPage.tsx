import { useEffect, useState } from 'react';
import { Save, Wallet } from 'lucide-react';
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

  const fetchSettings = () => {
    setLoading(true);
    api.get('/settings').then(r => {
      const vals: Record<string, string> = {};
      (r.data.wallets || []).forEach((w: WalletSetting) => { vals[w.key] = w.value; });
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
                  {saving === key ? 'جاري الحفظ...' : 'حفظ'}
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
        </div>
      </div>
    </div>
  );
}
