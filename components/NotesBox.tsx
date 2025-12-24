'use client';

import { useState, useEffect } from 'react';

export default function NotesBox() {
  const [notes, setNotes] = useState('');
  const [originalNotes, setOriginalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Charger les notes au démarrage
    fetch('/api/notes')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNotes(data.notes);
          setOriginalNotes(data.notes);
        }
      })
      .catch(err => console.error('Erreur chargement notes:', err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOriginalNotes(notes);
        setMessage('✅ Notes sauvegardées');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Erreur sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('❌ Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = notes !== originalNotes;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <label htmlFor="notes" className="block text-sm font-semibold text-gray-300 mb-2">
            📝 Notes importantes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajoutez vos notes ici... (plusieurs paragraphes possibles)"
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            rows={4}
          />
        </div>
        <div className="flex flex-col gap-2 pt-7">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`px-4 py-2 rounded font-semibold text-sm transition-all ${
              hasChanges && !saving
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? '⏳ Sauvegarde...' : '💾 Enregistrer'}
          </button>
          {message && (
            <span className="text-xs text-center whitespace-nowrap">
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
