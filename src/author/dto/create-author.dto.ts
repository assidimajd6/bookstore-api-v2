import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEmail } from 'class-validator';

export class CreateAuthorDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}