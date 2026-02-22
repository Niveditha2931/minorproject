import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = 'http://localhost:5000/api';

export default function MyReports() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });

  useEffect(() => {
    fetchReports();
  }, [filter, pagination.page]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const statusQuery = filter !== 'all' ? `&status=${filter}` : '';
      const response = await fetch(
        `${API_URL}/incidents/my-reports?page=${pagination.page}&limit=10${statusQuery}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.success) {
        setReports(data.data.incidents);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusIcon = (status) => {
    const icons = {
      reported: '📝',
      verified: '✓',
      assigned: '👤',
      in_progress: '🔄',
      resolved: '✅',
      closed: '📁',
      rejected: '❌'
    };
    return icons[status] || '📝';
  };

  const getTypeIcon = (type) => {
    const icons = {
      flood: '🌊', earthquake: '🌍', fire: '🔥', cyclone: '🌀',
      landslide: '⛰️', accident: '🚗', medical_emergency: '🏥',
      building_collapse: '🏚️', gas_leak: '💨', electrical_hazard: '⚡',
      water_shortage: '💧', road_damage: '🚧', other: '📋'
    };
    return icons[type] || '📋';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Reports</h1>
          <p className="text-gray-400 mt-1">Track all your reported incidents</p>
        </div>
        <Link
          to="/citizen/report"
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Report New
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Reports</p>
          <p className="text-2xl font-bold text-white mt-1">{pagination.total}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {reports.filter(r => ['reported', 'verified', 'assigned', 'in_progress'].includes(r.status)).length}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Resolved</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {reports.filter(r => r.status === 'resolved').length}
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Critical</p>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {reports.filter(r => r.severity === 'critical').length}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'reported', label: 'Reported' },
          { value: 'verified', label: 'Verified' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'rejected', label: 'Rejected' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setFilter(tab.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              filter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">No reports found</h3>
          <p className="text-gray-500 mb-4">
            {filter === 'all' 
              ? "You haven't reported any incidents yet" 
              : `No ${filter.replace('_', ' ')} reports`}
          </p>
          <Link
            to="/citizen/report"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Report an Incident
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Link
              key={report._id}
              to={`/citizen/report/${report._id}`}
              className="block bg-gray-800/50 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Type Icon */}
                <div className="text-3xl">{getTypeIcon(report.type)}</div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white truncate">{report.title}</h3>
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{report.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${getStatusColor(report.status)}`}>
                      <span>{getStatusIcon(report.status)}</span>
                      <span className="capitalize">{report.status?.replace('_', ' ')}</span>
                    </span>
                  </div>
                  
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    <span className={`px-2 py-0.5 rounded text-xs border ${getSeverityColor(report.severity)}`}>
                      {report.severity}
                    </span>
                    <span className="text-gray-500 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {report.location?.address}
                    </span>
                    <span className="text-gray-500 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(report.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  {/* Timeline Preview */}
                  {report.timeline && report.timeline.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-gray-500 text-sm">
                        Last update: {report.timeline[report.timeline.length - 1]?.note || 'Status updated'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
