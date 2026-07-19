"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuditRedirectPage() {
  const params = useParams<{ versionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const datasetId = searchParams.get("datasetId");
  const versionId = params.versionId;

  useEffect(() => {
    if (datasetId && versionId) {
      router.replace(`/datasets/${datasetId}/versions/${versionId}`);
    }
  }, [datasetId, versionId, router]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <p className="text-sm text-gray-400">
        {datasetId ? "Redirecting to version detail..." : "Missing datasetId."}
      </p>
    </div>
  );
}
