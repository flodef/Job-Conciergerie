'use client';

import { saveMissionReport } from '@/app/actions/missionReport';
import FormActions from '@/app/components/formActions';
import FullScreenModal from '@/app/components/fullScreenModal';
import ImageUploader from '@/app/components/imageUploader';
import TextArea from '@/app/components/textArea';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useToast } from '@/app/contexts/toastProvider';
import type { Employee, Mission } from '@/app/types/dataTypes';
import { EmailSender } from '@/app/utils/emailSender';
import { messageLengthRegex } from '@/app/utils/regex';
import { getUserKey } from '@/app/utils/user';
import { useRef, useState } from 'react';

const MAX_REPORT_IMAGES = 3;

type MissionReportModalProps = {
  mission: Mission;
  onClose: () => void;
};

export default function MissionReportModal({ mission, onClose }: MissionReportModalProps) {
  const { homes } = useHomes();
  const { userData, findConciergerie, isEmployee } = useAuth();
  const { showToast } = useToast();
  const home = homes.find(h => h.id === mission.homeId);

  const [content, setContent] = useState('');
  const [contentError, setContentError] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [hasPendingImages, setHasPendingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const imagesRef = useRef<HTMLInputElement>(null);
  const imageUploaderRef = useRef<{
    uploadAllPendingImages: (conciergerieName: string, houseTitle: string) => Promise<string[] | null>;
  }>(null);

  const handleSubmit = () => {
    if (!isEmployee || !userData) return;

    if (!content.trim() && !hasPendingImages && images.length === 0) {
      setContentError('Veuillez ajouter un commentaire ou une photo');
      return;
    }

    setIsSubmitting(true);

    const employeeId = getUserKey(userData);

    // Upload pending images first (report mode → Reports/<missionId> folder)
    imageUploaderRef.current
      ?.uploadAllPendingImages(mission.id, mission.id)
      .then(uploadedImages => {
        if (uploadedImages === null) throw new Error('Échec du téléversement des photos');
        const finalImages = uploadedImages ?? images;

        return saveMissionReport({
          missionId: mission.id,
          employeeId,
          content: content.trim(),
          images: finalImages,
        }).then(report => {
          if (!report) throw new Error('Échec de l’enregistrement du compte rendu');

          // Notify the conciergerie by email (best-effort, non-blocking for the user)
          const conciergerie = findConciergerie(mission.conciergerieName);
          if (home && conciergerie) {
            EmailSender.sendMissionReportEmail(mission, home, userData as Employee, conciergerie, {
              content: report.content,
              images: report.images,
            });
          }

          showToast({ type: ToastType.Success, message: 'Compte rendu envoyé à la conciergerie !' });
          onClose();
        });
      })
      .catch(error => {
        console.error('Error saving mission report:', error);
        showToast({ type: ToastType.Error, message: 'Erreur lors de l’envoi du compte rendu' });
        setIsSubmitting(false);
      });
  };

  const footer = (
    <FormActions
      submitText="Envoyer"
      onSubmit={handleSubmit}
      onCancel={onClose}
      submitType="button"
      isSubmitting={isSubmitting}
      disabled={isSubmitting}
    />
  );

  if (!home) return null;

  return (
    <FullScreenModal
      title="Compte rendu de mission"
      tooltip="Rédigez un compte rendu (commentaire et/ou photos) qui sera envoyé à la conciergerie"
      onClose={onClose}
      footer={footer}
      disabled={isSubmitting}
    >
      <div className="space-y-4 py-2">
        <TextArea
          id="report-content"
          label="Commentaire"
          value={content}
          onChange={setContent}
          error={contentError}
          onError={setContentError}
          placeholder="Décrivez le déroulé de la mission, les points d'attention, etc."
          rows={5}
          regex={messageLengthRegex}
          disabled={isSubmitting}
        />

        <ImageUploader
          id="report-images"
          label="Photos"
          ref={imageUploaderRef}
          imagesRef={imagesRef}
          imageIds={images}
          onImageIdsChange={setImages}
          onPendingImagesChange={setHasPendingImages}
          maxImages={MAX_REPORT_IMAGES}
          uploadMode="report"
          reportFolder={mission.id}
          error=""
          onError={() => {}}
          disabled={isSubmitting}
        />
      </div>
    </FullScreenModal>
  );
}
