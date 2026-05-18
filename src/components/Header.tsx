import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { Menu, X, Bike, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Home" },
  { to: "/track", label: "Track Order" },
  { to: "/partner/login", label: "Riders" },
  { to: "/admin/login", label: "Admin" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();


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
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/partner/register">
              <Bike className="mr-1.5 h-4 w-4" /> Become a Rider
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to={user ? "/account" : "/account/login"}>
              <User className="mr-1.5 h-4 w-4" /> {user ? "Account" : "Sign in"}
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-gradient-cta text-white shadow-soft hover:opacity-95"
          >
            <Link to="/book">Book Delivery</Link>
          </Button>
        </div>
        <button
          aria-label="Menu"
          className={`rounded-lg p-2 md:hidden ${
            scrolled ? "text-foreground" : "text-foreground"
          }`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="flex flex-col gap-1 px-5 py-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <Button asChild variant="outline" className="mt-2">
              <Link to="/partner/register" onClick={() => setOpen(false)}>
                <Bike className="mr-1.5 h-4 w-4" /> Become a Rider
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={user ? "/account" : "/account/login"} onClick={() => setOpen(false)}>
                <User className="mr-1.5 h-4 w-4" /> {user ? "My account" : "Sign in"}
              </Link>
            </Button>
            <Button asChild className="bg-gradient-cta text-white">
              <Link to="/book" onClick={() => setOpen(false)}>Book Delivery</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
