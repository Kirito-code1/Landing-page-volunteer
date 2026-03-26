"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Info, OctagonAlert } from "lucide-react";

export type AlertTone = "error" | "warning" | "success" | "info";

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  tone?: AlertTone;
  closeLabel?: string;
  onClose: () => void;
}

const toneStyles: Record<AlertTone, { icon: React.ComponentType<{ className?: string }>; box: string; iconColor: string; button: string }> = {
  error: {
    icon: AlertCircle,
    box: "bg-red-50 border border-red-100",
    iconColor: "text-red-500",
    button: "bg-red-500 hover:bg-red-600",
  },
  warning: {
    icon: OctagonAlert,
    box: "bg-amber-50 border border-amber-100",
    iconColor: "text-amber-500",
    button: "bg-amber-500 hover:bg-amber-600",
  },
  success: {
    icon: CheckCircle2,
    box: "bg-emerald-50 border border-emerald-100",
    iconColor: "text-emerald-500",
    button: "bg-emerald-500 hover:bg-emerald-600",
  },
  info: {
    icon: Info,
    box: "bg-sky-50 border border-sky-100",
    iconColor: "text-sky-500",
    button: "bg-gray-900 hover:bg-black",
  },
};

export default function AlertModal({
  isOpen,
  title,
  message,
  tone = "info",
  closeLabel = "OK",
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null;

  const style = toneStyles[tone];
  const Icon = style.icon;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-[430px] rounded-[34px] bg-white p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center ${style.box}`}>
          <Icon className={`w-9 h-9 ${style.iconColor}`} />
        </div>
        <h3 className="text-center text-2xl font-black text-gray-900 tracking-tight">{title}</h3>
        <p className="text-center text-gray-500 font-semibold mt-3 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className={`mt-7 w-full py-4 text-white rounded-2xl font-black uppercase tracking-wider text-[11px] transition-colors ${style.button}`}
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
