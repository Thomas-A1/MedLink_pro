import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionsService } from './prescriptions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Prescription } from './entities/prescription.entity';
import { Pharmacy } from '../pharmacy/entities/pharmacy.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { PrescriptionMedication } from './entities/prescription-medication.entity';
import { User } from '../common/entities/user.entity';
import { InventoryService } from '../inventory/inventory.service';
import { StockMovementType } from '../inventory/entities/stock-movement.entity';

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('PrescriptionsService', () => {
  let moduleRef: TestingModule;
  let service: PrescriptionsService;
  let prescriptionRepo: ReturnType<typeof createRepositoryMock>;
  let inventoryRepo: ReturnType<typeof createRepositoryMock>;
  let medicationRepo: ReturnType<typeof createRepositoryMock>;
  let inventoryService: { adjustQuantity: jest.Mock };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        { provide: getRepositoryToken(Prescription), useValue: createRepositoryMock() },
        { provide: getRepositoryToken(Pharmacy), useValue: createRepositoryMock() },
        { provide: getRepositoryToken(InventoryItem), useValue: createRepositoryMock() },
        { provide: getRepositoryToken(PrescriptionMedication), useValue: createRepositoryMock() },
        { provide: getRepositoryToken(User), useValue: createRepositoryMock() },
        {
          provide: InventoryService,
          useValue: {
            adjustQuantity: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<PrescriptionsService>(PrescriptionsService);
    prescriptionRepo = moduleRef.get(getRepositoryToken(Prescription));
    inventoryRepo = moduleRef.get(getRepositoryToken(InventoryItem));
    medicationRepo = moduleRef.get(getRepositoryToken(PrescriptionMedication));
    inventoryService = moduleRef.get(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('assigns a prescription by verification code', async () => {
    const assignSpy = jest.spyOn(service, 'assign').mockResolvedValue({} as any);
    prescriptionRepo.findOne.mockResolvedValue({ id: 'presc-1' });

    await service.assignByVerificationCode('pharmacy-1', 'RX-1234');

    expect(assignSpy).toHaveBeenCalledWith('pharmacy-1', 'presc-1');
  });

  it('fulfils a prescription and records stock movement', async () => {
    const prescription = {
      id: 'presc-1',
      verificationCode: 'RX-0001',
      medications: [{ id: 'med-1', drugName: 'Amoxicillin' }],
      assignedPharmacy: { id: 'pharmacy-1' },
    };

    prescriptionRepo.findOne.mockResolvedValue(prescription);
    inventoryRepo.findOne.mockResolvedValue({ id: 'inventory-1' });
    prescriptionRepo.save.mockResolvedValue(prescription);

    await service.fulfil('pharmacy-1', 'presc-1', {
      dispensedMedications: ['med-1'],
      pharmacistId: 'user-1',
    });

    expect(inventoryService.adjustQuantity).toHaveBeenCalledWith(
      'pharmacy-1',
      'inventory-1',
      -1,
      StockMovementType.SALE,
      'user-1',
      expect.stringContaining('RX-0001'),
    );
    expect(prescriptionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ fulfilledAt: expect.any(Date) }));
  });

  it('seeds sample prescriptions when none exist', async () => {
    prescriptionRepo.count.mockResolvedValue(0);
    medicationRepo.create.mockImplementation((payload) => payload);
    prescriptionRepo.create.mockImplementation((payload) => payload);
    (service as any).ensureSampleUser = jest.fn().mockResolvedValue({ id: 'user' });
    const pharmacy = { id: 'pharmacy-1' };
    const pharmacyRepo = moduleRef.get(getRepositoryToken(Pharmacy));
    pharmacyRepo.findOne.mockResolvedValue(pharmacy);

    await service.seedSamplePrescriptions('pharmacy-1');

    expect(prescriptionRepo.save).toHaveBeenCalled();
  });
});

