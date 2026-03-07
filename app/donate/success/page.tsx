import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function DonationSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] px-4">
      <div className="max-w-xl w-full bg-white rounded-[34px] border border-gray-100 p-10 text-center shadow-xl">
        <CheckCircle2 className="w-16 h-16 mx-auto text-[#10b981] mb-5" />
        <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter mb-3">
          Спасибо за поддержку
        </h1>
        <p className="text-gray-500 font-bold mb-8">
          Платеж обработан. Ваша помощь идет на полезные инициативы.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-colors"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
