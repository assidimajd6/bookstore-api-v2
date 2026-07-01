import { IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AuthorTopQueryDto {
  @IsOptional()
  @IsIn(['revenue', 'copiesSold'])
  by?: 'revenue' | 'copiesSold' = 'revenue';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}