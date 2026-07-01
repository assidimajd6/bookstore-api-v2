import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BooksQueryDto } from './dto/books-query.dto';
import { Prisma } from '@prisma/client';
import { RestockDto } from './dto/restock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { LowStockQueryDto } from './dto/low-stock-query.dto';
import { SearchBooksDto } from './dto/search-books.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBookDto) {
    const author = await this.prisma.author.findUnique({
      where: { id: dto.authorId },
    });

    if (!author) {
      throw new BadRequestException(
        `Author with id ${dto.authorId} does not exist`,
      );
    }

    return this.prisma.book.create({ data: dto });
  }

  findAll(query: BooksQueryDto) {
    const { page, limit, authorId, search, sort } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookWhereInput = {};

    if (authorId) {
      where.authorId = authorId;
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const orderBy: Prisma.BookOrderByWithRelationInput = sort
      ? { priceCents: sort }
      : undefined;

    return this.prisma
      .$transaction([
        this.prisma.book.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: { author: true },
        }),
        this.prisma.book.count({ where }),
      ])
      .then(([data, total]) => ({
        data,
        meta: { page, limit, total },
      }));
  }

  async findOne(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!book) {
      throw new NotFoundException(`Book with id ${id} not found`);
    }

    return book;
  }

  update(id: number, dto: UpdateBookDto) {
    return this.prisma.book.update({
      where: { id },
      data: dto,
    });
  }

  findByAuthor(authorId: number) {
    return this.prisma.book.findMany({
      where: { authorId },
    });
  }remove(id: number) {
  return this.prisma.book.delete({ where: { id } });
}async restock(id: number, dto: RestockDto) {
  const book = await this.prisma.book.findUnique({ where: { id } });

  if (!book) {
    throw new NotFoundException(`Book with id ${id} not found`);
  }

  return this.prisma.book.update({
    where: { id },
    data: { stock: book.stock + dto.quantity },
  });
}

async adjustStock(id: number, dto: AdjustStockDto) {
  const book = await this.prisma.book.findUnique({ where: { id } });

  if (!book) {
    throw new NotFoundException(`Book with id ${id} not found`);
  }

  const newStock = book.stock + dto.delta;

  if (newStock < 0) {
    throw new BadRequestException(
      `Adjustment would result in negative stock (current: ${book.stock}, delta: ${dto.delta})`,
    );
  }

  return this.prisma.book.update({
    where: { id },
    data: { stock: newStock },
    select: { id: true, stock: true },
  });
}

async availability(id: number) {
  const book = await this.prisma.book.findUnique({ where: { id } });

  if (!book) {
    throw new NotFoundException(`Book with id ${id} not found`);
  }

  let status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

  if (book.stock === 0) {
    status = 'OUT_OF_STOCK';
  } else if (book.stock <= 5) {
    status = 'LOW_STOCK';
  } else {
    status = 'IN_STOCK';
  }

  return { bookId: book.id, stock: book.stock, status };
}

lowStock(query: LowStockQueryDto) {
  const { page, limit, threshold } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.BookWhereInput = {
    stock: { lte: threshold },
  };

  return this.prisma
    .$transaction([
      this.prisma.book.findMany({
        where,
        orderBy: { stock: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.book.count({ where }),
    ])
    .then(([data, total]) => ({
      data,
      meta: { page, limit, total },
    }));
}search(query: SearchBooksDto) {
  const { page, limit, q, minPrice, maxPrice, inStock, authorId, sort } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.BookWhereInput = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { author: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  if (minPrice !== undefined) {
    where.priceCents = { ...where.priceCents as object, gte: minPrice };
  }

  if (maxPrice !== undefined) {
    where.priceCents = { ...where.priceCents as object, lte: maxPrice };
  }

  if (inStock === true) {
    where.stock = { gt: 0 };
  }

  if (authorId) {
    where.authorId = authorId;
  }

  const orderBy: Prisma.BookOrderByWithRelationInput = (() => {
    switch (sort) {
      case 'price_asc': return { priceCents: 'asc' };
      case 'price_desc': return { priceCents: 'desc' };
      case 'title': return { title: 'asc' };
      case 'newest': return { createdAt: 'desc' };
      default: return { createdAt: 'desc' };
    }
  })();

  return this.prisma.$transaction([
    this.prisma.book.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { author: true },
    }),
    this.prisma.book.count({ where }),
  ]).then(([data, total]) => ({
    data,
    meta: { page, limit, total },
  }));
}

async bestsellers(limit: number, since?: string) {
  const sinceDate = since ? new Date(since) : undefined;

  const grouped = await this.prisma.orderItem.groupBy({
    by: ['bookId'],
    where: {
      order: {
        status: { notIn: ['PENDING', 'CANCELLED'] },
        ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const results = await Promise.all(
    grouped.map(async (g) => {
      const book = await this.prisma.book.findUnique({
        where: { id: g.bookId },
        include: { author: true },
      });
      const totalSold = g._sum.quantity ?? 0;
      const revenueCents = totalSold * book.priceCents;
      return { book, totalSold, revenueCents };
    }),
  );

  return results;
}

async related(id: number, limit: number) {
  const book = await this.prisma.book.findUnique({ where: { id } });

  if (!book) {
    throw new NotFoundException(`Book with id ${id} not found`);
  }

  const soldCounts = await this.prisma.orderItem.groupBy({
    by: ['bookId'],
    where: {
      bookId: { not: id },
      order: { status: { notIn: ['PENDING', 'CANCELLED'] } },
    },
    _sum: { quantity: true },
  });

  const soldMap = new Map(
    soldCounts.map((s) => [s.bookId, s._sum.quantity ?? 0]),
  );

  const relatedBooks = await this.prisma.book.findMany({
    where: {
      authorId: book.authorId,
      id: { not: id },
    },
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return relatedBooks.sort(
    (a, b) => (soldMap.get(b.id) ?? 0) - (soldMap.get(a.id) ?? 0),
  );
}
}
