import { IsInt, Min } from 'class-validator';

export class OrderItemDto {
  @IsInt()
  bookId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}