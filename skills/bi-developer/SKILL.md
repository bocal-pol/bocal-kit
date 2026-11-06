---
name: bi-developer
description: "BI Developer & Data Analyst — Star schema, SCD Type 2, OLAP cubes, analytical queries, Power BI DAX, Tableau calculated fields, KPI definition, ad-hoc analysis. Focus parameter: analysis (exploratory analysis) / bi (dashboards + cubes) / full (default). Auto-invoke on: Power BI, Tableau, dashboard, OLAP cube, DAX, star schema, fact table, dimension table, KPI, reporting, data analysis, data analyst, BI, analytical measure, data visualization."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: medium
scope: data
dependencies: []
conflicts: []
---

# BI Developer / Data Analyst

`[Activated: BI Developer]` or `[Activated: Data Analyst]` depending on focus

Turns rows of data into decisions. From raw facts to actionable insights.

> **Absolute rule**: every metric defined = documented business definition + calculation formula + exclusion rules + numeric example. A KPI with no definition is a source of conflict.

## Optional input (if invoked from `data-agent`)

If data tables available + reporting goals + BI tool + focus are provided: skip Phase 1.

## Workflow

### Phase 1 — BI context

Collect if insufficient:
```
BI Developer — Context:
1. Focus:
   [ ] analysis — exploratory analysis, ad-hoc SQL, insights
   [ ] bi       — dashboard, OLAP cube, Power BI / Tableau
   [ ] full     — both (default)
2. BI tool: [Power BI / Tableau / Metabase / Looker / Direct SQL / Other]
3. Data source: [available mart tables, current schema]
4. Business domain: [Sales / Finance / HR / Marketing / Operations / Other]
5. Dashboard audience: [C-Level / Managers / Operational staff / Everyone]
6. Refresh frequency: [Real-time / Hourly / Daily / Weekly]
```

### Phase 2 — Dimensional modeling

> Enable if `focus` = `bi` or `full`

`[Activated: BI Developer]`

#### Star Schema — full DDL

```sql
-- ─────────────────────────────────────────────────────────────────
-- DATE DIMENSION — mandatory in every star schema
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE dim_date (
    date_key        INT            PRIMARY KEY,  -- YYYYMMDD format
    full_date       DATE           NOT NULL,
    day_of_week     SMALLINT       NOT NULL,  -- 1=Monday, 7=Sunday
    day_name        VARCHAR(10)    NOT NULL,
    day_of_month    SMALLINT       NOT NULL,
    day_of_year     SMALLINT       NOT NULL,
    week_of_year    SMALLINT       NOT NULL,
    month_number    SMALLINT       NOT NULL,
    month_name      VARCHAR(10)    NOT NULL,
    quarter         SMALLINT       NOT NULL,  -- 1–4
    year            SMALLINT       NOT NULL,
    is_weekend      BOOLEAN        NOT NULL DEFAULT FALSE,
    is_public_holiday BOOLEAN      NOT NULL DEFAULT FALSE,
    fiscal_year     SMALLINT,
    fiscal_quarter  SMALLINT
);

-- Automatic population (PostgreSQL)
INSERT INTO dim_date
SELECT
    TO_CHAR(d, 'YYYYMMDD')::INT      AS date_key,
    d                                 AS full_date,
    EXTRACT(ISODOW FROM d)::SMALLINT AS day_of_week,
    TO_CHAR(d, 'Day')                AS day_name,
    EXTRACT(DAY FROM d)::SMALLINT    AS day_of_month,
    EXTRACT(DOY FROM d)::SMALLINT    AS day_of_year,
    EXTRACT(WEEK FROM d)::SMALLINT   AS week_of_year,
    EXTRACT(MONTH FROM d)::SMALLINT  AS month_number,
    TO_CHAR(d, 'Month')              AS month_name,
    EXTRACT(QUARTER FROM d)::SMALLINT AS quarter,
    EXTRACT(YEAR FROM d)::SMALLINT   AS year,
    EXTRACT(ISODOW FROM d) IN (6, 7) AS is_weekend,
    FALSE                            AS is_public_holiday
FROM GENERATE_SERIES('2020-01-01'::DATE, '2030-12-31'::DATE, '1 day') AS d;

-- ─────────────────────────────────────────────────────────────────
-- CUSTOMER DIMENSION — SCD Type 2
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE dim_customer (
    customer_key    BIGSERIAL      PRIMARY KEY,  -- Surrogate key
    customer_id     BIGINT         NOT NULL,      -- Natural key (source)
    email_hash      VARCHAR(64)    NOT NULL,      -- Masked PII
    segment         VARCHAR(50)    NOT NULL,
    country_code    CHAR(2)        NOT NULL,
    plan_type       VARCHAR(30)    NOT NULL,
    -- SCD Type 2 — change tracking
    valid_from      DATE           NOT NULL DEFAULT CURRENT_DATE,
    valid_to        DATE           NOT NULL DEFAULT '9999-12-31',
    is_current      BOOLEAN        NOT NULL DEFAULT TRUE,
    -- Metadata
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast joins
CREATE INDEX idx_dim_customer_id_current
ON dim_customer (customer_id, is_current)
WHERE is_current = TRUE;

-- ─────────────────────────────────────────────────────────────────
-- FACT TABLE — SALES
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE fct_sales (
    -- Surrogate key
    sale_key         BIGSERIAL     PRIMARY KEY,

    -- Dimensional keys (FK to dimensions)
    date_key         INT           NOT NULL REFERENCES dim_date(date_key),
    customer_key     BIGINT        NOT NULL REFERENCES dim_customer(customer_key),
    product_key      BIGINT        NOT NULL REFERENCES dim_product(product_key),
    channel_key      INT           NOT NULL REFERENCES dim_channel(channel_key),

    -- Degenerate key (source identifier with no own dimension)
    order_id         BIGINT        NOT NULL,
    order_line_id    BIGINT        NOT NULL,

    -- Additive measures (can be SUM()'d across any dimension)
    quantity         INT           NOT NULL CHECK (quantity > 0),
    unit_price       DECIMAL(12,2) NOT NULL,
    discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_amount     DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    net_amount       DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price - discount_amount) STORED,
    tax_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount     DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price - discount_amount + tax_amount) STORED,

    -- Semi-additive measure (partial aggregation depending on the dimension)
    margin_amount    DECIMAL(12,2),  -- Don't SUM() across all dims

    -- Timestamps
    sale_timestamp   TIMESTAMP     NOT NULL,
    UNIQUE (order_id, order_line_id)
);

-- Composite indexes for frequent analytical queries
CREATE INDEX idx_fct_sales_date ON fct_sales (date_key);
CREATE INDEX idx_fct_sales_customer ON fct_sales (customer_key);
CREATE INDEX idx_fct_sales_date_channel ON fct_sales (date_key, channel_key) INCLUDE (net_amount);
```

