import { Module } from '@nestjs/common';
import { AuthorController } from './author.controller';
import { AuthorService } from './author.service';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [BooksModule],
  controllers: [AuthorController],
  providers: [AuthorService],
})
export class AuthorModule {}