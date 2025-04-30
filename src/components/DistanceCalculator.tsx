import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Location, DistanceResult, RouteResponse } from '../interfaces';
// Get API key from environment variables
const OPENROUTESERVICE_API_KEY = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;


const DistanceCalculator = () => {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [pricePerKm, setPricePerKm] = useState<number>(0);
  const [result, setResult] = useState<DistanceResult | null>(null);
  const [selectedField, setSelectedField] = useState<'origin' | 'destination' | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.135189259153254, -86.25625610588644]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const defaultZoom = 15;

  const resetCalculator = () => {
    setOrigin(null);
    setDestination(null);
    setPricePerKm(0);
    setResult(null);
    setSelectedField(null);
    setRoute([]);
    setMapCenter([12.135189259153254, -86.25625610588644]);
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (!selectedField) return;

        const { lat, lng } = e.latlng;
        const location: Location = { lat, lng };

        if (selectedField === 'origin') {
          setOrigin(location);
          setMapCenter([lat, lng]);
        } else {
          setDestination(location);
        }

        // Clear results when selecting new locations
        setResult(null);
        setRoute([]);

        // Reset selection after clicking
        setSelectedField(null);
      },
    });

    return null;
  };

  const calculateDistance = async () => {
    if (!origin || !destination) return;

    setIsLoading(true);
    try {
      // Using OpenRouteService API to get the route
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${OPENROUTESERVICE_API_KEY}&start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}`,
        {
          headers: {
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to calculate route');
      }

      const data: RouteResponse = await response.json();
      
      if (data.features && data.features.length > 0) {
        const routeData = data.features[0];
        const distance = routeData.properties.segments[0].distance / 1000; // Convert meters to kilometers
        const durationHours = routeData.properties.segments[0].duration / 3600; // Convert seconds to hours
        const duration = `${Math.floor(durationHours)}h ${Math.round((durationHours % 1) * 60)}m`;
        const cost = distance * pricePerKm;

        setResult({
          distance,
          duration,
          cost
        });

        // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
        const routeCoordinates: [number, number][] = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
        setRoute(routeCoordinates);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      // Fallback to straight-line distance if routing fails
      const R = 6371; // Earth's radius in kilometers
      const dLat = (destination.lat - origin.lat) * (Math.PI / 180);
      const dLon = (destination.lng - origin.lng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(origin.lat * (Math.PI / 180)) *
          Math.cos(destination.lat * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      const durationHours = distance / 60;
      const duration = `${Math.floor(durationHours)}h ${Math.round((durationHours % 1) * 60)}m`;
      const cost = distance * pricePerKm;

      setResult({
        distance,
        duration,
        cost
      });

      setRoute([
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 mb-8 mt-5">
      <div className="input-group">
        <div className="input-wrapper">
          <div className="location-info">
            <span>Origin: </span>
            {origin && (
              <span>
                {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
              </span>
            )}
          </div>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-lg"
            onClick={() => setSelectedField('origin')}
          >
            Select on Map
          </button>
        </div>
        <div className="input-wrapper">
          <div className="location-info">
            <span>Destination: </span>
            {destination && (
              <span>
                {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
              </span>
            )}
          </div>
          <button
            className=" bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-lg"
            onClick={() => setSelectedField('destination')}
          >
            Select on Map
          </button>
        </div>
        <div className='text-lg bg-stone-200  rounded-md p-6 mb-3 '>
          <span className='mr-6'>Price per km: </span>
        <input
            type="number"
            className='bg-stone-200 text-stone-800 p-2 rounded-md border-2 border-stone-800'
          placeholder="Price per km"
          value={pricePerKm}
          onChange={(e) => setPricePerKm(Number(e.target.value))}
        />
        </div>
       
        <div className="flex gap-4">
          <button 
            onClick={calculateDistance}
            disabled={isLoading}
            className='bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-lg'
          >
            {isLoading ? 'Calculating...' : 'Calculate'}
          </button>
          <button onClick={resetCalculator} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 text-lg">Reset</button>
        </div>
      </div>

      {result && (
        <div className="max-w-md mx-auto bg-stone-200 text-lg p-4 rounded-md text-stone-800 mt-4">
          <h3>Results:</h3>
          <p>Distance: {result.distance.toFixed(2)} km</p>
          <p>Duration: {result.duration}</p>
          <p>Cost: ${result.cost.toFixed(2)}</p>
        </div>
      )}

      <div className="w-full h-full mt-5">
        <MapContainer
          center={mapCenter}
          zoom={defaultZoom}
          style={{ height: '400px', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {origin && <Marker position={[origin.lat, origin.lng]} />}
          {destination && <Marker position={[destination.lat, destination.lng]} />}
          {route.length > 0 && (
            <Polyline
              positions={route}
              color="red"
              weight={5}
              opacity={0.7}
              dashArray="5, 10"
            />
          )}
          <MapClickHandler />
        </MapContainer>
        {selectedField && (
          <div className="map-instruction">
            Click on the map to select {selectedField === 'origin' ? 'origin' : 'destination'} location
          </div>
        )}
      </div>
    </div>
  );
};

export default DistanceCalculator; 