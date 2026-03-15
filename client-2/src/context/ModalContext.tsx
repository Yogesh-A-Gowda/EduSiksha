import React, { createContext, useContext, useState } from 'react';

type ModalType = 'success' | 'error' | 'confirm';

interface ModalOptions {
  type?: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalOptions | null>(null);

  const showModal = (options: ModalOptions) => setModal(options);
  const closeModal = () => setModal(null);

  return (
    <ModalContext.Provider value={{ showModal, closeModal }}>
      {children}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 transform transition-all scale-100">
            <h3 className={`text-xl font-bold mb-2 ${
              modal.type === 'error' ? 'text-red-600' : 
              modal.type === 'success' ? 'text-green-600' : 'text-slate-800'
            }`}>
              {modal.title}
            </h3>
            <p className="text-slate-600 mb-6 leading-relaxed">{modal.message}</p>
            
            <div className="flex justify-end gap-3">
              {modal.type === 'confirm' && (
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-500 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  closeModal();
                }}
                className={`px-4 py-2 text-white font-bold rounded-lg transition-transform active:scale-95 ${
                  modal.type === 'error' ? 'bg-red-500 hover:bg-red-600' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {modal.confirmText || 'Okay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
};