// scripts/new-post.ts (CommonJS version)

const fs = require("fs");
const path = require("path");
const slugify = require("slugify");

const title = process.argv[2];
if (!title) {
  console.error("Please provide a title: npm run new-post 'My Title'");
  process.exit(1);
}

const date = new Date().toISOString();
const slug = slugify(title, { lower: true, strict: true });
const filePath = path.join(process.cwd(), "_posts", `${slug}.md`);

const template = `---
title: "${title}"
excerpt: "A short summary of the post."
date: "${date}"
author:
  name: Doug Beck
  picture: "/assets/blog/authors/doug.jpg"
coverImage: "/assets/blog/${slug}/cover.jpg"
pinned: false
---

## ${title}

Write your content here.
`;

fs.writeFileSync(filePath, template);
console.log(`✅ New post created at _posts/${slug}.md`);
