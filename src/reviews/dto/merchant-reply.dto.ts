import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MerchantReplyDto {
  @ApiProperty({ example: 'Thank you so much for the kind words!' })
  @IsString() @MinLength(5) @MaxLength(1000)
  reply!: string;
}
