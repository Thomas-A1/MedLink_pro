import Dexie, { Table } from "dexie";

export type SyncJobType = "inventory:create" | "inventory:adjust";

export interface SyncJob {
  id?: number;
  type: SyncJobType;
  payload: Record<string, any>;
  createdAt: number;
  retries: number;
}

class SyncQueueDatabase extends Dexie {
  syncJobs!: Table<SyncJob, number>;

  constructor() {
    super("MedLinkSyncQueue");
    this.version(1).stores({
      syncJobs: "++id, type, createdAt",
    });
  }
}

const db = new SyncQueueDatabase();

export const syncQueueStorage = {
  async enqueue(job: Omit<SyncJob, "id" | "createdAt" | "retries">) {
    const id = await db.syncJobs.add({
      ...job,
      createdAt: Date.now(),
      retries: 0,
    });
    return id;
  },
  async list(): Promise<SyncJob[]> {
    return db.syncJobs.orderBy("createdAt").toArray();
  },
  async remove(id: number) {
    await db.syncJobs.delete(id);
  },
  async incrementRetry(id: number) {
    await db.syncJobs.update(id, { retries: Dexie.increment(1) });
  },
  async clear() {
    await db.syncJobs.clear();
  },
};


