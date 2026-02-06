import Constants from 'expo-constants';
import React, { createContext, useCallback, useContext, useState } from 'react';

import { authClient } from '@/lib/auth-client';

interface CalendarLink {
  id: string;
  url: string;
  listingId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  nickname: string;
  streetAddress: string;
  streetAddress2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  wifiNetwork: string | null;
  wifiPassword: string | null;
  accessNotes: string | null;
  teamId: string;
  calendarLinks: CalendarLink[];
  nextCheckIn: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateListingData {
  nickname: string;
  streetAddress: string;
  streetAddress2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface ListingsContextType {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  fetchListings: () => Promise<void>;
  addListing: (data: CreateListingData) => Promise<Listing | null>;
  updateListing: (updatedListing: Listing) => void;
  getListing: (id: string) => Listing | undefined;
}

const ListingsContext = createContext<ListingsContextType | null>(null);

const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001';

export function ListingsProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await authClient.$fetch<{ listings: Listing[] }>(
        `${apiUrl}/api/listings`
      );

      if (!response.data) {
        throw new Error('Failed to fetch listings');
      }

      setListings(response.data.listings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  const addListing = useCallback(async (data: CreateListingData): Promise<Listing | null> => {
    try {
      const response = await authClient.$fetch<{ listing: Listing }>(
        `${apiUrl}/api/listings`,
        {
          method: 'POST',
          body: data,
        }
      );

      if (response.data?.listing) {
        setListings((prev) => [response.data!.listing, ...prev]);
        return response.data.listing;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const updateListing = useCallback((updatedListing: Listing) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === updatedListing.id ? updatedListing : listing
      )
    );
  }, []);

  const getListing = useCallback(
    (id: string) => listings.find((listing) => listing.id === id),
    [listings]
  );

  return (
    <ListingsContext.Provider
      value={{
        listings,
        loading,
        error,
        fetchListings,
        addListing,
        updateListing,
        getListing,
      }}
    >
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const context = useContext(ListingsContext);
  if (!context) {
    throw new Error('useListings must be used within a ListingsProvider');
  }
  return context;
}
