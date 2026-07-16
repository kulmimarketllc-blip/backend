import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, Length, IsOptional } from 'class-validator';

export enum ContentModerationAction {
  APPROVE = 'approve',       // Content is legitimate, unhide it
  REJECT = 'reject',         // Content violates policy, hide it
  REMOVE = 'remove',         // Delete content completely
  SUSPEND_MERCHANT = 'suspend_merchant', // Content violates so severely, suspend the merchant
  CLEAR_FLAGS = 'clear_flags', // Clear flag count, reset status
}

export class ContentModerationDto {
  @ApiProperty({
    enum: ContentModerationAction,
    example: ContentModerationAction.APPROVE,
    description: 'Action to take on the flagged content',
  })
  @IsEnum(ContentModerationAction)
  action!: ContentModerationAction;

  @ApiProperty({
    description: 'Reason for the moderation action',
    example: 'Content is legitimate business information',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @Length(5, 500)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Internal note about this moderation decision',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  internalNote?: string;
}
