import * as React from "react";

export interface ButtonProps {
    /** Button label text */
    label: string;
    /** Optional click handler */
    onClick?: () => void;
    /** Visual variant */
    variant?: "primary" | "secondary" | "ghost";
    /** Disabled state */
    disabled?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
        "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
    secondary:
        "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-100",
    ghost:
        "bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:ring-neutral-400 dark:text-neutral-300",
};

export function Button({
    label,
    onClick,
    variant = "primary",
    disabled = false,
}: ButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={[
                "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                variantClasses[variant],
            ].join(" ")}
        >
            {label}
        </button>
    );
}
