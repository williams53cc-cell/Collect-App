export type CustomerStatus = "active" | "overdue" | "paid" | "closed";
export type FollowUpStatus = "pending" | "needs_call" | "done" | "skipped";

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
