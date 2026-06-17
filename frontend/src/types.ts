export interface ActivityDetail {
  time: string;
  name: string;
  description: string;
  cost: number;
  completed?: boolean;    // NEW: track if activity is done
  rating?: number | null; // NEW: 1-5 star rating after completion
}

export interface WeatherDay {
  date: string;
  temp_max: number;
  temp_min: number;
  condition: string;
}

export interface ItineraryDay {
  day: number;
  theme: string;
  activities: ActivityDetail[];
  hotel_recommendation?: string;
  restaurant_recommendation: string[];
  daily_budget_estimate: number;
  notes?: string;         // NEW: user personal notes per day
}

export interface Itinerary {
  destination: string;
  duration: number;
  budget_allocation: {
    travel: number;
    hotel: number;
    food: number;
    activities: number;
    [key: string]: number;
  };
  days: ItineraryDay[];
  packing_recommendations: string[];
  smart_suggestions: string[];
  weather_forecast: WeatherDay[];
}

export interface Expense {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
}

export interface Trip {
  id: string;
  source: string;
  destination: string;
  start_date: string;
  duration: number;
  budget: number;
  interests: string[];
  itinerary: Itinerary;
  created_at: string;
  expenses: Expense[];
}

export interface TripGenerateInput {
  source: string;
  destination: string;
  start_date: string;
  duration: number;
  budget: number;
  interests: string[];
}

// NEW: Input for regenerating a single day
export interface DayRegenerateInput {
  destination: string;
  day_number: number;
  duration: number;
  budget: number;
  interests: string[];
  start_date: string;
}

// NEW: Currency conversion rates
export interface CurrencyRates {
  [currencyCode: string]: number;
}

// Authentication & User types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserCreate {
  email: string;
  password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

