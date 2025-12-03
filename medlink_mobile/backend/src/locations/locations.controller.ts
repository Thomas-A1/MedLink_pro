import { Controller, Get, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationQueryDto } from './dto/location-query.dto';
import { HospitalQueryDto } from './dto/hospital-query.dto';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('pharmacies')
  async getPharmacies(@Query() query: LocationQueryDto) {
    const pharmacies = await this.locationsService.findPharmacies(query);
    return {
      data: {
        pharmacies,
      },
    };
  }

  @Get('hospitals')
  async getHospitals(@Query() query: HospitalQueryDto) {
    const hospitals = await this.locationsService.findHospitals(query);
    return {
      data: {
        hospitals,
      },
    };
  }

  @Get('all')
  async getAllLocations(@Query() query: LocationQueryDto) {
    const [pharmacies, hospitals] = await Promise.all([
      this.locationsService.findPharmacies(query),
      this.locationsService.findHospitals({
        latitude: query.latitude,
        longitude: query.longitude,
        radius: query.radius,
      } as HospitalQueryDto),
    ]);

    return {
      data: {
        pharmacies,
        hospitals,
        totalCount: pharmacies.length + hospitals.length,
      },
    };
  }
}

