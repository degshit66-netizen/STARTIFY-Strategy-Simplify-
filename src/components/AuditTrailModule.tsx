import React, { useState, useEffect } from 'react';
import { FileSearch, Clock, User, Hash, Activity } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditTrailModuleProps {}

export const AuditTrailModule: React.FC<AuditTrailModuleProps> = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('stratify_audit_trail');
      if (stored) {
        setLogs(JSON.parse(stored).reverse());
      }
    } catch (e) {}
  }, []);

  return (
    <div className="space-y-6 flex flex-col h-full min-h-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Audit Trail
          </h2>
          <p className="text-sm text-zinc-500">Enterprise-grade logging of all system activities.</p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-x-auto p-4">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-12">
              <FileSearch className="w-12 h-12 mb-4 opacity-50" />
              <p>No audit logs available.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 text-center">Date & Time</th>
                  <th className="px-4 py-3 text-center">User</th>
                  <th className="px-4 py-3 text-center">Action</th>
                  <th className="px-4 py-3 text-center">Record ID</th>
                  <th className="px-4 py-3 w-full">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {logs.map((log) => (
                  <tr key={log.logId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                    <td className="px-4 py-3 text-zinc-500 text-center font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-center flex items-center justify-center gap-2">
                      <User className="w-3 h-3 text-zinc-400" /> {log.user}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        log.action === 'VOID' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center justify-center gap-1">
                        <Hash className="w-3 h-3 opacity-50" /> {log.recordId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {log.details}
                      {log.changes && <span className="block mt-1 text-[10px] text-zinc-400 italic max-w-md truncate" title={log.changes}>{log.changes}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditTrailModule;
