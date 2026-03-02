import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export function Connect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");

  // If we got redirected back from OAuth with success
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setStatus("success");
      setTimeout(() => navigate("/"), 2000);
    } else if (searchParams.get("error")) {
      setStatus("error");
      setError(searchParams.get("error") || "Unknown error");
    }
  }, [searchParams, navigate]);

  const handleConnect = () => {
    window.location.href = "/api/auth/webflow";
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-sm border">
        <h1 className="text-2xl font-bold mb-2">Grow MVP</h1>
        <p className="text-gray-500 mb-6">
          Connect your Webflow workspace to manage gym sites.
        </p>

        {status === "success" && (
          <div className="p-4 mb-4 bg-green-50 text-green-800 rounded-md">
            Connected successfully! Redirecting...
          </div>
        )}

        {status === "error" && (
          <div className="p-4 mb-4 bg-red-50 text-red-800 rounded-md">
            Connection failed: {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Connect Webflow
        </button>
      </div>
    </div>
  );
}
