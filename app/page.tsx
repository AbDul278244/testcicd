import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="border-b border-line px-6 py-4 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display italic text-2xl">Assistant</h1>
          <span className="font-mono text-xs text-ink/50 uppercase tracking-wider">
            Phase 05 · tool calling
          </span>
        </div>
        <span className="font-mono text-xs text-moss">● online</span>
      </header>
      <ChatWindow />
    </main>
  );
}
