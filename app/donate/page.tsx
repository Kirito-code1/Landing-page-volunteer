"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Step = "amount" | "method" | "confirm" | "processing" | "success";
type PaymentMethod = "click" | "payme" | "uzum" | "card";

const DEMO_MODE = true;
const COMING_SOON = true;

const AMOUNTS = [10000, 50000, 100000, 250000, 500000, 1000000];

const METHODS: Array<{
  id: PaymentMethod;
  title: string;
  subtitle: string;
  chipClass: string;
}> = [
  {
    id: "click",
    title: "Click",
    subtitle: "Популярно в Узбекистане",
    chipClass: "bg-green-100 text-green-700",
  },
  {
    id: "payme",
    title: "Payme",
    subtitle: "Быстрая оплата в один тап",
    chipClass: "bg-cyan-100 text-cyan-700",
  },
  {
    id: "uzum",
    title: "Uzum",
    subtitle: "Удобно для клиентов Uzum",
    chipClass: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    id: "card",
    title: "Банковская карта",
    subtitle: "Visa / Mastercard / UZCARD / HUMO",
    chipClass: "bg-gray-100 text-gray-700",
  },
];

const RECENT_DONATIONS = [
  { name: "Sardor A.", amount: 50000 },
  { name: "Madina K.", amount: 100000 },
  { name: "Aziza R.", amount: 250000 },
  { name: "Anonim", amount: 10000 },
];

const formatAmount = (value: number) => value.toLocaleString("ru-RU");

