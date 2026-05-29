import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a'];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildUrl(subdir: string, filename: string) {
  return `/uploads/${subdir}/${filename}`;
}

function getExt(mimetype: string, originalname: string) {
  const fromName = path.extname(originalname);
  if (fromName) return fromName;
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/aac': '.aac',
    'audio/m4a': '.m4a',
  };
  return map[mimetype] || '';
}

export const uploadService = {
  validateImage(file?: Express.Multer.File) {
    if (!file) {
      throw new AppError(10004, '请选择图片文件', 400);
    }
    if (!IMAGE_TYPES.includes(file.mimetype)) {
      throw new AppError(10004, '不支持的图片格式', 400);
    }
  },

  validateAudio(file?: Express.Multer.File) {
    if (!file) {
      throw new AppError(10004, '请选择音频文件', 400);
    }
    if (!AUDIO_TYPES.includes(file.mimetype)) {
      throw new AppError(10004, '不支持的音频格式', 400);
    }
  },

  async uploadImage(file: Express.Multer.File) {
    this.validateImage(file);

    const dir = path.join(config.upload.dir, 'images');
    ensureDir(dir);

    const ext = getExt(file.mimetype, file.originalname);
    const filename = `${nanoid()}${ext}`;
    const filepath = path.join(dir, filename);

    await fs.promises.writeFile(filepath, file.buffer);

    return { url: buildUrl('images', filename) };
  },

  async uploadAvatar(file: Express.Multer.File) {
    this.validateImage(file);

    const dir = path.join(config.upload.dir, 'avatars');
    ensureDir(dir);

    const filename = `${nanoid()}.jpg`;
    const filepath = path.join(dir, filename);

    await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    return { url: buildUrl('avatars', filename) };
  },

  async uploadAudio(file: Express.Multer.File) {
    this.validateAudio(file);

    const dir = path.join(config.upload.dir, 'audio');
    ensureDir(dir);

    const ext = getExt(file.mimetype, file.originalname);
    const filename = `${nanoid()}${ext}`;
    const filepath = path.join(dir, filename);

    await fs.promises.writeFile(filepath, file.buffer);

    // Basic duration estimate; replace with ffprobe if precise duration is needed
    const duration = 0;

    return { url: buildUrl('audio', filename), duration };
  },
};
