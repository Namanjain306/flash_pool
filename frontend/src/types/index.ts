export interface Option {
  id: string;
  poll_id: string;
  option_text: string;
  vote_count: number;
}

export interface Poll {
  id: string;
  question: string;
  category: string;
  created_at: string;
  options: Option[];
}

export interface CreatePollPayload {
  question: string;
  category: string;
  options: string[];
}

export type Category =
  | "general"
  | "product"
  | "hr"
  | "engineering"
  | "design"
  | "other";

export const CATEGORIES: Category[] = [
  "general",
  "product",
  "hr",
  "engineering",
  "design",
  "other",
];
