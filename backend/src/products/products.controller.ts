import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CreateProductDto, ProductMovementDto, UpdateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

type AuthRequest = Request & { user: { id: number } };
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() dto: CreateProductDto, @Req() req: AuthRequest) { return this.service.create(dto, req.user.id); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto, @Req() req: AuthRequest) { return this.service.update(id, dto, req.user.id); }
  @Post(':id/movements') move(@Param('id', ParseIntPipe) id: number, @Body() dto: ProductMovementDto, @Req() req: AuthRequest) { return this.service.move(id, dto, req.user.id); }
  @Delete(':id') deactivate(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) { return this.service.deactivate(id, req.user.id); }
}
