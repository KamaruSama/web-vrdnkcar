import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
  bordered = true,
  compact = false,
  shadow = 'sm',
}) => {
  const baseClasses = 'bg-white dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-200';
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };
  
  const hoverClasses = hoverable 
    ? 'hover:shadow-lg hover:translate-y-[-1px]' 
    : '';
  
  const borderClasses = bordered 
    ? 'border border-slate-200 dark:border-slate-700' 
    : '';
  
  const paddingClasses = compact 
    ? '' 
    : '';
  
  const clickClasses = onClick 
    ? 'cursor-pointer active:scale-[0.99]' 
    : '';
  
  return (
    <div 
      className={`${baseClasses} ${shadowClasses[shadow]} ${hoverClasses} ${borderClasses} ${paddingClasses} ${clickClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={`px-6 py-4 border-b border-slate-200 dark:border-slate-700 font-medium ${className}`}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={`px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  );
};

export default Card;