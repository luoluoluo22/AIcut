"use client";

import { Button } from "../ui/button";
import { ChevronDown, ArrowLeft, SquarePen, Trash } from "lucide-react";
import { HeaderBase } from "../header-base";
import { useProjectStore } from "@/stores/project-store";
import { KeyboardShortcutsHelp } from "../keyboard-shortcuts-help";
import { useState, useEffect, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { RenameProjectDialog } from "../rename-project-dialog";
import { DeleteProjectDialog } from "../delete-project-dialog";
import { useRouter } from "next/navigation";
import { FaDiscord } from "react-icons/fa6";
import { PanelPresetSelector } from "./panel-preset-selector";
import { ExportButton } from "./export-button";
import { ThemeToggle } from "../theme-toggle";

export function EditorHeader() {
  const {
    activeProject,
    renameProject,
    deleteProject,
    hasUnsavedChanges,
    saveCurrentProject,
    savedProjects,
    loadAllProjects,
    isInitialized
  } = useProjectStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const router = useRouter();

  // Load projects if not initialized to populate the recent list
  useEffect(() => {
    if (!isInitialized) {
      loadAllProjects();
    }
  }, [isInitialized, loadAllProjects]);

  // Get 5 most recent projects (excluding the active one)
  const recentProjects = useMemo(() => {
    return savedProjects
      .filter((p) => p.id !== activeProject?.id)
      .sort((a, b) => {
        const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
        const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [savedProjects, activeProject?.id]);

  const handleNameSave = async (newName: string) => {
    console.log("handleNameSave", newName);
    if (activeProject && newName.trim() && newName !== activeProject.name) {
      try {
        await renameProject(activeProject.id, newName.trim());
        setIsRenameDialogOpen(false);
      } catch (error) {
        console.error("Failed to rename project:", error);
      }
    }
  };

  const handleDelete = () => {
    if (activeProject) {
      deleteProject(activeProject.id);
      setIsDeleteDialogOpen(false);
      router.push("/projects");
    }
  };

  const leftContent = (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="h-auto py-1.5 px-2.5 flex items-center justify-center gap-0.5"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground mr-1" />
            <span className="text-[0.85rem] font-medium max-w-[120px] truncate">{activeProject?.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 z-[100] p-1.5">
          <Link href="/projects">
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-[0.85rem]">所有项目</span>
            </DropdownMenuItem>
          </Link>

          {recentProjects.length > 0 && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <div className="px-2 py-1.5 text-[0.65rem] font-bold text-muted-foreground/70 uppercase tracking-widest">
                最近编辑
              </div>
              {recentProjects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  className="flex items-center gap-2 cursor-pointer py-1.5 group"
                  onClick={() => router.push(`/editor/${project.id}`)}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500/40 group-hover:bg-blue-500 transition-colors" />
                  <span className="truncate flex-1 text-[0.8rem] text-foreground/90 group-hover:text-foreground">
                    {project.name}
                  </span>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            className="flex items-center gap-2 cursor-pointer py-2"
            onClick={() => setIsRenameDialogOpen(true)}
          >
            <SquarePen className="h-4 w-4 text-muted-foreground" />
            <span className="text-[0.85rem]">重命名项目</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="flex items-center gap-2 cursor-pointer py-2"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash className="h-4 w-4" />
            <span className="text-[0.85rem]">删除项目</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem asChild>
            <Link
              href="https://discord.gg/zmR9N35cjK"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 cursor-pointer py-2"
            >
              <FaDiscord className="h-4 w-4 text-muted-foreground" />
              <span className="text-[0.85rem]">Discord</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameProjectDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        onConfirm={handleNameSave}
        projectName={activeProject?.name || ""}
      />
      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        projectName={activeProject?.name || ""}
      />
    </div>
  );

  const rightContent = (
    <nav className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => saveCurrentProject()}
        className={`h-8 px-2 text-xs gap-1.5 ${hasUnsavedChanges
          ? "text-muted-foreground hover:bg-muted/50"
          : "text-green-600 hover:text-green-700 hover:bg-green-50/50"
          }`}
        title="点击强制保存"
      >
        <div
          className={`h-2 w-2 rounded-full ${hasUnsavedChanges ? "bg-gray-400" : "bg-green-500"
            }`}
        />
        {hasUnsavedChanges ? "编辑中..." : "已保存"}
      </Button>

      <div className="h-4 w-[1px] bg-border/50 mx-1" />

      <PanelPresetSelector />
      <KeyboardShortcutsHelp />
      <ExportButton />
      <ThemeToggle />
    </nav>
  );

  return (
    <HeaderBase
      leftContent={leftContent}
      rightContent={rightContent}
      className="bg-background h-[3.2rem] px-3 items-center mt-0.5"
    />
  );
}
