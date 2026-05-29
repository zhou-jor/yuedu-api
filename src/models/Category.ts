import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  icon: string;
  color: string;
  sort: number;
  status: 'active' | 'inactive';
  articleCount: number;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    icon: { type: String, default: '' },
    color: { type: String, default: '' },
    sort: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    articleCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categorySchema.index({ sort: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
