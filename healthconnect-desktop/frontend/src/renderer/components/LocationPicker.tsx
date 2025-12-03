import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import L from "leaflet";
import debounce from "lodash.debounce";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: LatLngLiteral = { lat: 5.6037, lng: -0.187 };

const defaultIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    county?: string;
    state?: string;
    region?: string;
    country?: string;
    postcode?: string;
    road?: string;
    neighbourhood?: string;
  };
}

export interface LocationSelection {
  latitude: number;
  longitude: number;
  displayName: string;
  address: GeocodeResult["address"];
}

interface LocationPickerProps {
  onLocationChange: (selection: LocationSelection) => void;
  value?: LocationSelection | null;
  label?: string;
}

const fetchSuggestions = async (query: string): Promise<GeocodeResult[]> => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": "MedLink Desktop/1.0 (contact@medlink.africa)" },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch locations");
  }
  const payload = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address: GeocodeResult["address"];
  }>;

  return payload.map((item) => ({
    lat: Number(item.lat),
    lng: Number(item.lon),
    displayName: item.display_name,
    address: item.address ?? {},
  }));
};

const DraggableMarker = ({
  position,
  onUpdate,
}: {
  position: LatLngLiteral;
  onUpdate: (coords: LatLngLiteral) => void;
}) => {
  useMapEvents({
    click(event) {
      onUpdate(event.latlng);
    },
  });

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (event) => {
          const marker = event.target;
          const { lat, lng } = marker.getLatLng();
          onUpdate({ lat, lng });
        },
      }}
    />
  );
};

const LocationPicker = ({
  onLocationChange,
  value,
  label,
}: LocationPickerProps) => {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<LatLngLiteral>(
    value ? { lat: value.latitude, lng: value.longitude } : DEFAULT_CENTER
  );
  const mapRef = useRef<L.Map | null>(null);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim()) {
          setSuggestions([]);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const results = await fetchSuggestions(query);
          setSuggestions(results);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Unable to search locations."
          );
        } finally {
          setLoading(false);
        }
      }, 400),
    []
  );

  useEffect(() => {
    debouncedSearch(search);
    return () => {
      debouncedSearch.cancel();
    };
  }, [search, debouncedSearch]);

  const reverseLookup = useCallback(
    async (coords: LatLngLiteral) => {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "json");
      url.searchParams.set("lat", coords.lat.toString());
      url.searchParams.set("lon", coords.lng.toString());
      url.searchParams.set("addressdetails", "1");
      try {
        const response = await fetch(url.toString(), {
          headers: {
            "User-Agent": "MedLink Desktop/1.0 (contact@medlink.africa)",
          },
        });
        const payload = (await response.json()) as {
          display_name: string;
          address: GeocodeResult["address"];
        };
        onLocationChange({
          latitude: coords.lat,
          longitude: coords.lng,
          displayName: payload.display_name,
          address: payload.address ?? {},
        });
      } catch {
        onLocationChange({
          latitude: coords.lat,
          longitude: coords.lng,
          displayName: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
          address: {},
        });
      }
    },
    [onLocationChange]
  );

  const applySelection = useCallback(
    (selection: GeocodeResult) => {
      const coords = { lat: selection.lat, lng: selection.lng };
      setPosition(coords);
      setSuggestions([]);
      setSearch(selection.displayName);
      onLocationChange({
        latitude: coords.lat,
        longitude: coords.lng,
        displayName: selection.displayName,
        address: selection.address,
      });
      if (mapRef.current) {
        mapRef.current.flyTo(coords, 15);
      }
    },
    [onLocationChange]
  );

  const handleMarkerChange = useCallback(
    (coords: LatLngLiteral) => {
      setPosition(coords);
      reverseLookup(coords);
    },
    [reverseLookup]
  );

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available on this device.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setLoading(false);
        const coords = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
        };
        setPosition(coords);
        if (mapRef.current) {
          mapRef.current.flyTo(coords, 16);
        }
        reverseLookup(coords);
      },
      () => {
        setLoading(false);
        setError("Unable to retrieve your current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, [reverseLookup]);

  useEffect(() => {
    if (value) {
      const coords = { lat: value.latitude, lng: value.longitude };
      setPosition(coords);
      setSearch(value.displayName);
    } else {
      setSearch("");
      setSuggestions([]);
    }
  }, [value]);

  return (
    <div className="location-picker">
      {label && <label className="location-picker-label">{label}</label>}
      <div className="location-search">
        <input
          type="text"
          placeholder="Search for a pharmacy location..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search location"
        />
        <button
          type="button"
          className="ghost-button"
          onClick={useCurrentLocation}
        >
          Use my location
        </button>
      </div>
      {error && <p className="input-error">{error}</p>}
      {loading && <p className="muted">Searching map data…</p>}
      {suggestions.length > 0 && (
        <ul className="location-suggestions">
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.lat}-${suggestion.lng}`}>
              <button
                type="button"
                onClick={() => applySelection(suggestion)}
                className="suggestion-item"
              >
                <strong>{suggestion.displayName}</strong>
                <small>
                  {[
                    suggestion.address.suburb ??
                      suggestion.address.neighbourhood ??
                      suggestion.address.road,
                    suggestion.address.city ??
                      suggestion.address.town ??
                      suggestion.address.village ??
                      suggestion.address.state,
                    suggestion.address.country,
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="map-wrapper">
        <MapContainer
          center={position}
          zoom={value ? 15 : 12}
          scrollWheelZoom
          whenCreated={(map) => {
            mapRef.current = map;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <DraggableMarker position={position} onUpdate={handleMarkerChange} />
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
