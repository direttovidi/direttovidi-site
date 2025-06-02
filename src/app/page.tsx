import Container from "@/app/_components/container";
import { Intro } from "@/app/_components/intro";
import { getAllPosts } from "@/lib/api";
import Link from "next/link";

export default function Index() {
  const allPosts = getAllPosts();

  return (
    <main>
      <Container>
        <Intro />
        <hr className="my-8 border-t-2 border-gray-200" />
        <section className="mt-8">
          <h1 className="text-3xl font-bold mb-8">Recent Posts</h1>
          <div className="space-y-10">
            {allPosts.map((post) => (
              <article key={post.slug} className="border-b pb-6">
                <h2 className="text-2xl font-semibold">
                  <Link href={`/posts/${post.slug}`} className="text-blue-600 hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-sm text-gray-500 mb-2">{post.date}</p>
                <p className="text-base text-gray-700">{post.excerpt}</p>
              </article>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
