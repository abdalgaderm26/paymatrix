import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import api from '../api/client';
import type { ITransaction } from '../types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTx = (p = 1) => {
    setLoading(true);
    api.get(`/transactions?page=${p}&limit=15&type=${filterType}&status=${filterStatus}`).then(r => {
      setTransactions(r.data.transactions); setTotal(r.data.total); setPages(r.data.pages); setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchTx(); }, [filterType, filterStatus]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    await api.patch(`/transactions/${id}/status`, { status });
    fetchTx(page);
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    deposit: { label: 'إيداع', color: 'bg-blue-100 text-blue-700' },
    payment: { label: 'دفع', color: 'bg-purple-100 text-purple-700' },
    withdraw: { label: 'سحب', color: 'bg-orange-100 text-orange-700' },
    earning: { label: 'أرباح', color: 'bg-emerald-100 text-emerald-700' },
  };

  const statusIcons: Record<string, ReactNode> = {
    pending: <Clock size={16} className="text-amber-500" />,
    approved: <CheckCircle size={16} className="text-emerald-500" />,
    rejected: <XCircle size={16} className="text-red-500" />,
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">المعاملات المالية</h1>
          <p className="text-slate-500 mt-1">{total} معاملة</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-blue-500/20">
            <option value="">كل الأنواع</option>
            <option value="deposit">إيداع</option>
            <option value="payment">دفع</option>
            <option value="withdraw">سحب</option>
            <option value="earning">أرباح</option>
          </select>
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-blue-500/20">
          <option value="">كل الحالات</option>
          <option value="pending">معلق</option>
          <option value="approved">مقبول</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/60">
                <th className="text-right px-6 py-4 font-semibold text-slate-600">المستخدم</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">النوع</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">المبلغ</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">الطريقة</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">الحالة</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">التاريخ</th>
                <th className="text-center px-6 py-4 font-semibold text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">لا توجد معاملات</td></tr>
              ) : transactions.map(tx => {
                const user = typeof tx.user_id === 'object' ? tx.user_id : null;
                const tl = typeLabels[tx.type] || { label: tx.type, color: 'bg-slate-100 text-slate-700' };
                return (
                  <tr key={tx._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{user?.full_name || 'N/A'}</div>
                      <div className="text-xs text-slate-400">{user?.telegram_id || ''}</div>
                    </td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tl.color}`}>{tl.label}</span></td>
                    <td className="px-6 py-4 font-bold text-slate-800">${tx.amount}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{tx.method || '—'}</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-1.5">{statusIcons[tx.status]}<span className="text-xs">{tx.status === 'pending' ? 'معلق' : tx.status === 'approved' ? 'مقبول' : 'مرفوض'}</span></div></td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(tx.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4">
                      {tx.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => updateStatus(tx._id, 'approved')} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-medium transition-colors">قبول</button>
                          <button onClick={() => updateStatus(tx._id, 'rejected')} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition-colors">رفض</button>
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100">
            {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
              <button key={i} onClick={() => { setPage(i + 1); fetchTx(i + 1); }}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
