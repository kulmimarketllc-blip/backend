"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = exports.TransformInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let TransformInterceptor = class TransformInterceptor {
    intercept(_ctx, next) {
        return next.handle().pipe((0, operators_1.map)((data) => ({
            success: true,
            data,
            timestamp: new Date().toISOString(),
        })));
    }
};
exports.TransformInterceptor = TransformInterceptor;
exports.TransformInterceptor = TransformInterceptor = __decorate([
    (0, common_1.Injectable)()
], TransformInterceptor);
const common_2 = require("@nestjs/common");
const operators_2 = require("rxjs/operators");
let LoggingInterceptor = class LoggingInterceptor {
    constructor() {
        this.logger = new common_2.Logger('HTTP');
    }
    intercept(ctx, next) {
        const req = ctx.switchToHttp().getRequest();
        const { method, url } = req;
        const start = Date.now();
        return next.handle().pipe((0, operators_2.tap)(() => {
            const ms = Date.now() - start;
            this.logger.log(`${method} ${url} — ${ms}ms`);
        }));
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], LoggingInterceptor);
//# sourceMappingURL=transform.interceptor.js.map