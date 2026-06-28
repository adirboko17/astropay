export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      recurring_clients: {
        Row: {
          id: string;
          payplus_customer_uid: string | null;
          payplus_recurring_uid: string | null;
          customer_name: string;
          customer_email: string | null;
          customer_phone: string | null;
          website_url: string | null;
          monthly_amount: number;
          currency: string;
          billing_day: number | null;
          next_billing_date: string | null;
          recurring_status: string | null;
          current_month_status: string;
          last_successful_charge_at: string | null;
          last_failed_charge_at: string | null;
          last_failure_reason: string | null;
          source: string;
          raw_payplus_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payplus_customer_uid?: string | null;
          payplus_recurring_uid?: string | null;
          customer_name: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          website_url?: string | null;
          monthly_amount: number;
          currency?: string;
          billing_day?: number | null;
          next_billing_date?: string | null;
          recurring_status?: string | null;
          current_month_status?: string;
          last_successful_charge_at?: string | null;
          last_failed_charge_at?: string | null;
          last_failure_reason?: string | null;
          source?: string;
          raw_payplus_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          payplus_customer_uid?: string | null;
          payplus_recurring_uid?: string | null;
          customer_name?: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          website_url?: string | null;
          monthly_amount?: number;
          currency?: string;
          billing_day?: number | null;
          next_billing_date?: string | null;
          recurring_status?: string | null;
          current_month_status?: string;
          last_successful_charge_at?: string | null;
          last_failed_charge_at?: string | null;
          last_failure_reason?: string | null;
          source?: string;
          raw_payplus_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recurring_charge_checks: {
        Row: {
          id: string;
          recurring_client_id: string;
          payplus_transaction_uid: string | null;
          payplus_recurring_uid: string | null;
          check_month: string;
          amount: number;
          currency: string;
          status: string;
          failure_reason: string | null;
          charged_at: string | null;
          raw_payplus_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          recurring_client_id: string;
          payplus_transaction_uid?: string | null;
          payplus_recurring_uid?: string | null;
          check_month: string;
          amount: number;
          currency?: string;
          status: string;
          failure_reason?: string | null;
          charged_at?: string | null;
          raw_payplus_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          recurring_client_id?: string;
          payplus_transaction_uid?: string | null;
          payplus_recurring_uid?: string | null;
          check_month?: string;
          amount?: number;
          currency?: string;
          status?: string;
          failure_reason?: string | null;
          charged_at?: string | null;
          raw_payplus_data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_charge_checks_recurring_client_id_fkey";
            columns: ["recurring_client_id"];
            isOneToOne: false;
            referencedRelation: "recurring_clients";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_alerts: {
        Row: {
          id: string;
          recurring_client_id: string;
          alert_type: string;
          title: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recurring_client_id: string;
          alert_type: string;
          title: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recurring_client_id?: string;
          alert_type?: string;
          title?: string;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_alerts_recurring_client_id_fkey";
            columns: ["recurring_client_id"];
            isOneToOne: false;
            referencedRelation: "recurring_clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_credentials: {
        Row: {
          id: string;
          client_id: string | null;
          table_id: string | null;
          client_name: string;
          platform: string;
          service_label: string | null;
          login_email: string | null;
          login_username: string | null;
          password: string | null;
          dashboard_url: string | null;
          website_url: string | null;
          notes: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          table_id?: string | null;
          client_name: string;
          platform: string;
          service_label?: string | null;
          login_email?: string | null;
          login_username?: string | null;
          password?: string | null;
          dashboard_url?: string | null;
          website_url?: string | null;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          table_id?: string | null;
          client_name?: string;
          platform?: string;
          service_label?: string | null;
          login_email?: string | null;
          login_username?: string | null;
          password?: string | null;
          dashboard_url?: string | null;
          website_url?: string | null;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_credentials_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "credential_clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_credentials_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "credential_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      credential_clients: {
        Row: {
          id: string;
          name: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credential_tables: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
          last_viewed_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          last_viewed_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          last_viewed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type RecurringClient = Database["public"]["Tables"]["recurring_clients"]["Row"];
export type CredentialClient = Database["public"]["Tables"]["credential_clients"]["Row"];
export type ClientCredential = Database["public"]["Tables"]["client_credentials"]["Row"];
export type CredentialTable = Database["public"]["Tables"]["credential_tables"]["Row"];
