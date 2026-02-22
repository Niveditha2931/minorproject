import express from 'express';
import { authenticate, authorize, citizenOnly, governmentOnly } from '../middlewares/auth.middleware.js';
import Incident from '../models/Incident.js';

const router = express.Router();

// =============================================
// CITIZEN ROUTES
// =============================================

// Report new incident (Citizens only)
router.post('/report', authenticate, citizenOnly, async (req, res) => {
  try {
    const {
      title, description, type, location, severity,
      media, impact
    } = req.body;
    
    const incident = new Incident({
      reportedBy: req.user._id,
      reporterType: 'citizen',
      title,
      description,
      type,
      location,
      severity: severity || 'medium',
      media,
      impact,
      timeline: [{
        status: 'reported',
        note: 'Incident reported by citizen',
        updatedBy: req.user._id
      }]
    });
    
    await incident.save();
    
    res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      data: {
        incident,
        trackingId: incident._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to report incident',
      error: error.message
    });
  }
});

// Get citizen's own reported incidents
router.get('/my-reports', authenticate, citizenOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { reportedBy: req.user._id };
    if (status) query.status = status;
    
    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-upvotes');
    
    const total = await Incident.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        incidents,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents',
      error: error.message
    });
  }
});

// Get nearby incidents for citizens
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // radius in km
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusKm = parseFloat(radius);
    
    // Calculate bounding box for rough filtering
    // 1 degree latitude ≈ 111 km
    // 1 degree longitude ≈ 111 km * cos(latitude)
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    
    const incidents = await Incident.find({
      'location.coordinates.latitude': { 
        $gte: lat - latDelta, 
        $lte: lat + latDelta 
      },
      'location.coordinates.longitude': { 
        $gte: lon - lonDelta, 
        $lte: lon + lonDelta 
      },
      status: { $nin: ['closed', 'rejected', 'resolved'] }
    })
    .sort({ priorityScore: -1 })
    .limit(50)
    .select('title type severity status location.address location.coordinates createdAt');
    
    // Calculate actual distance and filter
    const haversineDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };
    
    const nearbyIncidents = incidents
      .map(inc => {
        const dist = haversineDistance(
          lat, lon,
          inc.location.coordinates.latitude,
          inc.location.coordinates.longitude
        );
        return { ...inc.toObject(), distance: dist };
      })
      .filter(inc => inc.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
    
    res.json({
      success: true,
      data: nearbyIncidents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby incidents',
      error: error.message
    });
  }
});

// Get single incident details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reportedBy', 'name phone')
      .populate('assignedTo.officer', 'name department');
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    // Increment view count
    incident.viewCount += 1;
    await incident.save();
    
    // Citizens can only see limited info if not their report
    if (req.user.role === 'citizen' && 
        incident.reportedBy._id.toString() !== req.user._id.toString()) {
      const limitedIncident = {
        _id: incident._id,
        title: incident.title,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        location: {
          address: incident.location.address,
          city: incident.location.city
        },
        createdAt: incident.createdAt
      };
      return res.json({ success: true, data: limitedIncident });
    }
    
    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incident',
      error: error.message
    });
  }
});

// Upvote/confirm incident (Citizens)
router.post('/:id/upvote', authenticate, citizenOnly, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    const alreadyUpvoted = incident.upvotes.includes(req.user._id);
    
    if (alreadyUpvoted) {
      incident.upvotes = incident.upvotes.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      incident.upvotes.push(req.user._id);
    }
    
    await incident.save();
    
    res.json({
      success: true,
      message: alreadyUpvoted ? 'Upvote removed' : 'Incident upvoted',
      data: { upvoteCount: incident.upvotes.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upvote incident',
      error: error.message
    });
  }
});

// =============================================
// GOVERNMENT ROUTES
// =============================================

// Get all incidents (Government only)
router.get('/', authenticate, governmentOnly, async (req, res) => {
  try {
    const { 
      type, severity, status, isVerified,
      startDate, endDate, page = 1, limit = 20,
      sortBy = 'priorityScore', sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    const incidents = await Incident.find(query)
      .populate('reportedBy', 'name phone email')
      .populate('assignedTo.officer', 'name department')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Incident.countDocuments(query);
    
    // Get statistics
    const stats = await Incident.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    
    res.json({
      success: true,
      data: {
        incidents,
        stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch incidents',
      error: error.message
    });
  }
});

// Verify incident (Government only)
router.put('/:id/verify', authenticate, governmentOnly, async (req, res) => {
  try {
    const { isVerified, notes } = req.body;
    
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        isVerified,
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
        verificationNotes: notes,
        $push: {
          timeline: {
            status: isVerified ? 'verified' : 'rejected',
            note: notes || (isVerified ? 'Incident verified' : 'Incident rejected'),
            updatedBy: req.user._id
          }
        },
        status: isVerified ? 'verified' : 'rejected'
      },
      { new: true }
    );
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    res.json({
      success: true,
      message: `Incident ${isVerified ? 'verified' : 'rejected'}`,
      data: incident
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify incident',
      error: error.message
    });
  }
});

// Update incident status (Government only)
router.put('/:id/status', authenticate, governmentOnly, async (req, res) => {
  try {
    const { status, note } = req.body;
    
    const validStatuses = ['reported', 'verified', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        status,
        $push: {
          timeline: {
            status,
            note: note || `Status changed to ${status}`,
            updatedBy: req.user._id
          }
        }
      },
      { new: true }
    );
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Incident status updated',
      data: incident
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// Assign incident to team/officer (Government only)
router.put('/:id/assign', authenticate, governmentOnly, async (req, res) => {
  try {
    const { teamId, officerId, note } = req.body;
    
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: {
          team: teamId,
          officer: officerId,
          assignedAt: new Date()
        },
        status: 'assigned',
        $push: {
          timeline: {
            status: 'assigned',
            note: note || 'Incident assigned to response team',
            updatedBy: req.user._id
          }
        }
      },
      { new: true }
    ).populate('assignedTo.officer', 'name department');
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Incident assigned successfully',
      data: incident
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign incident',
      error: error.message
    });
  }
});

// Resolve incident (Government only)
router.put('/:id/resolve', authenticate, governmentOnly, async (req, res) => {
  try {
    const { summary, resourcesUsed } = req.body;
    
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolution: {
          summary,
          resourcesUsed,
          resolvedAt: new Date(),
          resolvedBy: req.user._id
        },
        $push: {
          timeline: {
            status: 'resolved',
            note: summary || 'Incident resolved',
            updatedBy: req.user._id
          }
        }
      },
      { new: true }
    );
    
    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Incident resolved',
      data: incident
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resolve incident',
      error: error.message
    });
  }
});

// Get incident statistics (Government only)
router.get('/stats/overview', authenticate, governmentOnly, async (req, res) => {
  try {
    const [
      byType,
      bySeverity,
      byStatus,
      recentTrend
    ] = await Promise.all([
      Incident.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Incident.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      Incident.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Incident.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);
    
    const totalIncidents = await Incident.countDocuments();
    const activeIncidents = await Incident.countDocuments({
      status: { $in: ['reported', 'verified', 'assigned', 'in_progress'] }
    });
    const criticalIncidents = await Incident.countDocuments({
      severity: 'critical',
      status: { $nin: ['resolved', 'closed', 'rejected'] }
    });
    
    res.json({
      success: true,
      data: {
        overview: {
          total: totalIncidents,
          active: activeIncidents,
          critical: criticalIncidents
        },
        byType: byType.reduce((acc, t) => ({ ...acc, [t._id]: t.count }), {}),
        bySeverity: bySeverity.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        recentTrend
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

export default router;
