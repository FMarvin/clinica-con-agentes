import { IsBoolean, IsEmail, IsOptional, IsString, Length, IsDateString } from 'class-validator';

export class UpdatePatientDto {
  @IsOptional() @IsString() @Length(1, 100) firstName?: string;
  @IsOptional() @IsString() @Length(1, 100) lastName?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() @Length(1, 30) genderCode?: string | null;
  @IsOptional() @IsString() @Length(1, 30) phone?: string | null;
  @IsOptional() @IsEmail() @Length(1, 150) email?: string | null;
  @IsOptional() @IsString() @Length(1, 255) address?: string | null;
  @IsOptional() @IsString() @Length(1, 5) bloodTypeCode?: string | null;
  @IsOptional() @IsString() allergies?: string | null;
  @IsOptional() @IsBoolean() isChronic?: boolean;
  @IsOptional() @IsBoolean() isPriority?: boolean;
  @IsOptional() @IsString() notes?: string | null;
}
