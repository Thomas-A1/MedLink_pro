import { apiClient } from "./apiClient";

/**
 * Trigger a full database reset, keeping only the SuperAdmin user.
 * This is extremely destructive and should only be used in non-production environments.
 */
export async function resetDatabaseKeepingSuperAdmin(): Promise<void> {
  await apiClient.post("/admin/reset-database", {
    confirm: "RESET_ALL_DATA",
  });
}


