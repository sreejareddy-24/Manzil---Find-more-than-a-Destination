import { supabase } from './supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Internal fetch wrapper: attaches the current Supabase access token as a
 * Bearer header (so the FastAPI backend can verify who's calling) and
 * normalizes error handling.
 */
async function request(path, { method = 'GET', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be logged in to do that.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || detail;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(detail);
  }

  return response.json();
}

/**
 * Sends the planner form data to the backend, which calls Groq to generate
 * a structured itinerary and saves it to Supabase. Returns the saved trip
 * (including its itinerary day-by-day plan and new trip_id).
 */
export function generateItinerary({ source, destination, days, budget, interests }) {
  return request('/api/itinerary/generate', {
    method: 'POST',
    body: { source, destination, days, budget, interests },
  });
}

/**
 * Fetches the logged-in user's most recently generated trip, if any.
 * Used so the Itinerary page can still show data after a page refresh
 * (when there's no React Router navigation state to read from).
 */
export function getLatestItinerary() {
  return request('/api/itinerary/latest', { method: 'GET' });
}

/**
 * Fetches the user's full saved chat thread (oldest first), so the
 * AI Assistant page can restore conversation history on load/refresh.
 */
export function getChatHistory() {
  return request('/api/chat/history', { method: 'GET' });
}

/**
 * Sends a single chat message to the backend, which saves it, asks Groq
 * for a travel-aware reply using recent history for context, saves that
 * reply too, and returns it.
 */
export function sendChatMessage(message) {
  return request('/api/chat/send', {
    method: 'POST',
    body: { message },
  });
}

/**
 * Fetches all trips for the logged-in user.
 */
export function listTrips() {
  return request('/api/itinerary/list', { method: 'GET' });
}

/**
 * Replaces the itinerary days and recalculates costs for a given trip.
 */
export function updateItinerary(tripId, updatedDays) {
  return request(`/api/itinerary/${tripId}`, {
    method: 'PUT',
    body: updatedDays,
  });
}

/**
 * Deletes a trip entirely.
 */
export function deleteTrip(tripId) {
  return request(`/api/itinerary/${tripId}`, {
    method: 'DELETE',
  });
}

