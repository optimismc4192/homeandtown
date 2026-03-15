import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, PlusSquare, CheckSquare } from 'lucide-react';
import { Property } from '../types';
import { useProperties } from '../store/PropertyContext';

export default function PropertyCard({ property }: { property: Property; key?: React.Key }) {
  const { compareList, toggleCompareProperty } = useProperties();
  const navigate = useNavigate();
  const isCompared = compareList.some(p => p.id === property.id);

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompareProperty(property);
  };

  const handleCardClick = () => {
    navigate(`/property/${property.id}`);
  };

  return (
    <div onClick={handleCardClick} className="group block cursor-pointer">
      <div className="relative aspect-video overflow-hidden bg-zinc-100 border border-zinc-200">
        <img 
          src={property.thumbnail} 
          alt={property.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Play className="text-white fill-white ml-0.5" size={16} />
          </div>
        </div>
        <div className="absolute top-2 left-2 flex flex-nowrap whitespace-nowrap gap-1 pr-2 overflow-hidden max-w-[calc(100%-16px)]">
          <span className="px-1.5 py-0.5 bg-zinc-900 text-white text-[9px] font-bold tracking-widest uppercase shrink-0">
            {property.type}
          </span>
          {property.isPopular && (
            <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold tracking-widest uppercase shadow-sm shrink-0">
              인기매물
            </span>
          )}
          {property.isClosingSoon && (
            <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold tracking-widest uppercase shadow-sm shrink-0">
              마감임박
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-medium text-zinc-900 truncate pr-2">{property.title}</h3>
          <span className="text-[11px] font-bold text-zinc-900 whitespace-nowrap">{property.priceStr}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex gap-1 text-[10px] text-zinc-500 truncate pr-2">
            {property.tags.slice(0, 2).map((tag, idx) => (
              <span key={idx} className="truncate">#{tag}</span>
            ))}
          </div>
          <button 
            onClick={handleCompareClick}
            className={`shrink-0 px-1.5 py-0.5 rounded border transition-all flex items-center gap-1 ${
              isCompared 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
            title={isCompared ? "비교 해제" : "비교하기"}
          >
            {isCompared ? <CheckSquare size={10} /> : <PlusSquare size={10} />}
            <span className="text-[9px] font-bold tracking-widest">{isCompared ? '비교중' : '비교하기'}</span>
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed break-all">
          {property.description?.replace(/\\n/g, ' ')}
        </p>
      </div>
    </div>
  );
}
