import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  // Reporter Information
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reporterType: {
    type: String,
    enum: ['citizen', 'government_official', 'automated'],
    default: 'citizen'
  },
  
  // Incident Details
  title: {
    type: String,
    required: [true, 'Incident title is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 2000
  },
  
  // Incident Type
  type: {
    type: String,
    enum: [
      'flood', 'earthquake', 'fire', 'cyclone', 'landslide',
      'accident', 'medical_emergency', 'building_collapse',
      'gas_leak', 'electrical_hazard', 'water_shortage',
      'road_damage', 'other'
    ],
    required: true
  },
  
  // Location
  location: {
    address: {
      type: String,
      required: true
    },
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    landmark: String
  },
  
  // Severity & Status
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['reported', 'verified', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'],
    default: 'reported'
  },
  
  // AI Assessment
  aiAssessment: {
    severity: String,
    confidence: Number,
    suggestedType: String,
    analysisDetails: String,
    processedAt: Date
  },
  
  // Media Attachments
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio']
    },
    url: String,
    thumbnail: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Impact Assessment
  impact: {
    affectedPeople: Number,
    injuries: Number,
    fatalities: Number,
    propertyDamage: {
      type: String,
      enum: ['none', 'minor', 'moderate', 'severe', 'total_loss']
    },
    infrastructureDamage: String
  },
  
  // Assignment & Response
  assignedTo: {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResponseTeam'
    },
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date
  },
  
  // Response Timeline
  timeline: [{
    status: String,
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  verificationNotes: String,
  
  // Priority Score (calculated)
  priorityScore: {
    type: Number,
    default: 0
  },
  
  // Resolution
  resolution: {
    summary: String,
    resourcesUsed: [{
      type: String,
      quantity: Number
    }],
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    feedback: {
      rating: Number,
      comment: String
    }
  },
  
  // Notifications sent
  notificationsSent: [{
    channel: String,
    recipients: Number,
    sentAt: Date
  }],
  
  // Duplicate tracking
  isDuplicate: {
    type: Boolean,
    default: false
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident'
  },
  
  // Views & Engagement
  viewCount: {
    type: Number,
    default: 0
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
  
}, {
  timestamps: true
});

// Indexes
incidentSchema.index({ 'location.coordinates.latitude': 1, 'location.coordinates.longitude': 1 });
incidentSchema.index({ type: 1, status: 1 });
incidentSchema.index({ severity: 1 });
incidentSchema.index({ reportedBy: 1 });
incidentSchema.index({ createdAt: -1 });

// Calculate priority score before saving
incidentSchema.pre('save', function(next) {
  const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
  const typeWeights = {
    earthquake: 4, cyclone: 4, flood: 3, fire: 3, landslide: 3,
    building_collapse: 4, gas_leak: 3, medical_emergency: 3,
    accident: 2, electrical_hazard: 2, water_shortage: 1,
    road_damage: 1, other: 1
  };
  
  const severityScore = severityWeights[this.severity] || 2;
  const typeScore = typeWeights[this.type] || 1;
  const impactScore = Math.min((this.impact?.affectedPeople || 0) / 100, 3);
  
  this.priorityScore = (severityScore * 3) + (typeScore * 2) + impactScore;
  next();
});

// Virtual for time since reported
incidentSchema.virtual('timeSinceReported').get(function() {
  const diff = Date.now() - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return `${Math.floor(diff / (1000 * 60))} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
});

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;
