import Link from "next/link";
import { CircleAlert } from "lucide-react";

export default function DonationCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] px-4">
      <div className="max-w-xl w-full bg-white rounded-[34px] border border-gray-100 p-10 text-center shadow-xl">
        <CircleAlert className="w-16 h-16 mx-auto text-amber-500 mb-5" />
        <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter mb-3">
          Платеж отменен
        </h1>
        <p className="text-gray-500 font-bold mb-8">
          Вы можете вернуться и попробовать снова в любое время.
        </p>
        <Link
          href="/donate"
          className="inline-flex items-center justify-center px-8 py-4 bg-[#10b981] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#0da975] transition-colors"
        >
          Вернуться к оплате
        </Link>
      </div>
    </div>
  );
}
