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
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
          contact_email: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
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
      lookup_providers_by_zip: {
        Args: { _zip: string }
        Returns: {
          logo_url: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
        }[]
      }
      validate_bypass_code: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
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
