"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

interface ProfileAnswer { id: number; fieldLabel: string; fieldType: string; answer: string; }

export function ProfileAnswersForm({ answers, onRefresh }: { answers: ProfileAnswer[]; onRefresh: () => void }) {
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!fieldLabel.trim() || !answer.trim()) return;
    setLoading(true);
    await fetch("/api/config/profile-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldLabel, fieldType, answer }),
    });
    setFieldLabel("");
    setAnswer("");
    setLoading(false);
    onRefresh();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/config/profile-answers?id=${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Profile Answers</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-1">
              <Label>Field Label</Label>
              <Input placeholder="e.g. Years of experience" value={fieldLabel} onChange={e => setFieldLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="radio">Radio</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <Input placeholder="e.g. 5" value={answer} onChange={e => setAnswer(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={loading || !fieldLabel.trim() || !answer.trim()}>Add Answer</Button>
        </div>
        {answers.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              {answers.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{a.fieldLabel}</div>
                    <div className="text-xs text-muted-foreground">Type: {a.fieldType} &bull; Answer: {a.answer}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
