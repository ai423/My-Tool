// צורת הנתונים של חברה. משותף לשרת ולדפדפן.
export type BrandProfile = {
  summary: string;
  audience: string;
  tone: string;
  language: string;
  products: string[];
  avoid: string[];
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
};
