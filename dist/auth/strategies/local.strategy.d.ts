import { Strategy as LocalStrategyBase } from 'passport-local';
import { AuthService } from '../auth.service';
declare const LocalStrategy_base: new (...args: any[]) => LocalStrategyBase;
export declare class LocalStrategy extends LocalStrategy_base {
    private readonly authService;
    constructor(authService: AuthService);
    validate(email: string, password: string): Promise<import("../../database/entities/user.entity").User>;
}
export {};
