import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class LocationQueryDto {
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  @Min(1)
  @Max(200)
  radius: number;

  @IsOptional()
  @IsString()
  search?: string;
}

