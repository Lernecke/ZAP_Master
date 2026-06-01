export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          criteria: string | null
          icon: string | null
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          criteria?: string | null
          icon?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          criteria?: string | null
          icon?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          class_level: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          school_name: string | null
          theme_preference: 'light' | 'dark' | 'system' | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          class_level?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          school_name?: string | null
          theme_preference?: 'light' | 'dark' | 'system' | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          class_level?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          school_name?: string | null
          theme_preference?: 'light' | 'dark' | 'system' | null
          updated_at?: string | null
        }
        Relationships: []
      }
      intensivwoche_kurse: {
        Row: {
          beschreibung: string
          created_at: string
          created_by: string | null
          detail_beschreibung: string | null
          end_datum: string
          fach: string
          highlights: string[] | null
          id: number
          ist_aktiv: boolean
          klassenstufen: string[]
          lehrer: string
          max_teilnehmer: number
          name: string
          ort: string
          preis: number
          start_datum: string
          uhrzeit: string
          updated_at: string
        }
        Insert: {
          beschreibung: string
          created_at?: string
          created_by?: string | null
          detail_beschreibung?: string | null
          end_datum: string
          fach: string
          highlights?: string[] | null
          id?: number
          ist_aktiv?: boolean
          klassenstufen?: string[]
          lehrer: string
          max_teilnehmer?: number
          name: string
          ort: string
          preis: number
          start_datum: string
          uhrzeit: string
          updated_at?: string
        }
        Update: {
          beschreibung?: string
          created_at?: string
          created_by?: string | null
          detail_beschreibung?: string | null
          end_datum?: string
          fach?: string
          highlights?: string[] | null
          id?: number
          ist_aktiv?: boolean
          klassenstufen?: string[]
          lehrer?: string
          max_teilnehmer?: number
          name?: string
          ort?: string
          preis?: number
          start_datum?: string
          uhrzeit?: string
          updated_at?: string
        }
        Relationships: []
      }
      intensivwoche_anmeldungen: {
        Row: {
          child_class_level: string
          child_firstname: string
          child_gender: string
          child_lastname: string
          created_at: string
          id: string
          kurs_id: number | null
          notes: string | null
          paid_at: string | null
          parent_email: string
          parent_phone: string
          status: string
        }
        Insert: {
          child_class_level: string
          child_firstname: string
          child_gender: string
          child_lastname: string
          created_at?: string
          id?: string
          kurs_id?: number | null
          notes?: string | null
          paid_at?: string | null
          parent_email: string
          parent_phone: string
          status?: string
        }
        Update: {
          child_class_level?: string
          child_firstname?: string
          child_gender?: string
          child_lastname?: string
          created_at?: string
          id?: string
          kurs_id?: number | null
          notes?: string | null
          paid_at?: string | null
          parent_email?: string
          parent_phone?: string
          status?: string
        }
        Relationships: []
      }
      trainer_exams: {
        Row: {
          created_at: string | null
          data: Json
          generated_by: string | null
          id: string
          subject: string
          text_lines: string[] | null
          title: string
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          data: Json
          generated_by?: string | null
          id: string
          subject: string
          text_lines?: string[] | null
          title: string
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          data?: Json
          generated_by?: string | null
          id?: string
          subject?: string
          text_lines?: string[] | null
          title?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      trainer_progress: {
        Row: {
          answers: Json | null
          completed_at: string | null
          exam_id: string
          id: string
          last_updated: string | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          exam_id: string
          id?: string
          last_updated?: string | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          exam_id?: string
          id?: string
          last_updated?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_name: string
          earned_at: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          badge_name: string
          earned_at?: string | null
          id?: number
          user_id?: string | null
        }
        Update: {
          badge_name?: string
          earned_at?: string | null
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      user_exercises: {
        Row: {
          created_at: string | null
          exercise_type: string | null
          id: string
          is_correct: boolean | null
          question: string | null
          question_id: number | null
          user_answer: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_type?: string | null
          id?: string
          is_correct?: boolean | null
          question?: string | null
          question_id?: number | null
          user_answer?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_type?: string | null
          id?: string
          is_correct?: boolean | null
          question?: string | null
          question_id?: number | null
          user_answer?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          id: number
          subject_id: number | null
          title: string | null
          subtitle: string | null
          table_data: Json | null
          type: string | null
          created_at: string
        }
        Insert: {
          id?: number
          subject_id?: number | null
          title?: string | null
          subtitle?: string | null
          table_data?: Json | null
          type?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          subject_id?: number | null
          title?: string | null
          subtitle?: string | null
          table_data?: Json | null
          type?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: number
          exercise_id: number
          question: string
          solution: string
          type: string | null
          formula: string | null
          hint: string | null
          highlight: string | null
          options: Json | null
        }
        Insert: {
          id?: number
          exercise_id: number
          question: string
          solution: string
          type?: string | null
          formula?: string | null
          hint?: string | null
          highlight?: string | null
          options?: Json | null
        }
        Update: {
          id?: number
          exercise_id?: number
          question?: string
          solution?: string
          type?: string | null
          formula?: string | null
          hint?: string | null
          highlight?: string | null
          options?: Json | null
        }
        Relationships: []
      }
      math_solution_steps: {
        Row: {
          id: string
          exercise_type: string
          exercise_id: number
          question: string
          solution: string
          steps: Json
          model_used: string
          generated_at: string | null
        }
        Insert: {
          id?: string
          exercise_type: string
          exercise_id: number
          question: string
          solution: string
          steps: Json
          model_used?: string
          generated_at?: string | null
        }
        Update: {
          id?: string
          exercise_type?: string
          exercise_id?: number
          question?: string
          solution?: string
          steps?: Json
          model_used?: string
          generated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      intensivwoche_kurse_mit_anmeldungen: {
        Row: {
          aktuelle_teilnehmer: number | null
          beschreibung: string | null
          created_at: string | null
          created_by: string | null
          detail_beschreibung: string | null
          end_datum: string | null
          fach: string | null
          highlights: string[] | null
          id: number | null
          ist_aktiv: boolean | null
          klassenstufen: string[] | null
          lehrer: string | null
          max_teilnehmer: number | null
          name: string | null
          ort: string | null
          preis: number | null
          start_datum: string | null
          status: string | null
          uhrzeit: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_content_manager: { Args: Record<string, never>; Returns: boolean }
      is_kurs_aktiv: { Args: { p_kurs_id: number }; Returns: boolean }
      is_kurs_owner: { Args: { kurs_created_by: string }; Returns: boolean }
      is_owner: { Args: { record_user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================
// Convenience Types für die App
// ============================================

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"]
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

export type UserRole = "user" | "lehrperson" | "admin"
export type Gender = "male" | "female" | "other" | "prefer_not_to_say"
