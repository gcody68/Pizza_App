import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scissors, ChevronRight, Clock, Star, MapPin, Phone, Search } from "lucide-react";

interface Service {
  id: string;
  name: string;
  category: "cuts" | "color" | "styling" | "treatments";
  price: number;
  duration: number;
  description: string;
  image: string;
  popular?: boolean;
}

const SERVICES: Service[] = [
  {
    id: "s1", name: "Signature Cut & Style", category: "cuts", price: 75, duration: 60,
    description: "Precision cut tailored to your face shape, finished with a blowout and style.",
    image: "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=400",
    popular: true,
  },
  {
    id: "s2", name: "Balayage & Gloss", category: "color", price: 195, duration: 150,
    description: "Hand-painted highlights with a custom gloss treatment for natural, sun-kissed results.",
    image: "https://images.pexels.com/photos/7755250/pexels-photo-7755250.jpeg?auto=compress&cs=tinysrgb&w=400",
    popular: true,
  },
  {
    id: "s3", name: "Root Touch-Up", category: "color", price: 75, duration: 60,
    description: "Single-process color applied to new growth for seamless coverage.",
    image: "https://images.pexels.com/photos/3993435/pexels-photo-3993435.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: "s4", name: "Blowout", category: "styling", price: 55, duration: 45,
    description: "Professional shampoo, blow-dry, and style using premium products.",
    image: "https://images.pexels.com/photos/3738340/pexels-photo-3738340.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: "s5", name: "Keratin Smoothing", category: "treatments", price: 220, duration: 150,
    description: "Eliminates frizz and tames texture for up to 4 months of smooth, shiny hair.",
    image: "https://images.pexels.com/photos/4612274/pexels-photo-4612274.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: "s6", name: "Highlights", category: "color", price: 145, duration: 120,
    description: "Foil highlights placed to brighten and add dimension throughout.",
    image: "https://images.pexels.com/photos/3807570/pexels-photo-3807570.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: "s7", name: "Bang Trim", category: "cuts", price: 20, duration: 15,
    description: "Quick trim to maintain shape and length between full appointments.",
    image: "https://images.pexels.com/photos/3992876/pexels-photo-3992876.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: "s8", name: "Deep Conditioning", category: "treatments", price: 45, duration: 30,
    description: "Intensive moisture treatment that restores softness and shine to damaged hair.",
    image: "https://images.pexels.com/photos/3993318/pexels-photo-3993318.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
];

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "cuts", label: "Cuts" },
  { id: "color", label: "Color" },
  { id: "styling", label: "Styling" },
  { id: "treatments", label: "Treatments" },
] as const;
type CategoryId = typeof CATEGORIES[number]["id"];

