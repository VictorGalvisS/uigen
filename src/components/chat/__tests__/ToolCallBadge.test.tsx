import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- getToolLabel unit tests (no rendering) ---

test("str_replace_editor create with path returns Creating basename", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "src/components/Card.jsx" })).toBe("Creating Card.jsx");
});

test("str_replace_editor str_replace with path returns Editing basename", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "src/components/Card.jsx" })).toBe("Editing Card.jsx");
});

test("str_replace_editor insert with path returns Editing basename", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "src/components/Card.jsx" })).toBe("Editing Card.jsx");
});

test("str_replace_editor view with path returns Reading basename", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "index.js" })).toBe("Reading index.js");
});

test("str_replace_editor undo_edit with path returns Reverting basename", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "src/main.tsx" })).toBe("Reverting main.tsx");
});

test("str_replace_editor create without path returns Creating file...", () => {
  expect(getToolLabel("str_replace_editor", { command: "create" })).toBe("Creating file...");
});

test("str_replace_editor unknown command with path returns Working on basename", () => {
  expect(getToolLabel("str_replace_editor", { command: "unknown_cmd", path: "Card.jsx" })).toBe("Working on Card.jsx");
});

test("str_replace_editor with empty args returns Working...", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("Working...");
});

test("file_manager rename with path returns Renaming basename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "src/old.jsx" })).toBe("Renaming old.jsx");
});

test("file_manager delete with path returns Deleting basename", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "src/utils.ts" })).toBe("Deleting utils.ts");
});

test("file_manager with empty args returns Managing files...", () => {
  expect(getToolLabel("file_manager", {})).toBe("Managing files...");
});

test("unknown tool name returns tool name unchanged", () => {
  expect(getToolLabel("some_other_tool", { command: "run", path: "file.ts" })).toBe("some_other_tool");
});

// --- ToolCallBadge component render tests ---

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "partial-call" | "result" = "result"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "test-id", toolName, args, state, result: "Success" };
  }
  return { toolCallId: "test-id", toolName, args, state } as ToolInvocation;
}

test("shows loading spinner when state is call", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "App.jsx" }, "call")}
    />
  );
  expect(document.querySelector('[data-testid="loading-spinner"]')).toBeTruthy();
  expect(document.querySelector('[data-testid="success-dot"]')).toBeNull();
});

test("shows green dot when state is result", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "App.jsx" })}
    />
  );
  expect(document.querySelector('[data-testid="success-dot"]')).toBeTruthy();
  expect(document.querySelector('[data-testid="loading-spinner"]')).toBeNull();
});

test("shows loading spinner when state is partial-call", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", {}, "partial-call")}
    />
  );
  expect(document.querySelector('[data-testid="loading-spinner"]')).toBeTruthy();
});

test("extracts basename from nested path", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "src/components/Card.jsx" })}
    />
  );
  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
});

test("renders the label text in the badge", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "Button.tsx" })}
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("renders fallback tool name for unknown tools", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("custom_tool", {})}
    />
  );
  expect(screen.getByText("custom_tool")).toBeDefined();
});

test("renders file_manager delete label", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("file_manager", { command: "delete", path: "src/old-component.tsx" })}
    />
  );
  expect(screen.getByText("Deleting old-component.tsx")).toBeDefined();
});