#### SCD Type 2 — update procedure

```sql
-- SCD Type 2 procedure for dim_customer
CREATE OR REPLACE PROCEDURE upsert_dim_customer(
    p_customer_id   BIGINT,
    p_segment       VARCHAR,
    p_country_code  CHAR(2),
    p_plan_type     VARCHAR,
    p_email_hash    VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
    v_existing_key BIGINT;
    v_has_changed  BOOLEAN;
BEGIN
    -- Check whether a current row exists and has changed
    SELECT customer_key,
           (segment != p_segment OR country_code != p_country_code OR plan_type != p_plan_type)
    INTO v_existing_key, v_has_changed
    FROM dim_customer
    WHERE customer_id = p_customer_id AND is_current = TRUE;

    IF v_existing_key IS NULL THEN
        -- New customer
        INSERT INTO dim_customer (customer_id, email_hash, segment, country_code, plan_type)
        VALUES (p_customer_id, p_email_hash, p_segment, p_country_code, p_plan_type);

    ELSIF v_has_changed THEN
        -- Close the current record
        UPDATE dim_customer
        SET valid_to = CURRENT_DATE - 1, is_current = FALSE
        WHERE customer_key = v_existing_key;

        -- Create the new record
        INSERT INTO dim_customer (customer_id, email_hash, segment, country_code, plan_type, valid_from)
        VALUES (p_customer_id, p_email_hash, p_segment, p_country_code, p_plan_type, CURRENT_DATE);
    END IF;
END;
$$;
```

### Phase 3 — Analytical queries

> Enable if `focus` = `analysis` or `full`

`[Activated: Data Analyst]`

```sql
-- ─────────────────────────────────────────────────────────────────
-- COHORT ANALYSIS — Retention by acquisition month
-- ─────────────────────────────────────────────────────────────────
WITH first_purchase AS (
    SELECT
        dc.customer_id,
        DATE_TRUNC('month', MIN(fs.sale_timestamp)) AS cohort_month
    FROM fct_sales fs
    JOIN dim_customer dc ON fs.customer_key = dc.customer_key AND dc.is_current
    GROUP BY dc.customer_id
),
monthly_activity AS (
    SELECT
        fp.customer_id,
        fp.cohort_month,
        DATE_TRUNC('month', fs.sale_timestamp)       AS activity_month,
        -- Months since acquisition
        EXTRACT(EPOCH FROM (
            DATE_TRUNC('month', fs.sale_timestamp) - fp.cohort_month
        )) / 2592000                                 AS months_since_acquisition
    FROM first_purchase fp
    JOIN fct_sales fs
        ON fp.customer_id = (SELECT dc2.customer_id FROM dim_customer dc2
                             WHERE dc2.customer_key = fs.customer_key LIMIT 1)
    GROUP BY 1, 2, 3
)
SELECT
    TO_CHAR(cohort_month, 'YYYY-MM')  AS cohort,
    months_since_acquisition::INT     AS month_number,
    COUNT(DISTINCT customer_id)       AS customers,
    COUNT(DISTINCT customer_id) * 100.0 /
        FIRST_VALUE(COUNT(DISTINCT customer_id)) OVER (
            PARTITION BY cohort_month ORDER BY months_since_acquisition
        )                             AS retention_rate
FROM monthly_activity
GROUP BY cohort_month, months_since_acquisition
ORDER BY cohort_month, months_since_acquisition;

-- ─────────────────────────────────────────────────────────────────
-- ROLLING REVENUE — 30-day Moving Average
-- ─────────────────────────────────────────────────────────────────
SELECT
    dd.full_date,
    SUM(fs.net_amount)                           AS daily_revenue,
    AVG(SUM(fs.net_amount)) OVER (
        ORDER BY dd.full_date
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    )                                             AS ma_30d_revenue,
    SUM(SUM(fs.net_amount)) OVER (
        PARTITION BY dd.year, dd.month_number
        ORDER BY dd.full_date
    )                                             AS mtd_revenue,
    SUM(SUM(fs.net_amount)) OVER (
        PARTITION BY dd.year
        ORDER BY dd.full_date
    )                                             AS ytd_revenue
FROM fct_sales fs
JOIN dim_date dd ON fs.date_key = dd.date_key
WHERE dd.full_date >= CURRENT_DATE - 90
GROUP BY dd.full_date, dd.year, dd.month_number
ORDER BY dd.full_date;
```

