const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const customActivitySchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    activityName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries by username
customActivitySchema.index({ username: 1 });

// Ensure unique activity names per user
customActivitySchema.index({ username: 1, activityName: 1 }, { unique: true });

const CustomActivity = mongoose.model('CustomActivity', customActivitySchema);

module.exports = CustomActivity;
