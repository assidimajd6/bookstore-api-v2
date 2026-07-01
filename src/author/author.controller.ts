import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthorService } from './author.service';
import { BooksService } from '../books/books.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { AuthorTopQueryDto } from './dto/author-top-query.dto';
import { DeleteAuthorQueryDto } from './dto/delete-author-query.dto';
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

  @Get('top')
  top(@Query() query: AuthorTopQueryDto) {
    return this.authorService.top(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.authorService.findAll();
  }

  @Get(':id/books')
  findBooksByAuthor(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findByAuthor(id);
  }

  @Get(':id/stats')
  stats(@Param('id', ParseIntPipe) id: number) {
    return this.authorService.stats(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuthorDto) {
    return this.authorService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DeleteAuthorQueryDto,
  ) {
    return this.authorService.remove(id, query);
  }
}