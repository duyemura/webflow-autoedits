import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; input: Record<string, unknown>; result: string }[];
}

interface ChatResponse {
  response: string;
  toolCalls: { name: string; input: Record<string, unknown>; result: string }[];
}

async function sendChat(siteId: string, messages: { role: string; content: string }[]): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteId, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Chat request failed");
  }
  return res.json();
}

export function SiteChat() {
  const { siteId } = useParams<{ siteId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useMutation({
    mutationFn: (msgs: { role: string; content: string }[]) =>
      sendChat(siteId!, msgs),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, toolCalls: data.toolCalls },
      ]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setInput("");

    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);

    // Send only role+content for the API
    chatMutation.mutate(
      newMessages.map((m) => ({ role: m.role, content: m.content })),
    );
  };

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center gap-4">
        <Link to="/" className="text-gray-500 hover:text-gray-700">
          &larr; Back
        </Link>
        <h1 className="font-semibold">Site: {siteId}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg mb-2">Start customizing this site</p>
            <p className="text-sm">
              Try: "What collections does this site have?" or "Set the gym name to Iron Works Fitness"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border text-gray-800"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.toolCalls.map((tc, j) => (
                    <details key={j} className="text-xs bg-gray-50 rounded p-2 border">
                      <summary className="cursor-pointer font-medium text-gray-600">
                        {tc.name}
                      </summary>
                      <pre className="mt-1 overflow-x-auto text-gray-500">
                        {JSON.stringify(tc.input, null, 2)}
                      </pre>
                      <pre className="mt-1 overflow-x-auto text-gray-500 max-h-40 overflow-y-auto">
                        {tc.result.length > 500 ? tc.result.slice(0, 500) + "..." : tc.result}
                      </pre>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg p-3 text-gray-500">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you'd like to change..."
            className="flex-1 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={chatMutation.isPending}
          />
          <button
            type="submit"
            disabled={chatMutation.isPending || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
