import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @IsInt() @Min(1) productId!: number;
  @IsString() @Length(1, 100) dosage!: string;
  @IsString() @Length(1, 100) frequency!: string;
  @IsOptional() @IsString() @Length(1, 50) duration?: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() instructions?: string;
}

export class CreatePrescriptionDto {
  @IsInt() @Min(1) patientId!: number;
  @IsInt() @Min(1) medicalRecordId!: number;
  @IsOptional() @IsString() @Length(1, 50) code?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PrescriptionItemDto) items!: PrescriptionItemDto[];
}

export class UpdatePrescriptionStatusDto {
  @IsString() @Length(1, 30) statusCode!: string;
}
