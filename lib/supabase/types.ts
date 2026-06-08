/**
 * TypeScript types mirroring the Supabase schema.
 * These are hand-written to avoid needing the Supabase CLI locally.
 * For production you can replace this with the auto-generated types:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
 */

export type OrderStatus = 'pending' | 'paid' | 'provisioning' | 'completed' | 'failed' | 'refunded';
export type OrderType   = 'new_esim' | 'top_up';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id:         string;
          email:      string;
          full_name:  string | null;
          phone:      string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id:         string;
          email:      string;
          full_name?: string | null;
          phone?:     string | null;
        };
        Update: {
          full_name?: string | null;
          phone?:     string | null;
        };
      };
      tariffs: {
        Row: {
          id:                 string;
          package_code:       string;
          slug:               string;
          name:               string;
          description:        string | null;
          country_code:       string;
          country_name:       string;
          region:             string | null;
          flag_emoji:         string | null;
          data_gb:            number | null;
          validity_days:      number;
          ek_price_usd:       number;
          sale_price_eur:     number;
          usd_eur_rate:       number;
          is_active:          boolean;
          is_top_up_eligible: boolean;
          raw_data:           Record<string, unknown> | null;
          last_synced_at:     string;
          created_at:         string;
          updated_at:         string;
        };
        Insert: Omit<Database['public']['Tables']['tariffs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tariffs']['Insert']>;
      };
      orders: {
        Row: {
          id:                   string;
          user_id:              string | null;
          tariff_id:            string;
          order_type:           OrderType;
          status:               OrderStatus;
          customer_email:       string;
          customer_name:        string | null;
          amount_eur:           number;
          usd_eur_rate:         number;
          sellauth_order_id:    string | null;
          sellauth_product_id:  string | null;
          sellauth_invoice_id:  string | null;
          payment_confirmed_at: string | null;
          iccid:                string | null;
          qr_code_url:          string | null;
          qr_code_base64:       string | null;
          activation_code:      string | null;
          smdp_address:         string | null;
          apn:                  string | null;
          top_up_iccid:         string | null;
          error_message:        string | null;
          created_at:           string;
          updated_at:           string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      system_settings: {
        Row: {
          key:         string;
          value:       string;
          description: string | null;
          updated_at:  string;
        };
        Insert: { key: string; value: string; description?: string | null };
        Update: { value?: string; description?: string | null };
      };
    };
    Views:    Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      order_status: OrderStatus;
      order_type:   OrderType;
    };
  };
}
