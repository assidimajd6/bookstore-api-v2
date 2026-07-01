import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerOrdersQueryDto } from './dto/customer-orders-query.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  findAll() {
    return this.prisma.customer.findMany();
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }
    return customer;
  }

  update(id: number, dto: UpdateCustomerDto) {
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async orders(
    id: number,
    query: CustomerOrdersQueryDto,
    requestUser: { userId: number; role: string },
  ) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }

    const isAdmin = requestUser.role === 'ADMIN';
    const isOwner = customer.userId === requestUser.userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to view this customer\'s orders',
      );
    }

    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      customerId: id,
      ...(status ? { status } : {}),
    };

    return this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: { include: { book: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]).then(([data, total]) => ({
      data,
      meta: { page, limit, total },
    }));
  }

  async summary(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        customerId: id,
        status: { not: 'CANCELLED' },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalOrders = orders.length;

    const totalSpentCents = orders.reduce((sum, order) => {
      return sum + order.items.reduce(
        (orderSum, item) => orderSum + item.unitPriceCents * item.quantity,
        0,
      );
    }, 0);

    const avgOrderValueCents = totalOrders === 0
      ? 0
      : Math.round(totalSpentCents / totalOrders);

    const firstOrderAt = totalOrders === 0 ? null : orders[0].createdAt;
    const lastOrderAt = totalOrders === 0 ? null : orders[totalOrders - 1].createdAt;

    return {
      customerId: id,
      totalOrders,
      totalSpentCents,
      avgOrderValueCents,
      firstOrderAt,
      lastOrderAt,
    };
  }
}