"use client";

import { TriangleAlert } from "lucide-react";

export type AnimatedStatusState =
  | "loading"
  | "paid"
  | "pending"
  | "failed"
  | "cancelled"
  | "missing";

type Tone = "emerald" | "amber";

const toneClasses: Record<
  Tone,
  {
    glow: string;
    softRing: string;
    spinner: string;
    dot: string;
    stroke: string;
    error: string;
    errorBg: string;
  }
> = {
  emerald: {
    glow: "bg-emerald-100",
    softRing: "border-emerald-100",
    spinner: "border-t-emerald-500 border-r-emerald-400",
    dot: "bg-emerald-500",
    stroke: "text-emerald-500",
    error: "text-amber-500",
    errorBg: "bg-amber-50",
  },
  amber: {
    glow: "bg-amber-100",
    softRing: "border-amber-100",
    spinner: "border-t-amber-500 border-r-amber-400",
    dot: "bg-amber-500",
    stroke: "text-amber-500",
    error: "text-amber-500",
    errorBg: "bg-amber-50",
  },
};

export default function AnimatedStatusIndicator({
  status,
  tone = "emerald",
}: {
  status: AnimatedStatusState;
  tone?: Tone;
}) {
  const palette = toneClasses[tone];

  if (status === "loading" || status === "pending") {
    return (
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className={`absolute inset-0 rounded-full ${palette.glow} opacity-70 blur-sm animate-pulse`} />
        <div className={`absolute inset-[10px] rounded-full border ${palette.softRing} bg-white`} />
        <div className={`absolute inset-[10px] rounded-full border-[5px] border-transparent ${palette.spinner} animate-spin`} />
        <div className={`relative h-4 w-4 rounded-full ${palette.dot} shadow-[0_0_20px_rgba(15,23,42,0.08)] animate-pulse`} />
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className={`absolute inset-0 rounded-full ${palette.glow} animate-pulse`} />
        <div className={`absolute inset-[8px] rounded-full border ${palette.softRing} bg-white`} />
        <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-100" />
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            className={palette.stroke}
            strokeDasharray="188.5"
            strokeDashoffset="188.5"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="188.5"
              to="0"
              dur="0.72s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.22 1 0.36 1"
              keyTimes="0;1"
            />
          </circle>
        </svg>
        <svg viewBox="0 0 24 24" className={`relative h-10 w-10 ${palette.stroke}`}>
          <path
            d="M6.5 12.5L10.2 16.2L17.5 8.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="18"
            strokeDashoffset="18"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="18"
              to="0"
              begin="0.3s"
              dur="0.42s"
              fill="freeze"
            />
          </path>
        </svg>
      </div>
    );
  }

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <div className={`absolute inset-0 rounded-full ${palette.errorBg}`} />
      <div className="absolute inset-[8px] rounded-full border border-amber-100 bg-white" />
      <TriangleAlert className={`relative h-11 w-11 ${palette.error}`} />
    </div>
  );
}
