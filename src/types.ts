export interface Property {
  id: number;
  title: string;
  youtubeId: string;
  thumbnail: string;
  priceStr: string;
  priceNum: number;
  landArea: string;
  buildArea: string;
  landAreaNum: number;
  buildAreaNum: number;
  floors: number;
  heating: string;
  parking: string;
  yard: string;
  location: string;
  region: string;
  coords: { x: number; y: number };
  type: string;
  tags: string[];
  images?: string[];
  overviewImages?: string[];
  description: string;
  curation?: string[];
  isPopular?: boolean;
  isClosingSoon?: boolean;
  status?: 'pending' | 'approved';
  isVisible?: boolean;
  contact?: string;
}

export interface Reservation {
  id: number;
  propertyId: number;
  propertyTitle: string;
  name: string;
  phone: string;
  date: string;
  time?: string;
  message?: string;
  createdAt: string;
  status: '대기중' | '확정' | '취소';
}
