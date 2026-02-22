import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Don't return password by default
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Role-based access
  role: {
    type: String,
    enum: ['citizen', 'government_official', 'admin'],
    default: 'citizen'
  },
  
  // Government-specific fields
  department: {
    type: String,
    enum: ['disaster_management', 'fire_department', 'police', 'medical', 'municipal', 'other'],
    required: function() { return this.role !== 'citizen'; }
  },
  designation: {
    type: String,
    trim: true
  },
  employeeId: {
    type: String,
    trim: true
  },
  
  // Citizen-specific fields
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  emergencyContacts: [{
    name: String,
    phone: String,
    relation: String
  }],
  
  // Profile
  avatar: {
    type: String,
    default: ''
  },
  
  // Status & Verification
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Tracking
  lastLogin: Date,
  loginHistory: [{
    timestamp: Date,
    ip: String,
    device: String
  }],
  
  // Notifications
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    alertTypes: {
      type: [String],
      default: ['earthquake', 'flood', 'fire', 'cyclone', 'all']
    }
  },
  fcmToken: String, // Firebase Cloud Messaging token
  
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'address.city': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (hide sensitive data)
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  delete user.password;
  delete user.verificationToken;
  delete user.resetPasswordToken;
  delete user.loginHistory;
  return user;
};

// Check if user is government official
userSchema.methods.isGovernment = function() {
  return ['government_official', 'admin'].includes(this.role);
};

const User = mongoose.model('User', userSchema);

export default User;
