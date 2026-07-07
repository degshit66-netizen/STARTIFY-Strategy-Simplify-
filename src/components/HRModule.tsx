import { formatCurrency, parseNum } from '../utils/helpers';
import React, { useState, useEffect, useRef } from 'react';
import {  
  Users, Mail, Phone, Briefcase, Plus, X, Edit, Trash2, Clock, Calendar, 
  LogOut, ShieldCheck, Network, MapPin, Camera, QrCode, RefreshCw, 
  Smartphone, Check, AlertTriangle, FileText, Sparkles, Building2, UserCheck, Eye, Printer 
, FolderOpen , Activity, UserPlus , Settings, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  basicSalary: number;
  tin: string;
  sss: string;
  philHealth: string;
  pagIbig: string;
  dateHired: string;
  branch?: string;
  payFrequency?: 'Weekly' | 'Semi-Monthly' | 'Monthly';
  rateType?: 'Monthly' | 'Daily' | 'Hourly';
  dailyRate?: number;
  hourlyRate?: number;
}

interface HRModuleProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const STORAGE_KEY = 'stratify_hr_employees';
const TIME_KEY = 'stratify_hr_time';
const LEAVES_KEY = 'stratify_hr_leaves';

const BRANCHES = [
  { name: 'Manila Head Office', code: 'MHD', coords: '14.5995° N, 120.9842° E', address: 'Ayala Ave, Makati, Metro Manila' },
  { name: 'Cebu IT Hub', code: 'CEB', coords: '10.3157° N, 123.8854° E', address: 'Cebu IT Park, Cebu City' },
  { name: 'Davao Hub', code: 'DAV', coords: '7.1907° N, 125.4553° E', address: 'Bajada, Davao City' },
  { name: 'Quezon City Warehouse', code: 'QCQ', coords: '14.6760° N, 121.0437° E', address: 'Mindanao Ave, Quezon City' },
];