const STYLISTS = [
  { id: "kelly", name: "Kelly Stanton", title: "Master Colorist", rating: 4.9, reviews: 142, color: "#C9A84C", image: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { id: "abbey", name: "Abbey Krutzer", title: "Cutting Specialist", rating: 4.8, reviews: 98, color: "#7EB8B0", image: "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { id: "nina", name: "Nina Torres", title: "Balayage Artist", rating: 5.0, reviews: 76, color: "#E07B7B", image: "https://images.pexels.com/photos/3738340/pexels-photo-3738340.jpeg?auto=compress&cs=tinysrgb&w=200" },
];

function ServiceCard({ service, onSelect }: { service: Service; onSelect: () => void }) {
  const [imgError, setImgError] = useState(false);
  return (
    <button
      onClick={onSelect}
      className="group w-full text-left bg-white rounded-2xl border border-stone-100 overflow-hidden hover:shadow-md hover:border-stone-200 transition-all"
    >
      {/* Image with robust fallback */}
      <div className="relative w-full aspect-[4/3] bg-stone-100 overflow-hidden">
        {!imgError ? (
          <img
            src={service.image}
            alt={service.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-100">
            <Scissors className="w-8 h-8 text-stone-300" />
          </div>
        )}
        {service.popular && (
          <span className="absolute top-2 left-2 bg-[hsl(38,65%,55%)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Popular</span>
        )}
      </div>
      <div className="p-3.5">
        <p className="text-sm font-semibold text-stone-800 leading-tight">{service.name}</p>
        <p className="text-[11px] text-stone-400 mt-1 leading-relaxed line-clamp-2">{service.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-bold text-stone-800">${service.price}</span>
          <div className="flex items-center gap-1 text-stone-400">
            <Clock className="w-3 h-3" />
            <span className="text-[11px]">{service.duration} min</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function PublicBooking() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryId>("all");
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<"services" | "stylist" | "confirm">("services");

  const filtered = SERVICES.filter((s) => {
    const matchCat = category === "all" || s.category === category;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleSelectService = (s: Service) => {
    setSelectedService(s);
    setBookingStep("stylist");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (bookingStep === "stylist") { setBookingStep("services"); setSelectedService(null); }
    else if (bookingStep === "confirm") setBookingStep("stylist");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#faf9f7", fontFamily: "'Inter', sans-serif" }}>

      {/* Hero header */}
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-stone-800">Loomis Salon</h1>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <MapPin className="w-3 h-3" />
                  <span>Lincoln Park, Chicago</span>
                  <span>·</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>4.9 (316 reviews)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-stone-100"
            >
              Owner Login
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">

        {/* ── Services view ── */}
        {bookingStep === "services" && (
          <div className="space-y-5 pt-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 focus:outline-none focus:border-[hsl(38,65%,55%)]/60 transition-colors"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    category === cat.id
                      ? "gradient-gold text-white shadow-sm"
                      : "bg-white border border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Services grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-stone-300">
                <Scissors className="w-10 h-10 mx-auto mb-3" />
                <p className="text-sm">No services match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                {filtered.map((s) => (
                  <ServiceCard key={s.id} service={s} onSelect={() => handleSelectService(s)} />
                ))}
              </div>
            )}

            {/* Salon info footer */}
            <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-3 mt-6">
              <p className="text-sm font-bold text-stone-800">Visit Us</p>
              <div className="space-y-2 text-xs text-stone-500">
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> 2450 N Lincoln Ave, Chicago, IL 60614</div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> Mon–Sat 9AM–7PM · Sun Closed</div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 flex-shrink-0" /> (312) 555-0100</div>
                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 flex-shrink-0 text-center text-stone-400 text-[10px] font-bold leading-none">IG</span> @loomissalon</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stylist selection ── */}
        {bookingStep === "stylist" && selectedService && (
          <div className="space-y-5 pt-6">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back to services
            </button>

            <div className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                <img src={selectedService.image} alt={selectedService.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-800">{selectedService.name}</p>
                <p className="text-xs text-stone-400 mt-0.5">{selectedService.duration} min · ${selectedService.price}</p>
              </div>
            </div>

            <p className="text-sm font-semibold text-stone-700">Choose your stylist</p>
            <div className="space-y-3">
              {STYLISTS.map((stylist) => {
                const [imgErr, setImgErr] = useState(false);
                return (
                  <button
                    key={stylist.id}
                    onClick={() => { setSelectedStylist(stylist.id); setBookingStep("confirm"); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:shadow-sm ${
                      selectedStylist === stylist.id ? "border-[hsl(38,65%,55%)] bg-[hsl(38,65%,55%)]/5" : "border-stone-100 bg-white hover:border-stone-200"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: stylist.color + "30" }}>
                      {!imgErr ? (
                        <img src={stylist.image} alt={stylist.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: stylist.color }}>
                          {stylist.name.split(" ").map((w) => w[0]).join("")}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-800">{stylist.name}</p>
                      <p className="text-xs text-stone-400">{stylist.title}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-semibold text-stone-700">{stylist.rating}</span>
                        <span className="text-xs text-stone-400">({stylist.reviews} reviews)</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Booking confirmation ── */}
        {bookingStep === "confirm" && selectedService && selectedStylist && (
          <div className="space-y-5 pt-6">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back
            </button>
            <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
              <p className="text-sm font-bold text-stone-800">Confirm your booking</p>
              <div className="space-y-2">
                <Row label="Service" val={selectedService.name} />
                <Row label="Stylist" val={STYLISTS.find((s) => s.id === selectedStylist)?.name ?? ""} />
                <Row label="Duration" val={`${selectedService.duration} min`} />
                <Row label="Price" val={`$${selectedService.price}`} />
              </div>
              <button className="w-full py-3.5 rounded-xl gradient-gold text-white font-bold text-sm hover:opacity-90 transition-opacity">
                Request Appointment
              </button>
              <p className="text-[11px] text-stone-400 text-center">You'll receive a confirmation via text message</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
      <span className="text-xs text-stone-400">{label}</span>
      <span className="text-xs font-semibold text-stone-700">{val}</span>
    </div>
  );
}
