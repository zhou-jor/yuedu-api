import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITask extends Document {
  userId: Types.ObjectId;
  taskType: 'daily' | 'growth';
  taskKey: string;
  progress: number;
  target: number;
  points: number;
  status: 'pending' | 'completed' | 'claimed';
  date?: string | null;
}

const taskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    taskType: { type: String, enum: ['daily', 'growth'], required: true },
    taskKey: { type: String, required: true },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    points: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'completed', 'claimed'],
      default: 'pending',
    },
    date: { type: String, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ userId: 1, taskType: 1, date: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);
