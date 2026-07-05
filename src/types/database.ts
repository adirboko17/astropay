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
          customer_id: string | null;
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
          customer_id?: string | null;
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
          customer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_clients_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "credential_clients";
            referencedColumns: ["id"];
          },
        ];
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
          email: string | null;
          phone: string | null;
          company: string | null;
          status: string;
          total_amount_due: number;
          currency: string;
        };
        Insert: {
          id?: string;
          name: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          status?: string;
          total_amount_due?: number;
          currency?: string;
        };
        Update: {
          id?: string;
          name?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          status?: string;
          total_amount_due?: number;
          currency?: string;
        };
        Relationships: [];
      };
      customer_payments: {
        Row: {
          id: string;
          customer_id: string;
          charge_id: string | null;
          amount: number;
          currency: string;
          paid_at: string;
          method: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          charge_id?: string | null;
          amount: number;
          currency?: string;
          paid_at?: string;
          method?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          charge_id?: string | null;
          amount?: number;
          currency?: string;
          paid_at?: string;
          method?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "credential_clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_payments_charge_id_fkey";
            columns: ["charge_id"];
            isOneToOne: false;
            referencedRelation: "customer_charges";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_charges: {
        Row: {
          id: string;
          customer_id: string;
          title: string;
          amount: number;
          currency: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          title: string;
          amount?: number;
          currency?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          title?: string;
          amount?: number;
          currency?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_charges_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "credential_clients";
            referencedColumns: ["id"];
          },
        ];
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
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string;
          customer_id: string | null;
          context_label: string | null;
          assignee: string | null;
          status: string;
          due_date: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category?: string;
          customer_id?: string | null;
          context_label?: string | null;
          assignee?: string | null;
          status?: string;
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          customer_id?: string | null;
          context_label?: string | null;
          assignee?: string | null;
          status?: string;
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "credential_clients";
            referencedColumns: ["id"];
          },
        ];
      };
      task_subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          assignee: string | null;
          status: string;
          sort_order: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          assignee?: string | null;
          status?: string;
          sort_order?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          assignee?: string | null;
          status?: string;
          sort_order?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
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
export type CustomerPayment = Database["public"]["Tables"]["customer_payments"]["Row"];
export type CustomerCharge = Database["public"]["Tables"]["customer_charges"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskSubtask = Database["public"]["Tables"]["task_subtasks"]["Row"];

/**
 * `credential_clients` is the customer entity: the central hub that credentials,
 * billing/collections, and (optionally) a PayPlus recurring subscription all link to.
 */
export type Customer = CredentialClient;
