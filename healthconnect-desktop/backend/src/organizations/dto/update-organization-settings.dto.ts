import { IsHexColor, IsObject, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsHexColor()
  themePrimaryColor?: string;

  @IsOptional()
  @IsHexColor()
  themeAccentColor?: string;

  @IsOptional()
  @Matches(/^(https?:\/\/.+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)$/, {
    message: 'Logo must be a valid URL or image data URL',
  })
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  brandColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  // Integrations
  @IsOptional()
  @IsString()
  @MaxLength(64)
  paystackSubaccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  settlementPhone?: string;
}

