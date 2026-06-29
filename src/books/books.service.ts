import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBookDto) {
    const author = await this.prisma.author.findUnique({
      where: { id: dto.authorId },
    });

   if (!author) {
      throw new BadRequestException(`Author with id ${dto.authorId} does not exist`);
    }

    return this.prisma.book.create({ data: dto });
  }

  findAll(authorId?: number) {
    return this.prisma.book.findMany({
      where: authorId ? { authorId } : undefined,
      include: { author: true },
    });
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
  }
}