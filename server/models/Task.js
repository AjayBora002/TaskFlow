const mongoose = require('mongoose');

const STATUSES = ['todo', 'inprogress', 'inreview', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

// Enforce forward-only transitions (allow backward)
const VALID_TRANSITIONS = {
  todo: ['inprogress'],
  inprogress: ['todo', 'inreview'],
  inreview: ['inprogress', 'done'],
  done: ['inreview'],
};

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description too long'],
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'medium',
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'todo',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, assignee: 1 });

// Export valid transitions so controller can use it
taskSchema.statics.VALID_TRANSITIONS = VALID_TRANSITIONS;
taskSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Task', taskSchema);
