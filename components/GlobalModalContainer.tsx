'use client';

import React, { useEffect } from 'react';
import { useModalStore } from '@/store/modalStore';
import { AlertTriangle, CheckCircle2, Info, HelpCircle } from 'lucide-react';

export default function GlobalModalContainer() {
  const { isOpen, options, closeModal } = useModalStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        closeModal(false);
      } else if (e.key === 'Enter' && options.isAlert) {
        closeModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, options.isAlert, closeModal]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (options.type) {
      case 'danger':
        return <AlertTriangle className="w-12 h-12 text-[#A65353] animate-pulse" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="w-12 h-12 text-green-500" />;
      case 'info':
      default:
        return options.isAlert ? <Info className="w-12 h-12 text-cyan-600" /> : <HelpCircle className="w-12 h-12 text-[#A65353]" />;
    }
  };

  const getHeaderColor = () => {
    switch (options.type) {
      case 'danger':
        return 'text-[#A65353]';
      case 'warning':
        return 'text-amber-700';
      case 'success':
        return 'text-green-700';
      case 'info':
      default:
        return 'text-[#A65353]';
    }
  };

  const getConfirmBtnColor = () => {
    switch (options.type) {
      case 'danger':
        return 'bg-[#A65353] hover:bg-[#8B4545] focus:ring-[#A65353]';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-400';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-400';
      case 'info':
      default:
        return 'bg-[#A65353] hover:bg-[#8B4545] focus:ring-[#A65353]';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 transform transition-all duration-300 scale-100 border border-gray-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative header border */}
        <div className={`absolute top-0 left-0 right-0 h-2 ${
          options.type === 'danger' ? 'bg-[#A65353]' :
          options.type === 'warning' ? 'bg-amber-500' :
          options.type === 'success' ? 'bg-green-500' : 'bg-[#A65353]'
        }`} />

        <div className="flex flex-col items-center text-center mt-2">
          <div className="p-3 bg-gray-50 rounded-full mb-4 shadow-inner">
            {getIcon()}
          </div>
          
          <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${getHeaderColor()}`}>
            {options.title}
          </h3>
          
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-8 px-2">
            {options.message}
          </p>

          <div className="flex items-center justify-center gap-3 w-full">
            {!options.isAlert && (
              <button
                type="button"
                onClick={() => closeModal(false)}
                className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 cursor-pointer text-sm sm:text-base"
              >
                {options.cancelText || 'Cancel'}
              </button>
            )}
            
            <button
              type="button"
              onClick={() => closeModal(true)}
              className={`flex-1 px-5 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm sm:text-base ${getConfirmBtnColor()}`}
            >
              {options.confirmText || (options.isAlert ? 'OK' : 'Confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
