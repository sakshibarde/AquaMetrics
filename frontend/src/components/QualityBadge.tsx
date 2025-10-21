import { cn } from '@/lib/utils';

type QualityLevel = 'Excellent' | 'Good' | 'Medium' | 'Bad' | 'Very Bad';

interface QualityBadgeProps {
  quality: QualityLevel;
  className?: string;
}

const QualityBadge = ({ quality, className }: QualityBadgeProps) => {
  const getQualityStyles = (level: QualityLevel) => {
    switch (level) {
      case 'Excellent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
      case 'Good':
        return 'bg-green-50 text-green-700 border-green-200 ring-green-500/20';
      case 'Medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-yellow-500/20';
      case 'Bad':
        return 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20';
      case 'Very Bad':
        return 'bg-red-50 text-red-700 border-red-200 ring-red-500/20';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center px-4 py-2 rounded-full border-2 font-semibold text-sm ring-4 transition-all duration-300',
        getQualityStyles(quality),
        className
      )}
    >
      {quality}
    </div>
  );
};

export default QualityBadge;
