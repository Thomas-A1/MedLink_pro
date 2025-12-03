import { Controller, Get, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { SearchDrugDto } from './dto/search-drug.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('search-drug')
  searchDrug(@Query() query: SearchDrugDto) {
    return this.inventoryService.searchDrug(query);
  }
}

