export interface Participant {
  id: number;
  name: string;
  group: string | null;
  created_at: string;
}

export interface Settings {
  id: number;
  winner_count: number;
  target_group: string; // legacy string (can keep for ref if preferred but we use arrays now)
  target_groups: string[];
  is_all_groups: boolean;
  animation_speed: number;
  show_winner_group: boolean;
  draw_duration: number;
  background_url?: string | null;
  updated_at: string;
}

export interface Winner {
  id?: number;
  name: string;
  group: string | null;
}

export interface WinnerLog {
  id: number;
  winner_name: string;
  group: string | null;
  winner_count: number;
  batch_id: string;
  drawn_at: string;
  category?: string | null;
  is_voided?: boolean;
}

export interface WinnerCategory {
  id: number;
  name: string;
  stock: number;
  initial_stock: number;
  group_allocations?: {
    type: 'fixed' | 'percent';
    data: Record<string, number>;
  } | null;
}
