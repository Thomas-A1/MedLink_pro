import { Controller, Get } from '@nestjs/common';
import { MobileApiService } from './mobile-api.service';

@Controller('mobile-api')
// Note: These endpoints are public (no auth required) for mobile app access
export class MobileApiController {
  constructor(private readonly mobileApiService: MobileApiService) {}

  @Get('pharmacies')
  async getPharmacies() {
    const pharmacies = await this.mobileApiService.getPharmacies();
    return {
      success: true,
      data: {
        pharmacies,
        count: pharmacies.length,
      },
    };
  }

  @Get('hospitals')
  async getHospitals() {
    const hospitals = await this.mobileApiService.getHospitals();
    return {
      success: true,
      data: {
        hospitals,
        count: hospitals.length,
      },
    };
  }

  @Get('all')
  async getAll() {
    const [pharmacies, hospitals] = await Promise.all([
      this.mobileApiService.getPharmacies(),
      this.mobileApiService.getHospitals(),
    ]);

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

