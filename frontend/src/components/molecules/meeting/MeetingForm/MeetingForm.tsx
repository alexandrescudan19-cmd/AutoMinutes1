import { useState } from 'react';
import Input from '../../../atoms/Input/Input.tsx';
import TextArea from '../../../atoms/TextArea/TextArea.tsx';
import Button from '../../../atoms/Button/Button.tsx';

export interface MeetingFormValues {
  title: string;
  date: string;
  description: string;
}

export interface MeetingFormProps {
  onSubmit: (values: MeetingFormValues) => void;  // ce se intampla la creare
  onCancel: () => void;                            // ce se intampla la anulare
  isSubmitting?: boolean;                          
}

export default function MeetingForm({ onSubmit, onCancel, isSubmitting = false }: MeetingFormProps) {
    
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {

    if (!title.trim()) {
      setError('Titlul este obligatoriu.');
      return;
    }
    if (!date) {
      setError('Data este obligatorie.');
      return;
    }
    setError('');
    onSubmit({ title: title.trim(), date, description: description.trim() });
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
        label="Dată și oră"
        required
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={error && !date ? error : undefined}
      />

      <TextArea
        label="Descriere"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Conținut opțional"
        rows={3}
      />

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