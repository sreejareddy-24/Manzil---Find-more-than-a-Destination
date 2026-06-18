import type { Trip, Itinerary, Expense, TripGenerateInput, ItineraryDay, DayRegenerateInput, User, TokenResponse, UserCreate, UserLogin } from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Helper to get authorization headers
function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  register: async (input: UserCreate): Promise<TokenResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handleResponse<TokenResponse>(response);
  },

  login: async (input: UserLogin): Promise<TokenResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handleResponse<TokenResponse>(response);
  },

  getMe: async (): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse<User>(response);
  },

  // Generate a live/offline itinerary from inputs
  generateTrip: async (input: TripGenerateInput): Promise<Itinerary> => {
    const response = await fetch(`${API_BASE_URL}/trips/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<Itinerary>(response);
  },

  // Save the generated trip to database
  saveTrip: async (tripData: {
    source: string;
    destination: string;
    start_date: string;
    duration: number;
    budget: number;
    interests: string[];
    itinerary: Itinerary;
  }): Promise<Trip> => {
    const response = await fetch(`${API_BASE_URL}/trips/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tripData),
    });
    return handleResponse<Trip>(response);
  },

  // List all saved trips
  getTrips: async (): Promise<Trip[]> => {
    const response = await fetch(`${API_BASE_URL}/trips/`, {
      headers: getHeaders(),
    });
    return handleResponse<Trip[]>(response);
  },

  // Get single saved trip details with expense list
  getTrip: async (id: string): Promise<Trip> => {
    const response = await fetch(`${API_BASE_URL}/trips/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<Trip>(response);
  },

  // Delete saved trip
  deleteTrip: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/trips/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },

  // NEW: Update saved trip itinerary (for user edits)
  updateItinerary: async (tripId: string, itinerary: Itinerary): Promise<Trip> => {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/itinerary`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ itinerary }),
    });
    return handleResponse<Trip>(response);
  },

  // NEW: Regenerate a single day
  regenerateDay: async (input: DayRegenerateInput): Promise<ItineraryDay> => {
    const response = await fetch(`${API_BASE_URL}/trips/regenerate-day`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(input),
    });
    return handleResponse<ItineraryDay>(response);
  },

  // Log new expense to saved trip
  addExpense: async (
    tripId: string,
    expense: { title: string; amount: number; category: string; date: string }
  ): Promise<Expense> => {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    return handleResponse<Expense>(response);
  },

  // Delete log expense
  deleteExpense: async (expenseId: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },
};
