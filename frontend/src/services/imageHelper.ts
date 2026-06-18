const TRAVEL_IMAGES = {
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
  museum: "https://images.unsplash.com/photo-1566121318594-a740b2bcf17a?auto=format&fit=crop&w=400&q=80",
  nature: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
  shopping: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80",
  nightlife: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80",
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80",
  sightseeing: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80",
  generic: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80"
};

export const getActivityImageUrl = (activityName: string): string => {
  const name = activityName.toLowerCase();
  if (name.includes('beach') || name.includes('coast') || name.includes('surf') || name.includes('ocean') || name.includes('sand') || name.includes('sea')) {
    return TRAVEL_IMAGES.beach;
  }
  if (name.includes('museum') || name.includes('temple') || name.includes('shrine') || name.includes('art') || name.includes('history') || name.includes('castle') || name.includes('cathedral') || name.includes('palace')) {
    return TRAVEL_IMAGES.museum;
  }
  if (name.includes('hike') || name.includes('mountain') || name.includes('trek') || name.includes('park') || name.includes('forest') || name.includes('nature') || name.includes('climb') || name.includes('garden')) {
    return TRAVEL_IMAGES.nature;
  }
  if (name.includes('dinner') || name.includes('food') || name.includes('restaurant') || name.includes('cafe') || name.includes('lunch') || name.includes('breakfast') || name.includes('eat') || name.includes('culinary') || name.includes('wine') || name.includes('tasting')) {
    return TRAVEL_IMAGES.food;
  }
  if (name.includes('shopping') || name.includes('mall') || name.includes('market') || name.includes('store') || name.includes('boutique') || name.includes('souvenir')) {
    return TRAVEL_IMAGES.shopping;
  }
  if (name.includes('bar') || name.includes('club') || name.includes('party') || name.includes('nightlife') || name.includes('pub') || name.includes('lounge') || name.includes('concert')) {
    return TRAVEL_IMAGES.nightlife;
  }
  if (name.includes('hotel') || name.includes('stay') || name.includes('resort') || name.includes('lodging') || name.includes('check')) {
    return TRAVEL_IMAGES.hotel;
  }
  if (name.includes('sight') || name.includes('tour') || name.includes('city') || name.includes('walk') || name.includes('landmark') || name.includes('explore') || name.includes('aquarium') || name.includes('zoo') || name.includes('tower')) {
    return TRAVEL_IMAGES.sightseeing;
  }
  return TRAVEL_IMAGES.generic;
};
