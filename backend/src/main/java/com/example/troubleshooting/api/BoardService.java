package com.example.troubleshooting.api;

import com.example.troubleshooting.api.BoardDtos.AiAnalysisDto;
import com.example.troubleshooting.api.BoardDtos.CauseDto;
import com.example.troubleshooting.api.BoardDtos.CommentDto;
import com.example.troubleshooting.api.BoardDtos.CreatePostRequest;
import com.example.troubleshooting.api.BoardDtos.CreateSolutionRequest;
import com.example.troubleshooting.api.BoardDtos.PostDto;
import com.example.troubleshooting.api.BoardDtos.SimilarCaseDto;
import com.example.troubleshooting.api.BoardDtos.SolutionDto;
import com.example.troubleshooting.api.BoardDtos.TagDto;
import com.example.troubleshooting.api.BoardDtos.UsageDto;
import com.example.troubleshooting.api.BoardDtos.UserDto;
import com.example.troubleshooting.domain.AiAnalysisStatus;
import com.example.troubleshooting.domain.PostStatus;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class BoardService {
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final UserDto currentUser = new UserDto("user-1", "mnshell", "USER");
    private final List<TagDto> tags = List.of(
            new TagDto("Spring", "Backend"),
            new TagDto("React", "Frontend"),
            new TagDto("PostgreSQL", "Database"),
            new TagDto("Docker", "Infra"),
            new TagDto("AWS", "Cloud"),
            new TagDto("Git", "Tooling"),
            new TagDto("Security", "Backend"),
            new TagDto("JWT", "Backend"),
            new TagDto("Hook", "Frontend"),
            new TagDto("Network", "Infra"),
            new TagDto("JPA", "Backend"),
            new TagDto("Hibernate", "Backend"),
            new TagDto("Query", "Database"),
            new TagDto("S3", "Cloud"),
            new TagDto("IAM", "Cloud"));

    private final Map<String, PostDto> posts = new LinkedHashMap<>();
    private final AtomicLong postIds = new AtomicLong(200);
    private final AtomicLong commentIds = new AtomicLong(100);
    private final AtomicLong solutionIds = new AtomicLong(100);
    private final AtomicLong analysisIds = new AtomicLong(100);

    public BoardService() {
        seedPosts();
    }

    public UserDto currentUser() {
        return currentUser;
    }

    public List<TagDto> tags() {
        return tags;
    }

    public List<PostDto> listPosts(String keyword, String tag, PostStatus status, Boolean solved, String sort) {
        String query = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        return posts.values().stream()
                .filter(post -> post.status != PostStatus.DELETED)
                .filter(post -> !StringUtils.hasText(query) || searchableText(post).contains(query))
                .filter(post -> tag == null || tag.equals("ALL") || post.tags.contains(tag))
                .filter(post -> status == null || post.status == status)
                .filter(post -> solved == null || (solved && post.status == PostStatus.SOLVED) || (!solved && post.status != PostStatus.SOLVED))
                .sorted(comparator(sort))
                .toList();
    }

    public PostDto getPost(String postId) {
        PostDto post = posts.get(postId);
        if (post == null || post.status == PostStatus.DELETED) {
            throw new IllegalArgumentException("post not found: " + postId);
        }
        post.viewCount += 1;
        return post;
    }

    public PostDto createPost(CreatePostRequest request) {
        requireText(request.title(), "title");
        requireText(request.problemDescription(), "problemDescription");
        if (request.tags() == null || request.tags().isEmpty()) {
            throw new IllegalArgumentException("tags is required");
        }
        if (request.environment() == null || request.environment().isEmpty()) {
            throw new IllegalArgumentException("environment is required");
        }

        String now = now();
        PostDto post = new PostDto();
        post.id = "post-" + postIds.incrementAndGet();
        post.title = request.title().trim();
        post.summary = summarize(request.problemDescription());
        post.status = request.runAiAnalysis() ? PostStatus.ANALYZING : PostStatus.OPEN;
        post.authorId = currentUser.id();
        post.author = currentUser.nickname();
        post.createdAt = now;
        post.updatedAt = now;
        post.viewCount = 1;
        post.tags = new ArrayList<>(request.tags());
        post.environment = new ArrayList<>(request.environment());
        post.problemDescription = request.problemDescription().trim();
        post.errorLog = safeText(request.errorLog());
        post.reproductionSteps = safeList(request.reproductionSteps());
        post.triedMethods = safeList(request.triedMethods());
        post.blockedPoint = safeText(request.blockedPoint());
        post.comments = new ArrayList<>();
        post.commentCount = 0;
        post.aiAnalysis = request.runAiAnalysis() ? runningAnalysis() : notRequestedAnalysis();
        post.ragStatus = request.runAiAnalysis() ? "SEARCHING" : "NOT_INDEXED";
        posts.put(post.id, post);
        return post;
    }

    public PostDto addComment(String postId, String body) {
        requireText(body, "body");
        PostDto post = getPost(postId);
        post.comments.add(new CommentDto(
                "comment-" + commentIds.incrementAndGet(),
                currentUser.id(),
                currentUser.nickname(),
                currentUser.role(),
                body.trim(),
                now()));
        post.commentCount = post.comments.size();
        post.updatedAt = now();
        return post;
    }

    public PostDto deleteComment(String commentId) {
        for (PostDto post : posts.values()) {
            int before = post.comments.size();
            post.comments.removeIf(comment -> comment.id.equals(commentId) && comment.authorId.equals(currentUser.id()));
            if (post.comments.size() != before) {
                post.commentCount = post.comments.size();
                post.updatedAt = now();
                return post;
            }
        }
        throw new IllegalArgumentException("comment not found or not owned by current user: " + commentId);
    }

    public PostDto createSolution(String postId, CreateSolutionRequest request) {
        requireText(request.rootCause(), "rootCause");
        requireText(request.detail(), "detail");
        requireText(request.verification(), "verification");
        PostDto post = getPost(postId);

        SolutionDto solution = new SolutionDto();
        solution.id = "solution-" + solutionIds.incrementAndGet();
        solution.status = "SUBMITTED";
        solution.rootCause = request.rootCause().trim();
        solution.detail = request.detail().trim();
        solution.verification = request.verification().trim();
        solution.references = safeList(request.references());
        solution.lessonLearned = safeText(request.lessonLearned());
        solution.ragIncluded = request.ragIncluded();

        post.solution = solution;
        post.status = PostStatus.SOLVED;
        post.ragStatus = solution.ragIncluded ? "INDEXED" : "NOT_INDEXED";
        post.updatedAt = now();
        return post;
    }

    public PostDto requestAiAnalysis(String postId) {
        PostDto post = getPost(postId);
        post.status = PostStatus.ANALYZING;
        post.aiAnalysis = runningAnalysis();
        post.ragStatus = "SEARCHING";

        AiAnalysisDto analysis = new AiAnalysisDto();
        analysis.id = "analysis-" + analysisIds.incrementAndGet();
        analysis.status = AiAnalysisStatus.SUCCEEDED;
        analysis.summary = "입력된 환경, 로그, 재현 절차를 기준으로 원인 후보와 다음 검증 순서를 생성했습니다.";
        analysis.qualityScore = StringUtils.hasText(post.errorLog) ? 78 : 62;
        analysis.possibleCauses = List.of(
                new CauseDto(1, "요청 흐름과 런타임 환경의 설정 불일치",
                        "로그와 재현 절차가 환경 설정 문제를 가리키므로 설정값과 실제 요청값을 먼저 대조해야 합니다.", 0.79),
                new CauseDto(2, "필수 컨텍스트 누락",
                        "일부 코드 또는 설정 원문이 없어 단정하기보다 추가 정보를 확인해야 합니다.", 0.61));
        analysis.checklist = List.of(
                "문제가 발생한 요청과 정상 요청의 헤더, 환경변수, 설정값을 비교합니다.",
                "에러 로그의 최초 원인 줄과 마지막 application stack frame을 분리해 확인합니다.",
                "최근 변경된 설정 또는 의존성 버전을 되돌려 재현 여부를 확인합니다.");
        analysis.missingContext = StringUtils.hasText(post.errorLog)
                ? List.of("관련 설정 파일", "최근 변경사항")
                : List.of("핵심 에러 로그", "관련 설정 파일");
        analysis.similarCases = posts.values().stream()
                .filter(candidate -> !candidate.id.equals(post.id))
                .filter(candidate -> candidate.status == PostStatus.SOLVED)
                .limit(2)
                .map(candidate -> new SimilarCaseDto(candidate.id, candidate.title, 0.82, true, candidate.summary))
                .toList();
        analysis.usage = new UsageDto("gpt-5-mini", 1800, 640);

        post.aiAnalysis = analysis;
        post.status = post.solution == null ? PostStatus.OPEN : PostStatus.SOLVED;
        post.ragStatus = post.solution == null ? "FOUND" : "INDEXED";
        post.updatedAt = now();
        return post;
    }

    public List<AiAnalysisDto> analysisHistory(String postId) {
        return List.of(getPost(postId).aiAnalysis);
    }

    private Comparator<PostDto> comparator(String sort) {
        if ("views".equals(sort)) {
            return Comparator.comparingInt((PostDto post) -> post.viewCount).reversed();
        }
        if ("comments".equals(sort)) {
            return Comparator.comparingInt((PostDto post) -> post.commentCount).reversed();
        }
        return Comparator.comparing((PostDto post) -> post.createdAt).reversed();
    }

    private String searchableText(PostDto post) {
        return String.join(" ",
                safeText(post.title),
                safeText(post.summary),
                safeText(post.problemDescription),
                safeText(post.errorLog),
                post.solution == null ? "" : safeText(post.solution.detail)).toLowerCase(Locale.ROOT);
    }

    private AiAnalysisDto notRequestedAnalysis() {
        AiAnalysisDto analysis = new AiAnalysisDto();
        analysis.id = "analysis-" + analysisIds.incrementAndGet();
        analysis.status = AiAnalysisStatus.NOT_REQUESTED;
        analysis.summary = "";
        analysis.usage = new UsageDto("gpt-5-mini", 0, 0);
        return analysis;
    }

    private AiAnalysisDto runningAnalysis() {
        AiAnalysisDto analysis = notRequestedAnalysis();
        analysis.status = AiAnalysisStatus.RUNNING;
        return analysis;
    }

    private void seedPosts() {
        PostDto spring = basePost("post-101", "Spring Security 로그인 후 403 Forbidden 발생",
                "로그인은 성공하지만 JWT를 붙인 /api/user 요청에서 403이 발생하는 인증 문제입니다.",
                PostStatus.OPEN, "mnshell", "user-1", "2026-06-09 09:12",
                List.of("Spring", "Security", "JWT"),
                List.of(List.of("Backend", "Spring Boot 3.3, Java 21"), List.of("Frontend", "React 18"),
                        List.of("Database", "PostgreSQL 16"), List.of("Auth", "JWT access token")),
                "로그인 API는 200과 access token을 반환하지만 Authorization 헤더를 붙인 사용자 정보 API에서 403이 발생합니다.",
                "HTTP/1.1 403 Forbidden\norg.springframework.security.access.AccessDeniedException: Access Denied",
                List.of("POST /api/auth/login 호출", "응답 access token 저장", "GET /api/user 요청", "403 응답 확인"),
                List.of("CORS 설정 확인", "Authorization 헤더 확인", "SecurityFilterChain 순서 확인"),
                "SecurityContext에 인증 객체가 들어가는지 확인하지 못했습니다.");
        spring.comments.add(new CommentDto("comment-1", "mentor-1", "spring-mentor", "MENTOR",
                "필터 로그에서 토큰 검증 이후 Authentication 저장 여부를 먼저 확인해보세요.", "2026-06-09 09:40"));
        spring.comments.add(new CommentDto("comment-2", "user-1", "mnshell", "USER",
                "SecurityContextHolder 출력 로그를 추가해 보겠습니다.", "2026-06-09 09:55"));
        spring.commentCount = spring.comments.size();
        spring.aiAnalysis = springSecurityAnalysis();
        spring.ragStatus = "FOUND";
        posts.put(spring.id, spring);

        PostDto react = basePost("post-102", "React useEffect 무한 실행 문제",
                "객체 의존성을 그대로 넣어 렌더링마다 effect가 재실행된 문제입니다.",
                PostStatus.SOLVED, "frontend-dev", "user-2", "2026-06-08 16:30",
                List.of("React", "Hook"),
                List.of(List.of("Frontend", "React 18, Vite"), List.of("Browser", "Chrome 125")),
                "검색 조건이 바뀔 때 API를 다시 호출하려고 useEffect를 사용했지만 화면이 렌더링될 때마다 요청이 반복되었습니다.",
                "Warning: Maximum update depth exceeded.",
                List.of("검색어 입력", "필터 객체 생성", "useEffect dependency에 filters 전달"),
                List.of("dependency 배열 비우기", "eslint 경고 무시"),
                "dependency 배열에 무엇을 넣어야 하는지 판단이 어려웠습니다.");
        react.solution = solution("solution-102", "렌더링마다 새로 생성되는 filters 객체를 useEffect dependency로 사용했습니다.",
                "filters 객체를 useMemo로 안정화하고 실제 요청에 필요한 primitive 값만 dependency에 넣도록 수정했습니다.",
                "Network 탭에서 검색어 변경 1회당 요청 1회만 발생하는지 확인했습니다.",
                "effect dependency는 값의 동일성 기준으로 비교됩니다.");
        react.aiAnalysis = solvedAnalysis("analysis-102", "객체 참조가 매 렌더링마다 바뀌면서 useEffect가 반복 실행된 문제입니다.");
        react.ragStatus = "INDEXED";
        posts.put(react.id, react);

        PostDto docker = basePost("post-103", "Docker 컨테이너 간 통신이 안 됨",
                "컨테이너 내부에서 localhost를 사용해 다른 서비스에 접근하지 못하는 네트워크 문제입니다.",
                PostStatus.OPEN, "infra-learner", "user-3", "2026-06-07 11:20",
                List.of("Docker", "Network"),
                List.of(List.of("Runtime", "Docker Compose v2"), List.of("Backend", "Spring Boot"),
                        List.of("Database", "PostgreSQL container")),
                "백엔드 컨테이너에서 PostgreSQL에 연결하려고 하면 connection refused가 발생합니다.",
                "org.postgresql.util.PSQLException: Connection to localhost:5432 refused.",
                List.of("docker compose up 실행", "backend 컨테이너 시작", "DB connection refused 로그 확인"),
                List.of("DB 포트 확인", "PostgreSQL 컨테이너 재시작"),
                "컨테이너 내부에서 localhost가 무엇을 가리키는지 헷갈립니다.");
        docker.aiAnalysis = runningAnalysis();
        docker.ragStatus = "SEARCHING";
        posts.put(docker.id, docker);

        PostDto jpa = basePost("post-104", "JPA N+1 문제 해결 방법",
                "게시글 목록 조회에서 연관 엔티티를 반복 조회하던 문제를 fetch join과 DTO projection으로 해결했습니다.",
                PostStatus.SOLVED, "backend-dev", "user-4", "2026-06-06 14:10",
                List.of("JPA", "Hibernate", "Query"),
                List.of(List.of("Backend", "Spring Boot 3.2"), List.of("ORM", "Hibernate 6"),
                        List.of("Database", "PostgreSQL 15")),
                "게시글 목록에서 작성자와 태그를 표시할 때 데이터가 늘수록 쿼리 수가 급격히 증가했습니다.",
                "select p1_0.id,p1_0.title from posts p1_0\nselect u1_0.id,u1_0.nickname from users u1_0 where u1_0.id=?",
                List.of("게시글 50개 생성", "목록 API 호출", "SQL 로그에서 추가 select 반복 확인"),
                List.of("LAZY/EAGER 설정 변경", "batch size 적용"),
                "목록 화면에 필요한 데이터만 가져오는 방식이 필요했습니다.");
        jpa.solution = solution("solution-104", "목록 응답 생성 중 lazy loading이 반복되었습니다.",
                "목록 API는 DTO projection, 상세 API는 fetch join을 사용하도록 분리했습니다.",
                "SQL 로그에서 목록 조회 쿼리 수가 101개에서 3개로 줄어든 것을 확인했습니다.",
                "목록과 상세 조회는 필요한 데이터 모양이 다릅니다.");
        jpa.aiAnalysis = solvedAnalysis("analysis-104", "연관 엔티티 lazy loading으로 인한 N+1 문제입니다.");
        jpa.ragStatus = "INDEXED";
        posts.put(jpa.id, jpa);

        PostDto s3 = basePost("post-105", "S3 파일 업로드 시 권한 오류",
                "IAM 정책과 버킷 정책 중 어떤 권한이 막는지 추가 정보가 필요한 업로드 실패 사례입니다.",
                PostStatus.NEEDS_MORE_CONTEXT, "cloud-newbie", "user-5", "2026-06-05 19:45",
                List.of("AWS", "S3", "IAM"),
                List.of(List.of("Cloud", "AWS S3"), List.of("Backend", "Spring Boot"),
                        List.of("Auth", "IAM user access key")),
                "이미지 업로드 API에서 S3 putObject 호출 시 AccessDenied가 발생합니다.",
                "S3Exception: Access Denied (Service: S3, Status Code: 403)",
                List.of("업로드 API 호출", "MultipartFile 수신", "S3 putObject 실행"),
                List.of("버킷 이름 확인", "리전 확인", "액세스 키 재발급"),
                "IAM policy와 bucket policy 중 어디를 봐야 할지 모르겠습니다.");
        s3.aiAnalysis = s3Analysis();
        s3.ragStatus = "NO_RESULT";
        posts.put(s3.id, s3);
    }

    private PostDto basePost(String id, String title, String summary, PostStatus status, String author, String authorId,
            String createdAt, List<String> tags, List<List<String>> environment, String problemDescription,
            String errorLog, List<String> reproductionSteps, List<String> triedMethods, String blockedPoint) {
        PostDto post = new PostDto();
        post.id = id;
        post.title = title;
        post.summary = summary;
        post.status = status;
        post.author = author;
        post.authorId = authorId;
        post.createdAt = createdAt;
        post.updatedAt = createdAt;
        post.commentCount = 0;
        post.viewCount = 100;
        post.tags = new ArrayList<>(tags);
        post.environment = new ArrayList<>(environment);
        post.problemDescription = problemDescription;
        post.errorLog = errorLog;
        post.reproductionSteps = new ArrayList<>(reproductionSteps);
        post.triedMethods = new ArrayList<>(triedMethods);
        post.blockedPoint = blockedPoint;
        post.comments = new ArrayList<>();
        return post;
    }

    private SolutionDto solution(String id, String rootCause, String detail, String verification, String lessonLearned) {
        SolutionDto solution = new SolutionDto();
        solution.id = id;
        solution.status = "VERIFIED";
        solution.rootCause = rootCause;
        solution.detail = detail;
        solution.verification = verification;
        solution.references = List.of("https://example.com/reference");
        solution.lessonLearned = lessonLearned;
        solution.ragIncluded = true;
        return solution;
    }

    private AiAnalysisDto springSecurityAnalysis() {
        AiAnalysisDto analysis = solvedAnalysis("analysis-101", "로그인은 성공하지만 보호된 API에서 인증 컨텍스트가 인정되지 않는 상황입니다.");
        analysis.qualityScore = 82;
        analysis.possibleCauses = List.of(
                new CauseDto(1, "JWT 필터에서 Authentication 객체가 저장되지 않음",
                        "토큰 검증은 성공해도 SecurityContextHolder에 인증 객체를 저장하지 않으면 보호 API에서 익명 사용자로 판단될 수 있습니다.", 0.86),
                new CauseDto(2, "hasRole과 hasAuthority 매핑 불일치",
                        "DB 권한값과 Spring Security 권한 prefix가 다르면 접근 거부가 발생할 수 있습니다.", 0.71),
                new CauseDto(3, "SecurityFilterChain matcher 순서 문제",
                        "requestMatchers 선언 순서가 의도와 다르면 요청이 잘못된 rule에 걸릴 수 있습니다.", 0.64));
        analysis.missingContext = List.of("SecurityConfig 코드", "JWT 필터 코드", "Authorization 헤더 원문에서 토큰 일부를 마스킹한 형태");
        analysis.similarCases = List.of(new SimilarCaseDto("post-104", "JPA N+1 문제 해결 방법", 0.78, true,
                "해결된 글은 원인과 검증 절차가 분리되어 있어 체크리스트 생성 근거로 사용되었습니다."));
        analysis.usage = new UsageDto("gpt-5-mini", 3200, 900);
        return analysis;
    }

    private AiAnalysisDto solvedAnalysis(String id, String summary) {
        AiAnalysisDto analysis = new AiAnalysisDto();
        analysis.id = id;
        analysis.status = AiAnalysisStatus.SUCCEEDED;
        analysis.summary = summary;
        analysis.qualityScore = 88;
        analysis.possibleCauses = List.of(new CauseDto(1, "가장 가능성이 높은 원인", "입력된 로그와 재현 절차가 일치합니다.", 0.9));
        analysis.checklist = List.of("로그에서 최초 원인을 확인합니다.", "수정 전후 재현 결과를 비교합니다.", "회귀 테스트를 추가합니다.");
        analysis.missingContext = List.of();
        analysis.similarCases = List.of();
        analysis.usage = new UsageDto("gpt-5-mini", 1800, 520);
        return analysis;
    }

    private AiAnalysisDto s3Analysis() {
        AiAnalysisDto analysis = solvedAnalysis("analysis-105",
                "S3 putObject 권한이 거부된 상황입니다. 현재 정보만으로는 IAM identity policy, bucket policy, object ownership 중 어느 계층이 원인인지 확정하기 어렵습니다.");
        analysis.qualityScore = 63;
        analysis.possibleCauses = List.of(
                new CauseDto(1, "IAM 사용자에게 s3:PutObject 권한 부족",
                        "Console 업로드 권한과 애플리케이션 access key의 권한 주체가 다를 수 있습니다.", 0.70),
                new CauseDto(2, "Bucket policy의 조건 불일치",
                        "prefix, source IP, encryption 조건이 애플리케이션 요청과 맞지 않을 수 있습니다.", 0.59));
        analysis.missingContext = List.of("IAM policy JSON", "bucket policy JSON", "업로드 대상 key prefix", "SSE 암호화 사용 여부");
        analysis.usage = new UsageDto("gpt-5-mini", 2100, 760);
        return analysis;
    }

    private void requireText(String value, String field) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(field + " is required");
        }
    }

    private List<String> safeList(List<String> values) {
        return values == null ? new ArrayList<>() : new ArrayList<>(values);
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private String summarize(String value) {
        String text = safeText(value);
        return text.length() <= 110 ? text : text.substring(0, 110);
    }

    private String now() {
        return LocalDateTime.now().format(DISPLAY_DATE);
    }
}
