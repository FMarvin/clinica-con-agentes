import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'La contraseña actual es obligatoria' })
  @MinLength(8, { message: 'La contraseña actual debe tener al menos 8 caracteres' })
  currentPassword!: string;

  @IsString({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(12, { message: 'La nueva contraseña debe tener al menos 12 caracteres' })
  newPassword!: string;
}
