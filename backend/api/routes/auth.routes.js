import express from 'express';
import {
  registerCitizen,
  registerGovernment,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout
} from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register/citizen', registerCitizen);
router.post('/register/government', registerGovernment);
router.post('/login', login);

// Protected routes (requires authentication)
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

// Admin only routes
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, verified, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (role) query.role = role;
    if (verified !== undefined) query.isVerified = verified === 'true';
    
    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
      
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: { users, total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify government official (admin only)
router.put('/verify/:userId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isVerified: true },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User verified successfully',
      data: { user: user.getPublicProfile() }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
