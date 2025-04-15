'use client';

import Combobox from '@/app/components/combobox';
import ConfirmationModal from '@/app/components/confirmationModal';
import FormActions from '@/app/components/formActions';
import { FullScreenImageCarousel } from '@/app/components/fullScreenImageCarousel';
import FullScreenModal from '@/app/components/fullScreenModal';
import ImageUploader from '@/app/components/imageUploader';
import Input from '@/app/components/input';
import ObjectiveList from '@/app/components/objectiveList';
import Select from '@/app/components/select';
import TextArea from '@/app/components/textArea';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import geographicZones from '@/app/data/geographicZone.json';
import { Home } from '@/app/types/dataTypes';
import { ErrorField } from '@/app/types/types';
import { handleChange } from '@/app/utils/form';
import { getMaxLength, inputLengthRegex, messageLengthRegex } from '@/app/utils/regex';
import { range } from '@/app/utils/select';
import { useCallback, useEffect, useRef, useState } from 'react';

type HomeFormProps = {
  onClose: () => void;
  onCancel?: () => void;
  home?: Home;
  mode: 'add' | 'edit';
};

export default function HomeForm({ onClose, onCancel, home, mode = 'add' }: HomeFormProps) {
  const { addHome, updateHome, homeExists } = useHomes();
  const { conciergerieName } = useAuth();

  const imageUploaderRef = useRef<{
    uploadAllPendingImages: (conciergerieName: string, houseTitle: string) => Promise<string[] | null>;
  }>(null);
  const [hasPendingImages, setHasPendingImages] = useState(false);

  const [title, setTitle] = useState(home?.title || '');
  const [description, setDescription] = useState(home?.description || '');
  const [objectives, setObjectives] = useState<string[]>(home?.objectives || ['']);
  const [images, setImages] = useState<string[]>(home?.images || []);
  const [geographicZone, setGeographicZone] = useState<string>(home?.geographicZone || '');
  const [hoursOfCleaning, setHoursOfCleaning] = useState<number>(home?.hoursOfCleaning || 0);
  const [hoursOfGardening, setHoursOfGardening] = useState<number>(home?.hoursOfGardening || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>();
  const [toast, setToast] = useState<Toast>();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<{
    title: string;
    description: string;
    objectives: string[];
    geographicZone: string;
    hoursOfCleaning: number;
    hoursOfGardening: number;
  }>();

  // Validation states
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [geographicZoneError, setGeographicZoneError] = useState('');
  const [objectivesError, setObjectivesError] = useState('');
  const [imagesError, setImagesError] = useState('');

  // Refs for form elements
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const geographicZoneRef = useRef<HTMLInputElement>(null);
  const objectivesRef = useRef<HTMLTextAreaElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);

  // Constants for validation
  const MAX_OBJECTIVES = 30;
  const MAX_PHOTOS = 9;

  // Load geographic zones from JSON file
  useEffect(() => {
    // Save initial form state for comparison
    setInitialFormValues({
      title,
      description,
      objectives: [...objectives],
      geographicZone,
      hoursOfCleaning,
      hoursOfGardening,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if form has been modified
  const checkFormChanged = useCallback(() => {
    if (!initialFormValues) return false;

    // Check if any field has been filled in compared to initial state
    const titleChanged = title !== initialFormValues.title;
    const descriptionChanged = description !== initialFormValues.description;
    const objectivesChanged = JSON.stringify(objectives) !== JSON.stringify(initialFormValues.objectives);
    const imagesChanged = hasPendingImages;
    const geographicZoneChanged = geographicZone !== initialFormValues.geographicZone;
    const hoursOfCleaningChanged = hoursOfCleaning !== initialFormValues.hoursOfCleaning;
    const hoursOfGardeningChanged = hoursOfGardening !== initialFormValues.hoursOfGardening;

    return (
      titleChanged ||
      descriptionChanged ||
      objectivesChanged ||
      imagesChanged ||
      geographicZoneChanged ||
      hoursOfCleaningChanged ||
      hoursOfGardeningChanged
    );
  }, [
    title,
    description,
    objectives,
    hasPendingImages,
    geographicZone,
    hoursOfCleaning,
    hoursOfGardening,
    initialFormValues,
  ]);

  const closeAndCancel = () => {
    onClose();
    onCancel?.();
  };

  const handleCancel = () => {
    if (checkFormChanged()) setShowConfirmDialog(true);
    else closeAndCancel();
  };

  const handleClose = () => {
    if (checkFormChanged()) setShowConfirmDialog(true);
    else onClose();
  };

  // Check for duplicate objectives in the list
  const hasDuplicateObjectives = () => {
    // Get all non-empty objectives
    const nonEmptyObjectives = objectives.filter(obj => obj.trim() !== '').map(obj => obj.trim().toLowerCase());
    // Check for duplicates
    return new Set(nonEmptyObjectives).size !== nonEmptyObjectives.length;
  };

  const handleSubmit = async () => {
    let error: ErrorField | undefined;

    // Check if we have either uploaded images or pending local images
    if (images.length === 0 && !hasPendingImages)
      error = {
        message: 'Veuillez ajouter au moins une photo',
        fieldRef: imagesRef,
        func: setImagesError,
      };
    else if (!title.trim())
      error = {
        message: 'Veuillez saisir un titre',
        fieldRef: titleRef,
        func: setTitleError,
      };
    else if (title.length > getMaxLength(inputLengthRegex))
      error = {
        message: `Le titre ne peut pas dépasser ${getMaxLength(inputLengthRegex)} caractères`,
        fieldRef: titleRef,
        func: setTitleError,
      };
    else if (!geographicZone.trim())
      error = {
        message: 'Veuillez sélectionner une zone géographique',
        fieldRef: geographicZoneRef,
        func: setGeographicZoneError,
      };
    else if (!description.trim())
      error = {
        message: 'Veuillez remplir la description',
        fieldRef: descriptionRef,
        func: setDescriptionError,
      };
    else if (description.length > getMaxLength(messageLengthRegex))
      error = {
        message: `La description ne peut pas dépasser ${getMaxLength(messageLengthRegex)} caractères`,
        fieldRef: descriptionRef,
        func: setDescriptionError,
      };
    else if (!objectives.some(objective => objective.trim() !== ''))
      error = {
        message: 'Veuillez ajouter au moins un objectif',
        fieldRef: objectivesRef,
        func: setObjectivesError,
      };
    else if (hasDuplicateObjectives())
      error = {
        message: 'Des points particuliers identiques ont été détectés',
        fieldRef: objectivesRef,
        func: setObjectivesError,
      };

    try {
      setIsSubmitting(true);

      if (error) {
        error.fieldRef.current?.focus();
        error.func(error.message);
        throw new Error(error.message);
      }

      // Upload all pending images first
      const imageCIDs = (await imageUploaderRef.current?.uploadAllPendingImages(conciergerieName || '', title)) || [];
      if (!imageCIDs.length) throw new Error('Échec du téléversement des images');

      if (mode === 'add') {
        // Check for duplicate homes by title before adding
        if (homeExists(title)) throw new Error('Un bien avec ce titre existe déjà');

        const result = await addHome({
          title,
          description,
          objectives: objectives.filter(objective => objective.trim() !== ''),
          images: imageCIDs, // Use the CIDs from the upload
          geographicZone,
          hoursOfCleaning,
          hoursOfGardening,
        });
        if (!result) throw new Error("Impossible d'ajouter le bien");

        setToast({ type: ToastType.Success, message: 'Bien ajouté avec succès !' });
      } else if (home) {
        // For edit mode, only check for duplicates if the title has changed
        if (title !== home.title && homeExists(title, home.id)) throw new Error('Un bien avec ce titre existe déjà');

        const result = await updateHome({
          ...home,
          title,
          description,
          objectives: objectives.filter(objective => objective.trim() !== ''),
          images: imageCIDs,
          geographicZone,
          hoursOfCleaning,
          hoursOfGardening,
        });
        if (!result) throw new Error('Impossible de mettre à jour le bien');

        setToast({ type: ToastType.Success, message: 'Bien mis à jour avec succès !' });
      }
    } catch (error) {
      setToast({ type: ToastType.Error, message: String(error), error });
      setIsSubmitting(false);
    }
  };

  const footer = (
    <FormActions
      submitText={mode === 'add' ? 'Ajouter' : 'Enregistrer'}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isSubmitting={isSubmitting}
      disabled={!checkFormChanged()}
    />
  );

  if (selectedImageIndex !== undefined && selectedImageIndex < images.length) {
    return (
      <FullScreenImageCarousel
        altPrefix={`Photo de ${title}`}
        imageUrls={images}
        startIndex={selectedImageIndex}
        onClose={() => setSelectedImageIndex(undefined)}
      />
    );
  }

  return (
    <>
      <ToastMessage
        toast={toast}
        onClose={() => {
          setToast(undefined);
          if (toast?.type === ToastType.Success) closeAndCancel();
        }}
      />

      <FullScreenModal
        title={mode === 'add' ? 'Ajouter un bien' : 'Modifier le bien'}
        onClose={handleClose}
        disabled={isSubmitting}
        footer={footer}
      >
        <form onSubmit={handleSubmit} className="space-y-2">
          <ImageUploader
            id="images"
            label="Photos"
            ref={imageUploaderRef}
            imagesRef={imagesRef}
            imageIds={images}
            onImageIdsChange={setImages}
            onPendingImagesChange={setHasPendingImages}
            maxImages={MAX_PHOTOS}
            error={imagesError}
            onError={setImagesError}
            disabled={isSubmitting}
            required
          />

          <Input
            id="title"
            label="Titre"
            ref={titleRef}
            value={title}
            onChange={setTitle}
            error={titleError}
            onError={setTitleError}
            disabled={isSubmitting}
            placeholder="Entrez le titre du bien..."
            required
          />

          <Combobox
            id="geographic-zone"
            label="Zone"
            ref={geographicZoneRef}
            className="max-w-2/3"
            options={geographicZones}
            value={geographicZone}
            onChange={e => handleChange(e, setGeographicZone, setGeographicZoneError)}
            placeholder="Sélectionnez zone"
            disabled={isSubmitting}
            error={geographicZoneError}
            required
            row
          />

          <TextArea
            id="description"
            label="Description"
            ref={descriptionRef}
            value={description}
            onChange={setDescription}
            error={descriptionError}
            onError={setDescriptionError}
            disabled={isSubmitting}
            placeholder="Décrivez les caractéristiques du bien..."
            required
          />

          <Select
            id="hours-of-cleaning"
            label="Heures de ménage"
            className="max-w-1/3"
            value={hoursOfCleaning}
            onChange={value => setHoursOfCleaning(Number(value))}
            options={range(0, 7, 0.5)}
            disabled={isSubmitting}
            placeholder="Nombre d'heures"
            required
            row
          />

          <Select
            id="hours-of-gardening"
            label="Heures de jardinage"
            value={hoursOfGardening}
            className="max-w-1/3"
            onChange={value => setHoursOfGardening(Number(value))}
            options={range(0, 7, 0.5)}
            disabled={isSubmitting}
            placeholder="Nombre d'heures"
            required
            row
          />

          <ObjectiveList
            id="objectives"
            label="Points particuliers"
            ref={objectivesRef}
            objectives={objectives}
            setObjectives={e => {
              setObjectives(e);
              setObjectivesError('');
            }}
            maxObjectives={MAX_OBJECTIVES}
            disabled={isSubmitting}
            error={objectivesError}
          />

          <ConfirmationModal
            isOpen={showConfirmDialog}
            onClose={() => setShowConfirmDialog(false)}
            onConfirm={() => {
              onClose();
            }}
            title="Modifications non enregistrées"
            message="Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter sans enregistrer ?"
            confirmText="Quitter sans enregistrer"
            cancelText="Continuer l'édition"
          />
        </form>
      </FullScreenModal>
    </>
  );
}
