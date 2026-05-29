import mongoose, { Document, Schema } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  image: string;
  link: string;
  linkType: 'article' | 'url' | 'topic';
  sort: number;
  status: 'active' | 'inactive';
  startAt?: Date;
  endAt?: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    link: { type: String, default: '' },
    linkType: { type: String, enum: ['article', 'url', 'topic'], default: 'url' },
    sort: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    startAt: Date,
    endAt: Date,
  },
  { timestamps: true },
);

bannerSchema.index({ status: 1, sort: 1 });

export const Banner = mongoose.model<IBanner>('Banner', bannerSchema);
