import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserModerationAction {
  WARN = 'warn',
  SUSPEND = 'suspend',
  RESTORE = 'restore',
}

export class UserModerationDto {
  @ApiProperty({ enum: UserModerationAction })
  @IsEnum(UserModerationAction)
  action: UserModerationAction;

  @ApiProperty({ description: 'Reason for the moderation action', minLength: 4 })
  @IsString()
  @MinLength(4)
  reason: string;

  @ApiPropertyOptional({ description: 'Internal notes for other admins' })
  @IsString()
  @IsOptional()
  notes?: string;
}
