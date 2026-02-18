const features = [
  {
    title: "Легко находить события",
    desc: "Удобный поиск и фильтры помогут найти идеальное событие для вас",
    icon: "🔍", // Можно заменить на Lucide или FontAwesome
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Присоединяться к команде",
    desc: "Знакомьтесь с единомышленниками и создавайте новые связи",
    icon: "👥",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Вносить вклад в общество",
    desc: "Каждое ваше действие делает мир лучше и добрее",
    icon: "❤️",
    color: "bg-teal-50 text-teal-600",
  },
  {
    title: "Развиваться и расти",
    desc: "Получайте новые навыки и опыт через волонтёрство",
    icon: "✨",
    color: "bg-lime-50 text-lime-600",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Почему выбирают нашу платформу
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Мы делаем волонтёрство доступным, удобным и вдохновляющим для каждого
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-50 shadow-sm hover:shadow-md transition-shadow flex flex-col items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}