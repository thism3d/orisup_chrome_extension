export type {
  CourierAdapter,
  PartnerType,
  AdapterOutcome,
  CreateShipmentInput,
  CreateShipmentResult,
  CancelShipmentInput,
  CancelShipmentResult,
  VerifyWebhookInput,
  ParsedWebhook,
} from "./types";
export { getAdapter, isPartnerType, listPartnerTypes } from "./registry";
