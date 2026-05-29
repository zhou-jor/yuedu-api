import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReadingProgress extends Document {
  userId: Types.ObjectId;
  articleId: Types.ObjectId;
  progress: number;
  readDuration: number;
  lastReadAt: Date;
}

const readingProgressSchema = new Schema<IReadingProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    readDuration: { type: Number, default: 0 },
    lastReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

readingProgressSchema.index({ userId: 1, articleId: 1 }, { unique: true });
readingProgressSchema.index({ userId: 1, lastReadAt: -1 });

export const ReadingProgress = mongoose.model<IReadingProgress>(
  'ReadingProgress',
  readingProgressSchema,
);
