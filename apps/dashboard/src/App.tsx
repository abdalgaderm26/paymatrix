import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Users, CreditCard, LayoutGrid, Settings, ShoppingBag, Search, Bell, Menu, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import TransactionsPage from './pages/TransactionsPage';
import ServicesPage from './pages/ServicesPage';
import OrdersPage from './pages/OrdersPage';
import SettingsPage from './pages/SettingsPage';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: React.ElementType; label: string; onClick?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        isActive
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
          : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800"
      )}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="flex h-screen bg-slate-50/50 font-inter selection:bg-blue-100" dir="rtl">

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed md:static inset-y-0 right-0 z-50 w-64 border-l border-slate-200/50 bg-white/80 backdrop-blur-xl flex flex-col transition-transform duration-300 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25">
                PM
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">PayMatrix</span>
            </div>
            <button className="md:hidden p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(false)}>
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-3">الرئيسية</p>
            <SidebarItem to="/" icon={Home} label="لوحة التحكم" onClick={() => setSidebarOpen(false)} />
            <SidebarItem to="/users" icon={Users} label="المستخدمين" onClick={() => setSidebarOpen(false)} />
            <SidebarItem to="/transactions" icon={CreditCard} label="المعاملات" onClick={() => setSidebarOpen(false)} />

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-3 mt-6">المتجر</p>
            <SidebarItem to="/services" icon={LayoutGrid} label="الخدمات" onClick={() => setSidebarOpen(false)} />
            <SidebarItem to="/orders" icon={ShoppingBag} label="الطلبات" onClick={() => setSidebarOpen(false)} />

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-3 mt-6">النظام</p>
            <SidebarItem to="/settings" icon={Settings} label="الإعدادات" onClick={() => setSidebarOpen(false)} />
          </nav>

          <div className="p-4 border-t border-slate-200/50">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">A</div>
              <div>
                <p className="text-sm font-semibold text-slate-800">المدير</p>
                <p className="text-xs text-slate-400">مدير النظام</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">

          {/* Header */}
          <header className="h-16 border-b border-slate-200/50 bg-white/60 backdrop-blur-md flex items-center justify-between px-6 z-10 sticky top-0">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} className="text-slate-600" />
              </button>
              <div className="hidden sm:flex items-center bg-slate-100/80 border border-slate-200/50 rounded-xl px-4 py-2 w-80 focus-within:ring-2 ring-blue-500/20 transition-all">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث..."
                  className="bg-transparent border-none outline-none mr-3 text-sm w-full placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors relative">
                <Bell size={18} />
                <span className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
              <div className="h-9 w-9 border-2 border-white rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md cursor-pointer"></div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto p-6 md:p-8 relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10"></div>

            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>

        </main>
      </div>
    </Router>
  );
}
