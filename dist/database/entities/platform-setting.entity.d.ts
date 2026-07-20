import { BaseEntity } from './base.entity';
export declare class PlatformSetting extends BaseEntity {
    key: string;
    value: Record<string, any>;
    updatedBy?: string;
}
