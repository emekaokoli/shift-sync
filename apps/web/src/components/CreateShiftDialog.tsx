import { useState, type FormEvent } from "react";
import type { Skill } from "@shift-sync/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocations } from "@/hooks/locations";
import { useSkills } from "@/hooks/skills";
import { useCreateShift } from "@/hooks/shifts";
import { useAuthStore } from "@/lib/stores";
import { showError, showSuccess } from "@/lib/toast";
import dayjs from "dayjs";

interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLocationId?: string;
}

export function CreateShiftDialog({ open, onOpenChange, defaultLocationId }: CreateShiftDialogProps) {
  const { user } = useAuthStore();
  const isManager = user?.role === "MANAGER" || user?.role === "ADMIN";
  
  const { data: locations } = useLocations();
  const { data: skills } = useSkills() as { data?: Skill[] };
  const createShift = useCreateShift();

  const [formData, setFormData] = useState({
    locationId: defaultLocationId || "",
    startDate: dayjs().format("YYYY-MM-DD"),
    startTime: "09:00",
    endDate: dayjs().format("YYYY-MM-DD"),
    endTime: "17:00",
    requiredSkillId: "",
    headcount: 1,
    status: "DRAFT",
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.locationId || !formData.requiredSkillId) {
      showError("Missing required fields", "Please select location and skill");
      return;
    }

    const startDateTime = `${formData.startDate}T${formData.startTime}:00.000Z`;
    const endDateTime = `${formData.endDate}T${formData.endTime}:00.000Z`;

    try {
      await createShift.mutateAsync({
        locationId: formData.locationId,
        startTime: startDateTime,
        endTime: endDateTime,
        requiredSkillId: formData.requiredSkillId,
        headcount: formData.headcount,
        status: formData.status,
      });
      
      showSuccess("Shift created", "New shift has been added");
      onOpenChange(false);
      
      // Reset form
      setFormData({
        locationId: defaultLocationId || "",
        startDate: dayjs().format("YYYY-MM-DD"),
        startTime: "09:00",
        endDate: dayjs().format("YYYY-MM-DD"),
        endTime: "17:00",
        requiredSkillId: "",
        headcount: 1,
        status: "DRAFT",
      });
    } catch (error: unknown) {
      showError(
        "Failed to create shift",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  if (!isManager) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <select
              id="location"
              className="w-full border rounded px-3 py-2"
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              required
            >
              <option value="">Select location</option>
              {locations?.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill">Required Skill</Label>
            <select
              id="skill"
              className="w-full border rounded px-3 py-2"
              value={formData.requiredSkillId}
              onChange={(e) => setFormData({ ...formData, requiredSkillId: e.target.value })}
              required
            >
              <option value="">Select skill</option>
              {skills?.map((skill) => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="headcount">Headcount</Label>
              <Input
                id="headcount"
                type="number"
                min={1}
                value={formData.headcount}
                onChange={(e) => setFormData({ ...formData, headcount: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full border rounded px-3 py-2"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createShift.isPending}>
              {createShift.isPending ? "Creating..." : "Create Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}