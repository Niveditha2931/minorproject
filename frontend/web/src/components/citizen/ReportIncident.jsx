import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = 'http://localhost:5000/api';

const INCIDENT_TYPES = [
  { value: 'flood', label: 'Flood', icon: '🌊' },
  { value: 'earthquake', label: 'Earthquake', icon: '🌍' },
  { value: 'fire', label: 'Fire', icon: '🔥' },
  { value: 'cyclone', label: 'Cyclone/Storm', icon: '🌀' },
  { value: 'landslide', label: 'Landslide', icon: '⛰️' },
  { value: 'accident', label: 'Road Accident', icon: '🚗' },
  { value: 'medical_emergency', label: 'Medical Emergency', icon: '🏥' },
  { value: 'building_collapse', label: 'Building Collapse', icon: '🏚️' },
  { value: 'gas_leak', label: 'Gas Leak', icon: '💨' },
  { value: 'electrical_hazard', label: 'Electrical Hazard', icon: '⚡' },
  { value: 'water_shortage', label: 'Water Shortage', icon: '💧' },
  { value: 'road_damage', label: 'Road Damage', icon: '🚧' },
  { value: 'other', label: 'Other', icon: '📋' }
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Minor issue, no immediate danger', color: 'green' },
  { value: 'medium', label: 'Medium', description: 'Requires attention but not urgent', color: 'yellow' },
  { value: 'high', label: 'High', description: 'Serious situation, needs quick response', color: 'orange' },
  { value: 'critical', label: 'Critical', description: 'Life-threatening emergency', color: 'red' }
];

