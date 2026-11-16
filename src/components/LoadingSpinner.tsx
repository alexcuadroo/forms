export function LoadingSpinner({ label }: { label: string }) {
  return <progress className="loading-spinner" aria-label={label} />;
}
