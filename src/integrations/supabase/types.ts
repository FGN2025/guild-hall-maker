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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          zip_code: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          zip_code: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          zip_code?: string
        }
        Relationships: []
      }
      achievement_definitions: {
        Row: {
          auto_criteria: Json | null
          category: string
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          max_progress: number | null
          name: string
          tier: string
          updated_at: string
        }
        Insert: {
          auto_criteria?: Json | null
          category?: string
          created_at?: string
          description: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          max_progress?: number | null
          name: string
          tier?: string
          updated_at?: string
        }
        Update: {
          auto_criteria?: Json | null
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          max_progress?: number | null
          name?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_notebook_connections: {
        Row: {
          api_url: string
          created_at: string
          game_id: string | null
          id: string
          is_active: boolean
          last_health_check: string | null
          last_health_status: string | null
          name: string
          notebook_id: string
          updated_at: string
        }
        Insert: {
          api_url: string
          created_at?: string
          game_id?: string | null
          id?: string
          is_active?: boolean
          last_health_check?: string | null
          last_health_status?: string | null
          name: string
          notebook_id: string
          updated_at?: string
        }
        Update: {
          api_url?: string
          created_at?: string
          game_id?: string | null
          id?: string
          is_active?: boolean
          last_health_check?: string | null
          last_health_status?: string | null
          name?: string
          notebook_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notebook_connections_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          banned_by: string | null
          created_at: string | null
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          banned_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          banned_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      bypass_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          times_used: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          times_used?: number
        }
        Relationships: []
      }
      calendar_publish_configs: {
        Row: {
          accent_color: string | null
          bg_image_url: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          logo_url: string | null
          primary_color: string | null
          show_platform_tournaments: boolean
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          bg_image_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          primary_color?: string | null
          show_platform_tournaments?: boolean
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          bg_image_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          primary_color?: string | null
          show_platform_tournaments?: boolean
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_publish_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      career_path_mappings: {
        Row: {
          challenge_id: string | null
          created_at: string | null
          credit_type: string | null
          credit_value: number | null
          external_module_id: string | null
          external_path_id: string
          game_id: string | null
          id: string
          target_app: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string | null
          credit_type?: string | null
          credit_value?: number | null
          external_module_id?: string | null
          external_path_id: string
          game_id?: string | null
          id?: string
          target_app: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string | null
          credit_type?: string | null
          credit_value?: number | null
          external_module_id?: string | null
          external_path_id?: string
          game_id?: string | null
          id?: string
          target_app?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_path_mappings_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_path_mappings_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_completions: {
        Row: {
          academy_next_step: Json | null
          academy_sync_note: string | null
          academy_synced: boolean
          academy_synced_at: string | null
          awarded_points: number
          challenge_id: string
          completed_at: string
          id: string
          user_id: string
          verified_by: string | null
        }
        Insert: {
          academy_next_step?: Json | null
          academy_sync_note?: string | null
          academy_synced?: boolean
          academy_synced_at?: string | null
          awarded_points?: number
          challenge_id: string
          completed_at?: string
          id?: string
          user_id: string
          verified_by?: string | null
        }
        Update: {
          academy_next_step?: Json | null
          academy_sync_note?: string | null
          academy_synced?: boolean
          academy_synced_at?: string | null
          awarded_points?: number
          challenge_id?: string
          completed_at?: string
          id?: string
          user_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_enrollments: {
        Row: {
          challenge_id: string
          enrolled_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          enrolled_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          enrolled_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_enrollments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_evidence: {
        Row: {
          enrollment_id: string
          file_type: string
          file_url: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string
          task_id: string | null
        }
        Insert: {
          enrollment_id: string
          file_type?: string
          file_url: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          task_id?: string | null
        }
        Update: {
          enrollment_id?: string
          file_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_evidence_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "challenge_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "challenge_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_tasks: {
        Row: {
          challenge_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          steam_achievement_api_name: string | null
          steam_playtime_minutes: number | null
          title: string
          verification_type: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          steam_achievement_api_name?: string | null
          steam_playtime_minutes?: number | null
          title: string
          verification_type?: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          steam_achievement_api_name?: string | null
          steam_playtime_minutes?: number | null
          title?: string
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_tasks_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          academy_next_step_label: string | null
          academy_next_step_url: string | null
          achievement_id: string | null
          cdl_domain: string | null
          certification_description: string | null
          cfr_reference: string | null
          challenge_type: string
          coach_context: string | null
          cover_image_prompt: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          difficulty: string
          display_order: number | null
          end_date: string | null
          estimated_minutes: number | null
          game_id: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          max_completions: number | null
          max_enrollments: number | null
          name: string
          points_first: number
          points_overridden_by: string | null
          points_override_reason: string | null
          points_participation: number
          points_reward: number
          points_second: number
          points_third: number
          requires_evidence: boolean
          season_id: string | null
          start_date: string | null
          suggested_coach_prompts: Json | null
          updated_at: string
        }
        Insert: {
          academy_next_step_label?: string | null
          academy_next_step_url?: string | null
          achievement_id?: string | null
          cdl_domain?: string | null
          certification_description?: string | null
          cfr_reference?: string | null
          challenge_type?: string
          coach_context?: string | null
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          difficulty?: string
          display_order?: number | null
          end_date?: string | null
          estimated_minutes?: number | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_completions?: number | null
          max_enrollments?: number | null
          name: string
          points_first?: number
          points_overridden_by?: string | null
          points_override_reason?: string | null
          points_participation?: number
          points_reward?: number
          points_second?: number
          points_third?: number
          requires_evidence?: boolean
          season_id?: string | null
          start_date?: string | null
          suggested_coach_prompts?: Json | null
          updated_at?: string
        }
        Update: {
          academy_next_step_label?: string | null
          academy_next_step_url?: string | null
          achievement_id?: string | null
          cdl_domain?: string | null
          certification_description?: string | null
          cfr_reference?: string | null
          challenge_type?: string
          coach_context?: string | null
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string
          display_order?: number | null
          end_date?: string | null
          estimated_minutes?: number | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_completions?: number | null
          max_enrollments?: number | null
          name?: string
          points_first?: number
          points_overridden_by?: string | null
          points_override_reason?: string | null
          points_participation?: number
          points_reward?: number
          points_second?: number
          points_third?: number
          requires_evidence?: boolean
          season_id?: string | null
          start_date?: string | null
          suggested_coach_prompts?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_games: {
        Row: {
          blacknut_game_id: string
          cover_url: string | null
          created_at: string
          deep_link_url: string | null
          description: string | null
          genre: string | null
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          blacknut_game_id: string
          cover_url?: string | null
          created_at?: string
          deep_link_url?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          blacknut_game_id?: string
          cover_url?: string | null
          created_at?: string
          deep_link_url?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      coach_conversations: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_conversations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_messages: {
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
            foreignKeyName: "coach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_player_files: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_name: string
          file_type: string
          file_url: string
          game_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_type?: string
          file_url: string
          game_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          game_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_player_profiles: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          notes: string | null
          stats_summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          stats_summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          stats_summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_pinned: boolean
          parent_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          parent_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          parent_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_bypass_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      discord_role_mappings: {
        Row: {
          condition_value: string | null
          created_at: string
          discord_role_id: string
          discord_role_name: string
          id: string
          is_active: boolean
          platform_role: string | null
          trigger_condition: Database["public"]["Enums"]["discord_role_trigger"]
        }
        Insert: {
          condition_value?: string | null
          created_at?: string
          discord_role_id: string
          discord_role_name: string
          id?: string
          is_active?: boolean
          platform_role?: string | null
          trigger_condition?: Database["public"]["Enums"]["discord_role_trigger"]
        }
        Update: {
          condition_value?: string | null
          created_at?: string
          discord_role_id?: string
          discord_role_name?: string
          id?: string
          is_active?: boolean
          platform_role?: string | null
          trigger_condition?: Database["public"]["Enums"]["discord_role_trigger"]
        }
        Relationships: []
      }
      ecosystem_auth_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          target_app: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          target_app: string
          token?: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          target_app?: string
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      ecosystem_sync_log: {
        Row: {
          created_at: string | null
          data_type: string
          error_message: string | null
          id: string
          last_synced_at: string
          records_synced: number | null
          status: string | null
          target_app: string
        }
        Insert: {
          created_at?: string | null
          data_type: string
          error_message?: string | null
          id?: string
          last_synced_at?: string
          records_synced?: number | null
          status?: string | null
          target_app: string
        }
        Update: {
          created_at?: string | null
          data_type?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string
          records_synced?: number | null
          status?: string | null
          target_app?: string
        }
        Relationships: []
      }
      ecosystem_webhooks: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          is_active: boolean | null
          secret_key: string
          target_app: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          secret_key: string
          target_app: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          secret_key?: string
          target_app?: string
          webhook_url?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      engagement_email_log: {
        Row: {
          email_type: string
          id: string
          reference_id: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          email_type: string
          id?: string
          reference_id?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          email_type?: string
          id?: string
          reference_id?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_servers: {
        Row: {
          connection_instructions: string | null
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          game: string
          game_id: string | null
          id: string
          image_url: string | null
          ip_address: string
          is_active: boolean
          max_players: number | null
          name: string
          panel_server_id: string | null
          panel_type: string | null
          panel_url: string | null
          port: number | null
          updated_at: string
        }
        Insert: {
          connection_instructions?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          game: string
          game_id?: string | null
          id?: string
          image_url?: string | null
          ip_address: string
          is_active?: boolean
          max_players?: number | null
          name: string
          panel_server_id?: string | null
          panel_type?: string | null
          panel_url?: string | null
          port?: number | null
          updated_at?: string
        }
        Update: {
          connection_instructions?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          game?: string
          game_id?: string | null
          id?: string
          image_url?: string | null
          ip_address?: string
          is_active?: boolean
          max_players?: number | null
          name?: string
          panel_server_id?: string | null
          panel_type?: string | null
          panel_url?: string | null
          port?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_servers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          display_order: number
          guide_content: string | null
          id: string
          is_active: boolean
          name: string
          platform_tags: string[] | null
          slug: string
          steam_app_id: string | null
          tournament_rules_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          guide_content?: string | null
          id?: string
          is_active?: boolean
          name: string
          platform_tags?: string[] | null
          slug: string
          steam_app_id?: string | null
          tournament_rules_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          guide_content?: string | null
          id?: string
          is_active?: boolean
          name?: string
          platform_tags?: string[] | null
          slug?: string
          steam_app_id?: string | null
          tournament_rules_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guide_media: {
        Row: {
          caption: string | null
          created_at: string
          file_type: string
          file_url: string
          guide_slug: string
          id: string
          section_id: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_type?: string
          file_url: string
          guide_slug: string
          id?: string
          section_id: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_type?: string
          file_url?: string
          guide_slug?: string
          id?: string
          section_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      ladder_entries: {
        Row: {
          created_at: string
          id: string
          ladder_id: string
          losses: number
          rank: number | null
          rating: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          created_at?: string
          id?: string
          ladder_id: string
          losses?: number
          rank?: number | null
          rating?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          created_at?: string
          id?: string
          ladder_id?: string
          losses?: number
          rank?: number | null
          rating?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "ladder_entries_ladder_id_fkey"
            columns: ["ladder_id"]
            isOneToOne: false
            referencedRelation: "ladders"
            referencedColumns: ["id"]
          },
        ]
      }
      ladders: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          game_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ladders_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_users: {
        Row: {
          address: string | null
          birthday: string | null
          created_at: string | null
          discord_username: string | null
          email: string | null
          first_name: string | null
          id: string
          invite_code: string | null
          last_name: string | null
          legacy_created_at: string | null
          legacy_username: string
          matched_at: string | null
          matched_user_id: string | null
          profile_completed: boolean | null
          provider_name: string | null
          status: string | null
          tenant_id: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          created_at?: string | null
          discord_username?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          invite_code?: string | null
          last_name?: string | null
          legacy_created_at?: string | null
          legacy_username: string
          matched_at?: string | null
          matched_user_id?: string | null
          profile_completed?: boolean | null
          provider_name?: string | null
          status?: string | null
          tenant_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          created_at?: string | null
          discord_username?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          invite_code?: string | null
          last_name?: string | null
          legacy_created_at?: string | null
          legacy_username?: string
          matched_at?: string | null
          matched_user_id?: string | null
          profile_completed?: boolean | null
          provider_name?: string | null
          status?: string | null
          tenant_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legacy_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_pages: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          slug: string
          supports_background: boolean
          supports_hero: boolean
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          slug: string
          supports_background?: boolean
          supports_hero?: boolean
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          slug?: string
          supports_background?: boolean
          supports_hero?: boolean
        }
        Relationships: []
      }
      marketing_assets: {
        Row: {
          campaign_id: string
          created_at: string
          display_order: number
          file_path: string
          height: number | null
          id: string
          label: string
          url: string
          width: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          display_order?: number
          file_path: string
          height?: number | null
          id?: string
          label?: string
          url: string
          width?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          display_order?: number
          file_path?: string
          height?: number | null
          id?: string
          label?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_published: boolean
          social_copy: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_published?: boolean
          social_copy?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_published?: boolean
          social_copy?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_results: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          match_number: number
          player1_id: string | null
          player1_score: number | null
          player2_id: string | null
          player2_score: number | null
          round: number
          scheduled_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          match_number?: number
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round?: number
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          match_number?: number
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round?: number
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_results_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          category: string
          created_at: string
          embed_code: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          tags: string[] | null
          url: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          embed_code?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          mime_type?: string | null
          tags?: string[] | null
          url: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          embed_code?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          tags?: string[] | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      national_zip_codes: {
        Row: {
          city: string | null
          county: string | null
          id: string
          latitude: number | null
          longitude: number | null
          state: string | null
          zip_code: string
        }
        Insert: {
          city?: string | null
          county?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          zip_code: string
        }
        Update: {
          city?: string | null
          county?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_backgrounds: {
        Row: {
          created_at: string
          id: string
          image_url: string
          opacity: number
          page_slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          opacity?: number
          page_slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          opacity?: number
          page_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_hero_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          page_slug: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          page_slug: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          page_slug?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      player_achievements: {
        Row: {
          achievement_id: string
          awarded_at: string
          awarded_by: string | null
          id: string
          notes: string | null
          progress: number | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          awarded_at?: string
          awarded_by?: string | null
          id?: string
          notes?: string | null
          progress?: number | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          awarded_at?: string
          awarded_by?: string | null
          id?: string
          notes?: string | null
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      player_quest_xp: {
        Row: {
          id: string
          quest_rank: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          quest_rank?: string
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          quest_rank?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      point_adjustments: {
        Row: {
          adjusted_by: string
          adjustment_type: string
          created_at: string
          id: string
          points_change: number
          reason: string
          season_id: string | null
          user_id: string
        }
        Insert: {
          adjusted_by: string
          adjustment_type?: string
          created_at?: string
          id?: string
          points_change: number
          reason: string
          season_id?: string | null
          user_id: string
        }
        Update: {
          adjusted_by?: string
          adjustment_type?: string
          created_at?: string
          id?: string
          points_change?: number
          reason?: string
          season_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_adjustments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      points_realignment_log: {
        Row: {
          batch_id: string
          field_name: string
          id: string
          item_id: string
          item_type: string
          new_value: number | null
          old_value: number | null
          performed_at: string
          performed_by: string
          rubric_version: number
        }
        Insert: {
          batch_id: string
          field_name: string
          id?: string
          item_id: string
          item_type: string
          new_value?: number | null
          old_value?: number | null
          performed_at?: string
          performed_by: string
          rubric_version?: number
        }
        Update: {
          batch_id?: string
          field_name?: string
          id?: string
          item_id?: string
          item_type?: string
          new_value?: number | null
          old_value?: number | null
          performed_at?: string
          performed_by?: string
          rubric_version?: number
        }
        Relationships: []
      }
      points_rubric_audit: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_value: Json
          note: string | null
          previous_value: Json | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_value: Json
          note?: string | null
          previous_value?: Json | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_value?: Json
          note?: string | null
          previous_value?: Json | null
        }
        Relationships: []
      }
      prize_redemptions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          points_spent: number
          prize_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          points_spent?: number
          prize_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          points_spent?: number
          prize_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_redemptions_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          dollar_value: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          points_cost: number
          quantity_available: number | null
          rarity: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          dollar_value?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          points_cost?: number
          quantity_available?: number | null
          rarity?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          dollar_value?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_cost?: number
          quantity_available?: number | null
          rarity?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          discord_avatar: string | null
          discord_bypass_approved: boolean
          discord_id: string | null
          discord_linked_at: string | null
          discord_username: string | null
          display_name: string | null
          gamer_tag: string | null
          id: string
          last_active_at: string | null
          onboarding_completed: boolean
          steam_id: string | null
          steam_username: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          discord_avatar?: string | null
          discord_bypass_approved?: boolean
          discord_id?: string | null
          discord_linked_at?: string | null
          discord_username?: string | null
          display_name?: string | null
          gamer_tag?: string | null
          id?: string
          last_active_at?: string | null
          onboarding_completed?: boolean
          steam_id?: string | null
          steam_username?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          discord_avatar?: string | null
          discord_bypass_approved?: boolean
          discord_id?: string | null
          discord_linked_at?: string | null
          discord_username?: string | null
          display_name?: string | null
          gamer_tag?: string | null
          id?: string
          last_active_at?: string | null
          onboarding_completed?: boolean
          steam_id?: string | null
          steam_username?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      provider_inquiries: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string | null
          phone: string | null
          preferred_date: string | null
          preferred_time: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          message?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string | null
          phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          role?: string
        }
        Relationships: []
      }
      quest_chain_completions: {
        Row: {
          bonus_points_awarded: number
          chain_id: string
          completed_at: string
          id: string
          user_id: string
        }
        Insert: {
          bonus_points_awarded?: number
          chain_id: string
          completed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bonus_points_awarded?: number
          chain_id?: string
          completed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_chain_completions_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "quest_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_chains: {
        Row: {
          bonus_achievement_id: string | null
          bonus_points: number
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          story_intro: string | null
          story_outro: string | null
          updated_at: string
        }
        Insert: {
          bonus_achievement_id?: string | null
          bonus_points?: number
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          story_intro?: string | null
          story_outro?: string | null
          updated_at?: string
        }
        Update: {
          bonus_achievement_id?: string | null
          bonus_points?: number
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          story_intro?: string | null
          story_outro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_chains_bonus_achievement_id_fkey"
            columns: ["bonus_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_completions: {
        Row: {
          awarded_points: number
          completed_at: string
          id: string
          quest_id: string
          user_id: string
          verified_by: string | null
        }
        Insert: {
          awarded_points?: number
          completed_at?: string
          id?: string
          quest_id: string
          user_id: string
          verified_by?: string | null
        }
        Update: {
          awarded_points?: number
          completed_at?: string
          id?: string
          quest_id?: string
          user_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_completions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_enrollments: {
        Row: {
          enrolled_at: string
          id: string
          quest_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          quest_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          quest_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_enrollments_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_evidence: {
        Row: {
          enrollment_id: string
          file_type: string
          file_url: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string
          task_id: string | null
        }
        Insert: {
          enrollment_id: string
          file_type?: string
          file_url: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          task_id?: string | null
        }
        Update: {
          enrollment_id?: string
          file_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_evidence_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "quest_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "quest_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_task_point_awards: {
        Row: {
          awarded_at: string
          enrollment_id: string
          id: string
          points_awarded: number
          task_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          enrollment_id: string
          id?: string
          points_awarded?: number
          task_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          enrollment_id?: string
          id?: string
          points_awarded?: number
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_task_point_awards_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "quest_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_task_point_awards_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "quest_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_tasks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          quest_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          quest_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          quest_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_tasks_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          achievement_id: string | null
          chain_id: string | null
          chain_order: number
          challenge_type: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          difficulty: string
          end_date: string | null
          estimated_minutes: number | null
          game_id: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          max_completions: number | null
          max_enrollments: number | null
          name: string
          points_first: number
          points_overridden_by: string | null
          points_override_reason: string | null
          points_participation: number
          points_reward: number
          points_second: number
          points_third: number
          requires_evidence: boolean
          season_id: string | null
          start_date: string | null
          story_intro: string | null
          story_outro: string | null
          updated_at: string
          xp_reward: number
        }
        Insert: {
          achievement_id?: string | null
          chain_id?: string | null
          chain_order?: number
          challenge_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          difficulty?: string
          end_date?: string | null
          estimated_minutes?: number | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_completions?: number | null
          max_enrollments?: number | null
          name: string
          points_first?: number
          points_overridden_by?: string | null
          points_override_reason?: string | null
          points_participation?: number
          points_reward?: number
          points_second?: number
          points_third?: number
          requires_evidence?: boolean
          season_id?: string | null
          start_date?: string | null
          story_intro?: string | null
          story_outro?: string | null
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          achievement_id?: string | null
          chain_id?: string | null
          chain_order?: number
          challenge_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string
          end_date?: string | null
          estimated_minutes?: number | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_completions?: number | null
          max_enrollments?: number | null
          name?: string
          points_first?: number
          points_overridden_by?: string | null
          points_override_reason?: string | null
          points_participation?: number
          points_reward?: number
          points_second?: number
          points_third?: number
          requires_evidence?: boolean
          season_id?: string | null
          start_date?: string | null
          story_intro?: string | null
          story_outro?: string | null
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "quests_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "quest_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          caption: string | null
          connection_id: string
          created_at: string | null
          error_message: string | null
          id: string
          image_url: string
          platform: string
          post_url: string | null
          published_at: string | null
          scheduled_at: string
          status: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          connection_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_url: string
          platform: string
          post_url?: string | null
          published_at?: string | null
          scheduled_at: string
          status?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          connection_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          image_url?: string
          platform?: string
          post_url?: string | null
          published_at?: string | null
          scheduled_at?: string
          status?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      season_scores: {
        Row: {
          created_at: string
          id: string
          losses: number
          points: number
          points_available: number
          season_id: string
          tournaments_played: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          created_at?: string
          id?: string
          losses?: number
          points?: number
          points_available?: number
          season_id: string
          tournaments_played?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          created_at?: string
          id?: string
          losses?: number
          points?: number
          points_available?: number
          season_id?: string
          tournaments_played?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_scores_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_snapshots: {
        Row: {
          created_at: string
          final_points: number
          final_rank: number
          id: string
          losses: number
          season_id: string
          tier: string
          user_id: string
          wins: number
        }
        Insert: {
          created_at?: string
          final_points: number
          final_rank: number
          id?: string
          losses?: number
          season_id: string
          tier?: string
          user_id: string
          wins?: number
        }
        Update: {
          created_at?: string
          final_points?: number
          final_rank?: number
          id?: string
          losses?: number
          season_id?: string
          tier?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_snapshots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string
          game_id: string | null
          id: string
          name: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          game_id?: string | null
          id?: string
          name: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          game_id?: string | null
          id?: string
          name?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string
          account_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          page_id: string | null
          platform: string
          refresh_token: string | null
          tenant_id: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          account_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_id?: string | null
          platform: string
          refresh_token?: string | null
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          account_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_id?: string | null
          platform?: string
          refresh_token?: string | null
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      steam_player_achievements: {
        Row: {
          achieved: boolean
          achievement_api_name: string
          id: string
          steam_app_id: string
          synced_at: string
          unlock_time: string | null
          user_id: string
        }
        Insert: {
          achieved?: boolean
          achievement_api_name: string
          id?: string
          steam_app_id: string
          synced_at?: string
          unlock_time?: string | null
          user_id: string
        }
        Update: {
          achieved?: boolean
          achievement_api_name?: string
          id?: string
          steam_app_id?: string
          synced_at?: string
          unlock_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "steam_player_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "steam_player_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
        ]
      }
      steam_player_playtime: {
        Row: {
          id: string
          minutes_played: number
          steam_app_id: string
          synced_at: string
          user_id: string
        }
        Insert: {
          id?: string
          minutes_played?: number
          steam_app_id: string
          synced_at?: string
          user_id: string
        }
        Update: {
          id?: string
          minutes_played?: number
          steam_app_id?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriber_cloud_access: {
        Row: {
          activated_at: string
          deactivated_at: string | null
          id: string
          is_active: boolean
          tenant_id: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id: string
          user_id: string
        }
        Update: {
          activated_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_cloud_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_cloud_purchases: {
        Row: {
          canceled_at: string | null
          created_at: string
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscriber_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscriber_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscriber_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_cloud_purchases_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_cloud_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tenant_admins: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_admins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_cloud_gaming: {
        Row: {
          blacknut_account_id: string | null
          created_at: string
          id: string
          is_enabled: boolean
          max_seats: number
          subscription_tier: string
          tenant_id: string
        }
        Insert: {
          blacknut_account_id?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          max_seats?: number
          subscription_tier?: string
          tenant_id: string
        }
        Update: {
          blacknut_account_id?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          max_seats?: number
          subscription_tier?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_cloud_gaming_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_codes: {
        Row: {
          campaign_id: string | null
          code: string
          code_type: string
          created_at: string
          created_by: string
          description: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          tenant_id: string
          times_used: number
        }
        Insert: {
          campaign_id?: string | null
          code: string
          code_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tenant_id: string
          times_used?: number
        }
        Update: {
          campaign_id?: string | null
          code?: string
          code_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          tenant_id?: string
          times_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_codes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "tenant_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_event_assets: {
        Row: {
          asset_url: string
          created_at: string
          display_order: number
          event_id: string
          id: string
          label: string
        }
        Insert: {
          asset_url: string
          created_at?: string
          display_order?: number
          event_id: string
          id?: string
          label?: string
        }
        Update: {
          asset_url?: string
          created_at?: string
          display_order?: number
          event_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_event_assets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "tenant_events"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_event_registrations: {
        Row: {
          event_id: string
          id: string
          registered_at: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "tenant_events"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          discord_role_id: string | null
          end_date: string | null
          format: string
          game: string
          id: string
          image_url: string | null
          is_public: boolean
          max_participants: number
          name: string
          points_participation: number | null
          prize_id: string | null
          prize_pct_first: number | null
          prize_pct_second: number | null
          prize_pct_third: number | null
          prize_pool: string | null
          prize_type: string | null
          registration_open: boolean
          rules: string | null
          social_copy: string | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          discord_role_id?: string | null
          end_date?: string | null
          format?: string
          game?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          max_participants?: number
          name: string
          points_participation?: number | null
          prize_id?: string | null
          prize_pct_first?: number | null
          prize_pct_second?: number | null
          prize_pct_third?: number | null
          prize_pool?: string | null
          prize_type?: string | null
          registration_open?: boolean
          rules?: string | null
          social_copy?: string | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          discord_role_id?: string | null
          end_date?: string | null
          format?: string
          game?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          max_participants?: number
          name?: string
          points_participation?: number | null
          prize_id?: string | null
          prize_pct_first?: number | null
          prize_pct_second?: number | null
          prize_pct_third?: number | null
          prize_pool?: string | null
          prize_type?: string | null
          registration_open?: boolean
          rules?: string | null
          social_copy?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_integrations: {
        Row: {
          additional_config: Json | null
          api_key_encrypted: string | null
          api_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_message: string | null
          last_sync_status: string | null
          provider_type: string
          tenant_id: string
        }
        Insert: {
          additional_config?: Json | null
          api_key_encrypted?: string | null
          api_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          provider_type: string
          tenant_id: string
        }
        Update: {
          additional_config?: Json | null
          api_key_encrypted?: string | null
          api_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          provider_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          claimed_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          tenant_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role?: string
          tenant_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_marketing_assets: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string
          file_name: string
          file_path: string
          id: string
          is_published: boolean
          label: string
          notes: string | null
          source_asset_id: string | null
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by: string
          file_name: string
          file_path: string
          id?: string
          is_published?: boolean
          label?: string
          notes?: string | null
          source_asset_id?: string | null
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string
          file_name?: string
          file_path?: string
          id?: string
          is_published?: boolean
          label?: string
          notes?: string | null
          source_asset_id?: string | null
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_marketing_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_marketing_assets_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "marketing_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_marketing_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscribers: {
        Row: {
          account_number: string | null
          address: string | null
          created_at: string
          email: string | null
          external_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          plan_name: string | null
          service_status: string | null
          source: string | null
          synced_at: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          plan_name?: string | null
          service_status?: string | null
          source?: string | null
          synced_at?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          account_number?: string | null
          address?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          plan_name?: string | null
          service_status?: string | null
          source?: string | null
          synced_at?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscribers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sync_logs: {
        Row: {
          created_at: string
          dry_run: boolean | null
          id: string
          integration_id: string
          message: string | null
          provider_type: string
          records_synced: number | null
          status: string
          tenant_id: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          dry_run?: boolean | null
          id?: string
          integration_id: string
          message?: string | null
          provider_type: string
          records_synced?: number | null
          status?: string
          tenant_id: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          dry_run?: boolean | null
          id?: string
          integration_id?: string
          message?: string | null
          provider_type?: string
          records_synced?: number | null
          status?: string
          tenant_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "tenant_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_zip_codes: {
        Row: {
          city: string | null
          created_at: string
          id: string
          state: string | null
          tenant_id: string
          zip_code: string
          zip_estimated: boolean
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          state?: string | null
          tenant_id: string
          zip_code: string
          zip_estimated?: boolean
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          state?: string | null
          tenant_id?: string
          zip_code?: string
          zip_estimated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tenant_zip_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string | null
          contact_email: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          primary_color: string | null
          require_subscriber_validation: boolean
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          primary_color?: string | null
          require_subscriber_validation?: boolean
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          primary_color?: string | null
          require_subscriber_validation?: boolean
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_registrations: {
        Row: {
          id: string
          registered_at: string
          status: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          registered_at?: string
          status?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          registered_at?: string
          status?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          achievement_id: string | null
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          discord_role_id: string | null
          end_date: string | null
          entry_fee: number | null
          format: string
          game: string
          id: string
          image_url: string | null
          is_featured: boolean
          max_participants: number
          name: string
          points_first: number
          points_overridden_by: string | null
          points_override_reason: string | null
          points_participation: number
          points_second: number
          points_third: number
          prize_id: string | null
          prize_pct_first: number
          prize_pct_second: number
          prize_pct_third: number
          prize_pool: string | null
          prize_type: string
          rules: string | null
          season_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["tournament_status"]
          updated_at: string
        }
        Insert: {
          achievement_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          discord_role_id?: string | null
          end_date?: string | null
          entry_fee?: number | null
          format?: string
          game: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          max_participants?: number
          name: string
          points_first?: number
          points_overridden_by?: string | null
          points_override_reason?: string | null
          points_participation?: number
          points_second?: number
          points_third?: number
          prize_id?: string | null
          prize_pct_first?: number
          prize_pct_second?: number
          prize_pct_third?: number
          prize_pool?: string | null
          prize_type?: string
          rules?: string | null
          season_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
        }
        Update: {
          achievement_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          discord_role_id?: string | null
          end_date?: string | null
          entry_fee?: number | null
          format?: string
          game?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          max_participants?: number
          name?: string
          points_first?: number
          points_overridden_by?: string | null
          points_override_reason?: string | null
          points_participation?: number
          points_second?: number
          points_third?: number
          prize_id?: string | null
          prize_pct_first?: number
          prize_pct_second?: number
          prize_pct_third?: number
          prize_pool?: string | null
          prize_type?: string
          rules?: string | null
          season_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_service_interests: {
        Row: {
          created_at: string
          id: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_service_interests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      web_page_sections: {
        Row: {
          config: Json
          created_at: string
          display_order: number
          id: string
          page_id: string
          section_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          display_order?: number
          id?: string
          page_id: string
          section_type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          display_order?: number
          id?: string
          page_id?: string
          section_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "web_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      web_pages: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_published: boolean
          is_tenant_banner: boolean
          slug: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_published?: boolean
          is_tenant_banner?: boolean
          slug: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_published?: boolean
          is_tenant_banner?: boolean
          slug?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ecosystem_webhooks_safe: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string | null
          is_active: boolean | null
          target_app: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          is_active?: boolean | null
          target_app?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string | null
          is_active?: boolean | null
          target_app?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      game_servers_public: {
        Row: {
          connection_instructions: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          game: string | null
          game_id: string | null
          has_panel: boolean | null
          id: string | null
          image_url: string | null
          ip_address: string | null
          is_active: boolean | null
          max_players: number | null
          name: string | null
          port: number | null
          updated_at: string | null
        }
        Insert: {
          connection_instructions?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          game?: string | null
          game_id?: string | null
          has_panel?: never
          id?: string | null
          image_url?: string | null
          ip_address?: string | null
          is_active?: boolean | null
          max_players?: number | null
          name?: string | null
          port?: number | null
          updated_at?: string | null
        }
        Update: {
          connection_instructions?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          game?: string | null
          game_id?: string | null
          has_panel?: never
          id?: string | null
          image_url?: string | null
          ip_address?: string | null
          is_active?: boolean | null
          max_players?: number | null
          name?: string | null
          port?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_servers_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_redemption_spend: {
        Row: {
          month: string | null
          redemption_count: number | null
          total_dollar_spend: number | null
          total_points_spent: number | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          discord_avatar: string | null
          discord_bypass_approved: boolean | null
          discord_linked_at: string | null
          discord_username: string | null
          display_name: string | null
          gamer_tag: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          discord_avatar?: string | null
          discord_bypass_approved?: boolean | null
          discord_linked_at?: string | null
          discord_username?: string | null
          display_name?: string | null
          gamer_tag?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          discord_avatar?: string | null
          discord_bypass_approved?: boolean | null
          discord_linked_at?: string | null
          discord_username?: string | null
          display_name?: string | null
          gamer_tag?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_connections_safe: {
        Row: {
          account_name: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          page_id: string | null
          platform: string | null
          tenant_id: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          page_id?: string | null
          platform?: string | null
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          page_id?: string | null
          platform?: string | null
          tenant_id?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_pending_invitations: { Args: never; Returns: undefined }
      compute_quest_rank: { Args: { xp: number }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_tenant: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_marketing_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_providers_by_zip: {
        Args: { _zip: string }
        Returns: {
          logo_url: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      should_notify: {
        Args: { _channel: string; _type: string; _user_id: string }
        Returns: boolean
      }
      validate_bypass_code: { Args: { _code: string }; Returns: boolean }
      validate_tenant_code: {
        Args: { _code: string; _tenant_id?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "marketing"
      discord_role_trigger:
        | "on_link"
        | "on_achievement"
        | "on_rank"
        | "on_tournament_win"
        | "manual"
      match_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      tournament_status:
        | "upcoming"
        | "open"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      app_role: ["admin", "moderator", "user", "marketing"],
      discord_role_trigger: [
        "on_link",
        "on_achievement",
        "on_rank",
        "on_tournament_win",
        "manual",
      ],
      match_status: ["scheduled", "in_progress", "completed", "cancelled"],
      tournament_status: [
        "upcoming",
        "open",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
