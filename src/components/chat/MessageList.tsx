"use client";

import { Message } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallBadge } from "./ToolCallBadge";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="flex flex-col px-4 py-6">
      <div className="space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id || message.content}
            className={cn(
              "flex gap-3 items-end",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className="shrink-0">
              {message.role === "assistant" ? (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shadow-sm">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>

            <div className={cn(
              "flex flex-col gap-1 max-w-[78%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-neutral-100 text-neutral-900 rounded-bl-sm"
              )}>
                {message.parts ? (
                  <>
                    {message.parts.map((part, partIndex) => {
                      switch (part.type) {
                        case "text":
                          return message.role === "user" ? (
                            <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                          ) : (
                            <MarkdownRenderer
                              key={partIndex}
                              content={part.text}
                              className="prose-sm"
                            />
                          );
                        case "reasoning":
                          return (
                            <div key={partIndex} className="mt-3 p-3 bg-black/5 rounded-lg">
                              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide block mb-1">Reasoning</span>
                              <span className="text-sm text-neutral-600">{part.reasoning}</span>
                            </div>
                          );
                        case "tool-invocation":
                          return (
                            <ToolCallBadge key={partIndex} toolInvocation={part.toolInvocation} />
                          );
                        case "source":
                          return (
                            <div key={partIndex} className="mt-2 text-xs text-neutral-400">
                              Source: {JSON.stringify(part.source)}
                            </div>
                          );
                        case "step-start":
                          return partIndex > 0 ? <hr key={partIndex} className="my-3 border-neutral-200" /> : null;
                        default:
                          return null;
                      }
                    })}
                    {isLoading &&
                      message.role === "assistant" &&
                      messages.indexOf(message) === messages.length - 1 && (
                        <div className="flex items-center gap-1.5 mt-2 text-neutral-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Generating…</span>
                        </div>
                      )}
                  </>
                ) : message.content ? (
                  message.role === "user" ? (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  ) : (
                    <MarkdownRenderer content={message.content} className="prose-sm" />
                  )
                ) : isLoading &&
                  message.role === "assistant" &&
                  messages.indexOf(message) === messages.length - 1 ? (
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">Generating…</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
