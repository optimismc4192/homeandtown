import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Search, Eye, EyeOff, Star, Calendar, CheckCircle, LogOut } from 'lucide-react';
import { useProperties } from '../store/PropertyContext';
import { useAuth } from '../store/AuthContext';
import { motion } from 'motion/react';

export default function Admin() {
  const { properties, deleteProperty, togglePopular, toggleClosingSoon, toggleVisibility, approveProperty, reservations, updateReservationStatus, deleteReservation } = useProperties();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'properties' | 'reservations' | 'approvals'>('properties');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; onConfirm: () => void } | null>(null);

  const activeProperties = properties.filter(p => p.status !== 'pending');
  const pendingProperties = properties.filter(p => p.status === 'pending');

  const filteredProperties = activeProperties.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: number, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: `'${title}' 매물을 정말 삭제하시겠습니까?`,
      onConfirm: () => {
        deleteProperty(id);
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteReservation = (id: number, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: `${name}님의 예약을 정말 삭제하시겠습니까?`,
      onConfirm: () => {
        deleteReservation(id);
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 overflow-y-auto">
      <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 font-serif">관리자 페이지</h1>
            <p className="text-sm text-zinc-500 mt-2">매물 및 방문 예약을 통합 관리할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="bg-white text-zinc-900 border border-zinc-200 px-4 py-3 text-sm font-bold tracking-widest uppercase hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <LogOut size={18} /> 로그아웃
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="bg-zinc-900 text-white px-6 py-3 text-sm font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Plus size={18} /> 신규 매물 등록
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 mb-6">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-6 py-3 text-sm font-bold tracking-widest uppercase transition-colors border-b-2 ${
              activeTab === 'properties' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            매물 관리
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-6 py-3 text-sm font-bold tracking-widest uppercase transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'reservations' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            방문 예약 관리
            {reservations.filter(r => r.status === '대기중').length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {reservations.filter(r => r.status === '대기중').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-6 py-3 text-sm font-bold tracking-widest uppercase transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'approvals' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            승인 요청
            {pendingProperties.length > 0 && (
              <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {pendingProperties.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'properties' && (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-zinc-800">전체 매물 목록 <span className="text-zinc-400 font-normal text-sm ml-2">총 {filteredProperties.length}건</span></h2>
              <div className="relative w-full md:w-72">
                <input 
                  type="text" 
                  placeholder="매물명 또는 지역 검색..." 
                  className="w-full bg-zinc-100 border-none text-zinc-800 placeholder-zinc-400 px-4 py-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="p-4 font-semibold text-center w-16">인기</th>
                    <th className="p-4 font-semibold w-full">매물 정보</th>
                    <th className="p-4 font-semibold w-28">가격</th>
                    <th className="p-4 font-semibold hidden md:table-cell w-32">면적 (대지/건축)</th>
                    <th className="p-4 font-semibold hidden lg:table-cell w-24">유형</th>
                    <th className="p-4 font-semibold text-right w-[200px]">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProperties.length > 0 ? (
                    filteredProperties.map((property) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={property.id} 
                        className="hover:bg-zinc-50 transition-colors group"
                      >
                        <td className="p-4 text-center">
                          <div className="flex flex-col gap-1 items-center">
                            <button 
                              onClick={() => togglePopular(property.id)}
                              className={`p-1.5 rounded-md transition-colors ${property.isPopular ? 'text-yellow-500 hover:bg-yellow-50' : 'text-zinc-300 hover:text-yellow-500 hover:bg-zinc-100'}`}
                              title={property.isPopular ? "인기 매물 해제" : "인기 매물 지정 (최대 4개)"}
                            >
                              <Star size={18} fill={property.isPopular ? "currentColor" : "none"} />
                            </button>
                            <button 
                              onClick={() => toggleClosingSoon(property.id)}
                              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors font-bold ${property.isClosingSoon ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-zinc-100 text-zinc-400 hover:bg-emerald-100 hover:text-emerald-600'}`}
                              title={property.isClosingSoon ? "마감임박 해제" : "마감임박 지정"}
                            >
                              마감
                            </button>
                          </div>
                        </td>
                        <td className="p-4 max-w-0 w-full">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-12 rounded overflow-hidden bg-zinc-200 flex-shrink-0">
                              <img src={property.thumbnail} alt={property.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              {(property.isPopular || property.isClosingSoon || (property.curation && property.curation.length > 0)) && (
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  {property.isPopular && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold flex-shrink-0">인기</span>}
                                  {property.isClosingSoon && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold flex-shrink-0">마감임박</span>}
                                  {property.curation && property.curation.length > 0 && (
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap flex-shrink-0">
                                      {property.curation[0]}
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="font-bold text-zinc-900 text-sm truncate w-full mb-0.5">
                                {property.title}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-zinc-500 line-clamp-1">{property.location}</p>
                                {property.status === 'pending' && (
                                  <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap">
                                    비공개
                                  </span>
                                )}
                              </div>
                              {property.contact && (
                                <p className="text-xs text-blue-600 mt-0.5 font-medium">연락처: {property.contact}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-zinc-900 text-sm whitespace-nowrap">{property.priceStr}</span>
                        </td>
                        <td className="p-4 hidden md:table-cell text-sm text-zinc-600">
                          {property.landArea} / {property.buildArea}
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-xs rounded-md whitespace-nowrap">
                            {property.type}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => toggleVisibility(property.id)}
                              className={`px-3 py-1.5 rounded-md transition-colors text-xs font-bold whitespace-nowrap ${
                                property.status === 'pending' 
                                  ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                                  : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                              title={property.status === 'pending' ? "비공개 (클릭시 공개)" : "공개중 (클릭시 비공개)"}
                            >
                              {property.status === 'pending' ? '숨김' : '공개'}
                            </button>
                            <button 
                              onClick={() => navigate(`/property/${property.id}`)}
                              className="px-3 py-1.5 text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors text-xs font-bold whitespace-nowrap"
                              title="매물 보기"
                            >
                              보기
                            </button>
                            <button 
                              onClick={() => navigate(`/register?edit=${property.id}`)}
                              className="px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors text-xs font-bold whitespace-nowrap"
                              title="수정"
                            >
                              수정
                            </button>
                            <button 
                              onClick={() => handleDelete(property.id, property.title)}
                              className="px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors text-xs font-bold whitespace-nowrap"
                              title="삭제"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500 text-sm">
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'reservations' && (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-800">방문 예약 목록 <span className="text-zinc-400 font-normal text-sm ml-2">총 {reservations.length}건</span></h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="p-4 font-semibold w-28">신청일</th>
                    <th className="p-4 font-semibold w-32">예약자 정보</th>
                    <th className="p-4 font-semibold w-32">방문 희망일</th>
                    <th className="p-4 font-semibold w-full">관심 매물</th>
                    <th className="p-4 font-semibold w-24">상태</th>
                    <th className="p-4 font-semibold text-right w-24">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {reservations.length > 0 ? (
                    reservations.map((reservation) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={reservation.id} 
                        className="hover:bg-zinc-50 transition-colors"
                      >
                        <td className="p-4 text-sm text-zinc-500">
                          {new Date(reservation.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-zinc-900 text-sm">{reservation.name}</p>
                          <p className="text-xs text-zinc-500 mt-1">{reservation.phone}</p>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                            <Calendar size={14} className="text-zinc-400" />
                            {reservation.date} {reservation.time || ''}
                          </span>
                        </td>
                        <td className="p-4 max-w-0 w-full">
                          <button 
                            onClick={() => navigate(`/property/${reservation.propertyId}`)}
                            className="text-sm text-blue-600 hover:underline truncate w-full text-left block"
                          >
                            {reservation.propertyTitle}
                          </button>
                          {reservation.message && (
                            <p className="text-xs text-zinc-500 mt-1 truncate w-full" title={reservation.message}>
                              <span className="font-bold text-zinc-400 mr-1">문의:</span>
                              {reservation.message}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <select 
                            value={reservation.status}
                            onChange={(e) => updateReservationStatus(reservation.id, e.target.value as any)}
                            className={`text-xs font-bold px-2 py-1 rounded-md border-none focus:ring-2 focus:ring-zinc-900 ${
                              reservation.status === '대기중' ? 'bg-yellow-100 text-yellow-800' :
                              reservation.status === '확정' ? 'bg-green-100 text-green-800' :
                              'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            <option value="대기중">대기중</option>
                            <option value="확정">확정</option>
                            <option value="취소">취소</option>
                          </select>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteReservation(reservation.id, reservation.name)}
                            className="px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors text-xs font-bold whitespace-nowrap"
                            title="삭제"
                          >
                            삭제
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500 text-sm">
                        접수된 방문 예약이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-800">승인 대기 매물 <span className="text-zinc-400 font-normal text-sm ml-2">총 {pendingProperties.length}건</span></h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="p-4 font-semibold w-full">매물 정보</th>
                    <th className="p-4 font-semibold w-28">가격</th>
                    <th className="p-4 font-semibold hidden md:table-cell w-32">면적 (대지/건축)</th>
                    <th className="p-4 font-semibold hidden lg:table-cell w-24">유형</th>
                    <th className="p-4 font-semibold text-right w-[200px]">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pendingProperties.length > 0 ? (
                    pendingProperties.map((property) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={property.id} 
                        className="hover:bg-zinc-50 transition-colors group"
                      >
                        <td className="p-4 max-w-0 w-full">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-12 rounded overflow-hidden bg-zinc-200 flex-shrink-0">
                              <img src={property.thumbnail} alt={property.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-zinc-900 text-sm truncate w-full mb-0.5">
                                {property.title}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-zinc-500 line-clamp-1">{property.location}</p>
                              </div>
                              {property.contact && (
                                <p className="text-xs text-blue-600 mt-0.5 font-medium">연락처: {property.contact}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-zinc-900 text-sm whitespace-nowrap">{property.priceStr}</span>
                        </td>
                        <td className="p-4 hidden md:table-cell text-sm text-zinc-600">
                          {property.landArea} / {property.buildArea}
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-xs rounded-md whitespace-nowrap">
                            {property.type}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => approveProperty(property.id)}
                              className="px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-xs font-bold whitespace-nowrap"
                              title="승인"
                            >
                              승인
                            </button>
                            <button 
                              onClick={() => navigate(`/property/${property.id}`)}
                              className="px-3 py-1.5 text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors text-xs font-bold whitespace-nowrap"
                              title="매물 보기"
                            >
                              보기
                            </button>
                            <button 
                              onClick={() => handleDelete(property.id, property.title)}
                              className="px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors text-xs font-bold whitespace-nowrap"
                              title="삭제"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500 text-sm">
                        승인 대기 중인 매물이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 max-w-sm w-full border border-zinc-200 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">확인</h3>
            <p className="text-sm text-zinc-600 mb-8">{confirmModal.title}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 text-xs font-bold tracking-widest text-zinc-500 uppercase border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 py-3 text-xs font-bold tracking-widest text-white uppercase bg-red-600 hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
