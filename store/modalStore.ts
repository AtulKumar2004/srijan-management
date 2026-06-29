import { create } from 'zustand';

export interface ModalOptions {
  title?: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  isAlert?: boolean;
}

interface ModalState {
  isOpen: boolean;
  options: ModalOptions;
  resolvePromise: ((value: boolean) => void) | null;
  showConfirm: (options: string | ModalOptions) => Promise<boolean>;
  showAlert: (options: string | ModalOptions) => Promise<boolean>;
  closeModal: (result: boolean) => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
  isOpen: false,
  options: { message: '' },
  resolvePromise: null,

  showConfirm: (options) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options: {
          title: opts.title || 'Please Confirm',
          message: opts.message,
          type: opts.type || 'danger',
          confirmText: opts.confirmText || 'Confirm',
          cancelText: opts.cancelText || 'Cancel',
          isAlert: false,
        },
        resolvePromise: resolve,
      });
    });
  },

  showAlert: (options) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options: {
          title: opts.title || 'Notice',
          message: opts.message,
          type: opts.type || 'info',
          confirmText: opts.confirmText || 'OK',
          isAlert: true,
        },
        resolvePromise: resolve,
      });
    });
  },

  closeModal: (result) => {
    const { resolvePromise } = get();
    if (resolvePromise) {
      resolvePromise(result);
    }
    set({ isOpen: false, resolvePromise: null });
  },
}));
