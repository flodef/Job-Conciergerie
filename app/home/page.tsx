'use client';
import TaskList from '@/components/TaskList';
import { ToastMessage, ToastType } from '@/components/ToastMessage';
import FullScreenImageModal from '@/components/FullScreenImageModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { clsx } from 'clsx/lite';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AddHome() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [tasks, setTasks] = useState<string[]>(['']);
  const [title, setTitle] = useState('');
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>();
  const [toastMessage, setToastMessage] = useState<{ type: ToastType; message: string }>();
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const isFormValid =
    images.length > 0 && description.trim() !== '' && tasks.some(task => task.trim() !== '') && title.trim() !== '';

  useEffect(() => {
    if (isFormValid) setIsFormSubmitted(false);
  }, [images, description, tasks, title, isFormValid]);

  useEffect(() => {
    const urls = images.map(image => URL.createObjectURL(image));
    setPreviewUrls(urls);

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFormSubmitted(true);

    if (isFormValid) {
      console.log('published', { description, images, tasks, title });
      setToastMessage({ type: ToastType.Success, message: 'Annonce publiée avec succès !' });
      setTimeout(() => setToastMessage(undefined), 3000);

      // TODO: Store the values somewhere

      // Reset form
      setDescription('');
      setImages([]);
      setTasks(['']);
      setTitle('');
      setIsFormSubmitted(false);
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

  const hasUnsavedData = () => {
    return description.trim() !== '' || tasks.some(t => t.trim() !== '') || images.length > 0 || title.trim() !== '';
  };

  const handleClose = () => {
    if (hasUnsavedData()) {
      setShowConfirmClose(true);
    } else {
      router.push('/');
    }
  };

  const confirmNavigation = (confirm: boolean) => {
    setShowConfirmClose(false);
    if (confirm) router.push('/');
  };

  return (
    <div className="max-w-md mx-auto p-4">
      {selectedImageIndex !== undefined && (
        <FullScreenImageModal url={previewUrls[selectedImageIndex]} onClose={() => setSelectedImageIndex(undefined)} />
      )}
      {toastMessage && <ToastMessage type={toastMessage.type} message={toastMessage.message} />}
      <ConfirmationModal
        isOpen={showConfirmClose}
        onConfirm={() => confirmNavigation(true)}
        onCancel={() => confirmNavigation(false)}
        title="Modifications non enregistrées"
        message="Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?"
        confirmText="Quitter"
        cancelText="Annuler"
      />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-foreground">Nouveau bien</h1>
        <button className="text-foreground text-4xl hover:scale-110 transition-transform" onClick={handleClose}>
          &times;
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-base font-medium text-foreground">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-medium text-foreground">Ajouter des photos</h2>
              {previewUrls.length > 1 && (
                <button type="button" onClick={() => setImages([])} className="text-sm text-red-500 hover:text-red-600">
                  Tout supprimer
                </button>
              )}
            </div>
          </label>
          <div className="grid grid-cols-3 gap-4">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative aspect-square">
                <Image
                  src={url}
                  alt={`Prévisualisation ${index + 1}`}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImageIndex(index)}
                />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, i) => i !== index))}
                  className="absolute p-3 -top-2 -right-2 bg-red-500 text-lg text-background rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
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
            )}
            rows={4}
            placeholder="Décrivez les caractéristiques du bien..."
          />
        </div>
        <TaskList tasks={tasks} setTasks={setTasks} />
        {isFormSubmitted && (
          <div className="space-y-2 text-sm text-red-500 bg-background animate-pulse">
            {images.length === 0 && <p>• Ajoutez au moins une photo</p>}
            {title.trim() === '' && <p>• Entrez un titre</p>}
            {description.trim() === '' && <p>• Remplissez la description</p>}
            {!tasks.some(t => t.trim() !== '') && <p>• Ajoutez au moins une tâche</p>}
          </div>
        )}
        <button
          type="submit"
          disabled={isFormSubmitted}
          className={clsx(
            'w-full px-4 py-2 rounded-lg font-medium transition-colors',
            !isFormSubmitted || isFormValid
              ? 'bg-primary text-foreground hover:bg-primary/90'
              : 'bg-primary/20 text-foreground/50',
            'disabled:opacity-75 disabled:cursor-not-allowed',
          )}
        >
          Publier le bien
        </button>
      </form>
    </div>
  );
}
