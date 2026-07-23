'use client';

import { useState } from 'react';
import { AvatarPicker } from './AvatarPicker';
import type { AvatarId } from '@urbanflow/types';

interface EditProfileFormProps {
  initialName: string;
  initialAvatarId: AvatarId | null;
  onSave: (payload: { name: string; avatarId: AvatarId | null }) => void;
  onCancel: () => void;
}

export function EditProfileForm({ initialName, initialAvatarId, onSave, onCancel }: EditProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [avatarId, setAvatarId] = useState<AvatarId | null>(initialAvatarId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), avatarId });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div>
        <label htmlFor="profile-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
          Nom
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          className="w-full rounded-[8px] border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1A5F7A] dark:border-divider dark:bg-surface dark:text-text-main"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
          Avatar
        </p>
        <AvatarPicker selected={avatarId} onSelect={setAvatarId} />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 rounded-[8px] bg-[#1A5F7A] py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Enregistrer
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
