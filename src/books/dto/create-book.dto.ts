import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  isbn: string;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsInt()
  authorId: number;
}