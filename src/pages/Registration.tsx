import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link, Youtube, CheckCircle2, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProperties } from '../store/PropertyContext';
import { Property } from '../types';
import { REGION_DATA } from '../data/regions';
import { compressImage } from '../utils/imageCompression';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Helmet } from 'react-helmet-async';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

const MapSelector = ({ coords, setCoords }: { coords: {x: number, y: number} | null, setCoords: (c: {x: number, y: number}) => void }) => {
  const mapRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' 대한민국')}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const newCoords = { x: parseFloat(data[0].lat), y: parseFloat(data[0].lon) };
        setCoords(newCoords);
        if (mapRef.current) {
          mapRef.current.flyTo([newCoords.x, newCoords.y], 15);
        }
      } else {
        alert('검색 결과가 없습니다.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('주소 검색 중 오류가 발생했습니다.');
    }
  };

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        setCoords({ x: e.latlng.lat, y: e.latlng.lng });
      },
    });
    return null;
  };

  useEffect(() => {
    if (mapRef.current && coords) {
      mapRef.current.flyTo([coords.x, coords.y], 13);
    }
  }, [coords]);

  const defaultCoords = { x: 37.5665, y: 126.9780 }; // Seoul

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="주소 또는 장소 검색 (예: 파주시 야당동)" 
          className="flex-1 border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-zinc-900"
        />
        <button type="button" onClick={handleSearch} className="bg-zinc-900 text-white px-4 py-2 text-xs font-bold whitespace-nowrap">검색</button>
      </div>
      <div className="h-[300px] w-full bg-zinc-100 relative z-0">
        <MapContainer 
          center={[coords?.x || defaultCoords.x, coords?.y || defaultCoords.y]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {coords && (
            <Marker 
              position={[coords.x, coords.y]} 
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  setCoords({ x: position.lat, y: position.lng });
                },
              }}
            />
          )}
          <MapEvents />
        </MapContainer>
        <div className="absolute top-2 right-2 z-[400] bg-white px-3 py-2 text-xs font-bold shadow-md rounded pointer-events-none">
          지도를 클릭하거나 마커를 드래그하여 정확한 위치를 설정하세요.
        </div>
      </div>
    </div>
  );
};

