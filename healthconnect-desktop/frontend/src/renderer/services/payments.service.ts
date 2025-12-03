import { apiClient } from "./apiClient";

export interface InitiatePaymentRequest {
  purpose: "sale" | "prescription" | "service";
  items?: Array<{ inventoryItemId: string; quantity: number; unitPrice?: number }>;
  serviceItems?: Array<{ serviceId: string; quantity: number; unitPrice?: number }>;
  prescriptionId?: string;
  serviceId?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface InitiatePaymentResponse {
  authorizationUrl: string;
  reference: string;
  amount: number;
  currency: string;
}

export const paymentsService = {
  async initiate(pharmacyId: string, payload: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    const { data } = await apiClient.post(`/pharmacies/${pharmacyId}/payments/paystack/initialize`, payload);
    return data;
  },
};


