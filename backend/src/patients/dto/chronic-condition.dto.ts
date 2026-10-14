import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateChronicConditionDto {
  @IsString({ message: 'El nombre de la condición es obligatorio' })
  @Length(1, 150, { message: 'El nombre de la condición debe tener entre 1 y 150 caracteres' })
  name!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de diagnóstico no es válida' })
  diagnosedAt?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20, { message: 'La severidad no es válida' })
  severityCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
