import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Authmodule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthorModule } from './author/author.module';
import { BooksModule } from './books/books.module';

@Module({
  imports: [Authmodule, UserModule, BookmarkModule, PrismaModule, AuthorModule, BooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
