'use client';

import Combobox from '@/app/components/combobox';
import FormActions from '@/app/components/formActions';
import { FullScreenImageCarousel } from '@/app/components/fullScreenImageCarousel';
import FullScreenModal from '@/app/components/fullScreenModal';
import ImageUploader from '@/app/components/imageUploader';
import Input from '@/app/components/input';
import ObjectiveList from '@/app/components/objectiveList';
import Select from '@/app/components/select';
import Switch from '@/app/components/switch';
import TextArea from '@/app/components/textArea';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useToast } from '@/app/contexts/toastProvider';
import geographicZones from '@/app/data/geographicZone.json';
import { useUnsavedChangesConfirmation } from '@/app/hooks/useUnsavedChangesConfirmation';
import type { Home } from '@/app/types/dataTypes';
import type { ErrorField, UpdateMode } from '@/app/types/types';
import { descriptionLengthRegex } from '@/app/utils/regex';
import { range } from '@/app/utils/select';
import { useCallback, useEffect, useRef, useState } from 'react';

// Constants for validation
export const MAX_TRAVELLERS = 8;
const MAX_OBJECTIVES = 30;
const MAX_PHOTOS = 9;

type HomeFormProps = {
  onClose: () => void;
  onCancel?: () => void;
  home?: Home;
  mode: UpdateMode;
  skipAnimation?: boolean;
  forceRecalc?: boolean;
};

