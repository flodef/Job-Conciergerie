'use client';

import Checkbox from '@/app/components/checkbox';
import ConfirmationModal from '@/app/components/confirmationModal';
import FormActions from '@/app/components/formActions';
import FullScreenModal from '@/app/components/fullScreenModal';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import type { Mission } from '@/app/types/dataTypes';
import { useEffect, useState } from 'react';
import MissionReportModal from './missionReportModal';

type MissionCompletionModalProps = {
  mission: Mission;
  onClose: () => void;
  onComplete: () => void;
  skipAnimation?: boolean;
};

export default function MissionCompletionModal({
  mission,
  onClose,
  onComplete,
  skipAnimation = false,
}: MissionCompletionModalProps) {
  const { homes } = useHomes();
  const { isEmployee } = useAuth();
  const home = homes.find(h => h.id === mission.homeId);

  // Flow steps: validate objectives → optionally ask for a report → fill the report
  const [step, setStep] = useState<'objectives' | 'askReport' | 'report'>('objectives');

  // State to track which objectives are checked
  const [checkedObjectives, setCheckedObjectives] = useState<Record<string, boolean>>({});
  const [allChecked, setAllChecked] = useState(false);

  // Set up the initial state
  useEffect(() => {
    if (home && home.objectives) {
      const initialState = home.objectives.reduce(
        (acc, objective) => {
          acc[objective] = false;
          return acc;
        },
        {} as Record<string, boolean>,
      );

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

  // Finalize: complete the mission in DB and close the whole flow.
  // Matches the original behaviour (onComplete + onClose) across all entry points.
  const finish = () => {
    onComplete();
    onClose();
  };

  const handleConfirm = () => {
    // Employees can optionally add a mission report before the mission is finalized.
    // Conciergeries finalize immediately.
    if (isEmployee) {
      setStep('askReport');
    } else {
      finish();
    }
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

  // Step 2: ask the employee whether they want to add a mission report.
  // "Non, merci" finalizes the mission without a report.
  if (step === 'askReport') {
    return (
      <ConfirmationModal
        isOpen
        title="Compte rendu de mission"
        message="Souhaitez-vous ajouter un compte rendu de cette mission (commentaire et/ou photos) à destination de la conciergerie ?"
        confirmText="Oui, ajouter"
        cancelText="Non, merci"
        onConfirm={() => setStep('report')}
        onCancel={finish}
      />
    );
  }

  // Step 3: fill in the mission report; finalizing happens on close (with or without a report)
  if (step === 'report') return <MissionReportModal mission={mission} onClose={finish} />;

  const checkedCount = Object.values(checkedObjectives).filter(Boolean).length;
  const totalCount = home.objectives.length;

  // Separate objectives into unchecked and checked
  const uncheckedObjectives = home.objectives.filter(objective => !checkedObjectives[objective]);
  const checkedObjectivesList = home.objectives.filter(objective => checkedObjectives[objective]);

  return (
    <FullScreenModal
      title={`Points particuliers (${checkedCount}/${totalCount})`}
      tooltip="Veuillez confirmer que tous les points particuliers suivants ont été réalisés"
      onClose={onClose}
      skipAnimation={skipAnimation}
      footer={footer}
      disabled={false}
    >
      <div className="py-2">
        <ul className="space-y-3">
          {uncheckedObjectives.map((objective, index) => (
            <li key={`unchecked-${index}`} className="flex items-start gap-2">
              <Checkbox
                id={`objective-${index}`}
                checked={checkedObjectives[objective] || false}
                onChange={() => handleCheckboxChange(objective)}
                labelClassName="flex-1 text-foreground"
                label={objective}
              />
            </li>
          ))}
        </ul>

        {checkedObjectivesList.length > 0 && uncheckedObjectives.length > 0 && (
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-secondary" />
            <span className="text-xs text-foreground/40 uppercase tracking-wide">Terminés</span>
            <div className="flex-1 h-px bg-secondary" />
          </div>
        )}

        {checkedObjectivesList.length > 0 && (
          <ul className="space-y-3">
            {checkedObjectivesList.map((objective, index) => (
              <li key={`checked-${index}`} className="flex items-start gap-2">
                <Checkbox
                  id={`objective-checked-${index}`}
                  checked={true}
                  onChange={() => handleCheckboxChange(objective)}
                  labelClassName="flex-1 line-through text-gray-500"
                  label={objective}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </FullScreenModal>
  );
}
