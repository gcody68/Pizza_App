import { useRef, useState } from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, FlaskConical, Loader as Loader2, TriangleAlert, Download } from "lucide-react";
import { CATEGORIES, type MealPeriod } from "@/hooks/useMenuItems";
import {
  MOCK_MENU_ITEMS,
  MOCK_GALLERY_ITEMS,
  MOCK_RESTAURANT_INFO,
} from "@/lib/mockImportData";
import { resolveImageUrl } from "@/lib/utils";

type ParsedMenuItem = {
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  meal_period: MealPeriod;
};

type ParsedData = {
  menuItems: ParsedMenuItem[];
  galleryItems: { image_url: string; caption: string }[];
  restaurantInfo: {
    business_name?: string;
    business_address?: string;
    business_phone?: string;
    logo_url?: string;
    header_image_url?: string;
  } | null;
};

const PERIOD_CATEGORY_MAP: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

// Categories that are "generic" — when a Service Period column exists, the period wins
const GENERIC_CATEGORY_ALIASES = new Set(["mains", "main", "main course", "main courses", "entree", "entrees", "starter", "starters", "appetizer", "appetizers"]);

const CATEGORY_ALIASES: Record<string, string> = {
  mains: "Lunch",
  main: "Lunch",
  "main course": "Lunch",
  "main courses": "Lunch",
  entree: "Lunch",
  entrees: "Lunch",
  starter: "Breakfast",
  starters: "Breakfast",
  appetizer: "Breakfast",
  appetizers: "Breakfast",
  beverage: "Drinks",
  beverages: "Drinks",
  drink: "Drinks",
  side: "Sides",
  dessert: "Desserts",
  sweet: "Desserts",
  sweets: "Desserts",
  pizza: "Lunch",
  pasta: "Lunch",
  burger: "Lunch",
  burgers: "Lunch",
  sandwich: "Lunch",
  sandwiches: "Lunch",
  salad: "Lunch",
  salads: "Lunch",
  soup: "Lunch",
  soups: "Lunch",
};

function normalizeCategory(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim().toLowerCase();
  if (PERIOD_CATEGORY_MAP[trimmed]) return PERIOD_CATEGORY_MAP[trimmed];
  if (CATEGORY_ALIASES[trimmed]) return CATEGORY_ALIASES[trimmed];
  const exact = [...CATEGORIES].find((c) => c.toLowerCase() === trimmed);
  if (exact) return exact;
  for (const cat of CATEGORIES) {
    if (trimmed.includes(cat.toLowerCase())) return cat;
  }
  for (const [alias, mapped] of Object.entries(CATEGORY_ALIASES)) {
    if (trimmed.includes(alias)) return mapped;
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
    if (catLower === "all day" || catLower === "all-day") return "all-day";
  }
  return "all-day";
}

function derivePeriodFromCategory(category: string): MealPeriod {
  const lower = category.toLowerCase();
  if (lower === "breakfast") return "breakfast";
  if (lower === "lunch") return "lunch";
  if (lower === "dinner") return "dinner";
  if (lower === "all day" || lower === "all-day") return "all-day";
  return "all-day";
}

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

function isMenuSheet(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("menu") || lower.includes("item") || lower.includes("food");
}

function isGallerySheet(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("gallery") || lower.includes("photo") || lower.includes("image") || lower.includes("pic");
}

function isInfoSheet(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("info") || lower.includes("restaurant") || lower.includes("business") || lower.includes("about");
}

