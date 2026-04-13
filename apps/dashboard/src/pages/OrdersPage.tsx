import { useEffect, useState } from 'react';
import api from '../api/client';
import type { IOrder } from '../types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = (p = 1) => {
    setLoading(true);
    api.get(`/orders?page=${p}&limit=15&status=${filterStatus}`).then(r => {
      setOrders(r.data.orders); setTotal(r.data.total); setPages(r.data.pages); setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/orders/${id}/status`, { status });
    fetchOrders(page);
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'معلق', color: 'bg-amber-100 text-amber-700' },
    waiting_payment: { label: 'بانتظار الدفع', color: 'bg-blue-100 text-blue-700' },
    paid: { label: 'مدفوع', color: 'bg-indigo-100 text-indigo-700' },
    approved: { label: 'مكتمل', color: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">إدارة الطلبات</h1>
          <p className="text-slate-500 mt-1">{total} طلب</p>
        </div>
      </div>

      <div className="flex gap-3">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-blue-500/20">
          <option value="">كل الحالات</option>
          <option value="pending">معلق</option>
          <option value="waiting_payment">بانتظار الدفع</option>
          <option value="paid">مدفوع</option>
          <option value="approved">مكتمل</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/60">
                <th className="text-right px-6 py-4 font-semibold text-slate-600">المستخدم</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">الخدمة</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">المبلغ</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">الحالة</th>
                <th className="text-right px-6 py-4 font-semibold text-slate-600">التاريخ</th>
                <th className="text-center px-6 py-4 font-semibold text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">لا توجد طلبات</td></tr>
              ) : orders.map(order => {
                const user = typeof order.user_id === 'object' ? order.user_id : null;
                const service = typeof order.service_id === 'object' ? order.service_id : null;
                const sc = statusConfig[order.status] || { label: order.status, color: 'bg-slate-100 text-slate-700' };
                return (
                  <tr key={order._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{user?.full_name || 'N/A'}</div>
                      <div className="text-xs text-slate-400">{user?.telegram_id || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{service?.name || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">${order.price_usd}</td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4">
                      {order.status !== 'approved' && order.status !== 'rejected' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => updateStatus(order._id, 'approved')} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-medium transition-colors">إكمال</button>
                          <button onClick={() => updateStatus(order._id, 'rejected')} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium transition-colors">رفض</button>
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
              <button key={i} onClick={() => { setPage(i + 1); fetchOrders(i + 1); }}
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
