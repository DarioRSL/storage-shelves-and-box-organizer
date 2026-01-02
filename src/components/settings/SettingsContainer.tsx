import { useEffect, useState } from "react";
import { useSettingsView } from "../hooks/useSettingsView";
import { useTheme } from "../hooks/useTheme";
import { SettingsHeader } from "./SettingsHeader";
import { ProfileHeader } from "./ProfileHeader";
import { WorkspaceManagementSection } from "./WorkspaceManagementSection";
import { WorkspaceSelector } from "./WorkspaceSelector";
import { ThemeToggle } from "./ThemeToggle";
import { DangerZoneSection } from "./DangerZoneSection";
import { ExportDataButton } from "./ExportDataButton";
import { WorkspaceCreateModal } from "./WorkspaceCreateModal";
import { WorkspaceEditModal } from "./WorkspaceEditModal";
import { ConfirmationDialog } from "../shared/ConfirmationDialog";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorBanner } from "../ErrorBanner";

interface SettingsContainerProps {
  userId: string;
}

export default function SettingsContainer({ userId }: SettingsContainerProps) {
  const {
    state,
    fetchData,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    deleteAccount,
    setError,
    clearError,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
  } = useSettingsView(userId);

  const { currentTheme, setTheme } = useTheme();

  const [confirmationState, setConfirmationState] = useState<{
    type: "workspace" | "account" | null;
    targetId: string | null;
    isOpen: boolean;
  }>({
    type: null,
    targetId: null,
    isOpen: false,
  });

  // Selected workspace for Danger Zone and Export operations
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-select first workspace when workspaces load
  useEffect(() => {
    if (state.workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(state.workspaces[0].id);
    }
  }, [state.workspaces, selectedWorkspaceId]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to logout");
      }

      window.location.href = "/auth";
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to logout");
      window.location.href = "/auth";
    }
  };

  const handleDeleteWorkspaceClick = (workspaceId: string) => {
    setConfirmationState({
      type: "workspace",
      targetId: workspaceId,
      isOpen: true,
    });
  };

  const handleDeleteAccountClick = () => {
    setConfirmationState({
      type: "account",
      targetId: null,
      isOpen: true,
    });
  };

  const handleConfirmDelete = async () => {
    if (confirmationState.type === "workspace" && confirmationState.targetId) {
      await deleteWorkspace(confirmationState.targetId);
    } else if (confirmationState.type === "account") {
      await deleteAccount();
    }
    setConfirmationState({ type: null, targetId: null, isOpen: false });
  };

  const handleCancelDelete = () => {
    setConfirmationState({ type: null, targetId: null, isOpen: false });
  };

  const handleEditWorkspace = (workspaceId: string) => {
    const workspace = state.workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      openEditModal(workspace);
    }
  };

  const handleBackToDashboard = () => {
    window.location.href = "/app";
  };

  const currentWorkspace = state.workspaces.find((w) => w.id === selectedWorkspaceId) || null;

  const isLoading = state.isLoading.fetchProfile || state.isLoading.fetchWorkspaces;

  if (isLoading && !state.currentProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" message="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SettingsHeader onBack={handleBackToDashboard} />

      <div className="mx-auto max-w-4xl space-y-8 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account, workspaces, and preferences</p>
        </div>

        {state.error && <ErrorBanner message={state.error} onDismiss={clearError} />}

        {state.currentProfile && (
          <ProfileHeader profile={state.currentProfile} onLogout={handleLogout} isLoggingOut={state.isLoading.logout} />
        )}

        <section className="space-y-4 rounded-lg border p-6">
          <div>
            <h3 className="text-lg font-semibold">Appearance</h3>
            <p className="text-sm text-muted-foreground">Customize the appearance of the application</p>
          </div>
          <ThemeToggle currentTheme={currentTheme} onChange={setTheme} />
        </section>

        <WorkspaceManagementSection
          workspaces={state.workspaces}
          currentUserId={userId}
          onCreateNew={openCreateModal}
          onEdit={handleEditWorkspace}
          onDelete={handleDeleteWorkspaceClick}
          isLoading={state.isLoading.fetchWorkspaces}
        />

        <section className="space-y-4 rounded-lg border p-6">
          <div>
            <h3 className="text-lg font-semibold">Workspace Context</h3>
            <p className="text-sm text-muted-foreground">
              Select which workspace to use for data export and danger zone operations
            </p>
          </div>
          <WorkspaceSelector
            workspaces={state.workspaces}
            selectedWorkspaceId={selectedWorkspaceId}
            onWorkspaceChange={setSelectedWorkspaceId}
          />
        </section>

        <section className="space-y-4 rounded-lg border p-6">
          <div>
            <h3 className="text-lg font-semibold">Data</h3>
            <p className="text-sm text-muted-foreground">Export your inventory data</p>
          </div>
          {currentWorkspace && <ExportDataButton workspaceId={currentWorkspace.id} onError={setError} />}
        </section>

        <DangerZoneSection
          currentWorkspace={currentWorkspace}
          currentUserId={userId}
          onDeleteWorkspace={() => currentWorkspace && handleDeleteWorkspaceClick(currentWorkspace.id)}
          onDeleteAccount={handleDeleteAccountClick}
        />

        <WorkspaceCreateModal
          isOpen={state.isCreateWorkspaceModalOpen}
          onClose={closeCreateModal}
          onCreate={createWorkspace}
          isLoading={state.isLoading.createWorkspace}
        />

        {state.selectedWorkspaceForEdit && (
          <WorkspaceEditModal
            workspace={state.selectedWorkspaceForEdit}
            isOpen={state.isEditWorkspaceModalOpen}
            onClose={closeEditModal}
            onSave={updateWorkspace}
            isLoading={state.isLoading.updateWorkspace}
          />
        )}

        <ConfirmationDialog
          isOpen={confirmationState.isOpen}
          title={
            confirmationState.type === "workspace"
              ? "Delete Workspace"
              : confirmationState.type === "account"
                ? "Delete Account"
                : ""
          }
          description={
            confirmationState.type === "workspace"
              ? "This will permanently delete the workspace and all its data including boxes, locations, and QR codes. This action cannot be undone."
              : confirmationState.type === "account"
                ? "This will permanently delete your account and all workspaces you own. This action cannot be undone."
                : ""
          }
          confirmText={confirmationState.type === "workspace" ? "DELETE WORKSPACE" : "DELETE ACCOUNT"}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isDangerous={true}
          isLoading={state.isLoading.deleteWorkspace || state.isLoading.deleteAccount}
          requiresTextConfirmation={true}
        />
      </div>
    </div>
  );
}
