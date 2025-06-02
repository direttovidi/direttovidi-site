import Container from "@/app/_components/container";
import { getAllPosts } from "@/lib/api";
import Link from "next/link";

export default function HomePage() {
  const { pinned, others } = getAllPosts();

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-gray-50 py-12 text-center">
        <h2 className="text-4xl font-bold mb-4">Personal finance for the modern age.</h2>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Helping you make confident, clear decisions about your money—one question at a time.
        </p>
      </section>

      <Container>
        {/* Intro Component */}
        {/* <Intro /> */}

        {/* Pinned Post */}
        {pinned && (
          <section className="mt-12">
            <h3 className="text-2xl font-bold mb-4">Featured Post</h3>
            <article className="border-b pb-6">
              <h2 className="text-2xl font-semibold">
                <Link href={`/posts/${pinned.slug}`} className="text-blue-600 hover:underline">
                  {pinned.title}
                </Link>
              </h2>
              <p className="text-sm text-gray-500 mb-2">{pinned.date}</p>
              <p className="text-base text-gray-700">{pinned.excerpt}</p>
            </article>
          </section>
        )}

        {/* Recent Posts */}
        <section className="mt-12">
          <h3 className="text-2xl font-bold mb-4">Recent Posts</h3>
          <div className="space-y-10">
            {others.map((post) => (
              <article key={post.slug} className="border-b pb-6">
                <h2 className="text-xl font-semibold">
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

      {/* Footer */}
      <footer className="mt-16 py-8 text-center text-sm text-gray-500 border-t">
        © {new Date().getFullYear()} YourSiteName. All rights reserved.
      </footer>
    </main>
  );
}
