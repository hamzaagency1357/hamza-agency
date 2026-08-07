export type BlogLanguage = "ar" | "en" | "tr";
export type BlogStatus = "draft" | "published" | "scheduled" | "unpublished";

export interface BlogPostContent {
  title: string;
  excerpt: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface BlogPost {
  id: number | string;
  slug: string;
  status: BlogStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  updatedAt?: string | null;
  category: string;
  tags: string[];
  featuredImage: string | null;
  contentByLanguage: Record<string, BlogPostContent>;
  copy: BlogPostContent;
}

export interface BlogListLabels {
  title: string;
  empty: string;
  noResults: string;
}

export interface BlogListResult {
  posts: BlogPost[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  language: BlogLanguage;
  labels: BlogListLabels;
}

export interface BlogPostsOptions {
  language?: BlogLanguage;
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  tag?: string;
  preview?: boolean;
}

export interface BlogPostOptions {
  language?: BlogLanguage;
  preview?: boolean;
}

export interface BlogRelatedOptions {
  language?: BlogLanguage;
  preview?: boolean;
  limit?: number;
}

export interface BlogCategory {
  slug: string;
  label: string;
}

export interface BlogTag {
  slug: string;
  label: string;
}

export function getBlogPosts(options?: BlogPostsOptions): BlogListResult;
export function getBlogPostBySlug(slug: string, options?: BlogPostOptions): BlogPost | null;
export function getBlogCategories(language?: BlogLanguage): Record<string, BlogCategory>;
export function getBlogTags(language?: BlogLanguage): Record<string, BlogTag>;
export function getRelatedBlogPosts(post: BlogPost, options?: BlogRelatedOptions): BlogPost[];
export function getBlogFeed(language?: BlogLanguage): BlogPost[];
