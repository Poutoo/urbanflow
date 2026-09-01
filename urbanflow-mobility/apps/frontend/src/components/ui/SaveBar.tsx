'use client';

import { Button } from './Button';

interface SaveBarProps {
  visible: boolean;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Barre de confirmation qui se glisse depuis le bas de l'écran (au-dessus de
 * la navigation) quand des modifications non enregistrées existent. Rien
 * n'est persisté avant que "Enregistrer" ne soit pressé — "Annuler" doit
 * ramener les champs concernés à leur dernière valeur connue côté serveur.
 */
export function SaveBar({ visible, saving = false, onSave, onCancel }: SaveBarProps) {
  return (
    <div
      role="region"
      aria-label="Confirmer les modifications"
      aria-hidden={!visible}
      className={[
        'fixed inset-x-0 bottom-16 z-[2000] flex justify-center px-4 pb-3 transition-transform duration-200 ease-out',
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-[150%]',
      ].join(' ')}
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl bg-white p-3 shadow-xl dark:bg-surface dark:border dark:border-divider">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={onCancel}
          disabled={saving}
        >
          Annuler
        </Button>
        <Button type="button" size="sm" className="flex-1" onClick={onSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
