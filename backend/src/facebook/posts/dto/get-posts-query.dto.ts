import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetPostsQueryDto {
  @ApiPropertyOptional({ description: 'Number of posts to return', example: '10' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Pagination cursor (after)', example: 'abc123' })
  @IsOptional()
  @IsString()
  after?: string;
}
