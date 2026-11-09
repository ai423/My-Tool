// צורת הנתונים של חברה. משותף לשרת ולדפדפן.
export type BrandProfile = {
  summary: string;
  audience: string;
  tone: string;
  language: string;
  products: string[];
  avoid: string[];
  positioning?: string;
  competitors?: string[];
};

export type Company = {
  id: string;
  name: string;
  website: string;
  linkedin: string | null;
  notes: string | null;
  profile: BrandProfile | null;
  created_at: string;
};

export const emptyProfile: BrandProfile = {
  summary: "",
  audience: "",
  tone: "",
  language: "עברית",
  products: [],
  avoid: [],
  positioning: "",
  competitors: [],
};

export type ArticleSource = { url: string; title: string };

export type Article = {
  id: string;
  company_id: string;
  topic: string;
  title: string;
  content: string;
  sources: ArticleSource[];
  seo: ArticleSeo | null;
  created_at: string;
};

export type ArticleSeo = {
  primaryKeyword: string;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  keywordCount: number;
};

export type ResearchItem = { kind: string; text: string; url: string };
