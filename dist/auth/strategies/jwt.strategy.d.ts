import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersRepo;
    constructor(config: ConfigService, usersRepo: Repository<User>);
    validate(payload: {
        sub: string;
        email: string;
        role: string;
    }): Promise<User>;
}
export {};
