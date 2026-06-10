import { posts, statusLabels, tags } from "../src/data.js";

const requiredStatuses = [
  "OPEN",
  "ANALYZING",
  "NEEDS_MORE_CONTEXT",
  "SOLVED",
  "ARCHIVED"
];

const requiredSampleTitles = [
  "Spring Security 로그인 후 403 Forbidden 발생",
  "React useEffect 무한 실행 문제",
  "Docker 컨테이너 간 통신이 안 됨",
  "JPA N+1 문제 해결 방법",
  "S3 파일 업로드 시 권한 오류"
];

const failures = [];

for (const status of requiredStatuses) {
  if (!statusLabels[status]) {
    failures.push(`missing status label: ${status}`);
  }
}

for (const title of requiredSampleTitles) {
  if (!posts.some((post) => post.title === title)) {
    failures.push(`missing sample post: ${title}`);
  }
}

if (posts.length < 5) {
  failures.push("at least five sample posts are required");
}

if (!posts.some((post) => post.status === "SOLVED" && post.solution)) {
  failures.push("at least one solved post with solution is required");
}

if (!posts.every((post) => post.title && post.tags.length && post.environment.length && post.problemDescription)) {
  failures.push("every post must include title, tags, environment, and problem description");
}

if (!posts.every((post) => post.aiAnalysis && post.aiAnalysis.status)) {
  failures.push("every post must include AI analysis state");
}

const tagNames = new Set(tags.map((tag) => tag.name));
for (const post of posts) {
  for (const tag of post.tags) {
    if (!tagNames.has(tag)) {
      failures.push(`post ${post.id} references unknown tag: ${tag}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Validated ${posts.length} posts, ${tags.length} tags, and ${requiredStatuses.length} core statuses.`);
