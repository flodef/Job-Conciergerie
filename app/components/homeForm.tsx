'use client';

import { clsx } from 'clsx/lite';
import Image from 'next/image';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useHomes } from '../contexts/homesProvider';
import { HomeData } from '../types/types';
import FormActions from './formActions';
import FullScreenModal from './fullScreenModal';
import TaskList from './taskList';
import { ToastMessage, ToastProps, ToastType } from './toastMessage';

type HomeFormProps = {
  onClose: () => void;
  home?: HomeData;
  mode?: 'add' | 'edit';
};

export default function HomeForm({ onClose, home, mode = 'add' }: HomeFormProps) {
  const { addHome, updateHome, homeExists } = useHomes();

  // Default mockup image path
  const mockupImagePath = '/home.webp';

  const [title, setTitle] = useState(home?.title || '');
  const [description, setDescription] = useState(home?.description || '');
  const [tasks, setTasks] = useState<string[]>(home?.tasks || ['']);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(home?.images || []);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>();
  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [isFormChanged, setIsFormChanged] = useState(false);

  const isFormValid = useMemo(
    () =>
      (images.length > 0 || existingImages.length > 0) &&
      description.trim() !== '' &&
      tasks.some(task => task.trim() !== '') &&
      title.trim() !== '',
    [images, existingImages, description, tasks, title],
  );

  useEffect(() => {
    if (isFormValid) setIsFormSubmitted(false);
  }, [isFormValid]);

  // Check if form has been modified
  const checkFormChanged = useCallback(() => {
    if (mode === 'add' || !home) return true; // Always enable save button for new homes

    // For edit mode, check if any field has changed
    const titleChanged = title !== home.title;
    const descriptionChanged = description !== home.description;
    const tasksChanged = JSON.stringify(tasks) !== JSON.stringify(home.tasks);
    const imagesChanged = images.length > 0 || JSON.stringify(existingImages) !== JSON.stringify(home.images);

    return titleChanged || descriptionChanged || tasksChanged || imagesChanged;
  }, [title, description, tasks, images, existingImages, mode, home]);

  // Update isFormChanged whenever form fields change
  useEffect(() => {
    setIsFormChanged(checkFormChanged());
  }, [checkFormChanged]);

  useEffect(() => {
    const urls = images.map(image => URL.createObjectURL(image));
    setPreviewUrls(urls);

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    if (isFormValid) {
      try {
        // Always use the mockup image regardless of what was uploaded
        // Count how many images the user wanted to add
        const imageCount = existingImages.length + images.length;
        // Create an array with the mockup image repeated for each image the user wanted to add
        const imageUrls = Array(Math.max(1, imageCount)).fill(mockupImagePath);

        if (mode === 'add') {
          // Check for duplicate homes by title before adding
          if (homeExists(title)) {
            setToastMessage({
              type: ToastType.Warning,
              message: 'Un bien avec ce titre existe déjà',
            });
            return;
          }

          const result = addHome({
            title,
            description,
            tasks: tasks.filter(task => task.trim() !== ''),
            images: imageUrls,
          });

          if (result === false) {
            setToastMessage({ type: ToastType.Warning, message: 'Un bien avec ce titre existe déjà' });
            return;
          }

          setToastMessage({ type: ToastType.Success, message: 'Bien ajouté avec succès !' });
        } else {
          if (home) {
            // For edit mode, only check for duplicates if the title has changed
            if (title !== home.title) {
              if (homeExists(title)) {
                setToastMessage({ type: ToastType.Warning, message: 'Un bien avec ce titre existe déjà' });
                return;
              }
            }

            updateHome({
              ...home,
              title,
              description,
              tasks: tasks.filter(task => task.trim() !== ''),
              images: imageUrls,
            });
            setToastMessage({ type: ToastType.Success, message: 'Bien mis à jour avec succès !' });
          }
        }
      } catch (error) {
        console.error('Error:', error);
        setToastMessage({ type: ToastType.Error, message: 'Une erreur est survenue' });
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    e.target.value = ''; // Reset obligatoire pour permettre la re-sélection

    const duplicates = newFiles.some(newFile =>
      images.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size),
    );

    if (duplicates) {
      setToastMessage({ type: ToastType.Error, message: 'Cette photo existe déjà dans la sélection !' });
      return;
    }

    setImages(prev => [...prev, ...newFiles]);
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-md mx-auto">
      {selectedImageIndex !== undefined && (
        <FullScreenModal
          title={`Photo de ${title}`}
          imageUrl={
            selectedImageIndex < existingImages.length
              ? mockupImagePath // Use mockup for existing images
              : previewUrls[selectedImageIndex - existingImages.length] // Use preview for new images (UI only)
          }
          onClose={() => setSelectedImageIndex(undefined)}
        />
      )}

      {toastMessage && (
        <ToastMessage
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(undefined)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="text-base font-medium text-foreground">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-medium text-foreground">Photos</h2>
              {(existingImages.length > 0 || previewUrls.length > 0) && (
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
            </div>
          </label>
          <div className="grid grid-cols-3 gap-4">
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
              className="aspect-square flex items-center justify-center border-2 border-dashed border-foreground/30 rounded-lg hover:border-foreground/50 cursor-pointer transition-colors"
            >
              <span className="text-3xl text-foreground/50">+</span>
            </label>
          </div>
          <p className="text-xs text-light mt-2 text-center">
            Note: Les images sont remplacées par une image par défaut lors de l&apos;enregistrement
          </p>
        </div>

        <div>
          <label className="text-base font-medium text-foreground">
            <h2 className="mb-2">Titre</h2>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
              isFormSubmitted && title.trim() === '' && 'border-red-500',
            )}
            placeholder="Entrez le titre du bien..."
          />
        </div>

        <div>
          <label className="text-base font-medium text-foreground">
            <h2 className="mb-2">Description</h2>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={clsx(
              'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
              isFormSubmitted && description.trim() === '' && 'border-red-500',
            )}
            rows={4}
            placeholder="Décrivez les caractéristiques du bien..."
          />
        </div>

        <TaskList tasks={tasks} setTasks={setTasks} />

        {isFormSubmitted && (
          <div className="space-y-2 text-sm text-red-500 bg-background animate-pulse">
            {existingImages.length === 0 && images.length === 0 && <p>• Ajoutez au moins une photo</p>}
            {title.trim() === '' && <p>• Entrez un titre</p>}
            {description.trim() === '' && <p>• Remplissez la description</p>}
            {!tasks.some(t => t.trim() !== '') && <p>• Ajoutez au moins une tâche</p>}
          </div>
        )}

        <FormActions
          onCancel={onClose}
          submitText={mode === 'add' ? 'Ajouter' : 'Enregistrer'}
          submitType="submit"
          isSubmitting={isFormSubmitted && !isFormValid}
          disabled={mode === 'edit' && !isFormChanged}
        />
      </form>
    </div>
  );
}
