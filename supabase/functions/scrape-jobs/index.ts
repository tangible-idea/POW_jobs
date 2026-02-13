import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ZIGHANG_API = "https://api.zighang.com/api/recruitments/v3";
const PAGE_SIZE = 100;
const DELAY_MS = 300; // API 부하 방지용 딜레이

interface ZighangJob {
  id: string;
  affiliate: string | null;
  title: string;
  deadlineType: string | null;
  endDate: string | null;
  createdAt: string;
  careerMin: number;
  careerMax: number;
  company: {
    id: string;
    name: string;
    image: string | null;
  };
  regions: string[];
  employeeTypes: string[];
  educations: string[];
  depthOnes: string[];
  depthTwos: string[];
  depthThrees: string[];
  views: number;
  keywords: string[];
  tags: string[];
  badges: string[];
}

interface ZighangResponse {
  success: boolean;
  code: string;
  data: {
    content: ZighangJob[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
  };
}

function toDbRow(job: ZighangJob) {
  return {
    id: job.id,
    affiliate: job.affiliate,
    title: job.title,
    deadline_type: job.deadlineType,
    end_date: job.endDate,
    created_at: job.createdAt,
    career_min: job.careerMin ?? 0,
    career_max: job.careerMax ?? 0,
    company_id: job.company?.id ?? null,
    company_name: job.company?.name ?? null,
    company_image: job.company?.image ?? null,
    regions: job.regions ?? [],
    employee_types: job.employeeTypes ?? [],
    educations: job.educations ?? [],
    depth_ones: job.depthOnes ?? [],
    depth_twos: job.depthTwos ?? [],
    depth_threes: job.depthThrees ?? [],
    keywords: job.keywords ?? [],
    tags: job.tags ?? [],
    badges: job.badges ?? [],
    views: job.views ?? 0,
    scraped_at: new Date().toISOString(),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(page: number, endDate: string): Promise<ZighangResponse> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(PAGE_SIZE),
    careerMin: "0",
    careerMax: "0",
    startDate: "2026-01-01T00:00",
    endDate,
    sortCondition: "VIEWS",
    orderCondition: "DESC",
  });

  const res = await fetch(`${ZIGHANG_API}?${params}`);
  if (!res.ok) {
    throw new Error(`Zighang API returned ${res.status}`);
  }
  const data: ZighangResponse = await res.json();
  if (!data.success || !data.data?.content) {
    throw new Error(`Zighang API error: ${data.code}`);
  }
  return data;
}

serve(async (_req) => {
  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const endDate = new Date().toISOString().slice(0, 16);

    // 첫 페이지로 totalPages 파악
    const first = await fetchPage(0, endDate);
    const totalPages = first.data.totalPages;
    const totalElements = first.data.totalElements;

    let totalUpserted = 0;
    let pagesProcessed = 0;
    let errors: string[] = [];

    // 전체 페이지 순회
    for (let page = 0; page < totalPages; page++) {
      try {
        // 첫 페이지는 이미 fetch했으므로 재사용
        const apiData = page === 0 ? first : await fetchPage(page, endDate);
        const jobs = apiData.data.content;

        if (jobs.length === 0) break;

        const rows = jobs.map(toDbRow);
        const { error, count } = await supabase
          .from("scrape_jobs")
          .upsert(rows, { onConflict: "id", count: "exact" });

        if (error) {
          errors.push(`page ${page}: ${error.message}`);
        } else {
          totalUpserted += count ?? 0;
        }

        pagesProcessed++;

        // 마지막 페이지면 종료
        if (apiData.data.last) break;

        // API 부하 방지
        if (page > 0) await sleep(DELAY_MS);
      } catch (err) {
        errors.push(`page ${page}: ${String(err)}`);
        // 연속 에러 3회 이상이면 중단
        const recentErrors = errors.slice(-3);
        if (recentErrors.length >= 3) break;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return new Response(
      JSON.stringify({
        message: "Scrape complete",
        totalElements,
        totalPages,
        pagesProcessed,
        totalUpserted,
        errors: errors.length > 0 ? errors : undefined,
        elapsedSeconds: Number(elapsed),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
