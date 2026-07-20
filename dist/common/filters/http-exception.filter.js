"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(HttpExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        const status = exception.getStatus();
        const exRes = exception.getResponse();
        const message = typeof exRes === 'string'
            ? exRes
            : exRes.message ?? 'Internal error';
        const extras = typeof exRes === 'object' && exRes !== null
            ? Object.fromEntries(Object.entries(exRes).filter(([key]) => !['message', 'statusCode', 'error'].includes(key)))
            : {};
        const body = {
            statusCode: status,
            error: exception.name,
            message,
            timestamp: new Date().toISOString(),
            path: req.url,
            ...extras,
        };
        if (status >= 500)
            this.logger.error(`${req.method} ${req.url}`, JSON.stringify(body));
        res.status(status).json(body);
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(common_1.HttpException)
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map