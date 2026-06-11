"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface ResumeInfo {
  id: number;
  filename: string;
  uploadedAt: string;
  preview: string;
}

export function ResumeUpload() {
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchResume = useCallback(async () => {
    const res = await fetch("/api/resume");
    const data = await res.json();
    setResume(data.resume);
  }, []);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  async function handleUpload(file: File) {
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
      } else {
        setResume(data.resume);
      }
    } catch {
      setError("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!resume) return;
    await fetch(`/api/resume?id=${resume.id}`, { method: "DELETE" });
    setResume(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {resume ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{resume.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {showPreview && (
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                {resume.preview}...
              </div>
            )}
            <label className="cursor-pointer inline-flex items-center">
              <Button variant="outline" size="sm" onClick={() => {}}>
                <Upload className="mr-2 h-3 w-3" />
                Replace
              </Button>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={onFileChange}
              />
            </label>
          </div>
        ) : (
          <label
            className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-medium">
              {loading ? "Uploading..." : "Drop your resume here or click to upload"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, or TXT
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={onFileChange}
              disabled={loading}
            />
          </label>
        )}
        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}
      </CardContent>
    </Card>
  );
}