export default function Registration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const { properties, addProperty, updateProperty } = useProperties();
  
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [overviewImages, setOverviewImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingOverview, setIsUploadingOverview] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overviewFileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    priceStr: '',
    priceNum: '',
    landArea: '',
    buildArea: '',
    heating: '도시가스',
    parking: '',
    yard: '',
    location: '',
    majorRegion: '경기',
    minorRegion: '파주시',
    type: '분양',
    description: '',
    tags: '',
    curation: '일반 매물',
    contact: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [mapCoords, setMapCoords] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (editId && !hasLoaded) {
      const propertyToEdit = properties.find(p => p.id === Number(editId));
      if (propertyToEdit) {
        setYoutubeUrl(`https://youtu.be/${propertyToEdit.youtubeId}`);
        setYoutubeId(propertyToEdit.youtubeId);
        setThumbnail(propertyToEdit.thumbnail);
        setImages(propertyToEdit.images || []);
        setOverviewImages(propertyToEdit.overviewImages || []);
        setFormData({
          title: propertyToEdit.title,
          priceStr: propertyToEdit.priceStr,
          priceNum: propertyToEdit.priceNum.toString(),
          landArea: propertyToEdit.landArea,
          buildArea: propertyToEdit.buildArea,
          heating: propertyToEdit.heating,
          parking: propertyToEdit.parking,
          yard: propertyToEdit.yard,
          location: propertyToEdit.location,
          majorRegion: propertyToEdit.region.split(' ')[0] || '경기',
          minorRegion: propertyToEdit.region.split(' ').slice(1).join(' ') || '파주시',
          type: propertyToEdit.type,
          description: (propertyToEdit.description || '').replace(/\\n/g, '\n'),
          tags: propertyToEdit.tags.join(', '),
          curation: propertyToEdit.curation?.[0] || '일반 매물',
          contact: propertyToEdit.contact || ''
        });
        setMapCoords(propertyToEdit.coords);
        setHasLoaded(true);
      }
    }
  }, [editId, properties, hasLoaded]);

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getCoordsForRegion = async (majorRegion: string, minorRegion: string) => {
    try {
      // Try minor region first for more accurate results
      let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(minorRegion + ' 대한민국')}`);
      let data = await response.json();
      
      if (data && data.length > 0) {
        return { x: parseFloat(data[0].lat), y: parseFloat(data[0].lon) };
      }

      // Fallback to major region
      response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(majorRegion + ' 대한민국')}`);
      data = await response.json();
      
      if (data && data.length > 0) {
        return { x: parseFloat(data[0].lat), y: parseFloat(data[0].lon) };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }

    const region = `${majorRegion} ${minorRegion}`;
    // Specific cities/districts fallback
    if (region.includes('의정부')) return { x: 37.7381, y: 127.0339 };
    if (region.includes('파주')) return { x: 37.7600, y: 126.7800 };
    if (region.includes('일산')) return { x: 37.6600, y: 126.7700 };
    if (region.includes('용인')) return { x: 37.2410, y: 127.1775 };
    if (region.includes('광주')) return { x: 37.4294, y: 127.2551 };
    if (region.includes('양평')) return { x: 37.4918, y: 127.4876 };
    if (region.includes('가평')) return { x: 37.8315, y: 127.5095 };
    if (region.includes('평창')) return { x: 37.3700, y: 128.3900 };
    if (region.includes('김포')) return { x: 37.6153, y: 126.7156 };
    if (region.includes('고양')) return { x: 37.6584, y: 126.8320 };
    if (region.includes('수원')) return { x: 37.2636, y: 127.0286 };
    if (region.includes('성남')) return { x: 37.4200, y: 127.1265 };
    if (region.includes('안양')) return { x: 37.3943, y: 126.9568 };
    if (region.includes('부천')) return { x: 37.5034, y: 126.7660 };
    if (region.includes('광명')) return { x: 37.4786, y: 126.8646 };
    if (region.includes('평택')) return { x: 36.9921, y: 127.1129 };
    if (region.includes('동두천')) return { x: 37.9036, y: 127.0607 };
    if (region.includes('안산')) return { x: 37.3219, y: 126.8308 };
    if (region.includes('과천')) return { x: 37.4292, y: 126.9877 };
    if (region.includes('구리')) return { x: 37.5943, y: 127.1297 };
    if (region.includes('남양주')) return { x: 37.6360, y: 127.2165 };
    if (region.includes('오산')) return { x: 37.1499, y: 127.0774 };
    if (region.includes('시흥')) return { x: 37.3801, y: 126.8030 };
    if (region.includes('군포')) return { x: 37.3614, y: 126.9353 };
    if (region.includes('의왕')) return { x: 37.3448, y: 126.9683 };
    if (region.includes('하남')) return { x: 37.5393, y: 127.2149 };
    if (region.includes('이천')) return { x: 37.2723, y: 127.4350 };
    if (region.includes('안성')) return { x: 37.0080, y: 127.2797 };
    if (region.includes('화성')) return { x: 37.1995, y: 126.8315 };
    if (region.includes('양주')) return { x: 37.7853, y: 127.0458 };
    if (region.includes('포천')) return { x: 37.8949, y: 127.2003 };
    if (region.includes('여주')) return { x: 37.2983, y: 127.6371 };
    if (region.includes('연천')) return { x: 38.0964, y: 127.0745 };
    if (region.includes('서귀포')) return { x: 33.2541, y: 126.5601 };

    // Major regions fallback
    if (region.includes('서울')) return { x: 37.5665, y: 126.9780 };
    if (region.includes('경기')) return { x: 37.2752, y: 127.0095 };
    if (region.includes('인천')) return { x: 37.4563, y: 126.7052 };
    if (region.includes('부산')) return { x: 35.1796, y: 129.0756 };
    if (region.includes('대구')) return { x: 35.8714, y: 128.6014 };
    if (region.includes('대전')) return { x: 36.3504, y: 127.3845 };
    if (region.includes('울산')) return { x: 35.5384, y: 129.3114 };
    if (region.includes('세종')) return { x: 36.4800, y: 127.2890 };
    if (region.includes('강원')) return { x: 37.8854, y: 127.7298 };
    if (region.includes('충북')) return { x: 36.6356, y: 127.4913 };
    if (region.includes('충남')) return { x: 36.6588, y: 126.6728 };
    if (region.includes('전북')) return { x: 35.8242, y: 127.1480 };
    if (region.includes('전남')) return { x: 34.8161, y: 126.4629 };
    if (region.includes('경북')) return { x: 36.5760, y: 128.5056 };
    if (region.includes('경남')) return { x: 35.2383, y: 128.6922 };
    if (region.includes('제주')) return { x: 33.4890, y: 126.4983 };

    return { x: 37.5665, y: 126.9780 }; // Seoul default
  };

  const handleUrlSync = async () => {
    const id = extractYoutubeId(youtubeUrl);
    if (id) {
      setYoutubeId(id);
      setThumbnail(`https://img.youtube.com/vi/${id}/maxresdefault.jpg`);
      
      setIsSyncing(true);
      try {
        const res = await fetch('/api/parse-youtube', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: youtubeUrl })
        });
        
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            setFormData(prev => ({
              ...prev,
              title: data.title || prev.title,
              priceStr: data.priceStr || prev.priceStr,
              priceNum: data.priceNum ? String(data.priceNum) : prev.priceNum,
              landArea: data.landArea || prev.landArea,
              buildArea: data.buildArea || prev.buildArea,
              heating: data.heating || prev.heating,
              parking: data.parking || prev.parking,
              yard: data.yard || prev.yard,
              location: data.location || prev.location,
              majorRegion: data.majorRegion || prev.majorRegion,
              minorRegion: data.minorRegion || prev.minorRegion,
              type: data.type || prev.type,
              tags: data.tags || prev.tags,
              description: (data.description || prev.description).replace(/\\n/g, '\n')
            }));
            alert('유튜브 영상에서 매물 정보를 성공적으로 불러왔습니다. 내용을 확인하고 수정해주세요.');
          }
        } else {
          const errorData = await res.json();
          if (errorData.error) {
            alert(errorData.error);
          } else {
            alert('유튜브 영상 정보를 불러오는데 실패했습니다.');
          }
        }
      } catch (error) {
        console.error('Failed to parse youtube info:', error);
        alert('유튜브 영상 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsSyncing(false);
      }
    } else {
      alert('유효한 유튜브 URL을 입력해주세요.');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, isOverview: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    
    const files = Array.from(e.dataTransfer.files) as File[];
    
    if (isOverview) {
      if (overviewImages.length + files.length > 20) {
        alert('최대 20장까지만 업로드 가능합니다.');
        return;
      }
      setIsUploadingOverview(true);
    } else {
      if (images.length + files.length > 20) {
        alert('최대 20장까지만 업로드 가능합니다.');
        return;
      }
      setIsUploading(true);
    }

    try {
      const urls: string[] = [];
      for (const file of files) {
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const storageRef = ref(storage, `uploads/${uniqueSuffix}-${fileToUpload.name}`);
        await uploadBytes(storageRef, fileToUpload);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      
      if (isOverview) {
        setOverviewImages(prev => [...prev, ...urls]);
      } else {
        setImages(prev => [...prev, ...urls]);
      }
    } catch (err: any) {
      console.error(err);
      alert(`이미지 업로드에 실패했습니다: ${err.message || '알 수 없는 오류'}`);
    } finally {
      if (isOverview) {
        setIsUploadingOverview(false);
      } else {
        setIsUploading(false);
      }
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    setIsUploadingThumbnail(true);
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const storageRef = ref(storage, `uploads/${uniqueSuffix}-${fileToUpload.name}`);
      await uploadBytes(storageRef, fileToUpload);
      const url = await getDownloadURL(storageRef);
      
      setThumbnail(url);
    } catch (err: any) {
      console.error(err);
      alert(`썸네일 업로드에 실패했습니다: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsUploadingThumbnail(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files) as File[];
    if (images.length + files.length > 20) {
      alert('최대 20장까지만 업로드 가능합니다.');
      return;
    }

    setIsUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const storageRef = ref(storage, `uploads/${uniqueSuffix}-${fileToUpload.name}`);
        await uploadBytes(storageRef, fileToUpload);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      
      setImages(prev => [...prev, ...urls]);
    } catch (err: any) {
      console.error(err);
      alert(`이미지 업로드에 실패했습니다: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index === 0) return;
    if (direction === 'right' && index === images.length - 1) return;

    setImages(prev => {
      const newImages = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
      return newImages;
    });
  };

  const handleOverviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files) as File[];
    if (overviewImages.length + files.length > 20) {
      alert('최대 20장까지만 업로드 가능합니다.');
      return;
    }

    setIsUploadingOverview(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const storageRef = ref(storage, `uploads/${uniqueSuffix}-${fileToUpload.name}`);
        await uploadBytes(storageRef, fileToUpload);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }
      
      setOverviewImages(prev => [...prev, ...urls]);
    } catch (err: any) {
      console.error(err);
      alert(`이미지 업로드에 실패했습니다: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsUploadingOverview(false);
      if (overviewFileInputRef.current) overviewFileInputRef.current.value = '';
    }
  };

  const removeOverviewImage = (index: number) => {
    setOverviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveOverviewImage = (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index === 0) return;
    if (direction === 'right' && index === overviewImages.length - 1) return;

    setOverviewImages(prev => {
      const newImages = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
      return newImages;
    });
  };

  const previousRegion = useRef(`${formData.majorRegion} ${formData.minorRegion}`);

  useEffect(() => {
    const currentRegion = `${formData.majorRegion} ${formData.minorRegion}`;
    if (previousRegion.current !== currentRegion) {
      previousRegion.current = currentRegion;
      getCoordsForRegion(formData.majorRegion, formData.minorRegion).then(coords => {
        if (coords) setMapCoords(coords);
      });
    }
  }, [formData.majorRegion, formData.minorRegion]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleButtonClick = () => {
    if (formRef.current && !formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

    if (!youtubeId) {
      alert('유튜브 URL을 먼저 연동해주세요.');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    const coords = mapCoords || await getCoordsForRegion(formData.majorRegion, formData.minorRegion);
    
    const newProperty: Property = {
      id: editId ? Number(editId) : Date.now(),
      title: formData.title,
      youtubeId,
      thumbnail,
      priceStr: formData.priceStr,
      priceNum: Number(formData.priceNum) || 0,
      landArea: formData.landArea,
      landAreaNum: parseInt(formData.landArea.replace(/[^0-9]/g, '')) || 0,
      buildArea: formData.buildArea,
      buildAreaNum: parseInt(formData.buildArea.replace(/[^0-9]/g, '')) || 0,
      floors: 1, // Default value
      region: `${formData.majorRegion} ${formData.minorRegion}`,
      heating: formData.heating,
      parking: formData.parking,
      yard: formData.yard,
      location: formData.location,
      coords: coords,
      type: formData.type,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      images: images,
      overviewImages: overviewImages,
      description: formData.description,
      curation: formData.curation === '일반 매물' ? [] : [formData.curation],
      status: editId ? properties.find(p => p.id === Number(editId))?.status : 'pending',
      isPopular: editId ? properties.find(p => p.id === Number(editId))?.isPopular : false,
      isClosingSoon: editId ? properties.find(p => p.id === Number(editId))?.isClosingSoon : false,
      contact: formData.contact
    };

    if (editId) {
      updateProperty(newProperty);
    } else {
      addProperty(newProperty);
    }
    
    setShowConfirm(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="mb-8 md:mb-12 border-b border-zinc-200 pb-4 md:pb-6 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-zinc-900 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-zinc-900 font-serif mb-2">{editId ? '매물 수정' : '매물 등록'}</h1>
            <p className="text-[10px] md:text-sm text-zinc-500 tracking-widest uppercase">Property {editId ? 'Edit' : 'Registration'}</p>
          </div>
        </div>

        <div className="space-y-8 md:space-y-12">
        {/* Step 1: YouTube Sync */}
        <section className="bg-zinc-50 p-6 md:p-8 border border-zinc-200">
          <h2 className="text-base md:text-lg font-medium text-zinc-900 mb-4 md:mb-6 flex items-center gap-2">
            <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] md:text-xs font-bold">1</span>
            유튜브 영상 연동
          </h2>
          
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="relative flex-1">
              <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type="text" 
                placeholder="유튜브 URL을 입력하세요 (예: https://youtu.be/...)" 
                className="w-full pl-12 pr-4 py-3 border border-zinc-200 text-sm focus:outline-none focus:border-zinc-900 bg-white"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
            </div>
            <button 
              type="button"
              onClick={handleUrlSync}
              disabled={isSyncing}
              className={`w-full md:w-auto px-8 py-3 bg-zinc-900 text-white text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${isSyncing ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  정보 추출 중...
                </>
              ) : (
                <>
                  <Youtube size={16} /> 연동하기
                </>
              )}
            </button>
          </div>

          <div className="mt-4 md:mt-6">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <p className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase">썸네일 미리보기</p>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={thumbnailInputRef} 
                  onChange={handleThumbnailUpload} 
                  accept="image/*, image/webp, .webp" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => !isUploadingThumbnail && thumbnailInputRef.current?.click()}
                  className={`text-xs text-zinc-600 hover:text-zinc-900 underline underline-offset-2 ${isUploadingThumbnail ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploadingThumbnail ? '업로드 중...' : '직접 썸네일 업로드'}
                </button>
              </div>
            </div>
            {thumbnail ? (
              <div className="aspect-video w-full max-w-md bg-zinc-100 border border-zinc-200 overflow-hidden relative">
                <img src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/80 flex items-center justify-center">
                    <CheckCircle2 className="text-green-600 md:w-6 md:h-6" size={20} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video w-full max-w-md bg-zinc-50 border border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400">
                <Upload size={24} className="mb-2" />
                <p className="text-xs">썸네일 이미지가 없습니다</p>
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Image Upload */}
        <section className="bg-white p-6 md:p-8 border border-zinc-200">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-base md:text-lg font-medium text-zinc-900 flex items-center gap-2">
              <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] md:text-xs font-bold">2</span>
              사진 등록
            </h2>
            <span className="text-xs text-zinc-500">{images.length} / 20장</span>
          </div>

          <div className="space-y-6">
            <div 
              onClick={() => !isUploading && images.length < 20 && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={(e) => !isUploading && images.length < 20 && handleDrop(e, false)}
              className={`border-2 border-dashed border-zinc-300 p-8 md:p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-zinc-50 transition-colors ${isUploading || images.length >= 20 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload className="text-zinc-400" size={32} />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-900 mb-1">클릭하여 이미지 업로드</p>
                <p className="text-xs text-zinc-500">최대 20장까지 업로드 가능합니다 (JPG, PNG)</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                multiple 
                accept="image/*, image/webp, .webp" 
                className="hidden" 
              />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((url, index) => (
                  <div key={`${url}-${index}`} className="group relative aspect-square bg-zinc-100 border border-zinc-200 overflow-hidden">
                    <img src={url} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={() => removeImage(index)}
                          className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-zinc-900 hover:bg-white transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <button 
                          type="button"
                          onClick={() => moveImage(index, 'left')}
                          disabled={index === 0}
                          className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-white text-xs font-bold bg-black/50 px-2 py-0.5 rounded-full">
                          {index + 1}
                        </span>
                        <button 
                          type="button"
                          onClick={() => moveImage(index, 'right')}
                          disabled={index === images.length - 1}
                          className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Overview Image Upload */}
        <section className="bg-white p-6 md:p-8 border border-zinc-200">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h2 className="text-base md:text-lg font-medium text-zinc-900 flex items-center gap-2">
              <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] md:text-xs font-bold">3</span>
              OVERVIEW 사진 등록 (16:9)
            </h2>
            <span className="text-xs text-zinc-500">{overviewImages.length} / 20장</span>
          </div>

          <div className="space-y-6">
            <div 
              onClick={() => !isUploadingOverview && overviewImages.length < 20 && overviewFileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={(e) => !isUploadingOverview && overviewImages.length < 20 && handleDrop(e, true)}
              className={`border-2 border-dashed border-zinc-300 p-8 md:p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-zinc-50 transition-colors ${isUploadingOverview || overviewImages.length >= 20 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload className="text-zinc-400" size={32} />
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-900 mb-1">클릭하여 OVERVIEW 이미지 업로드</p>
                <p className="text-xs text-zinc-500">최대 20장까지 업로드 가능합니다 (16:9 비율 권장)</p>
              </div>
              <input 
                type="file" 
                ref={overviewFileInputRef} 
                onChange={handleOverviewImageUpload} 
                multiple 
                accept="image/*, image/webp, .webp" 
                className="hidden" 
              />
            </div>

            {overviewImages.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {overviewImages.map((url, index) => (
                  <div key={`overview-${url}-${index}`} className="group relative aspect-video bg-zinc-100 border border-zinc-200 overflow-hidden">
                    <img src={url} alt={`Overview ${index + 1}`} className="w-full h-full object-cover" />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={() => removeOverviewImage(index)}
                          className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-zinc-900 hover:bg-white transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <button 
                          type="button"
                          onClick={() => moveOverviewImage(index, 'left')}
                          disabled={index === 0}
                          className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-white text-xs font-bold bg-black/50 px-2 py-0.5 rounded-full">
                          {index + 1}
                        </span>
                        <button 
                          type="button"
                          onClick={() => moveOverviewImage(index, 'right')}
                          disabled={index === overviewImages.length - 1}
                          className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Step 4: Details Form */}
        <section className="bg-white p-6 md:p-8 border border-zinc-200">
          <h2 className="text-base md:text-lg font-medium text-zinc-900 mb-6 md:mb-8 flex items-center gap-2">
            <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] md:text-xs font-bold">4</span>
            상세 정보 입력
          </h2>

          <form ref={formRef} className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">매물명 (제목) *</label>
                  <input type="text" name="title" required value={formData.title} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: [파주] 운정호수공원 타운하우스" />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">거래 형태 *</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900 bg-transparent">
                      <option value="분양">분양</option>
                      <option value="매매">매매</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">큐레이션 카테고리 *</label>
                    <select name="curation" value={formData.curation} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900 bg-transparent">
                      <option value="일반 매물">일반 매물</option>
                      <option value="주목받는 프리미엄 분양 현장">주목받는 프리미엄 분양 현장</option>
                      <option value="자연을 품은 넓은 마당">자연을 품은 넓은 마당</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">가격 (표시용) *</label>
                    <input type="text" name="priceStr" required value={formData.priceStr} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: 6억 3,290만" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">가격 (숫자, 만원 단위) *</label>
                    <input type="number" name="priceNum" required value={formData.priceNum} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: 63290" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">현장 주소 *</label>
                    <input type="text" name="location" required value={formData.location} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: 경기도 파주시 와동동" />
                  </div>
                  <div className="w-1/2 flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">대분류 *</label>
                      <select 
                        name="majorRegion" 
                        value={formData.majorRegion} 
                        onChange={(e) => {
                          const newMajor = e.target.value;
                          setFormData(prev => ({ 
                            ...prev, 
                            majorRegion: newMajor,
                            minorRegion: REGION_DATA[newMajor][0] // Reset minor region when major changes
                          }));
                        }} 
                        className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900 bg-transparent"
                      >
                        {Object.keys(REGION_DATA).map(major => (
                          <option key={major} value={major}>{major}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">하위분류 *</label>
                      <select 
                        name="minorRegion" 
                        value={formData.minorRegion} 
                        onChange={handleChange} 
                        className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900 bg-transparent"
                      >
                        {REGION_DATA[formData.majorRegion]?.map(minor => (
                          <option key={minor} value={minor}>{minor}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 flex justify-between items-center">
                    <span>지도 위치 설정 *</span>
                    <button 
                      type="button"
                      onClick={async () => {
                        const coords = await getCoordsForRegion(formData.majorRegion, formData.minorRegion);
                        if (coords) setMapCoords(coords);
                      }}
                      className="text-zinc-900 underline text-[10px]"
                    >
                      지역 기반 위치 초기화
                    </button>
                  </label>
                  <MapSelector coords={mapCoords} setCoords={setMapCoords} />
                </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">대지 면적 *</label>
                    <input type="text" name="landArea" required value={formData.landArea} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: 대지 48평" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">건축 면적 *</label>
                    <input type="text" name="buildArea" required value={formData.buildArea} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: 실사용 70평" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">난방 방식 *</label>
                    <select name="heating" value={formData.heating} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900 bg-transparent">
                      <option value="도시가스">도시가스</option>
                      <option value="LPG">LPG</option>
                      <option value="기름보일러">기름보일러</option>
                      <option value="지열보일러">지열보일러</option>
                      <option value="지역난방">지역난방</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">주차장 *</label>
                    <input type="text" name="parking" required value={formData.parking} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: 벙커주차장 2대" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">특화 공간 (마당 등) *</label>
                  <input type="text" name="yard" required value={formData.yard} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: 프라이빗 테라스, 잔디마당" />
                </div>

                <div>
                  <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">해시태그 (쉼표로 구분)</label>
                  <input type="text" name="tags" value={formData.tags} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: 운정신도시, 호수공원뷰" />
                </div>

                <div>
                  <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">연락처 *</label>
                  <input type="text" name="contact" required value={formData.contact} onChange={handleChange} className="w-full border-b border-zinc-200 py-2 text-sm focus:outline-none focus:border-zinc-900" placeholder="예: 010-1234-5678" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] md:text-xs font-bold tracking-widest text-zinc-500 uppercase mb-2 block">상세 설명</label>
              <textarea 
                name="description" 
                rows={5} 
                value={formData.description} 
                onChange={handleChange} 
                className="w-full border border-zinc-200 p-3 md:p-4 text-sm focus:outline-none focus:border-zinc-900 resize-none" 
                placeholder="매물에 대한 상세한 설명을 입력해주세요."
              ></textarea>
            </div>

            <div className="pt-6 md:pt-8 border-t border-zinc-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-zinc-500">
                인기매물/마감임박매물/우선순위 노출등은 <span className="font-bold text-zinc-900">010-3972-4158</span>로 연락부탁드립니다.
              </p>
              <button 
                type="button" 
                onClick={handleButtonClick}
                className="w-full md:w-auto px-12 py-4 bg-zinc-900 text-white text-[10px] md:text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors"
              >
                {editId ? '매물 수정 완료' : '매물 등록 완료'}
              </button>
            </div>
          </form>
        </section>
      </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 md:p-12 max-w-sm w-full border border-zinc-200 shadow-2xl text-center flex flex-col items-center">
            <h3 className="text-lg md:text-xl font-bold text-zinc-900 mb-4">담당자 승인후 연락드립니다</h3>
            <p className="text-xs md:text-sm text-zinc-500 mb-8">
              매물을 {editId ? '수정' : '등록'}하시겠습니까?
            </p>
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-zinc-200 text-zinc-600 text-xs font-bold uppercase hover:bg-zinc-50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleConfirmSubmit}
                className="flex-1 py-3 bg-zinc-900 text-white text-xs font-bold uppercase hover:bg-zinc-800 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 md:p-12 max-w-sm w-full border border-zinc-200 shadow-2xl text-center flex flex-col items-center">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 md:mb-6">
              <CheckCircle2 className="text-green-600 md:w-8 md:h-8" size={24} />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-zinc-900 mb-2">{editId ? '수정 완료' : '등록 완료'}</h3>
            <p className="text-xs md:text-sm text-zinc-500 mb-6 md:mb-8">
              등록요청이 완료되었습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
