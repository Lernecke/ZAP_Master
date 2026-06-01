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
      chat_messages: {
        Row: {
          attachment_urls: string[] | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          relation_id: string
          sender_id: string
        }
        Insert: {
          attachment_urls?: string[] | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          relation_id: string
          sender_id: string
        }
        Update: {
          attachment_urls?: string[] | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          relation_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_relation_id_fkey"
            columns: ["relation_id"]
            isOneToOne: false
            referencedRelation: "mentorship_relations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      correction_rubrics: {
        Row: {
          created_at: string | null
          created_by: string
          criteria: Json | null
          description: string | null
          id: string
          max_points: number | null
          pdf_name: string | null
          pdf_path: string | null
          subject: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          criteria?: Json | null
          description?: string | null
          id?: string
          max_points?: number | null
          pdf_name?: string | null
          pdf_path?: string | null
          subject?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          criteria?: Json | null
          description?: string | null
          id?: string
          max_points?: number | null
          pdf_name?: string | null
          pdf_path?: string | null
          subject?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "correction_rubrics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_occurrences: {
        Row: {
          course_id: number | null
          ends_at_utc: string
          id: number
          starts_at_utc: string
        }
        Insert: {
          course_id?: number | null
          ends_at_utc: string
          id?: never
          starts_at_utc: string
        }
        Update: {
          course_id?: number | null
          ends_at_utc?: string
          id?: never
          starts_at_utc?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_occurrences_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: number
          location: string | null
          payment_method: string | null
          price: number | null
          timezone: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          location?: string | null
          payment_method?: string | null
          price?: number | null
          timezone?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          location?: string | null
          payment_method?: string | null
          price?: number | null
          timezone?: string | null
          title?: string | null
        }
        Relationships: []
      }
      essay_ai_corrections: {
        Row: {
          essay_id: string
          generated_at: string | null
          id: string
          input_tokens: number | null
          model_used: string
          output_tokens: number | null
          raw_suggestion: string
          released_at: string | null
          released_by: string | null
          rubric_id: string | null
          status: string
          teacher_edited_suggestion: string | null
        }
        Insert: {
          essay_id: string
          generated_at?: string | null
          id?: string
          input_tokens?: number | null
          model_used?: string
          output_tokens?: number | null
          raw_suggestion?: string
          released_at?: string | null
          released_by?: string | null
          rubric_id?: string | null
          status?: string
          teacher_edited_suggestion?: string | null
        }
        Update: {
          essay_id?: string
          generated_at?: string | null
          id?: string
          input_tokens?: number | null
          model_used?: string
          output_tokens?: number | null
          raw_suggestion?: string
          released_at?: string | null
          released_by?: string | null
          rubric_id?: string | null
          status?: string
          teacher_edited_suggestion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "essay_ai_corrections_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: true
            referencedRelation: "student_essays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essay_ai_corrections_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essay_ai_corrections_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "correction_rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          id: number
          subject_id: number | null
          subtitle: string | null
          table_data: Json | null
          title: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          subject_id?: number | null
          subtitle?: string | null
          table_data?: Json | null
          title?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          subject_id?: number | null
          subtitle?: string | null
          table_data?: Json | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "intensivwoche_anmeldungen_kurs_id_fkey"
            columns: ["kurs_id"]
            isOneToOne: false
            referencedRelation: "intensivwoche_kurse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intensivwoche_anmeldungen_kurs_id_fkey"
            columns: ["kurs_id"]
            isOneToOne: false
            referencedRelation: "intensivwoche_kurse_mit_anmeldungen"
            referencedColumns: ["id"]
          },
        ]
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
      learning_materials: {
        Row: {
          class_levels: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number | null
          download_path: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: number
          is_link: boolean | null
          is_public: boolean | null
          name: string | null
          subject_id: number | null
          type: string | null
        }
        Insert: {
          class_levels?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          download_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: number
          is_link?: boolean | null
          is_public?: boolean | null
          name?: string | null
          subject_id?: number | null
          type?: string | null
        }
        Update: {
          class_levels?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          download_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: number
          is_link?: boolean | null
          is_public?: boolean | null
          name?: string | null
          subject_id?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_skills: {
        Row: {
          class_levels: string[]
          created_at: string | null
          description: string | null
          id: string
          mentor_id: string
          subject_id: number
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          class_levels?: string[]
          created_at?: string | null
          description?: string | null
          id?: string
          mentor_id: string
          subject_id: number
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          class_levels?: string[]
          created_at?: string | null
          description?: string | null
          id?: string
          mentor_id?: string
          subject_id?: number
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_skills_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_skills_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_listings: {
        Row: {
          author_id: string
          availability: string | null
          class_levels: string[]
          created_at: string | null
          current_mentees: number | null
          description: string | null
          expires_at: string | null
          id: string
          is_featured: boolean | null
          max_mentees: number | null
          status: string
          subject_ids: number[]
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          availability?: string | null
          class_levels?: string[]
          created_at?: string | null
          current_mentees?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          max_mentees?: number | null
          status?: string
          subject_ids?: number[]
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          availability?: string | null
          class_levels?: string[]
          created_at?: string | null
          current_mentees?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          max_mentees?: number | null
          status?: string
          subject_ids?: number[]
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_listings_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_materials: {
        Row: {
          assigned_to: string
          corrected_at: string | null
          created_at: string | null
          description: string | null
          feedback: string | null
          feedback_file_urls: string[] | null
          file_types: string[]
          file_urls: string[]
          grade: string | null
          id: string
          relation_id: string
          status: string
          submitted_at: string | null
          title: string
          type: string
          updated_at: string | null
          uploader_id: string
        }
        Insert: {
          assigned_to: string
          corrected_at?: string | null
          created_at?: string | null
          description?: string | null
          feedback?: string | null
          feedback_file_urls?: string[] | null
          file_types?: string[]
          file_urls?: string[]
          grade?: string | null
          id?: string
          relation_id: string
          status?: string
          submitted_at?: string | null
          title: string
          type?: string
          updated_at?: string | null
          uploader_id: string
        }
        Update: {
          assigned_to?: string
          corrected_at?: string | null
          created_at?: string | null
          description?: string | null
          feedback?: string | null
          feedback_file_urls?: string[] | null
          file_types?: string[]
          file_urls?: string[]
          grade?: string | null
          id?: string
          relation_id?: string
          status?: string
          submitted_at?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_materials_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_materials_relation_id_fkey"
            columns: ["relation_id"]
            isOneToOne: false
            referencedRelation: "mentorship_relations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_materials_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_relations: {
        Row: {
          ended_at: string | null
          ended_reason: string | null
          id: string
          materials_corrected: number | null
          materials_submitted: number | null
          mentee_id: string
          mentor_id: string
          original_listing_id: string | null
          original_request_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          materials_corrected?: number | null
          materials_submitted?: number | null
          mentee_id: string
          mentor_id: string
          original_listing_id?: string | null
          original_request_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          materials_corrected?: number | null
          materials_submitted?: number | null
          mentee_id?: string
          mentor_id?: string
          original_listing_id?: string | null
          original_request_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_relations_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_relations_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_relations_original_listing_id_fkey"
            columns: ["original_listing_id"]
            isOneToOne: false
            referencedRelation: "mentorship_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_relations_original_request_id_fkey"
            columns: ["original_request_id"]
            isOneToOne: false
            referencedRelation: "mentorship_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          listing_id: string
          message: string | null
          requester_id: string
          responded_at: string | null
          response_message: string | null
          status: string
          target_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          requester_id: string
          responded_at?: string | null
          response_message?: string | null
          status?: string
          target_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          requester_id?: string
          responded_at?: string | null
          response_message?: string | null
          status?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "mentorship_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          theme_preference: string | null
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
          theme_preference?: string | null
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
          theme_preference?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      student_essays: {
        Row: {
          created_at: string | null
          description: string | null
          feedback: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          grade: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          student_id: string
          subject: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          feedback?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          grade?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id: string
          subject: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          feedback?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          grade?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id?: string
          subject?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_essays_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_essays_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: number
          name: string | null
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          exercise_id: number
          formula: string | null
          highlight: string | null
          hint: string | null
          id: number
          options: Json | null
          question: string
          solution: string
          type: string | null
        }
        Insert: {
          exercise_id: number
          formula?: string | null
          highlight?: string | null
          hint?: string | null
          id?: number
          options?: Json | null
          question: string
          solution: string
          type?: string | null
        }
        Update: {
          exercise_id?: number
          formula?: string | null
          highlight?: string | null
          hint?: string | null
          id?: number
          options?: Json | null
          question?: string
          solution?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "trainer_progress_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "trainer_exams"
            referencedColumns: ["id"]
          },
        ]
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
      wake_up: {
        Row: {
          id: number
          message: string | null
          wake_up_call: string | null
        }
        Insert: {
          id?: number
          message?: string | null
          wake_up_call?: string | null
        }
        Update: {
          id?: number
          message?: string | null
          wake_up_call?: string | null
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
      accept_mentorship_request: {
        Args: { request_id: string }
        Returns: string
      }
      get_upcoming_courses: { Args: never; Returns: Json[] }
      increment_material_view_count: {
        Args: { material_id: number }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_content_manager: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
