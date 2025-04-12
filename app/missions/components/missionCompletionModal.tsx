'use client';

import Checkbox from '@/app/components/checkbox';
import FormActions from '@/app/components/formActions';
import FullScreenModal from '@/app/components/fullScreenModal';
import { useHomes } from '@/app/contexts/homesProvider';
import { Mission } from '@/app/types/dataTypes';
import { useEffect, useState } from 'react';

type MissionCompletionModalProps = {
  mission: Mission;
  onClose: () => void;
  onComplete: () => void;
};

export default function MissionCompletionModal({ mission, onClose, onComplete }: MissionCompletionModalProps) {
  const { homes } = useHomes();
  const home = homes.find(h => h.id === mission.homeId);

  // State to track which objectives are checked
  const [checkedObjectives, setCheckedObjectives] = useState<Record<string, boolean>>({});
  const [allChecked, setAllChecked] = useState(false);

  // Set up the initial state
  useEffect(() => {
    if (home && home.objectives) {
      const initialState = home.objectives.reduce((acc, objective) => {
        acc[objective] = false;
        return acc;
      }, {} as Record<string, boolean>);

      setCheckedObjectives(initialState);
    }
  }, [home]);

  // Check if all objectives are checked
  useEffect(() => {
    const isAllChecked = home?.objectives?.every(objective => checkedObjectives[objective]) || false;
    setAllChecked(isAllChecked);
  }, [checkedObjectives, home]);

  // Handle checkbox change
  const handleCheckboxChange = (objective: string) => {
    setCheckedObjectives(prev => ({
      ...prev,
      [objective]: !prev[objective],
    }));
  };

  const handleConfirm = () => {
    // Call the onComplete callback when all objectives are completed
    onComplete();
    onClose();
  };

  const footer = (
    <FormActions
      submitText="Confirmer"
      onSubmit={handleConfirm}
      onCancel={onClose}
      isSubmitting={false}
      disabled={!allChecked}
    />
  );

  if (!home) return null;

  return (
    <FullScreenModal title="Points particuliers" onClose={onClose} footer={footer}>
      <div className="py-2">
        <p className="text-foreground mb-4 text-center">
          Veuillez confirmer que tous les points particuliers suivants ont été réalisés :
        </p>
        <ul className="space-y-3">
          {home.objectives.map((objective, index) => (
            <li key={index} className="flex items-start gap-2">
              <Checkbox
                id={`objective-${index}`}
                checked={checkedObjectives[objective] || false}
                onChange={() => handleCheckboxChange(objective)}
                labelClassName={`flex-1 ${checkedObjectives[objective] ? 'line-through text-gray-500' : 'text-foreground'}`}
                label={objective}
              />
            </li>
          ))}
        </ul>
      </div>
    </FullScreenModal>
  );
}
