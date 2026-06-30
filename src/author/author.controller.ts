import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthorService } from './author.service';
import { BooksService } from '../books/books.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('author')
export class AuthorController {
  constructor(
    private authorService: AuthorService,
    private booksService: BooksService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateAuthorDto) {
    return this.authorService.create(dto);
  }

  @Get()
  findAll() {
    return this.authorService.findAll();
  }

  @Get(':id/books')
  findBooksByAuthor(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findByAuthor(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuthorDto) {
    return this.authorService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.authorService.remove(id);
  }
}