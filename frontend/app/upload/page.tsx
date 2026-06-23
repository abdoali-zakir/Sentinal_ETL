"use client";

import { DragEvent, FormEvent, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type ColumnInfo = {
  name: string;
  dtype: string;
};

type UploadResult = {
  dataset_id: string;
  version_id: string;
  version_number: number;
  row_count: number;
  column_count: number;
  columns: ColumnInfo[];
  bronze_path: string;
};

const ACCEPTED_EXTENSIONS = [".csv", ".json"];

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function parseErrorDetail(body: unknown): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === "object" && item !== null && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : JSON.stringify(item),
        )
        .join(", ");
    }
  }
  return "Upload failed. Please try again.";
}

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [datasetName, setDatasetName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | null) {
    if (!file) return;
    if (!isAcceptedFile(file)) {
      setError("Only CSV and JSON files are supported.");
      setSelectedFile(null);
      return;
    }
    setError(null);
    setResult(null);
    setSelectedFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!datasetName.trim()) {
      setError("Dataset name is required.");
      return;
    }

    if (!selectedFile) {
      setError("Please select a CSV or JSON file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("name", datasetName.trim());
    formData.append("file", selectedFile);

    setIsUploading(true);

    try {
      const response = await apiFetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });

      const body = await response.json();

      if (!response.ok) {
        setError(parseErrorDetail(body));
        return;
      }

      setResult(body as UploadResult);
    } catch {
      setError("Could not reach the API. Check that the backend is running.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Upload Dataset</h1>
      <p className="mb-8 text-sm text-gray-500">
        Ingest a CSV or JSON file into the bronze layer.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="dataset-name"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Dataset name
          </label>
          <input
            id="dataset-name"
            type="text"
            value={datasetName}
            onChange={(event) => setDatasetName(event.target.value)}
            placeholder="e.g. customer-orders"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-gray-400 focus:outline-none"
            disabled={isUploading}
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">
            Data file
          </span>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                inputRef.current?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-lg border-2 border-dashed bg-white p-10 text-center shadow-sm transition-colors ${
              isDragging
                ? "border-bronze bg-bronze/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={(event) =>
                handleFile(event.target.files?.[0] ?? null)
              }
            />
            <p className="text-sm font-medium text-gray-700">
              Drag and drop a file here, or click to browse
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Accepted formats: .csv, .json
            </p>
            {selectedFile && (
              <p className="mt-4 text-sm text-gray-600">
                Selected:{" "}
                <span className="font-medium">{selectedFile.name}</span>
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isUploading ? "Uploading..." : "Upload to Bronze"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold">Upload successful</h2>
            <span className="inline-flex items-center rounded-full bg-bronze/15 px-2.5 py-0.5 text-xs font-medium text-bronze">
              Bronze Layer
            </span>
          </div>

          <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Dataset ID</dt>
              <dd className="font-mono text-xs text-gray-900">
                {result.dataset_id}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Version</dt>
              <dd className="font-medium text-gray-900">
                v{result.version_number}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Row count</dt>
              <dd className="font-medium text-gray-900">{result.row_count}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Column count</dt>
              <dd className="font-medium text-gray-900">
                {result.column_count}
              </dd>
            </div>
          </dl>

          <h3 className="mb-3 text-sm font-medium text-gray-700">Columns</h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">
                    Dtype
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {result.columns.map((column) => (
                  <tr key={column.name}>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {column.name}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">
                      {column.dtype}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
