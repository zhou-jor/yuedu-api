import multer from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from '../middleware/auth';
import { success, fail } from '../utils/response';
import { config } from '../config';
import { uploadService } from '../services/uploadService';

const storage = multer.memoryStorage();

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('仅支持图片文件'));
  }
};

const audioFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('仅支持音频文件'));
  }
};

const uploadImageMiddleware = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: imageFilter,
}).single('file');

const uploadAudioMiddleware = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize * 2 },
  fileFilter: audioFilter,
}).single('file');

function handleMulterError(err: unknown, res: Response): boolean {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      fail(res, 10004, '文件大小超出限制', 400);
      return true;
    }
    fail(res, 10004, err.message, 400);
    return true;
  }
  if (err instanceof Error) {
    fail(res, 10004, err.message || '上传失败', 400);
    return true;
  }
  return false;
}

function wrapUpload(middleware: RequestHandler, handler: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err) => {
      if (err) {
        handleMulterError(err, res);
        return;
      }
      handler(req, res, next);
    });
  };
}

async function uploadImageHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await uploadService.uploadImage(req.file!);
    return success(res, data);
  } catch (error) {
    next(error);
  }
}

async function uploadAvatarHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await uploadService.uploadAvatar(req.file!);
    return success(res, data);
  } catch (error) {
    next(error);
  }
}

async function uploadAudioHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await uploadService.uploadAudio(req.file!);
    return success(res, data);
  } catch (error) {
    next(error);
  }
}

export const uploadController = {
  uploadImage: wrapUpload(uploadImageMiddleware, uploadImageHandler),
  uploadAvatar: wrapUpload(uploadImageMiddleware, uploadAvatarHandler),
  uploadAudio: wrapUpload(uploadAudioMiddleware, uploadAudioHandler),
};
