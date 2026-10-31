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
  | "mason"
  | "carpenter"
  | "steel_fixer"
  | "welder"
  | "draftsman_estimator"
  | "electrician"
  | "plumber"
  | "hvac_contractor"
  | "landscaper"
  | "painter"
  | "roofer"
  | "tile_installer"
  | "other";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";
export type QuoteSection = "materials" | "labour" | "extras";
export type QuoteCustomerView = "detailed" | "section_totals";
export type PaymentMethod =
  | "bank_transfer"
  | "cash"
  | "paypal"
  | "venmo"
  | "zelle"
  | "check"
  | "other";

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
          first_name: string | null;
          last_name: string | null;
          business_name: string;
          business_type: BusinessType;
          currency: string;
          country: string | null;
          timezone: string | null;
          payment_method: PaymentMethod | null;
          payment_link: string | null;
          payment_instructions: string | null;
          include_payment_link_default: boolean;
          onboarding_completed: boolean;
          created_at: string;
        };
        Insert: {
          user_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          business_name?: string;
          business_type?: BusinessType;
          currency?: string;
          country?: string | null;
          timezone?: string | null;
          payment_method?: PaymentMethod | null;
          payment_link?: string | null;
          payment_instructions?: string | null;
          include_payment_link_default?: boolean;
          onboarding_completed?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          business_name?: string;
          business_type?: BusinessType;
          currency?: string;
          country?: string | null;
          timezone?: string | null;
          payment_method?: PaymentMethod | null;
          payment_link?: string | null;
          payment_instructions?: string | null;
          include_payment_link_default?: boolean;
          onboarding_completed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          user_id: string;
          customer_id: string | null;
          quote_number: number;
          title: string;
          client_name: string;
          client_phone: string | null;
          client_email: string | null;
          client_address: string | null;
          status: QuoteStatus;
          currency: string;
          discount_amount: number;
          tax_rate: number;
          customer_view: QuoteCustomerView;
          valid_until: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          customer_id?: string | null;
          quote_number?: number;
          title: string;
          client_name: string;
          client_phone?: string | null;
          client_email?: string | null;
          client_address?: string | null;
          status?: QuoteStatus;
          currency?: string;
          discount_amount?: number;
          tax_rate?: number;
          customer_view?: QuoteCustomerView;
          valid_until?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_id?: string | null;
          quote_number?: number;
          title?: string;
          client_name?: string;
          client_phone?: string | null;
          client_email?: string | null;
          client_address?: string | null;
          status?: QuoteStatus;
          currency?: string;
          discount_amount?: number;
          tax_rate?: number;
          customer_view?: QuoteCustomerView;
          valid_until?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      quote_items: {
        Row: {
          id: string;
          user_id: string;
          quote_id: string;
          section: QuoteSection;
          stage: string | null;
          position: number;
          description: string;
          unit: string | null;
          quantity: number;
          unit_price: number;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          quote_id: string;
          section: QuoteSection;
          stage?: string | null;
          position?: number;
          description: string;
          unit?: string | null;
          quantity?: number;
          unit_price?: number;
          amount?: never;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quote_id?: string;
          section?: QuoteSection;
          stage?: string | null;
          position?: number;
          description?: string;
          unit?: string | null;
          quantity?: number;
          unit_price?: number;
          amount?: never;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      quote_totals: {
        Row: {
          quote_id: string;
          materials_total: number;
          labour_total: number;
          extras_total: number;
          subtotal: number;
          discount_amount: number;
          tax_amount: number;
          total: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
