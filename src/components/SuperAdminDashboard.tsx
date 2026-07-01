import React, { useState } from 'react';
import { Tenant, User } from '../types';
import { ShieldCheck, Building, Users, Play, Pause, XCircle, LogOut } from 'lucide-react';
import { format } from 'date-fns';

interface SuperAdminDashboardProps {
  tenants: Tenant[];
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  users: User[];
  onLogout: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ tenants, setTenants, users, onLogout }) => {
  const handleUpdateStatus = (tenantId: string, status: Tenant['subscriptionStatus']) => {
    setTenants(tenants.map(t => t.id === tenantId ? { ...t, subscriptionStatus: status } : t));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Super Admin Dashboard</h1>
              <p className="text-xs text-zinc-500">Manage Tenants and Subscriptions</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Tenants</p>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{tenants.length}</h2>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Active / Online</p>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {tenants.filter(t => t.subscriptionStatus === 'active' || t.subscriptionStatus === 'trial').length} / {tenants.filter(t => t.isOnline).length}
              </h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Registered Tenants</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-4 font-semibold">Tenant Name</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Users</th>
                  <th className="p-4 font-semibold">Registered</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
                {tenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                           <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-zinc-500">
                             {tenant.logo ? <img src={tenant.logo} className="w-8 h-8 rounded-lg object-cover" /> : tenant.name.charAt(0)}
                           </div>
                           <div className="absolute -bottom-1 -right-1">
                             <div className={`absolute -inset-1 rounded-full ${tenant.isOnline ? 'bg-emerald-500/30 animate-ping' : ''}`}></div>
                             <div className={`relative w-3 h-3 border-2 border-white dark:border-zinc-900 rounded-full ${tenant.isOnline ? 'bg-emerald-500' : 'bg-zinc-400'}`}></div>
                           </div>
                        </div>
                        <div>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100 block leading-tight mb-0.5">{tenant.name}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${tenant.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
                            {tenant.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${tenant.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                        ${tenant.subscriptionStatus === 'trial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                        ${tenant.subscriptionStatus === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                        ${tenant.subscriptionStatus === 'terminated' || tenant.subscriptionStatus === 'expired' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : ''}
                      `}>
                        {tenant.subscriptionStatus}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500">{users.filter(u => u.tenantId === tenant.id).length}</td>
                    <td className="p-4 text-zinc-500">{format(new Date(tenant.createdAt), 'MMM dd, yyyy')}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {tenant.subscriptionStatus !== 'active' && (
                          <button onClick={() => handleUpdateStatus(tenant.id, 'active')} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Activate / Continue">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {tenant.subscriptionStatus === 'active' && (
                          <button onClick={() => handleUpdateStatus(tenant.id, 'paused')} className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Pause Account">
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {tenant.subscriptionStatus !== 'terminated' && (
                          <button onClick={() => handleUpdateStatus(tenant.id, 'terminated')} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Terminate Account">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">No tenants registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
