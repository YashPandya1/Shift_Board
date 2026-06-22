import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.EMPLOYEE,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: String,
    avatar: String,
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    refreshToken: { type: String, select: false },
    lastLogin: Date,
    isActive: { type: Boolean, default: true },
    preferences: {
      darkMode: { type: Boolean, default: false },
      language: { type: String, default: 'en' },
      notificationChannels: {
        sms: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ organizationId: 1, role: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
