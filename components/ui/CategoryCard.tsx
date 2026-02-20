"use client";

import React from "react";

export interface EventCardProps {
  image: string;
  category: string;
  title: string;
  description: string;
  date: string;
  location: string;
}

export default function EventCard({ image, category, title, description, date, location }: EventCardProps) {
  return (
    <div className="w-full max-w-[320px] bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden hover:shadow-2xl transition-all duration-500 group">
      {/* Изображение */}
      <div className="relative h-56 w-full overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-2xl text-xs font-black text-gray-900 uppercase tracking-wider">
          {category}
        </div>
      </div>
      
      {/* Контент */}
      <div className="p-8">
        <h3 className="font-black text-xl text-gray-900 mb-3 leading-tight line-clamp-2 uppercase italic italic tracking-tighter">
          {title}
        </h3>
        <p className="text-gray-500 text-sm font-medium mb-6 line-clamp-2 leading-relaxed">
          {description}
        </p>
        
        <div className="space-y-2 border-t border-gray-50 pt-4">
          <div className="flex items-center text-[13px] font-bold text-gray-400">
            <span className="mr-2 text-[#10b981]">📅</span> {date}
          </div>
          <div className="flex items-center text-[13px] font-bold text-gray-400">
            <span className="mr-2 text-[#10b981]">📍</span> {location}
          </div>
        </div>
      </div>
    </div>
  );
}