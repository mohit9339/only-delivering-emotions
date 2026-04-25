import { Logo } from "./Logo";
import { Instagram, Twitter, Linkedin, Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo variant="light" />
            <p className="mt-4 max-w-sm text-sm text-background/70">
              ONLY is a hyperlocal personal delivery service built for the
              moments that matter. Because small things carry big emotions.
            </p>
            <div className="mt-5 flex gap-3">
              {[Instagram, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-background/10 text-background/80 transition-colors hover:bg-primary hover:text-white"
                  aria-label="Social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-background/60">
              Company
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {["About", "Services", "Pricing", "Careers", "Contact"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-background/80 hover:text-primary">{l}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-background/60">
              Get in touch
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-background/80">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> hello@onlydelivers.in
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> +91 80 0000 0000
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-background/10 pt-6 text-xs text-background/60 sm:flex-row">
          <div>© {new Date().getFullYear()} ONLY Delivers. All rights reserved.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-primary">Privacy</a>
            <a href="#" className="hover:text-primary">Terms</a>
            <a href="#" className="hover:text-primary">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
