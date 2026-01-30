import React from "react";
import { usePasswordStrength } from "@/components/hooks/usePasswordStrength";

export interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

/**
 * Visual feedback component that evaluates and displays password strength in real-time.
 * Shows progress bar with color coding and descriptive text to guide user toward secure password.
 */
export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showRequirements = true,
}) => {
  const strength = usePasswordStrength(password);

  const getProgressColor = (level: string): string => {
    if (level === "weak") return "bg-red-500";
    if (level === "medium") return "bg-yellow-500";
    if (level === "strong") return "bg-green-500";
    return "bg-gray-300";
  };

  const getTextColor = (level: string): string => {
    if (level === "weak") return "text-red-600 dark:text-red-400";
    if (level === "medium") return "text-yellow-600 dark:text-yellow-400";
    if (level === "strong") return "text-green-600 dark:text-green-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const requirements = [
    {
      met: strength.hasMinLength,
      label: `Minimum ${8} znaków`,
    },
    {
      met: strength.hasLowercase,
      label: "Zawiera małe litery (a-z)",
    },
    {
      met: strength.hasUppercase,
      label: "Zawiera wielkie litery (A-Z)",
    },
    {
      met: strength.hasNumbers,
      label: "Zawiera cyfry (0-9)",
    },
    {
      met: strength.hasSpecialChars,
      label: "Zawiera znaki specjalne (!@#$%...)",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Siła hasła</span>
          <span className={`text-sm font-semibold ${getTextColor(strength.level)}`}>{strength.feedback}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(strength.level)}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Wymagania:</p>
          <ul className="space-y-1">
            {requirements.map((req, index) => (
              <li key={index} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <span
                  className={`mr-2 inline-block w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${
                    req.met ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  {req.met ? "✓" : "○"}
                </span>
                {req.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
