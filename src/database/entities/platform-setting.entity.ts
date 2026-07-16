import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('platform_settings')
@Index(['key'], { unique: true })
export class PlatformSetting extends BaseEntity {
  @Column({ length: 100, unique: true })
  key!: string;

  @Column({ type: 'jsonb', default: {} })
  value!: Record<string, any>;

  @Column({ name: 'updated_by', length: 26, nullable: true })
  updatedBy?: string;
}
