import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, Download, Loader as Loader2 } from "lucide-react";
import { CATEGORIES, type MealPeriod } from "@/hooks/useMenuItems";
import { useDemo } from "@/contexts/DemoContext";

function findColumn(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map((h) => (h || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const candidate of candidates) {
    const needle = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
    const idx = normalized.findIndex((h) => h === needle);
    if (idx !== -1) return headers[idx];
  }
  for (const candidate of candidates) {
    const needle = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
    const idx = normalized.findIndex((h) => h.includes(needle) || needle.includes(h));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function getVal(row: Record<string, unknown>, col: string | null): string {
  if (!col) return "";
  const val = row[col];
  if (val == null) return "";
  return String(val).trim();
}

function normalizeCategory(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim().toLowerCase();
  const exact = [...CATEGORIES].find((c) => c.toLowerCase() === trimmed);
  if (exact) return exact;
  for (const cat of CATEGORIES) {
    if (trimmed.includes(cat.toLowerCase())) return cat;
  }
  return "";
}

function normalizePeriod(raw: string, category?: string): MealPeriod {
  const lower = (raw || "").trim().toLowerCase();
  if (lower.includes("breakfast") || lower === "am") return "breakfast";
  if (lower.includes("lunch") || lower === "midday") return "lunch";
  if (lower.includes("dinner") || lower === "pm" || lower === "evening") return "dinner";
  if (lower.includes("all") || lower === "always" || lower === "anytime") return "all-day";
  if (category) {
    const catLower = category.toLowerCase();
    if (catLower === "breakfast") return "breakfast";
    if (catLower === "lunch") return "lunch";
    if (catLower === "dinner") return "dinner";
  }
  return "all-day";
}

function generateTemplate(): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["Name", "Description", "Price", "Image_URL", "Category", "Service_Period"],
    ["Eggs Benedict", "Poached eggs on English muffin with hollandaise", "14.00", "", "Breakfast", "Breakfast"],
    ["Club Sandwich", "Triple-decker with turkey, bacon, lettuce, tomato", "15.00", "", "Lunch", "Lunch"],
    ["Ribeye Steak", "12oz ribeye with truffle butter and garlic mash", "54.00", "", "Dinner", "Dinner"],
    ["Garlic Fries", "Crispy golden fries tossed in garlic butter", "8.00", "", "Sides", "All Day"],
    ["Lemonade", "Fresh-squeezed with cane sugar and mint", "5.00", "", "Drinks", "All Day"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 24 }, { wch: 48 }, { wch: 10 }, { wch: 40 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Menu");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

type Props = { open: boolean; onClose: () => void };

export default function DemoExcelImporter({ open, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const { createMenuItem } = useDemo();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "menu") ?? wb.SheetNames[0];
      if (!sheetName) throw new Error("No sheets found in file");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });
      let count = 0;
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        const nameCol = findColumn(headers, ["name", "item name", "item", "dish name", "dish", "menu item", "product"]);
        const descCol = findColumn(headers, ["description", "desc", "details", "info", "about", "notes"]);
        const priceCol = findColumn(headers, ["price", "cost", "amount", "rate", "charge", "fee"]);
        const imageCol = findColumn(headers, ["image_url", "image url", "image", "url", "pic", "picture", "photo url", "photo_url", "photo", "img_url", "img", "link"]);
        const categoryCol = findColumn(headers, ["category", "cat", "section", "type", "group", "course"]);
        const periodCol = findColumn(headers, ["service period", "service_period", "period", "meal period", "meal_period", "meal", "availability", "when", "service"]);

        for (const row of rows) {
          const name = getVal(row, nameCol);
          if (!name) continue;
          const rawCat = getVal(row, categoryCol);
          const rawCategory = normalizeCategory(rawCat);
          const meal_period = normalizePeriod(getVal(row, periodCol), rawCategory);
          const category = rawCategory || (
            meal_period === "breakfast" ? "Breakfast"
            : meal_period === "lunch" ? "Lunch"
            : meal_period === "dinner" ? "Dinner"
            : "Specials"
          );
          createMenuItem({
            name,
            description: getVal(row, descCol),
            price: parseFloat(getVal(row, priceCol).replace(/[^0-9.]/g, "")) || 0,
            image_url: getVal(row, imageCol) || null,
            category,
            meal_period,
            is_available: true,
            daily_stock: null,
          });
          count++;
        }
      }
      toast.success(`Success! ${count} menu ${count === 1 ? "item" : "items"} imported.`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const a = document.createElement("a");
    a.href = "/menu-template.xlsx";
    a.download = "menu-import-template.xlsx";
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Menu (Demo)
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Items will be added to your demo session only. No database is touched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div
            onClick={() => !loading && fileRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/40 rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
          >
            {loading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium text-foreground">Click to upload .xlsx file</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />

          <Button variant="outline" className="w-full gap-2" onClick={handleDownloadTemplate} disabled={loading}>
            <Download className="w-4 h-4" />
            Download Template (.xlsx)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
