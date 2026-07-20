import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
export declare function multerOptions(folder?: string): MulterOptions;
export declare function fileUrl(baseUrl: string, folder: string, filename: string): string;
