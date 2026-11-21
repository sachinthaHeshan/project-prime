function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#e4dccb] border-t-[#1f6e56]" />
  );
}

export function LoadingOverlay({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-[#f3efe6]/80"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-md border border-[#e4dccb] bg-[#fffaf3] px-4 py-3 text-sm text-[#1c1915] shadow-sm">
        <Spinner />
        {label}
      </div>
    </div>
  );
}

export function LoadingNote({ label }: { label: string }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-[#5c564c]" role="status" aria-live="polite">
      <Spinner />
      {label}
    </p>
  );
}
