import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, Length, IsOptional } from 'class-validator';

export enum ReviewModerationAction {
  APPROVE = 'approve',     // Review is legitimate, unhide it
  REJECT = 'reject',       // Review violates policy, hide it
  REMOVE = 'remove',       // Delete review completely
  CLEAR_FLAGS = 'clear_flags', // Clear flag count, reset to approved
}

export class ReviewModerationDto {
  @ApiProperty({
    enum: ReviewModerationAction,
    example: ReviewModerationAction.APPROVE,
    description: 'Action to take on the flagged review',
  })
  @IsEnum(ReviewModerationAction)
  action!: ReviewModerationAction;

  @ApiProperty({
    description: 'Reason for the moderation action',
    example: 'Inappropriate language detected',
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
