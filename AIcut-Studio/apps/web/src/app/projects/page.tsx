"use client";

import {
  Calendar,
  ChevronLeft,
  Loader2,
  MoreHorizontal,
  ArrowDown01,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { RenameProjectDialog } from "@/components/rename-project-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import type { TProject } from "@/types/project";

export default function ProjectsPage() {
  const {
    savedProjects,
    isLoading,
    isInitialized,
    deleteProject,
    createNewProject,
    loadAllProjects, // Added loadAllProjects to destructuring
    getFilteredAndSortedProjects,
  } = useProjectStore();
  const [thumbnailCache, setThumbnailCache] = useState<
    Record<string, string | null>
  >({});
  const [_loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(
    new Set()
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set()
  );
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("createdAt-desc");
  const router = useRouter();

  // Load projects on mount
  useEffect(() => {
    console.log("[Projects] Initial load...");
    loadAllProjects();
  }, [loadAllProjects]);

  // SSE listener for real-time project list refresh
  useEffect(() => {
    console.log("[Projects] Establishing SSE for list sync...");
    const eventSource = new EventSource("/api/ai-edit/sync");

    eventSource.addEventListener("update", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action === "refreshProjects" || data.action === "projectDeleted") {
          console.log("[Projects] External project change detected, refreshing list...");
          loadAllProjects();
        }
      } catch (e) {
        console.error("[Projects] SSE message parse error:", e);
      }
    });

    eventSource.onerror = () => {
      // EventSource handles retries automatically
    };

    return () => {
      eventSource.close();
    };
  }, [loadAllProjects]);

  const getProjectThumbnail = useCallback(
    async (projectId: string): Promise<string | null> => {
      if (thumbnailCache[projectId] !== undefined) {
        return thumbnailCache[projectId];
      }

      setLoadingThumbnails((prev) => new Set(prev).add(projectId));

      try {
        const thumbnail = await useTimelineStore
          .getState()
          .getProjectThumbnail(projectId);
        setThumbnailCache((prev) => ({ ...prev, [projectId]: thumbnail }));
        return thumbnail;
      } finally {
        setLoadingThumbnails((prev) => {
          const newSet = new Set(prev);
          newSet.delete(projectId);
          return newSet;
        });
      }
    },
    []
  );

  const handleCreateProject = async () => {
    const projectId = await createNewProject("新建项目");
    console.log("projectId", projectId);
    router.push(`/editor/${projectId}`);
  };

  const handleSelectProject = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectId);
    } else {
      newSelected.delete(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(new Set(sortedProjects.map((p) => p.id)));
    } else {
      setSelectedProjects(new Set());
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedProjects(new Set());
  };

  const handleBulkDelete = async () => {
    await Promise.all(
      Array.from(selectedProjects).map((projectId) => deleteProject(projectId))
    );
    setSelectedProjects(new Set());
    setIsSelectionMode(false);
    setIsBulkDeleteDialogOpen(false);
  };

  const sortedProjects = getFilteredAndSortedProjects(searchQuery, sortOption);

  const allSelected =
    sortedProjects.length > 0 &&
    selectedProjects.size === sortedProjects.length;
  const someSelected =
    selectedProjects.size > 0 && selectedProjects.size < sortedProjects.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-6 px-6 flex items-center justify-between w-full h-16">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-muted-foreground transition-colors"
        >
          <ChevronLeft className="size-5! shrink-0" />
          <span className="text-sm font-medium">返回</span>
        </Link>
        <div className="block md:hidden">
          {isSelectionMode ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
              >
                <X className="size-4!" />
                取消
              </Button>
              {selectedProjects.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4!" />
                  删除 ({selectedProjects.size})
                </Button>
              )}
            </div>
          ) : (
            <CreateButton onClick={handleCreateProject} />
          )}
        </div>
      </div>
      <main className="max-w-6xl mx-auto px-6 pt-6 pb-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              我的项目
            </h1>
            <p className="text-muted-foreground">
              {savedProjects.length} 个项目
              {isSelectionMode && selectedProjects.size > 0 && (
                <span className="ml-2 text-primary">
                  • 已选择 {selectedProjects.size} 个
                </span>
              )}
            </p>
          </div>
          <div className="hidden md:block">
            {isSelectionMode ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCancelSelection}>
                  <X className="size-4!" />
                  取消
                </Button>
                {selectedProjects.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="size-4!" />
                    删除所选 ({selectedProjects.size})
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsSelectionMode(true)}
                  disabled={savedProjects.length === 0}
                >
                  选择项目
                </Button>
                <CreateButton onClick={handleCreateProject} />
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-72">
            <Input
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-0">
            <TooltipProvider>
              <Tooltip>
                <DropdownMenu>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="justify-center items-center w-9 h-9"
                      >
                        <ArrowDown01
                          strokeWidth={1.5}
                          className="!size-[1.05rem]"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        if (sortOption.startsWith("createdAt")) {
                          setSortOption(
                            sortOption.endsWith("asc")
                              ? "createdAt-desc"
                              : "createdAt-asc"
                          );
                        } else {
                          setSortOption("createdAt-asc");
                        }
                      }}
                    >
                      创建时间{" "}
                      {sortOption.startsWith("createdAt") &&
                        (sortOption.endsWith("asc") ? "↑" : "↓")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (sortOption.startsWith("name")) {
                          setSortOption(
                            sortOption.endsWith("asc")
                              ? "name-desc"
                              : "name-asc"
                          );
                        } else {
                          setSortOption("name-asc");
                        }
                      }}
                    >
                      名称{" "}
                      {sortOption.startsWith("name") &&
                        (sortOption.endsWith("asc") ? "↑" : "↓")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <TooltipContent>
                  <p>
                    按{sortOption.startsWith("createdAt") ? "日期" : "名称"}排序 (
                    {sortOption.endsWith("asc") ? "升序" : "降序"})
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {isSelectionMode && sortedProjects.length > 0 && (
          <button
            type="button"
            onClick={() => handleSelectAll(!allSelected)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelectAll(!allSelected);
              }
            }}
            className="w-full hover:cursor-pointer gap-2 mb-6 p-4 bg-muted/30 rounded-lg border items-center flex"
            tabIndex={0}
          >
            <Checkbox checked={someSelected ? "indeterminate" : allSelected} />
            <span className="text-sm font-medium">
              {allSelected ? "取消全选" : "全选"}
            </span>
            <span className="text-sm text-muted-foreground">
              (已选 {selectedProjects.size} / {sortedProjects.length})
            </span>
          </button>
        )}

        {isLoading || !isInitialized ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={`skeleton-${index}-${Date.now()}`}
                className="overflow-hidden bg-background border-none p-0"
              >
                <Skeleton className="aspect-square w-full bg-muted/50" />
                <div className="px-0 pt-5 flex flex-col gap-1">
                  <Skeleton className="h-4 w-3/4 bg-muted/50" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-4 bg-muted/50" />
                    <Skeleton className="h-4 w-24 bg-muted/50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : savedProjects.length === 0 ? (
          <NoProjects onCreateProject={handleCreateProject} />
        ) : sortedProjects.length === 0 ? (
          <NoResults
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
          />
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelectionMode={isSelectionMode}
                isSelected={selectedProjects.has(project.id)}
                onSelect={handleSelectProject}
                getProjectThumbnail={getProjectThumbnail}
              />
            ))}
          </div>
        )}
      </main>

      <DeleteProjectDialog
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}

