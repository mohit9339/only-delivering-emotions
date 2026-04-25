import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#solution", label: "Solution" },
  { href: "#services", label: "Services" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#book", label: "Book" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/85 backdrop-blur-lg shadow-soft"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <a href="#top" className="shrink-0">
          <Logo />
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm">
            Login
          </Button>
          <Button asChild size="sm" className="bg-gradient-cta text-white shadow-soft hover:opacity-95">
            <a href="#book">Book Delivery</a>
          </Button>
        </div>
        <button
          aria-label="Menu"
          className="rounded-lg p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="flex flex-col gap-1 px-5 py-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
            <Button asChild className="mt-2 bg-gradient-cta text-white">
              <a href="#book" onClick={() => setOpen(false)}>Book Delivery</a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
