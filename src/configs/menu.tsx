import { BookOpen, Home, Sparkles, User, SettingsIcon } from "lucide-react";

const menus = [
  { name: "Beranda", path: "/", icon: <Home className="size-4" /> },
  {
    name: "Doa Harian",
    path: "/doa-harian",
    icon: <Sparkles className="size-4" />,
    badge: "New",
  },
  {
    name: "Hadist",
    path: "/hadist",
    icon: <BookOpen className="size-4" />,
    badge: "New",
  },
  { name: "Profil", path: "/profile", icon: <User className="size-4" /> },
  { name: "Pengaturan", path: "/settings", icon: <SettingsIcon className="size-4" /> },
];

export default menus;
