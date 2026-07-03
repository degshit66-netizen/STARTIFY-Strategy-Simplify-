import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, CheckCircle, Search, Edit3, Save, XCircle, Users, Activity, Play, Pause, MoreVertical, CreditCard, LayoutDashboard, Megaphone, Plus, Trash2, Settings2, FileSpreadsheet, FileCheck2, RefreshCw, Cpu, Server, Globe2, Radio, Zap, Database } from 'lucide-react';
import { Tenant, User, SystemAnnouncement } from '../types';
import { format } from 'date-fns';
import { syncConfigToFirebase, loadConfigFromFirebase, loadTenantsFromFirebase, syncTenantToFirebase } from '../lib/db';

interface SuperAdminDashboardProps {
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  users: User[];
  onLogout: () => void;
  onSelectTenant?: (tenant: Tenant) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ tenants, setTenants, users, onLogout, onSelectTenant }) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'announcements' | 'system'>('tenants');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Announcements State
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<SystemAnnouncement>>({ title: '', message: '', type: 'info' });

  // Subscription Update Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [updateDate, setUpdateDate] = useState<string>('');
  const [editModules, setEditModules] = useState<{ payroll?: boolean; inventory?: boolean; ecommerce?: boolean; fixedAssets?: boolean }>({});

  useEffect(() => {
    const loadAnnouncements = async () => {
      const saved = await loadConfigFromFirebase('stratify_announcements');
      if (saved) setAnnouncements(JSON.parse(saved));
    };
    loadAnnouncements();
  }, []);

  const saveAnnouncements = async (data: SystemAnnouncement[]) => {
    setAnnouncements(data);
    await syncConfigToFirebase('stratify_announcements', JSON.stringify(data));
  };

  const handleAddAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.message) return;
    const item: SystemAnnouncement = {
      id: Date.now().toString(),
      title: newAnnouncement.title,
      message: newAnnouncement.message,
      type: newAnnouncement.type as any || 'info',
      active: true,
      createdAt: new Date().toISOString()
    };
    saveAnnouncements([item, ...announcements]);
    setShowAnnounceModal(false);
    setNewAnnouncement({ title: '', message: '', type: 'info' });
  };

  const handleDeleteAnnouncement = (id: string) => {
    
    saveAnnouncements(announcements.filter(a => a.id !== id));
  };

  const toggleAnnouncementActive = (id: string) => {
    saveAnnouncements(announcements.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const openUpdateModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setUpdateDate(tenant.expiresAt ? new Date(tenant.expiresAt).toISOString().slice(0, 10) : new Date(tenant.trialEndsAt).toISOString().slice(0, 10));
    setEditModules(tenant.modules || { payroll: true, inventory: true, ecommerce: true, fixedAssets: true });
    setIsUpdateModalOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (selectedTenant && updateDate) {
      const updatedTenants = tenants.map(t => t.id === selectedTenant.id ? { 
        ...t, 
        subscriptionStatus: 'active' as const,
        expiresAt: new Date(updateDate).toISOString(),
        modules: editModules
      } : t);
      setTenants(updatedTenants);
      const tenantToSync = updatedTenants.find(t => t.id === selectedTenant.id);
      if (tenantToSync) {
        await syncTenantToFirebase(tenantToSync);
      }
      setIsUpdateModalOpen(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'paused' | 'terminated') => {
    
    const updatedTenants = tenants.map(t => t.id === id ? { ...t, subscriptionStatus: status } : t);
    setTenants(updatedTenants);
    const tenantToSync = updatedTenants.find(t => t.id === id);
    if (tenantToSync) {
      await syncTenantToFirebase(tenantToSync);
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.subscriptionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeTenantsCount = tenants.filter(t => ['active', 'trial'].includes(t.subscriptionStatus)).length;
  const mrr = tenants.filter(t => t.subscriptionStatus === 'active').reduce((sum, t) => sum + (t.pricePaid || 0), 0);

  return (
    <div className="h-screen bg-gradient-to-br from-white to-blue-50 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-cyan-50 dark:text-slate-900 dark:text-cyan-50 flex flex-col font-sans overflow-hidden selection:bg-blue-500/30 relative">
      {/* Background grid & glows for command center feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-cyan-600/10 pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/10 pointer-events-none rounded-full" />

      {/* Header */}
      <header className="relative bg-white/80 dark:bg-slate-950 border-b border-blue-200 dark:border-blue-200 dark:border-blue-900/50 px-6 py-4 flex items-center justify-between shadow-[0_0_30px_rgba(8,145,178,0.1)] z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src="https://i.postimg.cc/5yGwSWWR/1782659487700.png" alt="STRATIFY Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-zinc-950 animate-pulse shadow-[0_0_10px_rgba(34,211,238,1)]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest uppercase text-slate-900 dark:text-cyan-50 ">
              STRATIFY Command Center
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-900 dark:text-cyan-50 font-mono tracking-widest uppercase">Global Control Node</span>
              <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
              <span className="text-[10px] text-slate-900 dark:text-cyan-50 font-mono">SYS_ONLINE</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white dark:bg-slate-900/50 border border-blue-200 dark:border-blue-900/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-900 dark:text-cyan-50 " />
              <span className="text-xs font-mono text-slate-900 dark:text-cyan-50 ">99.99% UPTIME</span>
            </div>
            <div className="w-px h-4 bg-blue-100 dark:bg-blue-900/50" />
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-900 dark:text-cyan-50 " />
              <span className="text-xs font-mono text-slate-900 dark:text-cyan-50 ">12 NODES</span>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 hover:border-blue-500/50 text-slate-900 dark:text-cyan-50 hover:text-slate-900 dark:text-cyan-50 rounded-xl transition-all shadow-[0_0_15px_rgba(8,145,178,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] text-sm font-bold uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" />
            <span>DISCONNECT</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6 relative z-10 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent">
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/30 p-5 rounded-2xl shadow-[inset_0_0_20px_rgba(8,145,178,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 dark:bg-blue-500 group-hover:shadow-[0_0_20px_rgba(34,211,238,1)] transition-all" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-50 dark:bg-blue-950/50 text-slate-900 dark:text-cyan-50 rounded-xl border border-blue-200 dark:border-blue-200 dark:border-blue-900/50">
                <Globe2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-900 dark:text-cyan-50 uppercase tracking-[0.2em] mb-1">Global Active Tenants</div>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-cyan-50 ">{activeTenantsCount}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/30 p-5 rounded-2xl shadow-[inset_0_0_20px_rgba(8,145,178,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,1)] transition-all" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-slate-900 dark:text-cyan-50 rounded-xl border border-blue-200 dark:border-blue-900/50">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-900 dark:text-cyan-50 uppercase tracking-[0.2em] mb-1">Total Connected Users</div>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-cyan-50 ">{users.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-emerald-900/30 p-5 rounded-2xl shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:shadow-[0_0_20px_rgba(16,185,129,1)] transition-all" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-slate-900 dark:text-cyan-50 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-900 dark:text-cyan-50 uppercase tracking-[0.2em] mb-1">Total MRR (PHP)</div>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-cyan-50 ">
                  ₱{mrr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-purple-900/30 p-5 rounded-2xl shadow-[inset_0_0_20px_rgba(168,85,247,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 group-hover:shadow-[0_0_20px_rgba(168,85,247,1)] transition-all" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-slate-900 dark:text-cyan-50 rounded-xl border border-purple-200 dark:border-purple-900/50">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-900 dark:text-cyan-50 uppercase tracking-[0.2em] mb-1">Compute Load</div>
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-cyan-50 ">
                  {Math.min(100, Math.max(12, tenants.length * 2.5)).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-blue-200 dark:border-blue-900/30 pb-2">
          {[
            { id: 'tenants', label: 'TENANT MATRIX', icon: LayoutDashboard },
            { id: 'announcements', label: 'BROADCAST LINK', icon: Radio },
            { id: 'system', label: 'CORE SYSTEM', icon: Cpu }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.1em] rounded-t-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-50 dark:bg-blue-950/80 text-slate-900 dark:text-cyan-50 border-t border-l border-r border-blue-500/50 shadow-[0_-5px_15px_rgba(34,211,238,0.1)]' 
                  : 'text-slate-900 dark:text-cyan-50 hover:text-slate-900 dark:text-cyan-50 hover:bg-blue-50 dark:bg-blue-950/30 border-t border-l border-r border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {activeTab === 'tenants' && (
          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-blue-200 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-950/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-cyan-50 " />
                <input 
                  type="text" 
                  placeholder="Scan tenant matrix..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white/80 dark:bg-slate-950/80 border border-blue-200 dark:border-blue-200 dark:border-blue-900/50 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs font-mono text-slate-900 dark:text-cyan-50 placeholder-cyan-800 transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                />
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={async () => {
                    const latest = await loadTenantsFromFirebase();
                    setTenants(latest);
                  }}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:bg-blue-950 hover:border-blue-500 rounded-lg text-slate-900 dark:text-cyan-50 flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(8,145,178,0.2)]"
                  title="Refresh Matrix"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 animate-ping" />
                  <span className="text-[10px] font-bold text-slate-900 dark:text-cyan-50 uppercase tracking-widest">Live Sync</span>
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white/80 dark:bg-slate-950/80 border border-blue-200 dark:border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-mono text-slate-900 dark:text-cyan-50 focus:ring-1 focus:ring-blue-500 uppercase tracking-wider"
                >
                  <option value="all">ALL NODES</option>
                  <option value="trial">TRIAL NODES</option>
                  <option value="active">ACTIVE NODES</option>
                  <option value="paused">PAUSED NODES</option>
                  <option value="terminated">TERMINATED</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-950/30 text-slate-900 dark:text-cyan-50 text-[10px] uppercase tracking-[0.2em] font-black border-b border-blue-200 dark:border-blue-900/40">
                    <th className="p-4 py-3">Entity Identifier</th>
                    <th className="p-4 py-3">Node Status</th>
                    <th className="p-4 py-3">Subscription Data</th>
                    <th className="p-4 py-3">Capacity</th>
                    <th className="p-4 py-3">Initialization</th>
                    <th className="p-4 py-3">Lifespan End</th>
                    <th className="p-4 py-3 text-right">Command Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-900/20 text-xs font-mono">
                  {filteredTenants.map(tenant => {
                    const isExpiringSoon = tenant.subscriptionStatus === 'trial' && new Date(tenant.trialEndsAt).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                    return (
                    <tr key={tenant.id} className="hover:bg-blue-50 dark:bg-blue-950/20 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/80 dark:bg-slate-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-slate-900 dark:text-cyan-50 font-black shadow-[inset_0_0_10px_rgba(34,211,238,0.2)] shrink-0">
                            {tenant.name.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-cyan-50 font-sans tracking-wide">{tenant.name}</div>
                            <div className="text-[10px] text-slate-900 dark:text-cyan-50 ">{tenant.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`
                          inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-widest shadow-[0_0_10px_currentColor_inset]
                          ${tenant.subscriptionStatus === 'active' ? 'border-emerald-500/50 text-slate-900 dark:text-cyan-50 bg-emerald-950/30' : ''}
                          ${tenant.subscriptionStatus === 'trial' ? isExpiringSoon ? 'border-amber-500/50 text-amber-400 bg-amber-950/30' : 'border-blue-500/50 text-slate-900 dark:text-cyan-50 bg-blue-950/30' : ''}
                          ${tenant.subscriptionStatus === 'paused' ? 'border-orange-500/50 text-orange-400 bg-orange-950/30' : ''}
                          ${tenant.subscriptionStatus === 'terminated' || tenant.subscriptionStatus === 'expired' ? 'border-rose-500/50 text-rose-400 bg-rose-950/30' : ''}
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tenant.subscriptionStatus === 'active' ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,1)]' : tenant.subscriptionStatus === 'trial' ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,1)]' : tenant.subscriptionStatus === 'paused' ? 'bg-orange-400' : 'bg-rose-400'}`}></span>
                          {tenant.subscriptionStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-900 dark:text-cyan-50 ">
                          {tenant.subscriptionStatus === 'trial' ? 'FREE_TRIAL' : `PREM_${tenant.subscriptionType === 'annual' ? 'ANNUAL' : 'MONTHLY'}`}
                        </div>
                        <div className="text-[10px] text-slate-900 dark:text-cyan-50 ">
                          PHP {(tenant.pricePaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-cyan-50 ">
                          <Users className="w-3.5 h-3.5 opacity-50" />
                          <span>{users.filter(u => u.tenantId === tenant.id).length} / {tenant.subscriptionStatus === 'trial' ? '0' : (tenant.userLimit || 0)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-900 dark:text-cyan-50 ">{format(new Date(tenant.createdAt), 'yyyy-MM-dd')}</div>
                        <div className="text-[10px] text-slate-900 dark:text-cyan-50 ">{format(new Date(tenant.createdAt), 'HH:mm:ss')}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-900 dark:text-cyan-50 ">
                          {tenant.expiresAt 
                            ? format(new Date(tenant.expiresAt), 'yyyy-MM-dd') 
                            : format(new Date(tenant.trialEndsAt), 'yyyy-MM-dd')}
                        </div>
                        <div className="text-[10px] text-slate-900 dark:text-cyan-50 ">
                          {tenant.expiresAt ? 'SYS_EXPIRE' : 'TRIAL_END'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          
                          <button type="button" onClick={() => openUpdateModal(tenant)} className="p-3 sm:p-1.5 border border-indigo-800 text-indigo-400 hover:bg-indigo-900/50 hover:border-indigo-400 hover:shadow-[0_0_10px_rgba(129,140,248,0.5)] rounded transition-all" title="Modify Node Parameters">
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                          {tenant.subscriptionStatus !== 'active' && (
                            <button type="button" onClick={() => handleUpdateStatus(tenant.id, 'active')} className="p-3 sm:p-1.5 border border-emerald-800 text-slate-900 dark:text-cyan-50 hover:bg-emerald-900/50 hover:border-emerald-400 hover:shadow-[0_0_10px_rgba(52,211,153,0.5)] rounded transition-all" title="Force Activate">
                              <Activity className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {tenant.subscriptionStatus === 'active' && (
                            <button type="button" onClick={() => handleUpdateStatus(tenant.id, 'paused')} className="p-3 sm:p-1.5 border border-amber-800 text-amber-400 hover:bg-amber-900/50 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(251,191,36,0.5)] rounded transition-all" title="Halt Operations">
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {tenant.subscriptionStatus !== 'terminated' && (
                            <button type="button" onClick={() => handleUpdateStatus(tenant.id, 'terminated')} className="p-3 sm:p-1.5 border border-rose-800 text-rose-400 hover:bg-rose-900/50 hover:border-rose-400 hover:shadow-[0_0_10px_rgba(244,63,94,0.5)] rounded transition-all" title="Purge Node">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center text-blue-800 dark:text-blue-300">
                          <Globe2 className="w-12 h-12 mb-4 opacity-50" />
                          <p className="font-mono text-sm tracking-widest uppercase">NO ACTIVE NODES DETECTED</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-blue-200 dark:border-blue-900/40 gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-cyan-50 uppercase tracking-widest flex items-center gap-3">
                  <Radio className="w-6 h-6 text-slate-900 dark:text-cyan-50 animate-pulse" />
                  Global Broadcast Network
                </h2>
                <p className="text-xs font-mono text-slate-900 dark:text-cyan-50 mt-2 uppercase tracking-wider">Transmit emergency alerts or system updates to all active nodes.</p>
              </div>
              <button 
                onClick={() => setShowAnnounceModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-50 dark:bg-blue-950 border border-blue-500 hover:bg-cyan-900 text-slate-900 dark:text-cyan-50 hover:text-slate-900 dark:text-cyan-50 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all text-xs font-black uppercase tracking-[0.2em]"
              >
                <Plus className="w-4 h-4" />
                INITIATE BROADCAST
              </button>
            </div>

            <div className="space-y-4">
              {announcements.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-blue-200 dark:border-blue-200 dark:border-blue-900/50 rounded-xl bg-white/80 dark:bg-slate-950/30">
                  <p className="font-mono text-slate-900 dark:text-cyan-50 tracking-widest uppercase text-sm">Communication channel is silent. No active broadcasts.</p>
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className={`p-5 rounded-xl border relative overflow-hidden group transition-all ${ann.active ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' : 'border-zinc-800 bg-white/80 dark:bg-slate-950/50 opacity-60'}`}>
                    {ann.active && <div className="absolute left-0 top-0 w-1 h-full bg-blue-600 dark:bg-blue-500 shadow-[0_0_15px_rgba(34,211,238,1)]" />}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded border text-[10px] font-black uppercase tracking-[0.2em] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]
                            ${ann.type === 'info' ? 'border-blue-500/50 text-slate-900 dark:text-cyan-50 bg-blue-50 dark:bg-blue-950/50' : ''}
                            ${ann.type === 'warning' ? 'border-amber-500/50 text-amber-400 bg-amber-950/50' : ''}
                            ${ann.type === 'success' ? 'border-emerald-500/50 text-slate-900 dark:text-cyan-50 bg-emerald-50 dark:bg-emerald-950/50' : ''}
                          `}>
                            {ann.type}
                          </span>
                          <h3 className="font-bold text-slate-900 dark:text-cyan-50 tracking-wide text-lg">{ann.title}</h3>
                        </div>
                        <p className="text-sm font-sans text-slate-900 dark:text-cyan-50 leading-relaxed max-w-3xl">{ann.message}</p>
                        <div className="flex items-center gap-4 text-[10px] text-slate-900 dark:text-cyan-50 font-mono">
                          <span>ID: {ann.id}</span>
                          <span>TIME: {format(new Date(ann.createdAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button 
                          onClick={() => toggleAnnouncementActive(ann.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all border ${ann.active ? 'border-blue-200 dark:border-blue-800 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'border-zinc-700 text-slate-900 dark:text-cyan-50 hover:bg-slate-100 dark:bg-slate-800'}`}
                        >
                          {ann.active ? 'SILENCE' : 'RE-BROADCAST'}
                        </button>
                        <button 
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-2 text-rose-500/50 hover:text-rose-400 border border-rose-900/30 hover:border-rose-500/50 hover:bg-rose-950/30 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 md:p-8 space-y-8">
            <div className="border-b border-blue-200 dark:border-blue-900/40 pb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-cyan-50 uppercase tracking-widest flex items-center gap-3">
                  <Cpu className="w-6 h-6 text-slate-900 dark:text-cyan-50 " />
                  CORE SYSTEM ARCHITECTURE
                </h2>
                <p className="text-xs font-mono text-slate-900 dark:text-cyan-50 mt-2 uppercase tracking-wider">Master overrides and environmental diagnostics.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-slate-900 dark:text-cyan-50 " />
                <span className="text-[10px] font-mono text-slate-900 dark:text-cyan-50 uppercase tracking-widest">System Nominal</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white/80 dark:bg-slate-950/50 border border-blue-200 dark:border-blue-200 dark:border-blue-900/50 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-600/10 rounded-full" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-cyan-50 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4" />
                    Render Engine Configuration
                  </h3>
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-blue-200 dark:border-blue-900/30 pb-2">
                      <span className="text-slate-900 dark:text-cyan-50 ">ENGINE_VERSION</span>
                      <span className="text-slate-900 dark:text-cyan-50 ">v2.4.1 (Native HTML-to-PDF)</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-blue-200 dark:border-blue-900/30 pb-2">
                      <span className="text-slate-900 dark:text-cyan-50 ">TEMPLATE_INJECTION</span>
                      <span className="text-amber-400">DISABLED (Strict Mode)</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-slate-900 dark:text-cyan-50 ">AUTO_MAPPING</span>
                      <span className="text-slate-900 dark:text-cyan-50 ">ACTIVE</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-950/50 border border-blue-200 dark:border-blue-200 dark:border-blue-900/50 rounded-2xl p-6 relative overflow-hidden">
                   <h3 className="text-xs font-black text-slate-900 dark:text-cyan-50 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Data Grid Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                      <div className="text-[10px] font-mono text-slate-900 dark:text-cyan-50 uppercase mb-2">Primary Store</div>
                      <div className="text-sm font-black text-slate-900 dark:text-cyan-50 uppercase tracking-wide">Firestore DB</div>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/30 rounded-xl">
                      <div className="text-[10px] font-mono text-slate-900 dark:text-cyan-50 uppercase mb-2">Replication</div>
                      <div className="text-sm font-black text-slate-900 dark:text-cyan-50 uppercase tracking-wide">Multi-Region</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-500/30 rounded-2xl p-6 shadow-[inset_0_0_30px_rgba(34,211,238,0.05)] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-cyan-50 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Security Protocols
                  </h3>
                  <ul className="space-y-4 font-mono text-xs text-slate-900 dark:text-cyan-50 ">
                    <li className="flex items-start gap-3">
                      <span className="text-blue-500 mt-0.5">[{'>'}]</span>
                      <span>Electron binary compilation sequence uses strict code signing for generated `.exe` packages.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-500 mt-0.5">[{'>'}]</span>
                      <span>Cross-tenant data pollution prevention is strictly enforced at the Firestore Security Rules layer.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-500 mt-0.5">[{'>'}]</span>
                      <span>External API key exposure is zero. All third-party communication proxies through the embedded Express node.</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-8 p-4 bg-white/80 dark:bg-slate-950 border border-blue-200 dark:border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-blue-500 uppercase tracking-widest mb-1">Background Worker</div>
                    <div className="text-xs font-sans font-bold text-slate-900 dark:text-cyan-50 ">Monitoring System Telemetry...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals with matching dark neon theme */}
      {isUpdateModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-white/80 dark:bg-slate-950/95 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-blue-500/50 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(34,211,238,0.15)]">
            <h2 className="text-xl font-black text-slate-900 dark:text-cyan-50 uppercase tracking-widest mb-1">Modify Node Parameters</h2>
            <p className="text-xs font-mono text-slate-900 dark:text-cyan-50 mb-6 uppercase">Target ID: {selectedTenant.id}</p>
            
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-[10px] font-black text-slate-900 dark:text-cyan-50 mb-2 uppercase tracking-[0.2em]">Lifecycle Extension</label>
                <input 
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-slate-950 border border-blue-200 dark:border-blue-900 focus:border-blue-500 rounded-lg text-slate-900 dark:text-cyan-50 font-mono text-sm outline-none transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                />
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => setUpdateDate(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10))}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 hover:border-blue-500 text-slate-900 dark:text-cyan-50 rounded transition-all text-xs font-mono font-bold uppercase"
                  >
                    +30 DAYS
                  </button>
                  <button 
                    onClick={() => setUpdateDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10))}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 hover:border-blue-500 text-slate-900 dark:text-cyan-50 rounded transition-all text-xs font-mono font-bold uppercase"
                  >
                    +365 DAYS
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-900 dark:text-cyan-50 mb-3 uppercase tracking-[0.2em]">Feature Provisioning</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'payroll', label: 'PAYROLL_SYS' },
                    { key: 'inventory', label: 'INV_TRACKER' },
                    { key: 'ecommerce', label: 'ECOM_BRIDGE' },
                    { key: 'fixedAssets', label: 'ASSET_MGR' }
                  ].map(mod => (
                    <label key={mod.key} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${editModules[mod.key as keyof typeof editModules] !== false ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-zinc-800 bg-white/80 dark:bg-slate-950 hover:border-blue-200 dark:border-blue-900'}`}>
                      <input 
                        type="checkbox" 
                        checked={editModules[mod.key as keyof typeof editModules] ?? true}
                        onChange={(e) => setEditModules(prev => ({ ...prev, [mod.key]: e.target.checked }))}
                        className="hidden"
                      />
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${editModules[mod.key as keyof typeof editModules] !== false ? 'border-cyan-400 bg-blue-600 dark:bg-blue-500' : 'border-zinc-700 bg-transparent'}`}>
                        {editModules[mod.key as keyof typeof editModules] !== false && <CheckCircle className="w-3 h-3 text-zinc-950" />}
                      </div>
                      <span className={`text-xs font-mono font-bold ${editModules[mod.key as keyof typeof editModules] !== false ? 'text-slate-900 dark:text-cyan-50 ' : 'text-slate-900 dark:text-cyan-50 '}`}>{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-blue-200 dark:border-blue-900/30">
              <button 
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-6 py-2 text-xs font-black text-slate-900 dark:text-cyan-50 hover:text-slate-900 dark:text-cyan-50 uppercase tracking-widest transition-colors"
              >
                ABORT
              </button>
              <button 
                onClick={handleSaveUpdate}
                className="px-6 py-2 text-xs font-black bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 text-zinc-950 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all uppercase tracking-widest"
              >
                COMMIT CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnnounceModal && (
        <div className="fixed inset-0 bg-white/80 dark:bg-slate-950/95 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-blue-500/50 rounded-2xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(34,211,238,0.15)]">
            <h2 className="text-xl font-black text-slate-900 dark:text-cyan-50 uppercase tracking-widest mb-6">Initialize Broadcast</h2>
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-[10px] font-black text-slate-900 dark:text-cyan-50 mb-2 uppercase tracking-[0.2em]">Signal Header</label>
                <input 
                  type="text"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-slate-950 border border-blue-200 dark:border-blue-900 focus:border-blue-500 rounded-lg text-slate-900 dark:text-cyan-50 font-mono text-sm outline-none transition-all"
                  placeholder="e.g. MAINTENANCE_WINDOW"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-900 dark:text-cyan-50 mb-2 uppercase tracking-[0.2em]">Severity Level</label>
                <select
                  value={newAnnouncement.type}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value as any})}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-slate-950 border border-blue-200 dark:border-blue-900 focus:border-blue-500 rounded-lg text-slate-900 dark:text-cyan-50 font-mono text-sm outline-none uppercase tracking-wider"
                >
                  <option value="info">STANDARD (INFO)</option>
                  <option value="warning">ELEVATED (WARNING)</option>
                  <option value="success">RESOLVED (SUCCESS)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-900 dark:text-cyan-50 mb-2 uppercase tracking-[0.2em]">Payload Message</label>
                <textarea 
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-slate-950 border border-blue-200 dark:border-blue-900 focus:border-blue-500 rounded-lg text-slate-900 dark:text-cyan-50 font-mono text-sm outline-none h-32 resize-none"
                  placeholder="Enter transmission payload..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-blue-200 dark:border-blue-900/30">
              <button 
                onClick={() => setShowAnnounceModal(false)}
                className="px-6 py-2 text-xs font-black text-slate-900 dark:text-cyan-50 hover:text-slate-900 dark:text-cyan-50 uppercase tracking-widest transition-colors"
              >
                ABORT
              </button>
              <button 
                onClick={handleAddAnnouncement}
                className="px-6 py-2 text-xs font-black bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 text-zinc-950 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all uppercase tracking-widest flex items-center gap-2"
              >
                <Radio className="w-4 h-4" />
                TRANSMIT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
