import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xl border border-line bg-white text-ink shadow-sm', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-6 sm:p-8', className)} {...props} />;
}

function CardTitle({ className, ...props }: ComponentProps<'h1'>) {
  return <h1 className={cn('text-2xl font-bold leading-tight text-navy', className)} {...props} />;
}

function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted', className)} {...props} />;
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-6 pt-0 sm:p-8 sm:pt-0', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
