import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Thermometer, 
  Wind, 
  Droplets, 
  Activity,
  Flame,
  MapPin,
  RefreshCw,
  TrendingUp,
  Brain,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Navigation,
  Crosshair
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

const RiskPrediction = () => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('location'); // 'location' or 'manual'
  const [scenarios, setScenarios] = useState(null);
  
  // Location input
  const [latitude, setLatitude] = useState('28.6139');
  const [longitude, setLongitude] = useState('77.2090');
  const [region, setRegion] = useState('IND');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Get current location using browser geolocation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(4));
        setLongitude(position.coords.longitude.toFixed(4));
        setGettingLocation(false);
        
        // Auto-detect region based on coordinates (simplified)
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        if (lat >= 6 && lat <= 36 && lon >= 68 && lon <= 98) setRegion('IND');
        else if (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66) setRegion('USA');
        else if (lat >= -44 && lat <= -10 && lon >= 112 && lon <= 154) setRegion('AUS');
        else setRegion('world');
      },
      (error) => {
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out.');
            break;
          default:
            setLocationError('An unknown error occurred.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };
  
  // Manual feature input
  const [manualFeatures, setManualFeatures] = useState({
    rainfall: 10,
    wind_speed: 5,
    humidity: 50,
    avg_magnitude: 0,
    fire_count: 0
  });

  const getRiskIcon = (level) => {
    switch (level) {
      case 'High': return <XCircle className="w-8 h-8 text-red-500" />;
      case 'Medium': return <AlertCircle className="w-8 h-8 text-yellow-500" />;
      case 'Low': return <CheckCircle className="w-8 h-8 text-green-500" />;
      default: return <AlertTriangle className="w-8 h-8 text-gray-500" />;
    }
  };

  const getRiskStyles = (level) => {
    switch (level) {
      case 'High': return { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', glow: 'shadow-red-500/30' };
      case 'Medium': return { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/30' };
      case 'Low': return { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', glow: 'shadow-green-500/30' };
      default: return { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-400', glow: '' };
    }
  };

  const predictFromLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/prediction/risk/predict-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          region_code: region
        })
      });
      
      if (!response.ok) throw new Error('Failed to get prediction');
      
      const data = await response.json();
      setPrediction(data.prediction);
      setLiveData(data.live_data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const predictFromFeatures = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/prediction/risk/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: manualFeatures })
      });
      
      if (!response.ok) throw new Error('Failed to get prediction');
      
      const data = await response.json();
      setPrediction(data);
      setLiveData(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadScenarios = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/prediction/risk/simulate`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios);
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
  };

  const handlePredict = () => {
    if (mode === 'location') {
      predictFromLocation();
    } else {
      predictFromFeatures();
    }
  };

  // Feature cards for input display
  const featureCards = [
    { 
      key: 'rainfall', 
      label: 'Rainfall', 
      unit: 'mm', 
      icon: <Droplets className="w-5 h-5" />,
      color: 'text-blue-400',
      min: 0, 
      max: 500 
    },
    { 
      key: 'wind_speed', 
      label: 'Wind Speed', 
      unit: 'm/s', 
      icon: <Wind className="w-5 h-5" />,
      color: 'text-cyan-400',
      min: 0, 
      max: 100 
    },
    { 
      key: 'humidity', 
      label: 'Humidity', 
      unit: '%', 
      icon: <Thermometer className="w-5 h-5" />,
      color: 'text-purple-400',
      min: 0, 
      max: 100 
    },
    { 
      key: 'avg_magnitude', 
      label: 'Avg. Magnitude', 
      unit: '', 
      icon: <Activity className="w-5 h-5" />,
      color: 'text-orange-400',
      min: 0, 
      max: 10 
    },
    { 
      key: 'fire_count', 
      label: 'Fire Count', 
      unit: '', 
      icon: <Flame className="w-5 h-5" />,
      color: 'text-red-400',
      min: 0, 
      max: 200 
    }
  ];

  return (
    <div className="text-white">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-purple-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">AI Risk Prediction</h2>
                <p className="text-gray-400 text-sm">LSTM-powered disaster risk classification</p>
              </div>
            </div>
            <button
              onClick={loadScenarios}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all"
            >
              <TrendingUp className="w-4 h-4" />
          <span>Load Scenarios</span>
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="bg-[#1E293B] rounded-xl p-2 flex space-x-2">
        <button
          onClick={() => setMode('location')}
          className={`flex-1 py-3 rounded-lg transition-all flex items-center justify-center space-x-2 ${
            mode === 'location' 
              ? 'bg-blue-500/30 text-blue-400 border border-blue-500' 
              : 'text-gray-400 hover:bg-gray-700'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>Live Data (Location)</span>
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-3 rounded-lg transition-all flex items-center justify-center space-x-2 ${
            mode === 'manual' 
              ? 'bg-purple-500/30 text-purple-400 border border-purple-500' 
              : 'text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span>Manual Features</span>
        </button>
      </div>

      {/* Input Section */}
      <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700">
        {mode === 'location' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span>Location Input</span>
              </h3>
              <button
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Getting Location...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-4 h-4" />
                    <span>Use Current Location</span>
                  </>
                )}
              </button>
            </div>
            
            {locationError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">{locationError}</span>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Latitude</label>
                <input
                  type="number"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="-90 to 90"
                  step="0.0001"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Longitude</label>
                <input
                  type="number"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="-180 to 180"
                  step="0.0001"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Region (Fire Data)</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="IND">India</option>
                  <option value="USA">USA</option>
                  <option value="AUS">Australia</option>
                  <option value="world">Global</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              <Navigation className="w-3 h-3 inline mr-1" />
              Fetches real-time data from OpenWeatherMap, USGS Earthquake API, and NASA FIRMS
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <span>Manual Feature Input</span>
            </h3>
            <div className="grid grid-cols-5 gap-4">
              {featureCards.map((feature) => (
                <div key={feature.key} className="space-y-2">
                  <label className={`flex items-center space-x-2 text-sm ${feature.color}`}>
                    {feature.icon}
                    <span>{feature.label}</span>
                  </label>
                  <input
                    type="number"
                    value={manualFeatures[feature.key]}
                    onChange={(e) => setManualFeatures({
                      ...manualFeatures,
                      [feature.key]: parseFloat(e.target.value) || 0
                    })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                    min={feature.min}
                    max={feature.max}
                    step={feature.key === 'avg_magnitude' ? 0.1 : 1}
                  />
                  <span className="text-xs text-gray-500">{feature.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Predict Button */}
        <button
          onClick={handlePredict}
          disabled={loading}
          className="mt-6 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              <span>Predict Risk Level</span>
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

      {/* Prediction Result */}
      {prediction && (
        <div className="grid grid-cols-2 gap-6">
          {/* Risk Level Card */}
          <div className={`${getRiskStyles(prediction.risk_level).bg} ${getRiskStyles(prediction.risk_level).border} border rounded-xl p-6 shadow-lg ${getRiskStyles(prediction.risk_level).glow}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Risk Assessment</h3>
              {getRiskIcon(prediction.risk_level)}
            </div>
            
            <div className="text-center mb-6">
              <div className={`text-5xl font-bold ${getRiskStyles(prediction.risk_level).text}`}>
                {prediction.risk_level}
              </div>
              <div className="text-gray-400 mt-2">Risk Level</div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Risk Score</span>
                  <span className="text-white font-semibold">{(prediction.risk_score * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${prediction.risk_level === 'High' ? 'bg-red-500' : prediction.risk_level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${prediction.risk_score * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Confidence</span>
                  <span className="text-white font-semibold">{(prediction.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${prediction.confidence * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Probability Breakdown */}
            {prediction.details?.probabilities && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h4 className="text-sm text-gray-400 mb-3">Probability Breakdown</h4>
                <div className="space-y-2">
                  {Object.entries(prediction.details.probabilities).map(([level, prob]) => (
                    <div key={level} className="flex items-center space-x-3">
                      <span className={`w-16 text-sm ${level === 'High' ? 'text-red-400' : level === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                        {level}
                      </span>
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${level === 'High' ? 'bg-red-500' : level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${prob * 100}%` }}
                        />
                      </div>
                      <span className="text-white text-sm w-12 text-right">{(prob * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Features Used Card */}
          <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Features Used</h3>
            
            <div className="space-y-4">
              {featureCards.map((feature) => (
                <div key={feature.key} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={feature.color}>{feature.icon}</div>
                    <span className="text-gray-300">{feature.label}</span>
                  </div>
                  <span className={`text-lg font-semibold ${feature.color}`}>
                    {prediction.features_used[feature.key]}
                    {feature.unit && <span className="text-sm text-gray-500 ml-1">{feature.unit}</span>}
                  </span>
                </div>
              ))}
            </div>

            {/* Live Data Source Info */}
            {liveData && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h4 className="text-sm text-gray-400 mb-3 flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4" />
                  <span>Live Data Sources</span>
                </h4>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Location: {liveData.location.latitude.toFixed(4)}, {liveData.location.longitude.toFixed(4)}</p>
                  <p>Weather: OpenWeatherMap API</p>
                  <p>Earthquakes: USGS (7-day average)</p>
                  <p>Fires: NASA FIRMS ({liveData.location.region})</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scenario Simulations */}
      {scenarios && (
        <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span>Scenario Simulations</span>
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario, index) => (
              <div 
                key={index}
                className={`${getRiskStyles(scenario.risk_level).bg} ${getRiskStyles(scenario.risk_level).border} border rounded-lg p-4 transition-all hover:scale-105`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{scenario.scenario}</span>
                  {getRiskIcon(scenario.risk_level)}
                </div>
                <div className={`text-2xl font-bold ${getRiskStyles(scenario.risk_level).text}`}>
                  {scenario.risk_level}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Score: {(scenario.risk_score * 100).toFixed(1)}% | Confidence: {(scenario.confidence * 100).toFixed(1)}%
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Rain: {scenario.features.rainfall}mm | Wind: {scenario.features.wind_speed}m/s | Fires: {scenario.features.fire_count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Info */}
      <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-gray-400">
            <span className="flex items-center space-x-1">
              <Brain className="w-4 h-4" />
              <span>LSTM Neural Network</span>
            </span>
            <span>|</span>
            <span>TensorFlow/Keras</span>
            <span>|</span>
            <span>5 Input Features</span>
            <span>|</span>
            <span>3 Risk Classes</span>
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

export default RiskPrediction;
