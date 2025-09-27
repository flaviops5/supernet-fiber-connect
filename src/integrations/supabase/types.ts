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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          excerpt: string
          featured: boolean | null
          featured_image: string | null
          id: string
          published: boolean | null
          read_time: number | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          content: string
          created_at?: string
          excerpt: string
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          published?: boolean | null
          read_time?: number | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          published?: boolean | null
          read_time?: number | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cep_coverage: {
        Row: {
          available: boolean
          cep_end: string
          cep_start: string
          coordinates: unknown | null
          coverage_area_id: string | null
          created_at: string
          id: string
          region_name: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          cep_end: string
          cep_start: string
          coordinates?: unknown | null
          coverage_area_id?: string | null
          created_at?: string
          id?: string
          region_name: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          cep_end?: string
          cep_start?: string
          coordinates?: unknown | null
          coverage_area_id?: string | null
          created_at?: string
          id?: string
          region_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cep_coverage_coverage_area_id_fkey"
            columns: ["coverage_area_id"]
            isOneToOne: false
            referencedRelation: "coverage_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      cep_plans: {
        Row: {
          cep_coverage_id: string
          created_at: string
          id: string
          plan_id: string
        }
        Insert: {
          cep_coverage_id: string
          created_at?: string
          id?: string
          plan_id: string
        }
        Update: {
          cep_coverage_id?: string
          created_at?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cep_plans_cep_coverage_id_fkey"
            columns: ["cep_coverage_id"]
            isOneToOne: false
            referencedRelation: "cep_coverage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cep_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_settings: {
        Row: {
          auto_open: boolean
          auto_open_delay_seconds: number
          chatbot_id: string
          created_at: string
          cta_text: string
          enabled: boolean
          id: string
          position: string
          primary_color: string
          secondary_color: string
          session_timeout_minutes: number
          show_on_pages: Json
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          auto_open?: boolean
          auto_open_delay_seconds?: number
          chatbot_id?: string
          created_at?: string
          cta_text?: string
          enabled?: boolean
          id?: string
          position?: string
          primary_color?: string
          secondary_color?: string
          session_timeout_minutes?: number
          show_on_pages?: Json
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          auto_open?: boolean
          auto_open_delay_seconds?: number
          chatbot_id?: string
          created_at?: string
          cta_text?: string
          enabled?: boolean
          id?: string
          position?: string
          primary_color?: string
          secondary_color?: string
          session_timeout_minutes?: number
          show_on_pages?: Json
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          plan_types: Json | null
          template_content: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          plan_types?: Json | null
          template_content: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          plan_types?: Json | null
          template_content?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      coverage_areas: {
        Row: {
          active: boolean
          color: string
          coordinates: Json
          created_at: string
          id: string
          name: string
          region_code: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          coordinates: Json
          created_at?: string
          id?: string
          name: string
          region_code: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          coordinates?: Json
          created_at?: string
          id?: string
          name?: string
          region_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_permissions: {
        Row: {
          created_at: string
          document_id: string
          granted_by: string | null
          id: string
          permission_type: string
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          granted_by?: string | null
          id?: string
          permission_type: string
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          granted_by?: string | null
          id?: string
          permission_type?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          category_id: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string | null
          id: string
          is_active: boolean | null
          is_folder: boolean
          parent_folder_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"]
          category_id?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          is_folder?: boolean
          parent_folder_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
          category_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          is_folder?: boolean
          parent_folder_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          active: boolean
          answer: string
          created_at: string
          display_order: number
          icon: string
          id: string
          question: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          active?: boolean
          answer: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          question: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean
          answer?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          question?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      hero_settings: {
        Row: {
          badge_text: string
          created_at: string
          cta_text: string
          id: string
          main_title: string
          subtitle: string
          updated_at: string
          whatsapp_message: string
        }
        Insert: {
          badge_text?: string
          created_at?: string
          cta_text?: string
          id?: string
          main_title?: string
          subtitle?: string
          updated_at?: string
          whatsapp_message?: string
        }
        Update: {
          badge_text?: string
          created_at?: string
          cta_text?: string
          id?: string
          main_title?: string
          subtitle?: string
          updated_at?: string
          whatsapp_message?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          active: boolean
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          display_order?: number
          id?: string
          image_url: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      installation_appointments: {
        Row: {
          appointment_date: string
          appointment_period: string
          created_at: string
          customer_address: string
          customer_birth_date: string
          customer_cep: string
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          observations: string | null
          payment_day: number
          plan_name: string
          plan_price: number
          plan_speed: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_period: string
          created_at?: string
          customer_address: string
          customer_birth_date: string
          customer_cep: string
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          observations?: string | null
          payment_day: number
          plan_name: string
          plan_price: number
          plan_speed: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_period?: string
          created_at?: string
          customer_address?: string
          customer_birth_date?: string
          customer_cep?: string
          customer_cpf?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          observations?: string | null
          payment_day?: number
          plan_name?: string
          plan_price?: number
          plan_speed?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          source_document_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          content_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          source_document_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          source_document_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          cta_text: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          image_url: string | null
          name: string
          original_price: number | null
          popular: boolean | null
          price: number
          speed: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_text?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          image_url?: string | null
          name: string
          original_price?: number | null
          popular?: boolean | null
          price: number
          speed: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_text?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          original_price?: number | null
          popular?: boolean | null
          price?: number
          speed?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          attempts: number | null
          blocked_until: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          updated_at: string
          user_id: string | null
          window_start: string
        }
        Insert: {
          action_type: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Update: {
          action_type?: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_description: string
          event_type: string
          id: string
          ip_address: unknown | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_description: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_description?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signed_contracts: {
        Row: {
          appointment_id: string
          contract_number: string
          contract_pdf_url: string
          cpf_validated: boolean
          created_at: string
          id: string
          ip_address: unknown
          signature_data: string
          signed_at: string
          timestamp_hash: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          appointment_id: string
          contract_number: string
          contract_pdf_url: string
          cpf_validated?: boolean
          created_at?: string
          id?: string
          ip_address: unknown
          signature_data: string
          signed_at?: string
          timestamp_hash: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          appointment_id?: string
          contract_number?: string
          contract_pdf_url?: string
          cpf_validated?: boolean
          created_at?: string
          id?: string
          ip_address?: unknown
          signature_data?: string
          signed_at?: string
          timestamp_hash?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signed_contracts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "installation_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          company_address: string
          company_cnpj: string
          company_email: string
          company_name: string
          company_phone: string
          company_whatsapp: string
          created_at: string
          google_analytics_id: string | null
          google_maps_api_key: string | null
          id: string
          maintenance_mode: boolean
          max_file_size_mb: number
          meta_keywords: string
          site_description: string
          site_title: string
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          updated_at: string
        }
        Insert: {
          company_address?: string
          company_cnpj?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          company_whatsapp?: string
          created_at?: string
          google_analytics_id?: string | null
          google_maps_api_key?: string | null
          id?: string
          maintenance_mode?: boolean
          max_file_size_mb?: number
          meta_keywords?: string
          site_description?: string
          site_title?: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string
        }
        Update: {
          company_address?: string
          company_cnpj?: string
          company_email?: string
          company_name?: string
          company_phone?: string
          company_whatsapp?: string
          created_at?: string
          google_analytics_id?: string | null
          google_maps_api_key?: string | null
          id?: string
          maintenance_mode?: boolean
          max_file_size_mb?: number
          meta_keywords?: string
          site_description?: string
          site_title?: string
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_description: string
          activity_type: string
          created_at: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_description: string
          activity_type: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_description?: string
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          action_type_param: string
          block_minutes?: number
          max_attempts?: number
          window_minutes?: number
        }
        Returns: Json
      }
      generate_contract_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_contract_template_for_plan: {
        Args: { plan_name: string }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          details_param?: Json
          event_description: string
          event_type: string
          severity_param?: string
          user_id_param?: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          activity_description: string
          activity_type: string
          metadata_param?: Json
          user_id_param?: string
        }
        Returns: string
      }
    }
    Enums: {
      access_level: "public" | "internal" | "confidential" | "secret"
      user_role: "admin" | "editor" | "viewer"
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
      access_level: ["public", "internal", "confidential", "secret"],
      user_role: ["admin", "editor", "viewer"],
    },
  },
} as const
