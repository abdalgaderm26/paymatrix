import { useEffect, useState } from 'react';
import { TrendingUp, Users, CreditCard, Package, AlertCircle, DollarSign, ShieldOff, Activity } from 'lucide-react';
import api from '../api/client';
import type { IStats } from '../types';

export default function DashboardPage() {
  const [stats, setStats] = useState<IStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats').then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!stats) return <div className="text-center p-10 text-red-500">Failed to load stats. Check API connection.</div>;

  const cards = [
    { title: 'إجمالي المستخدمين', value: stats.users.totalUsers, icon: Users, color: 'from-blue-500 to-indigo-600', change: `${stats.users.activeToday} نشط اليوم` },
    { title: 'إجمالي الإيرادات', value: `$${stats.transactions.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'from-emerald-500 to-green-600', change: `$${stats.transactions.totalDeposits.toLocaleString()} إيداعات` },
    { title: 'الطلبات', value: stats.orders.totalOrders, icon: Package, color: 'from-violet-500 to-purple-600', change: `${stats.orders.pendingOrders} معلق` },
    { title: 'المعلقة', value: stats.transactions.pendingCount, icon: AlertCircle, color: 'from-amber-500 to-orange-600', change: 'تحتاج مراجعتك' },
    { title: 'خدمات مفعّلة', value: stats.services.active, icon: Activity, color: 'from-cyan-500 to-blue-600', change: `${stats.services.inactive} معطّلة` },
    { title: 'إجمالي الأرصدة', value: `$${stats.users.totalBalance.toLocaleString()}`, icon: CreditCard, color: 'from-rose-500 to-pink-600', change: `${stats.users.bannedUsers} محظور` },
    { title: 'المبيعات', value: `$${stats.orders.totalSales.toLocaleString()}`, icon: TrendingUp, color: 'from-teal-500 to-emerald-600', change: `${stats.orders.completedOrders} مكتمل` },
    { title: 'المحظورين', value: stats.users.bannedUsers, icon: ShieldOff, color: 'from-red-500 to-rose-600', change: 'مستخدم' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">لوحة التحكم</h1>
          <p className="text-slate-500 mt-1">نظرة عامة على منصة PayMatrix</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 p-6 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.color} opacity-10 rounded-bl-[60px] group-hover:opacity-20 transition-opacity`}></div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{card.value}</p>
                <p className="text-xs text-slate-400 mt-2">{card.change}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>
                <card.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