function parseMenuSheet(buffer: ArrayBuffer): ParsedData {
  const wb = XLSX.read(buffer, { type: "array" });

  const result: ParsedData = {
    menuItems: [],
    galleryItems: [],
    restaurantInfo: null,
  };

  const menuSheetName =
    wb.SheetNames.find(isMenuSheet) ??
    wb.SheetNames[0];

  const gallerySheetName =
    wb.SheetNames.find(isGallerySheet) ??
    wb.SheetNames.find((n) => n !== menuSheetName && !isInfoSheet(n));

  const infoSheetName =
    wb.SheetNames.find(isInfoSheet) ??
    wb.SheetNames.find((n) => n !== menuSheetName && n !== gallerySheetName);

  if (menuSheetName) {
    const ws = wb.Sheets[menuSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);

      const nameCol = findColumn(headers, ["name", "item name", "item", "dish name", "dish", "menu item", "product"]);
      const descCol = findColumn(headers, ["description", "desc", "details", "info", "about", "notes"]);
      const priceCol = findColumn(headers, ["price", "cost", "amount", "rate", "charge", "fee"]);
      const imageCol = findColumn(headers, ["image_url", "image url", "image", "url", "pic", "picture", "photo url", "photo_url", "photo", "img_url", "img", "link", "google drive", "drive link"]);
      const categoryCol = findColumn(headers, ["category", "cat", "section", "type", "group", "course", "genre"]);
      const periodCol = findColumn(headers, ["service period", "service_period", "period", "meal period", "meal_period", "meal", "availability", "when", "service", "time of day"]);

      const hasPeriodCol = !!periodCol;

      for (const row of rows) {
        const name = getVal(row, nameCol);
        if (!name) continue;
        const rawCat = getVal(row, categoryCol);
        const rawPeriod = getVal(row, periodCol);
        const rawCategory = normalizeCategory(rawCat);
        const meal_period = hasPeriodCol
          ? normalizePeriod(rawPeriod, rawCategory)
          : derivePeriodFromCategory(rawCategory);

        // When the Category column is a generic alias (e.g. "Mains") AND a Service Period
        // column exists, derive the display category from the period so that Breakfast
        // items are grouped under Breakfast, Dinner under Dinner, etc.
        const isGenericAlias = GENERIC_CATEGORY_ALIASES.has(rawCat.trim().toLowerCase());
        const categoryFromPeriod = meal_period === "breakfast" ? "Breakfast"
          : meal_period === "lunch" ? "Lunch"
          : meal_period === "dinner" ? "Dinner"
          : null;

        const category = (hasPeriodCol && isGenericAlias && categoryFromPeriod)
          ? categoryFromPeriod
          : rawCategory || categoryFromPeriod || "Sides";
        const rawPrice = getVal(row, priceCol).replace(/[^0-9.]/g, "");
        const rawImage = getVal(row, imageCol);
        const resolvedImage = resolveImageUrl(rawImage) || rawImage;

        result.menuItems.push({
          name,
          description: getVal(row, descCol),
          price: parseFloat(rawPrice) || 0,
          image_url: resolvedImage,
          category,
          meal_period,
        });
      }
    }
  }

  if (gallerySheetName && gallerySheetName !== menuSheetName) {
    const ws = wb.Sheets[gallerySheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      const urlCol = findColumn(headers, ["image_url", "image url", "url", "image", "photo url", "photo_url", "photo", "pic", "picture", "link", "drive", "src", "file", "filename"]);
      const captionCol = findColumn(headers, ["caption", "title", "label", "description", "desc", "name", "alt"]);

      for (const row of rows) {
        const rawUrl = getVal(row, urlCol);
        if (!rawUrl) continue;
        const resolvedUrl = resolveImageUrl(rawUrl) || rawUrl;
        result.galleryItems.push({
          image_url: resolvedUrl,
          caption: getVal(row, captionCol),
        });
      }
    }
  }

  if (infoSheetName && infoSheetName !== menuSheetName && infoSheetName !== gallerySheetName) {
    const ws = wb.Sheets[infoSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      const nameCol = findColumn(headers, ["name", "restaurant", "business name", "business_name", "restaurant name"]);
      const addrCol = findColumn(headers, ["address", "location", "business address", "business_address", "addr"]);
      const phoneCol = findColumn(headers, ["phone", "telephone", "tel", "contact", "business phone", "business_phone", "number"]);
      const logoCol = findColumn(headers, ["logo", "logo_url", "logo url", "logo image", "logo link", "business logo"]);
      const headerCol = findColumn(headers, ["hero_image_url", "hero_image_url", "hero_image", "heroimage", "hero image url", "hero image", "hero", "header_image_url", "header image url", "header_image", "header image", "header", "banner", "cover image", "cover", "background"]);

      const row = rows[0];
      const rawLogo = getVal(row, logoCol);
      const rawHeader = getVal(row, headerCol);
      result.restaurantInfo = {
        business_name: getVal(row, nameCol) || undefined,
        business_address: getVal(row, addrCol) || undefined,
        business_phone: getVal(row, phoneCol) || undefined,
        logo_url: rawLogo ? (resolveImageUrl(rawLogo) || rawLogo) : undefined,
        header_image_url: rawHeader ? (resolveImageUrl(rawHeader) || rawHeader) : undefined,
      };
    }
  }

  return result;
}

