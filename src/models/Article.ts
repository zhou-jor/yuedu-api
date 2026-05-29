import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IArticle extends Document {
  author: Types.ObjectId;
  title: string;
  content: string;
  summary: string;
  cover: string;
  category: Types.ObjectId;
  tags: string[];
  status: 'draft' | 'published' | 'offline' | 'deleted';
  stats: {
    views: number;
    likes: number;
    comments: number;
    collects: number;
    shares: number;
  };
  wordCount: number;
  readTime: number;
  isRecommended: boolean;
  publishedAt?: Date;
}

const articleSchema = new Schema<IArticle>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true, default: '' },
    summary: { type: String, default: '' },
    cover: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ['draft', 'published', 'offline', 'deleted'],
      default: 'draft',
    },
    stats: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      collects: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
    },
    wordCount: { type: Number, default: 0 },
    readTime: { type: Number, default: 0 },
    isRecommended: { type: Boolean, default: false },
    publishedAt: Date,
  },
  { timestamps: true },
);

articleSchema.index({ author: 1, status: 1 });
articleSchema.index({ category: 1, status: 1, publishedAt: -1 });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ title: 'text', content: 'text' });
articleSchema.index({ 'stats.views': -1 });

export const Article = mongoose.model<IArticle>('Article', articleSchema);
