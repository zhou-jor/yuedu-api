import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFeedback extends Document {
  userId: Types.ObjectId;
  type: 'feature' | 'bug' | 'complaint' | 'other';
  content: string;
  images: string[];
  contact?: string;
  status: 'pending' | 'processing' | 'resolved';
  reply?: string;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['feature', 'bug', 'complaint', 'other'],
      required: true,
    },
    content: { type: String, required: true },
    images: [{ type: String }],
    contact: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'resolved'],
      default: 'pending',
    },
    reply: String,
  },
  { timestamps: true },
);

feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ status: 1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);
