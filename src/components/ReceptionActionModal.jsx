import React from 'react';
import { X, Package, FileText, Plus } from 'lucide-react';

export default function ReceptionActionModal({ isOpen, onClose, onCreateReception, onSelectProducts }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
        <div className="bg-white w-full max-w-md rounded-t-3xl max-h-[60vh] overflow-y-auto animate-slide-up">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Приемка товаров</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-4 space-y-3">
            {/* Создать новую приемку */}
            <button
              onClick={() => {
                onCreateReception();
                onClose();
              }}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <FileText size={28} className="text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-lg font-semibold text-gray-900">Создать приемку</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Создать новый документ приемки товаров
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
