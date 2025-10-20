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
      action_log: {
        Row: {
          action_payload: Json | null
          action_type: string
          agent_name: string
          client_cpf: string | null
          created_at: string
          id: string
          ixcticket_id: string | null
          result: Json | null
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          agent_name: string
          client_cpf?: string | null
          created_at?: string
          id?: string
          ixcticket_id?: string | null
          result?: Json | null
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          agent_name?: string
          client_cpf?: string | null
          created_at?: string
          id?: string
          ixcticket_id?: string | null
          result?: Json | null
        }
        Relationships: []
      }
      agent_configurations: {
        Row: {
          agent_type: string
          capabilities: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          max_tokens: number
          model: string
          name: string
          system_prompt: string
          temperature: number
          updated_at: string
        }
        Insert: {
          agent_type: string
          capabilities?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number
          model?: string
          name: string
          system_prompt: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          agent_type?: string
          capabilities?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_tokens?: number
          model?: string
          name?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      agent_department_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          department: Database["public"]["Enums"]["agent_department"]
          id: string
          is_universal: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          department: Database["public"]["Enums"]["agent_department"]
          id?: string
          is_universal?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          department?: Database["public"]["Enums"]["agent_department"]
          id?: string
          is_universal?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_flow_scenario_approvals: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          approved_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          scenario_key: string
          status: string
          subject_key: string | null
          updated_at: string | null
          variation_path: string
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scenario_key: string
          status: string
          subject_key?: string | null
          updated_at?: string | null
          variation_path: string
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scenario_key?: string
          status?: string
          subject_key?: string | null
          updated_at?: string | null
          variation_path?: string
        }
        Relationships: []
      }
      agent_flow_steps: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          awaits_response: boolean | null
          created_at: string | null
          id: string
          instruction: string | null
          is_active: boolean | null
          media_id: string | null
          metadata: Json | null
          next_step_map: Json | null
          question: string
          response_options: Json | null
          response_variations: Json | null
          step_key: string
          step_order: number
          subject_key: string | null
          tool_calls: Json | null
          updated_at: string | null
        }
        Insert: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          awaits_response?: boolean | null
          created_at?: string | null
          id?: string
          instruction?: string | null
          is_active?: boolean | null
          media_id?: string | null
          metadata?: Json | null
          next_step_map?: Json | null
          question: string
          response_options?: Json | null
          response_variations?: Json | null
          step_key: string
          step_order: number
          subject_key?: string | null
          tool_calls?: Json | null
          updated_at?: string | null
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          awaits_response?: boolean | null
          created_at?: string | null
          id?: string
          instruction?: string | null
          is_active?: boolean | null
          media_id?: string | null
          metadata?: Json | null
          next_step_map?: Json | null
          question?: string
          response_options?: Json | null
          response_variations?: Json | null
          step_key?: string
          step_order?: number
          subject_key?: string | null
          tool_calls?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tech_flow_steps_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_repository"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_flow_subjects: {
        Row: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          subject_key: string
          subject_name: string
          updated_at: string | null
        }
        Insert: {
          agent_type: Database["public"]["Enums"]["agent_type"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          subject_key: string
          subject_name: string
          updated_at?: string | null
        }
        Update: {
          agent_type?: Database["public"]["Enums"]["agent_type"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          subject_key?: string
          subject_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_metrics: {
        Row: {
          action_type: string
          agent_name: string
          conversation_id: string | null
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          metadata: Json | null
          success: boolean
        }
        Insert: {
          action_type: string
          agent_name: string
          conversation_id?: string | null
          created_at?: string
          duration_ms: number
          error_message?: string | null
          id?: string
          metadata?: Json | null
          success: boolean
        }
        Update: {
          action_type?: string
          agent_name?: string
          conversation_id?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          metadata?: Json | null
          success?: boolean
        }
        Relationships: []
      }
      agent_presence: {
        Row: {
          created_at: string | null
          current_conversations: number | null
          department: Database["public"]["Enums"]["agent_department"]
          feedback_enabled: boolean | null
          id: string
          last_activity: string | null
          max_conversations: number | null
          status: Database["public"]["Enums"]["agent_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_conversations?: number | null
          department: Database["public"]["Enums"]["agent_department"]
          feedback_enabled?: boolean | null
          id?: string
          last_activity?: string | null
          max_conversations?: number | null
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_conversations?: number | null
          department?: Database["public"]["Enums"]["agent_department"]
          feedback_enabled?: boolean | null
          id?: string
          last_activity?: string | null
          max_conversations?: number | null
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      alert_config: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_active: boolean
          notification_channels: Json
          threshold_value: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          notification_channels?: Json
          threshold_value: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notification_channels?: Json
          threshold_value?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      alert_history: {
        Row: {
          alert_config_id: string | null
          alert_type: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          notified_at: string | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          alert_config_id?: string | null
          alert_type: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          notified_at?: string | null
          resolved_at?: string | null
          severity: string
        }
        Update: {
          alert_config_id?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          notified_at?: string | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_config_id_fkey"
            columns: ["alert_config_id"]
            isOneToOne: false
            referencedRelation: "alert_config"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_config: {
        Row: {
          enabled: boolean | null
          id: string
          thresholds: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean | null
          id?: string
          thresholds?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean | null
          id?: string
          thresholds?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      atlas_insights: {
        Row: {
          created_at: string | null
          created_by: string | null
          groups: string[] | null
          id: string
          kpis: Json | null
          notifications: Json | null
          probable_cause: string
          recommendation: string
          severity: string
          timeframe_minutes: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          groups?: string[] | null
          id?: string
          kpis?: Json | null
          notifications?: Json | null
          probable_cause: string
          recommendation: string
          severity: string
          timeframe_minutes: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          groups?: string[] | null
          id?: string
          kpis?: Json | null
          notifications?: Json | null
          probable_cause?: string
          recommendation?: string
          severity?: string
          timeframe_minutes?: number
        }
        Relationships: []
      }
      auto_reboot_settings: {
        Row: {
          bandwidth_threshold_kbps: number
          cooldown_hours: number
          cron_interval_minutes: number
          enabled: boolean
          exclude_hours_end: number
          exclude_hours_start: number
          id: string
          updated_at: string | null
          updated_by: string | null
          verification_count: number
          verification_interval_seconds: number
        }
        Insert: {
          bandwidth_threshold_kbps?: number
          cooldown_hours?: number
          cron_interval_minutes?: number
          enabled?: boolean
          exclude_hours_end?: number
          exclude_hours_start?: number
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          verification_count?: number
          verification_interval_seconds?: number
        }
        Update: {
          bandwidth_threshold_kbps?: number
          cooldown_hours?: number
          cron_interval_minutes?: number
          enabled?: boolean
          exclude_hours_end?: number
          exclude_hours_start?: number
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          verification_count?: number
          verification_interval_seconds?: number
        }
        Relationships: []
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
      campaign_content: {
        Row: {
          campaign_id: string
          content_text: string | null
          created_at: string
          cta_config: Json | null
          cta_type: Database["public"]["Enums"]["campaign_cta_type"]
          id: string
          media_type: string | null
          media_url: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content_text?: string | null
          created_at?: string
          cta_config?: Json | null
          cta_type?: Database["public"]["Enums"]["campaign_cta_type"]
          id?: string
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content_text?: string | null
          created_at?: string
          cta_config?: Json | null
          cta_type?: Database["public"]["Enums"]["campaign_cta_type"]
          id?: string
          media_type?: string | null
          media_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_content_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          call_status: Database["public"]["Enums"]["recipient_status"] | null
          campaign_id: string
          clicked_at: string | null
          conversation_id: string | null
          created_at: string
          customer_data: Json | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          email_status: Database["public"]["Enums"]["recipient_status"] | null
          error_message: string | null
          id: string
          ixc_client_id: string | null
          opened_at: string | null
          replied_at: string | null
          response_text: string | null
          sent_at: string | null
          sms_status: Database["public"]["Enums"]["recipient_status"] | null
          updated_at: string
          whatsapp_status:
            | Database["public"]["Enums"]["recipient_status"]
            | null
        }
        Insert: {
          call_status?: Database["public"]["Enums"]["recipient_status"] | null
          campaign_id: string
          clicked_at?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_data?: Json | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          email_status?: Database["public"]["Enums"]["recipient_status"] | null
          error_message?: string | null
          id?: string
          ixc_client_id?: string | null
          opened_at?: string | null
          replied_at?: string | null
          response_text?: string | null
          sent_at?: string | null
          sms_status?: Database["public"]["Enums"]["recipient_status"] | null
          updated_at?: string
          whatsapp_status?:
            | Database["public"]["Enums"]["recipient_status"]
            | null
        }
        Update: {
          call_status?: Database["public"]["Enums"]["recipient_status"] | null
          campaign_id?: string
          clicked_at?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_data?: Json | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          email_status?: Database["public"]["Enums"]["recipient_status"] | null
          error_message?: string | null
          id?: string
          ixc_client_id?: string | null
          opened_at?: string | null
          replied_at?: string | null
          response_text?: string | null
          sent_at?: string | null
          sms_status?: Database["public"]["Enums"]["recipient_status"] | null
          updated_at?: string
          whatsapp_status?:
            | Database["public"]["Enums"]["recipient_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stats: {
        Row: {
          campaign_id: string
          click_rate: number | null
          created_at: string
          delivery_rate: number | null
          id: string
          open_rate: number | null
          reply_rate: number | null
          total_clicked: number | null
          total_delivered: number | null
          total_failed: number | null
          total_opened: number | null
          total_recipients: number | null
          total_replied: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          click_rate?: number | null
          created_at?: string
          delivery_rate?: number | null
          id?: string
          open_rate?: number | null
          reply_rate?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          click_rate?: number | null
          created_at?: string
          delivery_rate?: number | null
          id?: string
          open_rate?: number | null
          reply_rate?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_replied?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channels: Database["public"]["Enums"]["campaign_channel"][]
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_filters: Json | null
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at: string
        }
        Insert: {
          channels?: Database["public"]["Enums"]["campaign_channel"][]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_filters?: Json | null
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Update: {
          channels?: Database["public"]["Enums"]["campaign_channel"][]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_filters?: Json | null
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cash_flow_projections: {
        Row: {
          accumulated_cash_flow: number
          created_at: string | null
          id: string
          metadata: Json | null
          projected_cash_flow: number
          projected_churn_rate: number | null
          projected_costs: number
          projected_new_clients: number | null
          projected_revenue: number
          projection_date: string
          scenario: string
          updated_at: string | null
        }
        Insert: {
          accumulated_cash_flow: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          projected_cash_flow: number
          projected_churn_rate?: number | null
          projected_costs: number
          projected_new_clients?: number | null
          projected_revenue: number
          projection_date: string
          scenario: string
          updated_at?: string | null
        }
        Update: {
          accumulated_cash_flow?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          projected_cash_flow?: number
          projected_churn_rate?: number | null
          projected_costs?: number
          projected_new_clients?: number | null
          projected_revenue?: number
          projection_date?: string
          scenario?: string
          updated_at?: string | null
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
      closure_messages: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          message: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          message: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          message?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          auth_background_color: string | null
          auth_gradient_from: string | null
          auth_gradient_to: string | null
          auth_subtitle: string | null
          auth_title: string | null
          company_name: string
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          signup_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          auth_background_color?: string | null
          auth_gradient_from?: string | null
          auth_gradient_to?: string | null
          auth_subtitle?: string | null
          auth_title?: string | null
          company_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          signup_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          auth_background_color?: string | null
          auth_gradient_from?: string | null
          auth_gradient_to?: string | null
          auth_subtitle?: string | null
          auth_title?: string | null
          company_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          signup_enabled?: boolean | null
          updated_at?: string | null
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
      conversation_feedback: {
        Row: {
          conversation_id: string
          created_at: string | null
          customer_comment: string | null
          customer_rating: number
          id: string
          metadata: Json | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          customer_comment?: string | null
          customer_rating: number
          id?: string
          metadata?: Json | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          customer_comment?: string | null
          customer_rating?: number
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          ai_suggestion: boolean | null
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          sender_id: string | null
          sender_name: string
          sender_type: string
        }
        Insert: {
          ai_suggestion?: boolean | null
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_name: string
          sender_type: string
        }
        Update: {
          ai_suggestion?: boolean | null
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          sender_id?: string | null
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_transfers: {
        Row: {
          conversation_id: string
          created_at: string | null
          from_agent_id: string | null
          from_department:
            | Database["public"]["Enums"]["agent_department"]
            | null
          id: string
          notes: string | null
          reason: string | null
          to_agent_id: string | null
          to_department: Database["public"]["Enums"]["agent_department"]
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          from_agent_id?: string | null
          from_department?:
            | Database["public"]["Enums"]["agent_department"]
            | null
          id?: string
          notes?: string | null
          reason?: string | null
          to_agent_id?: string | null
          to_department: Database["public"]["Enums"]["agent_department"]
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          from_agent_id?: string | null
          from_department?:
            | Database["public"]["Enums"]["agent_department"]
            | null
          id?: string
          notes?: string | null
          reason?: string | null
          to_agent_id?: string | null
          to_department?: Database["public"]["Enums"]["agent_department"]
        }
        Relationships: [
          {
            foreignKeyName: "conversation_transfers_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_agent_id: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          created_at: string | null
          current_department:
            | Database["public"]["Enums"]["agent_department"]
            | null
          customer_cpf: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          department: Database["public"]["Enums"]["agent_department"] | null
          first_response_at: string | null
          id: string
          ixc_client_id: string | null
          last_message_at: string | null
          lgpd_consent: boolean | null
          lgpd_consent_date: string | null
          metadata: Json | null
          opt_out_date: string | null
          opt_out_requested: boolean | null
          priority: number | null
          reopen_count: number | null
          reopened_from_conversation_id: string | null
          resolved_at: string | null
          search_vector: unknown | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          created_at?: string | null
          current_department?:
            | Database["public"]["Enums"]["agent_department"]
            | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          department?: Database["public"]["Enums"]["agent_department"] | null
          first_response_at?: string | null
          id?: string
          ixc_client_id?: string | null
          last_message_at?: string | null
          lgpd_consent?: boolean | null
          lgpd_consent_date?: string | null
          metadata?: Json | null
          opt_out_date?: string | null
          opt_out_requested?: boolean | null
          priority?: number | null
          reopen_count?: number | null
          reopened_from_conversation_id?: string | null
          resolved_at?: string | null
          search_vector?: unknown | null
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          created_at?: string | null
          current_department?:
            | Database["public"]["Enums"]["agent_department"]
            | null
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          department?: Database["public"]["Enums"]["agent_department"] | null
          first_response_at?: string | null
          id?: string
          ixc_client_id?: string | null
          last_message_at?: string | null
          lgpd_consent?: boolean | null
          lgpd_consent_date?: string | null
          metadata?: Json | null
          opt_out_date?: string | null
          opt_out_requested?: boolean | null
          priority?: number | null
          reopen_count?: number | null
          reopened_from_conversation_id?: string | null
          resolved_at?: string | null
          search_vector?: unknown | null
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_reopened_from_conversation_id_fkey"
            columns: ["reopened_from_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      customer_contact_history: {
        Row: {
          contact_channel: string | null
          contact_reason: string | null
          conversation_id: string | null
          cpf: string
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          ixc_client_id: string | null
          metadata: Json | null
          updated_at: string | null
          was_found_in_ixc: boolean | null
        }
        Insert: {
          contact_channel?: string | null
          contact_reason?: string | null
          conversation_id?: string | null
          cpf: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          ixc_client_id?: string | null
          metadata?: Json | null
          updated_at?: string | null
          was_found_in_ixc?: boolean | null
        }
        Update: {
          contact_channel?: string | null
          contact_reason?: string | null
          conversation_id?: string | null
          cpf?: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          ixc_client_id?: string | null
          metadata?: Json | null
          updated_at?: string | null
          was_found_in_ixc?: boolean | null
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
      email_settings: {
        Row: {
          created_at: string
          default_from_email: string
          default_from_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_from_email?: string
          default_from_name?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_from_email?: string
          default_from_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          body_plain: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body_html: string
          body_plain?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body_html?: string
          body_plain?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      equipment_reboot_blacklist: {
        Row: {
          added_by: string | null
          client_name: string | null
          created_at: string | null
          id: string
          ixc_client_id: string
          reason: string | null
        }
        Insert: {
          added_by?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string
          ixc_client_id: string
          reason?: string | null
        }
        Update: {
          added_by?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string
          ixc_client_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      equipment_reboots: {
        Row: {
          bandwidth_after_kbps: number | null
          bandwidth_before_kbps: number | null
          client_ip: string | null
          client_login: string | null
          client_name: string | null
          created_at: string | null
          detection_timestamp: string
          error_message: string | null
          id: string
          ixc_client_id: string
          metadata: Json | null
          reboot_completed_at: string | null
          reboot_timestamp: string | null
          skip_reason: string | null
          status: string
          updated_at: string | null
          verification_count: number | null
        }
        Insert: {
          bandwidth_after_kbps?: number | null
          bandwidth_before_kbps?: number | null
          client_ip?: string | null
          client_login?: string | null
          client_name?: string | null
          created_at?: string | null
          detection_timestamp: string
          error_message?: string | null
          id?: string
          ixc_client_id: string
          metadata?: Json | null
          reboot_completed_at?: string | null
          reboot_timestamp?: string | null
          skip_reason?: string | null
          status?: string
          updated_at?: string | null
          verification_count?: number | null
        }
        Update: {
          bandwidth_after_kbps?: number | null
          bandwidth_before_kbps?: number | null
          client_ip?: string | null
          client_login?: string | null
          client_name?: string | null
          created_at?: string | null
          detection_timestamp?: string
          error_message?: string | null
          id?: string
          ixc_client_id?: string
          metadata?: Json | null
          reboot_completed_at?: string | null
          reboot_timestamp?: string | null
          skip_reason?: string | null
          status?: string
          updated_at?: string | null
          verification_count?: number | null
        }
        Relationships: []
      }
      escalation_history: {
        Row: {
          conversation_id: string
          created_at: string
          customer_notified: boolean | null
          escalation_type: string
          from_agent_id: string | null
          from_department: Database["public"]["Enums"]["agent_department"]
          id: string
          reason: string | null
          rule_id: string | null
          to_agent_id: string | null
          to_department: Database["public"]["Enums"]["agent_department"]
        }
        Insert: {
          conversation_id: string
          created_at?: string
          customer_notified?: boolean | null
          escalation_type: string
          from_agent_id?: string | null
          from_department: Database["public"]["Enums"]["agent_department"]
          id?: string
          reason?: string | null
          rule_id?: string | null
          to_agent_id?: string | null
          to_department: Database["public"]["Enums"]["agent_department"]
        }
        Update: {
          conversation_id?: string
          created_at?: string
          customer_notified?: boolean | null
          escalation_type?: string
          from_agent_id?: string | null
          from_department?: Database["public"]["Enums"]["agent_department"]
          id?: string
          reason?: string | null
          rule_id?: string | null
          to_agent_id?: string | null
          to_department?: Database["public"]["Enums"]["agent_department"]
        }
        Relationships: [
          {
            foreignKeyName: "escalation_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "escalation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          auto_escalate_after_minutes: number | null
          conditions: Json
          created_at: string
          description: string | null
          enabled: boolean
          from_department: Database["public"]["Enums"]["agent_department"]
          id: string
          priority: number
          require_keywords: string[] | null
          to_department: Database["public"]["Enums"]["agent_department"]
          updated_at: string
        }
        Insert: {
          auto_escalate_after_minutes?: number | null
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          from_department: Database["public"]["Enums"]["agent_department"]
          id?: string
          priority?: number
          require_keywords?: string[] | null
          to_department: Database["public"]["Enums"]["agent_department"]
          updated_at?: string
        }
        Update: {
          auto_escalate_after_minutes?: number | null
          conditions?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          from_department?: Database["public"]["Enums"]["agent_department"]
          id?: string
          priority?: number
          require_keywords?: string[] | null
          to_department?: Database["public"]["Enums"]["agent_department"]
          updated_at?: string
        }
        Relationships: []
      }
      escalation_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      failed_actions: {
        Row: {
          action_log_id: string | null
          action_payload: Json
          action_type: string
          agent_name: string
          client_cpf: string | null
          created_at: string
          error_message: string
          id: string
          last_retry_at: string | null
          max_retries: number
          resolved_at: string | null
          retry_count: number
          status: string
          updated_at: string
        }
        Insert: {
          action_log_id?: string | null
          action_payload: Json
          action_type: string
          agent_name: string
          client_cpf?: string | null
          created_at?: string
          error_message: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number
          resolved_at?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          action_log_id?: string | null
          action_payload?: Json
          action_type?: string
          agent_name?: string
          client_cpf?: string | null
          created_at?: string
          error_message?: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number
          resolved_at?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "failed_actions_action_log_id_fkey"
            columns: ["action_log_id"]
            isOneToOne: false
            referencedRelation: "action_log"
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
      financial_analytics: {
        Row: {
          active_contracts: number
          aging: Json
          arr: number
          average_ticket: number
          churn_rate: number
          churned_contracts: number
          computation_time_ms: number | null
          created_at: string
          created_by: string | null
          day_bucket: string
          id: string
          ixc_api_calls: number | null
          monthly_revenue: Json
          mrr: number
          overdue_amount: number
          overdue_invoices: number
          overdue_rate: number
          plan_performance: Json
          projected_arr: number
          projected_mrr: number
          raw_counts: Json
          top_debtors: Json
          total_contracts: number
        }
        Insert: {
          active_contracts: number
          aging?: Json
          arr: number
          average_ticket: number
          churn_rate: number
          churned_contracts: number
          computation_time_ms?: number | null
          created_at?: string
          created_by?: string | null
          day_bucket?: string
          id?: string
          ixc_api_calls?: number | null
          monthly_revenue?: Json
          mrr: number
          overdue_amount: number
          overdue_invoices: number
          overdue_rate: number
          plan_performance?: Json
          projected_arr: number
          projected_mrr: number
          raw_counts?: Json
          top_debtors?: Json
          total_contracts: number
        }
        Update: {
          active_contracts?: number
          aging?: Json
          arr?: number
          average_ticket?: number
          churn_rate?: number
          churned_contracts?: number
          computation_time_ms?: number | null
          created_at?: string
          created_by?: string | null
          day_bucket?: string
          id?: string
          ixc_api_calls?: number | null
          monthly_revenue?: Json
          mrr?: number
          overdue_amount?: number
          overdue_invoices?: number
          overdue_rate?: number
          plan_performance?: Json
          projected_arr?: number
          projected_mrr?: number
          raw_counts?: Json
          top_debtors?: Json
          total_contracts?: number
        }
        Relationships: []
      }
      financial_config: {
        Row: {
          courtesy_cooldown_months: number
          courtesy_max_debt: number
          courtesy_payment_deadline_hours: number
          created_at: string
          id: string
          is_active: boolean
          late_fee_daily: number
          late_fee_fixed: number
          min_days_for_negotiation: number
          min_down_payment_percentage: number
          min_installment_value: number
          negotiation_step1_installments: number
          negotiation_step1_remove_fee: boolean
          negotiation_step1_remove_interest: boolean
          negotiation_step2_installments: number
          negotiation_step2_interest_discount_percent: number
          negotiation_step2_remove_fee: boolean
          negotiation_step3_installments: number
          negotiation_step3_interest_discount_percent: number
          negotiation_step3_remove_fee: boolean
          notes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          courtesy_cooldown_months?: number
          courtesy_max_debt?: number
          courtesy_payment_deadline_hours?: number
          created_at?: string
          id?: string
          is_active?: boolean
          late_fee_daily?: number
          late_fee_fixed?: number
          min_days_for_negotiation?: number
          min_down_payment_percentage?: number
          min_installment_value?: number
          negotiation_step1_installments?: number
          negotiation_step1_remove_fee?: boolean
          negotiation_step1_remove_interest?: boolean
          negotiation_step2_installments?: number
          negotiation_step2_interest_discount_percent?: number
          negotiation_step2_remove_fee?: boolean
          negotiation_step3_installments?: number
          negotiation_step3_interest_discount_percent?: number
          negotiation_step3_remove_fee?: boolean
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          courtesy_cooldown_months?: number
          courtesy_max_debt?: number
          courtesy_payment_deadline_hours?: number
          created_at?: string
          id?: string
          is_active?: boolean
          late_fee_daily?: number
          late_fee_fixed?: number
          min_days_for_negotiation?: number
          min_down_payment_percentage?: number
          min_installment_value?: number
          negotiation_step1_installments?: number
          negotiation_step1_remove_fee?: boolean
          negotiation_step1_remove_interest?: boolean
          negotiation_step2_installments?: number
          negotiation_step2_interest_discount_percent?: number
          negotiation_step2_remove_fee?: boolean
          negotiation_step3_installments?: number
          negotiation_step3_interest_discount_percent?: number
          negotiation_step3_remove_fee?: boolean
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      flow_simulations: {
        Row: {
          agent_type: string
          conversation_path: Json
          conversation_transcript: Json
          created_at: string | null
          estimated_duration_seconds: number | null
          id: string
          issues_detected: Json | null
          metadata: Json | null
          quality_score: number | null
          responses_chosen: Json
          simulation_name: string
          suggestions: Json | null
          total_steps: number
        }
        Insert: {
          agent_type: string
          conversation_path?: Json
          conversation_transcript?: Json
          created_at?: string | null
          estimated_duration_seconds?: number | null
          id?: string
          issues_detected?: Json | null
          metadata?: Json | null
          quality_score?: number | null
          responses_chosen?: Json
          simulation_name: string
          suggestions?: Json | null
          total_steps?: number
        }
        Update: {
          agent_type?: string
          conversation_path?: Json
          conversation_transcript?: Json
          created_at?: string | null
          estimated_duration_seconds?: number | null
          id?: string
          issues_detected?: Json | null
          metadata?: Json | null
          quality_score?: number | null
          responses_chosen?: Json
          simulation_name?: string
          suggestions?: Json | null
          total_steps?: number
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
          ixc_contract_id: string | null
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
          ixc_contract_id?: string | null
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
          ixc_contract_id?: string | null
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
      ixc_cache: {
        Row: {
          created_at: string | null
          expires_at: string
          key: string
          value: Json
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          key: string
          value: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          agent_types: string[] | null
          category: string
          content: string
          content_type: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean | null
          is_folder: boolean
          metadata: Json | null
          migrated_at: string | null
          parent_id: string | null
          source: string | null
          source_document_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_types?: string[] | null
          category: string
          content: string
          content_type: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          is_folder?: boolean
          metadata?: Json | null
          migrated_at?: string | null
          parent_id?: string | null
          source?: string | null
          source_document_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_types?: string[] | null
          category?: string
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          is_folder?: boolean
          metadata?: Json | null
          migrated_at?: string | null
          parent_id?: string | null
          source?: string | null
          source_document_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_index: {
        Row: {
          agent_types: string[] | null
          category: string | null
          content: string
          content_type: string | null
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          source_id: string
          source_table: string
          summary: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          agent_types?: string[] | null
          category?: string | null
          content: string
          content_type?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id: string
          source_table?: string
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_types?: string[] | null
          category?: string | null
          content?: string
          content_type?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string
          source_table?: string
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lgpd_audit: {
        Row: {
          action_type: string
          created_at: string
          data_accessed: Json | null
          id: string
          ip_address: string | null
          legal_basis: string | null
          purpose: string
          resource_id: string | null
          resource_type: string
          retention_until: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          data_accessed?: Json | null
          id?: string
          ip_address?: string | null
          legal_basis?: string | null
          purpose: string
          resource_id?: string | null
          resource_type: string
          retention_until?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          data_accessed?: Json | null
          id?: string
          ip_address?: string | null
          legal_basis?: string | null
          purpose?: string
          resource_id?: string | null
          resource_type?: string
          retention_until?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      maintenance_cron_control: {
        Row: {
          created_at: string | null
          cron_name: string
          cron_schedule: string
          id: string
          is_active: boolean
          last_disabled_at: string | null
          last_enabled_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cron_name?: string
          cron_schedule?: string
          id?: string
          is_active?: boolean
          last_disabled_at?: string | null
          last_enabled_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cron_name?: string
          cron_schedule?: string
          id?: string
          is_active?: boolean
          last_disabled_at?: string | null
          last_enabled_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      maintenance_execution_log: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_end: string | null
          execution_start: string
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["maintenance_priority"]
          result: Json | null
          retry_attempt: number | null
          status: Database["public"]["Enums"]["task_status"]
          task_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_end?: string | null
          execution_start?: string
          id?: string
          metadata?: Json | null
          priority: Database["public"]["Enums"]["maintenance_priority"]
          result?: Json | null
          retry_attempt?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_end?: string | null
          execution_start?: string
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          result?: Json | null
          retry_attempt?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_execution_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "network_maintenance_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_settings: {
        Row: {
          alert_email: string | null
          alert_webhook: string | null
          auto_escalate_failures: boolean
          enabled: boolean
          high_priority_interval_minutes: number
          id: string
          low_priority_interval_minutes: number
          max_concurrent_tasks: number
          medium_priority_interval_minutes: number
          network_stable_threshold_minutes: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          alert_email?: string | null
          alert_webhook?: string | null
          auto_escalate_failures?: boolean
          enabled?: boolean
          high_priority_interval_minutes?: number
          id?: string
          low_priority_interval_minutes?: number
          max_concurrent_tasks?: number
          medium_priority_interval_minutes?: number
          network_stable_threshold_minutes?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          alert_email?: string | null
          alert_webhook?: string | null
          auto_escalate_failures?: boolean
          enabled?: boolean
          high_priority_interval_minutes?: number
          id?: string
          low_priority_interval_minutes?: number
          max_concurrent_tasks?: number
          medium_priority_interval_minutes?: number
          network_stable_threshold_minutes?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      mass_outage_events: {
        Row: {
          affected_count: number
          affected_logins: string[]
          created_at: string | null
          detected_at: string
          event_key: string
          id: string
          metadata: Json | null
          notifications_sent: boolean | null
          region_pattern: string
          resolved_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          affected_count: number
          affected_logins: string[]
          created_at?: string | null
          detected_at?: string
          event_key: string
          id?: string
          metadata?: Json | null
          notifications_sent?: boolean | null
          region_pattern: string
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          affected_count?: number
          affected_logins?: string[]
          created_at?: string | null
          detected_at?: string
          event_key?: string
          id?: string
          metadata?: Json | null
          notifications_sent?: boolean | null
          region_pattern?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      media_repository: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_active: boolean | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      message_shortcuts: {
        Row: {
          ai_agents: string[] | null
          created_at: string | null
          created_by: string | null
          department: Database["public"]["Enums"]["agent_department"][] | null
          display_order: number | null
          id: string
          is_active: boolean | null
          media_id: string | null
          message_text: string | null
          shortcut_key: string
          title: string
          updated_at: string | null
          usage_context: string | null
          usage_count: number | null
        }
        Insert: {
          ai_agents?: string[] | null
          created_at?: string | null
          created_by?: string | null
          department?: Database["public"]["Enums"]["agent_department"][] | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          media_id?: string | null
          message_text?: string | null
          shortcut_key: string
          title: string
          updated_at?: string | null
          usage_context?: string | null
          usage_count?: number | null
        }
        Update: {
          ai_agents?: string[] | null
          created_at?: string | null
          created_by?: string | null
          department?: Database["public"]["Enums"]["agent_department"][] | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          media_id?: string | null
          message_text?: string | null
          shortcut_key?: string
          title?: string
          updated_at?: string | null
          usage_context?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "message_shortcuts_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_repository"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          created_by: string | null
          duration_ms: number | null
          id: string
          level: string
          message: string
          source: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          id?: string
          level: string
          message: string
          source: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          id?: string
          level?: string
          message?: string
          source?: string
        }
        Relationships: []
      }
      network_maintenance_tasks: {
        Row: {
          command: string
          created_at: string | null
          description: string | null
          enabled: boolean
          execution_interval_minutes: number
          id: string
          last_execution: string | null
          metadata: Json | null
          name: string
          next_execution: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"]
          retry_count: number
          task_type: string
          timeout_seconds: number
          updated_at: string | null
        }
        Insert: {
          command: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          execution_interval_minutes?: number
          id?: string
          last_execution?: string | null
          metadata?: Json | null
          name: string
          next_execution?: string | null
          priority: Database["public"]["Enums"]["maintenance_priority"]
          retry_count?: number
          task_type: string
          timeout_seconds?: number
          updated_at?: string | null
        }
        Update: {
          command?: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          execution_interval_minutes?: number
          id?: string
          last_execution?: string | null
          metadata?: Json | null
          name?: string
          next_execution?: string | null
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          retry_count?: number
          task_type?: string
          timeout_seconds?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          created_at: string
          days_before_due: number
          description: string | null
          email_body_template: string
          email_subject_template: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          whatsapp_template: string
        }
        Insert: {
          created_at?: string
          days_before_due: number
          description?: string | null
          email_body_template: string
          email_subject_template: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          whatsapp_template: string
        }
        Update: {
          created_at?: string
          days_before_due?: number
          description?: string | null
          email_body_template?: string
          email_subject_template?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          whatsapp_template?: string
        }
        Relationships: []
      }
      nps_history: {
        Row: {
          created_at: string
          detractors_count: number
          id: string
          neutrals_count: number
          nps_score: number
          period_end: string
          period_start: string
          previous_score: number | null
          promoters_count: number
          total_responses: number
          trend: string | null
        }
        Insert: {
          created_at?: string
          detractors_count: number
          id?: string
          neutrals_count: number
          nps_score: number
          period_end: string
          period_start: string
          previous_score?: number | null
          promoters_count: number
          total_responses: number
          trend?: string | null
        }
        Update: {
          created_at?: string
          detractors_count?: number
          id?: string
          neutrals_count?: number
          nps_score?: number
          period_end?: string
          period_start?: string
          previous_score?: number | null
          promoters_count?: number
          total_responses?: number
          trend?: string | null
        }
        Relationships: []
      }
      nps_responses: {
        Row: {
          campaign_id: string
          category: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          feedback: string | null
          follow_up_completed: boolean | null
          follow_up_conversation_id: string | null
          follow_up_needed: boolean | null
          follow_up_notes: string | null
          id: string
          ixc_client_id: string | null
          recipient_id: string
          responded_at: string
          response_channel: string | null
          score: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          category: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          feedback?: string | null
          follow_up_completed?: boolean | null
          follow_up_conversation_id?: string | null
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          id?: string
          ixc_client_id?: string | null
          recipient_id: string
          responded_at?: string
          response_channel?: string | null
          score: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          category?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          feedback?: string | null
          follow_up_completed?: boolean | null
          follow_up_conversation_id?: string | null
          follow_up_needed?: boolean | null
          follow_up_notes?: string | null
          id?: string
          ixc_client_id?: string | null
          recipient_id?: string
          responded_at?: string
          response_channel?: string | null
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_follow_up_conversation_id_fkey"
            columns: ["follow_up_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_stats: {
        Row: {
          campaign_id: string
          created_at: string
          detractors_percentage: number | null
          follow_ups_completed: number | null
          follow_ups_needed: number | null
          id: string
          neutrals_percentage: number | null
          nps_score: number | null
          promoters_percentage: number | null
          total_detractors: number | null
          total_neutrals: number | null
          total_promoters: number | null
          total_responses: number | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          detractors_percentage?: number | null
          follow_ups_completed?: number | null
          follow_ups_needed?: number | null
          id?: string
          neutrals_percentage?: number | null
          nps_score?: number | null
          promoters_percentage?: number | null
          total_detractors?: number | null
          total_neutrals?: number | null
          total_promoters?: number | null
          total_responses?: number | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          detractors_percentage?: number | null
          follow_ups_completed?: number | null
          follow_ups_needed?: number | null
          id?: string
          neutrals_percentage?: number | null
          nps_score?: number | null
          promoters_percentage?: number | null
          total_detractors?: number | null
          total_neutrals?: number | null
          total_promoters?: number | null
          total_responses?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      outage_notifications: {
        Row: {
          channel: string
          created_at: string | null
          customer_login: string
          customer_name: string | null
          customer_phone: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          outage_event_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          customer_login: string
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          outage_event_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          customer_login?: string
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          outage_event_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "outage_notifications_outage_event_id_fkey"
            columns: ["outage_event_id"]
            isOneToOne: false
            referencedRelation: "mass_outage_events"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_notifications: {
        Row: {
          amount: number
          created_at: string
          customer_name: string
          customer_phone: string | null
          days_before_due: number
          due_date: string
          email_message: string | null
          email_subject: string | null
          error_message: string | null
          id: string
          ixc_client_id: string
          ixc_title_id: string
          metadata: Json | null
          notification_type: string
          sent_at: string | null
          status: string
          updated_at: string
          whatsapp_message: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          days_before_due: number
          due_date: string
          email_message?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          ixc_client_id: string
          ixc_title_id: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_message?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          days_before_due?: number
          due_date?: string
          email_message?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          ixc_client_id?: string
          ixc_title_id?: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          whatsapp_message?: string | null
        }
        Relationships: []
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
          ixc_plan_id: string | null
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
          ixc_plan_id?: string | null
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
          ixc_plan_id?: string | null
          name?: string
          original_price?: number | null
          popular?: boolean | null
          price?: number
          speed?: string
          updated_at?: string
        }
        Relationships: []
      }
      processed_webhooks: {
        Row: {
          event_type: string
          expires_at: string
          id: string
          metadata: Json | null
          processed_at: string
          request_signature: string | null
          request_timestamp: number | null
          webhook_id: string
        }
        Insert: {
          event_type: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          processed_at?: string
          request_signature?: string | null
          request_timestamp?: number | null
          webhook_id: string
        }
        Update: {
          event_type?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          processed_at?: string
          request_signature?: string | null
          request_timestamp?: number | null
          webhook_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          id: string
          job_title: string | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
          work_hours_end: string | null
          work_hours_start: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          id?: string
          job_title?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
          work_hours_end?: string | null
          work_hours_start?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          job_title?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          work_hours_end?: string | null
          work_hours_start?: string | null
        }
        Relationships: []
      }
      projection_settings: {
        Row: {
          created_at: string | null
          fixed_costs: number | null
          id: string
          optimistic_churn_reduction: number | null
          optimistic_revenue_growth: number | null
          pessimistic_churn_increase: number | null
          pessimistic_revenue_decline: number | null
          projection_months: number | null
          updated_at: string | null
          updated_by: string | null
          variable_cost_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          fixed_costs?: number | null
          id?: string
          optimistic_churn_reduction?: number | null
          optimistic_revenue_growth?: number | null
          pessimistic_churn_increase?: number | null
          pessimistic_revenue_decline?: number | null
          projection_months?: number | null
          updated_at?: string | null
          updated_by?: string | null
          variable_cost_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          fixed_costs?: number | null
          id?: string
          optimistic_churn_reduction?: number | null
          optimistic_revenue_growth?: number | null
          pessimistic_churn_increase?: number | null
          pessimistic_revenue_decline?: number | null
          projection_months?: number | null
          updated_at?: string | null
          updated_by?: string | null
          variable_cost_percentage?: number | null
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          department: Database["public"]["Enums"]["agent_department"] | null
          id: string
          is_active: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          department?: Database["public"]["Enums"]["agent_department"] | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          department?: Database["public"]["Enums"]["agent_department"] | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      rate_limit_tracking: {
        Row: {
          blocked_until: string | null
          cpf: string
          created_at: string
          id: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          cpf: string
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          window_start: string
        }
        Update: {
          blocked_until?: string | null
          cpf?: string
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          window_start?: string
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
      responsaveis_alerta: {
        Row: {
          ativo: boolean
          created_at: string
          funcao: string
          id: string
          nome: string
          telefone: string
          tipo_evento: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao: string
          id?: string
          nome: string
          telefone: string
          tipo_evento?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao?: string
          id?: string
          nome?: string
          telefone?: string
          tipo_evento?: string
          updated_at?: string
        }
        Relationships: []
      }
      routing_feedback: {
        Row: {
          actual_department: string | null
          agent_override: string | null
          ai_confidence: number | null
          ai_suggested_department: string | null
          conversation_id: string | null
          correction_timestamp: string | null
          created_at: string
          id: string
          metadata: Json | null
          override_reason: string | null
          was_correct: boolean | null
        }
        Insert: {
          actual_department?: string | null
          agent_override?: string | null
          ai_confidence?: number | null
          ai_suggested_department?: string | null
          conversation_id?: string | null
          correction_timestamp?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          override_reason?: string | null
          was_correct?: boolean | null
        }
        Update: {
          actual_department?: string | null
          agent_override?: string | null
          ai_confidence?: number | null
          ai_suggested_department?: string | null
          conversation_id?: string | null
          correction_timestamp?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          override_reason?: string | null
          was_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_logs: {
        Row: {
          correlation_id: string | null
          created_at: string | null
          created_by: string | null
          duration_ms: number | null
          event: string
          function: string
          id: string
          level: string
          message: string | null
          metadata: Json | null
          timestamp: string | null
          user_role: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          event: string
          function: string
          id?: string
          level: string
          message?: string | null
          metadata?: Json | null
          timestamp?: string | null
          user_role?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          event?: string
          function?: string
          id?: string
          level?: string
          message?: string | null
          metadata?: Json | null
          timestamp?: string | null
          user_role?: string | null
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
      system_health: {
        Row: {
          component: string
          created_at: string
          error_message: string | null
          id: string
          last_check: string
          metadata: Json | null
          status: string
        }
        Insert: {
          component: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_check?: string
          metadata?: Json | null
          status: string
        }
        Update: {
          component?: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_check?: string
          metadata?: Json | null
          status?: string
        }
        Relationships: []
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
      training_dataset: {
        Row: {
          actual_output: string | null
          agent_type: string
          conversation_id: string | null
          created_at: string
          expected_output: string
          id: string
          input_context: string
          is_validated: boolean | null
          metadata: Json | null
          quality_score: number | null
          tags: string[] | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          actual_output?: string | null
          agent_type: string
          conversation_id?: string | null
          created_at?: string
          expected_output: string
          id?: string
          input_context: string
          is_validated?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          actual_output?: string | null
          agent_type?: string
          conversation_id?: string | null
          created_at?: string
          expected_output?: string
          id?: string
          input_context?: string
          is_validated?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          tags?: string[] | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_dataset_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_documentation: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          doc_type: string
          file_path: string | null
          id: string
          is_active: boolean | null
          language: string | null
          metadata: Json | null
          parent_id: string | null
          search_vector: unknown | null
          tags: string[] | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          doc_type: string
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          metadata?: Json | null
          parent_id?: string | null
          search_vector?: unknown | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          doc_type?: string
          file_path?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          metadata?: Json | null
          parent_id?: string | null
          search_vector?: unknown | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unified_documentation_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "unified_documentation"
            referencedColumns: ["id"]
          },
        ]
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
      anonymize_old_conversations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_nps_category: {
        Args: { score: number }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          action_type_param: string
          block_minutes?: number
          max_attempts?: number
          window_minutes?: number
        }
        Returns: Json
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_webhooks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_installation_appointment: {
        Args:
          | {
              p_address_city: string
              p_address_complement: string
              p_address_neighborhood: string
              p_address_number: string
              p_address_state: string
              p_address_street: string
              p_address_zipcode: string
              p_contract_number?: string
              p_customer_birthdate: string
              p_customer_cpf: string
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_installation_date: string
              p_installation_period: string
              p_ixc_contract_id?: string
              p_plan_id: string
              p_plan_name: string
              p_plan_price: number
              p_plan_speed: string
            }
          | {
              p_appointment_date: string
              p_appointment_period: string
              p_customer_address: string
              p_customer_birth_date: string
              p_customer_cep: string
              p_customer_cpf: string
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_observations?: string
              p_payment_day: number
              p_plan_name: string
              p_plan_price: number
              p_plan_speed: string
            }
        Returns: string
      }
      disable_maintenance_cron: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enable_maintenance_cron: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_contract_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_agents_for_department: {
        Args: {
          dept: Database["public"]["Enums"]["agent_department"]
          include_universal?: boolean
        }
        Returns: {
          current_load: number
          is_universal: boolean
          max_load: number
          user_id: string
        }[]
      }
      get_contract_template_for_plan: {
        Args: { plan_name: string }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_migration_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          migrated_docs: number
          migration_progress: number
          pending_docs: number
          total_docs: number
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
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
      match_knowledge: {
        Args: {
          query_embedding: string
          similarity_threshold?: number
          top_k?: number
        }
        Returns: {
          category: string
          content: string
          content_type: string
          id: string
          metadata: Json
          similarity: number
          source_id: string
          tags: string[]
          title: string
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      access_level: "public" | "internal" | "confidential" | "secret"
      agent_department:
        | "comercial"
        | "tecnico"
        | "financeiro"
        | "administrativo"
        | "logistica"
        | "routing"
        | "cloe"
      agent_status: "online" | "busy" | "away" | "offline"
      agent_type:
        | "routing-agent"
        | "support-tech-agent"
        | "support-financial-agent"
        | "sales-agent"
        | "telemedicina-agent"
        | "automacao-agent"
        | "logistics-agent"
      campaign_channel: "whatsapp" | "sms" | "email" | "call"
      campaign_cta_type:
        | "none"
        | "reply"
        | "contact_support"
        | "contact_agent"
        | "link"
      campaign_status:
        | "draft"
        | "scheduled"
        | "running"
        | "completed"
        | "paused"
        | "cancelled"
      campaign_type:
        | "marketing"
        | "alert"
        | "commemorative"
        | "network_outage"
        | "nps"
      conversation_channel:
        | "whatsapp"
        | "facebook"
        | "instagram"
        | "chatbot"
        | "email"
      conversation_status:
        | "waiting"
        | "active"
        | "paused"
        | "resolved"
        | "transferred"
      maintenance_priority: "high" | "medium" | "low"
      recipient_status:
        | "pending"
        | "sent"
        | "delivered"
        | "failed"
        | "opened"
        | "clicked"
        | "replied"
      task_status: "pending" | "running" | "completed" | "failed" | "skipped"
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
      agent_department: [
        "comercial",
        "tecnico",
        "financeiro",
        "administrativo",
        "logistica",
        "routing",
        "cloe",
      ],
      agent_status: ["online", "busy", "away", "offline"],
      agent_type: [
        "routing-agent",
        "support-tech-agent",
        "support-financial-agent",
        "sales-agent",
        "telemedicina-agent",
        "automacao-agent",
        "logistics-agent",
      ],
      campaign_channel: ["whatsapp", "sms", "email", "call"],
      campaign_cta_type: [
        "none",
        "reply",
        "contact_support",
        "contact_agent",
        "link",
      ],
      campaign_status: [
        "draft",
        "scheduled",
        "running",
        "completed",
        "paused",
        "cancelled",
      ],
      campaign_type: [
        "marketing",
        "alert",
        "commemorative",
        "network_outage",
        "nps",
      ],
      conversation_channel: [
        "whatsapp",
        "facebook",
        "instagram",
        "chatbot",
        "email",
      ],
      conversation_status: [
        "waiting",
        "active",
        "paused",
        "resolved",
        "transferred",
      ],
      maintenance_priority: ["high", "medium", "low"],
      recipient_status: [
        "pending",
        "sent",
        "delivered",
        "failed",
        "opened",
        "clicked",
        "replied",
      ],
      task_status: ["pending", "running", "completed", "failed", "skipped"],
      user_role: ["admin", "editor", "viewer"],
    },
  },
} as const
