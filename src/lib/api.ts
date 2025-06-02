import { Post } from "@/interfaces/post";
import fs from "fs";
import matter from "gray-matter";
import { join } from "path";

const postsDirectory = join(process.cwd(), "_posts");

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory);
}

export function getPostBySlug(slug: string): Post {
  const realSlug = slug.replace(/\.md$/, "");
  const fullPath = join(postsDirectory, `${realSlug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    ...(data as Omit<Post, "slug" | "content">),
    slug: realSlug,
    content,
  };
}

// Returns posts separated into pinned and unpinned
export function getAllPosts(): { pinned: Post | null; others: Post[] } {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug))
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  const pinnedPost = posts.find((post) => post.pinned === true) || null;
  const otherPosts = posts.filter((post) => post.pinned !== true);

  return { pinned: pinnedPost, others: otherPosts };
}
