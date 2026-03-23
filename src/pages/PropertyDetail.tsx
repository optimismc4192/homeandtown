import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Phone, Calendar, MapPin, Maximize, Flame, Car, TreePine, MessageCircle, Layers, Share2, Copy } from 'lucide-react';
import { useProperties } from '../store/PropertyContext';
import { useAuth } from '../store/AuthContext';
import Logo from '../components/Logo';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { properties, addReservation, addRecentProperty } = useProperties();
  const { isAuthenticated } = useAuth();
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [contactModalNumber, setContactModalNumber] = useState<string | null>(null);

  const property = properties.find(p => p.id === Number(id) && (p.status !== 'pending' || isAuthenticated));

  useEffect(() => {
    if (property) {
      addRecentProperty(property);
    }
  }, [property?.id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: property?.description,
          url: url,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  const handleReservationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!property) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string;
    const message = formData.get('message') as string;

    addReservation({
      id: Date.now(),
      propertyId: property.id,
      propertyTitle: property.title,
      name,
      phone,
      date,
      time,
      message,
      createdAt: new Date().toISOString(),
      status: '대기중'
    });

    setShowReservationModal(false);
    alert('예약이 성공적으로 접수되었습니다. 관리자가 확인 후 연락드리겠습니다.');
  };

  if (!property) {
    return <div className="p-8 text-center text-zinc-500">Property not found</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white">
      <Helmet>
        <title>{property.title} | 타운앤전원</title>
        <meta name="description" content={`${property.location}에 위치한 ${property.type} 매물입니다. 가격: ${property.priceStr}, 면적: ${property.buildArea}. ${property.description?.replace(/\\n/g, ' ').substring(0, 100)}...`} />
        <meta name="keywords" content={`${property.location} 전원주택, ${property.location} 타운하우스, ${property.type}, 부동산, 분양, 매매`} />
        <link rel="canonical" href={`https://www.townnhouse.com/property/${property.id}`} />
        <meta property="og:title" content={`${property.title} | 타운앤전원`} />
        <meta property="og:description" content={`${property.location}에 위치한 ${property.type} 매물입니다. 가격: ${property.priceStr}, 면적: ${property.buildArea}.`} />
        <meta property="og:image" content={property.thumbnail} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://www.townnhouse.com/property/${property.id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${property.title} | 타운앤전원`} />
        <meta name="twitter:description" content={`${property.location}에 위치한 ${property.type} 매물입니다. 가격: ${property.priceStr}, 면적: ${property.buildArea}.`} />
        <meta name="twitter:image" content={property.thumbnail} />
      </Helmet>
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-zinc-900 transition-colors shrink-0">
            <ArrowLeft size={20} className="md:w-6 md:h-6" />
          </button>
          <div className="flex flex-nowrap whitespace-nowrap gap-1 shrink-0">
            <span className="px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold tracking-widest uppercase shrink-0">
              {property.type}
            </span>
            {property.isPopular && (
              <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase shrink-0">
                인기매물
              </span>
            )}
            {property.isClosingSoon && (
              <span className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold tracking-widest uppercase shrink-0">
                마감임박
              </span>
            )}
          </div>
          <h1 className="text-sm md:text-lg font-medium text-zinc-900 truncate max-w-[150px] md:max-w-md">{property.title}</h1>
        </div>
        <div className="flex gap-4 relative">
          <button onClick={handleShare} className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 hover:text-zinc-900 uppercase transition-colors flex items-center gap-2">
            <Share2 size={16} /> Share
          </button>
          {showShareToast && (
            <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-zinc-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
              링크가 복사되었습니다
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Video Player (16:9) */}
        <div className="w-full aspect-video bg-zinc-900">
          <iframe 
            width="100%" 
            height="100%" 
            src={`https://www.youtube.com/embed/${property.youtubeId}?autoplay=1&mute=1`} 
            title="YouTube video player" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
            className="w-full h-full"
          ></iframe>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col lg:flex-row gap-8 md:gap-16">
          
          {/* Left: Overview */}
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-light text-zinc-900 font-serif mb-4 md:mb-6">{property.title}</h2>
            <div className="flex flex-wrap gap-2 mb-6 md:mb-8">
              {property.tags.map((tag, idx) => (
                <span key={idx} className="text-[10px] md:text-xs font-medium text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Image Gallery */}
            {property.images && property.images.length > 0 && (
              <div className="mb-12">
                <h3 className="text-base md:text-lg font-medium text-zinc-900 border-b border-zinc-200 pb-2 mb-4 font-serif">Gallery</h3>
                <div className="flex flex-col gap-8">
                  {property.images.map((img, idx) => (
                    <div key={idx} className="w-full flex items-center justify-center">
                      <img src={img} alt={`Property view ${idx + 1}`} className="w-full h-auto object-contain" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="prose prose-zinc max-w-none text-sm md:text-base mb-12">
              <h3 className="text-base md:text-lg font-medium text-zinc-900 border-b border-zinc-200 pb-2 mb-4 font-serif">Overview</h3>
              
              {property.overviewImages && property.overviewImages.length > 0 && (
                <div className="mb-8 space-y-8">
                  {property.overviewImages.map((img, idx) => (
                    <div key={idx} className="w-full flex items-center justify-center">
                      <img src={img} alt={`Overview ${idx + 1}`} className="w-full h-auto object-contain" />
                    </div>
                  ))}
                </div>
              )}

              <div className="text-zinc-600 leading-relaxed break-all whitespace-pre-wrap">
                {property.description?.split(/\\n|\n/)?.map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Map Section */}
            <div className="mb-12">
              <h3 className="text-base md:text-lg font-medium text-zinc-900 border-b border-zinc-200 pb-2 mb-4 font-serif">위치 (Location)</h3>
              <div className="w-full h-[300px] md:h-[400px] bg-zinc-100 rounded-md overflow-hidden z-0 relative">
                <MapContainer 
                  center={[property.coords.x, property.coords.y]} 
                  zoom={14} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker 
                    position={[property.coords.x, property.coords.y]}
                    icon={L.divIcon({
                      className: 'custom-marker',
                      html: `<div class="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" stroke="white"/></svg></div>`,
                      iconSize: [32, 32],
                      iconAnchor: [16, 32],
                    })}
                  />
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Right: Specifications Sidebar */}
          <div className="w-full lg:w-[400px] flex-shrink-0">
            <div className="sticky top-24 bg-zinc-50 border border-zinc-200 p-6 md:p-8">
              <div className="mb-6 md:mb-8">
                <p className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">Price</p>
                <div className="text-2xl md:text-3xl font-light text-zinc-900 font-serif">{property.priceStr}</div>
                <p className="text-[10px] text-zinc-400 mt-2">* 실투자금 개별 상담 안내</p>
              </div>

              <div className="space-y-4 md:space-y-6 mb-8 md:mb-10">
                <div className="flex items-start gap-3 md:gap-4">
                  <MapPin className="text-zinc-400 mt-1" size={18} />
                  <div>
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">위치 (Location)</p>
                    <p className="text-xs md:text-sm text-zinc-900">{property.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <Maximize className="text-zinc-400 mt-1" size={18} />
                  <div>
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">면적 (Area)</p>
                    <p className="text-xs md:text-sm text-zinc-900">대지 {property.landArea} / 연면적 {property.buildArea}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <Layers className="text-zinc-400 mt-1" size={18} />
                  <div>
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">층수 (Floors)</p>
                    <p className="text-xs md:text-sm text-zinc-900">{property.floors}층</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <Flame className="text-zinc-400 mt-1" size={18} />
                  <div>
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">난방 (Heating)</p>
                    <p className="text-xs md:text-sm text-zinc-900">{property.heating}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <Car className="text-zinc-400 mt-1" size={18} />
                  <div>
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">주차 (Parking)</p>
                    <p className="text-xs md:text-sm text-zinc-900">{property.parking}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <TreePine className="text-zinc-400 mt-1" size={18} />
                  <div>
                    <p className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">마당/테라스 (Yard/Terrace)</p>
                    <p className="text-xs md:text-sm text-zinc-900">{property.yard}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button onClick={() => setContactModalNumber(property.contact || '010-3972-4518')} className="w-full bg-zinc-900 text-white py-3 md:py-4 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                  <Phone size={16} /> 연락처 보기
                </button>
                <button 
                  onClick={() => setShowReservationModal(true)}
                  className="w-full bg-white text-zinc-900 border border-zinc-900 py-3 md:py-4 text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar size={16} /> 현장 방문 예약
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-zinc-50 border-t border-zinc-200 px-4 md:px-8 py-12 md:py-16 mt-8 md:mt-12">
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
                  onClick={() => setContactModalNumber('010-3972-4518')}
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
        </footer>
      </div>

      {/* Reservation Modal */}
      <AnimatePresence>
        {showReservationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowReservationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-light text-zinc-900 font-serif mb-2">현장 방문 예약</h3>
              <p className="text-sm text-zinc-500 mb-6">담당자가 확인 후 연락드리겠습니다.</p>
              
              <form className="space-y-4" onSubmit={handleReservationSubmit}>
                <div>
                  <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">성함</label>
                  <input type="text" name="name" required className="w-full border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900" />
                </div>
                <div>
                  <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">연락처</label>
                  <input type="tel" name="phone" required className="w-full border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900" />
                </div>
                <div>
                  <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">방문 희망일 및 시간</label>
                  <div className="flex gap-2">
                    <input type="date" name="date" required className="w-full border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900" />
                    <input type="time" name="time" required className="w-full border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">문의사항 (선택)</label>
                  <textarea name="message" rows={3} placeholder="궁금하신 점이나 요청사항을 남겨주세요." className="w-full border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-zinc-900 resize-none"></textarea>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowReservationModal(false)} className="flex-1 py-3 text-xs font-bold tracking-widest text-zinc-500 uppercase border border-zinc-200 hover:bg-zinc-50">
                    취소
                  </button>
                  <button type="submit" className="flex-1 py-3 text-xs font-bold tracking-widest text-white uppercase bg-zinc-900 hover:bg-zinc-800">
                    예약 신청
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {contactModalNumber && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setContactModalNumber(null)}
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
                  {contactModalNumber}로 연결하시겠습니까?
                </p>
                <div className="flex flex-col gap-3">
                  <a 
                    href={`tel:${contactModalNumber}`}
                    target="_top"
                    className="w-full bg-zinc-900 text-white py-4 text-sm font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 rounded"
                  >
                    <Phone size={18} /> 연결
                  </a>
                  <button 
                    onClick={() => setContactModalNumber(null)}
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
