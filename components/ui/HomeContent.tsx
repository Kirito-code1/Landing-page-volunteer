"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  HandHeart,
  Users2,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

import CategoryCard from "@/components/ui/Card";

import {
  faLeaf,
  faRecycle,
  faHandHoldingHeart,
  faTree,
} from "@fortawesome/free-solid-svg-icons";

export default function HomeContent() {
  const { pick } = useLanguage();

  const steps = pick({
    ru: [
      {
        title: "Выберите направление",
        description: "Откройте список событий и выберите то, что близко вам по теме и локации.",
      },
      {
        title: "Зарегистрируйтесь",
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
        title: "Register",
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
        title: "Ro'yxatdan o'ting",
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
        description: "Находите ближайшие инициативы и присоединяйтесь к ним без бюрократии.",
        cta: "Смотреть события",
        href: "/events",
      },
      {
        title: "Для организаторов",
        description: "Публикуйте анонсы, приглашайте участников и управляйте активностью.",
        cta: "Открыть кабинет",
        href: "/dashboard",
      },
      {
        title: "Для доноров",
        description: "Поддерживайте проекты финансово и помогайте инициативам расти.",
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
        description: "Publish announcements, invite participants, and manage activity.",
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
        description: "E'lon joylang, ishtirokchilarni jalb qiling va faollikni boshqaring.",
        cta: "Kabinetni ochish",
        href: "/dashboard",
      },
      {
        title: "Donorlar uchun",
        description: "Loyihalarni moliyaviy qo'llab-quvvatlang va tashabbuslarning o'sishiga yordam bering.",
        cta: "Xayriya qilish",
        href: "/donate",
      },
    ],
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden scroll-smooth">
      
      {/* --- HERO (Centered, no image) --- */}
      <section className="px-4 py-24 md:py-36">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <span className="inline-block mb-6 text-sm font-semibold text-emerald-600 tracking-wide">
            {pick({
              ru: "Платформа городского волонтёрства",
              en: "City Volunteering Platform",
              uz: "Shahar volontyorlik platformasi",
            })}
          </span>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight text-slate-900">
            {pick({
              ru: <>Объединяем людей вокруг <span className="text-emerald-500">реальной помощи</span></>,
              en: <>Connecting people through <span className="text-emerald-500">real-world impact</span></>,
              uz: <>Odamlarni <span className="text-emerald-500">haqiqiy yordam</span> atrofida birlashtiramiz</>,
            })}
          </h1>

          <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-xl">
            {pick({
              ru: "Выберите направление, запишитесь на событие и начните помогать людям, природе и животным.",
              en: "Choose an area, join an event, and start making real impact for people, nature, and animals.",
              uz: "Yo'nalishni tanlang, tadbirga yoziling va odamlar, tabiat hamda hayvonlarga yordam bering.",
            })}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/registr"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
            >
              {pick({ ru: "Начать сейчас", en: "Start Now", uz: "Hozir boshlash" })}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-slate-200 text-slate-700 font-medium hover:border-slate-300 transition-colors"
            >
              {pick({ ru: "Смотреть события", en: "View Events", uz: "Tadbirlarni ko'rish" })}
            </Link>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how" className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-emerald-600 mb-3">
              {pick({ ru: "Как это работает", en: "How It Works", uz: "Qanday ishlaydi" })}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {pick({
                ru: <>Три шага до <span className="text-emerald-500">реальной помощи</span></>,
                en: <>Three steps to <span className="text-emerald-500">real impact</span></>,
                uz: <>Real yordamga olib boruvchi <span className="text-emerald-500">3 qadam</span></>,
              })}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <div key={index} className="bg-white p-8 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- FOR WHOM --- */}
      <section id="for-whom" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {pick({
                ru: <>Кому подходит <span className="text-emerald-500">платформа</span></>,
                en: <>Who This <span className="text-emerald-500">Platform</span> Is For</>,
                uz: <>Platforma <span className="text-emerald-500">kimlar uchun</span></>,
              })}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {audiences.map((audience, index) => (
              <article key={index} className="flex flex-col text-center items-center md:items-start md:text-left">
                <h3 className="text-xl font-bold mb-3">{audience.title}</h3>
                <p className="text-slate-500 leading-relaxed flex-1 mb-6">{audience.description}</p>
                <Link
                  href={audience.href}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {audience.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* --- DIRECTIONS --- */}
      <section id="directions" className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {pick({
                ru: <>Направления <span className="text-emerald-500">помощи</span></>,
                en: <>Areas of <span className="text-emerald-500">Support</span></>,
                uz: <>Yordam <span className="text-emerald-500">yo'nalishlari</span></>,
              })}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
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
    </div>
  );
}
