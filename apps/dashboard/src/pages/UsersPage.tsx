import { useEffect, useState } from 'react';
import { Search, Ban, ShieldCheck, Plus, Minus } from 'lucide-react';
import api from '../api/client';
import type { IUser } from '../types';

export default function UsersPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ user: IUser; type: 'add' | 'deduct' } | null>(null);
  const [amount, setAmount] = useState('');

  const fetchUsers = (p = 1, s = '') => {
    setLoading(true);
    api.get(`/users?page=${p}&limit=15&search=${s}`).then(r => {
      setUsers(r.data.users); setTotal(r.data.total); setPages(r.data.pages); setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = () => { setPage(1); fetchUsers(1, search); };

  const toggleBan = async (user: IUser) => {
    await api.patch(`/users/${user.telegram_id}/ban`, { banned: !user.is_banned });
    fetchUsers(page, search);
  };

  const handleBalance = async () => {
    if (!modal || !amount) return;
    await api.patch(`/users/${modal.user.telegram_id}/balance`, {
      amount: parseFloat(amount),
      operation: modal.type,
    });
    setModal(null); setAmount(''); fetchUsers(page, search);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">إدارة المستخدمين</h1>
          <p className="text-slate-500 mt-1">{total} مستخدم مسجل</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 ring-blue-500/20">
          <Search size={18} className="text-slate-400" />
          <input
            type="text" placeholder="بحث باسم المستخدم أو الأيدي..."
            className="bg-transparent border-none outline-none ml-3 text-sm w-full"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button onClick={handleSearch} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">بحث</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/60">
                <th className="text-right px-6 py-4 font-semibold text-slate-600">المستخدم</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">Telegram ID</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">الرصيد</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">الحالة</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">تاريخ التسجيل</th>
                <th className="text-center px-6 py-4 font-semibold text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">لا توجد نتائج</td></tr>
              ) : users.map(user => (
                <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{user.full_name || 'بدون اسم'}</div>
                    <div className="text-xs text-slate-400">@{user.username || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{user.telegram_id}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-emerald-600">${user.wallet_balance}</span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_banned
                      ? <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">محظور</span>
                      : <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">نشط</span>}
                    <div className="mt-1">
                      {user.role === 'admin'
                        ? <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">مشرف</span>
                        : <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">عضو</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{new Date(user.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button onClick={() => setModal({ user, type: 'add' })} className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors" title="إضافة رصيد"><Plus size={16} /></button>
                      <button onClick={() => setModal({ user, type: 'deduct' })} className="p-2 rounded-lg hover:bg-rose-100 text-rose-600 transition-colors" title="خصم رصيد"><Minus size={16} /></button>
                      <button onClick={() => toggleBan(user)} className={`p-2 rounded-lg transition-colors ${user.is_banned ? 'hover:bg-green-100 text-green-600' : 'hover:bg-red-100 text-red-600'}`} title={user.is_banned ? 'فك الحظر' : 'حظر'}>
                        {user.is_banned ? <ShieldCheck size={16} /> : <Ban size={16} />}
                      </button>
                      <button onClick={async () => {
                        await api.patch(`/users/${user.telegram_id}/role`, { role: user.role === 'admin' ? 'user' : 'admin' });
                        fetchUsers(page, search);
                      }} className={`p-2 rounded-lg text-xs leading-none font-bold transition-colors ${user.role === 'admin' ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-slate-600 bg-slate-50 hover:bg-slate-200'}`} title={user.role === 'admin' ? 'إزالة الإشراف' : 'ترقية لمشرف'}>
                        {user.role === 'admin' ? 'إلغاء الإشراف' : 'ترقية لمشرف'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100">
            {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
              <button key={i} onClick={() => { setPage(i + 1); fetchUsers(i + 1, search); }}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Balance Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {modal.type === 'add' ? '➕ إضافة رصيد' : '➖ خصم رصيد'} — {modal.user.full_name}
            </h3>
            <p className="text-sm text-slate-500 mb-4">الرصيد الحالي: <strong className="text-emerald-600">${modal.user.wallet_balance}</strong></p>
            <input type="number" placeholder="أدخل المبلغ..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-blue-500/20 outline-none" value={amount} onChange={e => setAmount(e.target.value)} />
            <div className="flex gap-3 mt-5">
              <button onClick={handleBalance} className={`flex-1 py-2.5 rounded-xl text-white font-medium text-sm ${modal.type === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'} transition-colors`}>
                {modal.type === 'add' ? 'إضافة' : 'خصم'}
              </button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
