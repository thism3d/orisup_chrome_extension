/**
 * Marketplace analytics for admin dashboard (orders, revenue, tops, charts).
 */

import { sql, desc, and, gte, lt, notInArray, eq, asc } from "drizzle-orm";
import { db } from "../db";
import { orders, orderItems, products, vendors, productReviews } from "../../shared/schema";

export type AdminDashboardRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month";

function rangeForPreset(preset: AdminDashboardRangePreset): {
  start: Date;
  endExclusive: Date;
  chartGranularity: "hour" | "day";
} {
  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const nextMidnightAfter = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  switch (preset) {
    case "today":
      return {
        start: sod,
        endExclusive: new Date(now.getTime() + 1),
        chartGranularity: "hour",
      };
    case "yesterday": {
      const ys = new Date(sod);
      ys.setDate(ys.getDate() - 1);
      return {
        start: ys,
        endExclusive: sod,
        chartGranularity: "hour",
      };
    }
    case "this_week": {
      const dow = sod.getDay();
      const monOffset = dow === 0 ? -6 : 1 - dow;
      const ws = new Date(sod);
      ws.setDate(ws.getDate() + monOffset);
      return {
        start: ws,
        endExclusive: nextMidnightAfter(now),
        chartGranularity: "day",
      };
    }
    case "last_week": {
      const dow = sod.getDay();
      const monOffset = dow === 0 ? -6 : 1 - dow;
      const tws = new Date(sod);
      tws.setDate(tws.getDate() + monOffset);
      const lws = new Date(tws);
      lws.setDate(lws.getDate() - 7);
      return {
        start: lws,
        endExclusive: tws,
        chartGranularity: "day",
      };
    }
    case "this_month": {
      const ms = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return {
        start: ms,
        endExclusive: nextMidnightAfter(now),
        chartGranularity: "day",
      };
    }
    case "last_month": {
      const tm = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      return {
        start: lm,
        endExclusive: tm,
        chartGranularity: "day",
      };
    }
    default: {
      const _: never = preset;
      return _;
    }
  }
}

async function summarizePeriod(start: Date, endExclusive: Date) {
  const bounds = [gte(orders.createdAt, start), lt(orders.createdAt, endExclusive)];
  const [ordersRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(...bounds)!);

  const [revRow] = await db
    .select({
      sum: sql<string>`coalesce(sum(${orders.total}::numeric), 0)::text`,
    })
    .from(orders)
    .where(and(...bounds, notInArray(orders.status, ["cancelled"]))!);

  const oc = Number(ordersRow?.n ?? 0);
  const totalStr = revRow?.sum ?? "0";
  const totalNum = Number.parseFloat(totalStr);
  return {
    ordersPlaced: oc,
    revenueBdtExCancelled: totalStr,
    averageOrderValue: oc > 0 ? (totalNum / oc).toFixed(2) : "0.00",
  };
}

async function chartSeries(params: {
  start: Date;
  endExclusive: Date;
  granularity: "hour" | "day";
}): Promise<Array<{ label: string; orders: number; revenueBdt: string }>> {
  const { start, endExclusive, granularity } = params;

  const trunc =
    granularity === "hour"
      ? sql`date_trunc('hour', ${orders.createdAt})`
      : sql`date_trunc('day', ${orders.createdAt})`;

  const qs = await db
    .select({
      bucketStr: sql<string>`${trunc}::text`,
      orderCount: sql<number>`count(distinct ${orders.id})::int`,
      revenue: sql<string>`
        coalesce(sum(case when ${orders.status} <> 'cancelled' then ${orders.total}::numeric else 0 end), 0)::text
      `,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, endExclusive))!)
    .groupBy(trunc)
    .orderBy(asc(trunc));

  const byKey = new Map<string, { orders: number; revenue: string }>();
  for (const qr of qs) {
    let bd: Date | null = null;
    try {
      bd = qr.bucketStr ? new Date(qr.bucketStr.trim()) : null;
    } catch {
      bd = null;
    }
    if (!bd || Number.isNaN(bd.getTime())) continue;
    const key =
      granularity === "hour"
        ? `${bd.getFullYear()}-${bd.getMonth()}-${bd.getDate()}-${bd.getHours()}`
        : `${bd.getFullYear()}-${bd.getMonth()}-${bd.getDate()}`;
    byKey.set(key, {
      orders: Number(qr.orderCount ?? 0),
      revenue: (qr.revenue ?? "0").toString(),
    });
  }

  const out: Array<{ label: string; orders: number; revenueBdt: string }> = [];
  if (granularity === "hour") {
    const end = endExclusive > new Date() ? new Date() : endExclusive;
    let t = new Date(start);
    while (t < end) {
      const key = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}-${t.getHours()}`;
      const row = byKey.get(key);
      const label = `${String(t.getHours()).padStart(2, "0")}:00`;
      out.push({
        label,
        orders: row?.orders ?? 0,
        revenueBdt: Number.parseFloat(row?.revenue ?? "0").toFixed(2),
      });
      t = new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours() + 1, 0, 0);
    }
  } else {
    let t = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
    const last = new Date(endExclusive.getTime() - 1);
    while (t <= last) {
      const key = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
      const row = byKey.get(key);
      const label = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      out.push({
        label,
        orders: row?.orders ?? 0,
        revenueBdt: Number.parseFloat(row?.revenue ?? "0").toFixed(2),
      });
      t.setDate(t.getDate() + 1);
    }
  }
  return out;
}

async function topProductsByRevenue(start: Date, endExclusive: Date, limit: number) {
  const rows = await db
    .select({
      productId: orderItems.productId,
      title: sql<string>`max(${products.title})`,
      slug: sql<string>`max(${products.slug})`,
      vendorId: sql<string>`max(${products.vendorId})`,
      vendorSlug: sql<string>`max(${vendors.slug})`,
      vendorName: sql<string>`max(${vendors.name})`,
      revenue: sql<string>`sum(${orderItems.lineTotal}::numeric)::text`,
      units: sql<number>`sum(${orderItems.quantity})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(
      and(
        gte(orders.createdAt, start),
        lt(orders.createdAt, endExclusive),
        notInArray(orders.status, ["cancelled"]),
      )!,
    )
    .groupBy(orderItems.productId)
    .orderBy(desc(sql`sum(${orderItems.lineTotal}::numeric)`))
    .limit(limit);

  return rows.map((r) => ({
    productId: r.productId,
    title: r.title,
    slug: r.slug,
    vendorSlug: r.vendorSlug,
    vendorName: r.vendorName,
    revenue: r.revenue,
    units: Number(r.units ?? 0),
  }));
}