export default function HomeForm({
  onClose,
  onCancel,
  home,
  mode = 'add',
  skipAnimation = false,
  forceRecalc = false,
}: HomeFormProps) {
  const { addHome, updateHome, homeExists } = useHomes();
  const { conciergerieName } = useAuth();
  const { showToast } = useToast();

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
  const [allowDuo, setAllowDuo] = useState<boolean>(home?.allowDuo ?? false);
  const [maxTravellers, setMaxTravellers] = useState<number>(home?.maxTravellers ?? 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>();
  const [initialFormValues, setInitialFormValues] = useState<{
    title: string;
    description: string;
    objectives: string[];
    images: string[];
    geographicZone: string;
    hoursOfCleaning: number;
    hoursOfGardening: number;
    allowDuo: boolean;
    maxTravellers: number;
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

  // Helper function to reset form to initial values
  const resetFormToInitialValues = useCallback(() => {
    setIsSubmitting(false);
    setTitleError('');
    setDescriptionError('');
    setGeographicZoneError('');
    setObjectivesError('');
    setImagesError('');
    const initialTitle = home?.title || '';
    const initialDescription = home?.description || '';
    const initialObjectives = home?.objectives || [''];
    const initialImages = home?.images || [];
    const initialGeographicZone = home?.geographicZone || '';
    const initialHoursOfCleaning = home?.hoursOfCleaning || 0;
    const initialHoursOfGardening = home?.hoursOfGardening || 0;
    const initialAllowDuo = home?.allowDuo ?? false;
    const initialMaxTravellers = home?.maxTravellers ?? 1;
    setTitle(initialTitle);
    setDescription(initialDescription);
    setObjectives(initialObjectives);
    setImages(initialImages);
    setGeographicZone(initialGeographicZone);
    setHoursOfCleaning(initialHoursOfCleaning);
    setHoursOfGardening(initialHoursOfGardening);
    setAllowDuo(initialAllowDuo);
    setMaxTravellers(initialMaxTravellers);
    setInitialFormValues({
      title: initialTitle,
      description: initialDescription,
      objectives: [...initialObjectives],
      images: [...initialImages],
      geographicZone: initialGeographicZone,
      hoursOfCleaning: initialHoursOfCleaning,
      hoursOfGardening: initialHoursOfGardening,
      allowDuo: initialAllowDuo,
      maxTravellers: initialMaxTravellers,
    });
    titleRef.current?.focus();
  }, [home]);

  // Initialize form values on mount
  useEffect(() => {
    resetFormToInitialValues();
  }, [resetFormToInitialValues]);

  // Check if form has been modified
  const checkFormChanged = useCallback(() => {
    if (!initialFormValues) return false;

    // Check if any field has been filled in compared to initial state
    const titleChanged = title !== initialFormValues.title;
    const descriptionChanged = description !== initialFormValues.description;
    const objectivesChanged = JSON.stringify(objectives) !== JSON.stringify(initialFormValues.objectives);
    const imagesChanged = JSON.stringify(images) !== JSON.stringify(initialFormValues.images) || hasPendingImages;
    const geographicZoneChanged = geographicZone !== initialFormValues.geographicZone;
    const hoursOfCleaningChanged = hoursOfCleaning !== initialFormValues.hoursOfCleaning;
    const hoursOfGardeningChanged = hoursOfGardening !== initialFormValues.hoursOfGardening;
    const allowDuoChanged = allowDuo !== initialFormValues.allowDuo;
    const maxTravellersChanged = maxTravellers !== initialFormValues.maxTravellers;

    return (
      titleChanged ||
      descriptionChanged ||
      objectivesChanged ||
      imagesChanged ||
      geographicZoneChanged ||
      hoursOfCleaningChanged ||
      hoursOfGardeningChanged ||
      allowDuoChanged ||
      maxTravellersChanged
    );
  }, [
    title,
    description,
    objectives,
    images,
    hasPendingImages,
    geographicZone,
    hoursOfCleaning,
    hoursOfGardening,
    allowDuo,
    maxTravellers,
    initialFormValues,
  ]);

  const { handleCancel, handleClose, closeAndCancel } = useUnsavedChangesConfirmation({
    checkFormChanged,
    onClose: () => {
      resetFormToInitialValues();
      onClose();
    },
    onCancel: () => {
      resetFormToInitialValues();
      onCancel?.();
    },
  });

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
          images: imageCIDs,
          geographicZone,
          hoursOfCleaning,
          hoursOfGardening,
          allowDuo,
          maxTravellers,
        });
        if (!result) throw new Error("Impossible d'ajouter le bien");

        showToast({ type: ToastType.Success, message: 'Bien ajouté avec succès !' });
        resetFormToInitialValues();
        closeAndCancel();
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
          allowDuo,
          maxTravellers,
        });
        if (!result) throw new Error('Impossible de mettre à jour le bien');

        showToast({ type: ToastType.Success, message: 'Bien mis à jour avec succès !' });
        resetFormToInitialValues();
        closeAndCancel();
      }
    } catch (error) {
      showToast({ type: ToastType.Error, message: String(error), error });
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
        initialIndex={selectedImageIndex}
        onClose={() => setSelectedImageIndex(undefined)}
      />
    );
  }

  return (
    <FullScreenModal
      title={mode === 'add' ? 'Ajouter un bien' : 'Modifier le bien'}
      onClose={handleClose}
      disabled={isSubmitting}
      skipAnimation={skipAnimation}
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
          onChange={value => setTitle(value.trim())}
          error={titleError}
          onError={setTitleError}
          disabled={isSubmitting}
          placeholder="Entrez le titre du bien..."
          required
          row
        />

        <Combobox
          id="geographic-zone"
          label="Zone"
          ref={geographicZoneRef}
          className="max-w-2/3"
          options={geographicZones}
          value={geographicZone}
          onChange={setGeographicZone}
          placeholder="Sélectionnez zone"
          disabled={isSubmitting}
          error={geographicZoneError}
          onError={setGeographicZoneError}
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
          regex={descriptionLengthRegex}
          required
          forceRecalc={forceRecalc}
        />

        <Select
          id="hours-of-cleaning"
          label="Heures de ménage"
          className="max-w-20"
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
          className="max-w-20"
          onChange={value => setHoursOfGardening(Number(value))}
          options={range(0, 7, 0.5)}
          disabled={isSubmitting}
          placeholder="Nombre d'heures"
          required
          row
        />

        <Select
          id="max-travellers"
          label="Nombre maximum de voyageurs"
          value={maxTravellers}
          className="max-w-20"
          onChange={value => setMaxTravellers(Number(value))}
          options={range(1, MAX_TRAVELLERS)}
          disabled={isSubmitting}
          placeholder="Nombre de voyageurs"
          required
          row
        />

        <Switch id="allow-duo" label="Autoriser binôme" enabled={allowDuo} onToggle={setAllowDuo} />

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
          forceRecalc={forceRecalc}
        />
      </form>
    </FullScreenModal>
  );
}
