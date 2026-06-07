import { Suspense, lazy, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Seo } from "@/components/seo/Seo";
import { usePublicSiteMeta } from "@/contexts/PublicSiteMetaContext";
import { useStorefrontLanguage } from "@/contexts/StorefrontLanguageContext";
import { SITE_NAME, absoluteUrl, getSiteUrl, mediaAbsoluteUrl } from "@/lib/site";
import { useStorefrontUiTemplate } from "@/hooks/useStorefrontUiTemplate";
import { apiJson } from "@/lib/api";
import type { Banner, ProductListRow, Category, ProductListResponse } from "@/lib/types";
const HomeTemplateClassic = lazy(() =>
  import("@/components/home/HomePageTemplates").then((m) => ({ default: m.HomeTemplateClassic })),
);
const HomeTemplateMinimal = lazy(() =>
  import("@/components/home/HomePageTemplates").then((m) => ({ default: m.HomeTemplateMinimal })),
);
const HomeTemplateOrynbd = lazy(() =>
  import("@/components/home/HomePageTemplates").then((m) => ({ default: m.HomeTemplateOrynbd })),
);
const HomeTemplateMasumTraders = lazy(() =>
  import("@/components/home/HomePageTemplates").then((m) => ({ default: m.HomeTemplateMasumTraders })),
);
const HomeTemplateUttoraSteel = lazy(() =>
  import("@/components/home/HomePageTemplates").then((m) => ({ default: m.HomeTemplateUttoraSteel })),
);
const HomeTemplateAdora = lazy(() =>
  import("@/components/home/HomeTemplateAdora").then((m) => ({ default: m.HomeTemplateAdora })),
);

type HomeBootstrap = {
  hero?: Banner[];
  categories?: Category[];
  banners?: Banner[];
};

/** Pull the server-side bootstrap injected into index.html so React Query can skip the round trips. */
function readHomeBootstrap(): HomeBootstrap {
  if (typeof window === "undefined") return {};
  const raw = (window as unknown as { __ORLENBD_INITIAL_HOME__?: HomeBootstrap }).__ORLENBD_INITIAL_HOME__;
  return raw ?? {};
}

function useHomeProducts() {
  return useQuery({
    queryKey: ["home-products"],
    queryFn: async () => {
      const r = await apiJson<ProductListResponse>("/api/products?limit=48");
      return r.items;
    },
    staleTime: 45_000,
  });
}

function useHeroBanners(initial?: Banner[]) {
  return useQuery({
    queryKey: ["banners", "hero"],
    queryFn: () => apiJson<Banner[]>("/api/banners?placement=hero"),
    initialData: initial && initial.length > 0 ? initial : undefined,
    staleTime: 60 * 1000,
  });
}

