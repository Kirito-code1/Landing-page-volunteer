"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";

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
  const { pick } = useLanguage();

  const events = pick({
    ru: [
      {
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800",
        category: "Экология",
        title: "Уборка берега канала Анхор",
        description: "Очищаем набережную Анхора и сортируем собранные отходы вместе с волонтерами района.",
        date: "14 марта 2026",
        location: "Набережная Анхора, Ташкент",
      },
      {
        image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800",
        category: "Переработка",
        title: "Сбор пластика в экопункте Yangiobod",
        description: "Принимаем пластик и макулатуру, показываем как правильно сортировать сырье дома.",
        date: "22 марта 2026",
        location: "Экопункт Yangiobod, Ташкент",
      },
      {
        image: "https://media.istockphoto.com/id/1265210645/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%BC%D0%BE%D0%BB%D0%BE%D0%B4%D0%B0%D1%8F-%D0%B6%D0%B5%D0%BD%D1%89%D0%B8%D0%BD%D0%B0-%D0%B2-%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B5-%D0%B4%D0%BB%D1%8F-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%BD%D1%8B%D1%85.jpg?s=612x612&w=0&k=20&c=_uhiPb4SzSld5vOwWmti9xoEc8MbKYvD3DIesbcErME=",
        category: "Животные",
        title: "Помощь приюту Mehr va Oqibat",
        description: "Кормление животных, выгул собак и помощь в уборке территории приюта.",
        date: "28 марта 2026",
        location: "Ташкентская область",
      },
      {
        image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
        category: "Лес",
        title: "Посадка саксаула в Приаралье",
        description: "Высаживаем саженцы саксаула для укрепления почвы и снижения пылевых бурь.",
        date: "12 апреля 2026",
        location: "Муйнак, Каракалпакстан",
      },
    ],
    en: [
      {
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800",
        category: "Ecology",
        title: "Anhor Canal Cleanup",
        description: "We clean the Anhor embankment and sort collected waste with local volunteers.",
        date: "March 14, 2026",
        location: "Anhor Embankment, Tashkent",
      },
      {
        image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800",
        category: "Recycling",
        title: "Plastic Collection at Yangiobod Eco Point",
        description: "Bring plastic and paper waste and learn simple home sorting routines.",
        date: "March 22, 2026",
        location: "Yangiobod Eco Point, Tashkent",
      },
      {
        image: "https://media.istockphoto.com/id/1265210645/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%BC%D0%BE%D0%BB%D0%BE%D0%B4%D0%B0%D1%8F-%D0%B6%D0%B5%D0%BD%D1%89%D0%B8%D0%BD%D0%B0-%D0%B2-%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B5-%D0%B4%D0%BB%D1%8F-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%BD%D1%8B%D1%85.jpg?s=612x612&w=0&k=20&c=_uhiPb4SzSld5vOwWmti9xoEc8MbKYvD3DIesbcErME=",
        category: "Animals",
        title: "Support for Mehr va Oqibat Shelter",
        description: "Feed animals, walk dogs, and help maintain the shelter area.",
        date: "March 28, 2026",
        location: "Tashkent Region",
      },
      {
        image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
        category: "Forest",
        title: "Saxaul Planting in Aral Area",
        description: "Plant saxaul trees to stabilize soil and reduce dust storms.",
        date: "April 12, 2026",
        location: "Muynak, Karakalpakstan",
      },
    ],
    uz: [
      {
        image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800",
        category: "Ekologiya",
        title: "Anhor kanali bo'yini tozalash",
        description: "Anhor bo'yidagi hududni tozalab, yig'ilgan chiqindilarni saralaymiz.",
        date: "2026-yil 14-mart",
        location: "Anhor bo'yi, Toshkent",
      },
      {
        image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800",
        category: "Qayta ishlash",
        title: "Yangiobod ekopunktida plastik yig'imi",
        description: "Plastik va qog'oz chiqindilarini qabul qilib, uyda saralashni o'rgatamiz.",
        date: "2026-yil 22-mart",
        location: "Yangiobod ekopunkti, Toshkent",
      },
      {
        image: "https://media.istockphoto.com/id/1265210645/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%BC%D0%BE%D0%BB%D0%BE%D0%B4%D0%B0%D1%8F-%D0%B6%D0%B5%D0%BD%D1%89%D0%B8%D0%BD%D0%B0-%D0%B2-%D0%BF%D1%80%D0%B8%D1%8E%D1%82%D0%B5-%D0%B4%D0%BB%D1%8F-%D0%B6%D0%B8%D0%B2%D0%BE%D1%82%D0%BD%D1%8B%D1%85.jpg?s=612x612&w=0&k=20&c=_uhiPb4SzSld5vOwWmti9xoEc8MbKYvD3DIesbcErME=",
        category: "Hayvonlar",
        title: "Mehr va Oqibat boshpanasiga yordam",
        description: "Hayvonlarni boqish, itlarni sayr qildirish va boshpana hududini tozalash.",
        date: "2026-yil 28-mart",
        location: "Toshkent viloyati",
      },
      {
        image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
        category: "O'rmon",
        title: "Orolbo'yida saksovul ekish",
        description: "Tuproqni mustahkamlash va chang bo'ronlarini kamaytirish uchun saksovul ekamiz.",
        date: "2026-yil 12-aprel",
        location: "Mo'ynoq, Qoraqalpog'iston",
      },
    ],
  });

  return (
    <div className="min-h-screen bg-white overflow-x-hidden scroll-smooth">
      {/* Hero Section */}
      <section className="relative flex justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] min-h-[80vh] px-4">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between py-12 gap-12 z-10">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="max-w-2xl text-center lg:text-left">
            <h1 className="font-black text-4xl sm:text-5xl md:text-7xl text-gray-900 leading-[1.0] tracking-tighter uppercase italic mb-8">
              {pick({
                ru: <>Найди <span className="text-[#10b981]">события</span> рядом с тобой</>,
                en: <>Find <span className="text-[#10b981]">events</span> near you</>,
                uz: <>Yaqiningizdagi <span className="text-[#10b981]">tadbirlarni</span> toping</>,
              })}
            </h1>
            <p className="font-black text-2xl sm:text-3xl md:text-4xl text-gray-900 leading-[1.0] tracking-tighter uppercase italic mb-8">
              {pick({
                ru: "Волонтерство вместе с 22 школой 11 - А класса",
                en: "Volunteering with School 22, Class 11-A",
                uz: "22-maktab 11-A sinfi bilan volontyorlik",
              })}
            </p>
            <Link href="/auth/registr" className="px-12 py-5 text-lg font-black text-white bg-gray-900 rounded-[20px] hover:bg-[#10b981] transition-all shadow-2xl uppercase italic tracking-tighter">
              {pick({
                ru: "Начать помогать",
                en: "Start Helping",
                uz: "Yordam berishni boshlash",
              })}
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

      {/* О нас */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-white border border-gray-100 rounded-[36px] p-8 md:p-12 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#10b981] mb-4">
            {pick({ ru: "О платформе", en: "About Platform", uz: "Platforma haqida" })}
          </p>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter mb-6">
            {pick({
              ru: "VoloHero объединяет школьников и волонтерские инициативы",
              en: "VoloHero Connects Students and Volunteer Initiatives",
              uz: "VoloHero o'quvchilar va volontyor tashabbuslarini birlashtiradi",
            })}
          </h2>
          <p className="text-gray-600 font-medium leading-relaxed">
            {pick({
              ru: "Мы публикуем проверенные городские события, где можно помогать людям, природе и животным. Каждый участник может найти задачу рядом с собой и подключиться в пару кликов.",
              en: "We publish trusted local initiatives where you can support people, nature, and animals. Anyone can find a nearby activity and join in a few clicks.",
              uz: "Biz odamlar, tabiat va hayvonlarga yordam berish mumkin bo'lgan ishonchli tadbirlarni e'lon qilamiz. Har bir ishtirokchi yaqinidagi tashabbusni topib, bir necha bosishda qo'shilishi mumkin.",
            })}
          </p>
        </div>
      </section>

      {/* Направления помощи */}
      <section id="directions" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 uppercase italic tracking-tighter text-center mb-16">
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

      {/* Актуальные события */}
      <section id="events" className="py-24 bg-gray-50/50 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 uppercase italic tracking-tighter text-center mb-16">
            {pick({
              ru: <>Актуальные <span className="text-[#10b981]">события</span></>,
              en: <>Current <span className="text-[#10b981]">Events</span></>,
              uz: <>Dolzarb <span className="text-[#10b981]">tadbirlar</span></>,
            })}
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
