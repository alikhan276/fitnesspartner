const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  phone: { type: String },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  district: {
    type: String,
    enum: ['Алатауский', 'Алмалинский', 'Ауэзовский', 'Бостандыкский',
           'Жетысуский', 'Медеуский', 'Наурызбайский', 'Турксибский'],
    default: 'Алмалинский'
  },
  fitnessLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  goals: [{ type: String }],
  schedule: [{ type: String }], // ['Утро', 'Вечер', 'Выходные']
  gym: { type: String },
  bio: { type: String, maxlength: 300 },
  avatar: { type: String, default: '' },
  isSubscribed: { type: Boolean, default: false },
  subscriptionExpiry: { type: Date },
  subscriptionPlan: { type: String, enum: ['none', 'basic', 'premium'], default: 'none' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', UserSchema);