import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketReplyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
