import * as React from 'react';

// ============================================================================
// 1. BUTTON COMPONENT
// ============================================================================
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
    children, variant = 'primary', isLoading, icon, className = '', disabled, ...props 
}) => {
    const base = "w-full p-3 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
    
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20",
        secondary: "bg-slate-900 text-white hover:bg-black shadow-slate-900/20",
        outline: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-red-500/20",
        ghost: "bg-transparent text-slate-600 shadow-none hover:bg-slate-100"
    };

    return (
        <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || isLoading} {...props}>
            {isLoading ? <Spinner className="w-4 h-4 text-current" /> : icon}
            {children}
        </button>
    );
};

// ============================================================================
// 2. LOADING SPINNER
// ============================================================================
export const Spinner: React.FC<{className?: string}> = ({ className = "w-4 h-4 text-blue-600" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// ============================================================================
// 3. CARD COMPONENT
// ============================================================================
export const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className = '' }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
        {children}
    </div>
);

// ============================================================================
// 4. BADGE COMPONENT
// ============================================================================
type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

export const Badge: React.FC<{children: React.ReactNode, variant?: BadgeVariant, className?: string}> = ({ children, variant = 'neutral', className = '' }) => {
    const variants = {
        success: "bg-emerald-100 text-emerald-700 border border-emerald-200",
        warning: "bg-amber-100 text-amber-700 border border-amber-200",
        error: "bg-red-100 text-red-700 border border-red-200",
        neutral: "bg-slate-100 text-slate-600 border border-slate-200"
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};
