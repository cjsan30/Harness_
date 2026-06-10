export const statusLabels = {
  OPEN: { label: "미해결", tone: "open" },
  ANALYZING: { label: "분석 중", tone: "analyzing" },
  NEEDS_MORE_CONTEXT: { label: "정보 필요", tone: "needs" },
  SOLVED: { label: "해결됨", tone: "solved" },
  ARCHIVED: { label: "보관됨", tone: "archived" },
  DELETED: { label: "삭제됨", tone: "deleted" }
};

export const aiStatusLabels = {
  NOT_REQUESTED: "요청 전",
  PENDING: "대기 중",
  RUNNING: "실행 중",
  SUCCEEDED: "완료",
  FAILED: "실패",
  RETRY_REQUIRED: "재시도 필요",
  CANCELLED: "취소됨"
};

export const tags = [
  { name: "Spring", category: "Backend" },
  { name: "React", category: "Frontend" },
  { name: "PostgreSQL", category: "Database" },
  { name: "Docker", category: "Infra" },
  { name: "AWS", category: "Cloud" },
  { name: "Git", category: "Tooling" },
  { name: "Security", category: "Backend" },
  { name: "JWT", category: "Backend" },
  { name: "Hook", category: "Frontend" },
  { name: "Network", category: "Infra" },
  { name: "JPA", category: "Backend" },
  { name: "Hibernate", category: "Backend" },
  { name: "Query", category: "Database" },
  { name: "S3", category: "Cloud" },
  { name: "IAM", category: "Cloud" }
];

export const currentUser = {
  id: "user-1",
  nickname: "mnshell",
  role: "USER"
};

