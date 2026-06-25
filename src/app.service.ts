// src/app.service.ts

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService implements OnModuleInit {
    private readonly logger = new Logger(AppService.name);
    
    constructor(private prisma: PrismaService) {}

    async onModuleInit() {
        try {
            const authors = await this.prisma.author.findMany();
            this.logger.log(`✅ Found ${authors.length} authors`);
        } catch (error) {
            // error is now properly typed as 'unknown'
            this.logger.error('❌ Error:', error instanceof Error ? error.message : String(error));
        }
    }

    // Add this method for app.controller.ts
    getHello(): string {
        return 'Hello World!';
    }
}