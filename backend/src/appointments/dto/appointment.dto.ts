import { IsDateString, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt() @Min(1) patientId!: number;
  @IsInt() @Min(1) doctorId!: number;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsInt() @Min(5) @Max(480) durationMinutes?: number;
  @IsString() @Length(1, 30) statusCode!: string;
  @IsOptional() @IsString() @Length(1, 255) reason?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateAppointmentDto {
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsInt() @Min(5) @Max(480) durationMinutes?: number;
  @IsOptional() @IsString() @Length(1, 30) statusCode?: string;
  @IsOptional() @IsString() @Length(1, 255) reason?: string;
  @IsOptional() @IsString() notes?: string;
}
