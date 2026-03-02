import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

interface Site {
  id: string;
  displayName: string;
  shortName: string;
  previewUrl: string;
  lastPublished: string;
  tag: "template" | "client" | "untagged";
  clientConfig?: { name: string; clonedFrom?: string; createdAt: string };
}

async function fetchSites(): Promise<Site[]> {
  const res = await fetch("/api/sites");
  if (res.status === 401) throw new Error("not_connected");
  if (!res.ok) throw new Error("Failed to fetch sites");
  const data = await res.json();
  return data.sites;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data: sites, isLoading, error } = useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites,
  });

  if (error?.message === "not_connected") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Grow MVP</h1>
          <p className="text-gray-500 mb-6">Connect your Webflow workspace to get started.</p>
          <Link
            to="/connect"
            className="py-2 px-6 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Connect Webflow
          </Link>
        </div>
      </div>
    );
  }

  const templates = sites?.filter((s) => s.tag === "template") ?? [];
  const clients = sites?.filter((s) => s.tag === "client") ?? [];
  const untagged = sites?.filter((s) => s.tag === "untagged") ?? [];

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Grow MVP</h1>
        <Link
          to="/connect"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Reconnect Webflow
        </Link>
      </div>

      {isLoading && <p className="text-gray-500">Loading sites...</p>}

      {templates.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Templates</h2>
          <div className="grid gap-3">
            {templates.map((site) => (
              <SiteCard key={site.id} site={site} onClick={() => navigate(`/sites/${site.id}`)} />
            ))}
          </div>
        </section>
      )}

      {clients.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Client Sites</h2>
          <div className="grid gap-3">
            {clients.map((site) => (
              <SiteCard key={site.id} site={site} onClick={() => navigate(`/sites/${site.id}`)} />
            ))}
          </div>
        </section>
      )}

      {untagged.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Other Sites</h2>
          <div className="grid gap-3">
            {untagged.map((site) => (
              <SiteCard key={site.id} site={site} onClick={() => navigate(`/sites/${site.id}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SiteCard({ site, onClick }: { site: Site; onClick: () => void }) {
  const tagColors: Record<string, string> = {
    template: "bg-purple-100 text-purple-700",
    client: "bg-green-100 text-green-700",
    untagged: "bg-gray-100 text-gray-600",
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{site.displayName}</h3>
          <p className="text-sm text-gray-500">{site.shortName}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${tagColors[site.tag]}`}>
          {site.tag}
        </span>
      </div>
    </button>
  );
}
