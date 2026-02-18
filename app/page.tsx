import Navbar from "@/components/layouts/Navbar";
import CategoryCard from "@/components/ui/Card";
import EventCard from "@/components/ui/CategoryCard";
import {
  faLeaf,
  faRecycle,
  faHandHoldingHeart,
  faTree,
} from "@fortawesome/free-solid-svg-icons";

export default function Home() {
  const events = [
    {
      image:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800",
      category: "Экология",
      title: "Уборка парка Горького",
      description:
        "Присоединяйтесь к нам для уборки парка и посадки новых деревьев",
      date: "25 февраля 2026",
      location: "Парк Горького, Москва",
    },
    {
      image:
        "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800",
      category: "Переработка",
      title: "Сбор пластика на ВДНХ",
      description:
        "Учимся правильно сортировать мусор и очищаем территорию выставки",
      date: "10 марта 2026",
      location: "ВДНХ, Москва",
    },
    {
      image:
        "https://media.istockphoto.com/id/1265210645/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%BC%D0%BE%D0%BB%D0%BE%D0%B4%D0%B0%D1%8F-%D0%B6%D0%B5%D0%BD%D1%89%D0%B8%D0%BD%D0%B0-%D0%B2-%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B5-%D0%B4%D0%BB%D1%8F-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%BD%D1%8B%D1%85.jpg?s=612x612&w=0&k=20&c=_uhiPb4SzSld5vOwWmti9xoEc8MbKYvD3DIesbcErME=",
      category: "Животные",
      title: "Помощь приюту «Друг»",
      description:
        "Выгул собак и помощь в обустройстве новых вольеров для питомцев",
      date: "15 марта 2026",
      location: "Приют Друг, МО",
    },
    {
      image:
        "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
      category: "Лес",
      title: "Посадка кедров",
      description:
        "Восстанавливаем лесной массив после летних пожаров в Подмосковье",
      date: "20 апреля 2026",
      location: "Звенигородское лесничество",
    },
  ];

  const features = [
    {
      title: "Легко находить события",
      desc: "Удобный поиск и фильтры помогут найти идеальное событие для вас",
      icon: "🔍",
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

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      <section className="flex justify-center bg-[linear-gradient(180deg,_rgba(209,250,229,1)_0%,_rgba(255,255,255,1)_50%,_rgba(219,234,254,1)_100%)] min-h-[80vh] md:min-h-[90vh] px-4">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between py-12 md:py-20 gap-12">
          <div className="flex flex-col gap-6 md:gap-8 max-w-2xl text-center lg:text-left items-center lg:items-start">
            <h1 className="font-bold text-4xl sm:text-5xl md:text-6xl text-gray-900 leading-[1.1] tracking-tight">
              Найди волонтёрские события{" "}
              <span className="text-green-500">рядом с тобой</span>
            </h1>
            <p className="text-lg md:text-2xl text-gray-600 font-medium max-w-xl">
              Присоединяйся к волонтёрским событиям или создай свое мероприятие
              за пару минут
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <div className="relative inline-flex group w-full sm:w-auto">
                <div className="absolute inset-0 duration-1000 opacity-60 transition-all bg-gradient-to-r from-green-400 via-emerald-500 to-lime-400 rounded-xl blur-lg group-hover:opacity-100 group-hover:duration-200"></div>
                <a
                  href="#"
                  className="relative w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-[#1a2e05] rounded-xl hover:bg-green-600 hover:-translate-y-0.5 shadow-xl shadow-green-900/20"
                >
                  Начните помогать
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="relative flex justify-center w-full lg:w-auto">
            <div className="bg-gray-200 rounded-[30px] md:rounded-[40px] w-full max-w-[300px] aspect-square md:max-w-[450px] shadow-2xl overflow-hidden border-4 md:border-8 border-white">
              <img
                src="https://img.freepik.com/free-photo/environmental-conservation-garden-children_1150-15276.jpg?semt=ais_user_personalization&w=740&q=80"
                className="w-full h-full object-cover"
                alt="Volunteer"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 md:mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter">
              Направления{" "}
              <span className="text-green-500 underline decoration-4 underline-offset-8">
                помощи
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 justify-items-center sm:grid-cols-2  lg:grid-cols-4 gap-6 md:gap-8">
            <CategoryCard
              title="Экология"
              category="Субботники"
              icon={faLeaf}
              blobColor="bg-green-400"
            />
            <CategoryCard
              title="Переработка"
              category="Сбор сырья"
              icon={faRecycle}
              blobColor="bg-emerald-400"
            />
            <CategoryCard
              title="Животные"
              category="Приюты"
              icon={faHandHoldingHeart}
              blobColor="bg-blue-400"
            />
            <CategoryCard
              title="Лес"
              category="Посадка"
              icon={faTree}
              blobColor="bg-lime-400"
            />
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gray-50/50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 md:mb-16 text-center md:text-center">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter">
              Категории{" "}
              <span className="text-green-500 underline decoration-4 underline-offset-8">
                событии
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 justify-items-center">
            {events.map((event, index) => (
              <EventCard key={index} {...event} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16 flex flex-col gap-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Почему выбирают нашу платформу
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto font-medium px-2 text-sm md:text-base">
              Мы делаем волонтёрство доступным, удобным и вдохновляющим для
              каждого
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center sm:items-start text-center sm:text-left gap-4 md:gap-5"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 ${f.color}`}
                >
                  {f.icon}
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed font-medium">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#10b981] px-4 overflow-hidden relative">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-8 md:gap-10 relative z-10">
          <div className="flex flex-col gap-4 md:gap-5 px-2">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              Готовы начать делать добро?
            </h2>
            <p className="text-white/90 text-lg md:text-xl font-medium">
              Присоединяйтесь к тысячам волонтёров по всей России
            </p>
          </div>
          <button className="bg-white text-gray-900 w-full sm:w-auto px-10 md:px-12 py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 shadow-2xl">
            Зарегистрироваться
            <svg
              className="w-6 h-6 text-[#10b981]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 md:w-96 md:h-96 bg-white/10 rounded-full blur-2xl md:blur-3xl pointer-events-none"></div>
      </section>
    </div>
  );
}
