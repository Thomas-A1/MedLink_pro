import {
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizationType } from '../entities/organization.entity';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

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

  @IsOptional()
  @IsString()
  @MaxLength(32)
  primaryLocationPhone?: string;

  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  primaryLocationLatitude?: number;

  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  primaryLocationLongitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  brandColor?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  adminFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  adminLastName?: string;
}

