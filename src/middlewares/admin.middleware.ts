import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminMiddleware implements NestMiddleware {
  private readonly logger: Logger;

  constructor(private readonly prismaService: PrismaService) {
    this.logger = new Logger(AdminMiddleware.name);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const adminCount = await this.prismaService.admin.count();
      if (adminCount < 1) {
        this.logger.warn('Admin not found');
        return res.render('adminSetup', {
          host: `${process.env.FULL_URL}`,
        });
      } else if (adminCount > 1) {
        this.logger.error('More than one admin found!');
      }
      next();
    } catch (error) {
      this.logger.error('error while checking admin count', error);
      res.status(500).send('Internal server error');
    }
  }
}
