import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

export default function CitizenDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    myReports: 0,
    nearbyIncidents: 0,
    resolvedReports: 0
  });
  const [recentReports, setRecentReports] = useState([]);
  const [nearbyAlerts, setNearbyAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error)
      );
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user's reports
        const reportsRes = await fetch(`${API_URL}/incidents/my-reports?limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const reportsData = await reportsRes.json();
        
        if (reportsData.success) {
          setRecentReports(reportsData.data.incidents);
          setStats(prev => ({
            ...prev,
            myReports: reportsData.data.pagination.total,
            resolvedReports: reportsData.data.incidents.filter(i => i.status === 'resolved').length
          }));
        }

        // Fetch nearby incidents if location available
        if (location) {
          const nearbyRes = await fetch(
            `${API_URL}/incidents/nearby?latitude=${location.latitude}&longitude=${location.longitude}&radius=20`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          const nearbyData = await nearbyRes.json();
          
          if (nearbyData.success) {
            setNearbyAlerts(nearbyData.data);
            setStats(prev => ({ ...prev, nearbyIncidents: nearbyData.data.length }));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token, location]);

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      critical: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[severity] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      reported: 'bg-blue-500/20 text-blue-400',
      verified: 'bg-purple-500/20 text-purple-400',
      assigned: 'bg-cyan-500/20 text-cyan-400',
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      resolved: 'bg-green-500/20 text-green-400',
      closed: 'bg-gray-500/20 text-gray-400',
      rejected: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || colors.reported;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/30">
        <h1 className="text-2xl font-bold text-white mb-2">
          Welcome back, {user?.name || 'Citizen'}!
        </h1>
        <p className="text-gray-400">
          Stay informed and help your community by reporting incidents and staying alert.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">My Reports</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.myReports}</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <Link to="/citizen/my-reports" className="text-blue-400 text-sm mt-2 inline-block hover:underline">
            View all reports →
          </Link>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Nearby Alerts</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.nearbyIncidents}</p>
            </div>
            <div className="bg-orange-500/20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <Link to="/citizen/nearby" className="text-orange-400 text-sm mt-2 inline-block hover:underline">
            View alerts →
          </Link>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Resolved</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.resolvedReports}</p>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/citizen/report"
            className="flex flex-col items-center p-4 bg-red-500/10 rounded-lg border border-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            <svg className="w-8 h-8 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-white text-sm font-medium">Report Incident</span>
          </Link>

          <Link
            to="/citizen/nearby"
            className="flex flex-col items-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
          >
            <svg className="w-8 h-8 text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-white text-sm font-medium">Nearby Alerts</span>
          </Link>

          <Link
            to="/citizen/my-reports"
            className="flex flex-col items-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
          >
            <svg className="w-8 h-8 text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-white text-sm font-medium">My Reports</span>
          </Link>

          <Link
            to="/citizen/emergency"
            className="flex flex-col items-center p-4 bg-green-500/10 rounded-lg border border-green-500/30 hover:bg-green-500/20 transition-colors"
          >
            <svg className="w-8 h-8 text-green-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-white text-sm font-medium">Emergency</span>
          </Link>
        </div>
      </div>

      {/* Recent Reports & Nearby Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Recent Reports */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">My Recent Reports</h2>
            <Link to="/citizen/my-reports" className="text-blue-400 text-sm hover:underline">
              View all
            </Link>
          </div>
          
          {recentReports.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No reports yet</p>
              <Link to="/citizen/report" className="text-blue-400 text-sm hover:underline mt-2 inline-block">
                Report your first incident
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <Link
                  key={report._id}
                  to={`/citizen/report/${report._id}`}
                  className="block p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-medium">{report.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{report.location?.address}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(report.status)}`}>
                      {report.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs border ${getSeverityColor(report.severity)}`}>
                      {report.severity}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Nearby Alerts */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Nearby Alerts</h2>
            <Link to="/citizen/nearby" className="text-orange-400 text-sm hover:underline">
              View all
            </Link>
          </div>
          
          {!location ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <p className="text-gray-500">Enable location to see nearby alerts</p>
            </div>
          ) : nearbyAlerts.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">No active alerts in your area</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert._id}
                  className="p-4 bg-gray-700/30 rounded-lg border-l-4"
                  style={{
                    borderColor: alert.severity === 'critical' ? '#ef4444' :
                                alert.severity === 'high' ? '#f97316' :
                                alert.severity === 'medium' ? '#eab308' : '#22c55e'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-medium">{alert.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{alert.location?.address}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-500 text-xs capitalize">{alert.type?.replace('_', ' ')}</span>
                    <span className="text-gray-500 text-xs">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Emergency Contacts</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="tel:112" className="flex items-center gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/30 hover:bg-red-500/20 transition-colors">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-white font-medium">Emergency</p>
              <p className="text-red-400 text-sm">112</p>
            </div>
          </a>
          <a href="tel:100" className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 hover:bg-blue-500/20 transition-colors">
            <span className="text-2xl">👮</span>
            <div>
              <p className="text-white font-medium">Police</p>
              <p className="text-blue-400 text-sm">100</p>
            </div>
          </a>
          <a href="tel:101" className="flex items-center gap-3 p-4 bg-orange-500/10 rounded-lg border border-orange-500/30 hover:bg-orange-500/20 transition-colors">
            <span className="text-2xl">🚒</span>
            <div>
              <p className="text-white font-medium">Fire</p>
              <p className="text-orange-400 text-sm">101</p>
            </div>
          </a>
          <a href="tel:102" className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30 hover:bg-green-500/20 transition-colors">
            <span className="text-2xl">🚑</span>
            <div>
              <p className="text-white font-medium">Ambulance</p>
              <p className="text-green-400 text-sm">102</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
