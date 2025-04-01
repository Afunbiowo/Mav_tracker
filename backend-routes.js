// routes/tasks.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/email');

// Get all tasks for a user
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add new task
router.post('/', auth, async (req, res) => {
  const { title, description, status, dueDate } = req.body;
  
  try {
    const newTask = new Task({
      title,
      description,
      status,
      dueDate,
      user: req.user.id
    });
    
    const task = await newTask.save();
    
    // Schedule reminder if due date is approaching
    const dueDateTime = new Date(dueDate).getTime();
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    if (dueDateTime - now <= oneDayMs) {
      // Due within 24 hours, create a notification
      const notification = new Notification({
        user: req.user.id,
        task: task._id,
        type: 'reminder',
        message: `Task "${title}" is due soon`
      });
      
      await notification.save();
      
      // Send email notification if enabled
      const user = await User.findById(req.user.id);
      if (user.emailNotifications) {
        await sendEmail({
          to: user.email,
          subject: 'Task Due Soon',
          text: `Your task "${title}" is due on ${new Date(dueDate).toLocaleDateString()}`
        });
      }
    }
    
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  const { title, description, status, dueDate } = req.body;
  
  // Build task object
  const taskFields = {};
  if (title) taskFields.title = title;
  if (description) taskFields.description = description;
  if (status) taskFields.status = status;
  if (dueDate) taskFields.dueDate = dueDate;
  
  // If marking as completed, add completion timestamp
  if (status === 'completed') {
    taskFields.completedAt = Date.now();
  } else if (status && status !== 'completed') {
    taskFields.completedAt = null;
  }
  
  try {
    let task = await Task.findById(req.params.id);
    
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    
    // Make sure user owns task
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    const previousStatus = task.status;
    
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: taskFields },
      { new: true }
    );
    
    // If status changed to completed, create completion notification
    if (previousStatus !== 'completed' && status === 'completed') {
      // Calculate completion time
      const createdDate = new Date(task.createdAt);
      const completedDate = new Date();
      const diffTime = Math.abs(completedDate - createdDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      const notification = new Notification({
        user: req.user.id,
        task: task._id,
        type: 'completion',
        message: `Task "${task.title}" completed in ${diffDays} days, ${diffHours} hours`
      });
      
      await notification.save();
      
      // Send email notification if enabled
      const user = await User.findById(req.user.id);
      if (user.emailNotifications) {
        await sendEmail({
          to: user.email,
          subject: 'Task Completed',
          text: `Your task "${task.title}" was completed in ${diffDays} days, ${diffHours} hours`
        });
      }
    } 
    // If status changed (but not to completed), create status change notification
    else if (previousStatus !== status) {
      const notification = new Notification({
        user: req.user.id,
        task: task._id,
        type: 'status_change',
        message: `Task "${task.title}" moved to ${status === 'in-progress' ? 'In Progress' : 'Pending'}`
      });
      
      await notification.save();
    }
    
    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    
    // Make sure user owns task
    if (task.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    await Task.findByIdAndRemove(req.params.id);
    
    // Delete related notifications
    await Notification.deleteMany({ task: req.params.id });
    
    res.json({ msg: 'Task removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

// routes/users.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register user
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, email, password } = req.body;
    
    try {
      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }
      
      user = new User({
        name,
        email,
        password
      });
      
      await user.save();
      
      // Return JWT
      const payload = {
        user: {
          id: user.id
        }
      };
      
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '5 days' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// Login user
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;
    
    try {
      // Check if user exists
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }
      
      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }
      
      // Return JWT
      const payload = {
        user: {
          id: user.id
        }
      };
      
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '5 days' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update user settings
router.put('/settings', auth, async (req, res) => {
  const { name, email, emailNotifications } = req.body;
  
  // Build user object
  const userFields = {};
  if (name) userFields.name = name;
  if (email) userFields.email = email;
  if (emailNotifications !== undefined) userFields.emailNotifications = emailNotifications;
  
  try {
    let user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ msg: 'User not found' });
    
    user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

// routes/notifications.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get all notifications for a user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('task', 'title');
    
    res.json(notifications);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    let notification = await Notification.findById(req.params.id);
    
    if (!notification) return res.status(404).json({ msg: 'Notification not found' });
    
    // Make sure user owns notification
    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    );
    
    res.json(notification);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) return res.status(404).json({ msg: 'Notification not found' });
    
    // Make sure user owns notification
    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    await Notification.findByIdAndRemove(req.params.id);
    
    res.json({ msg: 'Notification removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
