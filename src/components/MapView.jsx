import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const greenIcon = createCustomIcon('#C7D1BC');
const redIcon = createCustomIcon('#B8AAC1');
const grayIcon = createCustomIcon('#AAB8C1');

// Component to fit bounds when GPS data changes
function MapUpdater({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
}

const MapView = ({ gpsData }) => {
  if (!gpsData || gpsData.length === 0) {
    return (
      <div className="map-placeholder">
        <p>No GPS data available</p>
      </div>
    );
  }

  // Extract positions from GPS data
  const positions = gpsData.map(point => [point.latitude, point.longitude]);
  
  // Start, end, and intermediate points
  const startPoint = positions[0];
  const endPoint = positions[positions.length - 1];
  const intermediatePoints = positions.slice(1, -1);

  // Calculate center for initial view
  const center = positions[0];

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapUpdater positions={positions} />
      
      {/* Path line */}
      <Polyline 
        positions={positions} 
        color="#C1B8AA" 
        weight={3}
        opacity={0.7}
      />
      
      {/* Start marker (green) */}
      <Marker position={startPoint} icon={greenIcon}>
      </Marker>
      
      {/* Intermediate markers (gray) */}
      {intermediatePoints.map((position, index) => (
        <Marker 
          key={`intermediate-${index}`} 
          position={position} 
          icon={grayIcon}
        />
      ))}
      
      {/* End marker (red) */}
      <Marker position={endPoint} icon={redIcon}>
      </Marker>
    </MapContainer>
  );
};

export default MapView;