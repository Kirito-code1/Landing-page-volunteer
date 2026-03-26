"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Compass,
  Globe2,
  HandHeart,
  Rocket,
  Users2,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

import CategoryCard from "@/components/ui/Card";
import EventCard from "@/components/ui/CategoryCard";

import {
  faLeaf,
  faRecycle,
  faHandHoldingHeart,
  faTree,
} from "@fortawesome/free-solid-svg-icons";

export default function Home() {
  const { pick } = useLanguage();

  const quickFacts = pick({
    ru: [
      { value: "3 шага", label: "чтобы начать помогать" },
      { value: "4 направления", label: "экология, переработка, животные, лес" },
      { value: "1 профиль", label: "для участия и отслеживания активности" },
    ],
    en: [
      { value: "3 steps", label: "to start helping" },
      { value: "4 areas", label: "ecology, recycling, animals, forest" },
      { value: "1 profile", label: "to join and track your activity" },
    ],
    uz: [
      { value: "3 qadam", label: "yordam berishni boshlash uchun" },
      { value: "4 yo'nalish", label: "ekologiya, qayta ishlash, hayvonlar, o'rmon" },
      { value: "1 profil", label: "ishtirok va faollikni kuzatish uchun" },
    ],
  });

  const steps = pick({
    ru: [
      {
        title: "Выберите направление",
        description: "Откройте список событий и выберите то, что близко вам по теме и локации.",
      },
      {
        title: "Зарегистрируйтесь за минуту",
        description: "Создайте профиль, чтобы записываться на события и получать обновления.",
      },
      {
        title: "Участвуйте и помогайте",
        description: "Приходите на мероприятие, выполняйте полезные задачи и делайте вклад в сообщество.",
      },
    ],
    en: [
      {
        title: "Choose an area",
        description: "Open the event list and pick what matches your interests and location.",
      },
      {
        title: "Register in one minute",
        description: "Create a profile to join events and receive important updates.",
      },
      {
        title: "Join and make impact",
        description: "Attend the event, complete meaningful tasks, and support your community.",
      },
    ],
    uz: [
      {
        title: "Yo'nalishni tanlang",
        description: "Tadbirlar ro'yxatini oching va sizga mos mavzu hamda joyni tanlang.",
      },
      {
        title: "1 daqiqada ro'yxatdan o'ting",
        description: "Tadbirlarga yozilish va yangilik olish uchun profil yarating.",
      },
      {
        title: "Qatnashing va yordam bering",
        description: "Tadbirga keling, foydali vazifalarni bajaring va jamiyatga hissa qo'shing.",
      },
    ],
  });

  const stepIcons = [Compass, Users2, HandHeart];

  const audiences = pick({
    ru: [
      {
        title: "Для волонтеров",
        description: "Быстро находите ближайшие инициативы и присоединяйтесь к ним без лишней бюрократии.",
        cta: "Смотреть события",
        href: "/events",
      },
      {
        title: "Для организаторов",
        description: "Публикуйте анонсы, приглашайте участников и управляйте активностью через кабинет.",
        cta: "Открыть кабинет",
        href: "/dashboard",
      },
      {
        title: "Для доноров",
        description: "Поддерживайте проекты финансово и помогайте инициативам расти быстрее.",
        cta: "Сделать донат",
        href: "/donate",
      },
    ],
    en: [
      {
        title: "For volunteers",
        description: "Find nearby initiatives quickly and join them without extra friction.",
        cta: "Browse events",
        href: "/events",
      },
      {
        title: "For organizers",
        description: "Publish announcements, invite participants, and manage activity from your dashboard.",
        cta: "Open dashboard",
        href: "/dashboard",
      },
      {
        title: "For donors",
        description: "Support projects financially and help initiatives grow faster.",
        cta: "Make a donation",
        href: "/donate",
      },
    ],
    uz: [
      {
        title: "Volontyorlar uchun",
        description: "Yaqin tashabbuslarni tez toping va ortiqcha jarayonlarsiz ularga qo'shiling.",
        cta: "Tadbirlarni ko'rish",
        href: "/events",
      },
      {
        title: "Tashkilotchilar uchun",
        description: "E'lon joylang, ishtirokchilarni jalb qiling va faollikni kabinetdan boshqaring.",
        cta: "Kabinetni ochish",
        href: "/dashboard",
      },
      {
        title: "Donorlar uchun",
        description: "Loyihalarni moliyaviy qo'llab-quvvatlang va tashabbuslarning tezroq o'sishiga yordam bering.",
        cta: "Xayriya qilish",
        href: "/donate",
      },
    ],
  });

  const trustPoints = pick({
    ru: [
      "Понятная главная страница: что это за платформа и как начать за 1 минуту.",
      "Проверенные направления помощи и прозрачная структура активности.",
      "Один аккаунт для участия в событиях, донатов и дальнейшего роста.",
    ],
    en: [
      "Clear homepage that explains what the platform does and how to start in one minute.",
      "Verified support areas and a transparent participation structure.",
      "One account for events, donations, and long-term volunteering growth.",
    ],
    uz: [
      "Platforma nima uchun kerakligi va 1 daqiqada qanday boshlashni aniq tushuntiradi.",
      "Yordam yo'nalishlari tekshirilgan va ishtirok jarayoni tushunarli.",
      "Tadbirlar, xayriya va uzoq muddatli volontyorlik uchun bitta akkaunt.",
    ],
  });

  const differentiators = pick({
    ru: [
      {
        title: "Локальные задачи по району",
        description: "Люди видят инициативы рядом с собой и быстрее включаются в действие.",
      },
      {
        title: "Прозрачность набора волонтёров",
        description: "На карточке события видно, сколько волонтёров нужно и насколько это срочно.",
      },
      {
        title: "Мультиязычность с первого дня",
        description: "Один интерфейс для русскоязычных, англоязычных и узбекоязычных пользователей.",
      },
      {
        title: "Рост организаторов через Premium",
        description: "Безлимит объявлений, расширенная аналитика и экспорт помогают масштабироваться.",
      },
    ],
    en: [
      {
        title: "Local opportunities by district",
        description: "People discover nearby initiatives and join faster.",
      },
      {
        title: "Transparent volunteer demand",
        description: "Each event card shows needed volunteers and urgency status.",
      },
      {
        title: "Multilingual from day one",
        description: "One interface for Russian, English, and Uzbek-speaking users.",
      },
      {
        title: "Organizer growth with Premium",
        description: "Unlimited posts, advanced analytics, and export support scaling.",
      },
    ],
    uz: [
      {
        title: "Hudud bo'yicha lokal vazifalar",
        description: "Foydalanuvchilar yaqin tashabbuslarni ko'rib, tezroq qo'shiladi.",
      },
      {
        title: "Volontyor talabi shaffof",
        description: "Har bir tadbirda kerakli volontyorlar soni va shoshilinchlik ko'rsatiladi.",
      },
      {
        title: "Birinchi kundan ko'p tilli",
        description: "Rus, ingliz va o'zbek tillari uchun bitta tushunarli interfeys.",
      },
      {
        title: "Premium bilan tashkilotchi o'sishi",
        description: "Cheksiz e'lon, kengaytirilgan tahlil va eksport tezroq masshtablashga yordam beradi.",
      },
    ],
  });

  const impactMetrics = pick({
    ru: [
      { value: "3 мин", label: "среднее время до публикации события" },
      { value: "10+", label: "волонтёров можно собрать даже для малого события" },
      { value: "24/7", label: "доступ к платформе и поиску задач" },
      { value: "3 языка", label: "чтобы охватить больше людей в городе" },
    ],
    en: [
      { value: "3 min", label: "average time to publish an event" },
      { value: "10+", label: "volunteers can be gathered even for small events" },
      { value: "24/7", label: "platform access and task discovery" },
      { value: "3 languages", label: "to reach more people in the city" },
    ],
    uz: [
      { value: "3 daq", label: "tadbir e'lon qilish uchun o'rtacha vaqt" },
      { value: "10+", label: "hatto kichik tadbirga ham volontyor jalb qilish mumkin" },
      { value: "24/7", label: "platforma va vazifalarni qidirish doim ochiq" },
      { value: "3 til", label: "shahar bo'yicha ko'proq odamni qamrab olish uchun" },
    ],
  });

  const differentiatorIcons = [Rocket, BadgeCheck, Globe2, BarChart3];

  const events = pick({
    ru: [
      {
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800",
        category: "Экология",
        title: "Уборка берега канала Анхор",
        description: "Очищаем набережную Анхора и сортируем собранные отходы вместе с волонтерами района.",
        date: "6 апреля 2026",
        location: "Набережная Анхора, Ташкент",
      },
      {
        image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800",
        category: "Переработка",
        title: "Сбор пластика в экопункте Yangiobod",
        description: "Принимаем пластик и макулатуру, показываем как правильно сортировать сырье дома.",
        date: "12 апреля 2026",
        location: "Экопункт Yangiobod, Ташкент",
      },
      {
        image: "https://media.istockphoto.com/id/1265210645/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%BC%D0%BE%D0%BB%D0%BE%D0%B4%D0%B0%D1%8F-%D0%B6%D0%B5%D0%BD%D1%89%D0%B8%D0%BD%D0%B0-%D0%B2-%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B5-%D0%B4%D0%BB%D1%8F-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%BD%D1%8B%D1%85.jpg?s=612x612&w=0&k=20&c=_uhiPb4SzSld5vOwWmti9xoEc8MbKYvD3DIesbcErME=",
        category: "Животные",
        title: "Помощь приюту Mehr va Oqibat",
        description: "Кормление животных, выгул собак и помощь в уборке территории приюта.",
        date: "19 апреля 2026",
        location: "Ташкентская область",
      },
      {
        image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
        category: "Лес",
        title: "Посадка саксаула в Приаралье",
        description: "Высаживаем саженцы саксаула для укрепления почвы и снижения пылевых бурь.",
        date: "27 апреля 2026",
        location: "Муйнак, Каракалпакстан",
      },
    ],
    en: [
      {
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800",
        category: "Ecology",
        title: "Anhor Canal Cleanup",
        description: "We clean the Anhor embankment and sort collected waste with local volunteers.",
        date: "April 6, 2026",
        location: "Anhor Embankment, Tashkent",
      },
      {
        image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800",
        category: "Recycling",
        title: "Plastic Collection at Yangiobod Eco Point",
        description: "Bring plastic and paper waste and learn simple home sorting routines.",
        date: "April 12, 2026",
        location: "Yangiobod Eco Point, Tashkent",
      },
      {
        image: "https://media.istockphoto.com/id/1265210645/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%BC%D0%BE%D0%BB%D0%BE%D0%B4%D0%B0%D1%8F-%D0%B6%D0%B5%D0%BD%D1%89%D0%B8%D0%BD%D0%B0-%D0%B2-%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B5-%D0%B4%D0%BB%D1%8F-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%BD%D1%8B%D1%85.jpg?s=612x612&w=0&k=20&c=_uhiPb4SzSld5vOwWmti9xoEc8MbKYvD3DIesbcErME=",
        category: "Animals",
        title: "Support for Mehr va Oqibat Shelter",
        description: "Feed animals, walk dogs, and help maintain the shelter area.",
        date: "April 19, 2026",
        location: "Tashkent Region",
      },
      {
        image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
        category: "Forest",
        title: "Saxaul Planting in Aral Area",
        description: "Plant saxaul trees to stabilize soil and reduce dust storms.",
        date: "April 27, 2026",
        location: "Muynak, Karakalpakstan",
      },
    ],
    uz: [
      {
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800",
        category: "Ekologiya",
        title: "Anhor kanali bo'yini tozalash",
        description: "Anhor bo'yidagi hududni tozalab, yig'ilgan chiqindilarni saralaymiz.",
        date: "2026-yil 6-aprel",
        location: "Anhor bo'yi, Toshkent",
      },
      {
        image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800",
        category: "Qayta ishlash",
        title: "Yangiobod ekopunktida plastik yig'imi",
        description: "Plastik va qog'oz chiqindilarini qabul qilib, uyda saralashni o'rgatamiz.",
        date: "2026-yil 12-aprel",
        location: "Yangiobod ekopunkti, Toshkent",
      },
      {
        image: "https://media.istockphoto.com/id/1265210645/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%BC%D0%BE%D0%BB%D0%BE%D0%B4%D0%B0%D1%8F-%D0%B6%D0%B5%D0%BD%D1%89%D0%B8%D0%BD%D0%B0-%D0%B2-%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B5-%D0%B4%D0%BB%D1%8F-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%BD%D1%8B%D1%85.jpg?s=612x612&w=0&k=20&c=_uhiPb4SzSld5vOwWmti9xoEc8MbKYvD3DIesbcErME=",
        category: "Hayvonlar",
        title: "Mehr va Oqibat boshpanasiga yordam",
        description: "Hayvonlarni boqish, itlarni sayr qildirish va boshpana hududini tozalash.",
        date: "2026-yil 19-aprel",
        location: "Toshkent viloyati",
      },
      {
        image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
        category: "O'rmon",
        title: "Orolbo'yida saksovul ekish",
        description: "Tuproqni mustahkamlash va chang bo'ronlarini kamaytirish uchun saksovul ekamiz.",
        date: "2026-yil 27-aprel",
        location: "Mo'ynoq, Qoraqalpog'iston",
      },
    ],
  });

  return (
    <div className="min-h-screen bg-white overflow-x-hidden scroll-smooth">
      <section className="relative px-4 pb-12 pt-10 md:pt-14 bg-[linear-gradient(180deg,_#ecfdf5_0%,_#ffffff_48%,_#eff6ff_100%)]">
        <div className="pointer-events-none absolute -top-16 -left-20 h-64 w-64 rounded-full bg-emerald-200/60 blur-3xl" />
        <div className="pointer-events-none absolute top-24 -right-24 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />

        <div className="relative z-10 w-full max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
              {pick({
                ru: "Платформа городского волонтёрства",
                en: "City Volunteering Platform",
                uz: "Shahar volontyorlik platformasi",
              })}
            </span>

            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 leading-[0.95] tracking-tighter uppercase italic">
              {pick({
                ru: <>С главной страницы сразу понятно, <span className="text-[#10b981]">как начать помогать</span></>,
                en: <>From the first screen, it is clear <span className="text-[#10b981]">how to start helping</span></>,
                uz: <>Birinchi ekrandanoq <span className="text-[#10b981]">qanday yordam berish</span> aniq tushuniladi</>,
              })}
            </h1>

            <p className="mt-6 max-w-2xl text-gray-600 text-lg font-semibold leading-relaxed">
              {pick({
                ru: "VoloHero объясняет всё простыми шагами: выберите направление, запишитесь на событие и начните реальную помощь людям, природе и животным.",
                en: "VoloHero explains everything in simple steps: choose an area, join an event, and start making real impact for people, nature, and animals.",
                uz: "VoloHero hammasini sodda ko'rsatadi: yo'nalishni tanlang, tadbirga yoziling va odamlar, tabiat hamda hayvonlarga real yordam bering.",
              })}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth/registr"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-[18px] bg-gray-900 text-white font-black uppercase tracking-wider text-sm hover:bg-[#10b981] transition-all shadow-xl shadow-gray-900/10"
              >
                {pick({
                  ru: "Начать сейчас",
                  en: "Start Now",
                  uz: "Hozir boshlash",
                })}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center justify-center px-8 py-4 rounded-[18px] border border-gray-200 bg-white text-gray-800 font-black uppercase tracking-wider text-sm hover:border-[#10b981] hover:text-[#10b981] transition-all"
              >
                {pick({
                  ru: "Смотреть события",
                  en: "View Events",
                  uz: "Tadbirlarni ko'rish",
                })}
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
              {quickFacts.map((item, index) => (
                <div key={index} className="rounded-2xl border border-white/80 bg-white/80 backdrop-blur px-4 py-3 shadow-sm">
                  <p className="text-sm font-black text-gray-900">{item.value}</p>
                  <p className="mt-1 text-[12px] font-bold text-gray-500 leading-snug">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative w-full max-w-[500px] mx-auto aspect-[4/5] rounded-[44px] overflow-hidden border-[12px] border-white shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
              <Image
                src="https://img.freepik.com/free-photo/environmental-conservation-garden-children_1150-15276.jpg"
                fill
                className="object-cover"
                alt="Volunteers planting trees"
                priority
              />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] rounded-3xl border border-emerald-100 bg-white/95 backdrop-blur px-5 py-4 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                {pick({
                  ru: "Следующий шаг",
                  en: "Next Step",
                  uz: "Keyingi qadam",
                })}
              </p>
              <p className="mt-2 text-sm font-bold text-gray-700">
                {pick({
                  ru: "Выберите событие и подтвердите участие в личном кабинете.",
                  en: "Pick an event and confirm participation in your dashboard.",
                  uz: "Tadbirni tanlang va ishtirokni kabinetda tasdiqlang.",
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#10b981] mb-4">
              {pick({ ru: "Как это работает", en: "How It Works", uz: "Qanday ishlaydi" })}
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter">
              {pick({
                ru: <>Три понятных шага до <span className="text-[#10b981]">реальной помощи</span></>,
                en: <>Three clear steps to <span className="text-[#10b981]">real impact</span></>,
                uz: <>Real yordamga olib boruvchi <span className="text-[#10b981]">3 aniq qadam</span></>,
              })}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <div
                  key={index}
                  className="rounded-[30px] border border-gray-100 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-gray-200">{`0${index + 1}`}</span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-gray-600 font-medium leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="about" className="py-8 px-4">
        <div className="max-w-6xl mx-auto rounded-[36px] border border-emerald-100 bg-[linear-gradient(130deg,_#ffffff_0%,_#ecfdf5_55%,_#eff6ff_100%)] p-8 md:p-12 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#10b981] mb-4">
            {pick({ ru: "Почему VoloHero", en: "Why VoloHero", uz: "Nega VoloHero" })}
          </p>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter mb-6">
            {pick({
              ru: "Платформа, где каждому ясно что делать дальше",
              en: "A platform where everyone knows what to do next",
              uz: "Har kim keyingi qadamni aniq biladigan platforma",
            })}
          </h2>
          <p className="text-gray-700 font-semibold leading-relaxed mb-8">
            {pick({
              ru: "Мы специально сделали главную страницу понятной для новых пользователей: без сложных терминов и лишнего текста. Вы сразу видите цель сайта, доступные направления помощи и короткий маршрут от регистрации до участия.",
              en: "We intentionally made the homepage simple for new users: no complex terms, no extra noise. You instantly see the platform purpose, available support areas, and a short path from signup to participation.",
              uz: "Biz bosh sahifani yangi foydalanuvchilar uchun sodda qildik: murakkab atamalar va ortiqcha matnlarsiz. Sayt maqsadi, yordam yo'nalishlari va ro'yxatdan o'tishdan ishtirokgacha bo'lgan yo'l darhol ko'rinadi.",
            })}
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {trustPoints.map((point, index) => (
              <div key={index} className="rounded-2xl bg-white border border-white/80 px-4 py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#10b981] mt-0.5" />
                  <p className="text-sm font-semibold text-gray-600 leading-relaxed">{point}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="for-whom" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter text-center mb-12">
            {pick({
              ru: <>Кому подходит <span className="text-[#10b981]">платформа</span></>,
              en: <>Who This <span className="text-[#10b981]">Platform</span> Is For</>,
              uz: <>Platforma <span className="text-[#10b981]">kimlar uchun</span></>,
            })}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {audiences.map((audience, index) => (
              <article
                key={index}
                className="rounded-[32px] border border-gray-100 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.06)] flex flex-col"
              >
                <div className="w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-sm mb-5">
                  {`0${index + 1}`}
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">{audience.title}</h3>
                <p className="mt-3 text-gray-600 font-medium leading-relaxed flex-1">{audience.description}</p>
                <Link
                  href={audience.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#10b981] hover:text-emerald-700 transition-colors"
                >
                  {audience.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="advantages" className="py-8 px-4">
        <div className="max-w-7xl mx-auto rounded-[36px] border border-gray-100 bg-[linear-gradient(125deg,_#ffffff_0%,_#ecfdf5_45%,_#eff6ff_100%)] p-8 md:p-12">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#10b981] mb-4">
            {pick({ ru: "Преимущества продукта", en: "Product advantages", uz: "Mahsulot afzalliklari" })}
          </p>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter mb-8">
            {pick({
              ru: <>Почему эту платформу <span className="text-[#10b981]">сложно заменить</span></>,
              en: <>Why this platform is <span className="text-[#10b981]">hard to replace</span></>,
              uz: <>Nega bu platformani <span className="text-[#10b981]">oson almashtirib bo&apos;lmaydi</span></>,
            })}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {differentiators.map((point, index) => {
              const Icon = differentiatorIcons[index];
              return (
                <article key={index} className="rounded-3xl border border-white bg-white/90 p-6 shadow-sm">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">{point.title}</h3>
                  <p className="mt-3 text-gray-600 font-medium leading-relaxed">{point.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="impact" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#10b981] mb-4">
              {pick({ ru: "Результат в цифрах", en: "Impact in numbers", uz: "Natija raqamlarda" })}
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter">
              {pick({
                ru: "Понятные метрики, которые убеждают новых пользователей",
                en: "Clear metrics that convince new users quickly",
                uz: "Yangi foydalanuvchini tez ishontiradigan aniq metrikalar",
              })}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {impactMetrics.map((metric, index) => (
              <div key={index} className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
                <p className="text-4xl font-black tracking-tight text-[#10b981]">{metric.value}</p>
                <p className="mt-3 text-gray-600 font-semibold leading-relaxed">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="directions" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 uppercase italic tracking-tighter text-center mb-14">
            {pick({
              ru: <>Направления <span className="text-[#10b981]">помощи</span></>,
              en: <>Areas of <span className="text-[#10b981]">Support</span></>,
              uz: <>Yordam <span className="text-[#10b981]">yo&apos;nalishlari</span></>,
            })}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
            <CategoryCard
              title={pick({ ru: "Экология", en: "Ecology", uz: "Ekologiya" })}
              category={pick({ ru: "Субботники", en: "Cleanup Actions", uz: "Hasharlar" })}
              icon={faLeaf}
              blobColor="bg-green-400"
            />
            <CategoryCard
              title={pick({ ru: "Переработка", en: "Recycling", uz: "Qayta ishlash" })}
              category={pick({ ru: "Сбор сырья", en: "Material Collection", uz: "Xomashyo yig'imi" })}
              icon={faRecycle}
              blobColor="bg-emerald-400"
            />
            <CategoryCard
              title={pick({ ru: "Животные", en: "Animals", uz: "Hayvonlar" })}
              category={pick({ ru: "Приюты", en: "Shelters", uz: "Boshpanalar" })}
              icon={faHandHoldingHeart}
              blobColor="bg-blue-400"
            />
            <CategoryCard
              title={pick({ ru: "Лес", en: "Forest", uz: "O'rmon" })}
              category={pick({ ru: "Посадка", en: "Planting", uz: "Ko'chat ekish" })}
              icon={faTree}
              blobColor="bg-lime-400"
            />
          </div>
        </div>
      </section>

      <section id="events" className="py-24 bg-gray-50/60 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 uppercase italic tracking-tighter text-center mb-14">
            {pick({
              ru: <>Ближайшие <span className="text-[#10b981]">события</span></>,
              en: <>Upcoming <span className="text-[#10b981]">Events</span></>,
              uz: <>Yaqin <span className="text-[#10b981]">tadbirlar</span></>,
            })}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
            {events.map((event, index) => (
              <EventCard key={index} {...event} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-[18px] bg-gray-900 text-white font-black uppercase tracking-widest text-sm hover:bg-[#10b981] transition-colors"
            >
              {pick({
                ru: "Открыть все события",
                en: "Open All Events",
                uz: "Barcha tadbirlarni ochish",
              })}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
