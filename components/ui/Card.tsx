import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface CategoryCardProps {
  title: string;
  category: string;
  icon: IconDefinition;
  blobColor?: string;
}

export default function CategoryCard({
  title,
  category,
  icon,
  blobColor = "bg-green-400",
}: CategoryCardProps) {
  return (
    // Теперь ширина гибкая (w-full), но ограничена max-w-[320px]
    <div className="relative w-full max-w-[320px] h-[220px] rounded-[20px] z-10 overflow-hidden flex flex-col items-center justify-center bg-white shadow-[15px_15px_40px_#bebebe,-15px_-15px_40px_#ffffff]">
      {/* Анимированное пятно (Blob) */}
      <div
        className={`absolute z-1 top-1/2 left-1/2 w-[200px] h-[200px] rounded-full opacity-60 blur-[15px] animate-blob-bounce ${blobColor}`}
      ></div>

      {/* Стеклянный слой */}
      <div className="absolute inset-[6px] z-2 bg-white/90 backdrop-blur-[20px] rounded-[16px] outline outline-2 outline-white flex items-center p-6 gap-6">
        {/* Иконка слева */}
        <div className="flex-shrink-0 w-16 h-16 bg-white/50 rounded-2xl flex items-center justify-center shadow-sm border border-white">
          <FontAwesomeIcon icon={icon} className="text-green-600 text-2xl" />
        </div>

        {/* Текст справа */}
        <div className="text-left">
          <h3 className="text-gray-900 font-bold text-xl leading-tight tracking-tight">
            {title}
          </h3>
          <p className="text-green-600 text-xs mt-1 uppercase tracking-widest font-bold opacity-80">
            {category}
          </p>
          <div className="mt-3 w-8 h-1 bg-green-500/30 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
