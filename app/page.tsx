"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import CategoryCard from "@/components/ui/Card";
import EventCard from "@/components/ui/CategoryCard";
import {
  faLeaf,
  faRecycle,
  faHandHoldingHeart,
  faTree,
} from "@fortawesome/free-solid-svg-icons";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: "easeOut" } 
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Home() {

  const events = [
    {
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800",
      category: "Экология",
      title: "Уборка парка Горького",
      description: "Присоединяйтесь к нам для уборки парка и посадки новых деревьев",
      date: "25 февраля 2026",
      location: "Парк Горького, Москва",
    },
    {
      image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800",
      category: "Переработка",
      title: "Сбор пластика на ВДНХ",
      description: "Учимся правильно сортировать мусор и очищаем территорию выставки",
      date: "10 марта 2026",
      location: "ВДНХ, Москва",
    },
    {
      image: "https://media.istockphoto.com/id/1265210645/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%BC%D0%BE%D0%BB%D0%BE%D0%B4%D0%B0%D1%8F-%D0%B6%D0%B5%D0%BD%D1%89%D0%B8%D0%BD%D0%B0-%D0%B2-%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B5-%D0%B4%D0%BB%D1%8F-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%BD%D1%8B%D1%85.jpg?s=612x612&w=0&k=20&c=_uhiPb4SzSld5vOwWmti9xoEc8MbKYvD3DIesbcErME=",
      category: "Животные",
      title: "Помощь приюту «Друг»",
      description: "Выгул собак и помощь в обустройстве новых вольеров для питомцев",
      date: "15 марта 2026",
      location: "Приют Друг, МО",
    },
    {
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
      category: "Лес",
      title: "Посадка кедров",
      description: "Восстанавливаем лесной массив после летних пожаров в Подмосковье",
      date: "20 апреля 2026",
      location: "Звенигородское лесничество",
    },
  ];

  const features = [
    { title: "Легко находить события", desc: "Удобный поиск и фильтры помогут найти идеальное событие для вас", icon: "🔍", color: "bg-green-50 text-green-600" },
    { title: "Присоединяться к команде", desc: "Знакомьтесь с единомышленниками и создавайте новые связи", icon: "👥", color: "bg-emerald-50 text-emerald-600" },
    { title: "Вносить вклад в общество", desc: "Каждое ваше действие делает мир лучше и добрее", icon: "❤️", color: "bg-teal-50 text-teal-600" },
    { title: "Развиваться и расти", desc: "Получайте новые навыки и опыт через волонтёрство", icon: "✨", color: "bg-lime-50 text-lime-600" },
  ];


  return (
    <div className="min-h-screen bg-white overflow-x-hidden scroll-smooth">
      {/* Hero Section с анимацией */}
      <section className="relative flex justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] min-h-[80vh] md:min-h-[90vh] px-4">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between py-12 md:py-20 gap-12 z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="flex flex-col gap-6 md:gap-8 max-w-2xl text-center lg:text-left items-center lg:items-start">
            <h1 className="font-bold text-4xl sm:text-5xl md:text-6xl text-gray-900 leading-[1.1] tracking-tight">
              Найди волонтёрские события <span className="text-[#10b981]">рядом с тобой</span>
            </h1>
            <p className="text-lg md:text-2xl text-gray-600 font-medium max-w-xl">
              Присоединяйся к волонтёрским событиям или создай свое мероприятие за пару минут
            </p>
            <Link href="/registr" className="px-10 py-4 text-base font-bold text-white transition-all bg-[#1a2e05] rounded-2xl hover:bg-[#10b981] shadow-xl">
              Начните помогать
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="bg-gray-200 rounded-[40px] w-full max-w-[300px] aspect-square md:max-w-[450px] shadow-2xl overflow-hidden border-[12px] border-white">
            <img src="https://img.freepik.com/free-photo/environmental-conservation-garden-children_1150-15276.jpg" className="w-full h-full object-cover" alt="Volunteer" />
          </motion.div>
        </div>
      </section>

      {/* Направления помощи — БЕЗ АНИМАЦИИ (простая верстка) */}
      <section id="directions" className="py-16 md:py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 md:mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter">
              Направления <span className="text-[#10b981] underline decoration-4 underline-offset-8">помощи</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 justify-items-center sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <CategoryCard title="Экология" category="Субботники" icon={faLeaf} blobColor="bg-green-400" />
            <CategoryCard title="Переработка" category="Сбор сырья" icon={faRecycle} blobColor="bg-emerald-400" />
            <CategoryCard title="Животные" category="Приюты" icon={faHandHoldingHeart} blobColor="bg-blue-400" />
            <CategoryCard title="Лес" category="Посадка" icon={faTree} blobColor="bg-lime-400" />
          </div>
        </div>
      </section>

      {/* События — Оставил анимацию появления */}
      <motion.section 
        id="events" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={staggerContainer}
        className="py-16 md:py-24 bg-gray-50/50 px-4"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div variants={fadeInUp} className="mb-12 md:mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter">
              Актуальные <span className="text-[#10b981] underline decoration-4 underline-offset-8">события</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
            {events.map((event, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <EventCard {...event} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* О нас */}
      <motion.section 
        id="about" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}
        className="py-16 md:py-24 bg-white px-4"
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-gray-900 mb-16">Почему выбирают нас</motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeInUp} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 ${f.color}`}>{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">{f.title}</h3>
                <p className="text-gray-500 text-sm font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA блок */}
      <section className="py-20 bg-[#10b981] px-4 relative overflow-hidden text-center text-white">
        <h2 className="text-4xl md:text-5xl font-bold mb-8 relative z-10">Готовы менять мир?</h2>
        <Link href='/registr' className="bg-white text-gray-900 px-12 py-5 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-colors relative z-10">
          Зарегистрироваться
        </Link>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      </section>
    </div>
  );
}