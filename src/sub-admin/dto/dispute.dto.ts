import { IsString, IsEnum, IsOptional, MinLength, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeStatus } from '../../database/entities/sub-admin-features.entity';

export class UpdateDisputeStatusDto {
  @ApiProperty({ enum: DisputeStatus })
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @ApiPropertyOptional({ description: 'Internal note for the status change' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ description: 'Final resolution text' })
  @IsString()
  @MinLength(10)
  resolution: string;

  @ApiPropertyOptional({ description: 'Internal notes for the resolution' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class DisputeNoteDto {
  @ApiProperty({ description: 'Note content' })
  @IsString()
  @MinLength(2)
  note: string;
}
