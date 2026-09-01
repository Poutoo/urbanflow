'use client';

import { useEffect, useState } from 'react';
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
 *
 * Absente du DOM tant qu'aucune modification n'est en attente (pas juste
 * translatée hors écran) : sinon elle reste montée en permanence sur l'écran
 * Profil pour rien, et une transform mal calée peut laisser dépasser un
 * fragment sous la BottomNav même à l'état "caché".
 */
export function SaveBar({ visible, saving = false, onSave, onCancel }: SaveBarProps) {
  // Monté seulement quand `visible` est vrai ; l'entrée passe par un état
  // "entered" à part pour pouvoir démarrer hors écran puis glisser vers sa
  // position finale au montage, au lieu d'apparaître d'un coup.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!visible) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Confirmer les modifications"
      className={[
        'fixed inset-x-0 bottom-16 z-[2000] flex justify-center px-4 pb-3 transition-transform duration-200 ease-out',
        entered ? 'translate-y-0' : 'translate-y-full',
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
