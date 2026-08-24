import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubTenants } from "@/hooks/useTenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorPicker } from "@/components/ui/color-picker";
import { Building2, Mail, Search, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  parentTenantId: string;
  parentTenantName: string;
  trigger?: React.ReactNode;
}

interface FoundUser {
  user_id: string;
  display_name: string | null;
}

const slugify = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 50);

export function CreateSubAccountDialog({ parentTenantId, parentTenantName, trigger }: Props) {
  const { createSubTenant } = useSubTenants();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");

  const [managerMode, setManagerMode] = useState<"search" | "invite">("search");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FoundUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FoundUser | null>(null);
  const [managerEmail, setManagerEmail] = useState("");

  const reset = () => {
    setName(""); setSlug(""); setContactEmail(""); setPrimaryColor(""); setAccentColor("");
    setManagerMode("search"); setSearch(""); setResults([]); setSelectedUser(null); setManagerEmail("");
  };

  const runSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .ilike("display_name", `%${search.trim()}%`)
        .limit(8);
      if (error) throw error;
      setResults((data ?? []) as FoundUser[]);
      if (!data || data.length === 0) toast.error("No users match that name.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleCreate = () => {
    if (name.trim().length < 2) {
      toast.error("Enter a name for the sub-account.");
      return;
    }
    if (managerMode === "search" && !selectedUser) {
      toast.error("Select the person who will manage this sub-account.");
      return;
    }
    if (managerMode === "invite" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail.trim())) {
      toast.error("Enter a valid email for the sub-account manager.");
      return;
    }

    createSubTenant.mutate(
      {
        parentTenantId,
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        contactEmail: contactEmail.trim() || undefined,
        primaryColor: primaryColor || undefined,
        accentColor: accentColor || undefined,
        managerUserId: managerMode === "search" ? selectedUser?.user_id : undefined,
        managerEmail: managerMode === "invite" ? managerEmail.trim().toLowerCase() : undefined,
      },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1">
            <Building2 className="h-4 w-4" /> Create sub-account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Create sub-account</DialogTitle>
          <DialogDescription>
            A sub-account of {parentTenantName} with its own branding and isolated data. Two managers
            are seated at creation: you (or {parentTenantName}'s admin) and the person you nominate below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Sub-account name</Label>
            <Input
              placeholder="Eastern Arizona College"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(slugify(e.target.value));
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>URL slug</Label>
            <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="eastern-arizona-college" />
          </div>

          <div className="space-y-1.5">
            <Label>Contact email (optional)</Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="esports@eac.edu"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Primary color</Label>
              <ColorPicker value={primaryColor} onChange={setPrimaryColor} />
            </div>
            <div className="space-y-1.5">
              <Label>Accent color</Label>
              <ColorPicker value={accentColor} onChange={setAccentColor} />
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Label>Main manager for this sub-account</Label>
            <Tabs value={managerMode} onValueChange={(v) => setManagerMode(v as "search" | "invite")}>
              <TabsList>
                <TabsTrigger value="search">
                  <Search className="h-3.5 w-3.5 mr-1.5" /> Existing user
                </TabsTrigger>
                <TabsTrigger value="invite">
                  <Mail className="h-3.5 w-3.5 mr-1.5" /> Invite by email
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by display name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
                  />
                  <Button type="button" variant="outline" onClick={runSearch} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {results.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {results.map((r) => (
                      <button
                        key={r.user_id}
                        type="button"
                        onClick={() => setSelectedUser(r)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                          selectedUser?.user_id === r.user_id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          {r.display_name || "Unnamed user"}
                          {selectedUser?.user_id === r.user_id && <Check className="h-4 w-4 text-primary" />}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <p className="text-xs text-muted-foreground">
                    Manager: <Badge variant="outline">{selectedUser.display_name || "Unnamed user"}</Badge>
                  </p>
                )}
              </TabsContent>

              <TabsContent value="invite" className="space-y-2">
                <Input
                  type="email"
                  placeholder="manager@eac.edu"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  They receive an invite and are seated as manager when they register.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <Button className="w-full" onClick={handleCreate} disabled={createSubTenant.isPending}>
            {createSubTenant.isPending ? "Creating..." : "Create sub-account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
