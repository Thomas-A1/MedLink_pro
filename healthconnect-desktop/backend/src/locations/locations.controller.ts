import { Controller, Get, Query, ParseFloatPipe, ParseBoolPipe, DefaultValuePipe } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
// Note: These endpoints are public (no auth required) for mobile app access
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('pharmacies')
  async getPharmacies(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('radius', ParseFloatPipe) radius: number,
  ) {
    const pharmacies = await this.locationsService.getPharmacies(
      latitude,
      longitude,
      radius,
    );

    return {
      success: true,
      data: {
        pharmacies,
        count: pharmacies.length,
      },
    };
  }

  @Get('hospitals')
  async getHospitals(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('radius', ParseFloatPipe) radius: number,
    @Query('has_emergency', new DefaultValuePipe(false), ParseBoolPipe) hasEmergency: boolean,
  ) {
    const hospitals = await this.locationsService.getHospitals(
      latitude,
      longitude,
      radius,
      hasEmergency,
    );

    return {
      success: true,
      data: {
        hospitals,
        count: hospitals.length,
      },
    };
  }

  @Get('all')
  async getAllLocations(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('radius', ParseFloatPipe) radius: number,
  ) {
    const { pharmacies, hospitals } = await this.locationsService.getAllLocations(
      latitude,
      longitude,
      radius,
    );

    return {
      success: true,
      data: {
        pharmacies,
        hospitals,
        totalCount: pharmacies.length + hospitals.length,
      },
    };
  }
}

