import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";

interface Site {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  published: boolean;
  site_config: { name: string; tagline: string; primary_color: string } | null;
  templates: { name: string; slug: string } | null;
}

async function fetchSites(): Promise<Site[]> {
  const res = await fetch("/api/sites");
  if (!res.ok) throw new Error("Failed to fetch sites");
  return res.json();
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data: sites, isLoading, error } = useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites,
  });

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Grow</h1>
          <p className="text-gray-500 text-sm mt-1">Chat-driven website editing</p>
        </div>
        <Link
          to="/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Site
        </Link>
      </div>

      {isLoading && <p className="text-gray-400">Loading sites...</p>}
      {error && <p className="text-red-500">Error: {error.message}</p>}

      {sites?.length === 0 && !isLoading && (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-4">No sites yet</p>
          <Link
            to="/new"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create your first site →
          </Link>
        </div>
      )}

      <div className="grid gap-3">
        {sites?.map((site) => (
          <button
            key={site.id}
            onClick={() => navigate(`/sites/${site.id}`)}
            className="w-full text-left p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {site.site_config?.primary_color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-200"
                    style={{ background: site.site_config.primary_color }}
                  />
                )}
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{site.site_config?.name ?? site.name}</h3>
                  {site.site_config?.tagline && (
                    <p className="text-sm text-gray-400 mt-0.5 truncate">{site.site_config.tagline}</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className="text-xs text-gray-400">{site.subdomain}.growsites.io</span>
                {site.templates && (
                  <p className="text-xs text-gray-300 mt-0.5">{site.templates.name}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
