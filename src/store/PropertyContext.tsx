import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Property, Reservation } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface PropertyContextType {
  properties: Property[];
  addProperty: (property: Property) => Promise<void>;
  updateProperty: (property: Property) => Promise<void>;
  deleteProperty: (id: number) => Promise<void>;
  togglePopular: (id: number) => Promise<void>;
  toggleClosingSoon: (id: number) => Promise<void>;
  approveProperty: (id: number) => Promise<void>;
  toggleVisibility: (id: number) => Promise<void>;
  reservations: Reservation[];
  addReservation: (reservation: Reservation) => Promise<void>;
  updateReservationStatus: (id: number, status: Reservation['status']) => Promise<void>;
  deleteReservation: (id: number) => Promise<void>;
  recentProperties: Property[];
  addRecentProperty: (property: Property) => void;
  clearRecentProperties: () => void;
  compareList: Property[];
  toggleCompareProperty: (property: Property) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [compareList, setCompareList] = useState<Property[]>([]);
  const { user } = useAuth();

  // Load recent and compare from localStorage on mount
  useEffect(() => {
    const savedRecent = localStorage.getItem('recentProperties');
    if (savedRecent) {
      try { setRecentProperties(JSON.parse(savedRecent)); } catch (e) {}
    }
    const savedCompare = localStorage.getItem('compareList');
    if (savedCompare) {
      try { setCompareList(JSON.parse(savedCompare)); } catch (e) {}
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('recentProperties', JSON.stringify(recentProperties));
  }, [recentProperties]);

  useEffect(() => {
    localStorage.setItem('compareList', JSON.stringify(compareList));
  }, [compareList]);

  const addRecentProperty = (property: Property) => {
    setRecentProperties(prev => {
      const filtered = prev.filter(p => p.id !== property.id);
      return [property, ...filtered].slice(0, 10); // Keep last 10
    });
  };

  const toggleCompareProperty = (property: Property) => {
    setCompareList(prev => {
      const exists = prev.some(p => p.id === property.id);
      if (exists) {
        return prev.filter(p => p.id !== property.id);
      } else {
        if (prev.length >= 3) {
          alert('비교하기는 최대 3개까지만 가능합니다.');
          return prev;
        }
        return [...prev, property];
      }
    });
  };

  // Firebase Realtime Listeners
  useEffect(() => {
    // Listen to properties
    // If user is logged in (admin), fetch all properties. Otherwise, fetch only approved properties.
    const propertiesQuery = user 
      ? collection(db, 'properties')
      : query(collection(db, 'properties'), where('status', '==', 'approved'));

    const unsubscribeProperties = onSnapshot(
      propertiesQuery,
      (snapshot) => {
        const propsData: Property[] = [];
        snapshot.forEach((doc) => {
          propsData.push({ id: Number(doc.id), ...doc.data() } as Property);
        });
        // Sort by id descending (newest first)
        propsData.sort((a, b) => b.id - a.id);
        setProperties(propsData);
      },
      (error) => {
        console.error("Error fetching properties from Firebase:", error);
      }
    );

    // Listen to reservations
    let unsubscribeReservations: () => void;
    if (user) {
      unsubscribeReservations = onSnapshot(
        collection(db, 'reservations'),
        (snapshot) => {
          const resData: Reservation[] = [];
          snapshot.forEach((doc) => {
            resData.push({ id: Number(doc.id), ...doc.data() } as Reservation);
          });
          // Sort by id descending
          resData.sort((a, b) => b.id - a.id);
          setReservations(resData);
        },
        (error) => {
          console.error("Error fetching reservations from Firebase:", error);
        }
      );
    } else {
      setReservations([]);
    }

    return () => {
      unsubscribeProperties();
      if (unsubscribeReservations) {
        unsubscribeReservations();
      }
    };
  }, [user]);

  const addProperty = async (property: Property) => {
    try {
      const newId = Date.now();
      const propertyData = { ...property, id: newId };
      await setDoc(doc(db, 'properties', newId.toString()), propertyData);
    } catch (err) {
      console.error("Error adding property:", err);
      throw err;
    }
  };

  const updateProperty = async (updatedProperty: Property) => {
    try {
      await updateDoc(doc(db, 'properties', updatedProperty.id.toString()), {
        ...updatedProperty
      });
    } catch (err) {
      console.error("Error updating property:", err);
      throw err;
    }
  };

  const deleteProperty = async (id: number) => {
    try {
      await deleteDoc(doc(db, 'properties', id.toString()));
    } catch (err) {
      console.error("Error deleting property:", err);
      throw err;
    }
  };

  const togglePopular = async (id: number) => {
    try {
      const property = properties.find(p => p.id === id);
      if (property) {
        await updateDoc(doc(db, 'properties', id.toString()), {
          isPopular: !property.isPopular
        });
      }
    } catch (err) {
      console.error("Error toggling popular:", err);
      throw err;
    }
  };

  const toggleClosingSoon = async (id: number) => {
    try {
      const property = properties.find(p => p.id === id);
      if (property) {
        await updateDoc(doc(db, 'properties', id.toString()), {
          isClosingSoon: !property.isClosingSoon
        });
      }
    } catch (err) {
      console.error("Error toggling closing soon:", err);
      throw err;
    }
  };

  const approveProperty = async (id: number) => {
    try {
      await updateDoc(doc(db, 'properties', id.toString()), {
        status: 'approved'
      });
    } catch (err) {
      console.error("Error approving property:", err);
      throw err;
    }
  };

  const toggleVisibility = async (id: number) => {
    try {
      const property = properties.find(p => p.id === id);
      if (property) {
        await updateDoc(doc(db, 'properties', id.toString()), {
          status: property.status === 'approved' ? 'pending' : 'approved'
        });
      }
    } catch (err) {
      console.error("Error toggling visibility:", err);
      throw err;
    }
  };

  const addReservation = async (reservation: Reservation) => {
    try {
      const newId = Date.now();
      const reservationData = { ...reservation, id: newId };
      await setDoc(doc(db, 'reservations', newId.toString()), reservationData);
    } catch (err) {
      console.error("Error adding reservation:", err);
      throw err;
    }
  };

  const updateReservationStatus = async (id: number, status: Reservation['status']) => {
    try {
      await updateDoc(doc(db, 'reservations', id.toString()), {
        status
      });
    } catch (err) {
      console.error("Error updating reservation status:", err);
      throw err;
    }
  };

  const deleteReservation = async (id: number) => {
    try {
      await deleteDoc(doc(db, 'reservations', id.toString()));
    } catch (err) {
      console.error("Error deleting reservation:", err);
      throw err;
    }
  };

  const clearRecentProperties = () => {
    setRecentProperties([]);
  };

  return (
    <PropertyContext.Provider value={{ 
      properties, addProperty, updateProperty, deleteProperty, togglePopular, toggleClosingSoon, approveProperty, toggleVisibility,
      reservations, addReservation, updateReservationStatus, deleteReservation,
      recentProperties, addRecentProperty, clearRecentProperties, compareList, toggleCompareProperty
    }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperties = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperties must be used within a PropertyProvider');
  }
  return context;
};