### Phase 4 — Power BI DAX

```dax
// ─────────────────────────────────────────────────────────────────
// CORE MEASURES
// ─────────────────────────────────────────────────────────────────

// Net revenue
Net Revenue = SUMX(fct_sales, fct_sales[quantity] * fct_sales[unit_price] - fct_sales[discount_amount])

// Active customers (last 30 days)
Active Customers 30d =
CALCULATE(
    DISTINCTCOUNT(fct_sales[customer_key]),
    DATESINPERIOD(dim_date[full_date], LASTDATE(dim_date[full_date]), -30, DAY)
)

// ─────────────────────────────────────────────────────────────────
// TIME COMPARISONS
// ─────────────────────────────────────────────────────────────────

// Revenue, same period last year
Net Revenue PY =
CALCULATE([Net Revenue], SAMEPERIODLASTYEAR(dim_date[full_date]))

// YoY growth
YoY Growth % =
DIVIDE([Net Revenue] - [Net Revenue PY], [Net Revenue PY], BLANK())

// Cumulative revenue since start of year (YTD)
Net Revenue YTD =
TOTALYTD([Net Revenue], dim_date[full_date])

// ─────────────────────────────────────────────────────────────────
// ADVANCED METRICS
// ─────────────────────────────────────────────────────────────────

// Average Customer Lifetime Value (CLV)
Avg CLV =
AVERAGEX(
    VALUES(dim_customer[customer_key]),
    CALCULATE(
        [Net Revenue],
        ALL(dim_date)
    )
)

// Retention rate (customers buying in 2 consecutive months)
Retention Rate =
VAR CustomersThisMonth =
    CALCULATE(DISTINCTCOUNT(fct_sales[customer_key]))
VAR CustomersBothMonths =
    CALCULATE(
        DISTINCTCOUNT(fct_sales[customer_key]),
        FILTER(
            VALUES(dim_customer[customer_key]),
            CALCULATE(
                [Net Revenue],
                DATEADD(dim_date[full_date], -1, MONTH)
            ) > 0
        )
    )
RETURN
    DIVIDE(CustomersBothMonths, CustomersThisMonth)

// ABC product classification
Product ABC Category =
VAR TotalRevenue = CALCULATE([Net Revenue], ALL(dim_product))
VAR CumulativeRevenue =
    CALCULATE(
        [Net Revenue],
        FILTER(
            ALL(dim_product),
            [Net Revenue] >= MAX([Net Revenue])
        )
    )
VAR CumulativePct = DIVIDE(CumulativeRevenue, TotalRevenue)
RETURN
    IF(CumulativePct <= 0.8, "A",
    IF(CumulativePct <= 0.95, "B", "C"))
```

### Phase 5 — KPI definitions

```markdown
## KPI catalog — [Domain]

### KPI: [KPI Name]
**Business definition**: [In one sentence a non-technical person can understand]
**Formula**: `[Numerator] / [Denominator] × 100`
**Numerator**: [Precise definition + inclusion rules]
**Denominator**: [Precise definition + inclusion rules]
**Exclusions**: [What is EXCLUDED from the calculation and why]
**Granularity**: [Daily / Weekly / Monthly / Yearly]
**Source**: [dbt mart table(s) used]
**Owner**: [Team responsible for the business definition]
**Example**:
  - Month of [date]: numerator = [N], denominator = [D] → KPI = [result]
**Alerts**:
  - Green threshold: ≥ [X]%
  - Orange threshold: [Y]% – [X]%
  - Red threshold: < [Y]%
```

### Phase 6 — Conditional persistence

- **If invoked from `data-agent`**: return artifacts in Markdown.
- **If invoked standalone**:
  1. Create `data/bi-developer/` via Bash if absent
  2. Write `data/bi-developer/YYYY-MM-DD_bi-developer.md`

### Phase 7 — Memory

> ⚠️ Skip if invoked from `data-agent`.

Record in `<project>/.claude/data-knowledge.md`:
- Defined star/snowflake schema
- Tracked SCD Type 2 dimensions
- Validated KPIs with their business owner
- BI tool used + DAX measures/calculated fields created
