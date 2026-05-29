import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  nickname: string;
  avatar: string;
  bio: string;
  gender: 'male' | 'female' | 'unknown';
  birthday?: Date;
  region?: string;
  interests: string[];
  thirdParty: {
    wechat?: string;
    qq?: string;
    apple?: string;
    weibo?: string;
  };
  stats: {
    articles: number;
    followers: number;
    following: number;
    likes: number;
    points: number;
  };
  settings: {
    darkMode: boolean;
    fontSize: string;
    pushNotification: boolean;
    commentNotification: boolean;
    followerNotification: boolean;
    systemNotification: boolean;
  };
  password?: string;
  role: 'user' | 'author' | 'admin';
  status: 'active' | 'banned' | 'deleted';
  lastLoginAt?: Date;
  streakDays: number;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    nickname: { type: String, required: true, default: '' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 100 },
    gender: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
    birthday: Date,
    region: String,
    interests: [{ type: String }],
    thirdParty: {
      wechat: String,
      qq: String,
      apple: String,
      weibo: String,
    },
    stats: {
      articles: { type: Number, default: 0 },
      followers: { type: Number, default: 0 },
      following: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
    },
    settings: {
      darkMode: { type: Boolean, default: false },
      fontSize: { type: String, default: 'medium' },
      pushNotification: { type: Boolean, default: true },
      commentNotification: { type: Boolean, default: true },
      followerNotification: { type: Boolean, default: true },
      systemNotification: { type: Boolean, default: true },
    },
    password: String,
    role: { type: String, enum: ['user', 'author', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'banned', 'deleted'], default: 'active' },
    lastLoginAt: Date,
    streakDays: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.index({ nickname: 'text' });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', userSchema);
