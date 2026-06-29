import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
      });

      if (!customer) {
        throw new BadRequestException(`Customer with id ${dto.customerId} does not exist`);
      }

      const orderItemsData = [];

      for (const item of dto.items) {
        const book = await tx.book.findUnique({
          where: { id: item.bookId },
        });

        if (!book) {
          throw new BadRequestException(`Book with id ${item.bookId} does not exist`);
        }

        if (book.stock < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for "${book.title}". Available: ${book.stock}, requested: ${item.quantity}`,
          );
        }

        await tx.book.update({
          where: { id: item.bookId },
          data: { stock: book.stock - item.quantity },
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
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { book: true } },
        },
      });
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { book: true } },
      },
    });

    if (!order) {
      throw new BadRequestException(`Order with id ${id} not found`);
    }

    const totalCents = order.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );

    return { ...order, totalCents };
  }
}