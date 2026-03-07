import Link from "next/link";
import { ArrowUpRight, Heart, Mail, MapPin, Phone } from "lucide-react";

const quickLinks = [
  { href: "/", label: "Главная" },
  { href: "/events", label: "События" },
  { href: "/donate", label: "Пожертвования" },
  { href: "/dashboard", label: "Кабинет" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 overflow-hidden bg-[linear-gradient(135deg,_#0f172a_0%,_#052e2b_45%,_#1d4ed8_100%)] text-white">
      <div className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-[#10b981] text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 group-hover:scale-105 transition-transform">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase italic">
                Volo<span className="text-[#34d399]">Hero</span>
              </span>
            </Link>

            <p className="mt-5 max-w-xl text-white/75 font-semibold leading-relaxed">
              Платформа волонтерских инициатив по Узбекистану: находим полезные события, объединяем людей
              и превращаем добрые идеи в реальные действия.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em]">
              <ArrowUpRight className="w-4 h-4" />
              Вместе делаем город лучше
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/60 mb-4">
              Навигация
            </p>
            <ul className="space-y-3">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="font-bold text-white/90 hover:text-[#86efac] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/60 mb-4">
              Контакты
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-white/85 font-bold">
                <MapPin className="w-4 h-4 mt-0.5 text-[#86efac]" />
                Ташкент, Узбекистан
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-[#86efac]" />
                <a href="mailto:support@volohero.uz" className="font-bold text-white/90 hover:text-[#86efac] transition-colors">
                  support@volohero.uz
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-[#86efac]" />
                <a href="tel:+998901234567" className="font-bold text-white/90 hover:text-[#86efac] transition-colors">
                  +998 90 123 45 67
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm font-bold text-white/70">
            © {year} VoloHero. Все права защищены.
          </p>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
            Volunteer Platform Uzbekistan
          </p>
        </div>
      </div>
    </footer>
  );
}
