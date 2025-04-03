'use client';

import { deleteFileFromIPFS, uploadFileToIPFS } from '@/app/actions/ipfs';
import FullScreenModal from '@/app/components/fullScreenModal';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { errorClassName } from '@/app/utils/className';
import { extractCID, fallbackImage, getIPFSImageUrl } from '@/app/utils/ipfs';
import { IconCheck, IconPhotoPlus, IconX } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

// --- Constants ---
const MAX_FILE_SIZE_MB = 5;

// --- Interfaces ---
interface LocalImage {
  id: string; // Temporary ID for tracking
  file: File; // Original file object
  previewUrl: string; // Local blob URL for preview
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error'; // Upload status
}

export interface ImageUploaderProps {
  id: string;
  imagesRef: React.RefObject<HTMLInputElement | null>;
  imageIds: string[];
  onImageIdsChange: (cids: string[]) => void;
  onPendingImagesChange: (hasPendingImages: boolean) => void; // Notify parent about pending local images
  maxImages?: number;
  label?: string;
  required?: boolean;
  error: string;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

const ImageUploader = React.forwardRef<
  { uploadAllPendingImages: (conciergerieName: string, houseTitle: string) => Promise<string[] | null> },
  ImageUploaderProps
>(
  (
    {
      id,
      imagesRef,
      imageIds,
      onImageIdsChange,
      onPendingImagesChange,
      maxImages = 5, // Default max images
      label = 'Photos',
      required = false,
      error,
      onError,
      disabled,
      className,
    },
    ref,
  ) => {
    const inputFocusRef = useRef<HTMLInputElement>(null);
    const uploadButtonRef = useRef<HTMLInputElement>(null);

    const [toast, setToast] = useState<Toast>();

    const [localImages, setLocalImages] = useState<LocalImage[]>([]);
    const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | undefined>();
    const [imageIdsToRemove, setImageIdsToRemove] = useState<string[]>([]);
    const [hasChanged, setHasChanged] = useState(false);

    useEffect(() => {
      if (imagesRef && inputFocusRef.current) {
        imagesRef.current = inputFocusRef.current; // Link the parent's ref to the input
      }
    }, [imagesRef]);

    // Notify parent about pending local images
    useEffect(() => {
      onPendingImagesChange(localImages.length > 0);
    }, [localImages.length, onPendingImagesChange]);

    // Expose method to upload all pending images
    React.useImperativeHandle(ref, () => ({
      async uploadAllPendingImages(conciergerieName: string, houseTitle: string) {
        imageIdsToRemove.forEach(async img => {
          // Upload with progress tracking
          const result = await deleteFileFromIPFS(img);
          console.log(result);
        });

        if (localImages.length === 0) return imageIds; // No pending images to upload

        // Set all images to pending upload status
        setLocalImages(prev =>
          prev.map(img => ({
            ...img,
            uploadStatus: 'uploading',
          })),
        );

        console.warn('Uploading images...');

        // Upload images one by one
        const newCIDs: string[] = [];
        for (const image of localImages) {
          // Skip already failed images
          if (image.uploadStatus === 'success') continue;

          const fileName = `${conciergerieName}-${houseTitle}`;
          const compressedBlob = await compressImage(image.file);
          const file = new File([compressedBlob], fileName, {
            type: compressedBlob.type,
          });

          const result = await uploadFileToIPFS(file);
          setLocalImages(prev =>
            prev.map(img => (img.id === image.id ? { ...img, uploadStatus: result ? 'success' : 'error' } : img)),
          );

          if (!result) continue;

          newCIDs.push(result);
        }

        // Update committed CIDs with newly uploaded ones
        const allCIDs = [...imageIds, ...newCIDs];
        onImageIdsChange(allCIDs);

        // Keep only images that failed to upload
        setLocalImages(prev => prev.filter(img => img.uploadStatus !== 'success'));

        // Notify user of failed uploads
        return newCIDs.length === localImages.length ? allCIDs : null;
      },
    }));

    // Image compression using canvas
    const compressImage = async (file: File): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
          const img = document.createElement('img');
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
              console.error('Failed to get canvas context');
              return reject(new Error('Failed to get canvas context'));
            }

            let { width, height } = img;
            const MAX_DIMENSION = 1024; // Max width/height after resize

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
              if (width > height) {
                height *= MAX_DIMENSION / width;
                width = MAX_DIMENSION;
              } else {
                width *= MAX_DIMENSION / height;
                height = MAX_DIMENSION;
              }
            }

