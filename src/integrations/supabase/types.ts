export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      order_live_locations: {
        Row: {
          heading_deg: number | null
          lat: number
          lng: number
          order_code: string
          order_id: string
          rider_id: string
          speed_mps: number | null
          updated_at: string
        }
        Insert: {
          heading_deg?: number | null
          lat: number
          lng: number
          order_code: string
          order_id: string
          rider_id: string
          speed_mps?: number | null
          updated_at?: string
        }
        Update: {
          heading_deg?: number | null
          lat?: number
          lng?: number
          order_code?: string
          order_id?: string
          rider_id?: string
          speed_mps?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_live_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_public_status: {
        Row: {
          estimated_delivery_at: string | null
          order_code: string
          order_id: string
          rider_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          estimated_delivery_at?: string | null
          order_code: string
          order_id: string
          rider_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          estimated_delivery_at?: string | null
          order_code?: string
          order_id?: string
          rider_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_public_status_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_type: string
          drop_location: string
          estimated_delivery_at: string | null
          id: string
          item_type: string
          notes: string | null
          order_code: string
          pickup_location: string
          pod_photo_path: string | null
          rider_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_type: string
          drop_location: string
          estimated_delivery_at?: string | null
          id?: string
          item_type: string
          notes?: string | null
          order_code: string
          pickup_location: string
          pod_photo_path?: string | null
          rider_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_type?: string
          drop_location?: string
          estimated_delivery_at?: string | null
          id?: string
          item_type?: string
          notes?: string | null
          order_code?: string
          pickup_location?: string
          pod_photo_path?: string | null
          rider_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          attempted_at: string
          id: string
          identifier: string
          metadata: Json | null
          succeeded: boolean
        }
        Insert: {
          action: string
          attempted_at?: string
          id?: string
          identifier: string
          metadata?: Json | null
          succeeded?: boolean
        }
        Update: {
          action?: string
          attempted_at?: string
          id?: string
          identifier?: string
          metadata?: Json | null
          succeeded?: boolean
        }
        Relationships: []
      }
      rider_locations: {
        Row: {
          accuracy_m: number | null
          heading_deg: number | null
          lat: number
          lng: number
          rider_id: string
          speed_mps: number | null
          updated_at: string
        }
        Insert: {
          accuracy_m?: number | null
          heading_deg?: number | null
          lat: number
          lng: number
          rider_id: string
          speed_mps?: number | null
          updated_at?: string
        }
        Update: {
          accuracy_m?: number | null
          heading_deg?: number | null
          lat?: number
          lng?: number
          rider_id?: string
          speed_mps?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_locations_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: true
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          city: string
          created_at: string
          email: string | null
          id: string
          id_doc_path: string | null
          license_doc_path: string | null
          name: string
          phone: string
          profile_photo_path: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string | null
          vehicle_doc_path: string | null
          vehicle_type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          city: string
          created_at?: string
          email?: string | null
          id?: string
          id_doc_path?: string | null
          license_doc_path?: string | null
          name: string
          phone: string
          profile_photo_path?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_doc_path?: string | null
          vehicle_type: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string
          created_at?: string
          email?: string | null
          id?: string
          id_doc_path?: string | null
          license_doc_path?: string | null
          name?: string
          phone?: string
          profile_photo_path?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_doc_path?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_rider: { Args: { p_rider_id: string }; Returns: undefined }
      admin_reject_rider: {
        Args: { p_reason: string; p_rider_id: string }
        Returns: undefined
      }
      bootstrap_first_admin: { Args: { p_email: string }; Returns: string }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_attempts?: number
          p_window_seconds?: number
        }
        Returns: Json
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      create_guest_order:
        | {
            Args: {
              p_customer_name: string
              p_customer_phone: string
              p_delivery_type: string
              p_drop_location: string
              p_item_type: string
              p_notes?: string
              p_pickup_location: string
            }
            Returns: {
              id: string
              order_code: string
            }[]
          }
        | {
            Args: {
              p_client_id?: string
              p_customer_name: string
              p_customer_phone: string
              p_delivery_type: string
              p_drop_location: string
              p_item_type: string
              p_notes?: string
              p_pickup_location: string
            }
            Returns: {
              id: string
              order_code: string
            }[]
          }
      generate_order_code: { Args: never; Returns: string }
      generate_secure_order_code: { Args: never; Returns: string }
      get_order_by_code:
        | {
            Args: { p_code: string }
            Returns: {
              created_at: string
              delivery_type: string
              drop_location: string
              estimated_delivery_at: string
              id: string
              item_type: string
              order_code: string
              pickup_location: string
              rider_id: string
              rider_name: string
              rider_vehicle: string
              status: string
            }[]
          }
        | {
            Args: { p_client_id?: string; p_code: string }
            Returns: {
              created_at: string
              delivery_type: string
              drop_location: string
              estimated_delivery_at: string
              id: string
              item_type: string
              order_code: string
              pickup_location: string
              rider_id: string
              rider_name: string
              rider_vehicle: string
              status: string
            }[]
          }
      get_order_live_location: {
        Args: { p_client_id?: string; p_code: string }
        Returns: {
          heading_deg: number
          lat: number
          lng: number
          order_code: string
          speed_mps: number
          updated_at: string
        }[]
      }
      get_order_pod_path: { Args: { p_code: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_valid_order_transition: {
        Args: { _from: string; _to: string }
        Returns: boolean
      }
      record_rate_attempt: {
        Args: {
          p_action: string
          p_identifier: string
          p_metadata?: Json
          p_succeeded: boolean
        }
        Returns: undefined
      }
      upsert_rider_location: {
        Args: {
          p_accuracy_m?: number
          p_heading_deg?: number
          p_lat: number
          p_lng: number
          p_speed_mps?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "rider" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "rider", "user"],
    },
  },
} as const
