import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
  status: 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}