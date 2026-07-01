import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class DeleteAuthorQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  force?: boolean = false;
}