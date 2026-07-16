// upload/multer.config.ts
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Build a MulterOptions config for a given sub-folder under /uploads.
 *
 * Usage in a controller:
 *   @UseInterceptors(FileInterceptor('image', multerOptions('products')))
 *   @UseInterceptors(FilesInterceptor('images', 10, multerOptions('products')))
 */
export function multerOptions(folder = 'general'): MulterOptions {
    return {
        storage: diskStorage({
            destination: (_req, _file, cb) => {
                const dest = join(process.cwd(), 'uploads', folder);
                if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
                cb(null, dest);
            },
            filename: (_req, file, cb) => {
                const ext = extname(file.originalname).toLowerCase();
                const base = file.originalname
                    .replace(ext, '')
                    .replace(/[^a-zA-Z0-9-_]/g, '_')
                    .slice(0, 60); // cap length
                const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `${base}-${uid}${ext}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i;
            if (allowed.test(file.mimetype)) {
                cb(null, true);
            } else {
                cb(
                    new BadRequestException(
                        'Only image files are allowed (jpeg, jpg, png, gif, webp)',
                    ),
                    false,
                );
            }
        },
        limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
    };
}

/** Turn a saved filename into a full public URL */
export function fileUrl(
    baseUrl: string,
    folder: string,
    filename: string,
): string {
    return `${baseUrl}/uploads/${folder}/${filename}`;
}