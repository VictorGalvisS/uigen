import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" } as any);
});

describe("useAuth — initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("useAuth — signIn", () => {
  test("calls signInAction with the supplied credentials", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("user@example.com", "password123"));

    expect(mockSignIn).toHaveBeenCalledOnce();
    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "password123");
  });

  test("returns the result from signInAction", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    const returnValue = await act(() =>
      result.current.signIn("user@example.com", "wrong")
    );

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("sets isLoading to true while the action is in-flight", async () => {
    let resolveSignIn!: (v: any) => void;
    mockSignIn.mockReturnValue(new Promise((res) => { resolveSignIn = res; }));
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "p1" } as any);

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signIn("u@example.com", "pass"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignIn({ success: false }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false after a successful sign-in", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(result.current.isLoading).toBe(false);
  });

  test("resets isLoading to false even when signInAction rejects", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      try { await result.current.signIn("u@example.com", "pass"); } catch {}
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("does NOT call handlePostSignIn when sign-in fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "wrong"));

    expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    expect(mockGetProjects).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("useAuth — signUp", () => {
  test("calls signUpAction with the supplied credentials", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signUp("new@example.com", "password123"));

    expect(mockSignUp).toHaveBeenCalledOnce();
    expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
  });

  test("returns the result from signUpAction", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "fresh-id" } as any);

    const { result } = renderHook(() => useAuth());
    const returnValue = await act(() =>
      result.current.signUp("new@example.com", "password123")
    );

    expect(returnValue).toEqual({ success: true });
  });

  test("resets isLoading to false after a failed sign-up", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signUp("existing@example.com", "pass"));

    expect(result.current.isLoading).toBe(false);
  });

  test("does NOT call handlePostSignIn when sign-up fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signUp("existing@example.com", "pass"));

    expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("useAuth — handlePostSignIn: anonymous work exists", () => {
  const anonMessages = [{ role: "user", content: "Build a button" }];
  const anonFileSystem = { "/App.tsx": "export default () => <button />" };

  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue({
      messages: anonMessages,
      fileSystemData: anonFileSystem,
    });
    mockCreateProject.mockResolvedValue({ id: "saved-anon-project" } as any);
  });

  test("creates a project with the anon work data", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockCreateProject).toHaveBeenCalledOnce();
    const call = mockCreateProject.mock.calls[0][0];
    expect(call.messages).toEqual(anonMessages);
    expect(call.data).toEqual(anonFileSystem);
  });

  test("project name includes the current time", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    const call = mockCreateProject.mock.calls[0][0];
    expect(call.name).toMatch(/Design from/);
  });

  test("clears anon work after saving", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockClearAnonWork).toHaveBeenCalledOnce();
  });

  test("navigates to the newly created project", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockPush).toHaveBeenCalledWith("/saved-anon-project");
  });

  test("skips getProjects when anon work is present", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockGetProjects).not.toHaveBeenCalled();
  });
});

describe("useAuth — handlePostSignIn: no anon work, existing projects", () => {
  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([
      { id: "most-recent" },
      { id: "older" },
    ] as any);
  });

  test("navigates to the most recent project", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockPush).toHaveBeenCalledWith("/most-recent");
  });

  test("does not create a new project when one already exists", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  test("does not clear anon work when there was none", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockClearAnonWork).not.toHaveBeenCalled();
  });
});

describe("useAuth — handlePostSignIn: no anon work, no existing projects", () => {
  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new" } as any);
  });

  test("creates a new blank project", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockCreateProject).toHaveBeenCalledOnce();
    const call = mockCreateProject.mock.calls[0][0];
    expect(call.messages).toEqual([]);
    expect(call.data).toEqual({});
  });

  test("new project name starts with 'New Design'", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    const call = mockCreateProject.mock.calls[0][0];
    expect(call.name).toMatch(/^New Design #\d+/);
  });

  test("navigates to the newly created project", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });
});

describe("useAuth — handlePostSignIn: anon work present but empty messages", () => {
  test("falls through to existing-projects path when anonWork.messages is empty", async () => {
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "user-project" }] as any);
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@example.com", "pass"));

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/user-project");
  });
});
