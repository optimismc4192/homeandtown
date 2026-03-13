import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Home, Map, PlusSquare, Settings, History, Layers } from 'lucide-react';
import Logo from './Logo';
import CompareModal from './CompareModal';
import { useProperties } from '../store/PropertyContext';

export default function Layout() {
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const { compareList, recentProperties, clearRecentProperties } = useProperties();

  return (
    <div className="h-[100dvh] bg-zinc-100 flex flex-col font-sans">
      <div className="w-full max-w-[1600px] mx-auto h-[100dvh] bg-white shadow-2xl flex flex-col relative border-x border-zinc-200">
        {/* Navigation Bar */}
        <nav className="h-16 border-b border-zinc-200 flex items-center justify-between px-3 md:px-8 bg-white/80 backdrop-blur-md z-50 sticky top-0 w-full overflow-x-auto no-scrollbar">
          <Link to="/" className="flex items-center flex-shrink-0 mr-4">
            <Logo className="h-6 md:h-10" />
          </Link>
          <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
            <Link to="/" className="text-[9px] md:text-xs font-semibold tracking-widest text-zinc-500 hover:text-zinc-900 uppercase transition-colors flex items-center gap-1 md:gap-2">
              <Home size={16} className="hidden sm:block" /> Discover
            </Link>
            <Link to="/map" className="text-[9px] md:text-xs font-semibold tracking-widest text-zinc-500 hover:text-zinc-900 uppercase transition-colors flex items-center gap-1 md:gap-2">
              <Map size={16} className="hidden sm:block" /> Map
            </Link>
            <Link to="/register" className="text-[9px] md:text-xs font-semibold tracking-widest text-zinc-500 hover:text-zinc-900 uppercase transition-colors flex items-center gap-1 md:gap-2">
              <PlusSquare size={16} className="hidden sm:block" /> Register
            </Link>
            <Link to="/admin" className="text-[9px] md:text-xs font-semibold tracking-widest text-zinc-500 hover:text-zinc-900 uppercase transition-colors flex items-center gap-1 md:gap-2">
              <Settings size={16} className="hidden sm:block" /> Admin
            </Link>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden relative">
          <Outlet />
        </main>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          {/* Recent Properties Button & Panel */}
          <div className="relative">
            {isRecentOpen && (
              <div className="absolute bottom-full right-0 mb-4 w-64 bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-96">
                <div className="p-3 border-b border-zinc-100 bg-zinc-50 font-bold text-xs text-zinc-700 flex justify-between items-center">
                  최근 본 매물
                  <div className="flex gap-2 items-center">
                    {recentProperties.length > 0 && (
                      <button onClick={clearRecentProperties} className="text-[10px] text-zinc-400 hover:text-zinc-900 transition-colors">지우기</button>
                    )}
                    <button onClick={() => setIsRecentOpen(false)} className="text-zinc-400 hover:text-zinc-900">×</button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                  {recentProperties.length === 0 ? (
                    <div className="text-center py-8 text-xs text-zinc-400">최근 본 매물이 없습니다.</div>
                  ) : (
                    recentProperties.map(p => (
                      <Link key={`recent-${p.id}`} to={`/property/${p.id}`} onClick={() => setIsRecentOpen(false)} className="flex gap-3 p-2 hover:bg-zinc-50 rounded transition-colors border border-transparent hover:border-zinc-100 group">
                        <img src={p.thumbnail} alt={p.title} className="w-16 h-12 object-cover rounded" />
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="text-[10px] font-medium text-zinc-900 truncate group-hover:text-blue-600 transition-colors">{p.title}</div>
                          <div className="text-[10px] font-bold text-zinc-500">{p.priceStr}</div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
            <button 
              onClick={() => setIsRecentOpen(!isRecentOpen)}
              className="w-12 h-12 bg-white text-zinc-700 rounded-full shadow-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors relative"
              title="최근 본 매물"
            >
              <History size={20} />
              {recentProperties.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {recentProperties.length}
                </span>
              )}
            </button>
          </div>

          {/* Compare Button */}
          <button 
            onClick={() => setIsCompareModalOpen(true)}
            className="w-12 h-12 bg-zinc-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-zinc-800 transition-colors relative"
            title="매물 비교하기"
          >
            <Layers size={20} />
            {compareList.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {compareList.length}
              </span>
            )}
          </button>
        </div>

        <CompareModal isOpen={isCompareModalOpen} onClose={() => setIsCompareModalOpen(false)} />
      </div>
    </div>
  );
}
