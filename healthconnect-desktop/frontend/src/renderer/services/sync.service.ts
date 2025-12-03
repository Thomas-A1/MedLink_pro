import { inventoryService, CreateInventoryPayload, AdjustInventoryPayload } from "./inventory.service";
import { syncQueueStorage, SyncJob } from "../storage/syncQueue";

export interface SyncResult {
  processed: number;
  failures: number;
}

export const syncService = {
  async listJobs() {
    return syncQueueStorage.list();
  },
  async enqueueInventoryCreate(pharmacyId: string, payload: CreateInventoryPayload, tempId: string) {
    return syncQueueStorage.enqueue({
      type: "inventory:create",
      payload: { pharmacyId, payload, tempId },
    });
  },
  async enqueueInventoryAdjust(
    pharmacyId: string,
    itemId: string,
    payload: AdjustInventoryPayload & { displayName?: string }
  ) {
    return syncQueueStorage.enqueue({
      type: "inventory:adjust",
      payload: { pharmacyId, itemId, payload },
    });
  },
  async processQueue(): Promise<SyncResult> {
    const jobs = await syncQueueStorage.list();
    let processed = 0;
    let failures = 0;
    for (const job of jobs) {
      try {
        if (job.type === "inventory:create") {
          await handleInventoryCreate(job);
        } else if (job.type === "inventory:adjust") {
          await handleInventoryAdjust(job);
        }
        await syncQueueStorage.remove(job.id!);
        processed += 1;
      } catch (err) {
        failures += 1;
        await syncQueueStorage.incrementRetry(job.id!);
      }
    }
    return { processed, failures };
  },
};

async function handleInventoryCreate(job: SyncJob) {
  const { pharmacyId, payload } = job.payload;
  await inventoryService.createItem(pharmacyId, payload as CreateInventoryPayload);
}

async function handleInventoryAdjust(job: SyncJob) {
  const { pharmacyId, itemId, payload } = job.payload;
  await inventoryService.adjustStock(
    pharmacyId,
    itemId as string,
    payload as AdjustInventoryPayload
  );
}