export function HomePage() {
  const [, setLoc] = useLocation();
  const bootstrap = readHomeBootstrap();
  const productsQ = useHomeProducts();
  const bannersQ = useHeroBanners(bootstrap.hero);
  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiJson<Category[]>("/api/categories"),
    initialData: bootstrap.categories && bootstrap.categories.length > 0 ? bootstrap.categories : undefined,
    staleTime: 60 * 1000,
  });

  const products = productsQ.data ?? [];
  const heroBanners = bannersQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const { text } = useStorefrontLanguage();
  const meta = usePublicSiteMeta();
  const { uiTemplate } = useStorefrontUiTemplate();

  const homeLoading = productsQ.isLoading || bannersQ.isLoading || categoriesQ.isLoading;
  const productsError = productsQ.isError;
  const refetchHome = () => {
    void productsQ.refetch();
    void bannersQ.refetch();
    void categoriesQ.refetch();
  };

  const tabItems = useMemo(() => {
    if (uiTemplate === "uttorasteel") {
      return [
        { label: text("Bedroom & home steel", "বেডরুম ও বাড়ির স্টিল"), items: products.slice(0, 8) },
        { label: text("Office & workshop", "অফিস ও কারখানা"), items: products.filter((_, i) => i % 2 === 0).slice(0, 8) },
        { label: text("Kitchen & dining steel", "রান্নাঘর ও ডাইনিং স্টিল"), items: products.filter((_, i) => i % 2 === 1).slice(0, 8) },
      ];
    }
    if (uiTemplate === "adorashop") {
      return [
        { label: text("New in", "নতুন সংগ্রহ"), items: products.slice(0, 8) },
        { label: text("Women & men", "নারী ও পুরুষ"), items: products.filter((_, i) => i % 2 === 0).slice(0, 8) },
        { label: text("Shoes & accessories", "জুতা ও গয়না"), items: products.filter((_, i) => i % 2 === 1).slice(0, 8) },
      ];
    }
    return [
      { label: text("Home & appliance", "গৃহ ও ইলেকট্রনিক্স"), items: products.slice(0, 8) },
      { label: text("Audio & tech", "অডিও ও গ্যাজেট"), items: products.filter((_, i) => i % 2 === 0).slice(0, 8) },
      { label: text("Sports & outdoor", "খেলা ও বাইরের জিনিস"), items: products.filter((_, i) => i % 2 === 1).slice(0, 8) },
    ];
  }, [uiTemplate, products, text]);
  const brandName = (meta?.site_display_name?.trim() || SITE_NAME).trim();
  const homeJsonLd = useMemo(() => {
    const site = getSiteUrl();
    const logo =
      mediaAbsoluteUrl(meta?.logo_url) ||
      mediaAbsoluteUrl(meta?.og_image_url) ||
      absoluteUrl("/orlenbd-logo.png");
    return [
      {
        "@type": "Organization",
        "@id": `${site}/#organization`,
        name: brandName,
        url: site,
        logo,
      },
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        url: site,
        name: brandName,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${site}/shop?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ];
  }, [meta?.logo_url, meta?.og_image_url, brandName]);

  const defaultSeoTitle = text("Online shopping in Bangladesh", "বাংলাদেশে অনলাইন শপিং");
  const steelSeoTitle = text(
    "UttoraSteel — Steel furniture & workshop products in Bangladesh",
    "উত্তরাস্টিল — বাংলাদেশে স্টিল ফার্নিচার ও ওয়ার্কশপ পণ্য",
  );
  const defaultSeoDescription = text(
    "Shop electronics, fashion, home essentials and more from verified sellers. Cash on delivery across Bangladesh.",
    "ইলেকট্রনিক, ফ্যাশন, গৃহস্থালি জিনিস আরও অনেক কিছু—যাচাইকৃত বিক্রেতাদের কাছ থেকে। সারা দেশে ক্যাশ অন ডেলিভারি।",
  );
  const steelSeoDescription = text(
    "Shop steel beds, chairs, tables, kitchen racks, office furniture, and workshop essentials from verified makers. Built for durability — UttoraSteel.",
    "স্টিলের বিছানা, চেয়ার, টেবিল, কিচেনের র‍্যাক, অফিস ফার্নিচার ও কারখানার জিনিস—বিশ্বস্ত উৎপাদকদের কাছ থেকে। টেকসই—উত্তরাস্টিল।",
  );
  const fashionSeoTitle = text(
    "Adora Shop — Clothing, shoes & lifestyle fashion",
    "অ্যাডোরা শপ — পোশাক, জুতা ও লাইফস্টাইল",
  );
  const fashionSeoDescription = text(
    "Discover curated casual wear, shoes, and accessories with fast checkout and safe payments — Adora Shop.",
    "ক্যাজুয়াল পোশাক, জুতা ও গয়না—দ্রুত অর্ডার ও নিরাপদ পেমেন্ট, অ্যাডোরা শপ।",
  );

  const shared = {
    setLoc,
    categories,
    heroBanners,
    products,
    homeLoading,
    productsError,
    productsErrorMessage: productsQ.error?.message,
    refetchHome,
    tabItems,
    categoriesLoading: categoriesQ.isLoading,
    productsLoading: productsQ.isLoading,
  };

  return (
    <>
      <Seo
        title={
          meta?.site_title?.trim() ||
          (uiTemplate === "uttorasteel" ? steelSeoTitle : uiTemplate === "adorashop" ? fashionSeoTitle : defaultSeoTitle)
        }
        description={
          meta?.site_description?.trim() ||
          (uiTemplate === "uttorasteel" ? steelSeoDescription : uiTemplate === "adorashop" ? fashionSeoDescription : defaultSeoDescription)
        }
        canonicalPath="/"
        jsonLd={homeJsonLd}
      />
      <Suspense fallback={null}>
        {uiTemplate === "orlenbd" && <HomeTemplateClassic {...shared} />}
        {uiTemplate === "norexbd" && <HomeTemplateMinimal {...shared} />}
        {uiTemplate === "adorashop" && <HomeTemplateAdora {...shared} />}
        {uiTemplate === "orynbd" && <HomeTemplateOrynbd {...shared} />}
        {uiTemplate === "masumtraders" && <HomeTemplateMasumTraders {...shared} />}
        {uiTemplate === "uttorasteel" && <HomeTemplateUttoraSteel {...shared} />}
      </Suspense>
    </>
  );
}
