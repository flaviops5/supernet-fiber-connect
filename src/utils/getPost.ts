import { BLOG_POSTS, BlogPost } from "@/data/posts";

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return BLOG_POSTS;
}
