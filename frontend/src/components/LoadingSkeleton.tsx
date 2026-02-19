import DynamicLoader from './DynamicLoader';

interface LoadingSkeletonProps {
  lines?: number;
  useDynamicLoader?: boolean;
  loaderMessage?: string;
}

export default function LoadingSkeleton({
  lines = 3,
  useDynamicLoader = false,
  loaderMessage = 'Loading',
}: LoadingSkeletonProps) {
  if (useDynamicLoader) {
    return <DynamicLoader type="combined" message={loaderMessage} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4 rounded-lg" />
      ))}
    </div>
  );
}
