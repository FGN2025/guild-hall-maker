import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCreateTopic } from "@/hooks/useCommunity";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const CreateTopicDialog = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Discussion");
  const createTopic = useCreateTopic();

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    createTopic.mutate(
      { title: title.trim(), body: body.trim(), category },
      {
        onSuccess: () => {
          toast.success("Topic created!");
          setTitle("");
          setBody("");
          setCategory("Discussion");
          setOpen(false);
        },
        onError: () => toast.error("Failed to create topic"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> New Topic
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Topic</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Topic title" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Discussion">Discussion</SelectItem>
                <SelectItem value="Team Recruitment">Team Recruitment</SelectItem>
                <SelectItem value="Announcement">Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What's on your mind?" rows={5} />
          </div>
          <Button onClick={handleSubmit} disabled={createTopic.isPending} className="w-full">
            {createTopic.isPending ? "Posting..." : "Post Topic"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
