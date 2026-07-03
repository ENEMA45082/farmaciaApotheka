import type { CSSProperties } from 'react';

export type TextureType =
  | 'dots'
  | 'grid'
  | 'noise'
  | 'crosshatch'
  | 'diagonal'
  | 'scatteredDots'
  | 'none';

interface TextureOverlayProps {
  texture: TextureType;
  opacity?: number;
  style?: CSSProperties;
}

const defaultOpacities: Record<TextureType, number> = {
  dots:         0.18,
  grid:         0.12,
  noise:        0.06,
  crosshatch:   0.10,
  diagonal:     0.10,
  scatteredDots:0.15,
  none:         0,
};

function getBackground(texture: TextureType): string {
  const color = 'rgba(0,45,98,1)'; // --navy

  switch (texture) {
    case 'dots':
      return `radial-gradient(circle, ${color} 1px, transparent 1px)`;

    case 'grid':
      return [
        `linear-gradient(${color} 1px, transparent 1px)`,
        `linear-gradient(to right, ${color} 1px, transparent 1px)`,
      ].join(', ');

    case 'noise':
      return [
        `radial-gradient(circle at 20% 35%, ${color} 1px, transparent 1px)`,
        `radial-gradient(circle at 75% 44%, ${color} 1px, transparent 1px)`,
        `radial-gradient(circle at 46% 52%, ${color} 1px, transparent 1px)`,
        `radial-gradient(circle at 88% 20%, ${color} 1px, transparent 1px)`,
        `radial-gradient(circle at 10% 80%, ${color} 1px, transparent 1px)`,
        `radial-gradient(circle at 60% 72%, ${color} 1px, transparent 1px)`,
      ].join(', ');

    case 'crosshatch':
      return [
        `repeating-linear-gradient(45deg, ${color}, ${color} 1px, transparent 0, transparent 50%)`,
        `repeating-linear-gradient(-45deg, ${color}, ${color} 1px, transparent 0, transparent 50%)`,
      ].join(', ');

    case 'diagonal':
      return `repeating-linear-gradient(45deg, ${color}, ${color} 1px, transparent 0, transparent 50%)`;

    case 'scatteredDots':
      return [
        `radial-gradient(circle, ${color} 1px, transparent 1px)`,
        `radial-gradient(circle, ${color} 1px, transparent 1px)`,
        `radial-gradient(circle, ${color} 1px, transparent 1px)`,
      ].join(', ');

    default:
      return 'none';
  }
}

function getBackgroundSize(texture: TextureType): string {
  switch (texture) {
    case 'dots':         return '20px 20px';
    case 'grid':         return '24px 24px, 24px 24px';
    case 'noise':        return '80px 80px, 60px 60px, 100px 100px, 70px 70px, 90px 90px, 55px 55px';
    case 'crosshatch':   return '8px 8px, 8px 8px';
    case 'diagonal':     return '10px 10px';
    case 'scatteredDots':return '30px 30px, 22px 22px, 40px 40px';
    default:             return 'auto';
  }
}

function getBackgroundPosition(texture: TextureType): string {
  switch (texture) {
    case 'scatteredDots': return '0 0, 10px 15px, 20px 5px';
    default:              return '0 0';
  }
}

export function TextureOverlay({ texture, opacity, style }: TextureOverlayProps) {
  if (texture === 'none') return null;

  const finalOpacity = opacity ?? defaultOpacities[texture];

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 0,
    opacity: finalOpacity,
    backgroundImage: getBackground(texture),
    backgroundSize: getBackgroundSize(texture),
    backgroundPosition: getBackgroundPosition(texture),
    backgroundRepeat: 'repeat',
    ...style,
  };

  return <div aria-hidden="true" style={overlayStyle} />;
}
