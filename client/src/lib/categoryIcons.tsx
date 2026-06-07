import type { SvgIconComponent } from "@mui/icons-material";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import LaptopMacOutlinedIcon from "@mui/icons-material/LaptopMacOutlined";
import HeadphonesOutlinedIcon from "@mui/icons-material/HeadphonesOutlined";
import CheckroomOutlinedIcon from "@mui/icons-material/CheckroomOutlined";
import FaceRetouchingNaturalOutlinedIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import ChildCareOutlinedIcon from "@mui/icons-material/ChildCareOutlined";
import SportsSoccerOutlinedIcon from "@mui/icons-material/SportsSoccerOutlined";
import ChairOutlinedIcon from "@mui/icons-material/ChairOutlined";
import KitchenOutlinedIcon from "@mui/icons-material/KitchenOutlined";
import LocalGroceryStoreOutlinedIcon from "@mui/icons-material/LocalGroceryStoreOutlined";
import LocalPharmacyOutlinedIcon from "@mui/icons-material/LocalPharmacyOutlined";
import TwoWheelerOutlinedIcon from "@mui/icons-material/TwoWheelerOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PetsOutlinedIcon from "@mui/icons-material/PetsOutlined";
import WatchOutlinedIcon from "@mui/icons-material/WatchOutlined";
import ToysOutlinedIcon from "@mui/icons-material/ToysOutlined";
import type { Category } from "@/lib/types";

const FALLBACK_ICONS: SvgIconComponent[] = [
  CategoryOutlinedIcon,
  LocalGroceryStoreOutlinedIcon,
  CheckroomOutlinedIcon,
  PhoneIphoneOutlinedIcon,
  ChairOutlinedIcon,
  SportsSoccerOutlinedIcon,
  FaceRetouchingNaturalOutlinedIcon,
  HeadphonesOutlinedIcon,
];

function matchIcon(key: string): SvgIconComponent | null {
  if (/(phone|mobile|tab|cell|smart)/.test(key)) return PhoneIphoneOutlinedIcon;
  if (/(laptop|computer|pc|electronic|gadget|audio|camera)/.test(key)) return LaptopMacOutlinedIcon;
  if (/(headphone|earphone|speaker|sound)/.test(key)) return HeadphonesOutlinedIcon;
  if (/(cloth|fashion|men|women|apparel|wear|shoe)/.test(key)) return CheckroomOutlinedIcon;
  if (/(beauty|health|cosmetic|skin|care)/.test(key)) return FaceRetouchingNaturalOutlinedIcon;
  if (/(baby|kid|toddler|infant)/.test(key)) return ChildCareOutlinedIcon;
  if (/(sport|fitness|gym|outdoor)/.test(key)) return SportsSoccerOutlinedIcon;
  if (/(furniture|sofa|home|decor|living)/.test(key)) return ChairOutlinedIcon;
  if (/(kitchen|appliance|cook|dining)/.test(key)) return KitchenOutlinedIcon;
  if (/(grocery|food|fresh|market)/.test(key)) return LocalGroceryStoreOutlinedIcon;
  if (/(pharma|medic|health\s*care|vitamin)/.test(key)) return LocalPharmacyOutlinedIcon;
  if (/(auto|car|vehicle|motor|bike|automotive)/.test(key)) return TwoWheelerOutlinedIcon;
  if (/(tool|hardware|diy|industrial)/.test(key)) return BuildOutlinedIcon;
  if (/(book|stationery|office)/.test(key)) return MenuBookOutlinedIcon;
  if (/(pet|animal)/.test(key)) return PetsOutlinedIcon;
  if (/(watch|jewel|accessor)/.test(key)) return WatchOutlinedIcon;
  if (/(toy|game|hobby)/.test(key)) return ToysOutlinedIcon;
  return null;
}

export function getCategoryIconComponent(category: Pick<Category, "slug" | "name">): SvgIconComponent {
  const key = `${category.slug} ${category.name}`.toLowerCase();
  const stable = `${category.slug}\0${category.name}`;
  return matchIcon(key) ?? FALLBACK_ICONS[hashString(stable) % FALLBACK_ICONS.length];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

type IconProps = { category: Pick<Category, "id" | "slug" | "name">; fontSize?: number };

/** Line-style MUI icon for a category (slug/name keyword match + stable fallback). */
export function CategoryNavIcon({ category, fontSize = 22 }: IconProps) {
  const Icon = getCategoryIconComponent(category);
  return <Icon sx={{ fontSize, color: "text.secondary" }} />;
}