function generateTemplate(): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const menuRows = [
    ["Name", "Description", "Price", "Image_URL", "Category", "Service_Period"],
    ["Eggs Benedict", "Poached eggs on English muffin with hollandaise", "14.00", "https://drive.google.com/file/d/YOUR_FILE_ID/view", "Breakfast", "Breakfast"],
    ["Caesar Salad", "Romaine, parmesan, croutons, house Caesar dressing", "13.00", "https://drive.google.com/file/d/YOUR_FILE_ID/view", "Lunch", "Lunch"],
    ["Ribeye Steak", "12oz ribeye with truffle butter and garlic mash", "54.00", "https://drive.google.com/file/d/YOUR_FILE_ID/view", "Dinner", "Dinner"],
    ["Garlic Fries", "Crispy fries tossed in garlic and parsley", "8.00", "https://drive.google.com/file/d/YOUR_FILE_ID/view", "Sides", "All Day"],
    ["Lemonade", "Fresh-squeezed with a hint of mint", "5.00", "https://drive.google.com/file/d/YOUR_FILE_ID/view", "Drinks", "All Day"],
  ];
  const menuWs = XLSX.utils.aoa_to_sheet(menuRows);
  menuWs["!cols"] = [{ wch: 24 }, { wch: 48 }, { wch: 10 }, { wch: 60 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, menuWs, "Menu");

  const galleryRows = [
    ["Image_URL", "Caption"],
    ["https://drive.google.com/file/d/YOUR_FILE_ID/view", "Our stunning dining room"],
    ["https://drive.google.com/file/d/YOUR_FILE_ID/view", "A special evening"],
  ];
  const galleryWs = XLSX.utils.aoa_to_sheet(galleryRows);
  galleryWs["!cols"] = [{ wch: 60 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, galleryWs, "Gallery");

  const infoRows = [
    ["Name", "Address", "Phone", "Logo", "Header_Image"],
    ["Your Restaurant Name", "123 Main St, City, State 00000", "(555) 000-0000", "https://drive.google.com/file/d/YOUR_LOGO_ID/view", "https://drive.google.com/file/d/YOUR_HEADER_ID/view"],
  ];
  const infoWs = XLSX.utils.aoa_to_sheet(infoRows);
  infoWs["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 55 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, infoWs, "Restaurant_Info");

  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

async function importData(data: ParsedData, qc: ReturnType<typeof useQueryClient>, replace = false) {
  let totalImported = 0;

  // Always scope to the current user's own restaurant
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in to import data.");

  const isSuperAdmin = session.user.app_metadata?.super_admin === true;
  let settingsQuery = supabase.from("restaurant_settings").select("id, owner_id");
  if (!isSuperAdmin) settingsQuery = settingsQuery.eq("owner_id", session.user.id);
  const { data: ownSettings, error: settingsError } = await settingsQuery.limit(1).maybeSingle();
  if (settingsError) throw new Error(`Could not load restaurant settings: ${settingsError.message}`);
  if (!ownSettings) throw new Error("No restaurant found for your account. Please complete your profile setup first.");
  const restaurantId = ownSettings.id;

  if (replace) {
    const { error: delMenuErr } = await supabase.from("menu_items").delete().eq("restaurant_id", restaurantId);
    if (delMenuErr) throw new Error(`Failed to clear existing menu: ${delMenuErr.message}`);
    const { error: delGalleryErr } = await supabase.from("gallery_items").delete().eq("restaurant_id", restaurantId);
    if (delGalleryErr) throw new Error(`Failed to clear existing gallery: ${delGalleryErr.message}`);
  }

  if (data.menuItems.length > 0) {
    const items = data.menuItems.map((item, i) => ({
      ...item,
      restaurant_id: restaurantId,
      sort_order: 1000 + i,
      is_placeholder: false,
    }));
    const { error } = await supabase.from("menu_items").insert(items);
    if (error) throw new Error(`Menu import failed: ${error.message} (code: ${error.code})`);
    totalImported += items.length;
    await qc.invalidateQueries({ queryKey: ["menu-items"] });
    await qc.refetchQueries({ queryKey: ["menu-items"] });
  }

  if (data.galleryItems.length > 0) {
    const galleryRows = data.galleryItems.map((g, i) => ({ ...g, restaurant_id: restaurantId, sort_order: 1000 + i }));
    const { error } = await supabase.from("gallery_items").insert(galleryRows);
    if (error) throw new Error(`Gallery import failed: ${error.message} (code: ${error.code})`);
    totalImported += galleryRows.length;
    qc.invalidateQueries({ queryKey: ["gallery-items"] });
  }

  if (data.restaurantInfo) {
    const settings = ownSettings;
    if (settings) {
      const updates: Record<string, string> = {};
      if (data.restaurantInfo.business_name) updates.business_name = data.restaurantInfo.business_name;
      if (data.restaurantInfo.business_address) updates.business_address = data.restaurantInfo.business_address;
      if (data.restaurantInfo.business_phone) updates.business_phone = data.restaurantInfo.business_phone;
      if (data.restaurantInfo.logo_url) updates.logo_url = data.restaurantInfo.logo_url;
      if (data.restaurantInfo.header_image_url) updates.header_image_url = data.restaurantInfo.header_image_url;
      if (Object.keys(updates).length > 0) {
        const { data: updatedRows, error: updateError } = await supabase
          .from("restaurant_settings")
          .update(updates)
          .eq("id", settings.id)
          .select("id");
        if (updateError) throw new Error(`Restaurant info update failed: ${updateError.message} (code: ${updateError.code})`);
        if (!updatedRows || updatedRows.length === 0) throw new Error("Restaurant info update was blocked — please make sure you are logged in as the restaurant owner.");
        await qc.invalidateQueries({ queryKey: ["restaurant-settings"] });
        await qc.refetchQueries({ queryKey: ["restaurant-settings"] });
      }
    }
  }

  return totalImported;
}

async function runMockImport(qc: ReturnType<typeof useQueryClient>) {
  // Fetch demo items from the DB so all users always get the latest demo menu
  const { data: dbDemoItems, error: demoErr } = await supabase
    .from("demo_menu_items" as never)
    .select("name, description, price, category, meal_period, image_url, sort_order")
    .order("sort_order");

  const menuItems: ParsedMenuItem[] = dbDemoItems && !demoErr
    ? (dbDemoItems as Array<{ name: string; description: string; price: number; category: string; meal_period: string; image_url: string; sort_order: number }>).map((r) => ({
        name: r.name,
        description: r.description,
        price: r.price,
        category: r.category,
        meal_period: r.meal_period as MealPeriod,
        image_url: r.image_url,
      }))
    : MOCK_MENU_ITEMS;

  const mockData: ParsedData = {
    menuItems,
    galleryItems: MOCK_GALLERY_ITEMS,
    restaurantInfo: MOCK_RESTAURANT_INFO,
  };
  return importData(mockData, qc, true);
}

type Props = { open: boolean; onClose: () => void };

export default function ExcelImporter({ open, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showCaution, setShowCaution] = useState(false);
  const [cautionTarget, setCautionTarget] = useState<"file" | "mock" | null>(null);
  const [preview, setPreview] = useState<{ sheets: string[]; menuCount: number; galleryCount: number; hasInfo: boolean; hasLogo: boolean; hasHeader: boolean; categories: string[] } | null>(null);
  const qc = useQueryClient();
  const demo = useDemoMode();

  const triggerCaution = (target: "file" | "mock") => {
    setCautionTarget(target);
    setShowCaution(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    if (fileRef.current) fileRef.current.value = "";

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const data = parseMenuSheet(buffer);
      const uniqueCategories = [...new Set(data.menuItems.map((m) => m.category))];
      setPreview({
        sheets: wb.SheetNames,
        menuCount: data.menuItems.length,
        galleryCount: data.galleryItems.length,
        hasInfo: !!data.restaurantInfo?.business_name,
        hasLogo: !!data.restaurantInfo?.logo_url,
        hasHeader: !!data.restaurantInfo?.header_image_url,
        categories: uniqueCategories,
      });
    } catch {
      setPreview(null);
    }

    triggerCaution("file");
  };

  const handleCautionConfirm = async () => {
    setShowCaution(false);
    if (cautionTarget === "file" && pendingFile) {
      await executeFileImport(pendingFile);
      setPendingFile(null);
      setPreview(null);
    } else if (cautionTarget === "mock") {
      await executeMockImport();
    }
    setCautionTarget(null);
  };

  const handleCautionCancel = () => {
    setShowCaution(false);
    setPendingFile(null);
    setPreview(null);
    setCautionTarget(null);
  };

  const executeFileImport = async (file: File) => {
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const data = parseMenuSheet(buffer);

      if (data.menuItems.length === 0 && data.galleryItems.length === 0 && !data.restaurantInfo) {
        toast.error("No data found. Check that your file has the right columns — see the template for reference.");
        return;
      }

      if (demo) {
        data.menuItems.forEach((item) => demo.createMenuItem({ ...item, is_available: true, daily_stock: null, restaurant_id: null }));
        data.galleryItems.forEach((item) => demo.addGalleryItem(item));
        if (data.restaurantInfo) demo.updateSettings(data.restaurantInfo);
        const count = data.menuItems.length + data.galleryItems.length;
        toast.success(`Success! ${count} ${count === 1 ? "record" : "records"} imported.`);
        onClose();
        return;
      }

      const count = await importData(data, qc);
      const parts: string[] = [];
      if (data.menuItems.length) parts.push(`${data.menuItems.length} menu items`);
      if (data.galleryItems.length) parts.push(`${data.galleryItems.length} gallery photos`);
      if (data.restaurantInfo?.business_name) parts.push("restaurant info");

      toast.success(`Success! ${count} ${count === 1 ? "record" : "records"} imported — ${parts.join(", ")}.`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const executeMockImport = async () => {
    setLoading(true);
    try {
      if (demo) {
        const mockData = { menuItems: MOCK_MENU_ITEMS, galleryItems: MOCK_GALLERY_ITEMS, restaurantInfo: MOCK_RESTAURANT_INFO };
        mockData.menuItems.forEach((item) => demo.createMenuItem({ ...item, is_available: true, daily_stock: null, restaurant_id: null }));
        mockData.galleryItems.forEach((item) => demo.addGalleryItem(item));
        if (mockData.restaurantInfo) demo.updateSettings(mockData.restaurantInfo);
        toast.success(`Mock data loaded`);
        onClose();
        return;
      }
      const count = await runMockImport(qc);
      toast.success(`Mock data loaded — ${count} records imported`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mock import failed");
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
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Menu from Excel
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Upload your .xlsx file. Column names are detected automatically — Google Drive image links are supported.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div
              onClick={() => !loading && fileRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/40 rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
            >
              {loading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Click to upload .xlsx file</p>
                    <p className="text-xs text-muted-foreground mt-1">Column names detected automatically</p>
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />

            <Button
              variant="outline"
              className="w-full gap-2 border-border hover:border-gold/40 hover:text-gold"
              onClick={handleDownloadTemplate}
              disabled={loading}
            >
              <Download className="w-4 h-4" />
              Download Template (.xlsx)
            </Button>

            <div className="relative flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <Button
              variant="outline"
              className="w-full gap-2 border-border hover:border-primary/40"
              onClick={() => triggerCaution("mock")}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              Load Sample Data (Mock menu + Gallery)
            </Button>

            <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground text-xs">Sheet detection (any of these names work):</p>
              <p><strong className="text-foreground">Menu sheet:</strong> "Menu", "Items", "Food"</p>
              <p><strong className="text-foreground">Gallery sheet:</strong> "Gallery", "Photos", "Images"</p>
              <p><strong className="text-foreground">Info sheet:</strong> "Restaurant_Info", "Info", "About" — supports Name, Address, Phone, Logo, Hero_Image_Url (or Header_Image) columns</p>
              <p><strong className="text-foreground">Categories:</strong> Breakfast, Lunch, Dinner, Mains, Sides, Drinks, Desserts (and common aliases)</p>
              <p className="pt-1 border-t border-border"><strong className="text-foreground">Image URLs:</strong> Google Drive links auto-converted. Make sure files are shared as "Anyone with the link — Viewer".</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCaution} onOpenChange={setShowCaution}>
        <AlertDialogContent className="bg-card border-border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <TriangleAlert className="w-5 h-5 text-amber-500" />
              Confirm Import
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {preview && (
                  <div className="bg-secondary/60 rounded-lg p-3 space-y-1 text-xs">
                    <p className="font-semibold text-foreground">Detected in your file:</p>
                    <p>Sheets: <span className="text-foreground">{preview.sheets.join(", ")}</span></p>
                    {preview.menuCount > 0 && (
                      <>
                        <p className="text-green-400">{preview.menuCount} menu items ready to import</p>
                        {preview.categories.length > 0 && (
                          <p className="text-green-400/80">Categories: {preview.categories.join(", ")}</p>
                        )}
                      </>
                    )}
                    {preview.galleryCount > 0 && <p className="text-green-400">{preview.galleryCount} gallery photos ready to import</p>}
                    {preview.hasInfo && <p className="text-green-400">Restaurant name / address / phone detected</p>}
                    {preview.hasLogo && <p className="text-green-400">Logo image detected</p>}
                    {preview.hasHeader && <p className="text-green-400">Header/hero image detected</p>}
                    {preview.menuCount === 0 && preview.galleryCount === 0 && (
                      <p className="text-amber-400">No menu items detected — check that your Category column uses values like Breakfast, Lunch, Dinner, Mains, Sides, Drinks, or Desserts.</p>
                    )}
                  </div>
                )}
                <p>
                  This will <strong className="text-foreground">add</strong> items to your existing menu. Items already on the menu will not be replaced.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCautionCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCautionConfirm}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Import Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
