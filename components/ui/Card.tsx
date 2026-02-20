"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";

// Обязательно экспортируем интерфейс, чтобы он был виден в page.tsx
export interface CategoryCardProps {
  title: string;
  category: string;
  icon: IconDefinition;
  blobColor: string;
}

export default function CategoryCard({ title, category, icon, blobColor }: CategoryCardProps) {
  return (
    <div className="relative p-8 bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 w-full max-w-[280px]">
      {/* Декоративный фоновый круг */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${blobColor}`} />
      
      {/* Иконка */}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${blobColor} bg-opacity-20`}>
        <FontAwesomeIcon icon={icon} className="text-2xl text-gray-800" />
      </div>
      
      <h3 className="font-black text-gray-900 text-xl mb-1 uppercase italic tracking-tighter">{title}</h3>
      <p className="text-sm font-bold text-gray-400">{category}</p>
    </div>
  );
}