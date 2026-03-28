import Image from "next/image";
import {
  Leaf,
  Recycle,
  PawPrint,
  Trees,
  Users,
  Sparkles,
} from "lucide-react";
import { normalizeEventCategory } from "@/components/events/eventMeta";

type EventVisualProps = {
  title: string;
  category?: string | null;
  categoryLabel?: string;
  imageUrl?: string | null;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

function getTitleInitials(title: string) {
  const words = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return "VH";
  }

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function getPlaceholderTheme(category: string | null | undefined) {
  switch (normalizeEventCategory(category)) {
    case "ecology":
      return {
        gradient: "from-emerald-500 via-teal-500 to-cyan-500",
        orb: "bg-emerald-200/50",
        iconWrap: "bg-white/14",
        Icon: Leaf,
      };
    case "recycling":
      return {
        gradient: "from-sky-500 via-teal-500 to-emerald-500",
        orb: "bg-sky-200/50",
        iconWrap: "bg-white/14",
        Icon: Recycle,
      };
    case "animals":
      return {
        gradient: "from-orange-400 via-amber-500 to-emerald-500",
        orb: "bg-amber-200/50",
        iconWrap: "bg-white/14",
        Icon: PawPrint,
      };
    case "forest":
      return {
        gradient: "from-lime-500 via-emerald-600 to-teal-700",
        orb: "bg-lime-200/50",
        iconWrap: "bg-white/12",
        Icon: Trees,
      };
    case "community":
      return {
        gradient: "from-violet-500 via-fuchsia-500 to-pink-500",
        orb: "bg-pink-200/50",
        iconWrap: "bg-white/14",
        Icon: Users,
      };
    case "other":
    default:
      return {
        gradient: "from-slate-700 via-slate-800 to-emerald-600",
        orb: "bg-emerald-200/40",
        iconWrap: "bg-white/12",
        Icon: Sparkles,
      };
  }
}

export default function EventVisual({
  title,
  category,
  categoryLabel,
  imageUrl,
  alt,
  sizes,
  priority = false,
  className = "",
}: EventVisualProps) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        className={className}
        alt={alt ?? title}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
      />
    );
  }

  const theme = getPlaceholderTheme(category);
  const initials = getTitleInitials(title);
  const Icon = theme.Icon;

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${theme.gradient} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(15,23,42,0.14)_100%)]" />
      <div className={`absolute -right-10 top-6 h-36 w-36 rounded-full blur-3xl ${theme.orb}`} />
      <div className="absolute -left-6 bottom-[-12px] text-[7.5rem] font-black italic tracking-[-0.12em] text-white/14 sm:text-[9rem]">
        {initials}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_45%,rgba(255,255,255,0.1)_46%,transparent_47%,transparent_100%)] opacity-70" />
      {categoryLabel ? (
        <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
          {categoryLabel}
        </div>
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/20 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-md ${theme.iconWrap}`}>
          <Icon className="h-11 w-11" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}
