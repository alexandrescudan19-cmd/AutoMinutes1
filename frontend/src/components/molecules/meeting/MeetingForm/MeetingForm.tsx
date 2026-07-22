import { useState } from 'react';
import Input from '../../../atoms/Input/Input.tsx';
import TextArea from '../../../atoms/TextArea/TextArea.tsx';
import Button from '../../../atoms/Button/Button.tsx';

export interface MeetingFormValues {
  title: string;
  startDateTime: string;
  endDateTime: string;
  description: string;
}

export interface MeetingFormProps {
  onSubmit: (values: MeetingFormValues) => void;  
  onCancel: () => void;                            
  isSubmitting?: boolean;                         
}

export default function MeetingForm({ onSubmit, onCancel, isSubmitting = false }: MeetingFormProps) {
  const [title, setTitle] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
 
    if (!title.trim()) {
      setError('Titlul este obligatoriu.');
      return;
    }
    if (!startDateTime) {
      setError('Data de început este obligatorie.');
      return;
    }
    if (!endDateTime) {
      setError('Data de sfârșit este obligatorie.');
      return;
    }

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setError('Sfârșitul trebuie să fie după început.');
      return;
    }

    setError('');
    onSubmit({
      title: title.trim(),
      startDateTime,
      endDateTime,
      description: description.trim(),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Titlu"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="ex: Sprint Planning"
        error={error && !title.trim() ? error : undefined}
      />

      <Input
        label="Început"
        required
        type="datetime-local"
        value={startDateTime}
        onChange={(e) => setStartDateTime(e.target.value)}
        error={error && !startDateTime ? error : undefined}
      />

      <Input
        label="Sfârșit"
        required
        type="datetime-local"
        value={endDateTime}
        onChange={(e) => setEndDateTime(e.target.value)}
        error={error && !endDateTime ? error : undefined}
      />

      <TextArea
        label="Descriere"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Conținut opțional"
        rows={3}
      />

      {/* erorile care nu tin de un camp anume (ex: sfarsit inainte de inceput) */}
      {error && title.trim() && startDateTime && endDateTime && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Anulează
        </Button>
        <Button onClick={handleSubmit} isLoading={isSubmitting}>
          Creează întâlnire
        </Button>
      </div>
    </div>
  );
}