export default function ReportIncident() {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    severity: 'medium',
    location: {
      address: '',
      city: '',
      state: '',
      pincode: '',
      coordinates: { latitude: null, longitude: null },
      landmark: ''
    },
    impact: {
      affectedPeople: 0,
      injuries: 0,
      propertyDamage: 'none'
    },
    media: []
  });

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              coordinates: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            }
          }));
        },
        (error) => {
          console.error('Location error:', error);
          setError('Could not get your location. Please enter it manually.');
        }
      );
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/incidents/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to report incident');
      }
      
      setSuccess(true);
      setTrackingId(data.data.trackingId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Incident Reported!</h2>
          <p className="text-gray-400 mb-4">
            Your incident has been submitted successfully. Our team will review and respond shortly.
          </p>
          <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
            <p className="text-gray-400 text-sm">Tracking ID</p>
            <p className="text-blue-400 font-mono text-lg">{trackingId}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/citizen/my-reports')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View My Reports
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setStep(1);
                setFormData({
                  title: '',
                  description: '',
                  type: '',
                  severity: 'medium',
                  location: { ...formData.location },
                  impact: { affectedPeople: 0, injuries: 0, propertyDamage: 'none' },
                  media: []
                });
              }}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Report Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Report an Incident</h1>
        <p className="text-gray-400 mt-1">Help us respond quickly by providing accurate information</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step >= s ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
            }`}>
              {s}
            </div>
            <span className={`ml-2 text-sm ${step >= s ? 'text-white' : 'text-gray-500'}`}>
              {s === 1 ? 'Type & Details' : s === 2 ? 'Location' : 'Review'}
            </span>
            {s < 3 && <div className={`w-16 md:w-24 h-1 mx-4 ${step > s ? 'bg-blue-600' : 'bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Incident Type & Details */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Incident Type */}
          <div>
            <label className="block text-white font-medium mb-3">What type of incident?</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INCIDENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    formData.type === type.value
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <p className="mt-2 font-medium">{type.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-white font-medium mb-2">Brief Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="E.g., Water logging on main road"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-white font-medium mb-2">Detailed Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the incident in detail - what happened, when, current situation..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
              maxLength={2000}
            />
          </div>

          {/* Severity */}
          <div>
            <label className="block text-white font-medium mb-3">How severe is it?</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SEVERITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, severity: level.value }))}
                  className={`p-4 rounded-lg border text-center transition-colors ${
                    formData.severity === level.value
                      ? `bg-${level.color}-500/20 border-${level.color}-500 text-white`
                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                  style={{
                    backgroundColor: formData.severity === level.value ? `rgba(var(--${level.color}), 0.2)` : '',
                    borderColor: formData.severity === level.value ? 
                      (level.color === 'green' ? '#22c55e' : 
                       level.color === 'yellow' ? '#eab308' : 
                       level.color === 'orange' ? '#f97316' : '#ef4444') : ''
                  }}
                >
                  <p className="font-medium">{level.label}</p>
                  <p className="text-xs text-gray-400 mt-1">{level.description}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              if (!formData.type || !formData.title || !formData.description) {
                setError('Please fill in all required fields');
                return;
              }
              setError('');
              setStep(2);
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continue to Location
          </button>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-white font-medium">Current Location</p>
              <p className="text-sm text-gray-400">
                {formData.location.coordinates.latitude 
                  ? `${formData.location.coordinates.latitude.toFixed(4)}, ${formData.location.coordinates.longitude.toFixed(4)}`
                  : 'Not detected'}
              </p>
            </div>
            <button
              onClick={getCurrentLocation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Full Address *</label>
            <input
              type="text"
              name="location.address"
              value={formData.location.address}
              onChange={handleInputChange}
              placeholder="Street address, building name, etc."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">City</label>
              <input
                type="text"
                name="location.city"
                value={formData.location.city}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white font-medium mb-2">State</label>
              <input
                type="text"
                name="location.state"
                value={formData.location.state}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">Pincode</label>
              <input
                type="text"
                name="location.pincode"
                value={formData.location.pincode}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Nearby Landmark</label>
              <input
                type="text"
                name="location.landmark"
                value={formData.location.landmark}
                onChange={handleInputChange}
                placeholder="Near hospital, temple, etc."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Impact Assessment */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-white font-medium mb-4">Impact Assessment (Optional)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">People Affected</label>
                <input
                  type="number"
                  name="impact.affectedPeople"
                  value={formData.impact.affectedPeople}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Injuries</label>
                <input
                  type="number"
                  name="impact.injuries"
                  value={formData.impact.injuries}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Property Damage</label>
                <select
                  name="impact.propertyDamage"
                  value={formData.impact.propertyDamage}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="total_loss">Total Loss</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (!formData.location.address || !formData.location.coordinates.latitude) {
                  setError('Please provide the location details');
                  return;
                }
                setError('');
                setStep(3);
              }}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Review & Submit
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Review Your Report</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="text-2xl">{INCIDENT_TYPES.find(t => t.value === formData.type)?.icon}</span>
                <div>
                  <p className="text-gray-400 text-sm">Incident Type</p>
                  <p className="text-white font-medium capitalize">{formData.type?.replace('_', ' ')}</p>
                </div>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Title</p>
                <p className="text-white font-medium">{formData.title}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-sm">Description</p>
                <p className="text-white">{formData.description}</p>
              </div>
              
              <div className="flex gap-8">
                <div>
                  <p className="text-gray-400 text-sm">Severity</p>
                  <span className={`px-3 py-1 rounded text-sm inline-block mt-1 ${
                    formData.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    formData.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    formData.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {formData.severity}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-400 text-sm">Location</p>
                <p className="text-white">{formData.location.address}</p>
                {formData.location.city && (
                  <p className="text-gray-400">
                    {formData.location.city}, {formData.location.state} {formData.location.pincode}
                  </p>
                )}
                {formData.location.landmark && (
                  <p className="text-gray-500 text-sm">Near: {formData.location.landmark}</p>
                )}
              </div>
              
              {(formData.impact.affectedPeople > 0 || formData.impact.injuries > 0) && (
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-gray-400 text-sm mb-2">Impact</p>
                  <div className="flex gap-6">
                    {formData.impact.affectedPeople > 0 && (
                      <p className="text-white">
                        <span className="text-gray-400">Affected:</span> {formData.impact.affectedPeople} people
                      </p>
                    )}
                    {formData.impact.injuries > 0 && (
                      <p className="text-white">
                        <span className="text-gray-400">Injuries:</span> {formData.impact.injuries}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Submit Report
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
