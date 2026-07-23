import { useRef, useState } from "react";
import { FiUpload } from "react-icons/fi";
import { Button, TextArea } from "../../../atoms";
import { processTranscript } from "../../../../services/ai";
import type { ProcessTranscriptResult } from "../../../../types";

export interface TranscriptUploadFormProps {
  meetingId: string;
  submitLabel?: string;
  onProcessed: (result: ProcessTranscriptResult) => void;
}

export default function TranscriptUploadForm({
  meetingId,
  submitLabel = "Proceseaza cu AI",
  onProcessed,
}: TranscriptUploadFormProps) {
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setTranscript(text);
  };

  const handleSubmit = async () => {
    setError("");
    if (!transcript.trim()) {
      setError("Transcriptul nu poate fi gol.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await processTranscript({
        meetingId,
        transcript,
        fileFormat: "text",
        language: "ro",
      });
      onProcessed(result);
    } catch {
      setError("Procesarea AI a esuat. Rezultatele anterioare (daca exista) au fost pastrate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <TextArea
        label="Transcript"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Lipeste transcriptul sedintei aici..."
        rows={20}
        className="min-h-[400px] font-mono text-sm"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(e) => void handleFileChange(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={<FiUpload aria-hidden="true" />}
        onClick={() => fileInputRef.current?.click()}
      >
        Incarca fisier .txt
      </Button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button type="button" isLoading={isSubmitting} onClick={() => void handleSubmit()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
