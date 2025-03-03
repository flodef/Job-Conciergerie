'use client';

import { clsx } from 'clsx/lite';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useHomes } from '../contexts/homesProvider';
import { HomeData } from '../types/mission';
import { ToastMessage, ToastType } from './toastMessage';
import FullScreenImageModal from './fullScreenImageModal';
import TaskList from './taskList';

type HomeFormProps = {
  onClose: () => void;
  home?: HomeData;
  mode?: 'add' | 'edit';
};

export default function HomeForm({ onClose, home, mode = 'add' }: HomeFormProps) {
  const { addHome, updateHome } = useHomes();

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
  const [toastMessage, setToastMessage] = useState<{ type: ToastType; message: string }>();

  const isFormValid =
    (images.length > 0 || existingImages.length > 0) &&
    description.trim() !== '' &&
    tasks.some(task => task.trim() !== '') &&
    title.trim() !== '';

  useEffect(() => {
    if (isFormValid) setIsFormSubmitted(false);
  }, [images, existingImages, description, tasks, title, isFormValid]);

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
          addHome({
            title,
            description,
            tasks: tasks.filter(task => task.trim() !== ''),
            images: imageUrls,
          });
          setToastMessage({ type: ToastType.Success, message: 'Bien ajouté avec succès !' });
        } else {
          if (home) {
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

        setTimeout(() => {
          setToastMessage(undefined);
          onClose();
        }, 1500);
      } catch (error) {
        console.error('Error:', error);
        setToastMessage({ type: ToastType.Error, message: 'Une erreur est survenue' });
        setTimeout(() => setToastMessage(undefined), 3000);
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
      setTimeout(() => setToastMessage(undefined), 3000);
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
    <div className="max-w-md mx-auto p-6">
      {selectedImageIndex !== undefined && (
        <FullScreenImageModal
          url={
            selectedImageIndex < existingImages.length
              ? mockupImagePath // Use mockup for existing images
              : previewUrls[selectedImageIndex - existingImages.length] // Use preview for new images (UI only)
          }
          onClose={() => setSelectedImageIndex(undefined)}
        />
      )}

      {toastMessage && <ToastMessage type={toastMessage.type} message={toastMessage.message} />}

      <h2 className="text-xl font-bold text-foreground mb-4">{mode === 'add' ? 'Nouveau bien' : 'Modifier le bien'}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            Note: Les images sont remplacées par une image par défaut lors de l'enregistrement
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

        <div className="mb-2">
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

        <div className="flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-secondary rounded-lg hover:bg-gray-100">
            Annuler
          </button>
          <button
            type="submit"
            disabled={isFormSubmitted && !isFormValid}
            className={clsx(
              'px-4 py-2 rounded-lg transition-colors',
              !isFormSubmitted || isFormValid
                ? 'bg-primary text-foreground hover:bg-primary/90'
                : 'bg-primary/20 text-foreground/50',
              'disabled:opacity-75 disabled:cursor-not-allowed',
            )}
          >
            {mode === 'add' ? 'Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
