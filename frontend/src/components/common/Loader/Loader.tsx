import { cn } from '../cn.ts';

// Aici scriem toate optiunile pe care le putem trimite componentei (props).
export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

// Pentru fiecare marime, clasele Tailwind potrivite.
// Daca adaugi o marime noua mai sus, trebuie sa o adaugi si aici.
const sizes: Record<NonNullable<LoaderProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

// Componenta Loader. Daca nu trimiti "size", va fi "md" (mediu).
export default function Loader({ size = 'md', label, className }: LoaderProps) {
  return (
    // role="status" ii spune cititorului de ecran ca ceva se incarca.
    // cn() lipeste clasele noastre cu cele primite din afara (className).
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2', className)}>

        {/* Cerculetul care se invarte. E facut doar din CSS: */}

      <span

        aria-hidden="true"
        className={cn('inline-block animate-spin rounded-full border-current border-t-transparent', sizes[size])}
      />
      {/* Daca avem "label", il aratam. Daca nu, punem un text ascuns
          "Se incarca" doar pentru cititorul de ecran. */}

      {label ? <span className="text-sm text-gray-600">{label}</span> : <span className="sr-only">Loading</span>}

    </span>
  );
}