// ─── Sellauth Types ──────────────────────────────────────────

export interface SellauthCheckoutPayload {
  product_id:     string;
  quantity:       number;
  email:          string;
  custom_fields?: Record<string, string>;
  success_url?:   string;
  cancel_url?:    string;
}

export interface SellauthCheckoutResponse {
  id:          string;   // invoice/order ID
  url:         string;   // redirect URL for the buyer
  status:      string;
}

export type SellauthWebhookEvent =
  | 'order.created'
  | 'order.paid'
  | 'order.refunded'
  | 'order.disputed';

export interface SellauthWebhookPayload {
  event:    SellauthWebhookEvent;
  order: {
    id:             string;
    invoice_id:     string;
    product_id:     string;
    email:          string;
    status:         string;
    total:          number;        // amount in EUR cents
    currency:       string;
    custom_fields?: Record<string, string>;
    created_at:     string;
    paid_at?:       string;
  };
}