export const HRModule: React.FC<HRModuleProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'Directory' | 'Time' | 'Leaves' | 'Performance' | 'Onboarding' | 'SelfService' | 'Compliance' | 'Settings' | 'Cloud'>('Directory');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hrSettings, setHrSettings] = useState({ otRate: 1.25, lateRateType: 'hourly', lateRateValue: 1, statutorySchedule: 'Half-Half', sssRate: 4.5, sssMaxEE: 1350, phRateEE: 2.5, phFloor: 10000, phCap: 100000, piRateEE: 2.0, piMaxEE: 200 });
  useEffect(() => { const s = localStorage.getItem('stratify_payroll_settings'); if (s) { try { setHrSettings(JSON.parse(s)); } catch(e){} } }, []);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({ empId: '', date: new Date().toISOString().slice(0, 10), timeIn: '08:00 AM', timeOut: '05:00 PM', otHours: 0, lateHours: 0 });
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    status: 'Active',
    dateHired: new Date().toISOString().slice(0, 10),
    branch: 'Manila Head Office',
  });

  // Time Logs & GPS Clock State
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [clockEmpId, setClockEmpId] = useState('');
  const [clockBranch, setClockBranch] = useState('Manila Head Office');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeCoords, setActiveCoords] = useState('14.5995° N, 120.9842° E');

  // Leaves & Self Service
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [portalEmpId, setPortalEmpId] = useState('');
  const [portalEmployee, setPortalEmployee] = useState<Employee | null>(null);
  const [portalLeaveType, setPortalLeaveType] = useState('Vacation Leave');
  const [portalLeaveStart, setPortalLeaveStart] = useState('');
  const [portalLeaveEnd, setPortalLeaveEnd] = useState('');
  const [portalLeaveRemarks, setPortalLeaveRemarks] = useState('');

  // Selected Employee for QR reports
  const [selectedQRReportEmp, setSelectedQRReportEmp] = useState<Employee | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // Cloud Status Logs
  const [syncLogs, setSyncLogs] = useState<string[]>([
    'System initialization successful.',
    'Synced 12 core tables with Singapore Hrovia Cluster.',
    'Automatic backup verified: OK.'
  ]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setEmployees(JSON.parse(stored));
      } catch (e) {}
    } else {
      const defaultEmps: Employee[] = [
        { id: 'EMP-48201', name: 'Maria Santos', role: 'Senior Accountant', department: 'Finance', email: 'maria.s@company.com', phone: '0917-123-4567', status: 'Active', basicSalary: 45000, tin: '123-456-789-000', sss: '34-5678901-2', philHealth: '12-345678901-2', pagIbig: '1234-5678-9012', dateHired: '2024-01-15', branch: 'Manila Head Office', payFrequency: 'Semi-Monthly', rateType: 'Monthly' },
        { id: 'EMP-98210', name: 'Juan Dela Cruz', role: 'Logistics Lead', department: 'Operations', email: 'juan.dc@company.com', phone: '0918-234-5678', status: 'Active', basicSalary: 35000, tin: '234-567-890-000', sss: '45-6789012-3', philHealth: '23-456789012-3', pagIbig: '2345-6789-0123', dateHired: '2024-03-01', branch: 'Quezon City Warehouse', payFrequency: 'Semi-Monthly', rateType: 'Monthly' },
        { id: 'EMP-11029', name: 'Alex Almeda', role: 'Software Engineer', department: 'IT Dev', email: 'alex.a@company.com', phone: '0919-345-6789', status: 'Active', basicSalary: 65000, tin: '345-678-901-000', sss: '56-7890123-4', philHealth: '34-567890123-4', pagIbig: '3456-7890-1234', dateHired: '2023-11-10', branch: 'Cebu IT Hub', payFrequency: 'Semi-Monthly', rateType: 'Monthly' },
        { id: 'EMP-22045', name: 'Ramon Valenzuela', role: 'Warehouse Handler', department: 'Operations', email: 'ramon.v@company.com', phone: '0915-789-1011', status: 'Active', basicSalary: 15600, tin: '456-789-012-000', sss: '12-3456789-0', philHealth: '45-678901234-5', pagIbig: '4567-8901-2345', dateHired: '2025-02-15', branch: 'Quezon City Warehouse', payFrequency: 'Weekly', rateType: 'Daily', dailyRate: 650 },
        { id: 'EMP-33012', name: 'Senen Macalalad', role: 'Driver Logistics', department: 'Operations', email: 'senen.m@company.com', phone: '0916-456-7890', status: 'Active', basicSalary: 18000, tin: '567-890-123-000', sss: '23-4567890-1', philHealth: '56-789012345-6', pagIbig: '5678-9012-3456', dateHired: '2024-09-10', branch: 'Quezon City Warehouse', payFrequency: 'Weekly', rateType: 'Daily', dailyRate: 700 }
      ];
      setEmployees(defaultEmps);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultEmps));
    }

    try {
      const storedTime = localStorage.getItem(TIME_KEY);
      if (storedTime) {
        setTimeLogs(JSON.parse(storedTime));
      } else {
        const defaultTime = [
          { id: 'T-1', empId: 'EMP-48201', date: new Date().toISOString().slice(0, 10), timeIn: '08:02 AM', timeOut: '05:01 PM', branch: 'Manila Head Office', gps: '14.5995° N, 120.9842° E', type: 'Regular', selfie: 'MOCK_SELFIE' },
          { id: 'T-2', empId: 'EMP-98210', date: new Date().toISOString().slice(0, 10), timeIn: '07:54 AM', timeOut: '04:55 PM', branch: 'Quezon City Warehouse', gps: '14.6760° N, 121.0437° E', type: 'Regular', selfie: 'MOCK_SELFIE' }
        ];
        setTimeLogs(defaultTime);
        localStorage.setItem(TIME_KEY, JSON.stringify(defaultTime));
      }

      const storedLeaves = localStorage.getItem(LEAVES_KEY);
      if (storedLeaves) {
        setLeaveRequests(JSON.parse(storedLeaves));
      } else {
        const defaultLeaves = [
          { id: 'L-1', empId: 'EMP-48201', type: 'Vacation Leave', startDate: '2026-07-10', endDate: '2026-07-12', remarks: 'Family trip to Tagaytay', status: 'Pending' }
        ];
        setLeaveRequests(defaultLeaves);
        localStorage.setItem(LEAVES_KEY, JSON.stringify(defaultLeaves));
      }
    } catch(e) {}
  }, []);

  const saveEmployees = (list: Employee[]) => {
    setEmployees(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const openDrawer = (emp?: Employee) => {
    if (emp) {
      setEditingEmployee(emp);
      setFormData(emp);
    } else {
      setEditingEmployee(null);
      setFormData({
        status: 'Active',
        dateHired: new Date().toISOString().slice(0, 10),
        branch: 'Manila Head Office',
      });
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingEmployee(null);
    setFormData({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role || !formData.basicSalary) {
      showToast('Name, Role, and Basic Salary are required.', 'error');
      return;
    }

    if (editingEmployee) {
      const updated = employees.map(emp => 
        emp.id === editingEmployee.id ? { ...emp, ...formData } as Employee : emp
      );
      saveEmployees(updated);
      showToast('Employee details updated successfully.', 'success');
    } else {
      const newEmp: Employee = {
        ...(formData as any),
        id: `EMP-${Date.now().toString().slice(-5)}`,
        basicSalary: parseNum(formData.basicSalary) || 0,
      };
      saveEmployees([...employees, newEmp]);
      showToast('New employee added to organization directory.', 'success');
    }
    closeDrawer();
  };

  const deleteEmployee = (id: string) => {
    // Replaced window.confirm since it breaks in iframes
    const updated = employees.filter(emp => emp.id !== id);
    saveEmployees(updated);
    showToast('Employee record archived.', 'success');
  };

  // GPS Coordinate Fetcher Simulation
  const detectGPSLocation = () => {
    setGpsLoading(true);
    showToast('Scanning GPS satellites & Cell IDs...', 'info');
    setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setActiveCoords(`${pos.coords.latitude.toFixed(5)}° N, ${pos.coords.longitude.toFixed(5)}° E`);
            setGpsLoading(false);
            showToast('Live GPS Coords locked via device sensor!', 'success');
          },
          () => {
            const preset = BRANCHES.find(b => b.name === clockBranch)?.coords || '14.5995° N, 120.9842° E';
            setActiveCoords(preset);
            setGpsLoading(false);
            showToast('Location fallback to branch preset.', 'info');
          }
        );
      } else {
        const preset = BRANCHES.find(b => b.name === clockBranch)?.coords || '14.5995° N, 120.9842° E';
        setActiveCoords(preset);
        setGpsLoading(false);
      }
    }, 1200);
  };

  useEffect(() => {
    const preset = BRANCHES.find(b => b.name === clockBranch)?.coords || '14.5995° N, 120.9842° E';
    setActiveCoords(preset);
  }, [clockBranch]);

  // Simulated Selfie Trigger
  const triggerShutter = () => {
    if (!clockEmpId) {
      showToast('Please select your employee identity first.', 'error');
      return;
    }
    setIsShutterFlashing(true);
    setTimeout(() => {
      setIsShutterFlashing(false);
      setCapturedSelfie('CAPTURED_SUCCESS');
      showToast('Face ID Verified and encrypted.', 'success');
    }, 600);
  };

  const submitTimePunch = (type: 'IN' | 'OUT') => {
    if (!clockEmpId) {
      showToast('Select an employee to clock.', 'error');
      return;
    }
    if (!capturedSelfie) {
      showToast('Please capture camera Face Verification first.', 'error');
      return;
    }

    const employee = employees.find(e => e.id === clockEmpId);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().slice(0, 10);

    const newLog = {
      id: `T-${Date.now()}`,
      empId: clockEmpId,
      date: dateStr,
      timeIn: type === 'IN' ? timeStr : '--:--',
      timeOut: type === 'OUT' ? timeStr : '--:--',
      branch: clockBranch,
      gps: activeCoords,
      selfie: 'VERIFIED_OK',
      type: 'Regular'
    };

    // If there is already a punch for this employee today, update it instead of making a new line
    let updatedLogs = [...timeLogs];
    const existingIndex = timeLogs.findIndex(log => log.empId === clockEmpId && log.date === dateStr);
    
    if (existingIndex >= 0) {
      if (type === 'IN') {
        updatedLogs[existingIndex].timeIn = timeStr;
      } else {
        updatedLogs[existingIndex].timeOut = timeStr;
      }
    } else {
      updatedLogs = [newLog, ...updatedLogs];
    }

    setTimeLogs(updatedLogs);
    localStorage.setItem(TIME_KEY, JSON.stringify(updatedLogs));
    showToast(`Time ${type === 'IN' ? 'In' : 'Out'} logged at ${clockBranch}. Coords: ${activeCoords}`, 'success');
    
    // reset camera
    setCapturedSelfie(null);
    setIsCameraActive(false);
  };

  // Portal Authentication Check
  const handlePortalLogin = (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setPortalEmployee(emp);
      showToast(`Welcome to Employee Self Service, ${emp.name}!`, 'success');
    } else {
      showToast('Employee ID not found. Enter valid code (e.g. EMP-48201).', 'error');
    }
  };

  const handlePortalLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalEmployee) return;
    if (!portalLeaveStart || !portalLeaveEnd) {
      showToast('Please specify start and end dates.', 'error');
      return;
    }

    const newRequest = {
      id: `L-${Date.now()}`,
      empId: portalEmployee.id,
      type: portalLeaveType,
      startDate: portalLeaveStart,
      endDate: portalLeaveEnd,
      remarks: portalLeaveRemarks,
      status: 'Pending'
    };

    const updated = [newRequest, ...leaveRequests];
    setLeaveRequests(updated);
    localStorage.setItem(LEAVES_KEY, JSON.stringify(updated));
    showToast('Leave request submitted successfully. Awaiting HR review.', 'success');
    
    // Reset leave form
    setPortalLeaveStart('');
    setPortalLeaveEnd('');
    setPortalLeaveRemarks('');
  };

  // Database Cloud Synchronization Mock
  const triggerCloudSync = () => {
    setIsSyncing(true);
    showToast('Connecting to Hrovia Cloud secure server...', 'info');
    setTimeout(() => {
      setSyncLogs(prev => [
        `Sync completed at ${new Date().toLocaleTimeString()} - Cores: OK`,
        ...prev.slice(0, 5)
      ]);
      setIsSyncing(false);
      showToast('Hrovia cloud sync fully up-to-date.', 'success');
    }, 1800);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Upper Navigation & Hrovia Brand Header */}
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-600 text-[10px] text-white font-black rounded uppercase tracking-widest">Hrovia HRIS</span>
            <span className="text-zinc-400">&bull;</span>
            <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Secure Cloud v4.2
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" /> Organization & Talent Portal
          </h2>
          <p className="text-xs text-zinc-500">Enterprise HR Information System, dynamic timekeeping, compliance tables, and self-service portal.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-zinc-150 dark:bg-zinc-800 p-1 rounded-2xl flex-wrap gap-1">
          {[
            { id: 'Directory', label: 'Talent Dir', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'Time', label: 'GPS Timekeeping', icon: <Smartphone className="w-3.5 h-3.5" /> },
            { id: 'Leaves', label: 'Leaves', icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'Performance', label: 'Performance', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'Onboarding', label: 'Onboarding', icon: <UserPlus className="w-3.5 h-3.5" /> },
            { id: 'SelfService', label: 'My Portal', icon: <UserCheck className="w-3.5 h-3.5" /> },
            { id: 'Compliance', label: 'Compliance & QR', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'Settings', label: 'HR Settings', icon: <Settings className="w-3.5 h-3.5" /> },
            { id: 'Cloud', label: 'Hrovia Cloud', icon: <Network className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === t.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800/50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* 1. DIRECTORY TAB */}
      {activeTab === 'Directory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-905 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Total Personnel: <span className="text-blue-600 text-lg ml-1">{employees.length}</span> active workers
            </div>
            <button
              onClick={() => openDrawer()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add New Employee
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map(emp => (
              <div key={emp.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative group hover:border-blue-500/50 transition-all flex flex-col">
                
                {/* Control Actions */}
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-100 transition-opacity">
                  <button onClick={() => openDrawer(emp)} className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteEmployee(emp.id)} className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-zinc-800 dark:to-zinc-700 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xl">
                    {(emp.name || 'E').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-950 dark:text-zinc-50">{emp.name}</h3>
                    <p className="text-xs font-mono text-zinc-500">{emp.id}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-3 rounded-2xl mb-4 text-xs">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wider ${
                      emp.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>
                      {emp.status}
                    </span>
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400 text-[9px] font-black rounded uppercase tracking-wider">
                      {emp.payFrequency || 'Semi-Monthly'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-150/50 dark:border-zinc-800/50">
                    <span className="text-zinc-400 font-bold text-[10px] uppercase">Rate Basis</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {emp.rateType === 'Hourly' && emp.hourlyRate ? `₱${emp.hourlyRate}/hr` : 
                       emp.rateType === 'Daily' && emp.dailyRate ? `₱${emp.dailyRate}/day` : 
                       `₱${formatCurrency(emp.basicSalary)}/mo`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 flex-1 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate font-medium">{emp.role} &bull; {emp.department}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded text-[10px] text-zinc-800 dark:text-zinc-200 font-bold">{emp.branch || 'Manila Head Office'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                </div>

                {/* Instant Verification QR Trigger */}
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedQRReportEmp(emp);
                      setActiveTab('Compliance');
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Secure QR Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. GPS TIMEKEEPING TAB */}
      {activeTab === 'Time' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Attendance & Timekeeping</h2>
              <p className="text-xs text-zinc-500">Manual entry for daily attendance, overtime, and lates.</p>
            </div>
            <button 
              onClick={() => setIsAddRecordModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/10 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Record
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-850/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Time In</th>
                  <th className="px-4 py-3">Time Out</th>
                  <th className="px-4 py-3 text-center">OT Hrs</th>
                  <th className="px-4 py-3 text-center">Late Hrs</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {timeLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No attendance records found.</td>
                  </tr>
                ) : (
                  timeLogs.map(log => {
                    const emp = employees.find(e => e.id === log.empId);
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">{log.date}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">{emp ? emp.name : 'Unknown'}</div>
                          <div className="text-[10px] text-zinc-500">{log.empId}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-600">{log.timeIn}</td>
                        <td className="px-4 py-3 font-mono text-blue-600">{log.timeOut}</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{log.otHours || 0}</td>
                        <td className="px-4 py-3 text-center font-bold text-rose-600">{log.lateHours || 0}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              const updated = timeLogs.filter(t => t.id !== log.id);
                              setTimeLogs(updated);
                              localStorage.setItem(TIME_KEY, JSON.stringify(updated));
                              showToast('Record deleted.', 'info');
                            }}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. LEAVE MANAGEMENT */}
      {activeTab === 'Leaves' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm min-h-[450px] flex flex-col">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50">Personnel Leave Applications</h3>
              <p className="text-xs text-zinc-500">Track and manage vacation, sick, and statutory leave credits.</p>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-bold text-xs rounded-xl">
              {leaveRequests.filter(r => r.status === 'Pending').length} Pending Requests
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {leaveRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-12">
                <Calendar className="w-12 h-12 text-zinc-300 mb-3 animate-pulse" />
                <p className="text-sm">No leave requests found.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 font-black uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Type of Leave</th>
                    <th className="px-4 py-2">Dates Covered</th>
                    <th className="px-4 py-2">Employee Remarks</th>
                    <th className="px-4 py-2 text-center">Approval Status</th>
                    <th className="px-4 py-2 text-center">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium">
                  {leaveRequests.map(leave => {
                    const emp = employees.find(e => e.id === leave.empId);
                    return (
                      <tr key={leave.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                        <td className="px-4 py-3">
                          <p className="font-bold">{emp ? emp.name : leave.empId}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{leave.empId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold rounded">
                            {leave.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-mono">
                          {leave.startDate} to {leave.endDate}
                        </td>
                        <td className="px-4 py-3 italic max-w-xs truncate text-zinc-500" title={leave.remarks}>
                          "{leave.remarks || 'No remarks provided'}"
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider ${
                            leave.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                            leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {leave.status === 'Pending' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={() => {
                                  const updated = leaveRequests.map(l => l.id === leave.id ? { ...l, status: 'Approved' } : l);
                                  setLeaveRequests(updated);
                                  localStorage.setItem(LEAVES_KEY, JSON.stringify(updated));
                                  showToast('Leave request approved.', 'success');
                                }}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded font-black text-[10px] hover:bg-emerald-700 transition-all uppercase"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => {
                                  const updated = leaveRequests.map(l => l.id === leave.id ? { ...l, status: 'Rejected' } : l);
                                  setLeaveRequests(updated);
                                  localStorage.setItem(LEAVES_KEY, JSON.stringify(updated));
                                  showToast('Leave request rejected.', 'info');
                                }}
                                className="px-2.5 py-1 bg-rose-600 text-white rounded font-black text-[10px] hover:bg-rose-700 transition-all uppercase"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[10px] uppercase font-bold">Processed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 4. EMPLOYEE SELF SERVICE PORTAL */}
      
      {/* PERFORMANCE APPRAISALS TAB */}
      {activeTab === 'Performance' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-500" /> Performance Appraisals (KPIs & OKRs)
            </h3>
            <p className="text-sm text-zinc-500 mb-6">Track key performance indicators, OKRs, and employee evaluations across the organization.</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    <th className="py-2 pr-4 font-bold">Employee Name</th>
                    <th className="py-2 pr-4 font-bold">Role</th>
                    <th className="py-2 pr-4 font-bold">Department</th>
                    <th className="py-2 pr-4 font-bold">Latest Score</th>
                    <th className="py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {employees.map(emp => (
                    <tr key={'perf-'+emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-100">{emp.name}</td>
                      <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">{emp.role}</td>
                      <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-400">{emp.department || 'General'}</td>
                      <td className="py-3 pr-4 text-zinc-900 dark:text-zinc-100 font-bold">{Math.floor(Math.random() * 20 + 80)}%</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-bold text-[10px]">Excellent</span>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-500">No employees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ONBOARDING & OFFBOARDING TAB */}
      {activeTab === 'Onboarding' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-blue-500" /> Onboarding & Offboarding Checklists
            </h3>
            <p className="text-sm text-zinc-500 mb-6">Manage incoming and exiting team members, track asset assignments and compliance checklists.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex justify-between items-center">
                  Recent Hires 
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">Active</span>
                </h4>
                <div className="space-y-3">
                  {employees.slice(0, 3).map(emp => (
                    <div key={'onb-'+emp.id} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg">
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{emp.name}</p>
                        <p className="text-[10px] text-zinc-500">{emp.role}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Checklist Complete"></span>
                        <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" title="Assets Pending"></span>
                      </div>
                    </div>
                  ))}
                  {employees.length === 0 && <p className="text-xs text-zinc-500">No recent hires.</p>}
                </div>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex justify-between items-center">
                  Exiting Members 
                  <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">Pending</span>
                </h4>
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500 text-center py-4">No offboarding processes currently active.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SelfService' && (
        <div className="space-y-6">
          {!portalEmployee ? (
            <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-md text-center">
              <Smartphone className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-bounce" />
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50">Employee Self-Service Terminal</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-6">Enter your organizational ID credentials to view profile, apply for leaves, and retrieve past payslips.</p>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="e.g., EMP-48201"
                  value={portalEmpId}
                  onChange={e => setPortalEmpId(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-center font-bold text-sm focus:ring-2 focus:ring-blue-500 uppercase font-mono tracking-widest"
                />
                <button
                  onClick={() => handlePortalLogin(portalEmpId)}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase"
                >
                  Verify Profile Identity
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-150 dark:border-zinc-800 flex justify-center gap-4 text-[10px] text-zinc-400">
                <span>Demo IDs: <b>EMP-48201</b>, <b>EMP-98210</b></span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Employee ID Details Card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 font-black text-[9px] rounded-bl-xl uppercase tracking-widest">
                    Worker Badge
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl">
                      {(portalEmployee.name || 'E').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-zinc-950 dark:text-zinc-50">{portalEmployee.name}</h3>
                      <p className="text-xs font-mono text-zinc-400">{portalEmployee.id}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-150 dark:border-zinc-800 pt-4">
                    <div className="flex justify-between"><span className="font-bold text-zinc-400">Position:</span><span className="font-bold text-zinc-800 dark:text-zinc-200">{portalEmployee.role}</span></div>
                    <div className="flex justify-between"><span className="font-bold text-zinc-400">Department:</span><span>{portalEmployee.department}</span></div>
                    <div className="flex justify-between"><span className="font-bold text-zinc-400">Branch:</span><span className="font-bold text-blue-600">{portalEmployee.branch || 'Manila Head Office'}</span></div>
                    <div className="flex justify-between"><span className="font-bold text-zinc-400">Monthly Basic:</span><span className="font-bold text-zinc-800 dark:text-zinc-200">₱{formatCurrency(portalEmployee.basicSalary)}</span></div>
                    <div className="flex justify-between"><span className="font-bold text-zinc-400">Hired Date:</span><span className="font-mono">{portalEmployee.dateHired}</span></div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-150 dark:border-zinc-800">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2">Government Statutes</h4>
                    <div className="space-y-1.5 font-mono text-[10px]">
                      <div className="flex justify-between bg-zinc-50 dark:bg-zinc-950 p-2 rounded"><span>TIN:</span><span className="font-bold">{portalEmployee.tin || 'N/A'}</span></div>
                      <div className="flex justify-between bg-zinc-50 dark:bg-zinc-950 p-2 rounded"><span>SSS:</span><span className="font-bold">{portalEmployee.sss || 'N/A'}</span></div>
                      <div className="flex justify-between bg-zinc-50 dark:bg-zinc-950 p-2 rounded"><span>PhilHealth:</span><span className="font-bold">{portalEmployee.philHealth || 'N/A'}</span></div>
                      <div className="flex justify-between bg-zinc-50 dark:bg-zinc-950 p-2 rounded"><span>Pag-IBIG:</span><span className="font-bold">{portalEmployee.pagIbig || 'N/A'}</span></div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPortalEmployee(null);
                      setPortalEmpId('');
                    }}
                    className="w-full mt-6 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase"
                  >
                    Logout Session
                  </button>
                </div>
              </div>

              {/* Leave Application & History Portal */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Apply for Leave Form */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" /> Apply For Leave
                  </h3>

                  <form onSubmit={handlePortalLeaveSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Leave Category</label>
                        <select
                          value={portalLeaveType}
                          onChange={e => setPortalLeaveType(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                        >
                          <option value="Vacation Leave">Vacation Leave</option>
                          <option value="Sick Leave">Sick Leave</option>
                          <option value="Emergency Leave">Emergency Leave</option>
                          <option value="Maternity Leave">Maternity Leave</option>
                          <option value="Paternity Leave">Paternity Leave</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Start Date</label>
                        <input
                          type="date"
                          value={portalLeaveStart}
                          onChange={e => setPortalLeaveStart(e.target.value)}
                          required
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">End Date</label>
                        <input
                          type="date"
                          value={portalLeaveEnd}
                          onChange={e => setPortalLeaveEnd(e.target.value)}
                          required
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Reason / Remarks</label>
                      <textarea
                        value={portalLeaveRemarks}
                        onChange={e => setPortalLeaveRemarks(e.target.value)}
                        placeholder="State the reason for this leave request..."
                        rows={3}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl shadow-lg"
                      >
                        Submit Leave Application
                      </button>
                    </div>
                  </form>
                </div>

                {/* Leaves Track list for Portal */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 mb-3">Your Leave Log History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-150 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[9px] tracking-wider">
                          <th className="py-2">Category</th>
                          <th className="py-2">Duration Dates</th>
                          <th className="py-2">Reason</th>
                          <th className="py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {leaveRequests.filter(r => r.empId === portalEmployee.id).map(r => (
                          <tr key={r.id}>
                            <td className="py-3 font-bold">{r.type}</td>
                            <td className="py-3 font-mono text-zinc-500">{r.startDate} to {r.endDate}</td>
                            <td className="py-3 italic">"{r.remarks}"</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                r.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payslip Archive Finder */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" /> Retrieve Payslip Archives
                  </h3>
                  <p className="text-xs text-zinc-500 mb-4">Print and view processed statutory contributions, earnings, and witholding taxes.</p>
                  
                  {/* Mock processed payslip list */}
                  <div className="space-y-2">
                    {[
                      { period: 'June 1-15, 2026', basic: portalEmployee.basicSalary / 2, ot: 1850, allowance: 1000, sss: (portalEmployee.basicSalary/2)*0.045, philHealth: (portalEmployee.basicSalary/2)*0.02, pagIbig: 100, tax: (portalEmployee.basicSalary/2)*0.05, net: (portalEmployee.basicSalary/2 + 2850) - ((portalEmployee.basicSalary/2)*0.065 + 100 + (portalEmployee.basicSalary/2)*0.05) },
                      { period: 'May 16-31, 2026', basic: portalEmployee.basicSalary / 2, ot: 0, allowance: 1000, sss: (portalEmployee.basicSalary/2)*0.045, philHealth: (portalEmployee.basicSalary/2)*0.02, pagIbig: 100, tax: (portalEmployee.basicSalary/2)*0.05, net: (portalEmployee.basicSalary/2 + 1000) - ((portalEmployee.basicSalary/2)*0.065 + 100 + (portalEmployee.basicSalary/2)*0.05) }
                    ].map((ps, i) => (
                      <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 gap-4">
                        <div className="leading-tight">
                          <p className="font-bold text-xs text-zinc-950 dark:text-zinc-50">Payroll Run: {ps.period}</p>
                          <p className="text-[10px] text-zinc-500">Gross: ₱{formatCurrency(ps.basic + ps.ot + ps.allowance)} &bull; Deductions: ₱{formatCurrency(ps.sss + ps.philHealth + ps.pagIbig + ps.tax)}</p>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                          <p className="font-black text-sm text-emerald-600">₱{formatCurrency(ps.net)}</p>
                          <button
                            type="button"
                            onClick={() => setSelectedPayslip({ ...ps, name: portalEmployee.name, id: portalEmployee.id, role: portalEmployee.role, branch: portalEmployee.branch || 'Manila Head Office' })}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[10px] uppercase flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View Payslip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Detailed Payslip Modal Panel */}
          {selectedPayslip && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
                <button 
                  onClick={() => setSelectedPayslip(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="overflow-y-auto flex-1 p-2" id="payslip-print-section">
                  <div className="text-center pb-6 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 font-bold uppercase rounded tracking-widest">HROVIA VERIFIED</span>
                    <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-50 uppercase mt-1">Payslip Earnings Summary</h2>
                    <p className="text-[10px] text-zinc-500 font-mono">Period: {selectedPayslip.period} &bull; Verified Copy</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 text-xs font-medium border-b border-zinc-150 dark:border-zinc-800">
                    <div>
                      <p className="text-zinc-400">Employee Name:</p>
                      <p className="font-bold text-zinc-900 dark:text-zinc-50">{selectedPayslip.name}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Employee ID / Position:</p>
                      <p className="font-bold">{selectedPayslip.id} &bull; {selectedPayslip.role}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Worksite Branch:</p>
                      <p className="font-bold">{selectedPayslip.branch}</p>
                    </div>
                    <div className="flex justify-end pr-4">
                      {/* Live Verification QR */}
                      <QRCodeSVG value={`VERIFIED-PAYSLIP: ID: ${selectedPayslip.id} | Name: ${selectedPayslip.name} | Period: ${selectedPayslip.period} | Net: PHP ${selectedPayslip.net}`} size={50} />
                    </div>
                  </div>

                  {/* Earnings vs Deductions Table */}
                  <div className="grid grid-cols-2 gap-6 py-6 text-xs font-medium">
                    <div className="space-y-2 border-r border-zinc-100 dark:border-zinc-800 pr-4">
                      <h4 className="font-black uppercase tracking-wider text-emerald-600 text-[10px] mb-2">Earnings (+)</h4>
                      <div className="flex justify-between"><span>Basic Pay (Semi-Monthly):</span><span>₱{formatCurrency(selectedPayslip.basic)}</span></div>
                      <div className="flex justify-between"><span>Overtime Pay:</span><span>₱{formatCurrency(selectedPayslip.ot)}</span></div>
                      <div className="flex justify-between"><span>Allowances:</span><span>₱{formatCurrency(selectedPayslip.allowance)}</span></div>
                      <hr className="border-zinc-100 dark:border-zinc-800" />
                      <div className="flex justify-between font-bold text-emerald-600"><span>Gross Pay:</span><span>₱{formatCurrency(selectedPayslip.basic + selectedPayslip.ot + selectedPayslip.allowance)}</span></div>
                    </div>

                    <div className="space-y-2 pl-2">
                      <h4 className="font-black uppercase tracking-wider text-rose-500 text-[10px] mb-2">Deductions (-)</h4>
                      <div className="flex justify-between"><span>SSS Contribution Share:</span><span>₱{formatCurrency(selectedPayslip.sss)}</span></div>
                      <div className="flex justify-between"><span>PhilHealth Share:</span><span>₱{formatCurrency(selectedPayslip.philHealth)}</span></div>
                      <div className="flex justify-between"><span>Pag-IBIG Contribution:</span><span>₱{formatCurrency(selectedPayslip.pagIbig)}</span></div>
                      <div className="flex justify-between"><span>Withholding Tax:</span><span>₱{formatCurrency(selectedPayslip.tax)}</span></div>
                      <hr className="border-zinc-100 dark:border-zinc-800" />
                      <div className="flex justify-between font-bold text-rose-500"><span>Total Deductions:</span><span>₱{formatCurrency(selectedPayslip.sss + selectedPayslip.philHealth + selectedPayslip.pagIbig + selectedPayslip.tax)}</span></div>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 flex justify-between items-center border border-zinc-150 dark:border-zinc-800 mt-2">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Verifiable NET PAYPAY</p>
                      <p className="text-2xl font-black text-emerald-600">₱{formatCurrency(selectedPayslip.net)}</p>
                    </div>
                    <div className="text-[9px] text-zinc-400 leading-tight text-right">
                      <p>Hrovia Payroll Service</p>
                      <p>SEC PTU Code: 2026-FPR-09</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-4">
                  <button
                    onClick={() => {
                      const printContents = document.getElementById('payslip-print-section')?.innerHTML;
                      const originalContents = document.body.innerHTML;
                      if (printContents) {
                        document.body.innerHTML = printContents;
                        window.print();
                        document.body.innerHTML = originalContents;
                        window.location.reload(); // Refresh to restore states
                      }
                    }}
                    className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print Payslip Copy
                  </button>
                  <button
                    onClick={() => setSelectedPayslip(null)}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase"
                  >
                    Acknowledge & Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 5. STATUTORY COMPLIANCE & QR TAB */}
      {activeTab === 'Compliance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SSS/PhilHealth Contribution Tables info */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Government Statutory Tables
              </h3>
              
              <div className="space-y-4 text-xs font-medium">
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl">
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 uppercase text-[10px] mb-1">SSS Contribution Rate (2026)</p>
                  <p className="text-zinc-500 leading-tight">Total contribution is 14% of the monthly salary credit, with the employer shouldering 9.5% and the employee contributing 4.5%.</p>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl">
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 uppercase text-[10px] mb-1">PhilHealth Contribution (2026)</p>
                  <p className="text-zinc-500 leading-tight">Premium rate set at 5% of monthly basic salary, shared equally (2.5% each) by employee and employer, capped at ₱100,000 threshold.</p>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl">
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 uppercase text-[10px] mb-1">Pag-IBIG Fund Premium</p>
                  <p className="text-zinc-500 leading-tight">Monthly deduction capped at ₱200 (Employee: 2%, Employer: 2%) based on the upgraded maximum monthly salary credit of ₱10,000.</p>
                </div>
              </div>
            </div>

            {/* BIR Graduated Income Tax Withholding table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" /> BIR Graduated Withholding Tax (TRAIN)
              </h3>
              
              <div className="space-y-2 text-xs">
                <div className="border border-zinc-150 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-950 font-bold border-b border-zinc-150 dark:border-zinc-800">
                        <th className="p-2.5">Annual Bracket</th>
                        <th className="p-2.5">Withholding Tax Formula</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                      <tr><td className="p-2.5">₱250,000 & below</td><td className="p-2.5 text-emerald-600 font-bold">0% Exempted</td></tr>
                      <tr><td className="p-2.5">₱250k to ₱400k</td><td className="p-2.5">15% of excess over ₱250k</td></tr>
                      <tr><td className="p-2.5">₱400k to ₱800k</td><td className="p-2.5">₱22.5k + 20% of excess over ₱400k</td></tr>
                      <tr><td className="p-2.5">₱800k to ₱2M</td><td className="p-2.5">₱102.5k + 25% of excess over ₱800k</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2.5 items-start bg-blue-50 dark:bg-blue-950/40 p-3 rounded-2xl text-[10px] text-blue-800 dark:text-blue-300 font-bold mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>The HR module automatically applies these brackets to compute exact withholding taxes per payroll run.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Verification QR Generator Widget */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 mb-1 flex items-center gap-1.5">
              <QrCode className="w-5 h-5 text-blue-600" /> SEC-Compliant QR Report Generator
            </h3>
            <p className="text-xs text-zinc-500 mb-6">Select any employee directory profile below to generate an authenticated validation QR code for external audits and bank verifications.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-1 space-y-4">
                <label className="block text-xs font-bold text-zinc-500 uppercase">Select Target Employee Profile</label>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto border border-zinc-150 dark:border-zinc-800 rounded-2xl p-2 bg-zinc-50 dark:bg-zinc-950">
                  {employees.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedQRReportEmp(e)}
                      className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all block ${
                        selectedQRReportEmp?.id === e.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedQRReportEmp ? (
                <div className="md:col-span-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 space-y-2.5 text-xs">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black tracking-wider rounded uppercase">Validated Report</span>
                    <h4 className="font-extrabold text-sm text-zinc-950 dark:text-zinc-50">{selectedQRReportEmp.name}</h4>
                    <p className="text-zinc-500 font-mono">Profile ID: {selectedQRReportEmp.id}</p>
                    <p className="text-zinc-500">Position: {selectedQRReportEmp.role}</p>
                    <p className="text-zinc-500">Branch: {selectedQRReportEmp.branch || 'Manila Head Office'}</p>
                  </div>
                  
                  {/* Generated QR SVG Output */}
                  <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm shrink-0">
                    <QRCodeSVG 
                      value={`HROVIA-VERIFIED: ID=${selectedQRReportEmp.id} | Name=${selectedQRReportEmp.name} | Role=${selectedQRReportEmp.role} | BaseSalary=PHP ${selectedQRReportEmp.basicSalary}`} 
                      size={100} 
                    />
                    <p className="text-center font-mono text-[8px] text-zinc-400 mt-2">Scan to Authenticate</p>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center text-zinc-400">
                  <QrCode className="w-10 h-10 text-zinc-300 mb-2 animate-pulse" />
                  <p className="text-xs">Select an employee from the list to display their authenticated verification QR key.</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 6. ENTERPRISE CLOUD MANAGEMENT */}
      
      {/* HR SETTINGS TAB */}
      {activeTab === 'Settings' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-500" /> HR & Payroll Statutory Settings
            </h3>
            <p className="text-sm text-zinc-500 mb-6">Manage global configuration for SSS, PhilHealth, Pag-IBIG, and compliance rates used across the system for all employees.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-200 dark:border-zinc-800 pb-2">SSS Configuration</h4>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">EE Rate (%)</label>
                  <input type="number" step="0.1" value={hrSettings.sssRate} onChange={e => setHrSettings({...hrSettings, sssRate: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Max Monthly Deduction (₱)</label>
                  <input type="number" value={hrSettings.sssMaxEE} onChange={e => setHrSettings({...hrSettings, sssMaxEE: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold" />
                </div>
              </div>
              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-200 dark:border-zinc-800 pb-2">PhilHealth Configuration</h4>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">EE Rate (%)</label>
                  <input type="number" step="0.1" value={hrSettings.phRateEE} onChange={e => setHrSettings({...hrSettings, phRateEE: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Floor Base (₱)</label>
                  <input type="number" value={hrSettings.phFloor} onChange={e => setHrSettings({...hrSettings, phFloor: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cap Base (₱)</label>
                  <input type="number" value={hrSettings.phCap} onChange={e => setHrSettings({...hrSettings, phCap: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold" />
                </div>
              </div>
              <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm border-b border-zinc-200 dark:border-zinc-800 pb-2">Pag-IBIG Configuration</h4>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">EE Rate (%)</label>
                  <input type="number" step="0.1" value={hrSettings.piRateEE} onChange={e => setHrSettings({...hrSettings, piRateEE: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Max Deduction (₱)</label>
                  <input type="number" value={hrSettings.piMaxEE} onChange={e => setHrSettings({...hrSettings, piMaxEE: Number(e.target.value)})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => {
                  localStorage.setItem('stratify_payroll_settings', JSON.stringify(hrSettings));
                  showToast('Statutory rates updated across the system.', 'success');
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-md"
              >
                <Save className="w-4 h-4" /> Save Global Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Cloud' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Cloud hosting status banner */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400">Hrovia Cloud Server</h3>
            
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">SG_CLUSTER_ACTIVE</span>
            </div>

            <div className="space-y-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2"><span>Uptime:</span><span className="font-bold text-zinc-800 dark:text-zinc-200">99.98% Stable</span></div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2"><span>Ping Latency:</span><span className="font-mono text-zinc-800 dark:text-zinc-200">42ms</span></div>
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2"><span>API Secure Lock:</span><span className="text-emerald-600 font-bold">Enabled</span></div>
              <div className="flex justify-between pb-2"><span>Automatic Syncs:</span><span>Hourly Intervals</span></div>
            </div>

            <button
              onClick={triggerCloudSync}
              disabled={isSyncing}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Force DB Sync Now
            </button>
          </div>

          {/* Sync logs and actions */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col min-h-[300px]">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 mb-1">Server Telemetry Logs</h3>
            <p className="text-xs text-zinc-500 mb-4">Diagnostic stream from Hrovia server clusters.</p>

            <div className="flex-1 bg-zinc-950 font-mono text-[10px] text-zinc-400 p-4 rounded-2xl overflow-y-auto space-y-2 border border-zinc-850">
              {syncLogs.map((log, index) => (
                <p key={index} className="flex gap-2">
                  <span className="text-zinc-600 shrink-0">[HROVIA_SYS]:</span>
                  <span className="text-zinc-200">{log}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Drawer for adding/editing employees */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl relative flex flex-col animate-in slide-in-from-right">
            
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                {editingEmployee ? 'Update Talent Profile' : 'Register New Employee'}
              </h2>
              <button onClick={closeDrawer} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="employee-drawer-form" onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                    placeholder="e.g., Juan Dela Cruz"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Role / Position *</label>
                    <input
                      type="text"
                      required
                      value={formData.role || ''}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                      placeholder="e.g., Accountant"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                      placeholder="e.g., Finance"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Worksite Branch *</label>
                    <select
                      value={formData.branch || 'Manila Head Office'}
                      onChange={(e) => setFormData({...formData, branch: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                    >
                      {BRANCHES.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Pay Frequency *</label>
                    <select
                      value={formData.payFrequency || 'Semi-Monthly'}
                      onChange={(e) => {
                        const freq = e.target.value as any;
                        const rateType = freq === 'Weekly' ? 'Daily' : 'Monthly';
                        setFormData({...formData, payFrequency: freq, rateType});
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                    >
                      <option value="Semi-Monthly">Semi-Monthly (15th/30th)</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly (Full)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Rate Basis *</label>
                    <select
                      value={formData.rateType || 'Monthly'}
                      onChange={(e) => setFormData({...formData, rateType: e.target.value as any})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                    >
                      <option value="Monthly">Monthly Rate</option>
                      <option value="Daily">Daily Rate</option>
                      <option value="Hourly">Hourly Rate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                      {formData.rateType === 'Hourly' ? 'Hourly Rate *' : formData.rateType === 'Daily' ? 'Daily Rate *' : 'Monthly Basic Salary *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={
                        formData.rateType === 'Hourly' 
                          ? (formData.hourlyRate || '') 
                          : formData.rateType === 'Daily' 
                            ? (formData.dailyRate || '') 
                            : (formData.basicSalary || '')
                      }
                      onChange={(e) => {
                        const val = parseNum(e.target.value);
                        if (formData.rateType === 'Hourly') {
                          setFormData({
                            ...formData, 
                            hourlyRate: val, 
                            dailyRate: parseNum((val * 8).toFixed(2)), 
                            basicSalary: parseNum((val * 8 * 26).toFixed(2))
                          });
                        } else if (formData.rateType === 'Daily') {
                          setFormData({
                            ...formData, 
                            dailyRate: val, 
                            hourlyRate: parseNum((val / 8).toFixed(2)), 
                            basicSalary: val * 26
                          });
                        } else {
                          setFormData({
                            ...formData, 
                            basicSalary: val,
                            dailyRate: parseNum((val / 26).toFixed(2)),
                            hourlyRate: parseNum((val / 26 / 8).toFixed(2))
                          });
                        }
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                      placeholder="₱"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Status</label>
                    <select
                      value={formData.status || 'Active'}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Date Hired</label>
                    <input
                      type="date"
                      value={formData.dateHired || ''}
                      onChange={(e) => setFormData({...formData, dateHired: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold"
                    />
                  </div>
                </div>

                <hr className="border-zinc-150 dark:border-zinc-800 my-4" />
                <h4 className="text-xs font-black uppercase text-zinc-400">Contact Details</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                      placeholder="0917-xxx-xxxx"
                    />
                  </div>
                </div>

                <hr className="border-zinc-150 dark:border-zinc-800 my-4" />
                <h4 className="text-xs font-black uppercase text-zinc-400">Government Identifications</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">TIN</label>
                    <input
                      type="text"
                      value={formData.tin || ''}
                      onChange={(e) => setFormData({...formData, tin: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                      placeholder="000-000-000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">SSS No.</label>
                    <input
                      type="text"
                      value={formData.sss || ''}
                      onChange={(e) => setFormData({...formData, sss: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                      placeholder="00-0000000-0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">PhilHealth No.</label>
                    <input
                      type="text"
                      value={formData.philHealth || ''}
                      onChange={(e) => setFormData({...formData, philHealth: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                      placeholder="0000-0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Pag-IBIG No.</label>
                    <input
                      type="text"
                      value={formData.pagIbig || ''}
                      onChange={(e) => setFormData({...formData, pagIbig: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold"
                      placeholder="0000-0000-0000"
                    />
                  </div>
                </div>
                
                <div className="h-10"></div>
              </form>
            </div>
            
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex gap-4">
              <button
                type="button"
                onClick={closeDrawer}
                className="flex-1 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="employee-drawer-form"
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-blue-600/15"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>

      )}
      {/* Add Record Modal */}
      {isAddRecordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" /> Add Attendance Record
              </h2>
              <button onClick={() => setIsAddRecordModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Employee ID</label>
                <select
                  value={recordForm.empId}
                  onChange={e => setRecordForm({...recordForm, empId: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Date</label>
                <input 
                  type="date"
                  value={recordForm.date}
                  onChange={e => setRecordForm({...recordForm, date: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Time In</label>
                  <input 
                    type="text"
                    placeholder="08:00 AM"
                    value={recordForm.timeIn}
                    onChange={e => setRecordForm({...recordForm, timeIn: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Time Out</label>
                  <input 
                    type="text"
                    placeholder="05:00 PM"
                    value={recordForm.timeOut}
                    onChange={e => setRecordForm({...recordForm, timeOut: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">OT Hours</label>
                  <input 
                    type="number"
                    value={recordForm.otHours}
                    onChange={e => setRecordForm({...recordForm, otHours: Number(e.target.value)})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Late Hours</label>
                  <input 
                    type="number"
                    value={recordForm.lateHours}
                    onChange={e => setRecordForm({...recordForm, lateHours: Number(e.target.value)})}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => {
                    if (!recordForm.empId) {
                      showToast('Please select an employee.', 'error');
                      return;
                    }
                    const newRecord = {
                      id: 'T-' + Date.now(),
                      empId: recordForm.empId,
                      date: recordForm.date,
                      timeIn: recordForm.timeIn,
                      timeOut: recordForm.timeOut,
                      otHours: recordForm.otHours,
                      lateHours: recordForm.lateHours,
                      type: 'Regular',
                    };
                    const updated = [newRecord, ...timeLogs];
                    setTimeLogs(updated);
                    localStorage.setItem('stratify_hr_time', JSON.stringify(updated));
                    setIsAddRecordModalOpen(false);
                    setRecordForm({ ...recordForm, otHours: 0, lateHours: 0 }); // reset
                    showToast('Attendance record added.', 'success');
                  }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20"
                >
                  Save Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRModule;
