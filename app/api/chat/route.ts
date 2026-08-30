import { NextRequest, NextResponse } from "next/server";
import { toolDefinitions, executeTool, ToolResult } from "@/lib/tools";

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT =
  "You are a helpful, concise AI assistant embedded in a chat product. " +
  "Use the getWeather tool for weather questions and the searchProducts tool " +
  "for shoe/footwear search requests. Keep answers clear and to the point. " +
  "When a tool returns data, summarize it naturally in 1-2 sentences — " +
  "the UI will already show the detailed card, so don't repeat every field.";

async function callGroq(body: Record<string, unknown>) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody?.error?.message || `Groq request failed (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: IncomingMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages[] is required" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not set on the server" },
        { status: 500 }
      );
    }

    const baseMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // ---- Step 1: ask the model, offering it the tools ----
    const first = await callGroq({
      model: GROQ_MODEL,
      messages: baseMessages,
      tools: toolDefinitions,
      tool_choice: "auto",
    });

    const firstMessage = first.choices?.[0]?.message;
    const toolCalls = firstMessage?.tool_calls;

    // No tool call — the model answered directly, nothing more to do.
    if (!toolCalls || toolCalls.length === 0) {
      return NextResponse.json({
        reply: firstMessage?.content ?? "",
        toolResults: [] as ToolResult[],
      });
    }

    // ---- Step 2: actually execute each requested tool, server-side ----
    const toolResults: ToolResult[] = [];
    const toolResultMessages = [];

    for (const call of toolCalls) {
      const args = JSON.parse(call.function.arguments || "{}");
      try {
        const result = await executeTool(call.function.name, args);
        toolResults.push(result);
        toolResultMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      } catch (toolErr) {
        toolResultMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: toolErr instanceof Error ? toolErr.message : "Tool execution failed",
          }),
        });
      }
    }

    // ---- Step 3: send the tool results back so the model can write the final reply ----
    const second = await callGroq({
      model: GROQ_MODEL,
      messages: [...baseMessages, firstMessage, ...toolResultMessages],
    });

    const finalReply = second.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ reply: finalReply, toolResults });
  } catch (err) {
    console.error("chat api error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
