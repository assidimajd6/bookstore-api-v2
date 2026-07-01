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
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { BooksQueryDto } from './dto/books-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { RestockDto } from './dto/restock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { LowStockQueryDto } from './dto/low-stock-query.dto';
import { SearchBooksDto } from './dto/search-books.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateBookDto) {
    return this.booksService.create(dto);
  }

  @Get()
  findAll(@Query() query: BooksQueryDto) {
    return this.booksService.findAll(query);
  }

  @Get('search')
  search(@Query() query: SearchBooksDto) {
    return this.booksService.search(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('low-stock')
  lowStock(@Query() query: LowStockQueryDto) {
    return this.booksService.lowStock(query);
  }

  @Get('bestsellers')
  bestsellers(
    @Query('limit') limit?: string,
    @Query('since') since?: string,
  ) {
    return this.booksService.bestsellers(limit ? Number(limit) : 10, since);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  @Get(':id/availability')
  availability(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.availability(id);
  }

  @Get(':id/related')
  related(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    return this.booksService.related(id, limit ? Number(limit) : 5);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto) {
    return this.booksService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/restock')
  restock(@Param('id', ParseIntPipe) id: number, @Body() dto: RestockDto) {
    return this.booksService.restock(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/adjust-stock')
  adjustStock(@Param('id', ParseIntPipe) id: number, @Body() dto: AdjustStockDto) {
    return this.booksService.adjustStock(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.remove(id);
  }
}