import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

async function deleteSite(siteId: string): Promise<void> {
  const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to delete site");
  }
}

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: sites, isLoading, error } = useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSite,
    onSuccess: () => {
      setConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
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
        {sites?.map((site) => {
          const isConfirming = confirmId === site.id;
          const isDeleting = deleteMutation.isPending && confirmId === site.id;

          return (
            <div
              key={site.id}
              className="bg-white rounded-lg border hover:border-gray-300 transition-all"
            >
              <div className="flex items-center">
                {/* Main card — navigates to chat */}
                <button
                  onClick={() => !isConfirming && navigate(`/sites/${site.id}`)}
                  className="flex-1 text-left p-4 min-w-0"
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

                {/* Delete control */}
                <div className="flex-shrink-0 pr-3">
                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button
                        onClick={() => deleteMutation.mutate(site.id)}
                        disabled={isDeleting}
                        className="px-2.5 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {isDeleting ? "Deleting…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={isDeleting}
                        className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmId(site.id); }}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded"
                      title="Delete site"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {deleteMutation.isError && confirmId === site.id && (
                <p className="px-4 pb-3 text-xs text-red-500">{deleteMutation.error.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
