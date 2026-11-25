export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      booking_search_stands: {
        Row: {
          booking_id: string;
          created_at: string;
          id: string;
          position: number;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          created_at?: string;
          id?: string;
          position: number;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          id?: string;
          position?: number;
          run_scope_id?: string;
          stand_id?: string;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_search_stands_town_id_run_scope_id_booking_id_fkey';
            columns: ['town_id', 'run_scope_id', 'booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
          {
            foreignKeyName: 'booking_search_stands_town_id_run_scope_id_stand_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'stands';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
        ];
      };
      bookings: {
        Row: {
          chart_version: number;
          created_at: string;
          demo_run_id: string | null;
          dispatch_deadline_at: string | null;
          fare_in_paise: number;
          id: string;
          next_due_at: string | null;
          no_driver_found_reason: string | null;
          pending_offer_id: string | null;
          pickup_at: string | null;
          request_due_at: string | null;
          requested_at: string | null;
          requires_trip_booking_id: string | null;
          rider_user_id: string;
          route_id: string;
          run_scope_id: string | null;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          chart_version: number;
          created_at?: string;
          demo_run_id?: string | null;
          dispatch_deadline_at?: string | null;
          fare_in_paise: number;
          id?: string;
          next_due_at?: string | null;
          no_driver_found_reason?: string | null;
          pending_offer_id?: string | null;
          pickup_at?: string | null;
          request_due_at?: string | null;
          requested_at?: string | null;
          requires_trip_booking_id?: never;
          rider_user_id: string;
          route_id: string;
          run_scope_id?: never;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          chart_version?: number;
          created_at?: string;
          demo_run_id?: string | null;
          dispatch_deadline_at?: string | null;
          fare_in_paise?: number;
          id?: string;
          next_due_at?: string | null;
          no_driver_found_reason?: string | null;
          pending_offer_id?: string | null;
          pickup_at?: string | null;
          request_due_at?: string | null;
          requested_at?: string | null;
          requires_trip_booking_id?: never;
          rider_user_id?: string;
          route_id?: string;
          run_scope_id?: never;
          stand_id?: string;
          status?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_pending_offer_fk';
            columns: ['id', 'pending_offer_id'];
            isOneToOne: true;
            referencedRelation: 'ride_offers';
            referencedColumns: ['booking_id', 'pending_id'];
          },
          {
            foreignKeyName: 'bookings_required_trip_fk';
            columns: ['requires_trip_booking_id'];
            isOneToOne: false;
            referencedRelation: 'assigned_trips';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'bookings_required_trip_fk';
            columns: ['requires_trip_booking_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'bookings_town_id_chart_version_route_id_fkey';
            columns: ['town_id', 'chart_version', 'route_id'];
            isOneToOne: false;
            referencedRelation: 'fare_routes';
            referencedColumns: ['town_id', 'chart_version', 'route_id'];
          },
          {
            foreignKeyName: 'bookings_town_id_demo_run_id_rider_user_id_fkey';
            columns: ['town_id', 'demo_run_id', 'rider_user_id'];
            isOneToOne: false;
            referencedRelation: 'demo_runs';
            referencedColumns: ['town_id', 'id', 'rider_user_id'];
          },
          {
            foreignKeyName: 'bookings_town_id_run_scope_id_stand_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'stands';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
        ];
      };
      command_log: {
        Row: {
          actor: string;
          command_key: string;
          created_at: string;
          demo_run_id: string | null;
          id: string;
          input_hash: string;
          result: NonNullable<Json>;
          run_scope_id: string | null;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          actor: string;
          command_key: string;
          created_at?: string;
          demo_run_id?: string | null;
          id?: string;
          input_hash: string;
          result: NonNullable<Json>;
          run_scope_id?: never;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          actor?: string;
          command_key?: string;
          created_at?: string;
          demo_run_id?: string | null;
          id?: string;
          input_hash?: string;
          result?: NonNullable<Json>;
          run_scope_id?: never;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'command_log_town_id_demo_run_id_fkey';
            columns: ['town_id', 'demo_run_id'];
            isOneToOne: false;
            referencedRelation: 'demo_runs';
            referencedColumns: ['town_id', 'id'];
          },
          {
            foreignKeyName: 'command_log_town_id_fkey';
            columns: ['town_id'];
            isOneToOne: false;
            referencedRelation: 'towns';
            referencedColumns: ['id'];
          },
        ];
      };
      coordinators: {
        Row: {
          coordinator_user_id: string;
          created_at: string;
          id: string;
          run_scope_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          coordinator_user_id: string;
          created_at?: string;
          id?: string;
          run_scope_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          coordinator_user_id?: string;
          created_at?: string;
          id?: string;
          run_scope_id?: string;
          stand_id?: string;
          status?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'coordinators_town_id_run_scope_id_stand_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'stands';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
        ];
      };
      demo_runs: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          rider_user_id: string;
          simulation_profile_id: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          rider_user_id: string;
          simulation_profile_id: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          rider_user_id?: string;
          simulation_profile_id?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'demo_runs_town_id_simulation_profile_id_fkey';
            columns: ['town_id', 'simulation_profile_id'];
            isOneToOne: false;
            referencedRelation: 'simulation_profiles';
            referencedColumns: ['town_id', 'id'];
          },
        ];
      };
      domain_events: {
        Row: {
          booking_id: string | null;
          created_at: string;
          driver_id: string | null;
          event_type: string;
          id: string;
          occurred_at: string;
          payload: NonNullable<Json>;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          driver_id?: string | null;
          event_type: string;
          id?: string;
          occurred_at: string;
          payload: NonNullable<Json>;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          driver_id?: string | null;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          payload?: NonNullable<Json>;
          run_scope_id?: string;
          stand_id?: string;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'domain_events_town_id_run_scope_id_booking_id_fkey';
            columns: ['town_id', 'run_scope_id', 'booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
          {
            foreignKeyName: 'domain_events_town_id_run_scope_id_stand_id_driver_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
          {
            foreignKeyName: 'domain_events_town_id_run_scope_id_stand_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'stands';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
        ];
      };
      driver_devices: {
        Row: {
          bound_at: string;
          created_at: string;
          driver_id: string;
          id: string;
          revoked_at: string | null;
          run_scope_id: string;
          session_user_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          bound_at: string;
          created_at?: string;
          driver_id: string;
          id?: string;
          revoked_at?: string | null;
          run_scope_id: string;
          session_user_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          bound_at?: string;
          created_at?: string;
          driver_id?: string;
          id?: string;
          revoked_at?: string | null;
          run_scope_id?: string;
          session_user_id?: string;
          stand_id?: string;
          status?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'driver_devices_town_id_run_scope_id_stand_id_driver_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
        ];
      };
      driver_invites: {
        Row: {
          created_at: string;
          driver_id: string;
          expires_at: string;
          id: string;
          redeemed_at: string | null;
          revoked_at: string | null;
          run_scope_id: string;
          stand_id: string;
          status: string;
          token_hash: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          driver_id: string;
          expires_at: string;
          id?: string;
          redeemed_at?: string | null;
          revoked_at?: string | null;
          run_scope_id: string;
          stand_id: string;
          status: string;
          token_hash: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          driver_id?: string;
          expires_at?: string;
          id?: string;
          redeemed_at?: string | null;
          revoked_at?: string | null;
          run_scope_id?: string;
          stand_id?: string;
          status?: string;
          token_hash?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'driver_invites_town_id_run_scope_id_stand_id_driver_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
        ];
      };
      driver_queue_entries: {
        Row: {
          created_at: string;
          driver_id: string;
          id: string;
          queued_at_epoch_microseconds: number;
          reserved_offer_id: string | null;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          driver_id: string;
          id?: string;
          queued_at_epoch_microseconds: number;
          reserved_offer_id?: string | null;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          driver_id?: string;
          id?: string;
          queued_at_epoch_microseconds?: number;
          reserved_offer_id?: string | null;
          run_scope_id?: string;
          stand_id?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'driver_queue_entries_driver_id_version_fkey';
            columns: ['driver_id', 'version'];
            isOneToOne: false;
            referencedRelation: 'driver_slots';
            referencedColumns: ['queue_driver_id', 'queue_version'];
          },
          {
            foreignKeyName: 'driver_queue_entries_reserved_offer_fk';
            columns: ['driver_id', 'reserved_offer_id'];
            isOneToOne: true;
            referencedRelation: 'ride_offers';
            referencedColumns: ['driver_id', 'pending_id'];
          },
          {
            foreignKeyName: 'driver_queue_entries_town_id_run_scope_id_stand_id_driver__fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
        ];
      };
      driver_slots: {
        Row: {
          active_trip_id: string | null;
          created_at: string;
          driver_id: string;
          id: string;
          pending_offer_id: string | null;
          queue_driver_id: string | null;
          queue_version: number;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          active_trip_id?: string | null;
          created_at?: string;
          driver_id: string;
          id?: string;
          pending_offer_id?: string | null;
          queue_driver_id?: never;
          queue_version?: number;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          active_trip_id?: string | null;
          created_at?: string;
          driver_id?: string;
          id?: string;
          pending_offer_id?: string | null;
          queue_driver_id?: never;
          queue_version?: number;
          run_scope_id?: string;
          stand_id?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'driver_slots_active_trip_fk';
            columns: ['driver_id', 'active_trip_id'];
            isOneToOne: true;
            referencedRelation: 'trips';
            referencedColumns: ['driver_id', 'active_id'];
          },
          {
            foreignKeyName: 'driver_slots_pending_offer_fk';
            columns: ['driver_id', 'pending_offer_id'];
            isOneToOne: true;
            referencedRelation: 'ride_offers';
            referencedColumns: ['driver_id', 'pending_id'];
          },
          {
            foreignKeyName: 'driver_slots_town_id_run_scope_id_stand_id_driver_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
        ];
      };
      drivers: {
        Row: {
          created_at: string;
          id: string;
          is_synthetic: boolean;
          name: string;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_synthetic?: boolean;
          name: string;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_synthetic?: boolean;
          name?: string;
          run_scope_id?: string;
          stand_id?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'drivers_town_id_run_scope_id_stand_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'stands';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
        ];
      };
      fare_charts: {
        Row: {
          chart_version: number;
          created_at: string;
          id: string;
          is_current: boolean;
          is_illustrative: boolean;
          night_end_minute: number;
          night_start_minute: number;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          chart_version: number;
          created_at?: string;
          id?: string;
          is_current?: boolean;
          is_illustrative?: boolean;
          night_end_minute: number;
          night_start_minute: number;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          chart_version?: number;
          created_at?: string;
          id?: string;
          is_current?: boolean;
          is_illustrative?: boolean;
          night_end_minute?: number;
          night_start_minute?: number;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'fare_charts_town_id_fkey';
            columns: ['town_id'];
            isOneToOne: false;
            referencedRelation: 'towns';
            referencedColumns: ['id'];
          },
        ];
      };
      fare_quotes: {
        Row: {
          chart_version: number;
          created_at: string;
          demo_run_id: string | null;
          expires_at: string;
          fare_in_paise: number;
          id: string;
          is_night: boolean;
          passenger_count: number;
          pickup_at: string | null;
          rider_user_id: string;
          route_id: string;
          run_scope_id: string | null;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          chart_version: number;
          created_at?: string;
          demo_run_id?: string | null;
          expires_at: string;
          fare_in_paise: number;
          id?: string;
          is_night: boolean;
          passenger_count: number;
          pickup_at?: string | null;
          rider_user_id: string;
          route_id: string;
          run_scope_id?: never;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          chart_version?: number;
          created_at?: string;
          demo_run_id?: string | null;
          expires_at?: string;
          fare_in_paise?: number;
          id?: string;
          is_night?: boolean;
          passenger_count?: number;
          pickup_at?: string | null;
          rider_user_id?: string;
          route_id?: string;
          run_scope_id?: never;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'fare_quotes_town_id_chart_version_route_id_fkey';
            columns: ['town_id', 'chart_version', 'route_id'];
            isOneToOne: false;
            referencedRelation: 'fare_routes';
            referencedColumns: ['town_id', 'chart_version', 'route_id'];
          },
          {
            foreignKeyName: 'fare_quotes_town_id_demo_run_id_rider_user_id_fkey';
            columns: ['town_id', 'demo_run_id', 'rider_user_id'];
            isOneToOne: false;
            referencedRelation: 'demo_runs';
            referencedColumns: ['town_id', 'id', 'rider_user_id'];
          },
        ];
      };
      fare_routes: {
        Row: {
          chart_version: number;
          created_at: string;
          day_fare_in_paise: number;
          id: string;
          night_fare_in_paise: number;
          route_id: string;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          chart_version: number;
          created_at?: string;
          day_fare_in_paise: number;
          id?: string;
          night_fare_in_paise: number;
          route_id: string;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          chart_version?: number;
          created_at?: string;
          day_fare_in_paise?: number;
          id?: string;
          night_fare_in_paise?: number;
          route_id?: string;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fare_routes_town_id_chart_version_fkey';
            columns: ['town_id', 'chart_version'];
            isOneToOne: false;
            referencedRelation: 'fare_charts';
            referencedColumns: ['town_id', 'chart_version'];
          },
          {
            foreignKeyName: 'fare_routes_town_id_route_id_fkey';
            columns: ['town_id', 'route_id'];
            isOneToOne: false;
            referencedRelation: 'routes';
            referencedColumns: ['town_id', 'id'];
          },
        ];
      };
      landmarks: {
        Row: {
          created_at: string;
          id: string;
          is_illustrative: boolean;
          name: string;
          name_translations: NonNullable<Json>;
          slug: string;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_illustrative?: boolean;
          name: string;
          name_translations?: NonNullable<Json>;
          slug: string;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_illustrative?: boolean;
          name?: string;
          name_translations?: NonNullable<Json>;
          slug?: string;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'landmarks_town_id_fkey';
            columns: ['town_id'];
            isOneToOne: false;
            referencedRelation: 'towns';
            referencedColumns: ['id'];
          },
        ];
      };
      licences: {
        Row: {
          created_at: string;
          id: string;
          issuing_authority: string;
          town_id: string;
          ulin: string;
          updated_at: string;
          valid_from_date: string;
          valid_through_date: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          issuing_authority: string;
          town_id: string;
          ulin: string;
          updated_at?: string;
          valid_from_date: string;
          valid_through_date: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          issuing_authority?: string;
          town_id?: string;
          ulin?: string;
          updated_at?: string;
          valid_from_date?: string;
          valid_through_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'licences_town_id_fkey';
            columns: ['town_id'];
            isOneToOne: true;
            referencedRelation: 'towns';
            referencedColumns: ['id'];
          },
        ];
      };
      push_deliveries: {
        Row: {
          attempt_count: number;
          created_at: string;
          driver_id: string;
          event_id: string;
          id: string;
          next_due_at: string | null;
          offer_id: string;
          run_scope_id: string;
          stand_id: string;
          status: string;
          subscription_id: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          attempt_count?: number;
          created_at?: string;
          driver_id: string;
          event_id: string;
          id?: string;
          next_due_at?: string | null;
          offer_id: string;
          run_scope_id: string;
          stand_id: string;
          status: string;
          subscription_id: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          attempt_count?: number;
          created_at?: string;
          driver_id?: string;
          event_id?: string;
          id?: string;
          next_due_at?: string | null;
          offer_id?: string;
          run_scope_id?: string;
          stand_id?: string;
          status?: string;
          subscription_id?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'push_deliveries_driver_id_subscription_id_fkey';
            columns: ['driver_id', 'subscription_id'];
            isOneToOne: false;
            referencedRelation: 'push_subscriptions';
            referencedColumns: ['driver_id', 'id'];
          },
          {
            foreignKeyName: 'push_deliveries_town_id_run_scope_id_stand_id_driver_id_ev_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id', 'event_id'];
            isOneToOne: false;
            referencedRelation: 'domain_events';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id', 'id'];
          },
          {
            foreignKeyName: 'push_deliveries_town_id_run_scope_id_stand_id_driver_id_of_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id', 'offer_id'];
            isOneToOne: false;
            referencedRelation: 'ride_offers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id', 'id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth_secret: string;
          created_at: string;
          driver_device_id: string;
          driver_id: string;
          endpoint: string;
          id: string;
          p256dh: string;
          run_scope_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          auth_secret: string;
          created_at?: string;
          driver_device_id: string;
          driver_id: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          run_scope_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          auth_secret?: string;
          created_at?: string;
          driver_device_id?: string;
          driver_id?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          run_scope_id?: string;
          stand_id?: string;
          status?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_driver_id_driver_device_id_fkey';
            columns: ['driver_id', 'driver_device_id'];
            isOneToOne: false;
            referencedRelation: 'driver_devices';
            referencedColumns: ['driver_id', 'id'];
          },
          {
            foreignKeyName: 'push_subscriptions_town_id_run_scope_id_stand_id_driver_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
        ];
      };
      realtime_signals: {
        Row: {
          created_at: string;
          id: string;
          recipient_user_id: string;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          recipient_user_id: string;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          recipient_user_id?: string;
          run_scope_id?: string;
          stand_id?: string;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'realtime_signals_town_id_run_scope_id_stand_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'stands';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
        ];
      };
      ride_offers: {
        Row: {
          booking_id: string;
          created_at: string;
          driver_id: string;
          expires_at: string;
          id: string;
          issued_at: string;
          pending_id: string | null;
          run_scope_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          created_at?: string;
          driver_id: string;
          expires_at: string;
          id?: string;
          issued_at: string;
          pending_id?: never;
          run_scope_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          driver_id?: string;
          expires_at?: string;
          id?: string;
          issued_at?: string;
          pending_id?: never;
          run_scope_id?: string;
          stand_id?: string;
          status?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ride_offers_booking_id_pending_id_fkey';
            columns: ['booking_id', 'pending_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id', 'pending_offer_id'];
          },
          {
            foreignKeyName: 'ride_offers_booking_id_stand_id_fkey';
            columns: ['booking_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'booking_search_stands';
            referencedColumns: ['booking_id', 'stand_id'];
          },
          {
            foreignKeyName: 'ride_offers_driver_id_pending_id_fkey';
            columns: ['driver_id', 'pending_id'];
            isOneToOne: true;
            referencedRelation: 'driver_slots';
            referencedColumns: ['driver_id', 'pending_offer_id'];
          },
          {
            foreignKeyName: 'ride_offers_driver_id_pending_id_fkey1';
            columns: ['driver_id', 'pending_id'];
            isOneToOne: true;
            referencedRelation: 'driver_queue_entries';
            referencedColumns: ['driver_id', 'reserved_offer_id'];
          },
          {
            foreignKeyName: 'ride_offers_town_id_run_scope_id_booking_id_fkey';
            columns: ['town_id', 'run_scope_id', 'booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
          {
            foreignKeyName: 'ride_offers_town_id_run_scope_id_stand_id_driver_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
        ];
      };
      rider_contacts: {
        Row: {
          booking_id: string;
          created_at: string;
          id: string;
          phone_e164: string;
          purge_after: string;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          created_at?: string;
          id?: string;
          phone_e164: string;
          purge_after: string;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          id?: string;
          phone_e164?: string;
          purge_after?: string;
          run_scope_id?: string;
          stand_id?: string;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rider_contacts_town_id_run_scope_id_stand_id_booking_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
        ];
      };
      routes: {
        Row: {
          created_at: string;
          destination_landmark_id: string;
          id: string;
          pickup_landmark_id: string;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          destination_landmark_id: string;
          id?: string;
          pickup_landmark_id: string;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          destination_landmark_id?: string;
          id?: string;
          pickup_landmark_id?: string;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'routes_town_id_destination_landmark_id_fkey';
            columns: ['town_id', 'destination_landmark_id'];
            isOneToOne: false;
            referencedRelation: 'landmarks';
            referencedColumns: ['town_id', 'id'];
          },
          {
            foreignKeyName: 'routes_town_id_pickup_landmark_id_fkey';
            columns: ['town_id', 'pickup_landmark_id'];
            isOneToOne: false;
            referencedRelation: 'landmarks';
            referencedColumns: ['town_id', 'id'];
          },
        ];
      };
      simulation_profiles: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          scenarios: NonNullable<Json>;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          scenarios?: NonNullable<Json>;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          scenarios?: NonNullable<Json>;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'simulation_profiles_town_id_fkey';
            columns: ['town_id'];
            isOneToOne: true;
            referencedRelation: 'towns';
            referencedColumns: ['id'];
          },
        ];
      };
      simulation_steps: {
        Row: {
          booking_id: string;
          command_key: string;
          created_at: string;
          demo_run_id: string;
          driver_id: string;
          id: string;
          next_due_at: string | null;
          stand_id: string;
          status: string;
          step_type: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          command_key: string;
          created_at?: string;
          demo_run_id: string;
          driver_id: string;
          id?: string;
          next_due_at?: string | null;
          stand_id: string;
          status: string;
          step_type: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          booking_id?: string;
          command_key?: string;
          created_at?: string;
          demo_run_id?: string;
          driver_id?: string;
          id?: string;
          next_due_at?: string | null;
          stand_id?: string;
          status?: string;
          step_type?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'simulation_steps_town_id_demo_run_id_booking_id_fkey';
            columns: ['town_id', 'demo_run_id', 'booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
          {
            foreignKeyName: 'simulation_steps_town_id_demo_run_id_stand_id_driver_id_fkey';
            columns: ['town_id', 'demo_run_id', 'stand_id', 'driver_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
        ];
      };
      stand_neighbours: {
        Row: {
          created_at: string;
          id: string;
          neighbour_stand_id: string;
          position: number;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          neighbour_stand_id: string;
          position: number;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          neighbour_stand_id?: string;
          position?: number;
          run_scope_id?: string;
          stand_id?: string;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stand_neighbours_town_id_run_scope_id_neighbour_stand_id_fkey';
            columns: ['town_id', 'run_scope_id', 'neighbour_stand_id'];
            isOneToOne: false;
            referencedRelation: 'stands';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
          {
            foreignKeyName: 'stand_neighbours_town_id_run_scope_id_stand_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'stands';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
        ];
      };
      stand_pickup_cues: {
        Row: {
          created_at: string;
          id: string;
          landmark_id: string;
          pickup_cue: string;
          pickup_cue_translations: NonNullable<Json>;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          landmark_id: string;
          pickup_cue: string;
          pickup_cue_translations?: NonNullable<Json>;
          run_scope_id: string;
          stand_id: string;
          town_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          landmark_id?: string;
          pickup_cue?: string;
          pickup_cue_translations?: NonNullable<Json>;
          run_scope_id?: string;
          stand_id?: string;
          town_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stand_pickup_cues_town_id_landmark_id_fkey';
            columns: ['town_id', 'landmark_id'];
            isOneToOne: false;
            referencedRelation: 'landmarks';
            referencedColumns: ['town_id', 'id'];
          },
          {
            foreignKeyName: 'stand_pickup_cues_town_id_run_scope_id_stand_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'stands';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
        ];
      };
      stands: {
        Row: {
          coordinator_contact: string;
          coordinator_contact_translations: NonNullable<Json>;
          created_at: string;
          demo_run_id: string | null;
          id: string;
          name: string;
          name_translations: NonNullable<Json>;
          run_scope_id: string | null;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          coordinator_contact: string;
          coordinator_contact_translations?: NonNullable<Json>;
          created_at?: string;
          demo_run_id?: string | null;
          id?: string;
          name: string;
          name_translations?: NonNullable<Json>;
          run_scope_id?: never;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          coordinator_contact?: string;
          coordinator_contact_translations?: NonNullable<Json>;
          created_at?: string;
          demo_run_id?: string | null;
          id?: string;
          name?: string;
          name_translations?: NonNullable<Json>;
          run_scope_id?: never;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'stands_town_id_demo_run_id_fkey';
            columns: ['town_id', 'demo_run_id'];
            isOneToOne: false;
            referencedRelation: 'demo_runs';
            referencedColumns: ['town_id', 'id'];
          },
          {
            foreignKeyName: 'stands_town_id_fkey';
            columns: ['town_id'];
            isOneToOne: false;
            referencedRelation: 'towns';
            referencedColumns: ['id'];
          },
        ];
      };
      towns: {
        Row: {
          booking_mode: string;
          created_at: string;
          dispatch_duration_milliseconds: number | null;
          grievance_contact: string;
          grievance_contact_translations: NonNullable<Json>;
          id: string;
          max_search_stands: number | null;
          name: string;
          name_translations: NonNullable<Json>;
          offer_timeout_milliseconds: number | null;
          schedule_lead_time_milliseconds: number | null;
          slug: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          booking_mode: string;
          created_at?: string;
          dispatch_duration_milliseconds?: number | null;
          grievance_contact: string;
          grievance_contact_translations?: NonNullable<Json>;
          id?: string;
          max_search_stands?: number | null;
          name: string;
          name_translations?: NonNullable<Json>;
          offer_timeout_milliseconds?: number | null;
          schedule_lead_time_milliseconds?: number | null;
          slug: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          booking_mode?: string;
          created_at?: string;
          dispatch_duration_milliseconds?: number | null;
          grievance_contact?: string;
          grievance_contact_translations?: NonNullable<Json>;
          id?: string;
          max_search_stands?: number | null;
          name?: string;
          name_translations?: NonNullable<Json>;
          offer_timeout_milliseconds?: number | null;
          schedule_lead_time_milliseconds?: number | null;
          slug?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          accepted_at: string;
          active_id: string | null;
          arrived_at: string | null;
          booking_id: string;
          created_at: string;
          driver_id: string;
          ended_at: string | null;
          id: string;
          picked_up_at: string | null;
          run_scope_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          accepted_at: string;
          active_id?: never;
          arrived_at?: string | null;
          booking_id: string;
          created_at?: string;
          driver_id: string;
          ended_at?: string | null;
          id?: string;
          picked_up_at?: string | null;
          run_scope_id: string;
          stand_id: string;
          status: string;
          town_id: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          accepted_at?: string;
          active_id?: never;
          arrived_at?: string | null;
          booking_id?: string;
          created_at?: string;
          driver_id?: string;
          ended_at?: string | null;
          id?: string;
          picked_up_at?: string | null;
          run_scope_id?: string;
          stand_id?: string;
          status?: string;
          town_id?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'trips_booking_id_stand_id_fkey';
            columns: ['booking_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'booking_search_stands';
            referencedColumns: ['booking_id', 'stand_id'];
          },
          {
            foreignKeyName: 'trips_booking_id_status_fkey';
            columns: ['booking_id', 'status'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id', 'status'];
          },
          {
            foreignKeyName: 'trips_driver_id_active_id_fkey';
            columns: ['driver_id', 'active_id'];
            isOneToOne: true;
            referencedRelation: 'driver_slots';
            referencedColumns: ['driver_id', 'active_trip_id'];
          },
          {
            foreignKeyName: 'trips_town_id_run_scope_id_booking_id_fkey';
            columns: ['town_id', 'run_scope_id', 'booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['town_id', 'run_scope_id', 'id'];
          },
          {
            foreignKeyName: 'trips_town_id_run_scope_id_stand_id_driver_id_fkey';
            columns: ['town_id', 'run_scope_id', 'stand_id', 'driver_id'];
            isOneToOne: false;
            referencedRelation: 'drivers';
            referencedColumns: ['town_id', 'run_scope_id', 'stand_id', 'id'];
          },
        ];
      };
    };
    Views: {
      assigned_trips: {
        Row: {
          accepted_at: string;
          arrived_at: string | null;
          booking_id: string;
          chart_version: number;
          destination_landmark_id: string;
          ended_at: string | null;
          fare_in_paise: number;
          picked_up_at: string | null;
          pickup_landmark_id: string;
          route_id: string;
          stand_id: string;
          status: string;
          trip_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: 'trips_booking_id_stand_id_fkey';
            columns: ['booking_id', 'stand_id'];
            isOneToOne: false;
            referencedRelation: 'booking_search_stands';
            referencedColumns: ['booking_id', 'stand_id'];
          },
          {
            foreignKeyName: 'trips_booking_id_status_fkey';
            columns: ['booking_id', 'status'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id', 'status'];
          },
        ];
      };
      pending_driver_offers: {
        Row: {
          expires_at: string;
          offer_id: string;
          pickup_cue: string;
          pickup_landmark_id: string;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
