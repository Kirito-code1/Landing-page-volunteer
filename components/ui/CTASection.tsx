export function CTASection() {
  return (
    <section className="py-20 bg-[#10b981] flex justify-center px-4">
      <div className="max-w-4xl w-full text-center flex flex-col items-center gap-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Готовы начать делать добро?
          </h2>
          <p className="text-white/90 text-lg md:text-xl font-medium">
            Присоединяйтесь к тысячам волонтёров по всей России
          </p>
        </div>

        <button className="bg-white text-gray-900 px-10 py-4 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-gray-50 transition-colors shadow-lg shadow-black/5">
          Зарегистрироваться
          <svg className="w-5 h-5 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </section>
  );
}   