import { useState, useCallback } from "react";
import { useWebPages, type WebPageSection, SECTION_TYPES } from "@/hooks/useWebPages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, GripVertical, Eye, Settings, ChevronUp, ChevronDown, Save, Loader2, Download } from "lucide-react";
import SectionEditor from "./SectionEditor";
import SectionPreview from "./SectionPreview";
import AddSectionDialog from "./AddSectionDialog";
import { toast } from "sonner";
import { exportPageAsHtml } from "@/lib/exportWebPage";

interface TenantBranding {
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
}

interface Props {
  pageId: string;
  tenantId?: string | null;
  onBack: () => void;
  tenantBranding?: TenantBranding;
  bannerMode?: boolean;
  titleOverride?: string;
  settingsLabel?: string;
}

const WebPageEditor = ({ pageId, tenantId, onBack, tenantBranding, bannerMode, titleOverride, settingsLabel }: Props) => {
  const { pages, useSections, updatePage, addSection, updateSection, deleteSection, reorderSections } = useWebPages(tenantId);
  const { data: sections = [], isLoading: sectionsLoading } = useSections(pageId);
  const page = pages.find((p) => p.id === pageId);

  const [addOpen, setAddOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [pendingConfigs, setPendingConfigs] = useState<Record<string, Record<string, any>>>({});

  const handleAddSection = useCallback((type: string) => {
    let config: Record<string, any> | undefined;
    if (tenantBranding) {
      if (type === "hero") {
        config = {
          button_color: tenantBranding.primaryColor || undefined,
          button_text_color: tenantBranding.primaryColor ? "#ffffff" : undefined,
        };
      } else if (type === "cta") {
        config = {
          bg_color: tenantBranding.primaryColor || undefined,
          button_color: tenantBranding.accentColor || undefined,
        };
      }
    }
    addSection.mutate({ page_id: pageId, section_type: type, display_order: sections.length, config });
  }, [addSection, pageId, sections.length, tenantBranding]);

  const handleConfigChange = useCallback((sectionId: string, config: Record<string, any>) => {
    setPendingConfigs((prev) => ({ ...prev, [sectionId]: config }));
  }, []);

  const saveSection = useCallback((section: WebPageSection) => {
    const config = pendingConfigs[section.id];
    if (!config) return;
    updateSection.mutate({ id: section.id, page_id: pageId, config });
    setPendingConfigs((prev) => { const n = { ...prev }; delete n[section.id]; return n; });
    toast.success("Section saved");
  }, [pendingConfigs, updateSection, pageId]);

  const moveSection = useCallback((idx: number, dir: -1 | 1) => {
    const ids = sections.map((s) => s.id);
    const target = idx + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    reorderSections.mutate({ page_id: pageId, orderedIds: ids });
  }, [sections, reorderSections, pageId]);

  if (!page) return <div className="p-8 text-center text-muted-foreground">Page not found</div>;

  const sectionLabel = (type: string) => SECTION_TYPES.find((t) => t.value === type)?.label ?? type;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">{titleOverride ?? page.title}</h1>
          <p className="text-sm text-muted-foreground">/{page.slug}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportPageAsHtml(page.title, sections.map((s) => ({ ...s, config: pendingConfigs[s.id] || s.config })))}
            disabled={sections.length === 0}
          >
            <Download className="h-4 w-4 mr-1" /> Export HTML
          </Button>
          <Label className="text-sm font-heading">Published</Label>
          <Switch
            checked={page.is_published}
            onCheckedChange={(v) => updatePage.mutate({ id: page.id, is_published: v })}
          />
        </div>
      </div>

      {/* Scheduling window */}
      <Card>
        <CardHeader><CardTitle className="text-base font-heading">Publish schedule</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Go live at (optional)</Label>
            <Input
              type="datetime-local"
              defaultValue={page.publish_at ? new Date(page.publish_at).toISOString().slice(0, 16) : ""}
              onBlur={(e) => {
                const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                if (v !== (page.publish_at ?? null)) updatePage.mutate({ id: page.id, publish_at: v });
              }}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Hidden until this time even if Published is on.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-heading">Take down at (optional)</Label>
            <Input
              type="datetime-local"
              defaultValue={page.unpublish_at ? new Date(page.unpublish_at).toISOString().slice(0, 16) : ""}
              onBlur={(e) => {
                const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                if (v !== (page.unpublish_at ?? null)) updatePage.mutate({ id: page.id, unpublish_at: v });
              }}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Automatically hidden after this time.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor" className="gap-1.5"><Settings className="h-4 w-4" /> Editor</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-4 w-4" /> Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          {/* Page Settings */}
          <Card>
            <CardHeader><CardTitle className="text-base font-heading">{settingsLabel ?? "Page Settings"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-heading">Title</Label>
                  <Input
                    defaultValue={page.title}
                    onBlur={(e) => { if (e.target.value !== page.title) updatePage.mutate({ id: page.id, title: e.target.value }); }}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-heading">Slug</Label>
                  <Input
                    defaultValue={page.slug}
                    onBlur={(e) => { if (e.target.value !== page.slug) updatePage.mutate({ id: page.id, slug: e.target.value }); }}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-heading">Description</Label>
                <Input
                  defaultValue={page.description || ""}
                  onBlur={(e) => updatePage.mutate({ id: page.id, description: e.target.value || null })}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          {sectionsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {sections.map((section, idx) => (
                <Card key={section.id} className="border-border">
                  <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="font-heading text-sm font-medium flex-1">{sectionLabel(section.section_type)}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveSection(idx, -1); }} disabled={idx === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveSection(idx, 1); }} disabled={idx === sections.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteSection.mutate({ id: section.id, page_id: pageId }); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {activeSection === section.id && (
                    <CardContent className="pt-0 pb-4 px-4 border-t border-border space-y-3">
                      <SectionEditor
                        section={{ ...section, config: pendingConfigs[section.id] || section.config }}
                        onUpdate={(config) => handleConfigChange(section.id, config)}
                      />
                      {pendingConfigs[section.id] && (
                        <Button size="sm" onClick={() => saveSection(section)} disabled={updateSection.isPending}>
                          <Save className="h-4 w-4 mr-1" /> Save Section
                        </Button>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}

              <Button variant="outline" className="w-full border-dashed" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Section
              </Button>
            </div>
          )}

          <AddSectionDialog open={addOpen} onOpenChange={setAddOpen} onSelect={handleAddSection} />
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="p-0">
              {sections.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground font-heading">No sections yet — switch to Editor to add some.</div>
              ) : (
                <div className="divide-y divide-border">
                  {sections.map((s) => (
                    <SectionPreview key={s.id} section={{ ...s, config: pendingConfigs[s.id] || s.config }} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebPageEditor;
