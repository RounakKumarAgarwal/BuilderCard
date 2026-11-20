import { KineticTextLoader } from '@/components/ui/kinetic-text-loader';

export default function LoadingState() {
  return (
    <div role="status" aria-busy="true" className="flex justify-center py-20">
      <KineticTextLoader text="Loading" />
    </div>
  );
}
