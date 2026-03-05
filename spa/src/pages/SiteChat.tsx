import { useState, useRef, useEffect } from "react";
import { useParams, Link, useSearchParams, useLocation } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; input: Record<string, unknown>; result: string }[];
}

interface ChatResponse {
  response: string;
  toolCalls: { name: string; input: Record<string, unknown>; result: string }[];
}

interface Site {
  id: string;
  subdomain: string;
  site_config: { name: string } | null;
}

async function fetchSite(siteId: string): Promise<Site> {
  const res = await fetch("/api/sites");
  if (!res.ok) throw new Error("Failed to fetch sites");
  const sites: Site[] = await res.json();
  const site = sites.find((s) => s.id === siteId);
  if (!site) throw new Error("Site not found");
  return site;
}

async function sendChat(siteId: string, messages: { role: string; content: string }[]): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteId, messages }),
  });
  if (!res.ok) throw new Error(await res.text() || "Chat request failed");
  return res.json();
}

function buildMessage(scrapeSummary?: string): string {
  const base = "Build a complete gym website — all standard pages: programs, about, coaches, schedule, pricing, contact, and a free trial landing page. Build all sections with strong conversion-focused copy. After all pages are created, call rebuild_site once.";
  if (scrapeSummary?.trim()) {
    return `${base}\n\nHere's content from their existing website — use it to write specific, real copy instead of placeholders:\n\n${scrapeSummary}`;
  }
  return `${base} Use the gym info already in site_config.`;
}

export function SiteChat() {
  const { siteId } = useParams<{ siteId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isNewSite = searchParams.get("build") === "true";
  const scrapeSummary = (location.state as { scrapeSummary?: string } | null)?.scrapeSummary;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [autoBuildFired, setAutoBuildFired] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: site } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => fetchSite(siteId!),
    enabled: !!siteId,
  });

  const chatMutation = useMutation({
    mutationFn: (msgs: { role: string; content: string }[]) => sendChat(siteId!, msgs),
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

  // Auto-fire site build when navigated here from new site creation
  useEffect(() => {
    if (isNewSite && site && !autoBuildFired && !chatMutation.isPending) {
      setAutoBuildFired(true);
      const newMessages = [{ role: "user" as const, content: buildMessage(scrapeSummary) }];
      setMessages(newMessages);
      chatMutation.mutate(newMessages);
    }
  }, [isNewSite, site, autoBuildFired, chatMutation.isPending]);

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
    chatMutation.mutate(newMessages.map((m) => ({ role: m.role, content: m.content })));
  };

  const siteName = site?.site_config?.name ?? site?.subdomain ?? siteId;

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-gray-700">&larr;</Link>
          <h1 className="font-semibold">{siteName}</h1>
        </div>
        {site && (
          <a
            href={`/api/sites/${site.id}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            Preview ↗
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && !chatMutation.isPending && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg mb-2">What would you like to change?</p>
            <p className="text-sm text-gray-300">
              Try: "Change the hero headline" · "Update the phone number" · "Make the primary color navy"
            </p>
          </div>
        )}

        {isNewSite && messages.length === 0 && chatMutation.isPending && (
          <div className="flex flex-col items-center justify-center mt-20 gap-4">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-gray-500 font-medium">Building your site...</p>
            <p className="text-sm text-gray-400">Creating all pages, sections, and navigation. This takes about 30 seconds.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border text-gray-800"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-3 space-y-1">
                  {msg.toolCalls.map((tc, j) => (
                    <details key={j} className="text-xs bg-gray-50 rounded p-2 border">
                      <summary className="cursor-pointer font-mono text-gray-500">
                        {tc.name}
                      </summary>
                      <pre className="mt-1 overflow-x-auto text-gray-400 max-h-32 overflow-y-auto">
                        {JSON.stringify(tc.input, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {chatMutation.isPending && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg p-3 text-gray-400 text-sm">Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you'd like to change..."
            className="flex-1 p-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={chatMutation.isPending}
          />
          <button
            type="submit"
            disabled={chatMutation.isPending || !input.trim()}
            className="px-5 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
