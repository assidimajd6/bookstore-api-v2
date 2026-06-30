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
}
}
