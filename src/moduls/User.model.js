import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: 'https://via.placeholder.com/150',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // ✅ Enrolled Courses
    enrolledCourses: [
      {
        courseId: {
          type: String,
          required: true,
        },
        courseName: {
          type: String,
          required: true,
        },
        courseIcon: {
          type: String,
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
        progress: {
          type: Number,
          default: 0, // 0-100%
        },
        completedConcepts: {
          type: [String], // Array of concept IDs
          default: [],
        },
        lastAccessed: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'completed'],
          default: 'not_started',
        },
      },
    ],
    // Progress by concept (for backward compatibility)
    progress: {
      type: Map,
      of: Boolean,
      default: {},
    },
    streak: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    achievements: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;