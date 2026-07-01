import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const TRANSITIONS: Record<string, string[]> = {
  PENDING:   ['PAID', 'CANCELLED'],
  PAID:      ['SHIPPED', 'CANCELLED'],
  SHIPPED:   ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
      });

      if (!customer) {
        throw new BadRequestException(
          `Customer with id ${dto.customerId} does not exist`,
        );
      }

      const orderItemsData = [];

      for (const item of dto.items) {
        const book = await tx.book.findUnique({
          where: { id: item.bookId },
        });

        if (!book) {
          throw new BadRequestException(
            `Book with id ${item.bookId} does not exist`,
          );
        }

        if (book.stock < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for "${book.title}". Available: ${book.stock}, requested: ${item.quantity}`,
          );
        }

        await tx.book.update({
          where: { id: item.bookId },
          data: { stock: { decrement: item.quantity } },
        });

        orderItemsData.push({
          bookId: item.bookId,
          quantity: item.quantity,
          unitPriceCents: book.priceCents,
        });
      }

      return tx.order.create({
        data: {
          customerId: dto.customerId,
          items: { create: orderItemsData },
        },
        include: {
          items: { include: { book: true } },
        },
      });
    });
  }

  async findOne(
    id: number,
    requestUser: { userId: number; role: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { book: true } },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    const isAdmin = requestUser.role === 'ADMIN';
    const isOwner = order.customer.userId === requestUser.userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to view this order',
      );
    }

    const totalCents = order.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );

    return { ...order, totalCents };
  }

  async updateStatus(
    id: number,
    dto: UpdateOrderStatusDto,
    requestUser: { userId: number; role: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    const isAdmin = requestUser.role === 'ADMIN';
    const isOwner = order.customer.userId === requestUser.userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to update this order',
      );
    }

    const allowed = TRANSITIONS[order.status] ?? [];

    if (!allowed.includes(dto.status)) {
      throw new ConflictException(
        `Cannot transition order from ${order.status} to ${dto.status}`,
      );
    }

    if (dto.status === 'CANCELLED') {
      return this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.book.update({
            where: { id: item.bookId },
            data: { stock: { increment: item.quantity } },
          });
        }

        return tx.order.update({
          where: { id },
          data: { status: dto.status },
          include: { items: { include: { book: true } } },
        });
      });
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: { items: { include: { book: true } } },
    });
  }

  async cancel(
    id: number,
    requestUser: { userId: number; role: string },
  ) {
    return this.updateStatus(
      id,
      { status: 'CANCELLED' },
      requestUser,
    );
  }
}