export const posts = [
  {
    id: "post-101",
    title: "Spring Security 로그인 후 403 Forbidden 발생",
    summary: "로그인은 성공하지만 JWT를 붙인 /api/user 요청에서 403이 발생하는 인증 문제입니다.",
    status: "OPEN",
    authorId: "user-1",
    author: "mnshell",
    createdAt: "2026-06-09 09:12",
    updatedAt: "2026-06-09 10:05",
    commentCount: 3,
    viewCount: 128,
    tags: ["Spring", "Security", "JWT"],
    environment: [
      ["Backend", "Spring Boot 3.3, Java 21"],
      ["Frontend", "React 18"],
      ["Database", "PostgreSQL 16"],
      ["Auth", "JWT access token"]
    ],
    problemDescription:
      "로그인 API는 200과 access token을 반환하지만 Authorization 헤더를 붙인 사용자 정보 API에서 403이 발생합니다. 기대 결과는 인증된 사용자 정보가 반환되는 것입니다.",
    errorLog:
      "HTTP/1.1 403 Forbidden\norg.springframework.security.access.AccessDeniedException: Access Denied\nat org.springframework.security.web.access.intercept.AuthorizationFilter.doFilter(...)",
    reproductionSteps: [
      "POST /api/auth/login 호출",
      "응답 access token을 localStorage에 저장",
      "GET /api/user 요청에 Authorization: Bearer 토큰 추가",
      "403 Forbidden 응답 확인"
    ],
    triedMethods: [
      "CORS allowed origins 확인",
      "Authorization 헤더 이름 오타 확인",
      "SecurityFilterChain의 requestMatchers 순서 확인"
    ],
    blockedPoint: "JWT 필터가 실행된 뒤 SecurityContext에 인증 객체가 들어가는지 확인하지 못했습니다.",
    comments: [
      {
        id: "comment-1",
        authorId: "mentor-1",
        author: "spring-mentor",
        role: "MENTOR",
        body: "필터 로그에서 토큰 검증 이후 Authentication 저장 여부를 먼저 확인해보세요.",
        createdAt: "2026-06-09 09:40"
      },
      {
        id: "comment-2",
        authorId: "user-1",
        author: "mnshell",
        role: "USER",
        body: "SecurityContextHolder 출력 로그를 추가해 보겠습니다.",
        createdAt: "2026-06-09 09:55"
      }
    ],
    aiAnalysis: {
      id: "analysis-101",
      status: "SUCCEEDED",
      summary:
        "로그인은 성공하지만 보호된 API에서 인증 컨텍스트가 인정되지 않는 상황입니다. JWT 필터, SecurityContext 저장, 권한 매핑 순서를 우선 확인해야 합니다.",
      qualityScore: 82,
      possibleCauses: [
        {
          rank: 1,
          title: "JWT 필터에서 Authentication 객체가 저장되지 않음",
          reason: "토큰 검증은 성공해도 SecurityContextHolder에 인증 객체를 저장하지 않으면 보호 API에서 익명 사용자로 판단될 수 있습니다.",
          confidence: 0.86
        },
        {
          rank: 2,
          title: "hasRole과 hasAuthority 매핑 불일치",
          reason: "DB 권한값과 Spring Security 권한 prefix가 다르면 인증 후에도 접근 거부가 발생할 수 있습니다.",
          confidence: 0.71
        },
        {
          rank: 3,
          title: "SecurityFilterChain matcher 순서 문제",
          reason: "permitAll matcher와 authenticated matcher 순서가 의도와 다르면 요청이 잘못된 rule에 걸릴 수 있습니다.",
          confidence: 0.64
        }
      ],
      checklist: [
        "JWT 필터가 보호 API 요청마다 실행되는지 로그로 확인합니다.",
        "토큰 검증 후 SecurityContextHolder에 Authentication이 저장되는지 확인합니다.",
        "사용자 권한값과 hasRole/hasAuthority 설정이 일치하는지 확인합니다.",
        "SecurityFilterChain의 requestMatchers 선언 순서를 점검합니다."
      ],
      missingContext: ["SecurityConfig 코드", "JWT 필터 코드", "Authorization 헤더 원문에서 토큰 일부를 마스킹한 형태"],
      similarCases: [
        {
          postId: "post-104",
          title: "JPA N+1 문제 해결 방법",
          similarity: 0.78,
          solved: true,
          excerpt: "해결된 글은 원인과 검증 절차가 분리되어 있어 체크리스트 생성 근거로 사용되었습니다."
        }
      ],
      usage: {
        model: "gpt-5-mini",
        inputTokens: 3200,
        outputTokens: 900
      }
    },
    ragStatus: "FOUND"
  },
  {
    id: "post-102",
    title: "React useEffect 무한 실행 문제",
    summary: "객체 의존성을 그대로 넣어 렌더링마다 effect가 재실행된 문제입니다.",
    status: "SOLVED",
    authorId: "user-2",
    author: "frontend-dev",
    createdAt: "2026-06-08 16:30",
    updatedAt: "2026-06-08 18:02",
    commentCount: 5,
    viewCount: 244,
    tags: ["React", "Hook"],
    environment: [
      ["Frontend", "React 18, Vite"],
      ["Browser", "Chrome 125"],
      ["State", "Local component state"]
    ],
    problemDescription:
      "검색 조건이 바뀔 때 API를 다시 호출하려고 useEffect를 사용했지만 화면이 렌더링될 때마다 네트워크 요청이 반복되었습니다.",
    errorLog:
      "GET /api/posts?keyword=spring 200\nGET /api/posts?keyword=spring 200\nGET /api/posts?keyword=spring 200\nWarning: Maximum update depth exceeded.",
    reproductionSteps: ["검색어 입력", "필터 객체 생성", "useEffect dependency에 filters 전달", "setState 후 effect 반복 실행"],
    triedMethods: ["dependency 배열 비우기", "eslint 경고 무시", "API 호출 debounce 적용"],
    blockedPoint: "dependency 배열에 무엇을 넣어야 하는지 판단이 어려웠습니다.",
    comments: [],
    solution: {
      id: "solution-102",
      status: "VERIFIED",
      rootCause: "렌더링마다 새로 생성되는 filters 객체를 useEffect dependency로 사용했습니다.",
      detail:
        "filters 객체를 useMemo로 안정화하고, 실제 요청에 필요한 primitive 값만 dependency에 넣도록 수정했습니다.",
      verification: "React DevTools Profiler와 Network 탭에서 검색어 변경 1회당 요청 1회만 발생하는지 확인했습니다.",
      references: ["https://react.dev/reference/react/useEffect", "https://react.dev/reference/react/useMemo"],
      lessonLearned: "effect dependency는 값의 동일성 기준으로 비교되므로 객체/배열을 그대로 넣을 때는 안정화가 필요합니다.",
      ragIncluded: true
    },
    aiAnalysis: {
      id: "analysis-102",
      status: "SUCCEEDED",
      summary: "객체 참조가 매 렌더링마다 바뀌면서 useEffect가 반복 실행된 문제입니다.",
      qualityScore: 91,
      possibleCauses: [
        {
          rank: 1,
          title: "불안정한 객체 의존성",
          reason: "dependency 배열에 매번 새 객체가 들어가 effect가 재실행됩니다.",
          confidence: 0.94
        }
      ],
      checklist: [
        "dependency 배열에 객체/배열/함수가 직접 들어가는지 확인합니다.",
        "필요한 primitive 값만 dependency로 분해합니다.",
        "useMemo 또는 useCallback이 실제로 동일성을 안정화하는지 확인합니다."
      ],
      missingContext: [],
      similarCases: [],
      usage: {
        model: "gpt-5-mini",
        inputTokens: 1850,
        outputTokens: 520
      }
    },
    ragStatus: "INDEXED"
  },
  {
    id: "post-103",
    title: "Docker 컨테이너 간 통신이 안 됨",
    summary: "컨테이너 내부에서 localhost를 사용해 다른 서비스에 접근하지 못하는 네트워크 문제입니다.",
    status: "OPEN",
    authorId: "user-3",
    author: "infra-learner",
    createdAt: "2026-06-07 11:20",
    updatedAt: "2026-06-07 11:20",
    commentCount: 1,
    viewCount: 96,
    tags: ["Docker", "Network"],
    environment: [
      ["Runtime", "Docker Compose v2"],
      ["Backend", "Spring Boot"],
      ["Database", "PostgreSQL container"]
    ],
    problemDescription:
      "백엔드 컨테이너에서 PostgreSQL에 연결하려고 하면 connection refused가 발생합니다. 로컬에서는 DB 접속이 됩니다.",
    errorLog:
      "org.postgresql.util.PSQLException: Connection to localhost:5432 refused. Check that the hostname and port are correct.",
    reproductionSteps: ["docker compose up 실행", "backend 컨테이너 시작", "DB connection refused 로그 확인"],
    triedMethods: ["DB 포트 5432 노출 확인", "PostgreSQL 컨테이너 재시작", "로컬 psql 접속 확인"],
    blockedPoint: "컨테이너 내부에서 localhost가 무엇을 가리키는지 헷갈립니다.",
    comments: [],
    aiAnalysis: {
      id: "analysis-103",
      status: "RUNNING",
      summary: "",
      qualityScore: null,
      possibleCauses: [],
      checklist: [],
      missingContext: [],
      similarCases: [],
      usage: {
        model: "gpt-5-mini",
        inputTokens: 0,
        outputTokens: 0
      }
    },
    ragStatus: "SEARCHING"
  },
  {
    id: "post-104",
    title: "JPA N+1 문제 해결 방법",
    summary: "게시글 목록 조회에서 연관 엔티티를 반복 조회하던 문제를 fetch join과 DTO projection으로 해결했습니다.",
    status: "SOLVED",
    authorId: "user-4",
    author: "backend-dev",
    createdAt: "2026-06-06 14:10",
    updatedAt: "2026-06-06 17:40",
    commentCount: 8,
    viewCount: 512,
    tags: ["JPA", "Hibernate", "Query"],
    environment: [
      ["Backend", "Spring Boot 3.2"],
      ["ORM", "Hibernate 6"],
      ["Database", "PostgreSQL 15"]
    ],
    problemDescription:
      "게시글 목록에서 작성자와 태그를 표시할 때 데이터가 늘수록 쿼리 수가 급격히 증가했습니다.",
    errorLog:
      "select p1_0.id,p1_0.title from posts p1_0\nselect u1_0.id,u1_0.nickname from users u1_0 where u1_0.id=?\nselect t1_0.post_id,t1_1.name from post_tags t1_0 join tags t1_1 on ...",
    reproductionSteps: ["게시글 50개 생성", "목록 API 호출", "SQL 로그에서 추가 select 반복 확인"],
    triedMethods: ["LAZY/EAGER 설정 변경", "batch size 적용", "EntityGraph 적용"],
    blockedPoint: "목록 화면에 필요한 데이터만 가져오는 방식이 필요했습니다.",
    comments: [],
    solution: {
      id: "solution-104",
      status: "VERIFIED",
      rootCause: "목록 응답 생성 중 post.author와 post.tags를 순회하며 lazy loading이 반복되었습니다.",
      detail:
        "목록 API는 DTO projection으로 필요한 필드만 조회하고, 상세 API는 fetch join을 사용해 연관 데이터를 한 번에 가져오도록 분리했습니다.",
      verification: "Hibernate statistics와 SQL 로그에서 목록 조회 쿼리 수가 101개에서 3개로 줄어든 것을 확인했습니다.",
      references: ["Hibernate User Guide fetching chapter"],
      lessonLearned: "목록과 상세 조회는 필요한 데이터 모양이 다르므로 같은 Entity 조회 전략을 재사용하지 않습니다.",
      ragIncluded: true
    },
    aiAnalysis: {
      id: "analysis-104",
      status: "SUCCEEDED",
      summary: "연관 엔티티 lazy loading으로 인한 N+1 문제입니다.",
      qualityScore: 88,
      possibleCauses: [
        {
          rank: 1,
          title: "목록 응답 조립 중 lazy loading 반복",
          reason: "각 게시글마다 작성자와 태그 접근 시 추가 select가 발생했습니다.",
          confidence: 0.92
        }
      ],
      checklist: [
        "SQL 로그에서 게시글 수에 비례해 select가 증가하는지 확인합니다.",
        "목록 API와 상세 API의 조회 목적을 분리합니다.",
        "DTO projection 또는 fetch join 적용 전후 쿼리 수를 비교합니다."
      ],
      missingContext: [],
      similarCases: [],
      usage: {
        model: "gpt-5-mini",
        inputTokens: 2400,
        outputTokens: 610
      }
    },
    ragStatus: "INDEXED"
  },
  {
    id: "post-105",
    title: "S3 파일 업로드 시 권한 오류",
    summary: "IAM 정책과 버킷 정책 중 어떤 권한이 막는지 추가 정보가 필요한 업로드 실패 사례입니다.",
    status: "NEEDS_MORE_CONTEXT",
    authorId: "user-5",
    author: "cloud-newbie",
    createdAt: "2026-06-05 19:45",
    updatedAt: "2026-06-05 20:12",
    commentCount: 2,
    viewCount: 173,
    tags: ["AWS", "S3", "IAM"],
    environment: [
      ["Cloud", "AWS S3"],
      ["Backend", "Spring Boot"],
      ["Auth", "IAM user access key"]
    ],
    problemDescription:
      "이미지 업로드 API에서 S3 putObject 호출 시 AccessDenied가 발생합니다. 같은 key로 AWS Console 업로드는 가능합니다.",
    errorLog:
      "software.amazon.awssdk.services.s3.model.S3Exception: Access Denied (Service: S3, Status Code: 403, Request ID: ****)",
    reproductionSteps: ["업로드 API 호출", "MultipartFile 수신", "S3 putObject 실행", "AccessDenied 발생"],
    triedMethods: ["버킷 이름 확인", "리전 확인", "액세스 키 재발급"],
    blockedPoint: "IAM policy와 bucket policy 중 어디를 봐야 할지 모르겠습니다.",
    comments: [],
    aiAnalysis: {
      id: "analysis-105",
      status: "SUCCEEDED",
      summary:
        "S3 putObject 권한이 거부된 상황입니다. 현재 정보만으로는 IAM identity policy, bucket policy, object ownership 중 어느 계층이 원인인지 확정하기 어렵습니다.",
      qualityScore: 63,
      possibleCauses: [
        {
          rank: 1,
          title: "IAM 사용자에게 s3:PutObject 권한 부족",
          reason: "Console 업로드 권한과 애플리케이션 access key의 권한 주체가 다를 수 있습니다.",
          confidence: 0.7
        },
        {
          rank: 2,
          title: "Bucket policy의 조건 불일치",
          reason: "prefix, source IP, encryption 조건이 애플리케이션 요청과 맞지 않을 수 있습니다.",
          confidence: 0.59
        }
      ],
      checklist: [
        "애플리케이션이 사용하는 access key의 IAM principal을 확인합니다.",
        "해당 principal에 s3:PutObject와 대상 bucket ARN 권한이 있는지 확인합니다.",
        "bucket policy의 Condition이 업로드 요청과 일치하는지 확인합니다."
      ],
      missingContext: ["IAM policy JSON", "bucket policy JSON", "업로드 대상 key prefix", "SSE 암호화 사용 여부"],
      similarCases: [],
      usage: {
        model: "gpt-5-mini",
        inputTokens: 2100,
        outputTokens: 760
      }
    },
    ragStatus: "NO_RESULT"
  }
];