async function topVendorsByRevenue(start: Date, endExclusive: Date, limit: number) {
  const rows = await db
    .select({
      vendorId: vendors.id,
      name: vendors.name,
      slug: vendors.slug,
      revenue: sql<string>`sum(${orderItems.lineTotal}::numeric)::text`,
      orderCount: sql<number>`count(distinct ${orders.id})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(
      and(
        gte(orders.createdAt, start),
        lt(orders.createdAt, endExclusive),
        notInArray(orders.status, ["cancelled"]),
      )!,
    )
    .groupBy(vendors.id)
    .orderBy(desc(sql`sum(${orderItems.lineTotal}::numeric)`))
    .limit(limit);

  return rows.map((r) => ({
    vendorId: r.vendorId,
    name: r.name,
    slug: r.slug,
    revenue: r.revenue ?? "0",
    orderCount: Number(r.orderCount ?? 0),
  }));
}

async function topReviewedProducts(limit: number) {
  const rows = await db
    .select({
      productId: productReviews.productId,
      cnt: sql<number>`count(*)::int`,
      avgRat: sql<string>`avg(${productReviews.rating}::numeric)::text`,
      title: sql<string>`max(${products.title})`,
      slug: sql<string>`max(${products.slug})`,
      vendorSlug: sql<string>`max(${vendors.slug})`,
      vendorName: sql<string>`max(${vendors.name})`,
    })
    .from(productReviews)
    .innerJoin(products, eq(productReviews.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(eq(productReviews.status, "approved"))
    .groupBy(productReviews.productId)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows.map((r) => ({
    productId: r.productId,
    title: r.title ?? "",
    slug: r.slug,
    vendorSlug: r.vendorSlug,
    vendorName: r.vendorName,
    reviewCount: Number(r.cnt ?? 0),
    avgRating: Number.parseFloat(r.avgRat ?? "0").toFixed(2),
  }));
}

async function ordersByStatusSlice(start: Date, endExclusive: Date): Promise<Array<{ status: string; n: number }>> {
  const rows = await db
    .select({
      status: orders.status,
      n: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, endExclusive))!)
    .groupBy(orders.status)
    .orderBy(desc(sql`count(*)`));

  return rows.map((x) => ({ status: String(x.status), n: Number(x.n ?? 0) }));
}

export async function getAdminDashboardAnalytics(preset: AdminDashboardRangePreset) {
  const { start, endExclusive, chartGranularity } = rangeForPreset(preset);
  const [summary, series, statusSlice, tops, topsVendors, topsReviews] = await Promise.all([
    summarizePeriod(start, endExclusive),
    chartSeries({ start, endExclusive, granularity: chartGranularity }),
    ordersByStatusSlice(start, endExclusive),
    topProductsByRevenue(start, endExclusive, 8),
    topVendorsByRevenue(start, endExclusive, 8),
    topReviewedProducts(8),
  ]);

  return {
    preset,
    periodStart: start.toISOString(),
    periodEndExclusive: endExclusive.toISOString(),
    /** Query params aligned with `/api/admin/orders` date filters (`createdFrom` + `createdToExclusive`). */
    navigation: {
      orders: {
        createdFrom: start.toISOString(),
        createdToExclusive: endExclusive.toISOString(),
      },
    },
    summary,
    series,
    ordersByStatus: statusSlice,
    topProductsByRevenue: tops,
    topVendorsByRevenue: topsVendors,
    topReviewedProducts: topsReviews,
  };
}
