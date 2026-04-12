import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Users, CreditCard, LayoutGrid, Settings, LogOut, Search, Bell } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mock Pages
const DashboardHome = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold text-slate-800">Overview</h1>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { title: 'Total Revenue', value: '$45,231.89', change: '+20.1% from last month' },
        { title: 'Active Users', value: '+2,350', change: '+180.1% from last month' },
        { title: 'Pending Deposits', value: '12', change: 'Require your attention' },
        { title: 'Total Services', value: '45', change: '+19 added this month' },
      ].map((stat, i) => (
        <div key={i} className="glass p-6 rounded-2xl hover:shadow-xl transition-all duration-300">
          <h3 className="text-sm font-medium text-slate-500">{stat.title}</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
          <p className="text-xs text-blue-600 mt-2">{stat.change}</p>
        </div>
      ))}
    </div>
  </div>
);

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="text-center space-y-4">
      <h2 className="text-3xl font-bold text-slate-700">{title}</h2>
      <p className="text-slate-500">This module is seamlessly connecting to PayMatrix Backend...</p>
    </div>
  </div>
);

const SidebarItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        isActive 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
          : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-800"
      )}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-slate-50 font-inter selection:bg-blue-100">
        
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200/50 bg-white/50 backdrop-blur-xl flex flex-col hidden md:flex">
          <div className="p-6">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold">
                PM
              </div>
              <span className="text-xl font-bold tracking-tight">PayMatrix</span>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-1">
            <SidebarItem to="/" icon={Home} label="Dashboard" />
            <SidebarItem to="/users" icon={Users} label="Users" />
            <SidebarItem to="/transactions" icon={CreditCard} label="Transactions" />
            <SidebarItem to="/services" icon={LayoutGrid} label="Services" />
            <SidebarItem to="/settings" icon={Settings} label="Settings" />
          </nav>
          
          <div className="p-4 border-t border-slate-200/50">
            <button className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors w-full">
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Header */}
          <header className="h-20 border-b border-slate-200/50 bg-white/40 backdrop-blur-md flex items-center justify-between px-8 z-10 sticky top-0">
            <div className="flex items-center bg-white/60 border border-slate-200 rounded-full px-4 py-2 w-96 focus-within:ring-2 ring-blue-500/20 transition-all">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search transactions, users..." 
                className="bg-transparent border-none outline-none ml-3 text-sm w-full placeholder:text-slate-400"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
              </button>
              <div className="h-10 w-10 border-2 border-white rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md"></div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto p-8 relative">
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10"></div>
             
             <Routes>
                <Route path="/" element={<DashboardHome />} />
                <Route path="/users" element={<ComingSoon title="Users Management" />} />
                <Route path="/transactions" element={<ComingSoon title="Transactions & Deposits" />} />
                <Route path="/services" element={<ComingSoon title="Services & Marketplace" />} />
                <Route path="/settings" element={<ComingSoon title="Platform Settings" />} />
             </Routes>
          </div>
          
        </main>
      </div>
    </Router>
  );
}
