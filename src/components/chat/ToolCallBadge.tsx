"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function getToolLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  const path = typeof args.path === "string" ? args.path : undefined;
  const basename = path ? path.split("/").pop() ?? path : undefined;
  const command = typeof args.command === "string" ? args.command : undefined;

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return basename ? `Creating ${basename}` : "Creating file...";
      case "str_replace":
        return basename ? `Editing ${basename}` : "Editing file...";
      case "insert":
        return basename ? `Editing ${basename}` : "Editing file...";
      case "view":
        return basename ? `Reading ${basename}` : "Reading file...";
      case "undo_edit":
        return basename ? `Reverting ${basename}` : "Reverting...";
      default:
        return basename ? `Working on ${basename}` : "Working...";
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "rename":
        return basename ? `Renaming ${basename}` : "Renaming file...";
      case "delete":
        return basename ? `Deleting ${basename}` : "Deleting file...";
      default:
        return "Managing files...";
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args, state } = toolInvocation;
  const label = getToolLabel(toolName, (args ?? {}) as Record<string, unknown>);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div data-testid="success-dot" className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 data-testid="loading-spinner" className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