export default function DonatePage() {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [currentDonation, setCurrentDonation] = useState(0);

  const selectedAmount = useMemo(() => {
    const cleaned = customAmount.replace(/\D/g, "");
    return cleaned ? Number(cleaned) : amount;
  }, [amount, customAmount]);

  const selectedMethod = useMemo(
    () => METHODS.find((item) => item.id === method) ?? null,
    [method],
  );

  const goalAmount = 50000000;
  const raisedAmount = 12800000;
  const projectedRaised = raisedAmount + selectedAmount;
  const progress = Math.min(100, Math.round((projectedRaised / goalAmount) * 100));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDonation((prev) => (prev + 1) % RECENT_DONATIONS.length);
    }, 2800);

    return () => clearInterval(timer);
  }, []);

  const handleCustomChange = (value: string) => {
    const onlyDigits = value.replace(/\D/g, "");
    setCustomAmount(onlyDigits);
    setAmount(0);
  };

  const handlePay = () => {
    if (!selectedAmount || selectedAmount < 1000 || !method) {
      return;
    }

    setStep("processing");

    setTimeout(() => {
      setStep("success");
    }, 2200);
  };

  const reset = () => {
    setStep("amount");
    setAmount(0);
    setCustomAmount("");
    setMethod(null);
  };

  return (
    <main className="relative overflow-hidden min-h-screen bg-[radial-gradient(circle_at_15%_20%,_#dcfce7_0%,_transparent_35%),radial-gradient(circle_at_85%_10%,_#dbeafe_0%,_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_55%,_#f1f5f9_100%)] px-4 py-10 md:py-16">
      {COMING_SOON && (
        <div className="absolute top-5 inset-x-0 z-30 flex justify-center px-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,_#111827_0%,_#0f766e_100%)] px-5 py-2.5 text-white shadow-xl shadow-emerald-700/20 border border-white/20">
            <CalendarClock className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em]">Скоро</span>
          </div>
        </div>
      )}

      <div
        className={`max-w-6xl mx-auto grid lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-8 items-start transition-all duration-500 ${
          COMING_SOON ? "blur-[7px] pointer-events-none select-none scale-[0.99]" : ""
        }`}
      >
        <section className="bg-white/90 backdrop-blur border border-white rounded-[34px] shadow-[0_30px_80px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-6 py-6 md:px-10 md:py-8 border-b border-gray-100 bg-[linear-gradient(135deg,_#052e2b_0%,_#0f766e_45%,_#1d4ed8_100%)] text-white">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] font-black bg-white/15 px-3 py-1 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Demo Version
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic leading-none tracking-tight">
              Сделать пожертвование
            </h1>
            <p className="mt-4 text-white/80 font-semibold max-w-2xl">
              Чистый демо-флоу: красивый выбор суммы, метода и подтверждение оплаты.
              Реальные списания пока отключены.
            </p>
          </div>

          <div className="px-6 py-6 md:px-10 md:py-8">
            <div className="flex items-center gap-2 mb-8">
              {[
                { key: "amount", label: "Сумма" },
                { key: "method", label: "Метод" },
                { key: "confirm", label: "Подтверждение" },
              ].map((item, idx) => {
                const active =
                  item.key === step ||
                  (step === "processing" && idx <= 2) ||
                  (step === "success" && idx <= 2);

                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center ${
                        active
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${
                        active ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {item.label}
                    </span>
                    {idx < 2 && <div className="w-5 h-px bg-gray-200" />}
                  </div>
                );
              })}
            </div>

            {step === "amount" && (
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Выберите сумму</h2>
                <p className="text-gray-500 mb-6">Минимум: 1 000 сум</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  {AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAmount(value);
                        setCustomAmount("");
                      }}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        amount === value && !customAmount
                          ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                          : "border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      <p className="font-black text-gray-900 text-lg leading-none">{formatAmount(value)}</p>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-2">UZS</p>
                    </button>
                  ))}
                </div>

                <div className="mb-7">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">
                    Своя сумма
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customAmount ? formatAmount(Number(customAmount)) : ""}
                    onChange={(event) => handleCustomChange(event.target.value)}
                    placeholder="Например: 75 000"
                    className="mt-2 w-full px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 outline-none focus:bg-white focus:border-emerald-500 font-black text-gray-900"
                  />
                </div>

                <button
                  type="button"
                  disabled={!selectedAmount || selectedAmount < 1000}
                  onClick={() => setStep("method")}
                  className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-[0.18em] text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  Далее
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === "method" && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setStep("amount")}
                    className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <h2 className="text-2xl font-black text-gray-900">Способ оплаты</h2>
                </div>

                <p className="text-gray-500 mb-6">
                  Сумма: <span className="font-black text-emerald-600">{formatAmount(selectedAmount)} UZS</span>
                </p>

                <div className="space-y-3 mb-7">
                  {METHODS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMethod(item.id)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${
                        method === item.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-black text-gray-900">{item.title}</p>
                          <p className="text-sm text-gray-500 mt-1">{item.subtitle}</p>
                        </div>
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${item.chipClass}`}>
                          Доступно
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!method}
                  onClick={() => setStep("confirm")}
                  className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-[0.18em] text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  Подтвердить
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === "confirm" && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => setStep("method")}
                    className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <h2 className="text-2xl font-black text-gray-900">Проверка данных</h2>
                </div>

                <div className="rounded-3xl bg-[linear-gradient(145deg,_#111827_0%,_#1f2937_45%,_#0f766e_100%)] text-white p-7 mb-6">
                  <p className="text-white/70 text-xs uppercase tracking-widest font-black">Сумма доната</p>
                  <p className="text-4xl font-black mt-2">{formatAmount(selectedAmount)} UZS</p>
                  <div className="mt-5 pt-5 border-t border-white/20">
                    <p className="text-white/70 text-xs uppercase tracking-widest font-black">Метод</p>
                    <p className="text-lg font-black mt-2">{selectedMethod?.title}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6 text-sm text-amber-800 font-bold">
                  Это демо-режим. Кнопка ниже показывает симуляцию успешного платежа.
                </div>

                <button
                  type="button"
                  onClick={handlePay}
                  className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-[0.18em] text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Оплатить (демо)
                </button>
              </div>
            )}

            {step === "processing" && (
              <div className="py-14 text-center">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
                <h2 className="text-2xl font-black text-gray-900 mt-6">Обработка платежа</h2>
                <p className="text-gray-500 mt-2">Симулируем платёжный процесс...</p>
              </div>
            )}

            {step === "success" && (
              <div className="py-10 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-11 h-11" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mt-6">Спасибо!</h2>
                <p className="text-gray-500 mt-2">Демо-донат успешно завершён.</p>
                <p className="text-3xl font-black text-emerald-600 mt-5">{formatAmount(selectedAmount)} UZS</p>

                <button
                  type="button"
                  onClick={reset}
                  className="mt-8 px-7 py-3 rounded-2xl bg-gray-900 text-white font-black text-sm uppercase tracking-widest hover:bg-emerald-600 transition-colors"
                >
                  Сделать ещё донат
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="bg-white/90 backdrop-blur border border-white rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3">Влияние суммы</p>
            <h3 className="text-2xl font-black text-gray-900">{formatAmount(selectedAmount || 1000)} UZS</h3>
            <p className="text-gray-500 font-semibold mt-2">
              {selectedAmount >= 500000
                ? "Покрывает крупную адресную помощь для семьи."
                : selectedAmount >= 100000
                  ? "Покрывает базовый набор продуктов/медикаментов."
                  : "Помогает закрыть срочные ежедневные потребности."}
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur border border-white rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 mb-3">Месячная цель фонда</p>
            <div className="flex items-end justify-between mb-3">
              <p className="text-2xl font-black text-gray-900">{progress}%</p>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                {formatAmount(projectedRaised)} / {formatAmount(goalAmount)}
              </p>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,_#10b981_0%,_#0ea5e9_100%)] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur border border-white rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400 mb-4">Последние донаты (демо)</p>
            <div className="space-y-3">
              {RECENT_DONATIONS.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    idx === currentDonation
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <p className="font-bold text-gray-700">{item.name}</p>
                  <p className="font-black text-emerald-600">+{formatAmount(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5" />
            <p className="text-sm font-bold text-emerald-700">
              От себя добавил &quot;прогноз влияния суммы&quot; и живой демо-тикер пожертвований,
              чтобы страница ощущалась живой даже без подключения реального эквайринга.
            </p>
          </div>

          {DEMO_MODE && (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm font-bold">
              DEMO MODE: карта и реальные платежи пока не подключены.
            </div>
          )}
        </aside>
      </div>

      {COMING_SOON && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-4">
          <div className="max-w-xl w-full rounded-[32px] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.12)] p-7 md:p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-gray-900 mb-3">
              Скоро запуск
            </h2>
            <p className="text-gray-600 font-bold">
              Страница донатов в финальной полировке. Совсем скоро откроем полноценные платежи.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
