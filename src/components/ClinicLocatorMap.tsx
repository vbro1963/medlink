import { useEffect, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { MapPin, Search, Navigation, ExternalLink, Loader2 } from 'lucide-react';
import { api, type NearbyPlace } from '../lib/api';
import type { DoctorProfile } from '../types/telehealth';

interface ClinicLocatorMapProps {
  doctors: DoctorProfile[];
}

interface ClinicPinData {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  lat: number;
  lng: number;
  kind: 'medlink' | 'nearby';
  rating?: number;
  googleMapsUri?: string;
}

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  san: { lat: 37.779, lng: -122.419 },
  boston: { lat: 42.3601, lng: -71.0589 },
  austin: { lat: 30.2672, lng: -97.7431 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  new: { lat: 40.7128, lng: -74.006 },
  london: { lat: 51.5072, lng: -0.1276 },
};

function resolveDoctorCoords(doc: DoctorProfile, index: number): { lat: number; lng: number } {
  const lower = doc.clinicLocation.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(key)) {
      return {
        lat: coords.lat + (index % 3) * 0.008,
        lng: coords.lng - (index % 3) * 0.008,
      };
    }
  }
  return {
    lat: DEFAULT_CENTER.lat + ((index % 4) - 1.5) * 0.012,
    lng: DEFAULT_CENTER.lng + ((index % 3) - 1) * 0.014,
  };
}

function MarkerWithInfo({
  pin,
  isSelected,
  onSelect,
  onClose,
}: {
  pin: ClinicPinData;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: pin.lat, lng: pin.lng }}
        onClick={onSelect}
        title={pin.title}
      >
        <Pin
          background={pin.kind === 'medlink' ? '#0f766e' : '#1e293b'}
          glyphColor="#ffffff"
          borderColor={pin.kind === 'medlink' ? '#134e4a' : '#0f172a'}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose}>
          <div className="max-w-[230px] p-1 text-slate-900">
            <p className="font-semibold text-xs text-slate-900">{pin.title}</p>
            <p className="text-[11px] text-teal-700 font-medium mt-0.5">{pin.subtitle}</p>
            <p className="text-[11px] text-slate-600 mt-1">{pin.address}</p>
            {typeof pin.rating === 'number' && (
              <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                Rating: {pin.rating.toFixed(1)} / 5
              </p>
            )}
            {pin.googleMapsUri && (
              <a
                href={pin.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline mt-1.5"
              >
                Open in Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function ClinicLocatorMap({ doctors }: ClinicLocatorMapProps) {
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [keyLoading, setKeyLoading] = useState(!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const [searchText, setSearchText] = useState('medical clinic pharmacy');
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  useEffect(() => {
    if (apiKey) return;
    api
      .getMapsConfig()
      .then((res) => {
        if (res.apiKey) setApiKey(res.apiKey);
      })
      .catch(() => {})
      .finally(() => setKeyLoading(false));
  }, [apiKey]);

  const doctorPins: ClinicPinData[] = doctors.map((doc, idx) => {
    const coords = resolveDoctorCoords(doc, idx);
    return {
      id: `doc_${doc.id}`,
      title: doc.name,
      subtitle: `${doc.specialty} · $${doc.consultationFee}`,
      address: doc.clinicLocation,
      lat: coords.lat,
      lng: coords.lng,
      kind: 'medlink',
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        doc.clinicLocation
      )}`,
    };
  });

  const nearbyPins: ClinicPinData[] = nearbyPlaces
    .filter((p) => p.location?.latitude && p.location?.longitude)
    .map((p) => ({
      id: `place_${p.id}`,
      title: p.displayName?.text || 'Medical Facility',
      subtitle: 'Nearby Healthcare Facility',
      address: p.formattedAddress || 'Address available in Maps',
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      kind: 'nearby',
      rating: p.rating,
      googleMapsUri: p.googleMapsUri,
    }));

  const allPins = [...doctorPins, ...nearbyPins];

  const handleNearbySearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchError(null);
    setSearching(true);
    try {
      const res = await api.searchNearbyClinics({
        query: searchText,
        lat: mapCenter.lat,
        lng: mapCenter.lng,
      });
      setNearbyPlaces(res.places);
      if (res.places[0]?.location) {
        setMapCenter({
          lat: res.places[0].location.latitude,
          lng: res.places[0].location.longitude,
        });
        setSelectedPinId(`place_${res.places[0].id}`);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Unable to search nearby clinics');
    } finally {
      setSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapCenter(nextCenter);
        setSearching(true);
        setSearchError(null);
        api
          .searchNearbyClinics({
            query: searchText,
            lat: nextCenter.lat,
            lng: nextCenter.lng,
          })
          .then((res) => {
            setNearbyPlaces(res.places);
          })
          .catch((err) => {
            setSearchError(
              err instanceof Error ? err.message : 'Unable to search nearby clinics'
            );
          })
          .finally(() => setSearching(false));
      },
      () => {
        setSearchError('Location permission denied. Search by city or facility name instead.');
      }
    );
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700">
            <MapPin className="w-4 h-4" />
            <span>In-Person Clinics & Nearby Pharmacies</span>
          </div>
          <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5">
            MedLink Clinic & Care Facility Locator
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Locate registered physician offices and search nearby hospitals, labs, or pharmacies for prescriptions.
          </p>
        </div>

        <form onSubmit={handleNearbySearch} className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search pharmacy, lab, clinic..."
              className="w-full min-h-[42px] pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Search Area
          </button>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            Near Me
          </button>
        </form>
      </div>

      {searchError && (
        <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {searchError}
        </div>
      )}

      <div className="h-[380px] w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
        {keyLoading ? (
          <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
            Loading Google Maps...
          </div>
        ) : !apiKey ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Google Maps API key unavailable</p>
            <p className="mt-1 max-w-md">
              Set <span className="font-mono">VITE_GOOGLE_MAPS_API_KEY</span> or{' '}
              <span className="font-mono">GOOGLE_MAPS_API_KEY</span> in environment secrets to enable interactive clinic mapping.
            </p>
          </div>
        ) : (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={mapCenter}
              center={mapCenter}
              defaultZoom={11}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              onCameraChanged={(ev) => setMapCenter(ev.detail.center)}
            >
              {allPins.map((pin) => (
                <MarkerWithInfo
                  key={pin.id}
                  pin={pin}
                  isSelected={selectedPinId === pin.id}
                  onSelect={() => setSelectedPinId(pin.id)}
                  onClose={() => setSelectedPinId(null)}
                />
              ))}
            </Map>
          </APIProvider>
        )}
      </div>

      {nearbyPlaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {nearbyPlaces.slice(0, 4).map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => {
                if (place.location) {
                  setMapCenter({
                    lat: place.location.latitude,
                    lng: place.location.longitude,
                  });
                }
                setSelectedPinId(`place_${place.id}`);
              }}
              className="p-3 rounded-xl border border-slate-200 hover:border-teal-600/40 bg-slate-50 text-left transition-colors cursor-pointer"
            >
              <p className="font-semibold text-xs text-slate-900 truncate">
                {place.displayName?.text || 'Medical Facility'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                {place.formattedAddress}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
