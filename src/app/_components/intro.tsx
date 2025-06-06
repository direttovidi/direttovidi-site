import { AUTHOR_NAME } from "@/lib/constants";

export function Intro() {
  return (
    <section className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12">
      <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight md:pr-8">
        Create Your Vision <br/> Set The Path
      </h1>
      <h4 className="text-center md:text-left text-lg mt-5 md:pl-8">
        "Go as far as you can see; when you get there, you'll be able to see further" <br/>
        &emsp;{AUTHOR_NAME}.
      </h4>
    </section>
  );
}
