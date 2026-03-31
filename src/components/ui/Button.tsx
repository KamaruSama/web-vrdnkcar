import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  rounded?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  loading = false,
  rounded = false,
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium focus:outline-none transition-all duration-200 ease-in-out';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-4 focus:ring-primary-300 shadow-sm',
    secondary: 'bg-secondary-200 text-secondary-800 hover:bg-secondary-300 focus:ring-4 focus:ring-secondary-200 shadow-sm',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-4 focus:ring-success-300 shadow-sm',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-4 focus:ring-danger-300 shadow-sm',
    warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-4 focus:ring-warning-300 shadow-sm',
    info: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-4 focus:ring-blue-300 shadow-sm',
    accent: 'bg-accent-600 text-white hover:bg-accent-700 focus:ring-4 focus:ring-accent-300 shadow-sm',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-4 focus:ring-gray-200',
  };
  
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    xl: 'px-6 py-3 text-base',
  };
  
  const roundedClass = rounded ? 'rounded-full' : 'rounded-lg';
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled || loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow active:scale-[0.98]';
  
  const loadingSpinner = (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClass} ${widthClass} ${disabledClass} ${className}`}
    >
      {loading && loadingSpinner}
      {icon && iconPosition === 'left' && !loading && <span className="mr-2">{icon}</span>}
      <span className="truncate">{children}</span>
      {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </button>
  );
};

export default Button;