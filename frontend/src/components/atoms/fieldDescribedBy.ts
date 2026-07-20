export function getFieldDescribedBy(id: string | undefined, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}
