import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TripForm } from './components/TripForm';
import { ItineraryDetails } from './components/ItineraryDetails';
import { BudgetBreakdown } from './components/BudgetBreakdown';
import { WeatherCard } from './components/WeatherCard';
import { ExpenseTracker } from './components/ExpenseTracker';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import type { Trip, Itinerary, TripGenerateInput } from './types';
import {
  Sparkles,
  MapPin,
  Calendar,
  Trash,
  ChevronRight,
  AlertCircle,
  History,
  Info,
} from 'lucide-react';

function App() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<'planner' | 'saved-trips' | 'trip-details'>('planner');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for unsaved generated plans
  const [generatedItinerary, setGeneratedItinerary] = useState<Itinerary | null>(null);
  const [tripInput, setTripInput] = useState<TripGenerateInput | null>(null);

  // States for saved database plans
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Regeneration state
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);

  // Load saved trips when authentication succeeds
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedTrips();
    } else {
      setSavedTrips([]);
      setSelectedTrip(null);
      setGeneratedItinerary(null);
      setTripInput(null);
      setView('planner');
    }
  }, [isAuthenticated]);

  const loadSavedTrips = async () => {
    try {
      const trips = await api.getTrips();
      setSavedTrips(trips);
    } catch (err) {
      console.error('Failed to load trips:', err);
    }
  };

  const handleGenerateTrip = async (input: TripGenerateInput) => {
    setIsLoading(true);
    setError(null);
    setGeneratedItinerary(null);
    setSelectedTrip(null);
    try {
      const itinerary = await api.generateTrip(input);
      setGeneratedItinerary(itinerary);
      setTripInput(input);
      setView('trip-details');
    } catch (err: any) {
      setError(err.message || 'Failed to generate itinerary. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!generatedItinerary || !tripInput) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await api.saveTrip({
        source: tripInput.source,
        destination: tripInput.destination,
        start_date: tripInput.start_date,
        duration: tripInput.duration,
        budget: tripInput.budget,
        interests: tripInput.interests,
        itinerary: generatedItinerary,
      });
      setSelectedTrip(saved);
      setGeneratedItinerary(null);
      setTripInput(null);
      await loadSavedTrips();
    } catch (err: any) {
      setError(err.message || 'Failed to save trip to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectSavedTrip = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const trip = await api.getTrip(id);
      setSelectedTrip(trip);
      setView('trip-details');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trip details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTrip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this trip itinerary?')) return;

    try {
      await api.deleteTrip(id);
      setSavedTrips((prev) => prev.filter((t) => t.id !== id));
      if (selectedTrip?.id === id) {
        setSelectedTrip(null);
        setView('planner');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete trip.');
    }
  };

  // Handle itinerary changes (edits, drag-drop, add/remove days)
  const handleItineraryChange = async (updatedItinerary: Itinerary) => {
    if (selectedTrip) {
      // Update locally immediately for responsiveness
      setSelectedTrip({ ...selectedTrip, itinerary: updatedItinerary });
      // Persist to backend
      try {
        await api.updateItinerary(selectedTrip.id, updatedItinerary);
      } catch (err: any) {
        console.error('Failed to auto-save itinerary edits:', err);
      }
    } else if (generatedItinerary) {
      // Unsaved preview — update in memory
      setGeneratedItinerary(updatedItinerary);
    }
  };

  // Regenerate a single day
  const handleRegenerateDay = async (dayNumber: number) => {
    const currentItinerary = selectedTrip ? selectedTrip.itinerary : generatedItinerary;
    const currentInput = selectedTrip ? selectedTrip : tripInput;
    if (!currentItinerary || !currentInput) return;

    setRegeneratingDay(dayNumber);
    try {
      const newDay = await api.regenerateDay({
        destination: currentInput.destination,
        day_number: dayNumber,
        duration: currentItinerary.duration,
        budget: currentInput.budget,
        interests: currentInput.interests,
        start_date: currentInput.start_date,
      });

      const newDays = currentItinerary.days.map((d) => (d.day === dayNumber ? { ...newDay, day: dayNumber } : d));
      const updatedItinerary = { ...currentItinerary, days: newDays };
      handleItineraryChange(updatedItinerary);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate day.');
    } finally {
      setRegeneratingDay(null);
    }
  };

  const handleAddExpense = async (expenseData: { title: string; amount: number; category: string; date: string }) => {
    if (!selectedTrip) return;
    try {
      const newExpense = await api.addExpense(selectedTrip.id, expenseData);
      setSelectedTrip((prev) => {
        if (!prev) return null;
        return { ...prev, expenses: [...prev.expenses, newExpense] };
      });
    } catch (err: any) {
      setError(err.message || 'Failed to log expense.');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!selectedTrip) return;
    try {
      await api.deleteExpense(expenseId);
      setSelectedTrip((prev) => {
        if (!prev) return null;
        return { ...prev, expenses: prev.expenses.filter((e) => e.id !== expenseId) };
      });
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense.');
    }
  };

  const handleSetView = (newView: 'planner' | 'saved-trips') => {
    setError(null);
    setView(newView);
    if (newView === 'saved-trips') {
      loadSavedTrips();
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-slate-950)', gap: '20px' }}>
        <div className="spinner-small" style={{ width: '60px', height: '60px', borderWidth: '4px' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Restoring secure user session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentView={view === 'trip-details' ? (selectedTrip ? 'saved-trips' : 'planner') : view}
        setView={handleSetView}
        savedCount={savedTrips.length}
      />

      <main className="container" style={{ flex: 1 }}>
        {/* Error Alert Bar */}
        {error && (
          <div
            className="glass-panel"
            style={{
              borderColor: 'var(--danger)',
              background: 'rgba(244, 63, 94, 0.08)',
              color: 'var(--text-primary)',
              padding: '16px 20px',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertCircle size={22} color="var(--danger)" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '2px' }}>Error occurred</strong>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{error}</span>
            </div>
          </div>
        )}

        {/* LOADING SCREEN */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '20px' }}>
            <div className="spinner-small" style={{ width: '50px', height: '50px', borderWidth: '3px' }} />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Contacting AI Core</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Retrieving flight rates, hotels, mapping schedules, and pulling weather forecasts...
              </p>
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* VIEW: PLANNER FORM */}
            {view === 'planner' && <TripForm onSubmit={handleGenerateTrip} isLoading={isLoading} />}

            {/* VIEW: SAVED TRIPS LIST */}
            {view === 'saved-trips' && (
              <div className="animate-fade-in">
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <History size={24} color="var(--primary)" />
                  <h2>Your Saved Journeys</h2>
                </div>

                {savedTrips.length === 0 ? (
                  <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🗺️</div>
                    <h3 style={{ marginBottom: '8px' }}>No Saved Trips Found</h3>
                    <p style={{ marginBottom: '24px', fontSize: '0.9rem' }}>
                      You haven't saved any travel itineraries yet. Start planning one now!
                    </p>
                    <button className="btn btn-primary" onClick={() => setView('planner')}>
                      <Sparkles size={16} /> Plan a Trip
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                    {savedTrips.map((trip) => {
                      const totalExpenses = trip.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
                      return (
                        <div
                          key={trip.id}
                          className="glass-panel animate-fade-in"
                          onClick={() => handleSelectSavedTrip(trip.id)}
                          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', padding: '24px' }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={16} color="var(--secondary)" /> {trip.destination}
                              </h3>
                              <button className="btn-danger" onClick={(e) => handleDeleteTrip(trip.id, e)} style={{ padding: '6px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                <Trash size={14} />
                              </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} /> {trip.start_date} ({trip.duration} days)
                              </span>
                              <span>🛫 Origin: <strong>{trip.source}</strong></span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                {trip.interests.map((interest, idx) => (
                                  <span key={idx} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                    {interest}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Spent / Budget</span>
                              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: totalExpenses > trip.budget ? 'var(--danger)' : 'var(--text-primary)' }}>
                                ${totalExpenses.toLocaleString()}{' '}
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.8rem' }}>/ ${trip.budget.toLocaleString()}</span>
                              </span>
                            </div>
                            <div style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                              Manage <ChevronRight size={16} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VIEW: TRIP DETAILS DASHBOARD */}
            {view === 'trip-details' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Info banner for unsaved previews */}
                {!selectedTrip && generatedItinerary && tripInput && (
                  <div className="glass-panel no-print" style={{ background: 'rgba(59, 130, 246, 0.07)', borderColor: 'rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderRadius: '12px' }}>
                    <Info size={20} color="var(--info)" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', flex: 1 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Preview mode</strong>: Edit your itinerary below. Click the green{' '}
                      <strong style={{ color: 'var(--success)' }}>Save Trip</strong> button to persist it, enabling the Expense Tracker!
                    </div>
                  </div>
                )}

                {/* Main itinerary */}
                <ItineraryDetails
                  itinerary={selectedTrip ? selectedTrip.itinerary : generatedItinerary!}
                  source={selectedTrip ? selectedTrip.source : tripInput!.source}
                  startDate={selectedTrip ? selectedTrip.start_date : tripInput!.start_date}
                  budget={selectedTrip ? selectedTrip.budget : tripInput!.budget}
                  interests={selectedTrip ? selectedTrip.interests : tripInput!.interests}
                  isSaved={!!selectedTrip}
                  onSave={handleSaveTrip}
                  isSaving={isSaving}
                  onItineraryChange={handleItineraryChange}
                  onRegenerateDay={handleRegenerateDay}
                  regeneratingDay={regeneratingDay}
                />

                {/* Budget + Weather */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '30px', alignItems: 'stretch' }}>
                  <BudgetBreakdown
                    budget={selectedTrip ? selectedTrip.budget : tripInput!.budget}
                    allocation={selectedTrip ? selectedTrip.itinerary.budget_allocation : generatedItinerary!.budget_allocation}
                  />
                  <WeatherCard forecast={selectedTrip ? selectedTrip.itinerary.weather_forecast : generatedItinerary!.weather_forecast} />
                </div>

                {/* Expenses (only for saved trips) */}
                {selectedTrip && (
                  <div style={{ marginTop: '10px' }}>
                    <ExpenseTracker trip={selectedTrip} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="no-print" style={{ textAlign: 'center', padding: '30px 20px', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '60px' }}>
        <p>© 2026 Antigravity AI Travel Planner. Developed with React & FastAPI.</p>
      </footer>
    </div>
  );
}

export default App;
