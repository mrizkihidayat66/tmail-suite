"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { ConfirmModal, type ConfirmVariant } from "@/components/ui/confirm-modal";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmModalContext = createContext<ConfirmFn | null>(null);

export function useConfirmModal(): ConfirmFn {
  const ctx = useContext(ConfirmModalContext);
  if (!ctx) {
    throw new Error("useConfirmModal must be used within <ConfirmModalProvider>");
  }
  return ctx;
}

interface ModalState extends ConfirmOptions {
  open: boolean;
}

export function ConfirmModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>({
    open: false,
    title: "",
    description: "",
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setModal({ ...options, open: true });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setModal((prev) => ({ ...prev, open: false }));
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setModal((prev) => ({ ...prev, open: false }));
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmModalContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        open={modal.open}
        title={modal.title}
        description={modal.description}
        confirmLabel={modal.confirmLabel}
        cancelLabel={modal.cancelLabel}
        variant={modal.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmModalContext.Provider>
  );
}
