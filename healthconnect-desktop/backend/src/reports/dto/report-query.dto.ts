import { IsISO8601, IsIn, IsOptional, IsString } from 'class-validator';

export class ReportQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class ExportReportQueryDto extends ReportQueryDto {
  @IsString()
  @IsIn(['sales', 'inventory'])
  type: 'sales' | 'inventory';
}


