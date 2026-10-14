import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Length, IsDateString } from 'class-validator';

export class CreatePatientDto {
  @IsString() @Length(1, 30) documentTypeCode!: string;
  @IsString() @Length(1, 30) documentNumber!: string;
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
  @IsDateString() birthDate!: string;
  @IsOptional() @IsString() @Length(1, 30) genderCode?: string;
  @IsOptional() @IsString() @Length(1, 30) phone?: string;
  @IsOptional() @IsEmail() @Length(1, 150) email?: string;
  @IsOptional() @IsString() @Length(1, 255) address?: string;
  @IsOptional() @IsString() @Length(1, 5) bloodTypeCode?: string;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsBoolean() isChronic?: boolean;
  @IsOptional() @IsBoolean() isPriority?: boolean;
  @IsOptional() @IsString() notes?: string;
}
