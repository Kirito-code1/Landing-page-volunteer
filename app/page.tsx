"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

// Импортируем компоненты
import CategoryCard from "@/components/ui/Card";
import EventCard from "@/components/ui/CategoryCard";

// Иконки
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
    transition: { duration: 0.5, ease: "easeOut" },
  },
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

  return (
    <div className="min-h-screen bg-white overflow-x-hidden scroll-smooth">
      {/* Hero Section */}
      <section className="relative flex justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] min-h-[80vh] px-4">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between py-12 gap-12 z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="max-w-2xl text-center lg:text-left">
            <h1 className="font-black text-4xl sm:text-5xl md:text-7xl text-gray-900 leading-[1.0] tracking-tighter uppercase italic mb-8">
              Найди <span className="text-[#10b981]">события</span> рядом с тобой
            </h1>
            <Link href="/registr" className="px-12 py-5 text-lg font-black text-white bg-gray-900 rounded-[20px] hover:bg-[#10b981] transition-all shadow-2xl uppercase italic tracking-tighter">
              Начать помогать
            </Link>
          </motion.div>
          
          <div className="relative w-full max-w-[450px] aspect-square rounded-[60px] overflow-hidden border-[15px] border-white shadow-2xl">
            <Image 
              src="https://img.freepik.com/free-photo/environmental-conservation-garden-children_1150-15276.jpg" 
              fill 
              className="object-cover" 
              alt="Volunteer" 
              priority 
            />
          </div>
        </div>
      </section>

      {/* Направления помощи */}
      <section id="directions" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 uppercase italic tracking-tighter text-center mb-16">
            Направления <span className="text-[#10b981]">помощи</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
            <CategoryCard title="Экология" category="Субботники" icon={faLeaf} blobColor="bg-green-400" />
            <CategoryCard title="Переработка" category="Сбор сырья" icon={faRecycle} blobColor="bg-emerald-400" />
            <CategoryCard title="Животные" category="Приюты" icon={faHandHoldingHeart} blobColor="bg-blue-400" />
            <CategoryCard title="Лес" category="Посадка" icon={faTree} blobColor="bg-lime-400" />
          </div>
        </div>
      </section>

      {/* Актуальные события */}
      <section id="events" className="py-24 bg-gray-50/50 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 uppercase italic tracking-tighter text-center mb-16">
            Актуальные <span className="text-[#10b981]">события</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
            {events.map((event, index) => (
              <EventCard key={index} {...event} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}