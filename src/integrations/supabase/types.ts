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
      agent_configurations: {
        Row: {
          active: boolean | null
          agent_type: string
          capabilities: string[] | null
          created_at: string
          description: string | null
          id: string
          max_tokens: number | null
          model: string | null
          name: string
          system_prompt: string | null
          temperature: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          agent_type: string
          capabilities?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          name: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          agent_type?: string
          capabilities?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          name?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_department_assignments: {
        Row: {
          active: boolean | null
          created_at: string
          department: string
          id: string
          is_primary: boolean | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          department: string
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          department?: string
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      agent_flow_scenario_approvals: {
        Row: {
          agent_type: string
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          scenario_key: string | null
          status: string | null
          subject_key: string | null
          updated_at: string
          variation_path: string | null
        }
        Insert: {
          agent_type: string
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scenario_key?: string | null
          status?: string | null
          subject_key?: string | null
          updated_at?: string
          variation_path?: string | null
        }
        Update: {
          agent_type?: string
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scenario_key?: string | null
          status?: string | null
          subject_key?: string | null
          updated_at?: string
          variation_path?: string | null
        }
        Relationships: []
      }
      agent_flow_states: {
        Row: {
          agent_type: string
          conversation_id: string | null
          created_at: string
          current_step_id: string | null
          id: string
          state_data: Json | null
          status: string | null
          updated_at: string
        }
        Insert: {
          agent_type: string
          conversation_id?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          state_data?: Json | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          agent_type?: string
          conversation_id?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          state_data?: Json | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_flow_steps: {
        Row: {
          active: boolean | null
          agent_type: string
          created_at: string
          id: string
          instruction: string | null
          next_step_map: Json | null
          question: string | null
          response_options: Json | null
          step_media: Json | null
          step_order: number | null
          step_tools: string[] | null
          step_type: string | null
          subject_key: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          agent_type: string
          created_at?: string
          id?: string
          instruction?: string | null
          next_step_map?: Json | null
          question?: string | null
          response_options?: Json | null
          step_media?: Json | null
          step_order?: number | null
          step_tools?: string[] | null
          step_type?: string | null
          subject_key?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          agent_type?: string
          created_at?: string
          id?: string
          instruction?: string | null
          next_step_map?: Json | null
          question?: string | null
          response_options?: Json | null
          step_media?: Json | null
          step_order?: number | null
          step_tools?: string[] | null
          step_type?: string | null
          subject_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_flow_subjects: {
        Row: {
          active: boolean | null
          agent_type: string
          created_at: string
          default_media: Json | null
          default_tools: string[] | null
          description: string | null
          id: string
          subject_key: string
          subject_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          agent_type: string
          created_at?: string
          default_media?: Json | null
          default_tools?: string[] | null
          description?: string | null
          id?: string
          subject_key: string
          subject_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          agent_type?: string
          created_at?: string
          default_media?: Json | null
          default_tools?: string[] | null
          description?: string | null
          id?: string
          subject_key?: string
          subject_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_presence: {
        Row: {
          agent_name: string | null
          agent_type: string
          created_at: string
          id: string
          last_seen: string | null
          metadata: Json | null
          status: string | null
        }
        Insert: {
          agent_name?: string | null
          agent_type: string
          created_at?: string
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          status?: string | null
        }
        Update: {
          agent_name?: string | null
          agent_type?: string
          created_at?: string
          id?: string
          last_seen?: string | null
          metadata?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          agent_type: string | null
          created_at: string
          id: string
          metadata: Json | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_type?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_type?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
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
      atlas_insights: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          id: string
          insight_type: string
          severity: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          insight_type: string
          severity?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          insight_type?: string
          severity?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      auto_reboot_settings: {
        Row: {
          blacklist_duration_hours: number | null
          cooldown_minutes: number | null
          created_at: string
          enabled: boolean | null
          id: string
          max_attempts: number | null
          updated_at: string
        }
        Insert: {
          blacklist_duration_hours?: number | null
          cooldown_minutes?: number | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          max_attempts?: number | null
          updated_at?: string
        }
        Update: {
          blacklist_duration_hours?: number | null
          cooldown_minutes?: number | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          max_attempts?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean | null
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
          author: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured: boolean | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean | null
          read_time: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          read_time?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured?: boolean | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          read_time?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_access_tokens: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          provider: string | null
          refresh_token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_content: {
        Row: {
          body: string
          campaign_id: string | null
          channel: string
          created_at: string
          id: string
          subject: string | null
          template_id: string | null
        }
        Insert: {
          body: string
          campaign_id?: string | null
          channel: string
          created_at?: string
          id?: string
          subject?: string | null
          template_id?: string | null
        }
        Update: {
          body?: string
          campaign_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          subject?: string | null
          template_id?: string | null
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
      campaign_stats: {
        Row: {
          campaign_id: string | null
          created_at: string
          delivery_rate: number | null
          id: string
          reply_rate: number | null
          total_recipients: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          delivery_rate?: number | null
          id?: string
          reply_rate?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          delivery_rate?: number | null
          id?: string
          reply_rate?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channels: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          target_filters: Json | null
          type: string | null
          updated_at: string
        }
        Insert: {
          channels?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          target_filters?: Json | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          channels?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          target_filters?: Json | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_flow_projections: {
        Row: {
          actual_costs: number | null
          actual_profit: number | null
          actual_revenue: number | null
          created_at: string
          id: string
          notes: string | null
          projected_costs: number | null
          projected_profit: number | null
          projected_revenue: number | null
          projection_date: string
          scenario: string | null
          updated_at: string
        }
        Insert: {
          actual_costs?: number | null
          actual_profit?: number | null
          actual_revenue?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          projected_costs?: number | null
          projected_profit?: number | null
          projected_revenue?: number | null
          projection_date: string
          scenario?: string | null
          updated_at?: string
        }
        Update: {
          actual_costs?: number | null
          actual_profit?: number | null
          actual_revenue?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          projected_costs?: number | null
          projected_profit?: number | null
          projected_revenue?: number | null
          projection_date?: string
          scenario?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cep_coverage: {
        Row: {
          available: boolean | null
          cep: string
          city: string | null
          created_at: string
          id: string
          neighborhood: string | null
          notes: string | null
          region: string | null
          state: string | null
        }
        Insert: {
          available?: boolean | null
          cep: string
          city?: string | null
          created_at?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          region?: string | null
          state?: string | null
        }
        Update: {
          available?: boolean | null
          cep?: string
          city?: string | null
          created_at?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          region?: string | null
          state?: string | null
        }
        Relationships: []
      }
      cep_plans: {
        Row: {
          available: boolean | null
          cep_coverage_id: string | null
          created_at: string
          id: string
          plan_id: string | null
        }
        Insert: {
          available?: boolean | null
          cep_coverage_id?: string | null
          created_at?: string
          id?: string
          plan_id?: string | null
        }
        Update: {
          available?: boolean | null
          cep_coverage_id?: string | null
          created_at?: string
          id?: string
          plan_id?: string | null
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
      closure_messages: {
        Row: {
          active: boolean | null
          condition_type: string | null
          created_at: string
          department: string
          id: string
          message: string
        }
        Insert: {
          active?: boolean | null
          condition_type?: string | null
          created_at?: string
          department: string
          id?: string
          message: string
        }
        Update: {
          active?: boolean | null
          condition_type?: string | null
          created_at?: string
          department?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          active: boolean | null
          content: string
          created_at: string
          id: string
          name: string
          plan_type: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          active?: boolean | null
          content: string
          created_at?: string
          id?: string
          name: string
          plan_type?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          active?: boolean | null
          content?: string
          created_at?: string
          id?: string
          name?: string
          plan_type?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          role: string
          sender_name: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          sender_name?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          sender_name?: string | null
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
      conversations: {
        Row: {
          assigned_agent: string | null
          channel: string | null
          created_at: string
          customer_cpf: string | null
          customer_name: string | null
          customer_phone: string | null
          department: string | null
          id: string
          metadata: Json | null
          protocol: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_agent?: string | null
          channel?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          department?: string | null
          id?: string
          metadata?: Json | null
          protocol?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_agent?: string | null
          channel?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          department?: string | null
          id?: string
          metadata?: Json | null
          protocol?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coverage_areas: {
        Row: {
          active: boolean | null
          coordinates: Json | null
          created_at: string
          description: string | null
          id: string
          name: string
          polygon: Json | null
        }
        Insert: {
          active?: boolean | null
          coordinates?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          polygon?: Json | null
        }
        Update: {
          active?: boolean | null
          coordinates?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          polygon?: Json | null
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          author: string | null
          category_id: string | null
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          status: string | null
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          author?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          author?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          active: boolean | null
          created_at: string
          from_email: string | null
          from_name: string | null
          id: string
          provider: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          provider?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          provider?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          active: boolean | null
          body: string
          category: string | null
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          active?: boolean | null
          body: string
          category?: string | null
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          active?: boolean | null
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      equipment_reboot_blacklist: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          pppoe_login: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          pppoe_login: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          pppoe_login?: string
          reason?: string | null
        }
        Relationships: []
      }
      equipment_reboots: {
        Row: {
          conversation_id: string | null
          created_at: string
          customer_cpf: string | null
          id: string
          initiated_by: string | null
          pppoe_login: string | null
          result: string | null
          status: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          id?: string
          initiated_by?: string | null
          pppoe_login?: string | null
          result?: string | null
          status?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          id?: string
          initiated_by?: string | null
          pppoe_login?: string | null
          result?: string | null
          status?: string | null
        }
        Relationships: []
      }
      escalation_rules: {
        Row: {
          action_type: string
          action_value: Json | null
          active: boolean | null
          condition_type: string
          condition_value: Json | null
          created_at: string
          id: string
          name: string
          priority: number | null
        }
        Insert: {
          action_type: string
          action_value?: Json | null
          active?: boolean | null
          condition_type: string
          condition_value?: Json | null
          created_at?: string
          id?: string
          name: string
          priority?: number | null
        }
        Update: {
          action_type?: string
          action_value?: Json | null
          active?: boolean | null
          condition_type?: string
          condition_value?: Json | null
          created_at?: string
          id?: string
          name?: string
          priority?: number | null
        }
        Relationships: []
      }
      escalation_settings: {
        Row: {
          auto_escalate: boolean | null
          created_at: string
          department: string
          escalate_to: string | null
          id: string
          max_wait_minutes: number | null
          updated_at: string
        }
        Insert: {
          auto_escalate?: boolean | null
          created_at?: string
          department: string
          escalate_to?: string | null
          id?: string
          max_wait_minutes?: number | null
          updated_at?: string
        }
        Update: {
          auto_escalate?: boolean | null
          created_at?: string
          department?: string
          escalate_to?: string | null
          id?: string
          max_wait_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          active: boolean | null
          answer: string
          category: string | null
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          answer: string
          category?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          answer?: string
          category?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      flow_simulations: {
        Row: {
          agent_type: string
          conversation_transcript: Json | null
          created_at: string
          id: string
          issues: string[] | null
          path_description: string | null
          quality_score: number | null
          suggestions: string[] | null
        }
        Insert: {
          agent_type: string
          conversation_transcript?: Json | null
          created_at?: string
          id?: string
          issues?: string[] | null
          path_description?: string | null
          quality_score?: number | null
          suggestions?: string[] | null
        }
        Update: {
          agent_type?: string
          conversation_transcript?: Json | null
          created_at?: string
          id?: string
          issues?: string[] | null
          path_description?: string | null
          quality_score?: number | null
          suggestions?: string[] | null
        }
        Relationships: []
      }
      hero_settings: {
        Row: {
          active: boolean | null
          background_image: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          id: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          background_image?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          background_image?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          active: boolean | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          display_order: number | null
          id: string
          image_url: string | null
          subtitle: string | null
          title: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      install_photos: {
        Row: {
          appointment_id: string | null
          created_at: string
          description: string | null
          id: string
          photo_type: string | null
          photo_url: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photo_type?: string | null
          photo_url: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photo_type?: string | null
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "install_photos_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "installation_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_appointments: {
        Row: {
          address: string | null
          cep: string | null
          created_at: string
          customer_cpf: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          plan_id: string | null
          scheduled_date: string | null
          scheduled_period: string | null
          status: string | null
          technician: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cep?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          scheduled_date?: string | null
          scheduled_period?: string | null
          status?: string | null
          technician?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cep?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          scheduled_date?: string | null
          scheduled_period?: string | null
          status?: string | null
          technician?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_appointments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_events: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "installation_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_board_members: {
        Row: {
          board_id: string | null
          created_at: string
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          board_id?: string | null
          created_at?: string
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_boards: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kanban_columns: {
        Row: {
          board_id: string | null
          color: string | null
          created_at: string
          display_order: number | null
          id: string
          name: string
        }
        Insert: {
          board_id?: string | null
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
        }
        Update: {
          board_id?: string | null
          color?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          active: boolean | null
          agent_types: string[] | null
          category: string | null
          content: string
          created_at: string
          id: string
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          agent_types?: string[] | null
          category?: string | null
          content: string
          created_at?: string
          id?: string
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          agent_types?: string[] | null
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_regions_last_24h: {
        Row: {
          avg_resolution_minutes: number | null
          created_at: string
          id: string
          region: string
          resolved_tickets: number | null
          satisfaction_score: number | null
          total_tickets: number | null
        }
        Insert: {
          avg_resolution_minutes?: number | null
          created_at?: string
          id?: string
          region: string
          resolved_tickets?: number | null
          satisfaction_score?: number | null
          total_tickets?: number | null
        }
        Update: {
          avg_resolution_minutes?: number | null
          created_at?: string
          id?: string
          region?: string
          resolved_tickets?: number | null
          satisfaction_score?: number | null
          total_tickets?: number | null
        }
        Relationships: []
      }
      maintenance_cron_control: {
        Row: {
          config: Json | null
          created_at: string
          cron_name: string
          id: string
          last_run: string | null
          next_run: string | null
          status: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          cron_name: string
          id?: string
          last_run?: string | null
          next_run?: string | null
          status?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          cron_name?: string
          id?: string
          last_run?: string | null
          next_run?: string | null
          status?: string | null
        }
        Relationships: []
      }
      maintenance_execution_log: {
        Row: {
          completed_at: string | null
          created_at: string
          cron_name: string | null
          id: string
          result: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          cron_name?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          cron_name?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      maintenance_settings: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      mass_outage_events: {
        Row: {
          affected_count: number | null
          created_at: string
          description: string | null
          estimated_resolution: string | null
          id: string
          protocol: string | null
          region: string
          resolved_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          affected_count?: number | null
          created_at?: string
          description?: string | null
          estimated_resolution?: string | null
          id?: string
          protocol?: string | null
          region: string
          resolved_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          affected_count?: number | null
          created_at?: string
          description?: string | null
          estimated_resolution?: string | null
          id?: string
          protocol?: string | null
          region?: string
          resolved_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      media_repository: {
        Row: {
          active: boolean | null
          context: string | null
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          name: string
          tags: string[] | null
        }
        Insert: {
          active?: boolean | null
          context?: string | null
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          tags?: string[] | null
        }
        Update: {
          active?: boolean | null
          context?: string | null
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          tags?: string[] | null
        }
        Relationships: []
      }
      media_usage_logs: {
        Row: {
          agent_type: string | null
          context: string | null
          conversation_id: string | null
          created_at: string
          id: string
          media_id: string | null
        }
        Insert: {
          agent_type?: string | null
          context?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          media_id?: string | null
        }
        Update: {
          agent_type?: string | null
          context?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          media_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_usage_logs_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_repository"
            referencedColumns: ["id"]
          },
        ]
      }
      message_shortcuts: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string
          department: string | null
          id: string
          message: string
          shortcut: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          department?: string | null
          id?: string
          message: string
          shortcut: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          department?: string | null
          id?: string
          message?: string
          shortcut?: string
        }
        Relationships: []
      }
      monitoring_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
          severity: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          severity?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          severity?: string | null
          source?: string | null
        }
        Relationships: []
      }
      network_maintenance_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          impact_level: string | null
          region: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          impact_level?: string | null
          region?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          impact_level?: string | null
          region?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_targets: {
        Row: {
          created_at: string
          id: string
          sent_at: string | null
          status: string | null
          target_filters: Json | null
          target_type: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string | null
          target_filters?: Json | null
          target_type?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string | null
          target_filters?: Json | null
          target_type?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_targets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          active: boolean | null
          channel: string | null
          created_at: string
          id: string
          name: string
          template: string
          variables: string[] | null
        }
        Insert: {
          active?: boolean | null
          channel?: string | null
          created_at?: string
          id?: string
          name: string
          template: string
          variables?: string[] | null
        }
        Update: {
          active?: boolean | null
          channel?: string | null
          created_at?: string
          id?: string
          name?: string
          template?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      nps_responses: {
        Row: {
          agent_name: string | null
          comment: string | null
          conversation_id: string | null
          created_at: string
          customer_cpf: string | null
          customer_name: string | null
          department: string | null
          id: string
          score: number
        }
        Insert: {
          agent_name?: string | null
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          department?: string | null
          id?: string
          score: number
        }
        Update: {
          agent_name?: string | null
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          department?: string | null
          id?: string
          score?: number
        }
        Relationships: []
      }
      nps_stats: {
        Row: {
          avg_score: number | null
          created_at: string
          detractors: number | null
          id: string
          nps_score: number | null
          passives: number | null
          period: string
          period_date: string
          promoters: number | null
          total_responses: number | null
        }
        Insert: {
          avg_score?: number | null
          created_at?: string
          detractors?: number | null
          id?: string
          nps_score?: number | null
          passives?: number | null
          period: string
          period_date: string
          promoters?: number | null
          total_responses?: number | null
        }
        Update: {
          avg_score?: number | null
          created_at?: string
          detractors?: number | null
          id?: string
          nps_score?: number | null
          passives?: number | null
          period?: string
          period_date?: string
          promoters?: number | null
          total_responses?: number | null
        }
        Relationships: []
      }
      payment_notifications: {
        Row: {
          amount: number | null
          channel: string | null
          created_at: string
          customer_cpf: string | null
          customer_name: string | null
          due_date: string | null
          id: string
          notification_type: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          channel?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          notification_type?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          channel?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          notification_type?: string | null
          sent_at?: string | null
          status?: string | null
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
          speed: string | null
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
          speed?: string | null
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
          speed?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projection_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      registros_de_monitoramento: {
        Row: {
          created_at: string
          dados: Json | null
          descricao: string | null
          id: string
          severidade: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          dados?: Json | null
          descricao?: string | null
          id?: string
          severidade?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          dados?: Json | null
          descricao?: string | null
          id?: string
          severidade?: string | null
          tipo?: string
        }
        Relationships: []
      }
      signed_contracts: {
        Row: {
          created_at: string
          customer_cpf: string
          customer_email: string | null
          customer_name: string
          id: string
          metadata: Json | null
          plan_id: string | null
          signature_data: string | null
          signed_at: string | null
          status: string | null
          template_id: string | null
        }
        Insert: {
          created_at?: string
          customer_cpf: string
          customer_email?: string | null
          customer_name: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Update: {
          created_at?: string
          customer_cpf?: string
          customer_email?: string | null
          customer_name?: string
          id?: string
          metadata?: Json | null
          plan_id?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signed_contracts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      support_critical_clusters: {
        Row: {
          affected_count: number | null
          cluster_type: string
          created_at: string
          id: string
          metadata: Json | null
          region: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          affected_count?: number | null
          cluster_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          region?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          affected_count?: number | null
          cluster_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          region?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: []
      }
      support_loops: {
        Row: {
          conversation_id: string | null
          created_at: string
          customer_cpf: string | null
          id: string
          issue_type: string | null
          loop_count: number | null
          status: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          id?: string
          issue_type?: string | null
          loop_count?: number | null
          status?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          id?: string
          issue_type?: string | null
          loop_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      support_power_loss_clusters: {
        Row: {
          affected_count: number | null
          created_at: string
          detected_at: string | null
          id: string
          region: string | null
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          affected_count?: number | null
          created_at?: string
          detected_at?: string | null
          id?: string
          region?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          affected_count?: number | null
          created_at?: string
          detected_at?: string | null
          id?: string
          region?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          message: string | null
          severity: string | null
          status: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string | null
          severity?: string | null
          status?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string | null
          severity?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      unified_documentation: {
        Row: {
          author: string | null
          category: string | null
          content: string
          created_at: string
          id: string
          status: string | null
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content: string
          created_at?: string
          id?: string
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          status?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "viewer"
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
      app_role: ["admin", "moderator", "user", "viewer"],
    },
  },
} as const
