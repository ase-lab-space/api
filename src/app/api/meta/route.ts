import { GoogleSpreadsheet } from "google-spreadsheet";
import { defaultHeaders } from "@/utils/header";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const headers = defaultHeaders;

const apiKey = process.env.GOOGLE_CLOUD_API_KEY ?? "";
const sheetId = process.env.GOOGLE_SHEET_ID ?? "";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // キャッシュの持続時間（24h in milliseconds）

export async function GET(_request: NextRequest) {
  const cacheKey = "meta";
  const now = Date.now();

  if (cache.has(cacheKey)) {
    const cachedData = cache.get(cacheKey);
    if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json(cachedData.data, { headers });
    }
  }

  // キャッシュがないか期限切れの場合はGoogle Spreadsheetから取得
  const doc = new GoogleSpreadsheet(sheetId, { apiKey });
  await doc.loadInfo();

  const memberCountSheet = doc.sheetsByTitle["memberCount"];
  await memberCountSheet.loadCells("B2");
  const memberCountCell = memberCountSheet.getCellByA1("B2");

  const universitiesSheet = doc.sheetsByTitle["universities"];
  await universitiesSheet.loadCells("D2:D");
  const universities: string[] = (await universitiesSheet.getRows()).map(
    (row) => row.get("universities")
  );

  // レスポンスデータの生成
  const data = {
    memberCount: memberCountCell.value,
    universities: universities,
  };

  // データと現在のタイムスタンプをキャッシュに保存
  cache.set(cacheKey, { data, timestamp: now });

  return NextResponse.json(data, { headers });
}

export function OPTIONS(_request: NextRequest) {
  return NextResponse.json({}, { headers });
}
