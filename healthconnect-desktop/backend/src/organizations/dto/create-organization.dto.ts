import {
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizationType } from '../entities/organization.entity';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsEnum(OrganizationType)
  type: OrganizationType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  primaryLocationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  primaryLocationAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  primaryLocationRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  primaryLocationDistrict?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  primaryLocationCountry?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  primaryLocationPhone: string;

  @IsLatitude()
  @Type(() => Number)
  primaryLocationLatitude: number;

  @IsLongitude()
  @Type(() => Number)
  primaryLocationLongitude: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timezone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(7)
  brandColor: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  adminFirstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  adminLastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  adminPassword?: string;
}

