import Image from 'next/image';

type FullScreenImageModalProps = {
  url: string;
  onClose: () => void;
};

export default function FullScreenImageModal({ url, onClose }: FullScreenImageModalProps) {
  if (url === '') return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-foreground text-4xl hover:scale-110 transition-transform"
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
      >
        &times;
      </button>
      <Image src={url} alt="Prévisualisation plein écran" fill className="object-contain p-4" />
    </div>
  );
}
