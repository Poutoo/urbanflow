'use client';

import { useState } from 'react';
import { usePlaceSuggestions, type PlaceSuggestion } from '@/hooks/usePlaceSuggestions';
import type { CreateFavoriteAddressPayload } from '@urbanflow/types';

interface AddFavoriteAddressFormProps {
  onAdd: (payload: CreateFavoriteAddressPayload) => void;
  onCancel: () => void;
}

export function AddFavoriteAddressForm({ onAdd, onCancel }: AddFavoriteAddressFormProps) {
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const { suggestions, clear } = usePlaceSuggestions(selectedPlace ? '' : query);

  function selectPlace(place: PlaceSuggestion) {
    setQuery(place.name);
    setSelectedPlace(place);
    clear();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !selectedPlace) return;
    onAdd({ label: label.trim(), address: selectedPlace.name, lat: selectedPlace.lat, lng: selectedPlace.lng });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 py-3">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Libellé (ex. Salle de sport)"
        aria-label="Libellé de l'adresse"
        maxLength={100}
        className="rounded-[8px] border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A5F7A] dark:border-divider dark:bg-surface dark:text-text-main"
      />
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedPlace(null);
          }}
          placeholder="Rechercher une adresse"
          aria-label="Adresse"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          autoComplete="off"
          className="w-full rounded-[8px] border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A5F7A] dark:border-divider dark:bg-surface dark:text-text-main"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-lg dark:border-divider dark:bg-surface">
            {suggestions.map((place, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectPlace(place)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:text-text-main dark:hover:bg-divider/40"
              >
                {place.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!label.trim() || !selectedPlace}
          className="flex-1 rounded-[8px] bg-[#1A5F7A] py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Ajouter
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-[8px] border border-gray-200 py-2 text-sm font-medium text-[#6B7280] dark:border-divider dark:text-muted"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
