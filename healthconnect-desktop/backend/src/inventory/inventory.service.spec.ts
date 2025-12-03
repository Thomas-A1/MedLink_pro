import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { StockMovement, StockMovementType } from './entities/stock-movement.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { User } from '../common/entities/user.entity';

type MockRepository<T = unknown> = Partial<Record<keyof ReturnType<typeof createRepositoryMock>, jest.Mock>>;

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
});

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepo: MockRepository<InventoryItem>;
  let movementRepo: MockRepository<StockMovement>;
  let pharmacyRepo: MockRepository<Pharmacy>;
  let userRepo: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(InventoryItem), useValue: createRepositoryMock() },
        { provide: getRepositoryToken(StockMovement), useValue: createRepositoryMock() },
        { provide: getRepositoryToken(Pharmacy), useValue: createRepositoryMock() },
        { provide: getRepositoryToken(User), useValue: createRepositoryMock() },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepo = module.get(getRepositoryToken(InventoryItem));
    movementRepo = module.get(getRepositoryToken(StockMovement));
    pharmacyRepo = module.get(getRepositoryToken(Pharmacy));
    userRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('computes item meta when listing inventory', async () => {
    const expiryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    inventoryRepo.find!.mockResolvedValue([
      {
        id: 'item-1',
        name: 'Sample',
        genericName: null,
        category: 'Test',
        form: 'Tablet',
        strength: '10mg',
        manufacturer: null,
        batchNumber: null,
        expiryDate,
        quantityInStock: 5,
        reorderLevel: 10,
        unitPrice: 1.5,
        sellingPrice: 2.0,
        barcode: null,
        requiresPrescription: false,
        isAvailable: true,
        pharmacy: { id: 'pharmacy-1' },
      } as unknown as InventoryItem,
    ]);

    const result = await service.list('pharmacy-1');

    expect(result).toHaveLength(1);
    expect(result[0].meta.isLowStock).toBe(true);
    expect(result[0].meta.statusTags).toContain('low-stock');
    expect(result[0].meta.expiresInDays).toBeGreaterThan(0);
  });

  it('records a stock movement when adjusting quantity', async () => {
    const item = {
      id: 'item-2',
      name: 'Paracetamol',
      quantityInStock: 20,
      reorderLevel: 5,
      pharmacy: { id: 'pharmacy-1' },
    } as unknown as InventoryItem;

    inventoryRepo.findOne!.mockResolvedValue(item);
    inventoryRepo.save!.mockImplementation(async (entity) => entity);
    movementRepo.create!.mockImplementation((payload) => payload);

    await service.adjustQuantity('pharmacy-1', 'item-2', -10, StockMovementType.SALE, 'user-1', 'Dispensed');

    expect(inventoryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        quantityInStock: 10,
      }),
    );

    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: StockMovementType.SALE,
        quantity: -10,
        balanceAfter: 10,
      }),
    );
    expect(movementRepo.save).toHaveBeenCalled();
  });

  it('seeds sample inventory only when empty', async () => {
    inventoryRepo.count!.mockResolvedValueOnce(0);
    pharmacyRepo.findOne!.mockResolvedValue({ id: 'pharmacy-1' });
    userRepo.findOne!.mockResolvedValue({ id: 'admin-1' });
    const createSpy = jest.spyOn(service, 'create').mockResolvedValue({} as any);

    await service.seedSampleInventory('pharmacy-1');

    expect(createSpy).toHaveBeenCalledTimes(3);
  });
});

