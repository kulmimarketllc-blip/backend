"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerOptions = multerOptions;
exports.fileUrl = fileUrl;
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const common_1 = require("@nestjs/common");
function multerOptions(folder = 'general') {
    return {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dest = (0, path_1.join)(process.cwd(), 'uploads', folder);
                if (!(0, fs_1.existsSync)(dest))
                    (0, fs_1.mkdirSync)(dest, { recursive: true });
                cb(null, dest);
            },
            filename: (_req, file, cb) => {
                const ext = (0, path_1.extname)(file.originalname).toLowerCase();
                const base = file.originalname
                    .replace(ext, '')
                    .replace(/[^a-zA-Z0-9-_]/g, '_')
                    .slice(0, 60);
                const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `${base}-${uid}${ext}`);
            },
        }),
        fileFilter: (_req, file, cb) => {
            const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i;
            if (allowed.test(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
            }
        },
        limits: { fileSize: 10 * 1024 * 1024 },
    };
}
function fileUrl(baseUrl, folder, filename) {
    return `${baseUrl}/uploads/${folder}/${filename}`;
}
//# sourceMappingURL=multer.config.js.map