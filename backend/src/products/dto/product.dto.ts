import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateProductDto {
  @IsString() @Length(1, 50) sku!: string;
  @IsString() @Length(1, 200) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() @Length(1, 30) typeCode!: string;
  @IsOptional() @IsString() @Length(1, 100) category?: string;
  @IsOptional() @IsString() @Length(1, 150) laboratory?: string;
  @IsOptional() @IsString() @Length(1, 30) unit?: string;
  @IsOptional() @IsInt() @Min(0) minStock?: number;
  @IsOptional() @IsBoolean() requiresPrescription?: boolean;
  @IsOptional() @IsDateString() expirationDate?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() @Length(1, 30) typeCode?: string;
  @IsOptional() @IsString() @Length(1, 100) category?: string | null;
  @IsOptional() @IsString() @Length(1, 150) laboratory?: string | null;
  @IsOptional() @IsString() @Length(1, 30) unit?: string | null;
  @IsOptional() @IsInt() @Min(0) minStock?: number;
  @IsOptional() @IsBoolean() requiresPrescription?: boolean;
  @IsOptional() @IsDateString() expirationDate?: string | null;
  @IsOptional() @IsNumber() @Min(0) price?: number | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ProductMovementDto {
  @IsString() @Length(1, 20) movementCode!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() @Length(1, 255) reason?: string;
}
