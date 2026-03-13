import React from 'react';
import { X, Check } from 'lucide-react';
import { Property } from '../types';
import { useProperties } from '../store/PropertyContext';
import { Link } from 'react-router-dom';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CompareModal({ isOpen, onClose }: CompareModalProps) {
  const { compareList, toggleCompareProperty } = useProperties();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <h2 className="text-xl font-serif text-zinc-900">매물 비교하기</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {compareList.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              비교할 매물이 없습니다. 매물 카드에서 비교하기 버튼을 눌러 추가해주세요.
            </div>
          ) : (
            <div className="min-w-[600px] grid" style={{ gridTemplateColumns: `120px repeat(${compareList.length}, minmax(200px, 1fr))` }}>
              {/* Header Row */}
              <div className="font-bold text-zinc-400 text-xs uppercase tracking-widest py-4 border-b border-zinc-200"></div>
              {compareList.map(property => (
                <div key={property.id} className="p-4 border-b border-zinc-200 relative group">
                  <button 
                    onClick={() => toggleCompareProperty(property)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full text-zinc-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                  <div className="aspect-video mb-3 rounded overflow-hidden">
                    <img src={property.thumbnail} alt={property.title} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-medium text-zinc-900 text-sm line-clamp-2">{property.title}</h3>
                  <Link to={`/property/${property.id}`} className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline">
                    상세보기
                  </Link>
                </div>
              ))}

              {/* Price Row */}
              <div className="font-bold text-zinc-400 text-xs uppercase tracking-widest py-4 border-b border-zinc-100 flex items-center">매매가</div>
              {compareList.map(property => (
                <div key={`price-${property.id}`} className="p-4 border-b border-zinc-100 font-bold text-zinc-900">
                  {property.priceStr}
                </div>
              ))}

              {/* Type Row */}
              <div className="font-bold text-zinc-400 text-xs uppercase tracking-widest py-4 border-b border-zinc-100 flex items-center">매물 종류</div>
              {compareList.map(property => (
                <div key={`type-${property.id}`} className="p-4 border-b border-zinc-100 text-sm text-zinc-700">
                  {property.type}
                </div>
              ))}

              {/* Location Row */}
              <div className="font-bold text-zinc-400 text-xs uppercase tracking-widest py-4 border-b border-zinc-100 flex items-center">위치</div>
              {compareList.map(property => (
                <div key={`loc-${property.id}`} className="p-4 border-b border-zinc-100 text-sm text-zinc-700">
                  {property.location}
                </div>
              ))}

              {/* Area Row */}
              <div className="font-bold text-zinc-400 text-xs uppercase tracking-widest py-4 border-b border-zinc-100 flex items-center">면적</div>
              {compareList.map(property => (
                <div key={`area-${property.id}`} className="p-4 border-b border-zinc-100 text-sm text-zinc-700 space-y-1">
                  <div><span className="text-zinc-400 text-xs">대지:</span> {property.landArea}</div>
                  <div><span className="text-zinc-400 text-xs">건축:</span> {property.buildArea}</div>
                </div>
              ))}

              {/* Heating Row */}
              <div className="font-bold text-zinc-400 text-xs uppercase tracking-widest py-4 border-b border-zinc-100 flex items-center">난방</div>
              {compareList.map(property => (
                <div key={`heat-${property.id}`} className="p-4 border-b border-zinc-100 text-sm text-zinc-700">
                  {property.heating}
                </div>
              ))}

              {/* Features Row */}
              <div className="font-bold text-zinc-400 text-xs uppercase tracking-widest py-4 border-b border-zinc-100 flex items-center">특징</div>
              {compareList.map(property => (
                <div key={`feat-${property.id}`} className="p-4 border-b border-zinc-100 text-sm text-zinc-700">
                  <div className="flex flex-wrap gap-1">
                    {property.tags.map((tag, idx) => (
                      <span key={idx} className="bg-zinc-100 px-2 py-0.5 rounded text-xs text-zinc-600">#{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
