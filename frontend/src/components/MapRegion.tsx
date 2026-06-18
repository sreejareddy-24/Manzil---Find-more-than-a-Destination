import React, { useEffect, useRef, useState } from 'react';
import type { ActivityDetail } from '../types';

interface MapRegionProps {
  activities: ActivityDetail[];
  destination: string;
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#111827" }] },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4b5563" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca3af" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#374151" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca3af" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#4b5563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#030712" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4b5563" }],
  }
];

export const MapRegion: React.FC<MapRegionProps> = ({ activities, destination }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load Google Maps API script dynamically
  useEffect(() => {
    if ((window as any).google && (window as any).google.maps) {
      setApiLoaded(true);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAiyZba3Cjkl0wwdZOu4EW7DATeNnZ9DDE';
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setApiLoaded(true);
      script.onerror = () => setLoadError(true);
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => setApiLoaded(true));
      script.addEventListener('error', () => setLoadError(true));
    }
  }, []);

  // Initialize and Update Map
  useEffect(() => {
    if (!apiLoaded || !mapContainerRef.current) return;

    const google = (window as any).google;

    // Initialize Map Instance if not done
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        styles: darkMapStyle,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    const map = mapRef.current;

    // Clean up existing markers & lines
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // Filter activities with valid coords
    const validActivities = activities.filter(
      act => act.latitude !== undefined && act.longitude !== undefined && act.latitude !== null && act.longitude !== null
    );

    if (validActivities.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      const pathCoordinates: any[] = [];

      validActivities.forEach((act, idx) => {
        const position = { lat: act.latitude!, lng: act.longitude! };
        pathCoordinates.push(position);
        bounds.extend(position);

        // Custom marker style with color index labels
        const marker = new google.maps.Marker({
          position,
          map,
          label: {
            text: String(idx + 1),
            color: 'white',
            fontWeight: 'bold',
          },
          title: act.name,
        });

        // Add Click Action to open info window popup
        marker.addListener('click', () => {
          const contentString = `
            <div style="color: #111827; font-family: system-ui; font-size: 0.82rem; padding: 6px; line-height: 1.4; max-width: 200px;">
              <strong style="display:block; margin-bottom: 3px; font-size: 0.9rem; color: #1e1b4b;">${idx + 1}. ${act.name}</strong>
              <span style="color: #4b5563; font-size: 0.76rem; display: block; margin-bottom: 2px;">⏰ ${act.time}</span>
              ${act.cost > 0 ? `<span style="color: #10b981; font-weight: bold;">💰 $${act.cost}</span>` : '<span style="color: #3b82f6; font-weight: bold;">🎁 Free</span>'}
            </div>
          `;
          infoWindowRef.current.setContent(contentString);
          infoWindowRef.current.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // Fit map display window to boundaries
      map.fitBounds(bounds);

      // Adjust zoom if too close (e.g. only 1 active marker)
      if (validActivities.length === 1) {
        map.setZoom(14);
      }

      // Draw dashed vector route polyline lines
      polylineRef.current = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#06b6d4',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map,
      });
    }
  }, [apiLoaded, activities]);

  if (loadError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--danger)', borderRadius: '16px', color: 'var(--danger)', fontSize: '0.85rem' }}>
        ⚠️ Google Maps API failed to load. Please verify connection and API Key.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      {!apiLoaded && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', zIndex: 5, gap: '10px' }}>
          <div className="spinner-small" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Loading Google Maps...</span>
        </div>
      )}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '300px', zIndex: 1 }} />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 2,
        background: 'rgba(13, 20, 35, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '0.72rem',
        color: 'white',
        fontWeight: 600,
        pointerEvents: 'none',
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
      }}>
        📍 Google Map — {destination}
      </div>
    </div>
  );
};

export default MapRegion;
