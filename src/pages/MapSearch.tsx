import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, Filter } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useProperties } from '../store/PropertyContext';
import PropertyCard from '../components/PropertyCard';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { REGION_DATA } from '../data/regions';

// Fix Leaflet's default icon path issues with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map center updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function MapSearch() {
  const { properties } = useProperties();
  const location = useLocation();
  const navigate = useNavigate();
  
  const queryParams = new URLSearchParams(location.search);
  const initialQuery = queryParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState('전체');
  const [priceFilter, setPriceFilter] = useState('전체');
  const [heatingFilter, setHeatingFilter] = useState('전체');
  const [majorRegionFilter, setMajorRegionFilter] = useState('전체');
  const [minorRegionFilter, setMinorRegionFilter] = useState('전체');
  const [areaFilter, setAreaFilter] = useState('전체');
  const [floorFilter, setFloorFilter] = useState('전체');
  const [hoveredPropertyId, setHoveredPropertyId] = useState<number | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  const filteredProperties = useMemo(() => {
    const approvedProperties = properties.filter(p => p.status !== 'pending');
    return approvedProperties.filter(p => {
      // Text search
      const matchesSearch = p.title.includes(searchQuery) || p.location.includes(searchQuery) || p.tags.some(t => t.includes(searchQuery)) || p.heating.includes(searchQuery);
      
      // Type filter
      const matchesType = typeFilter === '전체' || p.type === typeFilter;
      
      // Price filter
      let matchesPrice = true;
      if (priceFilter === '5억 이하') matchesPrice = p.priceNum <= 50000;
      else if (priceFilter === '5억~7억') matchesPrice = p.priceNum > 50000 && p.priceNum <= 70000;
      else if (priceFilter === '7억 이상') matchesPrice = p.priceNum > 70000;

      // Heating filter
      const matchesHeating = heatingFilter === '전체' || p.heating.includes(heatingFilter);

      // Region filter
      let matchesRegion = true;
      if (majorRegionFilter !== '전체') {
        if (minorRegionFilter !== '전체') {
          matchesRegion = p.region === `${majorRegionFilter} ${minorRegionFilter}` || p.region.includes(minorRegionFilter);
        } else {
          matchesRegion = p.region.startsWith(majorRegionFilter) || REGION_DATA[majorRegionFilter]?.some(minor => p.region.includes(minor));
        }
      }

      // Area filter (buildAreaNum)
      let matchesArea = true;
      if (areaFilter === '40평 이하') matchesArea = p.buildAreaNum <= 40;
      else if (areaFilter === '40평~60평') matchesArea = p.buildAreaNum > 40 && p.buildAreaNum <= 60;
      else if (areaFilter === '60평 이상') matchesArea = p.buildAreaNum > 60;

      // Floor filter
      let matchesFloor = true;
      if (floorFilter === '1층') matchesFloor = p.floors === 1;
      else if (floorFilter === '2층') matchesFloor = p.floors === 2;
      else if (floorFilter === '3층 이상') matchesFloor = p.floors >= 3;

      return matchesSearch && matchesType && matchesPrice && matchesHeating && matchesRegion && matchesArea && matchesFloor;
    });
  }, [properties, searchQuery, typeFilter, priceFilter, heatingFilter, majorRegionFilter, minorRegionFilter, areaFilter, floorFilter]);

  return (
    <div className="flex-1 w-full h-full min-h-0 flex flex-col md:flex-row bg-white">
      <Helmet>
        <title>지도에서 매물 찾기 | 전원주택, 단독주택, 타운하우스</title>
        <meta name="description" content="지도에서 원하는 지역의 전원주택, 단독주택, 타운하우스를 쉽게 찾아보세요. 가격, 면적, 난방 방식 등 다양한 필터로 맞춤 검색이 가능합니다." />
      </Helmet>
      {/* Left Sidebar: Filters & List */}
      <div className="w-full md:w-[420px] flex-shrink-0 border-b md:border-b-0 md:border-r border-zinc-200 flex flex-col h-[60vh] md:h-full bg-white z-10 shadow-none md:shadow-xl order-2 md:order-1">
        {/* Filters */}
        <div className="p-4 md:p-6 border-b border-zinc-200 bg-zinc-50/50 overflow-y-auto max-h-[30vh] md:max-h-[50vh]">
          <div className="relative mb-6">
            <input 
              type="text" 
              placeholder="지역명, 현장명, 특징 검색" 
              className="w-full bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">거래 형태</label>
              <div className="flex gap-2">
                {['전체', '분양', '매매'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`flex-1 py-2 text-xs font-medium border transition-colors ${typeFilter === type ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">대분류</label>
                  <select 
                    value={majorRegionFilter}
                    onChange={(e) => {
                      setMajorRegionFilter(e.target.value);
                      setMinorRegionFilter('전체');
                    }}
                    className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2 text-xs focus:outline-none focus:border-zinc-900"
                  >
                    <option value="전체">전체 지역</option>
                    {Object.keys(REGION_DATA).map(major => (
                      <option key={major} value={major}>{major}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">하위분류</label>
                  <select 
                    value={minorRegionFilter}
                    onChange={(e) => setMinorRegionFilter(e.target.value)}
                    disabled={majorRegionFilter === '전체'}
                    className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2 text-xs focus:outline-none focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-400"
                  >
                    <option value="전체">전체</option>
                    {majorRegionFilter !== '전체' && REGION_DATA[majorRegionFilter]?.map(minor => (
                      <option key={minor} value={minor}>{minor}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">가격대</label>
                <select 
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2 text-xs focus:outline-none focus:border-zinc-900"
                >
                  <option value="전체">전체 가격</option>
                  <option value="5억 이하">5억 이하</option>
                  <option value="5억~7억">5억~7억</option>
                  <option value="7억 이상">7억 이상</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">실사용 면적</label>
                <select 
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2 text-xs focus:outline-none focus:border-zinc-900"
                >
                  <option value="전체">전체 평수</option>
                  <option value="40평 이하">40평 이하</option>
                  <option value="40평~60평">40평~60평</option>
                  <option value="60평 이상">60평 이상</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">층수</label>
                <select 
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2 text-xs focus:outline-none focus:border-zinc-900"
                >
                  <option value="전체">전체 층수</option>
                  <option value="1층">1층</option>
                  <option value="2층">2층</option>
                  <option value="3층 이상">3층 이상</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">난방 방식</label>
                <select 
                  value={heatingFilter}
                  onChange={(e) => setHeatingFilter(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2 text-xs focus:outline-none focus:border-zinc-900"
                >
                  <option value="전체">전체 방식</option>
                  <option value="도시가스">도시가스</option>
                  <option value="LPG">LPG / 기름</option>
                  <option value="지열보일러">지열보일러</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">
            {filteredProperties.length} Properties Found
          </div>
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            {filteredProperties.map(property => (
              <div 
                key={property.id} 
                onMouseEnter={() => setHoveredPropertyId(property.id)}
                onMouseLeave={() => setHoveredPropertyId(null)}
              >
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
          {filteredProperties.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-sm">
              조건에 맞는 매물이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Map */}
      <div className="w-full h-[40vh] md:h-full md:flex-1 relative bg-[#f8f9fa] overflow-hidden order-1 md:order-2 z-0">
        <MapContainer 
          center={
            filteredProperties.length > 0 
              ? [filteredProperties[0].coords.x, filteredProperties[0].coords.y] 
              : [37.5665, 126.9780]
          } 
          zoom={10} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredProperties.length > 0 && (
            <MapUpdater center={[filteredProperties[0].coords.x, filteredProperties[0].coords.y]} />
          )}
          
          {filteredProperties.map(property => {
            const isHovered = hoveredPropertyId === property.id;
            
            // Create a custom icon for each marker to support hover state
            const customIcon = L.divIcon({
              className: 'custom-marker',
              html: `<div class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg overflow-hidden border-2 border-white ${isHovered ? 'scale-125 z-50' : 'scale-100 z-10'}"><img src="${property.thumbnail}" class="w-full h-full object-cover" /></div>`,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              popupAnchor: [0, -20],
            });

            return (
              <Marker 
                key={property.id} 
                position={[property.coords.x, property.coords.y]}
                icon={customIcon}
                eventHandlers={{
                  mouseover: () => setHoveredPropertyId(property.id),
                  mouseout: () => setHoveredPropertyId(null),
                  click: () => navigate(`/property/${property.id}`)
                }}
              >
                <Popup className="custom-popup">
                  <div className="w-48 cursor-pointer" onClick={() => navigate(`/property/${property.id}`)}>
                    <div className="aspect-video w-full overflow-hidden bg-zinc-100 rounded-t-md relative">
                      <img src={property.thumbnail} alt="" className="w-full h-full object-cover" />
                      {property.isPopular && (
                        <div className="absolute top-1 left-1">
                          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold tracking-widest uppercase shadow-sm">
                            인기매물
                          </span>
                        </div>
                      )}
                      {property.isClosingSoon && (
                        <div className="absolute top-1 right-1">
                          <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold tracking-widest uppercase shadow-sm">
                            마감임박
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-bold text-zinc-900 mb-1 truncate">{property.title}</div>
                      <div className="text-xs text-zinc-500">{property.priceStr}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
