import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AuthService } from './auth/auth.service';
import { PharmacyService } from './pharmacy/pharmacy.service';
import { InventoryService } from './inventory/inventory.service';
import { PrescriptionsService } from './prescriptions/prescriptions.service';
import { QueueService } from './queue/queue.service';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  // Paystack webhook needs raw body for signature verification
  app.use('/api/integrations/paystack/webhook', bodyParser.raw({ type: '*/*' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(helmet());
  app.enableCors({ origin: '*' });

  const authService = app.get(AuthService);
  await authService.seedInitialAdmin();

  const pharmacyService = app.get(PharmacyService);
  const inventoryService = app.get(InventoryService);
  const prescriptionsService = app.get(PrescriptionsService);
  const queueService = app.get(QueueService);
  const defaultPharmacy = await pharmacyService.seedDefaultPharmacy();
  if (defaultPharmacy) {
    await inventoryService.seedSampleInventory(defaultPharmacy.id);
    await prescriptionsService.seedSamplePrescriptions(defaultPharmacy.id);
    await queueService.seedSampleQueue(defaultPharmacy.id);
  }

  const port = process.env.APP_PORT || 4000;
  await app.listen(port);
  console.log(`HealthConnect Desktop API listening on port ${port}`);
}
bootstrap();
