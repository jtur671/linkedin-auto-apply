"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Session { hasCredentials: boolean; email?: string; }

export function CredentialsForm({ session, onRefresh }: { session: Session; onRefresh: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    setEmail("");
    setPassword("");
    setLoading(false);
    onRefresh();
  }

  async function handleRemove() {
    setLoading(true);
    await fetch("/api/session", { method: "DELETE" });
    setLoading(false);
    onRefresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>LinkedIn Credentials</CardTitle></CardHeader>
      <CardContent>
        {session.hasCredentials ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Logged in as: <span className="text-foreground font-medium">{session.email}</span></p>
            <Button variant="destructive" size="sm" onClick={handleRemove} disabled={loading}>Remove Credentials</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={loading || !email || !password}>Save Credentials</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
