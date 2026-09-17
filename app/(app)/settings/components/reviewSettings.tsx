import { deleteMyReview, getMyReview, saveMyReview } from '@/app/actions/review';
import { Button } from '@/app/components/button';
import Switch from '@/app/components/switch';
import TextArea from '@/app/components/textArea';
import { ToastType } from '@/app/components/toastMessage';
import { useToast } from '@/app/contexts/toastProvider';
import type { Review } from '@/app/db/reviewDb';
import { messageLengthRegex } from '@/app/utils/regex';
import { IconStar, IconStarFilled, IconTrash } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

const MAX_STARS = 5;

const ReviewSettings: React.FC = () => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [commentError, setCommentError] = useState('');
  const [savedReview, setSavedReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getMyReview()
      .then(review => {
        if (review) {
          setRating(review.rating);
          setComment(review.comment);
          setIsPublic(review.isPublic);
          setSavedReview(review);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Clicking the star matching the current rating clears it back to 0.
  const handleStarClick = (index: number) => {
    setRating(rating === index + 1 ? 0 : index + 1);
  };

  const hasChanges = () => {
    if (!savedReview) return rating > 0 || !!comment.trim();
    return rating !== savedReview.rating || comment.trim() !== savedReview.comment || isPublic !== savedReview.isPublic;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const review = await saveMyReview(rating, comment, isPublic);
      if (!review) throw new Error('Avis non enregistré dans la base de données');

      setSavedReview(review);
      setComment(review.comment);
      showToast({ type: ToastType.Success, message: 'Merci pour votre avis !' });
    } catch (error) {
      showToast({ type: ToastType.Error, message: String(error), error });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      if (!(await deleteMyReview())) throw new Error('Avis non supprimé dans la base de données');

      setSavedReview(null);
      setRating(0);
      setComment('');
      setIsPublic(true);
      showToast({ type: ToastType.Success, message: 'Avis supprimé' });
    } catch (error) {
      showToast({ type: ToastType.Error, message: String(error), error });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 py-1" role="radiogroup" aria-label="Note de 0 à 5 étoiles">
        {Array.from({ length: MAX_STARS }, (_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i < rating}
            aria-label={`${i + 1} étoile${i > 0 ? 's' : ''}`}
            onClick={() => handleStarClick(i)}
            disabled={isSaving || isDeleting}
            className="cursor-pointer text-amber-400 transition-transform hover:scale-110 disabled:cursor-not-allowed"
          >
            {i < rating ? <IconStarFilled size={28} /> : <IconStar size={28} />}
          </button>
        ))}
      </div>

      <TextArea
        id="review-comment"
        label="Commentaire"
        value={comment}
        onChange={setComment}
        error={commentError}
        onError={setCommentError}
        disabled={isSaving || isDeleting}
        placeholder="Dites-nous ce que vous pensez de l'application…"
        rows={3}
        regex={messageLengthRegex}
      />

      <Switch
        id="review-public"
        label="Publier mon commentaire sur le site"
        enabled={isPublic}
        onToggle={setIsPublic}
        tooltip="Vos étoiles comptent dans tous les cas ; seul le commentaire est publié si activé"
      />

      <div className="flex justify-center gap-2 pt-2">
        {savedReview && (
          <Button
            style="secondary"
            onClick={handleDelete}
            disabled={isSaving}
            loading={isDeleting}
            loadingText="Suppression..."
          >
            <span className="inline-flex items-center gap-2">
              <IconTrash size={18} />
              Supprimer
            </span>
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={!hasChanges() || isDeleting}
          loading={isSaving}
          loadingText="Enregistrement..."
        >
          {savedReview ? 'Modifier mon avis' : 'Publier mon avis'}
        </Button>
      </div>
    </div>
  );
};

export default ReviewSettings;
