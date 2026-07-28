import { useRef, useState } from "react";
import { FiUpload } from "react-icons/fi";
import { Button, TextArea } from "../../../atoms";
import { processTranscript, uploadTranscriptFile } from "../../../../services/ai";
import type { ProcessTranscriptResult } from "../../../../types";

export interface TranscriptUploadFormProps {
  meetingId: string;
  submitLabel?: string;
  onProcessed: (result: ProcessTranscriptResult) => void;
}

function canPreviewAsText(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    file.type.startsWith("text/") ||
    ["txt", "csv", "json", "md", "srt", "vtt", "log"].includes(extension ?? "")
  );
}

export default function TranscriptUploadForm({
  meetingId,
  submitLabel = "Process with AI",
  onProcessed,
}: TranscriptUploadFormProps) {
  const [transcript, setTranscript] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    if (!canPreviewAsText(file)) {
      setTranscript("");
      return;
    }

    try {
      setTranscript(await file.text());
    } catch {
      setError("Couldn't preview this file, but it can still be uploaded.");
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!selectedFile && !transcript.trim()) {
      setError("Transcript can't be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = selectedFile
        ? await uploadTranscriptFile(meetingId, selectedFile)
        : await processTranscript({
            meetingId,
            transcript,
            fileFormat: "text",
            language: "ro",
          });
      onProcessed(result);
    } catch {
      setError("AI processing failed. Any previous results have been kept.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <TextArea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder={
          selectedFile && !transcript
            ? "File selected. Text will be extracted on the server when you process it."
            : "Paste the meeting transcript here..."
        }
        rows={8}
        className="font-mono text-sm"
        style={{ resize: "none" }}
      />

      <input
        ref={fileInputRef}
        type="file"
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
        Upload transcript file
      </Button>

      {selectedFile && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Selected file: {selectedFile.name}
          {!transcript && " - preview unavailable for this file type"}
        </p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end">
        <Button
          type="button"
          isLoading={isSubmitting}
          disabled={!selectedFile && !transcript.trim()}
          onClick={() => void handleSubmit()}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
