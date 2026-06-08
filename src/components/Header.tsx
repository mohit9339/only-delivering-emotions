import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { Menu, X, Bike, ShoppingBag } from "lucide-react";

const CUSTOMER_URL = "https://only-customer.vercel.app/";
const RIDER_URL = "https://rider-companion-app-1cb8643e.vercel.app/";

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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <Logo size={36} />
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <a href={RIDER_URL} target="_blank" rel="noopener noreferrer">
              <Bike className="mr-1.5 h-4 w-4" /> For Riders
            </a>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-gradient-cta text-white shadow-soft hover:opacity-95"
          >
            <a href={CUSTOMER_URL} target="_blank" rel="noopener noreferrer">
              <ShoppingBag className="mr-1.5 h-4 w-4" /> Order Now
            </a>
          </Button>
        </div>
        <button
          aria-label="Menu"
          className="rounded-lg p-2 md:hidden text-foreground"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="flex flex-col gap-2 px-5 py-4">
            <Button asChild variant="outline">
              <a href={RIDER_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                <Bike className="mr-1.5 h-4 w-4" /> For Riders
              </a>
            </Button>
            <Button asChild className="bg-gradient-cta text-white">
              <a href={CUSTOMER_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                <ShoppingBag className="mr-1.5 h-4 w-4" /> Order Now
              </a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
