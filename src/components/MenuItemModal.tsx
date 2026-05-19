import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useUpsertMenuItem,
  useDeleteMenuItem,
  useCreateMenuItem,
  useMenuItems,
  CATEGORIES,
  MEAL_PERIODS,
  type MenuItem,
  type MealPeriod,
  type ItemVariant,
  type ItemOptionGroup,
} from "@/hooks/useMenuItems";
import { useRestaurantSettings, isSalonBusiness } from "@/hooks/useRestaurantSettings";
import { uploadImage } from "@/hooks/useImageUpload";
import { ImagePlus, Trash2, Loader as Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

type Props =
  | { item: MenuItem; category?: never; onClose: () => void; restaurantId?: string | null }
  | { item?: never; category: string; onClose: () => void; restaurantId?: string | null };

function VariantRow({
  variant,
  isDefault,
  onChange,
  onDelete,
  onSetDefault,
}: {
  variant: ItemVariant;
  isDefault: boolean;
  onChange: (v: ItemVariant) => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${isDefault ? "border-gold/50 bg-gold/5" : "border-border bg-secondary/30"}`}>
      <button
        type="button"
        onClick={onSetDefault}
        title="Set as default"
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDefault ? "border-gold bg-gold" : "border-muted-foreground/40 hover:border-gold/60"}`}
      >
        {isDefault && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
      </button>
      <Input
        value={variant.label}
        onChange={(e) => onChange({ ...variant, label: e.target.value })}
        placeholder="e.g. Large"
        className="bg-secondary border-border h-8 text-sm flex-1 min-w-0"
      />
      <div className="relative flex-shrink-0 w-24">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none pointer-events-none">$</span>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={variant.price || ""}
          onChange={(e) => onChange({ ...variant, price: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
          className="bg-secondary border-border h-8 text-sm pl-6"
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function OptionGroupRow({
  group,
  onChange,
  onDelete,
}: {
  group: ItemOptionGroup;
  onChange: (g: ItemOptionGroup) => void;
  onDelete: () => void;
}) {
  const [newChoice, setNewChoice] = useState("");

  const addChoice = () => {
    const trimmed = newChoice.trim();
    if (!trimmed) return;
    onChange({ ...group, choices: [...group.choices, trimmed] });
    setNewChoice("");
  };

  const removeChoice = (idx: number) => {
    onChange({ ...group, choices: group.choices.filter((_, i) => i !== idx) });
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Input
          value={group.label}
          onChange={(e) => onChange({ ...group, label: e.target.value })}
          placeholder="Option group label, e.g. Choose a Side"
          className="bg-secondary border-border h-8 text-sm flex-1"
        />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-muted-foreground">Required</span>
          <Switch
            checked={group.required}
            onCheckedChange={(v) => onChange({ ...group, required: v })}
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {group.choices.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {group.choices.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-secondary border border-border text-xs text-foreground rounded-full px-2.5 py-1">
              {c}
              <button type="button" onClick={() => removeChoice(i)} className="text-muted-foreground hover:text-destructive transition-colors ml-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newChoice}
          onChange={(e) => setNewChoice(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChoice(); } }}
          placeholder="Add a choice, then press Enter"
          className="bg-secondary border-border h-8 text-sm flex-1"
        />
        <button
          type="button"
          onClick={addChoice}
          className="flex-shrink-0 h-8 px-3 rounded-md border border-gold/40 text-gold hover:bg-gold/5 text-xs font-medium transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function MenuItemModal(props: Props) {
  const { onClose } = props;
  const isNew = !props.item;
  const item = props.item;
  const { data: settings } = useRestaurantSettings(props.restaurantId);
  const isSalon = isSalonBusiness(settings);
  const { data: existingItems } = useMenuItems(props.restaurantId);
  const salonCategories = isSalon
    ? Array.from(new Set((existingItems || []).map((i) => i.category)))
    : [];

  const [name, setName] = useState(item ? item.name : "");
  const [description, setDescription] = useState(item?.description || "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [imageUrl, setImageUrl] = useState(item?.image_url || "");
  const [category, setCategory] = useState(item?.category || props.category || "Breakfast");
  const [mealPeriod, setMealPeriod] = useState<MealPeriod>(item?.meal_period ?? "all-day");
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [isSpecial, setIsSpecial] = useState(item?.is_special ?? false);
  const [dailyStock, setDailyStock] = useState(item?.daily_stock != null ? String(item.daily_stock) : "");
  const [uploading, setUploading] = useState(false);

  const initialVariants: ItemVariant[] = item?.variants?.length ? item.variants : [];
  const [hasVariants, setHasVariants] = useState(initialVariants.length > 0);
  const [variants, setVariants] = useState<ItemVariant[]>(initialVariants);

  const initialOptions: ItemOptionGroup[] = item?.options?.length ? item.options : [];
  const [hasOptions, setHasOptions] = useState(initialOptions.length > 0);
  const [optionGroups, setOptionGroups] = useState<ItemOptionGroup[]>(initialOptions);

  const fileRef = useRef<HTMLInputElement>(null);

  const upsert = useUpsertMenuItem();
  const create = useCreateMenuItem();
  const del = useDeleteMenuItem();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "menu");
      setImageUrl(url);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const addVariantRow = () => {
    setVariants((prev) => [
      ...prev,
      { label: "", price: 0, isDefault: prev.length === 0 },
    ]);
  };

  const updateVariant = (index: number, v: ItemVariant) => {
    setVariants((prev) => prev.map((row, i) => (i === index ? v : row)));
  };

  const deleteVariant = (index: number) => {
    setVariants((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((v) => v.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const setDefault = (index: number) => {
    setVariants((prev) => prev.map((v, i) => ({ ...v, isDefault: i === index })));
  };

  const handleToggleVariants = (on: boolean) => {
    setHasVariants(on);
    if (on && variants.length === 0) {
      setVariants([{ label: "", price: parseFloat(price) || 0, isDefault: true }]);
    }
  };

  const handleToggleOptions = (on: boolean) => {
    setHasOptions(on);
    if (on && optionGroups.length === 0) {
      setOptionGroups([{ label: "", required: false, choices: [] }]);
    }
  };

  const addOptionGroup = () => {
    setOptionGroups((prev) => [...prev, { label: "", required: false, choices: [] }]);
  };

  const updateOptionGroup = (index: number, g: ItemOptionGroup) => {
    setOptionGroups((prev) => prev.map((row, i) => (i === index ? g : row)));
  };

  const deleteOptionGroup = (index: number) => {
    setOptionGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }

    if (hasVariants) {
      if (variants.length === 0) { toast.error("Add at least one size/option"); return; }
      for (const v of variants) {
        if (!v.label.trim()) { toast.error("Each variant needs a label"); return; }
        if (isNaN(v.price) || v.price < 0) { toast.error("Each variant needs a valid price"); return; }
      }
      if (!variants.some((v) => v.isDefault)) { toast.error("Mark one variant as the default"); return; }
    }

    const parsedStock = dailyStock.trim() !== "" ? parseInt(dailyStock, 10) : null;
    const finalVariants = hasVariants ? variants : null;
    const finalOptions = hasOptions && optionGroups.length > 0
      ? optionGroups.filter((g) => g.label.trim())
      : null;
    const basePrice = hasVariants
      ? (variants.find((v) => v.isDefault)?.price ?? 0)
      : (parseFloat(price) || 0);

    try {
      if (isNew) {
        await create.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          price: basePrice,
          image_url: imageUrl || null,
          category,
          meal_period: mealPeriod,
          is_available: isAvailable,
          is_special: isSpecial,
          daily_stock: parsedStock,
          variants: finalVariants,
          options: finalOptions,
        });
      } else {
        await upsert.mutateAsync({
          id: item.id,
          name: name.trim(),
          description: description.trim(),
          price: basePrice,
          image_url: imageUrl || null,
          category,
          meal_period: mealPeriod,
          is_available: isAvailable,
          is_special: isSpecial,
          daily_stock: parsedStock,
          variants: finalVariants,
          options: finalOptions,
        });
      }
      toast.success("Menu item saved!");
      onClose();
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      await del.mutateAsync(item.id);
      toast.success("Item deleted");
      onClose();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const isPending = upsert.isPending || create.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold">
            {isNew ? (isSalon ? "Add Service" : "Add Menu Item") : (isSalon ? "Edit Service" : "Edit Menu Item")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-[4/3] rounded-lg bg-secondary border-2 border-dashed border-border hover:border-gold/40 cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
            ) : imageUrl ? (
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImagePlus className="w-8 h-8" />
                <span className="text-xs">Upload Photo</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          <div className={`grid gap-3 ${isSalon ? "grid-cols-1" : "grid-cols-2"}`}>
            <div>
              <Label className="text-muted-foreground text-xs">Category</Label>
              {isSalon ? (
                <div className="space-y-1.5">
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Cuts, Color, Treatments"
                    className="bg-secondary border-border"
                  />
                  {salonCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {salonCategories.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCategory(c)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${category === c ? "border-gold/60 bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-gold/30"}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            {!isSalon && (
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
            )}
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dish name" className="bg-secondary border-border" />
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short description..." className="bg-secondary border-border resize-none" rows={3} />
          </div>

          {/* Variants toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Has Multiple Sizes / Options</p>
              <p className="text-xs text-muted-foreground">e.g. Small / Medium / Large, 10" / 14" / 16"</p>
            </div>
            <Switch checked={hasVariants} onCheckedChange={handleToggleVariants} />
          </div>

          {!hasVariants ? (
            <div>
              <Label className="text-muted-foreground text-xs">Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="bg-secondary border-border"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs">Sizes / Options</Label>
                <span className="text-[10px] text-muted-foreground italic">Filled circle = default</span>
              </div>
              <div className="space-y-1.5">
                {variants.map((v, i) => (
                  <VariantRow
                    key={i}
                    variant={v}
                    isDefault={v.isDefault}
                    onChange={(updated) => updateVariant(i, updated)}
                    onDelete={() => deleteVariant(i)}
                    onSetDefault={() => setDefault(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addVariantRow}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-gold/40 text-gold hover:bg-gold/5 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Size / Option
              </button>
            </div>
          )}

          {/* Options toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Has Add-on Options</p>
              <p className="text-xs text-muted-foreground">e.g. Crust type, choice of side, sauce, add-ons</p>
            </div>
            <Switch checked={hasOptions} onCheckedChange={handleToggleOptions} />
          </div>

          {hasOptions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs">Option Groups</Label>
              </div>
              <div className="space-y-2">
                {optionGroups.map((g, i) => (
                  <OptionGroupRow
                    key={i}
                    group={g}
                    onChange={(updated) => updateOptionGroup(i, updated)}
                    onDelete={() => deleteOptionGroup(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addOptionGroup}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-gold/40 text-gold hover:bg-gold/5 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Option Group
              </button>
            </div>
          )}

          <div>
            <Label className="text-muted-foreground text-xs">Daily Stock (leave blank for unlimited)</Label>
            <Input type="number" min="0" value={dailyStock} onChange={(e) => setDailyStock(e.target.value)} placeholder="Unlimited" className="bg-secondary border-border" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                Mark as Special
                <span className="text-[10px] font-bold bg-gold text-primary-foreground px-1.5 py-0.5 rounded-full">FEATURED</span>
              </p>
              <p className="text-xs text-muted-foreground">Appears at the top of the menu with a gold badge</p>
            </div>
            <Switch checked={isSpecial} onCheckedChange={setIsSpecial} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Available</p>
              <p className="text-xs text-muted-foreground">Quickly disable this item without deleting it</p>
            </div>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={isPending} className="flex-1 gradient-gold text-primary-foreground font-semibold">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
            {!isNew && (
              <Button variant="destructive" size="icon" onClick={handleDelete} disabled={del.isPending}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
