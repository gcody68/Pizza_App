import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

export default function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll be in touch soon. 🤙");
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <section id="get-started" className="container py-16">
      <div className="max-w-xl mx-auto bg-card border border-border rounded-xl p-6 md:p-10 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-serif font-bold text-gold">Get Started Today</h2>
          <p className="text-muted-foreground text-sm">
            Ready to stop losing money? Drop us a line and we'll get you set up.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none"
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder="Tell us about your restaurant..."
            />
          </div>
          <button
            type="submit"
            className="w-full gradient-gold text-primary-foreground font-semibold py-3 rounded-lg text-lg hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}
