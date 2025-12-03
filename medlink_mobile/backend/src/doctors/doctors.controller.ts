import { Controller, Get, Param, Query } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { SearchDoctorsDto } from './dto/search-doctors.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async listDoctors(@Query() query: SearchDoctorsDto) {
    const doctors = await this.doctorsService.searchDoctors(query);
    return {
      data: {
        doctors,
      },
    };
  }

  @Get(':id')
  async getDoctor(@Param('id') id: string) {
    const doctor = await this.doctorsService.findOne(id);
    return {
      data: doctor,
    };
  }
}

