import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES, MEAL_PERIODS, type MenuItem, type MealPeriod } from "@/hooks/useMenuItems";
import { useDemo } from "@/contexts/DemoContext";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import DemoImagePicker from "./DemoImagePicker";

type Props =
  | { item: MenuItem; category?: never; onClose: () => void }
  | { item?: never; category: string; onClose: () => void };

export default function DemoMenuItemModal(props: Props) {
  const { onClose } = props;
  const isNew = !props.item;
  const item = props.item;

  const { createMenuItem, updateMenuItem, deleteMenuItem } = useDemo();

  const [name, setName] = useState(item ? item.name : "");
  const [description, setDescription] = useState(item?.description || "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [imageUrl, setImageUrl] = useState(item?.image_url || "");
  const [category, setCategory] = useState(item?.category || props.category || "Breakfast");
  const [mealPeriod, setMealPeriod] = useState<MealPeriod>(item?.meal_period ?? "all-day");
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [dailyStock, setDailyStock] = useState(item?.daily_stock != null ? String(item.daily_stock) : "");

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const parsedStock = dailyStock.trim() !== "" ? parseInt(dailyStock, 10) : null;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      image_url: imageUrl || null,
      category,
      meal_period: mealPeriod,
      is_available: isAvailable,
      daily_stock: parsedStock,
      restaurant_id: null as string | null,
    };

    if (isNew) {
      createMenuItem(payload);
    } else {
      updateMenuItem(item.id, payload);
    }
    toast.success("Menu item saved!");
    onClose();
  };

  const handleDelete = () => {
    if (!item) return;
    deleteMenuItem(item.id);
    toast.success("Item deleted");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold">
            {isNew ? "Add Menu Item" : "Edit Menu Item"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <DemoImagePicker
            value={imageUrl}
            onChange={setImageUrl}
            aspectClass="aspect-[4/3]"
            objectFit="cover"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Meal Period</Label>
              <Select value={mealPeriod} onValueChange={(v) => setMealPeriod(v as MealPeriod)}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label} · {p.hours}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dish name" className="bg-secondary border-border" />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short description..." className="bg-secondary border-border resize-none" rows={3} />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Price ($)</Label>
            <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="bg-secondary border-border" />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Daily Stock (leave blank for unlimited)</Label>
            <Input type="number" min="0" value={dailyStock} onChange={(e) => setDailyStock(e.target.value)} placeholder="Unlimited" className="bg-secondary border-border" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Available</p>
              <p className="text-xs text-muted-foreground">Quickly disable without deleting</p>
            </div>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} className="flex-1 gradient-gold text-primary-foreground font-semibold">
              Save
            </Button>
            {!isNew && (
              <Button variant="destructive" size="icon" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
