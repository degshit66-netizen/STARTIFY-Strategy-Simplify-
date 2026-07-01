import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Bell, Calendar, Trash2, Edit3, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { SchedulerTask } from '../types';
import { r2, cleanDate } from '../utils/helpers';

interface SchedulerModuleProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SchedulerModule: React.FC<SchedulerModuleProps> = ({
  showToast
}) => {
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [editId, setEditId] = useState<number | null>(null);

  // Form Fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskModule, setTaskModule] = useState('General Ledger');
  const [taskStatus, setTaskStatus] = useState<'Open' | 'In Progress' | 'Done'>('Open');

  React.useEffect(() => {
    // Hydrate default deadlines if empty
    try {
      const stored = localStorage.getItem('stratify_tasks');
      if (stored) {
        setTasks(JSON.parse(stored));
      } else {
        const defaults: SchedulerTask[] = [
          { id: 1, title: 'BIR 2550Q VAT Filing Deadline', dueDate: `${new Date().getFullYear()}-07-25`, module: 'Value-Added Tax', status: 'Open' },
          { id: 2, title: 'Annual Income Tax 1702 Return Compilation', dueDate: `${new Date().getFullYear()}-04-15`, module: 'Income Tax', status: 'Done' },
          { id: 3, title: 'Monthly SEC/BIR S.A.S. Submission', dueDate: `${new Date().getFullYear()}-07-10`, module: 'Financial Statements', status: 'In Progress' },
          { id: 4, title: 'Submit Bound Loose-Leaf Books (Affidavit Annex C)', dueDate: `${new Date().getFullYear()}-01-30`, module: 'Loose Leaf Compliance', status: 'Open' }
        ];
        setTasks(defaults);
        localStorage.setItem('stratify_tasks', JSON.stringify(defaults));
      }
    } catch (e) {}
  }, []);

  const handleSaveTask = () => {
    const title = taskTitle.trim();
    if (!title || !taskDue) {
      showToast('Please enter both Task Title and Due Date.', 'error');
      return;
    }

    const newTask: SchedulerTask = {
      id: editId || Date.now(),
      title,
      dueDate: taskDue,
      module: taskModule,
      status: taskStatus
    };

    let nextList = [...tasks];
    if (editId) {
      nextList = nextList.map(t => t.id === editId ? newTask : t);
      showToast('Task updated in schedule.', 'success');
      setEditId(null);
    } else {
      nextList = [newTask, ...nextList];
      showToast('New deadline added to calendar schedule.', 'success');
    }

    setTasks(nextList);
    localStorage.setItem('stratify_tasks', JSON.stringify(nextList));
    setTaskTitle('');
    setTaskDue('');
    setTaskModule('General Ledger');
    setTaskStatus('Open');
  };

  const handleEdit = (task: SchedulerTask) => {
    setEditId(task.id);
    setTaskTitle(task.title);
    setTaskDue(task.dueDate);
    setTaskModule(task.module);
    setTaskStatus(task.status);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Are you sure you want to remove this task?')) return;
    const nextList = tasks.filter(t => t.id !== id);
    setTasks(nextList);
    localStorage.setItem('stratify_tasks', JSON.stringify(nextList));
    showToast('Task removed from schedule.', 'success');
  };

  const triggerPushPermission = async () => {
    if (!('Notification' in window)) {
      showToast('This browser does not support push notifications.', 'error');
      return;
    }
    if (Notification.permission === 'granted') {
      showToast('Notification permission is already enabled.', 'success');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      showToast('Push notifications successfully authorized!', 'success');
    } else {
      showToast('Notification permission denied.', 'error');
    }
  };

  const activeCount = tasks.filter(t => t.status !== 'Done').length;
  const overdueCount = tasks.filter(t => t.status !== 'Done' && new Date(t.dueDate) < new Date()).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-sans">📅 Business Scheduler</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage tax filing deadlines, monthly audits, corporate reports, and setup schedules.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button 
            onClick={triggerPushPermission}
            className="flex items-center gap-2 text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl transition-colors border border-zinc-200 dark:border-zinc-700 shadow-sm"
          >
            <Bell className="w-4 h-4 text-blue-500" />
            <span>Enable Push Alarms</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Deadlines</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{tasks.length}</div>
            <div className="text-xs text-zinc-400 font-medium">Critical events on timeline</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pending Actions</span>
            <div className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">{activeCount}</div>
            <div className="text-xs text-zinc-400 font-medium">Tasks in progress or open</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex items-start justify-between shadow-sm">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Overdue Events</span>
            <div className={`text-lg font-extrabold ${overdueCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {overdueCount}
            </div>
            <div className="text-xs text-zinc-400 font-medium">{overdueCount > 0 ? 'Past deadline' : 'Zero items overdue'}</div>
          </div>
          <div className={`p-2.5 rounded-xl ${overdueCount > 0 ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">{editId ? 'Update Deadline' : 'Schedule New Event'}</h3>
          
          <div className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Task Title</label>
              <input 
                type="text" 
                placeholder="Filing BIR quarterly income tax"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Due Date</label>
                <input 
                  type="date" 
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Task Status</label>
                <select 
                  value={taskStatus}
                  onChange={(e: any) => setTaskStatus(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Responsible Department / Tag</label>
              <input 
                type="text" 
                placeholder="Tax Compliance / General Ledger"
                value={taskModule}
                onChange={(e) => setTaskModule(e.target.value)}
                className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button 
              onClick={handleSaveTask}
              className="flex-1 text-center text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm"
            >
              {editId ? 'Update Deadline' : 'Schedule Deadline'}
            </button>
            {editId && (
              <button 
                onClick={() => {
                  setEditId(null);
                  setTaskTitle('');
                  setTaskDue('');
                  setTaskModule('General Ledger');
                  setTaskStatus('Open');
                }}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold px-4 py-2.5 rounded-xl transition-all text-xs"
              >
                Cancel
              </button>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3">Task Details</th>
                  <th className="px-5 py-3">Department / Class</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {tasks.length ? tasks.map(t => {
                  const due = new Date(t.dueDate);
                  const isOverdue = t.status !== 'Done' && due < new Date();
                  return (
                    <tr key={t.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-zinc-800 dark:text-zinc-200">{t.title}</td>
                      <td className="px-5 py-3.5 font-semibold text-zinc-500 dark:text-zinc-400">{t.module}</td>
                      <td className="px-5 py-3.5 font-bold font-mono text-zinc-800 dark:text-zinc-300">
                        <div className="flex flex-col">
                          <span>{cleanDate(t.dueDate)}</span>
                          {isOverdue && (
                            <span className="text-[10px] text-red-500 font-bold uppercase mt-0.5">Overdue</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          t.status === 'Done' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                            : t.status === 'In Progress'
                              ? 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                              : 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleEdit(t)}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 rounded"
                            title="Edit task"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 rounded"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500 italic">No scheduled tasks logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
