import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AuthorService } from './author.service';
import { BooksService } from '../books/books.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@Controller('author')
export class AuthorController {
  constructor(
    private authorService: AuthorService,
    private booksService: BooksService,
  ) {}

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

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuthorDto) {
    return this.authorService.update(id, dto);
  }
}