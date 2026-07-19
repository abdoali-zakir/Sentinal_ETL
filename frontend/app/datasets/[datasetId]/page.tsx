"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DatasetRedirectPage() {
  const params = useParams<{ datasetId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const versionId = searchParams.get("versionId");

  useEffect(() => {
    if (versionId) {
      router.replace(`/datasets/${params.datasetId}/versions/${versionId}`);
    }
  }, [params.datasetId, versionId, router]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <p className="text-sm text-gray-400">
        {versionId ? "Redirecting..." : "Missing version ID."}
      </p>
    </div>
  );
}
