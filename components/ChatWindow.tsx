"use client";

import { useRef, useState, useEffect, FormEvent } from "react";
import type { ToolResult } from "@/lib/tools";
import WeatherCard from "@/components/WeatherCard";
import ProductGrid from "@/components/ProductGrid";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  toolResults?: ToolResult[];
}

const SUGGESTIONS = [
  "What's the weather in Nagpur?",
  "Show me Puma shoes under 3000",
];

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendText(text: string) {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // send full history — Phase 3 will make this "real" memory,
        // for now the API route already receives full context each turn
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          toolResults: data.toolResults,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function sendMessage(e: FormEvent) {
    e.preventDefault();
    sendText(input);
  }

  return (
    <div className="flex flex-col flex-1 max-w-3xl w-full mx-auto px-4">
      <div className="flex-1 overflow-y-auto py-8 space-y-6">
        {messages.length === 0 && (
          <div className="pt-16 flex flex-col items-center gap-4">
            <p className="text-ink/40 font-mono text-sm">
              Say something, or try a tool-calling example:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendText(s)}
                  className="text-sm border border-line bg-white rounded-full px-4 py-2
                             hover:border-moss hover:text-moss transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="space-y-3">
            <ChatBubble role={m.role} content={m.content} />
            {m.toolResults && m.toolResults.length > 0 && (
              <div className="flex flex-col gap-3 pl-1">
                {m.toolResults.map((result, i) =>
                  result.type === "weather" ? (
                    <WeatherCard key={i} data={result} />
                  ) : (
                    <ProductGrid key={i} data={result} />
                  )
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && <TypingIndicator />}

        {error && (
          <div className="font-mono text-xs text-rust border border-rust/30 bg-rust/5 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-line py-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={isLoading}
          className="flex-1 bg-white border border-line rounded-lg px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-moss/40 focus:border-moss
                     disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-ink text-paper font-mono text-xs uppercase tracking-wider
                     px-5 py-3 rounded-lg hover:bg-moss transition-colors
                     disabled:opacity-30 disabled:hover:bg-ink"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ role, content }: { role: Role; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
          {isUser ? "you" : "assistant"}
        </span>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-ink text-paper rounded-tr-sm"
              : "bg-white border border-line rounded-tl-sm"
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-line rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
        <span className="dot w-1.5 h-1.5 rounded-full bg-ink/40 inline-block" />
        <span className="dot w-1.5 h-1.5 rounded-full bg-ink/40 inline-block" />
        <span className="dot w-1.5 h-1.5 rounded-full bg-ink/40 inline-block" />
      </div>
    </div>
  );
}
