import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const bgClass = 
    toast.type === 'error' ? 'bg-red-500/10 border-red-500/20' : 
    toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : 
    'bg-blue-500/10 border-blue-500/20';

  const iconColor = 
    toast.type === 'error' ? 'text-red-500' : 
    toast.type === 'success' ? 'text-emerald-500' : 
    'text-blue-500';

  return (
    <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border ${bgClass} backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-5 duration-300 mb-3`}>
      <div className="p-4 flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 ${iconColor}`}>
          {toast.type === 'error' && <AlertCircle size={20} />}
          {toast.type === 'success' && <CheckCircle2 size={20} />}
          {toast.type === 'info' && <Info size={20} />}
        </div>
        <div className="flex-1 pt-0.5">
          <h3 className={`text-sm font-bold ${iconColor} mb-1`}>{toast.title}</h3>
          <p className="text-xs text-white/80 leading-relaxed font-medium">{toast.message}</p>
        </div>
        <button 
          onClick={() => onClose(toast.id)}
          className="shrink-0 text-white/40 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      {/* Progress Line */}
      <div className="h-0.5 w-full bg-white/5">
         <div 
           className={`h-full ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`}
           style={{ animation: 'shrink 5s linear forwards' }} 
         />
      </div>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[], removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col items-end pointer-events-none gap-2">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onClose={removeToast} />
      ))}
    </div>
  );
};
