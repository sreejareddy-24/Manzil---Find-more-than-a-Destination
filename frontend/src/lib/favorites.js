import { supabase } from './supabaseClient';

export async function listFavorites() {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    // Return empty array if table doesn't exist yet to prevent hard crashes
    if (error.code === 'P0001' || error.message?.includes('does not exist')) {
      console.warn('favorites table does not exist yet. Run SQL schema commands in Supabase.');
      return [];
    }
    throw error;
  }
  return data || [];
}

export async function addFavorite({ type, title, location, image_url, rating, price, description }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to save favorites.');

  const { data, error } = await supabase
    .from('favorites')
    .insert({
      user_id: user.id,
      type,
      title,
      location: location || null,
      image_url: image_url || null,
      rating: rating ? Number(rating) : null,
      price: price ? Number(price) : null,
      description: description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFavorite(id) {
  const { error } = await supabase.from('favorites').delete().eq('id', id);
  if (error) throw error;
}
