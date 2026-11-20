
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admin_accounts": {
                  Row: {
                    "created_at": string,"email": string,"failed_logins": number,"id": string,"last_login_at": string | null,"locked_until": string | null,"must_change_password": boolean,"name": string,"password_hash": string,"session_version": number,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"failed_logins"?: number,"id"?: string,"last_login_at"?: string | null,"locked_until"?: string | null,"must_change_password"?: boolean,"name"?: string,"password_hash": string,"session_version"?: number,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"failed_logins"?: number,"id"?: string,"last_login_at"?: string | null,"locked_until"?: string | null,"must_change_password"?: boolean,"name"?: string,"password_hash"?: string,"session_version"?: number,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"age_blocks": {
                  Row: {
                    "blocked_until": string,"created_at": string,"key_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_until": string,"created_at"?: string,"key_hash": string
                  }
                  Update: {
                    "blocked_until"?: string,"created_at"?: string,"key_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"age_verifications": {
                  Row: {
                    "declaration": string | null,"id": string,"method": string,"provider_ref": string | null,"signature": string | null,"signed_at": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "declaration"?: string | null,"id"?: string,"method": string,"provider_ref"?: string | null,"signature"?: string | null,"signed_at"?: string,"status": string,"user_id": string
                  }
                  Update: {
                    "declaration"?: string | null,"id"?: string,"method"?: string,"provider_ref"?: string | null,"signature"?: string | null,"signed_at"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"announcements": {
                  Row: {
                    "active": boolean,"body": string,"created_at": string,"created_by": string | null,"id": string,"kind": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"body": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: string
                  }
                  Update: {
                    "active"?: boolean,"body"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"event": string,"id": number,"meta": NonNullable<Json>,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"event": string,"id"?: never,"meta"?: NonNullable<Json>,"user_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"event"?: string,"id"?: never,"meta"?: NonNullable<Json>,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"bucket_items": {
                  Row: {
                    "category": string,"couple_id": string,"created_at": string,"created_by": string,"done_at": string | null,"done_by": string | null,"id": string,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string,"couple_id": string,"created_at"?: string,"created_by": string,"done_at"?: string | null,"done_by"?: string | null,"id"?: string,"text": string
                  }
                  Update: {
                    "category"?: string,"couple_id"?: string,"created_at"?: string,"created_by"?: string,"done_at"?: string | null,"done_by"?: string | null,"id"?: string,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bucket_items_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"capsule_contents": {
                  Row: {
                    "body": string | null,"capsule_id": string,"couple_id": string,"media_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"capsule_id": string,"couple_id": string,"media_id"?: string | null
                  }
                  Update: {
                    "body"?: string | null,"capsule_id"?: string,"couple_id"?: string,"media_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "capsule_contents_capsule_id_fkey"
      columns: ["capsule_id"]
isOneToOne: true
      referencedRelation: "capsules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "capsule_contents_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "capsule_contents_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"capsules": {
                  Row: {
                    "author_id": string,"couple_id": string,"created_at": string,"id": string,"notified_at": string | null,"opened_at": string | null,"title": string,"unlock_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"couple_id": string,"created_at"?: string,"id"?: string,"notified_at"?: string | null,"opened_at"?: string | null,"title": string,"unlock_at": string
                  }
                  Update: {
                    "author_id"?: string,"couple_id"?: string,"created_at"?: string,"id"?: string,"notified_at"?: string | null,"opened_at"?: string | null,"title"?: string,"unlock_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "capsules_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"challenge_days": {
                  Row: {
                    "challenge_id": string,"couple_id": string,"day": number,"done_by_a": string | null,"done_by_b": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id": string,"couple_id": string,"day": number,"done_by_a"?: string | null,"done_by_b"?: string | null
                  }
                  Update: {
                    "challenge_id"?: string,"couple_id"?: string,"day"?: number,"done_by_a"?: string | null,"done_by_b"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenge_days_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenge_days_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"challenge_templates": {
                  Row: {
                    "blurb": string,"daily_prompt": string,"days": number,"enabled": boolean,"id": string,"slug": string,"sort": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blurb": string,"daily_prompt": string,"days": number,"enabled"?: boolean,"id"?: string,"slug": string,"sort"?: number,"title": string
                  }
                  Update: {
                    "blurb"?: string,"daily_prompt"?: string,"days"?: number,"enabled"?: boolean,"id"?: string,"slug"?: string,"sort"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"challenges": {
                  Row: {
                    "completed_at": string | null,"couple_id": string,"created_at": string,"created_by": string,"id": string,"start_on": string,"status": string,"template_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"couple_id": string,"created_at"?: string,"created_by": string,"id"?: string,"start_on": string,"status"?: string,"template_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"couple_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"start_on"?: string,"status"?: string,"template_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenges_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenges_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "challenge_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"clinks": {
                  Row: {
                    "answered_at": string | null,"answers": string | null,"couple_id": string,"created_at": string,"hold_seconds": number | null,"id": string,"kind": string,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string | null,"answers"?: string | null,"couple_id": string,"created_at"?: string,"hold_seconds"?: number | null,"id"?: string,"kind"?: string,"sender_id": string
                  }
                  Update: {
                    "answered_at"?: string | null,"answers"?: string | null,"couple_id"?: string,"created_at"?: string,"hold_seconds"?: number | null,"id"?: string,"kind"?: string,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clinks_answers_fkey"
      columns: ["answers"]
isOneToOne: false
      referencedRelation: "clinks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinks_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"countdowns": {
                  Row: {
                    "couple_id": string,"created_at": string,"created_by": string,"details": NonNullable<Json>,"id": string,"kind": string,"reveal_note": string | null,"subtitle": string | null,"target_at": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"created_at"?: string,"created_by": string,"details"?: NonNullable<Json>,"id"?: string,"kind"?: string,"reveal_note"?: string | null,"subtitle"?: string | null,"target_at": string,"title": string
                  }
                  Update: {
                    "couple_id"?: string,"created_at"?: string,"created_by"?: string,"details"?: NonNullable<Json>,"id"?: string,"kind"?: string,"reveal_note"?: string | null,"subtitle"?: string | null,"target_at"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "countdowns_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"couple_badges": {
                  Row: {
                    "badge": string,"couple_id": string,"earned_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge": string,"couple_id": string,"earned_at"?: string
                  }
                  Update: {
                    "badge"?: string,"couple_id"?: string,"earned_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "couple_badges_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"couple_members": {
                  Row: {
                    "allow_saved_spicy": boolean,"couple_id": string,"joined_at": string,"left_at": string | null,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_saved_spicy"?: boolean,"couple_id": string,"joined_at"?: string,"left_at"?: string | null,"role": string,"user_id": string
                  }
                  Update: {
                    "allow_saved_spicy"?: boolean,"couple_id"?: string,"joined_at"?: string,"left_at"?: string | null,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "couple_members_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"couples": {
                  Row: {
                    "chat_theme": string,"chat_wallpaper": string,"chat_wallpaper_blur": boolean,"chat_wallpaper_media": string | null,"created_at": string,"dark_opened_at": string | null,"id": string,"linked_at": string,"read_only_until": string | null,"ritual_time": string,"ritual_time_proposed": string | null,"ritual_time_proposed_by": string | null,"started_on": string | null,"unlinked_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "chat_theme"?: string,"chat_wallpaper"?: string,"chat_wallpaper_blur"?: boolean,"chat_wallpaper_media"?: string | null,"created_at"?: string,"dark_opened_at"?: string | null,"id"?: string,"linked_at"?: string,"read_only_until"?: string | null,"ritual_time"?: string,"ritual_time_proposed"?: string | null,"ritual_time_proposed_by"?: string | null,"started_on"?: string | null,"unlinked_at"?: string | null
                  }
                  Update: {
                    "chat_theme"?: string,"chat_wallpaper"?: string,"chat_wallpaper_blur"?: boolean,"chat_wallpaper_media"?: string | null,"created_at"?: string,"dark_opened_at"?: string | null,"id"?: string,"linked_at"?: string,"read_only_until"?: string | null,"ritual_time"?: string,"ritual_time_proposed"?: string | null,"ritual_time_proposed_by"?: string | null,"started_on"?: string | null,"unlinked_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "couples_chat_wallpaper_media_fkey"
      columns: ["chat_wallpaper_media"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"dare_spins": {
                  Row: {
                    "couple_id": string,"created_at": string,"dare_id": string,"id": string,"media_id": string | null,"outcome": string | null,"resolved_at": string | null,"spinner_id": string,"tier": string
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"created_at"?: string,"dare_id": string,"id"?: string,"media_id"?: string | null,"outcome"?: string | null,"resolved_at"?: string | null,"spinner_id": string,"tier": string
                  }
                  Update: {
                    "couple_id"?: string,"created_at"?: string,"dare_id"?: string,"id"?: string,"media_id"?: string | null,"outcome"?: string | null,"resolved_at"?: string | null,"spinner_id"?: string,"tier"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dare_spins_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dare_spins_dare_id_fkey"
      columns: ["dare_id"]
isOneToOne: false
      referencedRelation: "dares"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dare_spins_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"dares": {
                  Row: {
                    "couple_id": string | null,"created_by": string | null,"enabled": boolean,"id": string,"is_custom": boolean,"needs_media": boolean,"sort": number,"text": string,"tier": string
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id"?: string | null,"created_by"?: string | null,"enabled"?: boolean,"id"?: string,"is_custom"?: boolean,"needs_media"?: boolean,"sort"?: number,"text": string,"tier": string
                  }
                  Update: {
                    "couple_id"?: string | null,"created_by"?: string | null,"enabled"?: boolean,"id"?: string,"is_custom"?: boolean,"needs_media"?: boolean,"sort"?: number,"text"?: string,"tier"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "dares_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"dark_settings": {
                  Row: {
                    "notice_seen_at": string | null,"opted_in_at": string | null,"opted_tiers": (string)[],"passkey_credential": Json | null,"pin_failed_count": number,"pin_hash": string | null,"pin_locked_until": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "notice_seen_at"?: string | null,"opted_in_at"?: string | null,"opted_tiers"?: (string)[],"passkey_credential"?: Json | null,"pin_failed_count"?: number,"pin_hash"?: string | null,"pin_locked_until"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "notice_seen_at"?: string | null,"opted_in_at"?: string | null,"opted_tiers"?: (string)[],"passkey_credential"?: Json | null,"pin_failed_count"?: number,"pin_hash"?: string | null,"pin_locked_until"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"date_kits": {
                  Row: {
                    "blurb": string,"enabled": boolean,"id": string,"minutes": number,"playlist_url": string | null,"prompts": NonNullable<Json>,"slug": string,"sort": number,"steps": NonNullable<Json>,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blurb": string,"enabled"?: boolean,"id"?: string,"minutes": number,"playlist_url"?: string | null,"prompts": NonNullable<Json>,"slug": string,"sort"?: number,"steps": NonNullable<Json>,"title": string
                  }
                  Update: {
                    "blurb"?: string,"enabled"?: boolean,"id"?: string,"minutes"?: number,"playlist_url"?: string | null,"prompts"?: NonNullable<Json>,"slug"?: string,"sort"?: number,"steps"?: NonNullable<Json>,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"deck_answers": {
                  Row: {
                    "answer": string | null,"card_id": string,"couple_id": string,"created_at": string,"id": string,"passed": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer"?: string | null,"card_id": string,"couple_id": string,"created_at"?: string,"id"?: string,"passed"?: boolean,"user_id": string
                  }
                  Update: {
                    "answer"?: string | null,"card_id"?: string,"couple_id"?: string,"created_at"?: string,"id"?: string,"passed"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deck_answers_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "deck_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deck_answers_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"deck_cards": {
                  Row: {
                    "deck_id": string,"enabled": boolean,"id": string,"sort": number,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "deck_id": string,"enabled"?: boolean,"id"?: string,"sort"?: number,"text": string
                  }
                  Update: {
                    "deck_id"?: string,"enabled"?: boolean,"id"?: string,"sort"?: number,"text"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deck_cards_deck_id_fkey"
      columns: ["deck_id"]
isOneToOne: false
      referencedRelation: "decks"
      referencedColumns: ["id"]
    }
                  ]
                },"decks": {
                  Row: {
                    "enabled": boolean,"id": string,"sort": number,"tier": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enabled"?: boolean,"id"?: string,"sort"?: number,"tier": string,"title": string
                  }
                  Update: {
                    "enabled"?: boolean,"id"?: string,"sort"?: number,"tier"?: string,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"deletion_requests": {
                  Row: {
                    "done_at": string | null,"execute_after": string,"requested_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "done_at"?: string | null,"execute_after"?: string,"requested_at"?: string,"user_id": string
                  }
                  Update: {
                    "done_at"?: string | null,"execute_after"?: string,"requested_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"desire_answers": {
                  Row: {
                    "answer": string,"couple_id": string,"created_at": string,"item_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"couple_id": string,"created_at"?: string,"item_id": string,"user_id": string
                  }
                  Update: {
                    "answer"?: string,"couple_id"?: string,"created_at"?: string,"item_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "desire_answers_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "desire_answers_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "desire_items"
      referencedColumns: ["id"]
    }
                  ]
                },"desire_items": {
                  Row: {
                    "enabled": boolean,"id": string,"sort": number,"text": string,"tier": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enabled"?: boolean,"id"?: string,"sort"?: number,"text": string,"tier": string
                  }
                  Update: {
                    "enabled"?: boolean,"id"?: string,"sort"?: number,"text"?: string,"tier"?: string
                  }
                  Relationships: [
                    
                  ]
                },"draw_words": {
                  Row: {
                    "enabled": boolean,"id": number,"word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enabled"?: boolean,"id"?: never,"word": string
                  }
                  Update: {
                    "enabled"?: boolean,"id"?: never,"word"?: string
                  }
                  Relationships: [
                    
                  ]
                },"error_log": {
                  Row: {
                    "count": number,"day": string,"fingerprint": string,"first_at": string,"id": number,"last_at": string,"message": string,"path": string | null,"release": string | null,"source": string,"stack": string | null,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"day"?: string,"fingerprint": string,"first_at"?: string,"id"?: never,"last_at"?: string,"message": string,"path"?: string | null,"release"?: string | null,"source": string,"stack"?: string | null,"user_agent"?: string | null
                  }
                  Update: {
                    "count"?: number,"day"?: string,"fingerprint"?: string,"first_at"?: string,"id"?: never,"last_at"?: string,"message"?: string,"path"?: string | null,"release"?: string | null,"source"?: string,"stack"?: string | null,"user_agent"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"export_requests": {
                  Row: {
                    "expires_at": string | null,"id": string,"ready_at": string | null,"requested_at": string,"storage_path": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "expires_at"?: string | null,"id"?: string,"ready_at"?: string | null,"requested_at"?: string,"storage_path"?: string | null,"user_id": string
                  }
                  Update: {
                    "expires_at"?: string | null,"id"?: string,"ready_at"?: string | null,"requested_at"?: string,"storage_path"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"feature_flags": {
                  Row: {
                    "description": string | null,"enabled": boolean,"key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"enabled"?: boolean,"key": string,"updated_at"?: string
                  }
                  Update: {
                    "description"?: string | null,"enabled"?: boolean,"key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"game_moves": {
                  Row: {
                    "couple_id": string,"created_at": string,"game_id": string,"id": number,"move": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"created_at"?: string,"game_id": string,"id"?: never,"move": NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "couple_id"?: string,"created_at"?: string,"game_id"?: string,"id"?: never,"move"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_moves_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_moves_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"game_secrets": {
                  Row: {
                    "data": NonNullable<Json>,"game_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "data"?: NonNullable<Json>,"game_id": string
                  }
                  Update: {
                    "data"?: NonNullable<Json>,"game_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_secrets_game_id_fkey"
      columns: ["game_id"]
isOneToOne: true
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "couple_id": string,"created_at": string,"created_by": string,"current_turn_user": string | null,"finished_at": string | null,"id": string,"is_draw": boolean,"mode": string,"scores": NonNullable<Json>,"state": NonNullable<Json>,"status": string,"type": string,"updated_at": string,"winner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"created_at"?: string,"created_by": string,"current_turn_user"?: string | null,"finished_at"?: string | null,"id"?: string,"is_draw"?: boolean,"mode": string,"scores"?: NonNullable<Json>,"state"?: NonNullable<Json>,"status"?: string,"type": string,"updated_at"?: string,"winner_id"?: string | null
                  }
                  Update: {
                    "couple_id"?: string,"created_at"?: string,"created_by"?: string,"current_turn_user"?: string | null,"finished_at"?: string | null,"id"?: string,"is_draw"?: boolean,"mode"?: string,"scores"?: NonNullable<Json>,"state"?: NonNullable<Json>,"status"?: string,"type"?: string,"updated_at"?: string,"winner_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "games_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "code": string,"created_at": string,"expires_at": string,"id": string,"inviter_id": string,"used_at": string | null,"used_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"expires_at"?: string,"id"?: string,"inviter_id": string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"inviter_id"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"know_me_questions": {
                  Row: {
                    "enabled": boolean,"id": number,"options": NonNullable<Json>,"sort": number,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enabled"?: boolean,"id"?: never,"options": NonNullable<Json>,"sort"?: number,"text": string
                  }
                  Update: {
                    "enabled"?: boolean,"id"?: never,"options"?: NonNullable<Json>,"sort"?: number,"text"?: string
                  }
                  Relationships: [
                    
                  ]
                },"letters": {
                  Row: {
                    "author_id": string,"body": string,"condition": string,"couple_id": string,"id": string,"media_id": string | null,"opened_at": string | null,"sealed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"condition": string,"couple_id": string,"id"?: string,"media_id"?: string | null,"opened_at"?: string | null,"sealed_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"condition"?: string,"couple_id"?: string,"id"?: string,"media_id"?: string | null,"opened_at"?: string | null,"sealed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "letters_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "letters_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"link_previews": {
                  Row: {
                    "description": string | null,"fetched_at": string,"image": string | null,"ok": boolean,"site": string | null,"title": string | null,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"fetched_at"?: string,"image"?: string | null,"ok"?: boolean,"site"?: string | null,"title"?: string | null,"url": string
                  }
                  Update: {
                    "description"?: string | null,"fetched_at"?: string,"image"?: string | null,"ok"?: boolean,"site"?: string | null,"title"?: string | null,"url"?: string
                  }
                  Relationships: [
                    
                  ]
                },"listen_queue": {
                  Row: {
                    "added_by": string,"couple_id": string,"created_at": string,"id": string,"played_at": string | null,"position": number,"service": string,"title": string | null,"video_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by": string,"couple_id": string,"created_at"?: string,"id"?: string,"played_at"?: string | null,"position"?: number,"service"?: string,"title"?: string | null,"video_id": string
                  }
                  Update: {
                    "added_by"?: string,"couple_id"?: string,"created_at"?: string,"id"?: string,"played_at"?: string | null,"position"?: number,"service"?: string,"title"?: string | null,"video_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listen_queue_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"media": {
                  Row: {
                    "bucket": string,"caption": string | null,"closed_at": string | null,"couple_id": string,"created_at": string,"dare_spin_id": string | null,"deleted_at": string | null,"duration_s": number | null,"expires_at": string | null,"height": number | null,"id": string,"is_favourite": boolean,"is_sensitive": boolean,"kind": string,"mime": string,"owner_id": string,"placeholder": string | null,"placeholder_tried_at": string | null,"request_id": string | null,"retention": string,"size_bytes": number,"status": string,"storage_path": string,"storage_verified_gone_at": string | null,"view_count": number,"viewed_at": string | null,"waveform": Json | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"caption"?: string | null,"closed_at"?: string | null,"couple_id": string,"created_at"?: string,"dare_spin_id"?: string | null,"deleted_at"?: string | null,"duration_s"?: number | null,"expires_at"?: string | null,"height"?: number | null,"id"?: string,"is_favourite"?: boolean,"is_sensitive"?: boolean,"kind": string,"mime": string,"owner_id": string,"placeholder"?: string | null,"placeholder_tried_at"?: string | null,"request_id"?: string | null,"retention"?: string,"size_bytes": number,"status"?: string,"storage_path": string,"storage_verified_gone_at"?: string | null,"view_count"?: number,"viewed_at"?: string | null,"waveform"?: Json | null,"width"?: number | null
                  }
                  Update: {
                    "bucket"?: string,"caption"?: string | null,"closed_at"?: string | null,"couple_id"?: string,"created_at"?: string,"dare_spin_id"?: string | null,"deleted_at"?: string | null,"duration_s"?: number | null,"expires_at"?: string | null,"height"?: number | null,"id"?: string,"is_favourite"?: boolean,"is_sensitive"?: boolean,"kind"?: string,"mime"?: string,"owner_id"?: string,"placeholder"?: string | null,"placeholder_tried_at"?: string | null,"request_id"?: string | null,"retention"?: string,"size_bytes"?: number,"status"?: string,"storage_path"?: string,"storage_verified_gone_at"?: string | null,"view_count"?: number,"viewed_at"?: string | null,"waveform"?: Json | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"message_pins": {
                  Row: {
                    "couple_id": string,"message_id": string,"pinned_at": string,"pinned_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"message_id": string,"pinned_at"?: string,"pinned_by": string
                  }
                  Update: {
                    "couple_id"?: string,"message_id"?: string,"pinned_at"?: string,"pinned_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_pins_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_pins_message_id_fkey"
      columns: ["message_id"]
isOneToOne: true
      referencedRelation: "messages"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string | null,"client_id": string,"couple_id": string,"delivered_at": string | null,"edited_at": string | null,"id": string,"media_ids": (string)[],"read_at": string | null,"removed_at": string | null,"reply_to": string | null,"sender_id": string,"sent_at": string,"sticker_id": string | null,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"client_id": string,"couple_id": string,"delivered_at"?: string | null,"edited_at"?: string | null,"id"?: string,"media_ids"?: (string)[],"read_at"?: string | null,"removed_at"?: string | null,"reply_to"?: string | null,"sender_id": string,"sent_at"?: string,"sticker_id"?: string | null,"type": string
                  }
                  Update: {
                    "body"?: string | null,"client_id"?: string,"couple_id"?: string,"delivered_at"?: string | null,"edited_at"?: string | null,"id"?: string,"media_ids"?: (string)[],"read_at"?: string | null,"removed_at"?: string | null,"reply_to"?: string | null,"sender_id"?: string,"sent_at"?: string,"sticker_id"?: string | null,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_reply_to_fkey"
      columns: ["reply_to"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sticker_id_fkey"
      columns: ["sticker_id"]
isOneToOne: false
      referencedRelation: "stickers"
      referencedColumns: ["id"]
    }
                  ]
                },"moods": {
                  Row: {
                    "couple_id": string,"created_at": string,"id": string,"mood": string,"note": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"created_at"?: string,"id"?: string,"mood": string,"note"?: string | null,"user_id": string
                  }
                  Update: {
                    "couple_id"?: string,"created_at"?: string,"id"?: string,"mood"?: string,"note"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "moods_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_log": {
                  Row: {
                    "category": string,"created_at": string,"dedupe_key": string | null,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"dedupe_key"?: string | null,"id"?: never,"user_id": string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"dedupe_key"?: string | null,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"nude_requests": {
                  Row: {
                    "cooldown_until": string | null,"couple_id": string,"created_at": string,"id": string,"media_id": string | null,"note": string | null,"recipient_id": string,"requester_id": string,"responded_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cooldown_until"?: string | null,"couple_id": string,"created_at"?: string,"id"?: string,"media_id"?: string | null,"note"?: string | null,"recipient_id": string,"requester_id": string,"responded_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "cooldown_until"?: string | null,"couple_id"?: string,"created_at"?: string,"id"?: string,"media_id"?: string | null,"note"?: string | null,"recipient_id"?: string,"requester_id"?: string,"responded_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nude_requests_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nude_requests_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"presence": {
                  Row: {
                    "ambient_on": boolean,"just_be_here": boolean,"last_seen_at": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ambient_on"?: boolean,"just_be_here"?: boolean,"last_seen_at"?: string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "ambient_on"?: boolean,"just_be_here"?: boolean,"last_seen_at"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "app_icon": string,"avatar_icon": string,"avatar_kind": string,"avatar_path": string | null,"bio": string | null,"country": string | null,"created_at": string,"deleted_at": string | null,"discreet_mode": boolean,"display_name": string | null,"gender": string | null,"home_city": string | null,"id": string,"is_admin": boolean,"latitude": number | null,"longitude": number | null,"love_language": string | null,"notify": NonNullable<Json>,"onboarded_at": string | null,"partner_nickname": string | null,"phone": string | null,"quiet_end": string,"quiet_start": string,"share_birthday": boolean,"suspended_at": string | null,"suspended_reason": string | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "app_icon"?: string,"avatar_icon"?: string,"avatar_kind"?: string,"avatar_path"?: string | null,"bio"?: string | null,"country"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"discreet_mode"?: boolean,"display_name"?: string | null,"gender"?: string | null,"home_city"?: string | null,"id": string,"is_admin"?: boolean,"latitude"?: number | null,"longitude"?: number | null,"love_language"?: string | null,"notify"?: NonNullable<Json>,"onboarded_at"?: string | null,"partner_nickname"?: string | null,"phone"?: string | null,"quiet_end"?: string,"quiet_start"?: string,"share_birthday"?: boolean,"suspended_at"?: string | null,"suspended_reason"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "app_icon"?: string,"avatar_icon"?: string,"avatar_kind"?: string,"avatar_path"?: string | null,"bio"?: string | null,"country"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"discreet_mode"?: boolean,"display_name"?: string | null,"gender"?: string | null,"home_city"?: string | null,"id"?: string,"is_admin"?: boolean,"latitude"?: number | null,"longitude"?: number | null,"love_language"?: string | null,"notify"?: NonNullable<Json>,"onboarded_at"?: string | null,"partner_nickname"?: string | null,"phone"?: string | null,"quiet_end"?: string,"quiet_start"?: string,"share_birthday"?: boolean,"suspended_at"?: string | null,"suspended_reason"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_error": string | null,"last_error_at": string | null,"last_ok_at": string | null,"p256dh": string,"ua": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_error"?: string | null,"last_error_at"?: string | null,"last_ok_at"?: string | null,"p256dh": string,"ua"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_error"?: string | null,"last_error_at"?: string | null,"last_ok_at"?: string | null,"p256dh"?: string,"ua"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reactions": {
                  Row: {
                    "couple_id": string,"created_at": string,"emoji": string | null,"id": string,"message_id": string,"user_id": string,"voice_media_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"created_at"?: string,"emoji"?: string | null,"id"?: string,"message_id": string,"user_id": string,"voice_media_id"?: string | null
                  }
                  Update: {
                    "couple_id"?: string,"created_at"?: string,"emoji"?: string | null,"id"?: string,"message_id"?: string,"user_id"?: string,"voice_media_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reactions_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reactions_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reactions_voice_media_id_fkey"
      columns: ["voice_media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"report_notes": {
                  Row: {
                    "admin_id": string | null,"body": string,"created_at": string,"id": string,"kind": string,"report_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_id"?: string | null,"body": string,"created_at"?: string,"id"?: string,"kind": string,"report_id": string
                  }
                  Update: {
                    "admin_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"report_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_notes_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "admin_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_notes_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "assigned_admin_id": string | null,"assigned_at": string | null,"assigned_to": string | null,"attachment_media_ids": (string)[],"attachment_paths": (string)[],"category": string,"couple_id": string | null,"created_at": string,"details": string | null,"from_after_dark": boolean,"id": string,"priority": string,"reported_user_id": string | null,"reporter_id": string | null,"resolution": string | null,"status": string,"status_changed_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_admin_id"?: string | null,"assigned_at"?: string | null,"assigned_to"?: string | null,"attachment_media_ids"?: (string)[],"attachment_paths"?: (string)[],"category": string,"couple_id"?: string | null,"created_at"?: string,"details"?: string | null,"from_after_dark"?: boolean,"id"?: string,"priority"?: string,"reported_user_id"?: string | null,"reporter_id"?: string | null,"resolution"?: string | null,"status"?: string,"status_changed_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "assigned_admin_id"?: string | null,"assigned_at"?: string | null,"assigned_to"?: string | null,"attachment_media_ids"?: (string)[],"attachment_paths"?: (string)[],"category"?: string,"couple_id"?: string | null,"created_at"?: string,"details"?: string | null,"from_after_dark"?: boolean,"id"?: string,"priority"?: string,"reported_user_id"?: string | null,"reporter_id"?: string | null,"resolution"?: string | null,"status"?: string,"status_changed_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_assigned_admin_id_fkey"
      columns: ["assigned_admin_id"]
isOneToOne: false
      referencedRelation: "admin_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"ritual_answers": {
                  Row: {
                    "answer": string,"couple_id": string,"created_at": string,"day": string,"prompt_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"couple_id": string,"created_at"?: string,"day": string,"prompt_id": number,"user_id": string
                  }
                  Update: {
                    "answer"?: string,"couple_id"?: string,"created_at"?: string,"day"?: string,"prompt_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ritual_answers_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ritual_answers_prompt_id_fkey"
      columns: ["prompt_id"]
isOneToOne: false
      referencedRelation: "ritual_prompts"
      referencedColumns: ["id"]
    }
                  ]
                },"ritual_prompts": {
                  Row: {
                    "enabled": boolean,"id": number,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enabled"?: boolean,"id": number,"text": string
                  }
                  Update: {
                    "enabled"?: boolean,"id"?: number,"text"?: string
                  }
                  Relationships: [
                    
                  ]
                },"scheduled_dates": {
                  Row: {
                    "completed_at": string | null,"couple_id": string,"created_at": string,"created_by": string,"id": string,"kit_id": string,"reminded_1d_at": string | null,"reminded_1h_at": string | null,"start_at": string,"status": string,"ticket_no": number
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"couple_id": string,"created_at"?: string,"created_by": string,"id"?: string,"kit_id": string,"reminded_1d_at"?: string | null,"reminded_1h_at"?: string | null,"start_at": string,"status"?: string,"ticket_no"?: number
                  }
                  Update: {
                    "completed_at"?: string | null,"couple_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"kit_id"?: string,"reminded_1d_at"?: string | null,"reminded_1h_at"?: string | null,"start_at"?: string,"status"?: string,"ticket_no"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "scheduled_dates_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scheduled_dates_kit_id_fkey"
      columns: ["kit_id"]
isOneToOne: false
      referencedRelation: "date_kits"
      referencedColumns: ["id"]
    }
                  ]
                },"scheduled_messages": {
                  Row: {
                    "body": string,"cancelled_at": string | null,"claimed_at": string | null,"client_id": string,"couple_id": string,"created_at": string,"id": string,"message_id": string | null,"reply_to": string | null,"send_at": string,"sender_id": string,"sent_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"cancelled_at"?: string | null,"claimed_at"?: string | null,"client_id": string,"couple_id": string,"created_at"?: string,"id"?: string,"message_id"?: string | null,"reply_to"?: string | null,"send_at": string,"sender_id": string,"sent_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "body"?: string,"cancelled_at"?: string | null,"claimed_at"?: string | null,"client_id"?: string,"couple_id"?: string,"created_at"?: string,"id"?: string,"message_id"?: string | null,"reply_to"?: string | null,"send_at"?: string,"sender_id"?: string,"sent_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "scheduled_messages_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scheduled_messages_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scheduled_messages_reply_to_fkey"
      columns: ["reply_to"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    }
                  ]
                },"sensitive_view_events": {
                  Row: {
                    "couple_id": string,"created_at": string,"event": string,"id": number,"media_id": string,"viewer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"created_at"?: string,"event": string,"id"?: never,"media_id": string,"viewer_id": string
                  }
                  Update: {
                    "couple_id"?: string,"created_at"?: string,"event"?: string,"id"?: never,"media_id"?: string,"viewer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sensitive_view_events_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sensitive_view_events_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"sticker_recents": {
                  Row: {
                    "sticker_id": string,"used_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "sticker_id": string,"used_at"?: string,"user_id": string
                  }
                  Update: {
                    "sticker_id"?: string,"used_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sticker_recents_sticker_id_fkey"
      columns: ["sticker_id"]
isOneToOne: false
      referencedRelation: "stickers"
      referencedColumns: ["id"]
    }
                  ]
                },"stickers": {
                  Row: {
                    "caption": boolean,"enabled": boolean,"id": string,"label": string,"pack": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: boolean,"enabled"?: boolean,"id": string,"label": string,"pack"?: string,"sort"?: number
                  }
                  Update: {
                    "caption"?: boolean,"enabled"?: boolean,"id"?: string,"label"?: string,"pack"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"story_starters": {
                  Row: {
                    "enabled": boolean,"id": number,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enabled"?: boolean,"id"?: never,"text": string
                  }
                  Update: {
                    "enabled"?: boolean,"id"?: never,"text"?: string
                  }
                  Relationships: [
                    
                  ]
                },"timeline_entries": {
                  Row: {
                    "couple_id": string,"created_at": string,"created_by": string | null,"happened_on": string,"id": string,"kind": string,"media_id": string | null,"source_key": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"created_at"?: string,"created_by"?: string | null,"happened_on": string,"id"?: string,"kind": string,"media_id"?: string | null,"source_key"?: string | null,"title": string
                  }
                  Update: {
                    "couple_id"?: string,"created_at"?: string,"created_by"?: string | null,"happened_on"?: string,"id"?: string,"kind"?: string,"media_id"?: string | null,"source_key"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "timeline_entries_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timeline_entries_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"trivia_questions": {
                  Row: {
                    "answer_index": number,"category": string,"enabled": boolean,"id": number,"options": NonNullable<Json>,"text": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer_index": number,"category": string,"enabled"?: boolean,"id"?: never,"options": NonNullable<Json>,"text": string
                  }
                  Update: {
                    "answer_index"?: number,"category"?: string,"enabled"?: boolean,"id"?: never,"options"?: NonNullable<Json>,"text"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_private": {
                  Row: {
                    "age_verification_method": string | null,"age_verified_at": string | null,"app_pin_failed_count": number,"app_pin_hash": string | null,"app_pin_locked_until": string | null,"created_at": string,"dob": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age_verification_method"?: string | null,"age_verified_at"?: string | null,"app_pin_failed_count"?: number,"app_pin_hash"?: string | null,"app_pin_locked_until"?: string | null,"created_at"?: string,"dob": string,"user_id": string
                  }
                  Update: {
                    "age_verification_method"?: string | null,"age_verified_at"?: string | null,"app_pin_failed_count"?: number,"app_pin_hash"?: string | null,"app_pin_locked_until"?: string | null,"created_at"?: string,"dob"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"watch_sessions": {
                  Row: {
                    "couple_id": string,"created_at": string,"created_by": string,"ended_at": string | null,"id": string,"kind": string,"title": string | null,"video_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "couple_id": string,"created_at"?: string,"created_by": string,"ended_at"?: string | null,"id"?: string,"kind"?: string,"title"?: string | null,"video_id": string
                  }
                  Update: {
                    "couple_id"?: string,"created_at"?: string,"created_by"?: string,"ended_at"?: string | null,"id"?: string,"kind"?: string,"title"?: string | null,"video_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "watch_sessions_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"wipe_jobs": {
                  Row: {
                    "attempts": number,"couple_id": string,"executed_at": string | null,"id": string,"last_error": string | null,"objects_deleted": number,"reason": string,"requested_at": string,"requested_by": string | null,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"couple_id": string,"executed_at"?: string | null,"id"?: string,"last_error"?: string | null,"objects_deleted"?: number,"reason": string,"requested_at"?: string,"requested_by"?: string | null,"verified_at"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"couple_id"?: string,"executed_at"?: string | null,"id"?: string,"last_error"?: string | null,"objects_deleted"?: number,"reason"?: string,"requested_at"?: string,"requested_by"?: string | null,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "wipe_jobs_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                },"wyr_cards": {
                  Row: {
                    "deck": string,"enabled": boolean,"id": number,"option_a": string,"option_b": string
                  }
                  ComputedFields: never
                  Insert: {
                    "deck": string,"enabled"?: boolean,"id"?: never,"option_a": string,"option_b": string
                  }
                  Update: {
                    "deck"?: string,"enabled"?: boolean,"id"?: never,"option_a"?: string,"option_b"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "countdowns_public": {
                  Row: {
                    "couple_id": string,"created_at": string,"created_by": string,"details": NonNullable<Json>,"has_note": boolean | null,"id": string,"kind": string,"reveal_note": string | null,"subtitle": string | null,"target_at": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                           "couple_id"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"details"?: Json | null,"has_note"?: never,"id"?: string | null,"kind"?: string | null,"reveal_note"?: never,"subtitle"?: string | null,"target_at"?: string | null,"title"?: string | null
                         }
                        Update: {
                           "couple_id"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"details"?: Json | null,"has_note"?: never,"id"?: string | null,"kind"?: string | null,"reveal_note"?: never,"subtitle"?: string | null,"target_at"?: string | null,"title"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "countdowns_couple_id_fkey"
      columns: ["couple_id"]
isOneToOne: false
      referencedRelation: "couples"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "clink_streak":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"game_rivalry":
{ Args: Record<PropertyKey, never>; Returns: {
              "user_id": string,"wins": number
            }[]
                           },
"ritual_partner_answered":
{ Args: { "p_day": string }; Returns: boolean
                           },
"svc_admin_metrics":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"svc_admin_revoke_sessions":
{ Args: { "p_user": string }; Returns: number
                           },
"svc_admin_trends":
{ Args: { "p_days": number }; Returns: {
              "active_couples": number,"clinks": number,"day": string,"games": number,"links": number,"messages": number,"signups": number
            }[]
                           },
"svc_admin_users":
{ Args: { "p_dir": string,"p_from": string,"p_limit": number,"p_linked": string,"p_offset": number,"p_q": string,"p_sort": string,"p_status": string,"p_to": string }; Returns: {
              "couple_id": string,"created_at": string,"deleted_at": string,"display_name": string,"email": string,"email_confirmed_at": string,"home_city": string,"id": string,"is_admin": boolean,"last_sign_in_at": string,"linked_at": string,"status": string,"suspended_at": string,"suspended_reason": string,"total": number
            }[]
                           },
"svc_answer_latest_clink":
{ Args: { "p_answerer": string,"p_couple": string }; Returns: string
                           },
"svc_apply_game_move":
{ Args: { "p_current_turn_user": string,"p_expected_updated_at": string,"p_finished_at": string,"p_game_id": string,"p_is_draw": boolean,"p_scores": Json,"p_secrets": Json,"p_state": Json,"p_status": string,"p_winner_id": string }; Returns: boolean
                           },
"svc_caller":
{ Args: { "p_user": string,"p_with_rank"?: boolean }; Returns: Json
                           },
"svc_claim_scheduled_messages":
{ Args: { "p_limit": number }; Returns: {
              "body": string,
"cancelled_at": string | null,
"claimed_at": string | null,
"client_id": string,
"couple_id": string,
"created_at": string,
"id": string,
"message_id": string | null,
"reply_to": string | null,
"send_at": string,
"sender_id": string,
"sent_at": string | null,
"status": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "scheduled_messages"
        isOneToOne: false
        isSetofReturn: true
      } },
"svc_desire_matches":
{ Args: { "p_couple": string }; Returns: {
              "item_id": string,"kind": string,"text": string,"tier": string
            }[]
                           },
"svc_effective_tier_rank":
{ Args: { "p_couple": string }; Returns: number
                           },
"svc_hit_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"svc_log_error":
{ Args: { "p_fingerprint": string,"p_message": string,"p_path": string,"p_release": string,"p_source": string,"p_stack": string,"p_user_agent": string }; Returns: undefined
                           },
"svc_on_this_day_due":
{ Args: Record<PropertyKey, never>; Returns: {
              "day_key": string,"label": string,"user_id": string,"years": number
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
