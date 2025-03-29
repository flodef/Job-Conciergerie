'use client';

import Combobox from '@/app/components/combobox';
import ConfirmationModal from '@/app/components/confirmationModal';
import FormActions from '@/app/components/formActions';
import FullScreenModal from '@/app/components/fullScreenModal';
import Input from '@/app/components/input';
import Label from '@/app/components/label';
import ObjectiveList from '@/app/components/objectiveList';
import Select from '@/app/components/select';
import TextArea from '@/app/components/textArea';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useHomes } from '@/app/contexts/homesProvider';
import geographicZones from '@/app/data/geographicZone.json';
import { Home } from '@/app/types/dataTypes';
import { ErrorField } from '@/app/types/types';
import { errorClassName } from '@/app/utils/className';
import { handleChange } from '@/app/utils/form';
import { getMaxLength, inputLengthRegex, messageLengthRegex } from '@/app/utils/regex';
import { clsx } from 'clsx/lite';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

type HomeFormProps = {
  onClose: () => void;
  onCancel?: () => void;
  home?: Home;
  mode: 'add' | 'edit';
};

export default function HomeForm({ onClose, onCancel, home, mode = 'add' }: HomeFormProps) {
  const { addHome, updateHome, homeExists } = useHomes();

  // Default mockup image path
  const mockupImagePath = '/home.webp';

  const [title, setTitle] = useState(home?.title || '');
  const [description, setDescription] = useState(home?.description || '');
  const [objectives, setObjectives] = useState<string[]>(home?.objectives || ['']);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(home?.images || []);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [geographicZone, setGeographicZone] = useState<string>(home?.geographicZone || '');
  const [hoursOfCleaning, setHoursOfCleaning] = useState<number>(home?.hoursOfCleaning || 1);
  const [hoursOfGardening, setHoursOfGardening] = useState<number>(home?.hoursOfGardening || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>();
  const [toastMessage, setToastMessage] = useState<Toast>();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<{
    title: string;
    description: string;
    objectives: string[];
    geographicZone: string;
    images: string[];
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
  const objectivesRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);

  // Constants for validation
  const MAX_OBJECTIVES = 10;
  const MAX_PHOTOS = 9;

  // Load geographic zones from JSON file
  useEffect(() => {
    // Save initial form state for comparison
    setInitialFormValues({
      title,
      description,
      objectives: [...objectives],
      geographicZone,
      images: [...existingImages],
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
    const imagesChanged =
      images.length > 0 || JSON.stringify(existingImages) !== JSON.stringify(initialFormValues.images);
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
    images,
    existingImages,
    geographicZone,
    hoursOfCleaning,
    hoursOfGardening,
    initialFormValues,
  ]);

  useEffect(() => {
    const urls = images.map(image => URL.createObjectURL(image));
    setPreviewUrls(urls);

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleCancel = () => {
    if (checkFormChanged()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
      onCancel?.();
    }
  };

  // Check for duplicate objectives in the list
  const hasDuplicateObjectives = () => {
    // Get all non-empty objectives
    const nonEmptyObjectives = objectives.filter(obj => obj.trim() !== '').map(obj => obj.trim().toLowerCase());
    // Check for duplicates
    return new Set(nonEmptyObjectives).size !== nonEmptyObjectives.length;
  };

  const handleSubmit = () => {
    let error: ErrorField | undefined;

    if (images.length === 0 && existingImages.length === 0)
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
        message: 'Des objectifs identiques ont été détectés',
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

      // Always use the mockup image regardless of what was uploaded
      // Count how many images the user wanted to add
      const imageCount = existingImages.length + images.length;
      // Create an array with the mockup image repeated for each image the user wanted to add
      const imageUrls = Array(Math.max(1, imageCount)).fill(mockupImagePath);

      if (mode === 'add') {
        // Check for duplicate homes by title before adding
        if (homeExists(title)) throw new Error('Un bien avec ce titre existe déjà');

        const result = addHome({
          title,
          description,
          objectives: objectives.filter(objective => objective.trim() !== ''),
          images: imageUrls,
          geographicZone,
          hoursOfCleaning,
          hoursOfGardening,
        });
        if (!result) throw new Error("Impossible d'ajouter le bien");

        setToastMessage({ type: ToastType.Success, message: 'Bien ajouté avec succès !' });
      } else if (home) {
        // For edit mode, only check for duplicates if the title has changed
        if (title !== home.title && homeExists(title)) throw new Error('Un bien avec ce titre existe déjà');

        const result = updateHome({
          ...home,
          title,
          description,
          objectives: objectives.filter(objective => objective.trim() !== ''),
          images: imageUrls,
          geographicZone,
          hoursOfCleaning,
          hoursOfGardening,
        });
        if (!result) throw new Error('Impossible de mettre à jour le bien');

        setToastMessage({ type: ToastType.Success, message: 'Bien mis à jour avec succès !' });
      }
    } catch (error) {
      setToastMessage({ type: ToastType.Error, message: String(error), error });
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    e.target.value = ''; // Reset obligatoire pour permettre la re-sélection

    // Filter out duplicates
    const nonDuplicateFiles = newFiles.filter(
      newFile => !images.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size),
    );

    // Track if we found duplicates
    const hasDuplicates = nonDuplicateFiles.length < newFiles.length;

    // Calculate how many photos we can add without exceeding the limit
    const currentTotal = existingImages.length + images.length;
    const remainingSlots = Math.max(0, MAX_PHOTOS - currentTotal);
    const exceedsLimit = nonDuplicateFiles.length > remainingSlots;

    // Take only as many as we can fit
    const filesToAdd = nonDuplicateFiles.slice(0, remainingSlots);

    // Add the filtered files
    if (filesToAdd.length > 0) {
      setImages(prev => [...prev, ...filesToAdd]);
      setImagesError('');
    }

    const message = exceedsLimit
      ? `Vous ne pouvez pas ajouter plus de ${MAX_PHOTOS} photos au total`
      : hasDuplicates
      ? 'Certaines photos existent déjà dans la sélection !'
      : '';

    // Show appropriate toast message (prioritize the limit message)
    if (message) {
      setToastMessage({
        type: ToastType.Warning,
        message,
      });
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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

  if (selectedImageIndex !== undefined) {
    return (
      <FullScreenModal
        title={`Photo de ${title}`}
        imageUrl={
          selectedImageIndex < existingImages.length
            ? mockupImagePath // Use mockup for existing images
            : previewUrls[selectedImageIndex - existingImages.length] // Use preview for new images (UI only)
        }
        onClose={() => setSelectedImageIndex(undefined)}
      />
    );
  }

  return (
    <FullScreenModal title={mode === 'add' ? 'Ajouter un bien' : 'Modifier le bien'} onClose={onClose} footer={footer}>
      <ToastMessage
        toast={toastMessage}
        onClose={() => {
          setToastMessage(undefined);
          if (toastMessage?.type === ToastType.Success) {
            onClose();
            onCancel?.();
          }
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <Label id="images" required>
            <div className="flex justify-between items-center mb-1">
              Photos
              {(existingImages.length > 1 || previewUrls.length > 1) && (
                <button
                  type="button"
                  onClick={() => {
                    setImages([]);
                    setExistingImages([]);
                  }}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Tout supprimer
                </button>
              )}
              {/* Hack to focus the input when there is an error */}
              <input ref={imagesRef} type="text" className="h-0 w-0" />
            </div>
          </Label>
          <div className={clsx('grid grid-cols-3 gap-4', imagesError && 'border border-red-500 rounded-lg p-2')}>
            {/* Existing images */}
            {existingImages.map((url, index) => (
              <div key={`existing-${index}`} className="relative aspect-square">
                <Image
                  src={mockupImagePath} // Always use mockup for display
                  alt={`Prévisualisation ${index + 1}`}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImageIndex(index)}
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(index)}
                  className="absolute p-3 -top-2 -right-2 bg-red-500 text-lg text-background rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}

            {/* New images */}
            {previewUrls.map((url, index) => (
              <div key={`new-${index}`} className="relative aspect-square">
                <Image
                  src={url} // Use preview URL for UI only
                  alt={`Prévisualisation ${existingImages.length + index + 1}`}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImageIndex(existingImages.length + index)}
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute p-3 -top-2 -right-2 bg-red-500 text-lg text-background rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Upload button */}
            <input
              type="file"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className={clsx(
                'aspect-square flex items-center justify-center border-2 border-dashed border-foreground/30 rounded-lg hover:border-foreground/50 cursor-pointer transition-colors',
                images.length >= MAX_PHOTOS && 'hidden',
              )}
            >
              <span className="text-3xl text-foreground/50">+</span>
            </label>
          </div>
          {imagesError && <p className={errorClassName}>{imagesError}</p>}
          <p className="text-xs text-light mt-2 text-center">
            Note: Les images sont remplacées par une image par défaut lors de l&apos;enregistrement
          </p>
        </div>

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
          options={[1, 2, 3, 4, 5]}
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
          options={[1, 2, 3, 4, 5]}
          disabled={isSubmitting}
          placeholder="Nombre d'heures"
          required
          row
        />

        <ObjectiveList
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
  );
}
