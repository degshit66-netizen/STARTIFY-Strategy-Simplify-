import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, X, LayoutDashboard, CreditCard, ShoppingCart, UsersRound, FileSpreadsheet } from 'lucide-react';
import type { ActiveTab } from '../App';

interface FeatureTourProps {
  onComplete: () => void;
  onTabChange: (tab: ActiveTab) => void;
}

const steps: { title: string; description: string; tab: ActiveTab; icon: React.ReactNode }[] = [
  {
    title: 'Welcome to STRATIFY (System+Strategy)!',
    description: 'I am your AI Assistant. I will guide you through the system modules. Let\'s get started!',
    tab: 'Dashboard',
    icon: <Sparkles className="w-6 h-6" />
  },
  {
    title: 'Core Accounting',
    description: 'Manage your Journal Ledger, Chart of Accounts, and perform reconciliations in real-time.',
    tab: 'Ledger',
    icon: <FileSpreadsheet className="w-6 h-6" />
  },
  {
    title: 'E-Commerce & POS',
    description: 'Handle your digital storefront, manage products, and process point-of-sale transactions effortlessly.',
    tab: 'Ecommerce',
    icon: <ShoppingCart className="w-6 h-6" />
  },
  {
    title: 'Payroll Management',
    description: 'Automate salary computations, manage loans, and generate detailed payslips for your team.',
    tab: 'Payroll',
    icon: <CreditCard className="w-6 h-6" />
  },
  {
    title: 'Human Resources',
    description: 'Keep track of employee records, leaves, timekeeping, and offboarding workflows securely.',
    tab: 'HR',
    icon: <UsersRound className="w-6 h-6" />
  },
  {
    title: 'Ready to Go!',
    description: 'You can always access your settings and company profile from the top right menu. Start exploring!',
    tab: 'Dashboard',
    icon: <LayoutDashboard className="w-6 h-6" />
  }
];

export const FeatureTour: React.FC<FeatureTourProps> = ({ onComplete, onTabChange }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const savedStep = localStorage.getItem('feature_tour_progress');
    if (savedStep) {
      const step = parseInt(savedStep, 10);
      if (step < steps.length) {
        setCurrentStep(step);
        onTabChange(steps[step].tab);
      }
    } else {
      onTabChange(steps[0].tab);
    }
  }, []);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      localStorage.setItem('feature_tour_progress', next.toString());
      onTabChange(steps[next].tab);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.removeItem('feature_tour_progress');
    onComplete();
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex items-end justify-end p-4 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.05, y: 20 }}
          className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 pointer-events-auto"
        >
          <div className="p-6 relative">
            <button 
              onClick={handleComplete}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              {steps[currentStep].icon}
            </div>
            
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed min-h-[60px]">
              {steps[currentStep].description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-indigo-600' : 'w-2 bg-zinc-200 dark:bg-zinc-800'}`}
                  />
                ))}
              </div>
              <button 
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg"
              >
                {currentStep === steps.length - 1 ? 'Finish Tour' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
