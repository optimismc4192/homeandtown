import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, MessageCircle, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useProperties } from '../store/PropertyContext';
import PropertyCard from '../components/PropertyCard';
import Logo from '../components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { Property } from '../types';

const PropertySlider = ({ title, subtitle, properties, icon, showVirtualTour }: { title: string, subtitle: string, properties: Property[], icon?: React.ReactNode, showVirtualTour?: boolean }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const totalPages = Math.ceil(properties.length / itemsPerPage);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (totalPages <= 1) return;
    
    timerRef.current = setInterval(() => {
      setCurrentPage(prev => (prev >= totalPages ? 1 : prev + 1));
    }, 3000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalPages]);

  const handleManualPageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentPage(prev => (prev >= totalPages ? 1 : prev + 1));
    }, 3000);
  };

  if (properties.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col gap-8"
    >
      <div className="flex items-end justify-between border-b border-zinc-200 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-light text-zinc-900 font-serif flex items-center gap-2">
            {icon} {title}
          </h2>
          <p className="text-[10px] md:text-xs text-zinc-500 tracking-widest uppercase mt-2">{subtitle}</p>
        </div>
        <button onClick={() => navigate('/map')} className="text-[10px] md:text-xs font-bold text-zinc-900 hover:text-zinc-500 uppercase tracking-widest transition-colors flex items-center gap-1">
          + 더보기
        </button>
      </div>

      <div className="overflow-hidden relative w-full pb-2">
        <div 
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${(currentPage - 1) * 100}%)` }}
        >
          {Array.from({ length: totalPages }).map((_, pageIndex) => {
            const pageItems = properties.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);
            return (
              <div key={pageIndex} className="w-full flex-shrink-0 px-0.5">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                  {pageItems.map((property, index) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <PropertyCard property={property} showVirtualTour={showVirtualTour} />
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => handleManualPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleManualPageChange(i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  currentPage === i + 1 
                    ? 'bg-zinc-900 text-white' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleManualPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-full border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </motion.section>
  );
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filterType, setFilterType] = useState('');
  const [filterHeating, setFilterHeating] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);

  const navigate = useNavigate();
  const { properties } = useProperties();

  const approvedProperties = useMemo(() => properties.filter(p => p.status !== 'pending'), [properties]);

  const popularProperties = useMemo(() => approvedProperties.filter(p => p.isPopular), [approvedProperties]);
  const latestProperties = useMemo(() => [...approvedProperties].sort((a, b) => b.id - a.id), [approvedProperties]);
  const virtualTourProperties = useMemo(() => approvedProperties.filter(p => p.virtualTourEmbed).sort((a, b) => b.id - a.id), [approvedProperties]);
  const premiumProperties = useMemo(() => approvedProperties.filter(p => p.curation?.includes('주목받는 프리미엄 분양 현장')), [approvedProperties]);
  const natureProperties = useMemo(() => approvedProperties.filter(p => p.curation?.includes('자연을 품은 넓은 마당')), [approvedProperties]);

  const searchResults = useMemo(() => {
    if (!activeSearch.trim() && !filterType && !filterHeating && !filterMinPrice && !filterMaxPrice) return [];
    
    let results = approvedProperties;

    // Text Search
    if (activeSearch.trim()) {
      const query = activeSearch.toLowerCase();
      results = results.filter(p => 
        p.title.toLowerCase().includes(query) || 
        p.location.toLowerCase().includes(query) || 
        p.tags.some(t => t.toLowerCase().includes(query)) || 
        p.heating.toLowerCase().includes(query)
      );
    }

    // Filters
    if (filterType) {
      results = results.filter(p => p.type === filterType);
    }
    if (filterHeating) {
      results = results.filter(p => p.heating.includes(filterHeating));
    }
    if (filterMinPrice) {
      const min = parseInt(filterMinPrice.replace(/[^0-9]/g, ''));
      if (!isNaN(min)) {
        results = results.filter(p => p.price >= min);
      }
    }
    if (filterMaxPrice) {
      const max = parseInt(filterMaxPrice.replace(/[^0-9]/g, ''));
      if (!isNaN(max)) {
        results = results.filter(p => p.price <= max);
      }
    }

    return results;
  }, [approvedProperties, activeSearch, filterType, filterHeating, filterMinPrice, filterMaxPrice]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterHeating('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setSearchQuery('');
    setActiveSearch('');
  };

  const isFiltering = activeSearch || filterType || filterHeating || filterMinPrice || filterMaxPrice;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-900">
      <Helmet>
        <title>타운앤전원 - 프리미엄 전원주택, 타운하우스, 단독주택 분양</title>
        <meta name="description" content="전국 각지의 엄선된 전원주택, 타운하우스, 단독주택 매물을 확인하세요. 가격, 면적, 난방 방식 등 다양한 필터로 맞춤 검색이 가능합니다." />
        <meta name="keywords" content="전원주택, 타운하우스, 단독주택, 부동산, 분양, 매매, 타운앤전원" />
        <link rel="canonical" href="https://www.townnhouse.com/" />
        <meta property="og:title" content="타운앤전원 - 프리미엄 전원주택, 타운하우스 분양" />
        <meta property="og:description" content="전국 각지의 엄선된 전원주택, 타운하우스, 단독주택 매물을 확인하세요." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.townnhouse.com/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="타운앤전원 - 프리미엄 전원주택, 타운하우스 분양" />
        <meta name="twitter:description" content="전국 각지의 엄선된 전원주택, 타운하우스, 단독주택 매물을 확인하세요." />
      </Helmet>
      {/* Hero Section */}
      <section className="relative min-h-[200px] h-[25vh] md:min-h-[260px] md:h-[30vh] flex items-center justify-center overflow-hidden bg-black">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop" 
          alt="Luxury Country Home" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-zinc-900"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center px-4 w-full max-w-4xl mt-2 md:mt-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-light text-white mb-1 md:mb-3 tracking-tight font-serif leading-tight md:leading-normal py-1"
          >
            당신이 찾는<br />전원단독주택의 모든정보
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-zinc-300 text-[8px] sm:text-[10px] md:text-sm tracking-[0.15em] md:tracking-[0.2em] uppercase font-medium mt-1 md:mt-0"
          >
            Town & Jeonwon Premier Curation
          </motion.p>
        </div>
      </section>

      {/* Search Section (Separate) */}
      <section className="bg-zinc-900 px-4 py-4 md:py-8 border-b border-zinc-800 relative z-20">
        <div className="max-w-4xl mx-auto">
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            onSubmit={handleSearch} 
            className="w-full relative group"
          >
            <div className="absolute inset-0 bg-white/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <input 
              type="text" 
              placeholder="지역명 또는 특징을 검색해보세요 (예: 파주, 도시가스)" 
              className="w-full bg-[#2A2A2A]/80 border border-zinc-700 text-white placeholder-zinc-500 px-6 py-5 rounded-sm focus:outline-none focus:border-zinc-500 focus:bg-[#333333]/90 transition-all backdrop-blur-md text-sm md:text-base relative z-10 shadow-2xl pr-24"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value === '') {
                  setActiveSearch('');
                }
              }}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
              <button 
                type="button" 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded transition-colors ${showFilters || filterType || filterHeating || filterMinPrice || filterMaxPrice ? 'text-white bg-zinc-700' : 'text-zinc-400 hover:text-white'}`}
              >
                <SlidersHorizontal size={20} />
              </button>
              <button type="submit" className="p-2 text-zinc-400 hover:text-white transition-colors">
                <Search size={20} />
              </button>
            </div>
          </motion.form>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 bg-[#2A2A2A] border border-zinc-700 rounded-sm p-4 md:p-6 shadow-xl overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">매물 종류</label>
                    <select 
                      value={filterType} 
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="">전체</option>
                      <option value="전원주택">전원주택</option>
                      <option value="타운하우스">타운하우스</option>
                      <option value="단독주택">단독주택</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">난방 방식</label>
                    <select 
                      value={filterHeating} 
                      onChange={(e) => setFilterHeating(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="">전체</option>
                      <option value="도시가스">도시가스</option>
                      <option value="지열보일러">지열보일러</option>
                      <option value="LPG">LPG</option>
                      <option value="기름보일러">기름보일러</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">최소 가격</label>
                    <select 
                      value={filterMinPrice} 
                      onChange={(e) => setFilterMinPrice(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="">제한없음</option>
                      <option value="30000">3억</option>
                      <option value="50000">5억</option>
                      <option value="70000">7억</option>
                      <option value="100000">10억</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">최대 가격</label>
                    <select 
                      value={filterMaxPrice} 
                      onChange={(e) => setFilterMaxPrice(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="">제한없음</option>
                      <option value="50000">5억</option>
                      <option value="70000">7억</option>
                      <option value="100000">10억</option>
                      <option value="150000">15억</option>
                      <option value="200000">20억</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button 
                    onClick={clearFilters}
                    className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                  >
                    초기화
                  </button>
                  <button 
                    onClick={() => {
                      setActiveSearch(searchQuery || ' '); // Trigger search
                      setShowFilters(false);
                    }}
                    className="px-6 py-2 bg-white text-zinc-900 text-xs font-bold rounded hover:bg-zinc-200 transition-colors"
                  >
                    필터 적용
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Content Area */}
      <div className="flex-grow bg-white px-4 md:px-8 py-16 md:py-24 flex flex-col gap-16 md:gap-32">
        {isFiltering ? (
          <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-serif text-zinc-900 flex items-center gap-2">
                검색 결과
                {(filterType || filterHeating || filterMinPrice || filterMaxPrice) && (
                  <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded font-sans">필터 적용됨</span>
                )}
              </h2>
              <span className="text-sm text-zinc-500">{searchResults.length}개의 매물</span>
            </div>
            
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-50 rounded-lg border border-zinc-200">
                <Search className="mx-auto text-zinc-300 mb-4" size={48} />
                <p className="text-zinc-500 text-lg">검색 결과가 없습니다.</p>
                <p className="text-zinc-400 text-sm mt-2">다른 검색어로 다시 시도해보세요.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {popularProperties.length > 0 && (
              <PropertySlider 
                title="인기 매물" 
                subtitle="Popular Properties" 
                properties={popularProperties} 
                icon={<span className="text-red-500">🔥</span>}
              />
            )}

            <PropertySlider 
              title="최신 매물" 
              subtitle="Latest Properties" 
              properties={latestProperties} 
              icon={<span className="text-blue-500">✨</span>}
            />

            <PropertySlider 
              title="360도 실제 매물보기 가능장소" 
              subtitle="360° Virtual Tour" 
              properties={virtualTourProperties} 
              icon={<span className="text-blue-600">🔄</span>}
              showVirtualTour={true}
            />

            <PropertySlider 
              title="주목받는 프리미엄 분양 현장" 
              subtitle="Premium Selections" 
              properties={premiumProperties} 
            />

            <PropertySlider 
              title="자연을 품은 넓은 마당" 
              subtitle="Nature & Space" 
              properties={natureProperties} 
            />
          </>
        )}
      </div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-zinc-50 border-t border-zinc-200 px-4 md:px-8 py-12 md:py-16"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          {/* Business Info */}
          <div className="flex-1">
            <h3 className="text-lg font-bold tracking-widest text-zinc-900 uppercase font-serif mb-6 flex items-center gap-2">
              <Logo className="h-6 md:h-8" />
            </h3>
            <div className="text-xs text-zinc-500 space-y-2 leading-relaxed">
              <p><strong className="text-zinc-700">상호명:</strong> 두디드던(DoDidDone)</p>
              <p><strong className="text-zinc-700">대표자명:</strong> 신민철</p>
              <p><strong className="text-zinc-700">사업자등록번호:</strong> 268-54-00889</p>
              <p><strong className="text-zinc-700">통신판매신고번호:</strong> 2025-경기하남-1663</p>
              <p><strong className="text-zinc-700">주소:</strong> 경기도 하남시 조정대로 85, 205-15호 (풍산동, 마이움트라이스타)</p>
              <p><strong className="text-zinc-700">전화번호:</strong> 010-3972-4518</p>
              <p><strong className="text-zinc-700">이메일:</strong> optimismc4192@gmail.com</p>
            </div>
          </div>

          {/* Ad Inquiry */}
          <div className="w-full md:w-80 flex flex-col justify-center">
            <h4 className="text-sm font-bold text-zinc-900 mb-4">광고 및 제휴 문의</h4>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowContactModal(true)}
                className="w-full bg-zinc-900 text-white py-4 px-6 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-3"
              >
                <Phone size={16} /> 전화 문의하기
              </button>
              <a 
                href="http://pf.kakao.com/_nqxdxhX/chat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-[#FEE500] text-[#000000] py-4 px-6 text-xs font-bold tracking-widest uppercase hover:bg-[#FEE500]/90 transition-colors flex items-center justify-center gap-3"
              >
                <MessageCircle size={16} /> 카카오톡 문의하기
              </a>
            </div>
          </div>
        </div>
      </motion.footer>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="text-zinc-900" size={32} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2 font-serif">전화 연결</h3>
                <p className="text-zinc-500 mb-6 text-sm">
                  010-3972-4518로 연결하시겠습니까?
                </p>
                <div className="flex flex-col gap-3">
                  <a 
                    href="tel:010-3972-4518"
                    target="_top"
                    className="w-full bg-zinc-900 text-white py-4 text-sm font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 rounded"
                  >
                    <Phone size={18} /> 연결
                  </a>
                  <button 
                    onClick={() => setShowContactModal(false)}
                    className="w-full bg-zinc-100 text-zinc-600 py-4 text-sm font-bold tracking-widest uppercase hover:bg-zinc-200 transition-colors rounded"
                  >
                    취소
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
