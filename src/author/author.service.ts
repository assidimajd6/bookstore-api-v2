import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { AuthorTopQueryDto } from './dto/author-top-query.dto';
import { DeleteAuthorQueryDto } from './dto/delete-author-query.dto';

@Injectable()
export class AuthorService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateAuthorDto) {
    return this.prisma.author.create({ data: dto });
  }

  findAll() {
    return this.prisma.author.findMany();
  }

  update(id: number, dto: UpdateAuthorDto) {
    return this.prisma.author.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number, query: DeleteAuthorQueryDto) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      include: { books: true },
    });

    if (!author) {
      throw new NotFoundException(`Author with id ${id} not found`);
    }

    if (author.books.length === 0) {
      return this.prisma.author.delete({ where: { id } });
    }

    if (!query.force) {
      throw new ConflictException(
        `Author has ${author.books.length} book(s). Use ?force=true to delete them along with the author.`,
      );
    }

    const bookIds = author.books.map((b) => b.id);

    const orderedBooks = await this.prisma.orderItem.findMany({
      where: { bookId: { in: bookIds } },
      select: { bookId: true },
      distinct: ['bookId'],
    });

    if (orderedBooks.length > 0) {
      throw new ConflictException(
        `Cannot delete: ${orderedBooks.length} of this author's book(s) appear in order history.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.book.deleteMany({ where: { authorId: id } });
      return tx.author.delete({ where: { id } });
    });
  }

  async stats(id: number) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      include: {
        books: {
          include: {
            orderItems: {
              where: {
                order: { status: { notIn: ['CANCELLED'] } },
              },
            },
          },
        },
      },
    });

    if (!author) {
      throw new NotFoundException(`Author with id ${id} not found`);
    }

    let bookCount = author.books.length;
    let totalStockValueCents = 0;
    let copiesSold = 0;
    let revenueCents = 0;

    for (const book of author.books) {
      totalStockValueCents += book.stock * book.priceCents;

      for (const item of book.orderItems) {
        copiesSold += item.quantity;
        revenueCents += item.quantity * item.unitPriceCents;
      }
    }

    return {
      authorId: id,
      name: author.name,
      bookCount,
      totalStockValueCents,
      copiesSold,
      revenueCents,
    };
  }

  async top(query: AuthorTopQueryDto) {
    const { by, limit } = query;

    const grouped = await this.prisma.orderItem.groupBy({
      by: ['bookId'],
      where: {
        order: { status: { notIn: ['PENDING', 'CANCELLED'] } },
      },
      _sum: {
        quantity: true,
        unitPriceCents: true,
      },
    });

    const books = await this.prisma.book.findMany({
      where: { id: { in: grouped.map((g) => g.bookId) } },
      include: { author: true },
    });

    const authorMap = new Map<number, {
      author: typeof books[0]['author'];
      copiesSold: number;
      revenue: number;
    }>();

    for (const g of grouped) {
      const book = books.find((b) => b.id === g.bookId);
      if (!book) continue;

      const authorId = book.authorId;
      const existing = authorMap.get(authorId) ?? {
        author: book.author,
        copiesSold: 0,
        revenue: 0,
      };

      existing.copiesSold += g._sum.quantity ?? 0;
      existing.revenue += (g._sum.quantity ?? 0) * (g._sum.unitPriceCents ?? 0);
      authorMap.set(authorId, existing);
    }

    const results = Array.from(authorMap.values())
      .sort((a, b) =>
        by === 'copiesSold'
          ? b.copiesSold - a.copiesSold
          : b.revenue - a.revenue,
      )
      .slice(0, limit)
      .map((entry) => ({
        author: entry.author,
        metric: by,
        value: by === 'copiesSold' ? entry.copiesSold : entry.revenue,
      }));

    return results;
  }
}