interface ProjectCardProps {
  project: TProject;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (projectId: string, checked: boolean) => void;
  getProjectThumbnail: (projectId: string) => Promise<string | null>;
}

function ProjectCard({
  project,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  getProjectThumbnail,
}: ProjectCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [dynamicThumbnail, setDynamicThumbnail] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { deleteProject, renameProject, duplicateProject } = useProjectStore();

  useEffect(() => {
    const loadThumbnail = async () => {
      setIsLoadingThumbnail(true);
      try {
        const thumbnail = await getProjectThumbnail(project.id);
        setDynamicThumbnail(thumbnail);
        setImageError(false);
      } finally {
        setIsLoadingThumbnail(false);
      }
    };
    loadThumbnail();
  }, [project.id, getProjectThumbnail]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDeleteProject = async () => {
    await deleteProject(project.id);
    setIsDropdownOpen(false);
  };

  const handleRenameProject = async (newName: string) => {
    await renameProject(project.id, newName);
    setIsRenameDialogOpen(false);
  };

  const handleDuplicateProject = async () => {
    setIsDropdownOpen(false);
    await duplicateProject(project.id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onSelect?.(project.id, !isSelected);
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (isSelectionMode && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSelect?.(project.id, !isSelected);
    }
  };

  const cardContent = (
    <Card
      className={`overflow-hidden bg-background border-none p-0 transition-all ${isSelectionMode && isSelected ? "ring-2 ring-primary" : ""
        }`}
    >
      <div
        className={`relative aspect-square bg-muted transition-opacity ${isDropdownOpen ? "opacity-65" : "opacity-100 group-hover:opacity-65"
          }`}
      >
        {isSelectionMode && (
          <div className="absolute top-3 left-3 z-10">
            <div className="w-5 h-5 rounded-full bg-background/80 backdrop-blur-xs border flex items-center justify-center">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  onSelect?.(project.id, checked as boolean)
                }
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4"
              />
            </div>
          </div>
        )}

        <div className="absolute inset-0">
          {isLoadingThumbnail ? (
            <div className="w-full h-full bg-muted/50 flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
            </div>
          ) : dynamicThumbnail && !imageError ? (
            <Image
              src={dynamicThumbnail}
              alt="Project thumbnail"
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-muted/50 flex items-center justify-center">
              <Video className="h-12 w-12 shrink-0 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <CardContent className="px-0 pt-5 flex flex-col gap-1">
        <div className="flex items-start justify-between">
          <h3 className="font-medium text-sm leading-snug group-hover:text-foreground/90 transition-colors line-clamp-2">
            {project.name}
          </h3>
          {!isSelectionMode && (
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="text"
                  size="sm"
                  className={`size-6 p-0 transition-all shrink-0 ml-2 ${isDropdownOpen
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                    }`}
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDropdownOpen(false);
                    setIsRenameDialogOpen(true);
                  }}
                >
                  重命名
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDuplicateProject();
                  }}
                >
                  复制
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDropdownOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-4!" />
            <span>创建于 {formatDate(project.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {isSelectionMode ? (
        <button
          type="button"
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          className="block group cursor-pointer w-full text-left"
        >
          {cardContent}
        </button>
      ) : (
        <Link href={`/editor/${project.id}`} className="block group">
          {cardContent}
        </Link>
      )}
      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteProject}
      />
      <RenameProjectDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        onConfirm={handleRenameProject}
        projectName={project.name}
      />
    </>
  );
}

function CreateButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button className="flex" onClick={onClick}>
      <Plus className="size-4!" />
      <span className="text-sm font-medium">新建项目</span>
    </Button>
  );
}

function NoProjects({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
        <Video className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">暂无项目</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        开始创建您的第一个视频项目。导入素材、编辑并导出专业视频。
      </p>
      <Button size="lg" className="gap-2" onClick={onCreateProject}>
        <Plus className="h-4 w-4" />
        创建第一个项目
      </Button>
    </div>
  );
}

function NoResults({
  searchQuery,
  onClearSearch,
}: {
  searchQuery: string;
  onClearSearch: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">未找到结果</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        搜索 "{searchQuery}" 没有返回任何结果。
      </p>
      <Button onClick={onClearSearch} variant="outline">
        清除搜索
      </Button>
    </div>
  );
}
