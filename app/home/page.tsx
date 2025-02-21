'use client';
import TaskList from '@/components/TaskList';
import { useState } from 'react';

export default function CreerAnnonce() {
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [taches, setTaches] = useState<string[]>(['']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Gérer la soumission
    console.log('Description:', description);
    console.log('Images:', images);
    console.log('Taches:', taches);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Nouveau bien</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-base font-medium text-foreground">
            <h2>Ajouter des photos</h2>
          </label>
          <input
            type="file"
            multiple
            onChange={e => setImages(Array.from(e.target.files || []))}
            className="block w-full text-sm text-foreground/80 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-background file:text-foreground hover:file:bg-foreground/10"
            accept="image/*"
            lang="fr"
          />
        </div>

        <div>
          <label className="text-base font-medium text-foreground">
            <h2 className="mb-2">Description du bien</h2>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground border-foreground/20 focus:ring-2 focus:ring-foreground/50"
            rows={4}
            placeholder="Décrivez les caractéristiques du bien..."
          />
        </div>

        <TaskList tasks={taches} setTasks={setTaches} />

        <button
          type="submit"
          className="w-full bg-foreground text-background px-4 py-2 rounded-lg hover:bg-foreground/90 transition-colors font-medium"
        >
          Publier le bien
        </button>
      </form>
    </div>
  );
}
