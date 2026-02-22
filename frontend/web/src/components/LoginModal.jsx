import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginModal({ isOpen, onClose, initialTab = 'citizen' }) {
  const navigate = useNavigate();
  const { login, registerCitizen, registerGovernment, error, clearError } = useAuth();
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    // Government specific
    department: '',
    designation: '',
    employeeId: ''
  });

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setLocalError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLocalError('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        // Login
        const result = await login(formData.email, formData.password, activeTab);
        if (result.success) {
          onClose();
          navigate(activeTab === 'citizen' ? '/citizen/dashboard' : '/gov/dashboard');
        } else {
          setLocalError(result.error);
        }
      } else {
        // Register
        if (formData.password !== formData.confirmPassword) {
          setLocalError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (activeTab === 'citizen') {
          const result = await registerCitizen({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone
          });
          
          if (result.success) {
            onClose();
            navigate('/citizen/dashboard');
          } else {
            setLocalError(result.error);
          }
        } else {
          const result = await registerGovernment({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            department: formData.department,
            designation: formData.designation,
            employeeId: formData.employeeId
          });
          
          if (result.success) {
            setSuccessMessage(result.message || 'Registration submitted. Please wait for verification.');
            setIsLogin(true);
          } else {
            setLocalError(result.error);
          }
        }
      }
    } catch (err) {
      setLocalError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      department: '',
      designation: '',
      employeeId: ''
    });
    setLocalError('');
    clearError();
    setSuccessMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-md mx-4 border border-gray-800 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          
          {/* Tabs */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => {
                setActiveTab('citizen');
                resetForm();
              }}
              className={`flex-1 py-2.5 rounded-md font-medium transition-colors ${
                activeTab === 'citizen'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Citizen
            </button>
            <button
              onClick={() => {
                setActiveTab('government');
                resetForm();
              }}
              className={`flex-1 py-2.5 rounded-md font-medium transition-colors ${
                activeTab === 'government'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Government
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {(localError || error) && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {localError || error}
            </div>
          )}
          
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registration Fields */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
                
                {/* Government specific fields */}
                {activeTab === 'government' && (
                  <>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Department</label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="">Select Department</option>
                        <option value="disaster_management">Disaster Management (NDMA)</option>
                        <option value="police">Police</option>
                        <option value="fire_department">Fire Services</option>
                        <option value="medical">Medical Services</option>
                        <option value="municipal">Municipal Corporation</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Designation</label>
                        <input
                          type="text"
                          name="designation"
                          value={formData.designation}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                          placeholder="Your designation"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Employee ID</label>
                        <input
                          type="text"
                          name="employeeId"
                          value={formData.employeeId}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                          placeholder="Employee ID"
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Common Fields */}
            <div>
              <label className="block text-gray-400 text-sm mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="name@example.com"
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            
            {!isLogin && (
              <div>
                <label className="block text-gray-400 text-sm mb-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'citizen'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetForm();
                }}
                className={`ml-2 font-medium ${
                  activeTab === 'citizen' ? 'text-blue-400 hover:text-blue-300' : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Info for Government */}
          {activeTab === 'government' && !isLogin && (
            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-purple-300 text-xs">
                <strong>Note:</strong> Government accounts require verification. After registration, your credentials will be verified before you can access the dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
