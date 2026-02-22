import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'crisis-response-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT Token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Register Citizen
 * POST /api/auth/register/citizen
 */
export const registerCitizen = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create citizen user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'citizen',
      address,
      notificationPreferences: {
        email: true,
        sms: true,
        push: true,
        alertTypes: ['all']
      }
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: user.getPublicProfile(),
        token,
        role: 'citizen'
      }
    });
  } catch (error) {
    console.error('Register citizen error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Register Government Official
 * POST /api/auth/register/government
 */
export const registerGovernment = async (req, res) => {
  try {
    const { name, email, password, phone, department, designation, employeeId } = req.body;

    // Validate required fields
    if (!department || !designation || !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Department, designation, and employee ID are required for government registration'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create government user (pending verification)
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'government_official',
      department,
      designation,
      employeeId,
      isVerified: false // Requires admin verification
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration submitted. Pending verification by administrator.',
      data: {
        user: user.getPublicProfile(),
        token,
        role: 'government_official',
        verified: false
      }
    });
  } catch (error) {
    console.error('Register government error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password, loginType } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }

    // Check role matches login type
    if (loginType === 'government' && user.role === 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This account is registered as a citizen.'
      });
    }

    if (loginType === 'citizen' && user.role !== 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'Please use the government portal to login.'
      });
    }

    // Check if government official is verified
    if (user.role === 'government_official' && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending verification. Please wait for admin approval.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      ip: req.ip || req.connection.remoteAddress,
      device: req.headers['user-agent']
    });
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token,
        role: user.role,
        dashboard: user.role === 'citizen' ? '/citizen/dashboard' : '/gov/dashboard'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Get Current User
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};

/**
 * Update Profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['name', 'phone', 'address', 'emergencyContacts', 'notificationPreferences', 'avatar'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.getPublicProfile()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * Change Password
 * PUT /api/auth/change-password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId).select('+password');
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // Here we can optionally blacklist the token or update last activity
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

export default {
  registerCitizen,
  registerGovernment,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout,
  verifyToken
};
