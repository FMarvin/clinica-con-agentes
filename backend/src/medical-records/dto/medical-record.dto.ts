import { IsDateString, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateMedicalRecordDto {
  @IsInt() @Min(1) patientId!: number;
  @IsOptional() @IsInt() @Min(1) appointmentId?: number;
  @IsDateString() consultationDate!: string;
  @IsString() @Length(1, 255) reason!: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() treatment?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateMedicalRecordDto {
  @IsOptional() @IsDateString() consultationDate?: string;
  @IsOptional() @IsString() @Length(1, 255) reason?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() treatment?: string;
  @IsOptional() @IsString() notes?: string;
}
