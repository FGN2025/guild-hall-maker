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
          id?: string
          is_active?: boolean
          last_health_check?: string | null
          last_health_status?: string | null
          name?: string
          notebook_id?: string
          updated_at?: string
        }
        Relationships: []
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
      challenge_completions: {
        Row: {
          awarded_points: number
          challenge_id: string
          completed_at: string
          id: string
          user_id: string
          verified_by: string | null
        }
        Insert: {
          awarded_points?: number
          challenge_id: string
          completed_at?: string
          id?: string
          user_id: string
          verified_by?: string | null
        }
        Update: {
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
      challenges: {
        Row: {
          challenge_type: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          game_id: string | null
          id: string
          is_active: boolean
          max_completions: number | null
          name: string
          points_reward: number
          start_date: string | null
          updated_at: string
        }
        Insert: {
          challenge_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          max_completions?: number | null
          name: string
          points_reward?: number
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          game_id?: string | null
          id?: string
          is_active?: boolean
          max_completions?: number | null
          name?: string
          points_reward?: number
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at?: string
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
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          points_cost: number
          quantity_available: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          points_cost?: number
          quantity_available?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_cost?: number
          quantity_available?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          gamer_tag: string | null
          id: string
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          gamer_tag?: string | null
          id?: string
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          gamer_tag?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      season_scores: {
        Row: {
          created_at: string
          id: string
          losses: number
          points: number
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
          id: string
          name: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
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
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          state?: string | null
          tenant_id: string
          zip_code: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          state?: string | null
          tenant_id?: string
          zip_code?: string
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
          primary_color: string | null
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
          primary_color?: string | null
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
          primary_color?: string | null
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
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          entry_fee: number | null
          format: string
          game: string
          id: string
          image_url: string | null
          max_participants: number
          name: string
          prize_pool: string | null
          rules: string | null
          start_date: string
          status: Database["public"]["Enums"]["tournament_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          format?: string
          game: string
          id?: string
          image_url?: string | null
          max_participants?: number
          name: string
          prize_pool?: string | null
          rules?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          format?: string
          game?: string
          id?: string
          image_url?: string | null
          max_participants?: number
          name?: string
          prize_pool?: string | null
          rules?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
        }
        Relationships: []
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
      is_tenant_admin: {
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
      should_notify: {
        Args: { _channel: string; _type: string; _user_id: string }
        Returns: boolean
      }
      validate_bypass_code: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "marketing"
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