            canvas.width = width;
            canvas.height = height;
            context.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              blob => {
                if (blob) {
                  resolve(blob);
                } else {
                  console.error('Canvas toBlob failed');
                  reject(new Error('Canvas toBlob failed'));
                }
              },
              'image/jpeg',
              0.8, // Adjust quality (0.0 - 1.0)
            );
          };
          img.onerror = _e => {
            console.error('Failed to load image for compression', _e);
            reject(new Error('Failed to load image for compression'));
          };
        };
        reader.onerror = error => {
          console.error('File Reader error:', error);
          reject(error);
        };
      });
    };

    // File input handler
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      setHasChanged(true);

      // Convert FileList to array
      const newFiles = Array.from(files);

      // Filter out duplicates by comparing name and size
      const nonDuplicateFiles = newFiles.filter(
        newFile => !localImages.some(img => img.file.name === newFile.name && img.file.size === newFile.size),
      );

      // Track if we found duplicates
      const hasDuplicates = nonDuplicateFiles.length < newFiles.length;

      const currentImageCount = imageIds.length + localImages.length;
      const remainingSlots = maxImages - currentImageCount;
      const exceedsLimit = nonDuplicateFiles.length > remainingSlots;

      // Take only as many files as we can fit
      const filesToAdd = nonDuplicateFiles.slice(0, remainingSlots);

      // Show appropriate toast message (prioritize the limit message)
      const message = exceedsLimit
        ? `Vous ne pouvez pas ajouter plus de ${maxImages} photos au total`
        : hasDuplicates
        ? 'Certaines photos existent déjà dans la sélection !'
        : '';
      if (message)
        setToast({
          type: ToastType.Warning,
          message,
        });

      // If no files to add after filtering, return early
      if (filesToAdd.length === 0) {
        event.target.value = ''; // Reset file input
        return;
      }

      // Process each file to add
      for (const file of filesToAdd) {
        const fileSizeMB = file.size / 1024 / 1024;

        // Basic validation
        if (!file.type.startsWith('image/')) {
          setToast({
            type: ToastType.Warning,
            message: `Le fichier ${file.name} n&apos;est pas une image.`,
          });
          continue;
        }

        if (fileSizeMB > MAX_FILE_SIZE_MB) {
          setToast({
            type: ToastType.Warning,
            message: `Le fichier ${file.name} dépasse la taille maximale de ${MAX_FILE_SIZE_MB}MB.`,
          });
          continue;
        }

        const tempId = `${file.name}-${Date.now()}`;
        const previewUrl = URL.createObjectURL(file);

        // Add to local images
        setLocalImages(prev => [
          ...prev,
          {
            file,
            id: tempId,
            previewUrl,
            uploadStatus: 'pending',
          },
        ]);

        // Since we've added an image, we can clear any errors
        if (error) onError('');
      }

      event.target.value = ''; // Reset file input
    };

    // Delete handlers
    const handleDeleteCommitted = (imageId: string) => {
      // Add the deleted image to the images to remove
      setImageIdsToRemove(prev => (prev.includes(imageId) ? prev : [...prev, imageId]));

      // Remove from committed images
      const newCids = imageIds.filter(item => item !== imageId);
      onImageIdsChange(newCids);

      // Notify parent about pending local images
      onPendingImagesChange(newCids.length + localImages.length > 0);
      setHasChanged(true);
    };

    const handleDeleteLocal = (id: string) => {
      // Remove from local images
      setLocalImages(prev => {
        const imageToRemove = prev.find(img => img.id === id);
        if (imageToRemove?.previewUrl) {
          URL.revokeObjectURL(imageToRemove.previewUrl);
        }
        return prev.filter(img => img.id !== id);
      });
      setHasChanged(true);
    };

    const deleteAll = () => {
      imageIds.map(handleDeleteCommitted);
      localImages.map(i => handleDeleteLocal(i.id));
    };

    useEffect(() => {
      if (required && hasChanged && imageIds.length + localImages.length === 0)
        onError('Veuillez ajouter au moins une photo');
    }, [imageIds, localImages, required, onError, hasChanged]);

    // Calculate total images
    const totalImages = imageIds.length + localImages.length;

    return (
      <div className={className}>
        {toast && <ToastMessage toast={toast} onClose={() => setToast(undefined)} />}

        <div id="images">
          <div className="flex justify-between items-center mb-1">
            {label}
            <div>
              {imageIds.length + localImages.length > 1 && (
                <button type="button" onClick={deleteAll} className="text-sm text-red-500 hover:text-red-600">
                  Tout supprimer
                </button>
              )}
              {/* Hack to focus the input when there is an error */}
              <input ref={inputFocusRef} type="text" className="h-0 w-0" />
            </div>
          </div>
        </div>
        <div className={clsx('grid grid-cols-3 gap-4', error && 'border border-red-500 rounded-lg p-2')}>
          {/* Existing committed images */}
          {[...new Set(imageIds)].map((cidWithId, index) => {
            const url = getIPFSImageUrl(cidWithId);
            return (
              <div key={`committed-${cidWithId}-${index}`} className="relative aspect-square">
                <Image
                  src={url}
                  alt={`Image ${index + 1}`}
                  width={100}
                  height={100}
                  className="object-cover w-full h-full rounded-lg cursor-pointer"
                  onClick={() => !disabled && setFullscreenImageUrl(url)}
                  onError={e => {
                    console.warn(`Failed to load image from IPFS: ${extractCID(cidWithId)}`);
                    (e.target as HTMLImageElement).src = fallbackImage;
                  }}
                />

                {/* Progress, Success or Error indicator */}
                {disabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs rounded-lg">
                    <div className="p-1.5 text-white rounded-full bg-green-500">
                      <IconCheck size={32} />
                    </div>
                  </div>
                )}

                {/* Delete button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCommitted(cidWithId)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-background rounded-full hover:bg-red-600 transition-colors"
                    aria-label={`Supprimer l'image ${index + 1}`}
                  >
                    <IconX size={16} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Local images not yet uploaded */}
          {localImages.map((img, index) => (
            <div key={img.id} className="relative aspect-square">
              <Image
                src={img.previewUrl}
                alt={`Prévisualisation ${imageIds.length + index + 1}`}
                width={100}
                height={100}
                className="object-cover w-full h-full rounded-lg cursor-pointer"
                onClick={() => !disabled && setFullscreenImageUrl(img.previewUrl)}
              />

              {/* Progress, Success or Error indicator */}
              {img.uploadStatus !== 'pending' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs rounded-lg">
                  {img.uploadStatus === 'uploading' ? (
                    <LoadingSpinner size="large" fullPage={false} className="text-white" />
                  ) : (
                    <div
                      className={clsx(
                        'p-1.5 text-white rounded-full',
                        img.uploadStatus === 'success' ? 'bg-green-500' : 'bg-red-500',
                      )}
                    >
                      {img.uploadStatus === 'success' ? <IconCheck size={32} /> : <IconX size={32} />}
                    </div>
                  )}
                </div>
              )}

              {/* Delete button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleDeleteLocal(img.id)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-background rounded-full hover:bg-red-600 transition-colors"
                  aria-label={`Supprimer l'image ${imageIds.length + index + 1}`}
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
          ))}

          {/* Add image button */}
          {!disabled && totalImages < maxImages && (
            <>
              <button
                type="button"
                onClick={() => uploadButtonRef.current?.click()}
                className={clsx(
                  'aspect-square border-2 border-dashed border-secondary rounded-lg flex flex-col items-center justify-center text-foreground/50 hover:border-primary hover:text-primary transition-colors',
                )}
                aria-label="Ajouter une image"
              >
                <IconPhotoPlus size={26} />
              </button>
              <input
                ref={uploadButtonRef}
                id={id}
                type="file"
                multiple
                accept="image/jpeg, image/png, image/webp, image/gif"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />
            </>
          )}
        </div>
        {error && <p className={errorClassName}>{error}</p>}

        {/* Fullscreen modal */}
        {fullscreenImageUrl && (
          <FullScreenModal
            title={"Aperçu de l'image"}
            imageUrl={fullscreenImageUrl}
            onClose={() => setFullscreenImageUrl(undefined)}
          />
        )}
      </div>
    );
  },
);

ImageUploader.displayName = 'ImageUploader';

export default ImageUploader;
