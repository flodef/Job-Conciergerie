'use client';

import TextArea from '@/app/components/textArea';
import { updateHomeNotes } from '@/app/actions/home';
import { descriptionLengthRegex } from '@/app/utils/regex';
import type { Home } from '@/app/types/dataTypes';
import { useState } from 'react';

type HomeNotesModalProps = {
  home: Home;
  onClose: () => void;
  onSuccess?: (updatedHome: Home) => void;
};

export default function HomeNotesModal({ home, onClose, onSuccess }: HomeNotesModalProps) {
  const [notes, setNotes] = useState(home.notes || '');

  const handleSave = async () => {
    // Only save if the notes have changed
    if (notes === (home.notes || '')) {
      return;
    }
    try {
      const updatedHome = await updateHomeNotes(home.id, notes);
      if (updatedHome) {
        onSuccess?.(updatedHome);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const handleClose = () => {
    handleSave();
    onClose();
  };

  const handleDelete = async () => {
    // If the original note was empty, don't save anything to DB
    if (!home.notes) {
      setNotes('');
      onClose();
      return;
    }
    try {
      const updatedHome = await updateHomeNotes(home.id, undefined);
      if (updatedHome) {
        setNotes('');
        onSuccess?.(updatedHome);
        onClose();
      }
    } catch (error) {
      console.error('Error deleting notes:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="relative bg-background rounded-lg shadow-lg max-w-md w-full flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <TextArea
            id="home-notes"
            label={home.title}
            value={notes}
            onChange={setNotes}
            placeholder="Ajoutez vos notes ici..."
            error=""
            onError={() => {}}
            regex={descriptionLengthRegex}
            className="min-h-[300px]"
            rows={10}
            required
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
