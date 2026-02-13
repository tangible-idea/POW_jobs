CREATE TABLE scrape_jobs (
  -- PK: API의 id를 그대로 사용 (UUID)
  id UUID PRIMARY KEY,

  -- 기본 정보
  affiliate TEXT,
  title TEXT NOT NULL,
  deadline_type TEXT,          -- '상시채용', '채용시마감' 등
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,

  -- 경력 조건
  career_min INT DEFAULT 0,
  career_max INT DEFAULT 0,

  -- 회사 정보
  company_id UUID,
  company_name TEXT,
  company_image TEXT,

  -- 필터링용 배열 컬럼
  regions TEXT[] DEFAULT '{}',
  employee_types TEXT[] DEFAULT '{}',
  educations TEXT[] DEFAULT '{}',
  depth_ones TEXT[] DEFAULT '{}',       -- 직무 대분류
  depth_twos TEXT[] DEFAULT '{}',       -- 직무 중분류
  depth_threes TEXT[] DEFAULT '{}',     -- 직무 소분류
  keywords TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  badges TEXT[] DEFAULT '{}',

  -- 통계
  views INT DEFAULT 0,

  -- 메타
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 필터링 성능을 위한 인덱스
CREATE INDEX idx_scrape_jobs_created_at ON scrape_jobs (created_at DESC);
CREATE INDEX idx_scrape_jobs_company_name ON scrape_jobs (company_name);
CREATE INDEX idx_scrape_jobs_regions ON scrape_jobs USING GIN (regions);
CREATE INDEX idx_scrape_jobs_employee_types ON scrape_jobs USING GIN (employee_types);
CREATE INDEX idx_scrape_jobs_depth_ones ON scrape_jobs USING GIN (depth_ones);
CREATE INDEX idx_scrape_jobs_depth_twos ON scrape_jobs USING GIN (depth_twos);
CREATE INDEX idx_scrape_jobs_keywords ON scrape_jobs USING GIN (keywords);
CREATE INDEX idx_scrape_jobs_career_min ON scrape_jobs (career_min);
CREATE INDEX idx_scrape_jobs_career_max ON scrape_jobs (career_max);
CREATE INDEX idx_scrape_jobs_deadline_type ON scrape_jobs (deadline_type);
CREATE INDEX idx_scrape_jobs_views ON scrape_jobs (views DESC);
