import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let mapped;

    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[])?.join(', ') ?? 'field';
        mapped = new ConflictException(`A record with this ${target} already exists`);
        break;
      }
      case 'P2025': {
        mapped = new NotFoundException('Record not found');
        break;
      }
      default: {
        mapped = new InternalServerErrorException('Something went wrong');
      }
    }

    response.status(mapped.getStatus()).json(mapped.getResponse());
  }
}