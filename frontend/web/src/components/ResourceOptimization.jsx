import React, { useState, useEffect } from 'react';
import { 
  Package, 
  MapPin, 
  Truck, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Navigation,
  Building2,
  Target,
  Crosshair,
  RefreshCw,
  Download,
  BarChart3
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

const ResourceOptimization = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [resourceCenters, setResourceCenters] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Disaster locations
  const [disasters, setDisasters] = useState([
    {
      id: 'D001',
      name: 'Flood Affected Area - Chennai',
      latitude: 13.0827,
      longitude: 80.2707,
      demand: {
        medical_kits: 100,
        food_packets: 500,
        tents: 50,
        water_tanks: 20,
        rescue_equipment: 10
      },
      priority: 4
    }
  ]);

  // Fetch resource centers on mount
  useEffect(() => {
    fetchResourceCenters();
  }, []);

  const fetchResourceCenters = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resource-centers`);
      if (response.ok) {
        const data = await response.json();
        setResourceCenters(data.centers);
      }
    } catch (err) {
      console.error('Failed to fetch resource centers:', err);
    }
  };

  const getCurrentLocation = (index) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateDisaster(index, 'latitude', position.coords.latitude.toFixed(4));
        updateDisaster(index, 'longitude', position.coords.longitude.toFixed(4));
        setGettingLocation(false);
      },
      (error) => {
        setGettingLocation(false);
        setError('Failed to get location: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const addDisaster = () => {
    const newId = `D00${disasters.length + 1}`;
    setDisasters([
      ...disasters,
      {
        id: newId,
        name: `Disaster Site ${disasters.length + 1}`,
        latitude: 28.6139,
        longitude: 77.2090,
        demand: {
          medical_kits: 50,
          food_packets: 200,
          tents: 25,
          water_tanks: 10,
          rescue_equipment: 5
        },
        priority: 3
      }
    ]);
  };

  const removeDisaster = (index) => {
    if (disasters.length > 1) {
      setDisasters(disasters.filter((_, i) => i !== index));
    }
  };

  const updateDisaster = (index, field, value) => {
    const updated = [...disasters];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updated[index][parent][child] = parseInt(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setDisasters(updated);
  };

  const optimizeResources = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disaster_locations: disasters.map(d => ({
            ...d,
            latitude: parseFloat(d.latitude),
            longitude: parseFloat(d.longitude)
          }))
        })
      });

      if (!response.ok) throw new Error('Optimization failed');

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resourceTypes = [
    { key: 'medical_kits', label: 'Medical Kits', icon: '🏥', color: 'text-red-400' },
    { key: 'food_packets', label: 'Food Packets', icon: '🍱', color: 'text-yellow-400' },
    { key: 'tents', label: 'Tents', icon: '⛺', color: 'text-green-400' },
    { key: 'water_tanks', label: 'Water Tanks', icon: '💧', color: 'text-blue-400' },
    { key: 'rescue_equipment', label: 'Rescue Equipment', icon: '🚁', color: 'text-purple-400' }
  ];

  return (
    <div className="text-white">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Resource Allocation Optimizer</h2>
                <p className="text-gray-400 text-sm">Minimize travel distance with optimal resource distribution</p>
              </div>
            </div>
            <button
              onClick={fetchResourceCenters}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Centers</span>
            </button>
          </div>

          {/* Resource Centers Info */}
          <div className="bg-[#1E293B] rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span>Resource Centers ({resourceCenters.length})</span>
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {resourceCenters.slice(0, 8).map((center, idx) => (
                <div key={center.id} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-sm font-semibold text-blue-300">{center.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {center.latitude.toFixed(2)}°, {center.longitude.toFixed(2)}°
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disaster Locations */}
          <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Target className="w-5 h-5 text-red-400" />
                <span>Disaster Locations</span>
              </h3>
              <button
                onClick={addDisaster}
                className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Location</span>
              </button>
            </div>

            <div className="space-y-4">
              {disasters.map((disaster, index) => (
                <div key={disaster.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="bg-red-500/30 text-red-400 px-2 py-1 rounded text-xs font-semibold">
                        {disaster.id}
                      </span>
                      <input
                        type="text"
                        value={disaster.name}
                        onChange={(e) => updateDisaster(index, 'name', e.target.value)}
                        className="bg-transparent border-b border-gray-600 text-white font-semibold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => getCurrentLocation(index)}
                        disabled={gettingLocation}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-all text-sm"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Current Location</span>
                      </button>
                      {disasters.length > 1 && (
                        <button
                          onClick={() => removeDisaster(index)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Location & Priority */}
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Latitude</label>
                      <input
                        type="number"
                        value={disaster.latitude}
                        onChange={(e) => updateDisaster(index, 'latitude', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                        step="0.0001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Longitude</label>
                      <input
                        type="number"
                        value={disaster.longitude}
                        onChange={(e) => updateDisaster(index, 'longitude', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                        step="0.0001"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Priority (1-5)</label>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((p) => (
                          <button
                            key={p}
                            onClick={() => updateDisaster(index, 'priority', p)}
                            className={`flex-1 py-2 rounded text-sm font-semibold transition-all ${
                              disaster.priority === p
                                ? p >= 4 ? 'bg-red-500 text-white' : p >= 3 ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resource Demands */}
                  <div className="grid grid-cols-5 gap-2">
                    {resourceTypes.map((resource) => (
                      <div key={resource.key}>
                        <label className={`block text-xs ${resource.color} mb-1 flex items-center space-x-1`}>
                          <span>{resource.icon}</span>
                          <span>{resource.label}</span>
                        </label>
                        <input
                          type="number"
                          value={disaster.demand[resource.key]}
                          onChange={(e) => updateDisaster(index, `demand.${resource.key}`, e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
                          min="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Optimize Button */}
            <button
              onClick={optimizeResources}
              disabled={loading}
              className="mt-6 w-full py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Optimizing...</span>
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5" />
                  <span>Optimize Resource Allocation</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 flex items-center space-x-3">
              <XCircle className="w-6 h-6 text-red-500" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {/* Optimization Results */}
          {result && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#1E293B] rounded-xl p-4 border border-green-500/50">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <div className="text-2xl font-bold text-green-400">{result.summary.fulfillment_rate_percent}%</div>
                      <div className="text-sm text-gray-400">Fulfillment Rate</div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1E293B] rounded-xl p-4 border border-blue-500/50">
                  <div className="flex items-center space-x-3">
                    <Navigation className="w-8 h-8 text-blue-400" />
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{result.total_distance_km} km</div>
                      <div className="text-sm text-gray-400">Total Distance</div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1E293B] rounded-xl p-4 border border-purple-500/50">
                  <div className="flex items-center space-x-3">
                    <Package className="w-8 h-8 text-purple-400" />
                    <div>
                      <div className="text-2xl font-bold text-purple-400">{result.total_allocations}</div>
                      <div className="text-sm text-gray-400">Allocations</div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1E293B] rounded-xl p-4 border border-yellow-500/50">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-8 h-8 text-yellow-400" />
                    <div>
                      <div className="text-2xl font-bold text-yellow-400">{result.summary.centers_used}</div>
                      <div className="text-sm text-gray-400">Centers Used</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Allocation Plan */}
              <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-blue-400" />
                  <span>Allocation Plan</span>
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                        <th className="pb-3 pr-4">From Center</th>
                        <th className="pb-3 pr-4">To Disaster</th>
                        <th className="pb-3 pr-4">Resource</th>
                        <th className="pb-3 pr-4">Quantity</th>
                        <th className="pb-3 pr-4">Distance</th>
                        <th className="pb-3">Est. Time</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {result.allocation_plan.map((allocation, idx) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-3 pr-4">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-blue-400" />
                              <span className="text-blue-300">{allocation.from_center}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center space-x-2">
                              <Target className="w-4 h-4 text-red-400" />
                              <span className="text-red-300">{allocation.to_disaster}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                              {resourceTypes.find(r => r.key === allocation.resource_type)?.icon} {allocation.resource_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-semibold text-green-400">{allocation.quantity}</td>
                          <td className="py-3 pr-4 text-yellow-400">{allocation.distance_km} km</td>
                          <td className="py-3">
                            <div className="flex items-center space-x-1 text-gray-300">
                              <Clock className="w-3 h-3" />
                              <span>{allocation.estimated_time_hours}h</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unmet Demands */}
              {Object.keys(result.unmet_demands).length > 0 && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Unmet Demands</span>
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(result.unmet_demands).map(([locationId, demands]) => (
                      <div key={locationId} className="flex items-center space-x-4">
                        <span className="text-red-300 font-semibold">{locationId}:</span>
                        <div className="flex space-x-2">
                          {Object.entries(demands).map(([resource, quantity]) => (
                            <span key={resource} className="px-2 py-1 bg-red-900/30 rounded text-xs text-red-300">
                              {resource}: {quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Footer */}
          <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4 text-gray-400">
                <span className="flex items-center space-x-1">
                  <Navigation className="w-4 h-4" />
                  <span>Haversine Distance</span>
                </span>
                <span>|</span>
                <span>Greedy Optimization</span>
                <span>|</span>
                <span>Priority-weighted Allocation</span>
              </div>
              <span className="text-gray-500 text-xs">
                {new Date().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
    </div>
  );
};

export default ResourceOptimization;
