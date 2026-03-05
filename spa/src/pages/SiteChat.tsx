import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  pending?: boolean; // assistant message being built
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

function buildMessage(scrapeSummary?: string): string {
  const base = `Build a complete gym website. Create these pages in order: home, programs, about, coaches, schedule, pricing, contact, free-trial.

For EVERY page:
1. Call create_page with a strong hero_headline and hero_subheading
2. Create sections on the page using create_content (table: sections)
3. For EVERY section, immediately create its items using create_content (table: items) — never leave a section with zero items

Required items per section type:
- highlights (why us): exactly 4 items — each needs title + short_body
- programs: 3–6 items — each needs title + short_body + body
- steps (getting started): exactly 3 items — each needs title + body
- features (amenities): 3–4 items — each needs title + short_body
- faq: 5–6 items — each needs title (question) + body (answer)
- coaches: 3–5 items — each needs title (name) + subtitle (role) + body (bio)
- testimonials: 3 items — each needs body (quote) + subtitle (name + gym tenure)

Write specific, confident copy — not generic placeholders. Every item must have real content.
Add nav_items linking all pages. Call rebuild_site once at the very end.`;

  if (scrapeSummary?.trim()) {
    return `${base}\n\nUse this content from their existing website for real copy:\n\n${scrapeSummary}`;
  }
  return `${base}\n\nUse the gym info already in site_config.`;
}

// Friendly display names for tool calls
const TOOL_LABELS: Record<string, string> = {
  get_content: "Reading content",
  get_site_config: "Reading config",
  update_site_config: "Updating config",
  update_page: "Updating page",
  update_content: "Updating content",
  create_content: "Creating content",
  create_page: "Creating page",
  delete_content: "Deleting content",
  list_pages: "Listing pages",
  list_templates: "Listing templates",
  switch_template: "Switching template",
  rebuild_site: "Publishing site",
  test_pushpress_connection: "Testing PushPress",
};

function ToolCallItem({ tc, active }: { tc: ToolCall; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const label = TOOL_LABELS[tc.name] ?? tc.name;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="text-xs bg-gray-50 rounded p-2 border border-gray-100"
    >
      <summary className="cursor-pointer select-none flex items-center gap-2 text-gray-500">
        {active ? (
          <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : (
          <span className="text-green-500 flex-shrink-0">✓</span>
        )}
        <span className="font-medium">{label}</span>
        {tc.name === "create_page" && tc.input?.slug != null && (
          <span className="text-gray-400">/{String(tc.input.slug)}</span>
        )}
        {tc.name === "create_content" && tc.input?.fields != null && (
          typeof (tc.input.fields as Record<string, unknown>).title === 'string' && (
            <span className="text-gray-400 truncate max-w-[120px]">{String((tc.input.fields as Record<string, unknown>).title)}</span>
          )
        )}
      </summary>
      {!active && (
        <pre className="mt-2 overflow-x-auto text-gray-400 max-h-32 overflow-y-auto whitespace-pre-wrap">
          {JSON.stringify(tc.input, null, 2)}
        </pre>
      )}
    </details>
  );
}

export function SiteChat() {
  const { siteId } = useParams<{ siteId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isNewSite = searchParams.get("build") === "true";
  const scrapeSummary = (location.state as { scrapeSummary?: string } | null)?.scrapeSummary;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [autoBuildFired, setAutoBuildFired] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: site } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => fetchSite(siteId!),
    enabled: !!siteId,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessages = useCallback(async (msgs: { role: string; content: string }[]) => {
    if (!siteId || isRunning) return;

    setIsRunning(true);
    abortRef.current = new AbortController();

    // Add a pending assistant message to accumulate tool calls + response
    const pendingIdx = msgs.length; // index in messages array after user msg
    setMessages((prev) => [...prev, { role: "assistant", content: "", toolCalls: [], pending: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, messages: msgs }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "Chat request failed");
        throw new Error(text);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const eventLine = part.match(/^event: (\w+)/m)?.[1];
          const dataLine = part.match(/^data: (.+)/m)?.[1];
          if (!dataLine) continue;

          let payload: unknown;
          try { payload = JSON.parse(dataLine); } catch { continue; }

          if (eventLine === "tool") {
            // Live tool call — append to pending message
            const tc = payload as ToolCall;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.pending) {
                next[next.length - 1] = {
                  ...last,
                  toolCalls: [...(last.toolCalls ?? []), tc],
                };
              }
              return next;
            });
          } else if (eventLine === "done") {
            // Finalize the pending message
            const { response, toolCalls } = payload as { response: string; toolCalls: ToolCall[] };
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "assistant",
                content: response,
                toolCalls,
                pending: false,
              };
              return next;
            });
          } else if (eventLine === "error") {
            throw new Error(String((payload as { error?: unknown }).error ?? "Unknown error"));
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.pending) {
          next[next.length - 1] = { role: "assistant", content: `Error: ${msg}`, pending: false };
        }
        return next;
      });
    } finally {
      setIsRunning(false);
    }

    void pendingIdx; // suppress unused warning
  }, [siteId, isRunning]);

  // Auto-fire site build when navigated here from new site creation
  useEffect(() => {
    if (isNewSite && site && !autoBuildFired && !isRunning) {
      setAutoBuildFired(true);
      const userMsg = buildMessage(scrapeSummary ?? undefined);
      const newMessages = [{ role: "user" as const, content: userMsg }];
      setMessages(newMessages);
      sendMessages(newMessages);
    }
  }, [isNewSite, site, autoBuildFired, isRunning]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRunning) return;
    const userMessage = input.trim();
    setInput("");
    const newMessages = [...messages.filter(m => !m.pending), { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    sendMessages(newMessages.map((m) => ({ role: m.role, content: m.content })));
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
        {messages.length === 0 && !isRunning && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg mb-2">What would you like to change?</p>
            <p className="text-sm text-gray-300">
              Try: "Change the hero headline" · "Update the phone number" · "Make the primary color navy"
            </p>
          </div>
        )}

        {isNewSite && messages.length === 0 && isRunning && (
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
              {msg.pending && !msg.content && (
                <p className="text-sm text-gray-400 italic">Working...</p>
              )}

              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className={`space-y-1 ${msg.content ? "mb-3" : ""}`}>
                  {msg.toolCalls.map((tc, j) => (
                    <ToolCallItem key={j} tc={tc} />
                  ))}
                  {msg.pending && (
                    <div className="text-xs bg-gray-50 rounded p-2 border border-blue-200 flex items-center gap-2 text-blue-500">
                      <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span>Continuing...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Summary — shown after tool calls complete */}
              {msg.content && msg.role === "assistant" && (
                <div className={`${msg.toolCalls?.length ? "pt-3 border-t border-gray-100 mt-1" : ""}`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </div>
              )}
            </div>
          </div>
        ))}

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
            disabled={isRunning}
          />
          <button
            type="submit"
            disabled={isRunning || !input.trim()}
            className="px-5 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 transition-colors text-sm"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              </span>
            ) : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
