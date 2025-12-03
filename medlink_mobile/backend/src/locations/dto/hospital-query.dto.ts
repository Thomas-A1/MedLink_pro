import { IsBooleanString, IsOptional } from 'class-validator';
import { LocationQueryDto } from './location-query.dto';

export class HospitalQueryDto extends LocationQueryDto {
  @IsOptional()
  @IsBooleanString()
  has_emergency?: string;
}

