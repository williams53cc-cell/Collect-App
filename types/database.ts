export type CustomerStatus = "active" | "overdue" | "paid" | "closed";
export type FollowUpStatus = "pending" | "needs_call" | "done" | "skipped";
export type PaymentType =
  | "deposit"
  | "materials_payment"
  | "stage_payment"
  | "final_balance"
  | "other";
export type PaymentTrigger =
  | "before_work_begins"
  | "before_materials_ordered"
  | "after_stage_completed"
  | "at_job_completion"
  | "on_specific_date"
  | "custom";
export type BusinessType =
  | "renovation_contractor"
  | "general_contractor"
  | "electrician"
  | "plumber"
  | "hvac_contractor"
  | "landscaper"
  | "painter"
  | "roofer"
  | "tile_installer"
  | "other";
export type PaymentMethod = "paypal" | "venmo" | "zelle" | "check" | "other";

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          contact: string | null;
          email: string | null;
          phone: string | null;
          job: string | null;
          amount_owed: number;
          status: CustomerStatus;
          notes: string | null;
          created_at: string;
          payment_type: PaymentType | null;
          payment_trigger: PaymentTrigger | null;
          payment_trigger_note: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          contact?: string | null;
          email?: string | null;
          phone?: string | null;
          job?: string | null;
          amount_owed?: number;
          status?: CustomerStatus;
          notes?: string | null;
          created_at?: string;
          payment_type?: PaymentType | null;
          payment_trigger?: PaymentTrigger | null;
          payment_trigger_note?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          contact?: string | null;
          email?: string | null;
          phone?: string | null;
          job?: string | null;
          amount_owed?: number;
          status?: CustomerStatus;
          notes?: string | null;
          created_at?: string;
          payment_type?: PaymentType | null;
          payment_trigger?: PaymentTrigger | null;
          payment_trigger_note?: string | null;
        };
        Relationships: [];
      };
      follow_ups: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string;
          reason: string;
          due_date: string;
          status: FollowUpStatus;
          notes: string | null;
          created_at: string;
          promised_date: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          customer_id: string;
          reason: string;
          due_date: string;
          status?: FollowUpStatus;
          notes?: string | null;
          created_at?: string;
          promised_date?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_id?: string;
          reason?: string;
          due_date?: string;
          status?: FollowUpStatus;
          notes?: string | null;
          created_at?: string;
          promised_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      customer_events: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string;
          headline: string;
          detail: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          customer_id: string;
          headline: string;
          detail: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_id?: string;
          headline?: string;
          detail?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_events_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      digest_sends: {
        Row: {
          user_id: string;
          digest_date: string;
          sent_at: string;
        };
        Insert: {
          user_id: string;
          digest_date: string;
          sent_at?: string;
        };
        Update: {
          user_id?: string;
          digest_date?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      business_profiles: {
        Row: {
          user_id: string;
          business_name: string;
          business_type: BusinessType;
          currency: string;
          country: string | null;
          timezone: string | null;
          payment_method: PaymentMethod | null;
          payment_link: string | null;
          payment_instructions: string | null;
          include_payment_link_default: boolean;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          business_name?: string;
          business_type?: BusinessType;
          currency?: string;
          country?: string | null;
          timezone?: string | null;
          payment_method?: PaymentMethod | null;
          payment_link?: string | null;
          payment_instructions?: string | null;
          include_payment_link_default?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          business_name?: string;
          business_type?: BusinessType;
          currency?: string;
          country?: string | null;
          timezone?: string | null;
          payment_method?: PaymentMethod | null;
          payment_link?: string | null;
          payment_instructions?: string | null;
          include_payment_link_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
