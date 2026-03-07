"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export function FeaturesSection() {
  const { pick } = useLanguage();

  const features = [
    {
      title: pick({
        ru: "Легко находить события",
        en: "Discover Events Easily",
        uz: "Tadbirlarni oson toping",
      }),
      desc: pick({
        ru: "Удобный поиск и фильтры помогут найти идеальное событие для вас",
        en: "Smart search and filters help you find the best event for you",
        uz: "Qulay qidiruv va filtrlar sizga mos tadbirni topishga yordam beradi",
      }),
      icon: "🔍",
      color: "bg-green-50 text-green-600",
    },
    {
      title: pick({
        ru: "Присоединяться к команде",
        en: "Join the Community",
        uz: "Jamoaga qo'shiling",
      }),
      desc: pick({
        ru: "Знакомьтесь с единомышленниками и создавайте новые связи",
        en: "Meet like-minded people and build meaningful connections",
        uz: "Hamfikrlar bilan tanishing va yangi aloqalar yarating",
      }),
      icon: "👥",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: pick({
        ru: "Вносить вклад в общество",
        en: "Make Social Impact",
        uz: "Jamiyatga hissa qo'shing",
      }),
      desc: pick({
        ru: "Каждое ваше действие делает мир лучше и добрее",
        en: "Every action you take makes the world better and kinder",
        uz: "Har bir amalingiz dunyoni yanada yaxshiroq qiladi",
      }),
      icon: "❤️",
      color: "bg-teal-50 text-teal-600",
    },
    {
      title: pick({
        ru: "Развиваться и расти",
        en: "Grow and Improve",
        uz: "Rivojlaning va o'sing",
      }),
      desc: pick({
        ru: "Получайте новые навыки и опыт через волонтёрство",
        en: "Gain new skills and practical experience through volunteering",
        uz: "Volontyorlik orqali yangi ko'nikma va tajriba orttiring",
      }),
      icon: "✨",
      color: "bg-lime-50 text-lime-600",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {pick({
              ru: "Почему выбирают нашу платформу",
              en: "Why People Choose Our Platform",
              uz: "Nega aynan bizning platforma tanlanadi",
            })}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            {pick({
              ru: "Мы делаем волонтёрство доступным, удобным и вдохновляющим для каждого",
              en: "We make volunteering accessible, easy, and inspiring for everyone",
              uz: "Biz volontyorlikni har bir inson uchun qulay, sodda va ilhomli qilamiz",
            })}
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
