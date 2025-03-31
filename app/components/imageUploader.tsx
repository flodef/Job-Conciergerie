'use client';

import { IconPhotoPlus, IconX } from '@tabler/icons-react';
import { clsx } from 'clsx/lite';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

import FullScreenModal from '@/app/components/fullScreenModal';
import { ToastType } from '@/app/components/toastMessage'; // Assuming ToastType is exported

// --- Constants ---
const MAX_FILE_SIZE_MB = 5;
const mockupImagePath = '/home.webp'; // Default mockup image
const gatewayDomain = process.env.NEXT_PUBLIC_GATEWAY_DOMAIN || '';

// --- Interfaces ---
interface ImagePreviewState {
  [tempId: string]: string; // Map tempId to blob URL
}

interface UploadProgressState {
  [tempId: string]: number; // Map tempId to progress percentage
}

interface ActiveUploadsState {
  [tempId: string]: XMLHttpRequest; // Map tempId to XHR object
}

export interface ImageUploaderProps {
  id: string;
  initialImageCIDs?: string[];
  onCIDsChange: (cids: string[]) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
  maxImages?: number;
  label?: string;
  required?: boolean;
  onError?: (message: string, type?: ToastType) => void;
  className?: string;
}

// --- Component ---
const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  initialImageCIDs = [],
  onCIDsChange,
  onUploadStateChange,
  maxImages = 5, // Default max images
  label = 'Images',
  required = false,
  onError,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [committedCIDs, setCommittedCIDs] = useState<string[]>(initialImageCIDs);
  const [imagePreviews, setImagePreviews] = useState<ImagePreviewState>({});
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({});
  const [activeUploads, setActiveUploads] = useState<ActiveUploadsState>({});
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);

  // Effect to update parent when committedCIDs change
  useEffect(() => {
    onCIDsChange(committedCIDs);
  }, [committedCIDs, onCIDsChange]);

  // Effect to update parent about upload state
  useEffect(() => {
    const currentlyUploading = Object.keys(activeUploads).length > 0 || Object.keys(uploadProgress).length > 0;
    if (currentlyUploading !== isUploading) {
      setIsUploading(currentlyUploading);
      onUploadStateChange?.(currentlyUploading);
    }
  }, [activeUploads, uploadProgress, onUploadStateChange, isUploading]);

  // --- Image Compression ---
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

  // --- Image Upload ---
  const uploadImage = (file: File | Blob, tempId: string): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file, file instanceof File ? file.name : `${tempId}.jpg`);

      xhr.open('POST', '/api/IPFS', true);

      // Store the XHR object
      setActiveUploads(prev => ({ ...prev, [tempId]: xhr }));

      // Track progress
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(prev => ({ ...prev, [tempId]: progress }));
        }
      };

      // Handle completion
      xhr.onload = () => {
        setActiveUploads(prev => {
          const { [tempId]: _removedXhr, ...rest } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
          return rest;
        });
        resolve(xhr.response);
      };

      // Handle errors
      xhr.onerror = () => {
        setActiveUploads(prev => {
          const { [tempId]: _removedXhr, ...rest } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
          return rest;
        });
        console.error('XHR Network Error');
        reject(new Error('Network error during upload'));
      };

      // Handle abort
      xhr.onabort = () => {
        console.log(`Upload aborted for ${tempId}`);
        // State cleanup is handled by the delete button click
        reject(new Error('Upload aborted by user')); // Reject promise on abort
      };

      xhr.send(formData);
    });
  };

  // --- File Input Handler ---
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const currentImageCount = committedCIDs.length + Object.keys(uploadProgress).length;
    const remainingSlots = maxImages - currentImageCount;

    if (files.length > remainingSlots) {
      if (onError) {
        onError(`Vous ne pouvez télécharger que ${remainingSlots} image(s) supplémentaire(s).`, ToastType.Warning);
      }
      event.target.value = ''; // Reset file input
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileSizeMB = file.size / 1024 / 1024;

      // Basic validation
      if (!file.type.startsWith('image/')) {
        if (onError) onError(`Le fichier ${file.name} n&apos;est pas une image.`, ToastType.Warning);
        continue;
      }

      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        if (onError)
          onError(`Le fichier ${file.name} dépasse la taille maximale de ${MAX_FILE_SIZE_MB}MB.`, ToastType.Warning);
        continue;
      }

      const tempId = `${file.name}-${Date.now()}`;
      const previewUrl = URL.createObjectURL(file);

      setImagePreviews(prev => ({ ...prev, [tempId]: previewUrl }));
      setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

      try {
        const compressedBlob = await compressImage(file);
        await uploadImage(compressedBlob, tempId); // Pass compressed file
      } catch (uploadError) {
        console.error('Error processing file:', file.name, uploadError);
        if (onError) onError(`Erreur lors du traitement de ${file.name}.`, ToastType.Error);
        // Clean up progress and preview on error
        setUploadProgress(prev => {
          const { [tempId]: _, ...rest } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
          return rest;
        });
        setImagePreviews(prev => {
          const { [tempId]: prevUrl, ...rest } = prev;
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return rest;
        });
      }
    }
    event.target.value = ''; // Reset file input
  };

  // --- Delete Handlers ---
  const handleDeleteCommitted = (index: number) => {
    setCommittedCIDs(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteUploading = (tempId: string) => {
    // Cancel the upload if it's active
    if (activeUploads[tempId]) {
      activeUploads[tempId].abort();
      setActiveUploads(prev => {
        const { [tempId]: _removedXhr, ...rest } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
        return rest;
      });
    }
    // Remove preview and progress
    setImagePreviews(prev => {
      const { [tempId]: removedPreview, ...rest } = prev;
      if (removedPreview) {
        URL.revokeObjectURL(removedPreview); // Clean up object URL
      }
      return rest;
    });
    setUploadProgress(prev => {
      const { [tempId]: _removedProgress, ...rest } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
      return rest;
    });
  };

  // Calculate current total images
  const totalImages = committedCIDs.length + Object.keys(imagePreviews).length;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={clsx('grid grid-cols-3 gap-4')}>
        {/* Existing images (using CID + Gateway) */}
        {committedCIDs.map((cid, index) => {
          const url = gatewayDomain
            ? `https://${gatewayDomain.replace('https://', '').replace(/\/$/, '')}/ipfs/${cid}`
            : mockupImagePath;
          return (
            <div key={`committed-${cid}-${index}`} className="relative aspect-square">
              <Image
                src={url}
                alt={`Image ${index + 1}`}
                width={100}
                height={100}
                className="object-cover w-full h-full rounded-lg cursor-pointer"
                onClick={() => setFullscreenImageUrl(url)}
                onError={e => {
                  console.warn(`Failed to load image from IPFS: ${cid}`);
                  (e.target as HTMLImageElement).src = mockupImagePath;
                }}
              />
              <button
                type="button"
                onClick={() => handleDeleteCommitted(index)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-background rounded-full hover:bg-red-600 transition-colors"
                aria-label={`Supprimer l'image ${index + 1}`}
              >
                <IconX size={16} />
              </button>
            </div>
          );
        })}

        {/* New images being uploaded */}
        {Object.keys(imagePreviews).map((tempId, index) => (
          <div key={tempId} className="relative aspect-square">
            <Image
              src={imagePreviews[tempId]}
              alt={`Prévisualisation ${committedCIDs.length + index + 1}`}
              width={100}
              height={100}
              className="object-cover w-full h-full rounded-lg cursor-pointer"
              onClick={() => setFullscreenImageUrl(imagePreviews[tempId])}
              onLoad={() => URL.revokeObjectURL(imagePreviews[tempId])} // Revoke after load possibly? Test this. Might need to keep for fullscreen. Let's keep it for now.
            />
            {/* Progress Indicator */}
            {uploadProgress[tempId] !== undefined && (
              <div className="absolute bottom-0 left-0 w-full bg-black/50 backdrop-blur-sm p-1 text-xs text-white">
                <div className="text-center mb-1">{uploadProgress[tempId]}%</div> {/* Show percentage text */}
                <div className="bg-gray-400 h-1 rounded">
                  {' '}
                  {/* Background bar */}
                  <div className="bg-primary h-1 rounded" style={{ width: `${uploadProgress[tempId]}%` }} />{' '}
                  {/* Progress fill */}
                </div>
              </div>
            )}
            {/* Delete/Cancel Button */}
            <button
              type="button"
              onClick={() => handleDeleteUploading(tempId)}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-background rounded-full hover:bg-red-600 transition-colors"
              aria-label={`Annuler le téléchargement de l'image ${committedCIDs.length + index + 1}`}
            >
              <IconX size={16} />
            </button>
          </div>
        ))}

        {/* Add Photo Button */}
        {totalImages < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'aspect-square border-2 border-dashed border-secondary rounded-lg flex flex-col items-center justify-center text-foreground/50 hover:border-primary hover:text-primary transition-colors',
            )}
            aria-label="Ajouter une image"
          >
            <IconPhotoPlus size={32} />
            <span className="text-xs mt-1">Ajouter</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        multiple // Allow multiple file selection
        accept="image/jpeg, image/png, image/webp, image/gif"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Fullscreen Modal for viewing images */}
      {fullscreenImageUrl && (
        <FullScreenModal
          title={'Aperçu de l&apos;image'} // Generic title, maybe pass down from parent if needed?
          imageUrl={fullscreenImageUrl}
          onClose={() => setFullscreenImageUrl(undefined)}
        />
      )}
    </div>
  );
};

export default ImageUploader;
