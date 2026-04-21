import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyCommentDto {
  @ApiProperty({ description: 'Reply message text', example: 'Cảm ơn bạn đã bình luận!' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message!: string;
}
