import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet's default marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Custom Red Icon for Safety Incidents
let WarningIcon = L.icon({
  iconUrl: icon, 
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'red-hue-filter' 
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function LiveIncidentMap({ token, onLogout }) {
  const [crimes, setCrimes] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UPDATED: Center point for Turffontein/Rosettenville/The Hill/Chrisville area
  const mapCenter = [-26.2450, 28.0350]; 

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const [crimeRes, centersRes] = await Promise.all([
          fetchWithAuth('/api/admin/crime-spottings', token),
          fetchWithAuth('/api/empowerment-centers', token)
        ]);
        
        const crimeData = await crimeRes.json();
        const centerData = await centersRes.json();
        
        setCrimes(crimeData.data || []);
        setCenters(centerData.data || []);
      } catch (err) {
        if (err.message === 'AUTH_EXPIRED') onLogout();
        else setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [token, onLogout]);

  if (loading) return <p style={{ color: '#6b7280' }}>Initializing Joburg South geospatial tracking...</p>;
  if (error) return <div style={{ color: '#9b1c1c', padding: '12px', backgroundColor: '#fde8e8', borderRadius: '4px' }}>Map Failure: {error}</div>;

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>🌍 Operational View: Joburg South Grid</h3>
      
      <style>{`
        .red-hue-filter { filter: hue-rotate(150deg) saturate(300%); }
      `}</style>

      <div style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db', zIndex: 0 }}>
        {/* UPDATED: Zoom level 14 provides a tight focus on the four suburbs */}
        <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {centers.map(center => (
            center.latitude && center.longitude && (
              <Marker key={`center-${center.id}`} position={[center.latitude, center.longitude]}>
                <Popup>
                  <strong>🏢 {center.center_name}</strong><br/>
                  <em>{center.focus_area}</em><br/>
                  Contact: {center.contact_number}
                </Popup>
              </Marker>
            )
          ))}

          {crimes.map(crime => (
            crime.latitude && crime.longitude && (
              <Marker key={`crime-${crime.id}`} position={[crime.latitude, crime.longitude]} icon={WarningIcon}>
                <Popup>
                  <strong style={{ color: '#dc2626' }}>⚠️ {crime.incident_type}</strong><br/>
                  Severity: {crime.severity_level}<br/>
                  {crime.location_description}
                </Popup>
              </Marker>
            )
          ))}

        </MapContainer>
      </div>
    </div>
  );
}