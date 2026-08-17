const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [120, 'Project name too long'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description too long'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    color: {
      type: String,
      default: '#2F9E6F', // accent teal
    },
  },
  { timestamps: true }
);

// Owner is always a member
projectSchema.pre('save', function (next) {
  if (!this.members.map(String).includes(String(this.owner))) {
    this.members.push(this.owner);
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
