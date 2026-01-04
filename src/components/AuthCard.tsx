import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/LoginForm";
import { RegistrationForm } from "@/components/RegistrationForm";
import type { AuthSuccessResponse } from "@/components/hooks/useAuthForm";

export interface AuthCardProps {
  activeMode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
  onSuccess?: (data: AuthSuccessResponse) => void;
  onError?: (error: string) => void;
}

/**
 * Card component serving as the main container for authentication forms.
 * Houses tab switcher for form mode selection and form content area.
 * Provides visual separation and styling consistency with the rest of the application.
 */
export const AuthCard: React.FC<AuthCardProps> = ({ activeMode, onModeChange, onSuccess, onError }) => {
  const handleModeChange = (value: string) => {
    onModeChange(value as "login" | "register");
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-gray-200 dark:border-gray-800">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold text-center">
          {activeMode === "login" ? "Logowanie" : "Rejestracja"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeMode} onValueChange={handleModeChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login" className="text-sm">
              Zaloguj się
            </TabsTrigger>
            <TabsTrigger value="register" className="text-sm">
              Zarejestruj się
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-0">
            <LoginForm onSuccess={onSuccess} onError={onError} onRegistrationClick={() => onModeChange("register")} />
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-0">
            <RegistrationForm onSuccess={onSuccess} onError={onError} onLoginClick={() => onModeChange("login")} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
