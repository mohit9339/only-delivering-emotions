import {
  Clock,
  PackageX,
  ShieldAlert,
  AlertTriangle,
  Zap,
  ShieldCheck,
  MapPin,
  CalendarClock,
  UtensilsCrossed,
  Pill,
  Plug,
  KeyRound,
  FileText,
  Shirt,
  BookOpen,
  Footprints,
  Building2,
  Sparkles,
  Target,
  GraduationCap,
  Users,
  Briefcase,
  Wallet,
  RefreshCw,
  PlusCircle,
} from "lucide-react";

export const problems = [
  {
    icon: Clock,
    title: "Couriers are too slow",
    desc: "Traditional couriers take days. Your urgent items can't wait that long.",
  },
  {
    icon: PackageX,
    title: "No service for personal items",
    desc: "On-demand apps are built for food, not your tiffin, charger or keys.",
  },
  {
    icon: ShieldAlert,
    title: "Trust is missing",
    desc: "Sending personal essentials with strangers feels risky and uncertain.",
  },
  {
    icon: AlertTriangle,
    title: "Disrupted routines",
    desc: "Forgotten essentials cost productivity, peace of mind and time.",
  },
];

export const solutions = [
  {
    icon: Zap,
    title: "30–90 min Emergency",
    desc: "Lightning-fast delivery for time-critical personal items.",
    accent: "from-primary to-primary-glow",
  },
  {
    icon: CalendarClock,
    title: "Same-day Delivery",
    desc: "Within 4–12 hours for non-urgent things you still need today.",
    accent: "from-primary-deep to-primary",
  },
  {
    icon: ShieldCheck,
    title: "Verified Riders",
    desc: "Background-checked, trained riders you can actually trust.",
    accent: "from-primary to-primary-deep",
  },
  {
    icon: MapPin,
    title: "Live Location",
    desc: "Track every step in real-time, end to end.",
    accent: "from-primary-glow to-primary",
  },
];

export const emergencyItems = [
  { icon: UtensilsCrossed, label: "Tiffin" },
  { icon: Pill, label: "Medicines" },
  { icon: Plug, label: "Chargers" },
  { icon: KeyRound, label: "Keys" },
  { icon: FileText, label: "Documents" },
];

export const sameDayItems = [
  { icon: Shirt, label: "Clothes" },
  { icon: BookOpen, label: "Books" },
  { icon: Footprints, label: "Shoes" },
];

export const whyNow = [
  {
    icon: Building2,
    title: "Urban Chaos",
    desc: "Rapid urbanization and long commutes spike forgotten-item incidents every day.",
  },
  {
    icon: Sparkles,
    title: "Instant Expectations",
    desc: "Consumers now expect everything on-demand. Personal delivery hasn't caught up.",
  },
  {
    icon: Target,
    title: "Underserved Niche",
    desc: "Built for personal small-items — not e-commerce or heavy logistics.",
  },
];

export const targets = [
  { icon: Briefcase, label: "Urban Professionals", desc: "Busy schedules, zero margin for forgotten essentials." },
  { icon: GraduationCap, label: "Students", desc: "Hostel runs, exam-day documents, last-minute books." },
  { icon: Users, label: "Families", desc: "Tiffins, medicines, school supplies — sorted in minutes." },
];

export const revenue = [
  {
    icon: Wallet,
    title: "Transactional",
    items: ["On-demand premium fees", "Volume-based same-day pricing"],
  },
  {
    icon: RefreshCw,
    title: "Recurring",
    items: ["Daily / weekly subscriptions", "B2B corporate contracts"],
  },
  {
    icon: PlusCircle,
    title: "Ancillary",
    items: ["Speed boosters", "Night & peak hour add-ons"],
  },
];

export const roadmap = [
  { phase: "Phase 01", title: "Pilot Launch", desc: "Launch in 1 metro city. 1,000 daily deliveries." },
  { phase: "Phase 02", title: "Network Buildout", desc: "Verified rider network and micro-hubs." },
  { phase: "Phase 03", title: "Geographic Expansion", desc: "2–3 more major cities post pilot." },
  { phase: "Phase 04", title: "Revenue Diversification", desc: "Subscriptions and B2B corporate plans." },
];
