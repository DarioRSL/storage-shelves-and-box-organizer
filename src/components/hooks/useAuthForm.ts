import { useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import type { ProfileDto, WorkspaceDto } from "@/types";

/**
 * Form submission data types.
 */
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
  agreeToPasswordLimitation: boolean;
}

/**
 * Auth success response data.
 */
export interface AuthSuccessResponse {
  user: ProfileDto;
  workspace: WorkspaceDto;
  token: string;
  refreshToken: string;
}

/**
 * Options for useAuthForm hook.
 */
export interface UseAuthFormOptions {
  onSuccess?: (data: AuthSuccessResponse) => void;
  onError?: (error: string) => void;
}

/**
 * Hook to handle authentication form submission.
 * Manages loading state, errors, and API communication with Supabase.
 */
export function useAuthForm(options?: UseAuthFormOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Submit login form.
   */
  const submitLogin = useCallback(
    async (data: LoginFormData) => {
      setIsLoading(true);
      setError(null);

      try {
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Błąd połączenia z serwerem. Spróbuj ponownie.");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Sign in with email and password
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (authError) {
          let errorMsg = "Błąd logowania. Spróbuj ponownie.";
          if (authError.message.includes("Invalid")) {
            errorMsg = "Nieprawidłowy email lub hasło";
          }
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return;
        }

        if (!authData.session || !authData.user) {
          setError("Błąd uwierzytelniania. Spróbuj ponownie.");
          return;
        }

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        if (profileError) {
          setError("Nie udało się pobrać profilu użytkownika");
          return;
        }

        // Fetch user workspaces
        const { data: workspaceData, error: workspaceError } = await supabase
          .from("workspace_members")
          .select("workspaces!inner(*)")
          .eq("user_id", authData.user.id)
          .limit(1)
          .single();

        if (workspaceError) {
          setError("Nie udało się pobrać workspace");
          return;
        }

        const workspace = (workspaceData?.workspaces as unknown as WorkspaceDto) || null;

        if (!workspace) {
          setError("Nie znaleziono workspace dla użytkownika");
          return;
        }

        // Success - send both access_token and refresh_token for proper session
        options?.onSuccess?.({
          user: profileData,
          workspace,
          token: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Nieznany błąd";
        setError(errorMessage);
        options?.onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  /**
   * Submit registration form.
   */
  const submitRegistration = useCallback(
    async (data: RegistrationFormData) => {
      setIsLoading(true);
      setError(null);

      try {
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
        const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Błąd połączenia z serwerem. Spróbuj ponownie.");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Sign up with email and password
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });

        if (authError) {
          let errorMsg = "Błąd rejestracji. Spróbuj ponownie.";
          if (authError.message.includes("already exists") || authError.message.includes("already registered")) {
            errorMsg = "Email jest już zarejestrowany";
          } else if (authError.message.includes("weak")) {
            errorMsg = "Hasło jest zbyt słabe";
          } else if (authError.message.includes("not authorized") || authError.message.includes("Signups not allowed")) {
            errorMsg = "Rejestracja jest obecnie wyłączona";
          }
          console.error("Registration error:", authError.message, authError);
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return;
        }

        if (!authData.session || !authData.user) {
          setError("Błąd uwierzytelniania. Spróbuj ponownie.");
          return;
        }

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        if (profileError) {
          setError("Błąd pobierania danych użytkownika. Spróbuj ponownie.");
          return;
        }

        // Fetch the user's workspace (created automatically by database trigger)
        // The handle_new_user() trigger creates "My Workspace" automatically
        const { data: workspaceData, error: workspaceError } = await supabase
          .from("workspace_members")
          .select("workspaces!inner(*)")
          .eq("user_id", authData.user.id)
          .limit(1)
          .single();

        if (workspaceError || !workspaceData) {
          setError("Błąd inicjalizacji konta. Spróbuj ponownie.");
          return;
        }

        const workspace = workspaceData.workspaces as unknown as WorkspaceDto;

        if (!workspace) {
          setError("Nie znaleziono workspace dla użytkownika");
          return;
        }

        // Success - send both access_token and refresh_token for proper session
        options?.onSuccess?.({
          user: profileData,
          workspace,
          token: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Nieznany błąd";
        setError(errorMessage);
        options?.onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return {
    isLoading,
    error,
    clearError,
    submitLogin,
    submitRegistration,
  };
}
