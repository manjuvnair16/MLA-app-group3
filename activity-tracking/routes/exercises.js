const express = require('express');
const router = express.Router();
const Exercise = require('../models/exercise.model');
const CustomActivity = require('../models/customActivity.model');  // ← ADD THIS LINE


// GET: Retrieve all exercises
router.get('/', async (req, res) => {
    try {
      const exercises = await Exercise.find();
      res.json(exercises);
    } catch (error) {
      res.status(400).json({ error: 'Error: ' + error.message });
    }
  });
  
// POST: Add a new exercise
router.post('/add', async (req, res) => {
  console.log(req.body)
  try {
    const { username, exerciseType, description, duration, date } = req.body;

    const newExercise = new Exercise({
      username,
      exerciseType,
      description,
      duration: Number(duration),
      date: Date.parse(date),
    });

    await newExercise.save();
    res.json({ message: 'Exercise added!' });
  } catch (error) {
    res.status(400).json({ error: 'Error: ' + error.message });
  }
});

// GET: Retrieve an exercise by ID
router.get('/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }
    res.json(exercise);
  } catch (error) {
    res.status(400).json({ error: 'Error: ' + error.message });
  }
});

// DELETE: Delete an exercise by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedExercise = await Exercise.findByIdAndDelete(req.params.id);
    if (!deletedExercise) {
      res.status(404).json({ error: 'Exercise not found' });
      return;
    }
    res.json({ message: 'Exercise deleted.' });
  } catch (error) {
    res.status(400).json({ error: 'Error: ' + error.message });
  }
});

// PUT: Update an exercise by ID
router.put('/update/:id', async (req, res) => {
    try {
      const { username, exerciseType, description, duration, date } = req.body;
  
      if (!username || !exerciseType || !description || !duration || !date) {
        res.status(400).json({ error: 'All fields are required' });
        return;
      }
  
      const exercise = await Exercise.findById(req.params.id);
      if (!exercise) {
        res.status(404).json({ error: 'Exercise not found' });
        return;
      }
  
      exercise.username = username;
      exercise.exerciseType = exerciseType;
      exercise.description = description;
      exercise.duration = Number(duration);
      exercise.date = new Date(date);
  
      await exercise.save();
      res.json({ message: 'Exercise updated!', exercise });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while updating the exercise' });
    }
  });
  
// Custom Activities Routes

// GET: Get all custom activities for a user
router.get('/custom-activities/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find all custom activities for this user
    const customActivities = await CustomActivity.find({ username }).sort({ createdAt: -1 });
    
    res.json(customActivities);
  } catch (error) {
    console.error('Error fetching custom activities:', error);
    res.status(400).json({ error: 'Error: ' + error.message });
  }
});

// POST: Create a new custom activity
router.post('/custom-activities', async (req, res) => {
  try {
    const { username, activityName } = req.body;

    // Validation
    if (!username || !activityName) {
      return res.status(400).json({ error: 'Username and activity name are required' });
    }

    if (activityName.length < 2 || activityName.length > 30) {
      return res.status(400).json({ error: 'Activity name must be between 2 and 30 characters' });
    }

    // Check if user already has 10 custom activities (limit)
    const existingCount = await CustomActivity.countDocuments({ username });
    if (existingCount >= 10) {
      return res.status(400).json({ error: 'Maximum of 10 custom activities reached' });
    }

    // Check for duplicate activity name for this user
    const existingActivity = await CustomActivity.findOne({ username, activityName });
    if (existingActivity) {
      return res.status(400).json({ error: 'You already have an activity with this name' });
    }

    // Create new custom activity
    const newCustomActivity = new CustomActivity({
      username,
      activityName,
    });

    await newCustomActivity.save();
    
    res.json({ 
      message: 'Custom activity created!', 
      customActivity: newCustomActivity 
    });
  } catch (error) {
    console.error('Error creating custom activity:', error);
    res.status(400).json({ error: 'Error: ' + error.message });
  }
});

// DELETE: Delete a custom activity by ID
router.delete('/custom-activities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedActivity = await CustomActivity.findByIdAndDelete(id);
    
    if (!deletedActivity) {
      return res.status(404).json({ error: 'Custom activity not found' });
    }
    
    res.json({ message: 'Custom activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom activity:', error);
    res.status(400).json({ error: 'Error: ' + error.message });
  }
});
  module.exports = router;