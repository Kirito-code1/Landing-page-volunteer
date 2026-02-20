import React from "react";
import Image from "next/image";

interface EventCardProps {
  image: string;
  category: string;
  title: string;
  description: string;
  date: string;
  location: string;
}

export default function EventCard({
  image,
  category,
  title,
  description,
  date,
  location,
}: EventCardProps) {
  return (
    <div className="flex flex-col w-full max-w-[350px] bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Изображение */}
      <div className="relative w-full h-[220px] p-3">
        <div className="relative w-full h-full overflow-hidden rounded-[18px]">
          <Image
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            width={320}
            height={220}
          />
        </div>
      </div>

      {/* Контент */}
      <div className="px-5 pb-6 pt-2 flex flex-col gap-3">
        {/* Бейдж категории */}
        <div>
          <span className="inline-block px-4 py-1.5 bg-[#10b981] text-white text-sm font-medium rounded-full">
            {category}
          </span>
        </div>

        {/* Заголовок */}
        <h3 className="text-[22px] font-bold text-gray-900 leading-tight">
          {title}
        </h3>

        {/* Описание */}
        <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
          {description}
        </p>

        {/* Дата и Место */}
        <div className="mt-2 flex flex-col gap-1">
          <p className="text-gray-400 text-[14px]">{date}</p>
          <p className="text-gray-400 text-[14px]">{location}</p>
        </div>
      </div>
    </div>
  );
}
