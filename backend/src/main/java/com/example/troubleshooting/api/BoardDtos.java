package com.example.troubleshooting.api;

import com.example.troubleshooting.domain.AiAnalysisStatus;
import com.example.troubleshooting.domain.PostStatus;
import java.util.ArrayList;
import java.util.List;

public final class BoardDtos {
    private BoardDtos() {
    }

    public record UserDto(String id, String nickname, String role) {
    }

    public record TagDto(String name, String category) {
    }

    public record CommentRequest(String body) {
    }

    public record CreatePostRequest(
            String title,
            List<String> tags,
            List<List<String>> environment,
            String problemDescription,
            String errorLog,
            List<String> reproductionSteps,
            List<String> triedMethods,
            String blockedPoint,
            boolean runAiAnalysis) {
    }

    public record CreateSolutionRequest(
            String rootCause,
            String detail,
            String verification,
            List<String> references,
            String lessonLearned,
            boolean ragIncluded) {
    }

    public static class CommentDto {
        public String id;
        public String authorId;
        public String author;
        public String role;
        public String body;
        public String createdAt;

        public CommentDto() {
        }

        public CommentDto(String id, String authorId, String author, String role, String body, String createdAt) {
            this.id = id;
            this.authorId = authorId;
            this.author = author;
            this.role = role;
            this.body = body;
            this.createdAt = createdAt;
        }
    }

    public static class SolutionDto {
        public String id;
        public String status;
        public String rootCause;
        public String detail;
        public String verification;
        public List<String> references = new ArrayList<>();
        public String lessonLearned;
        public boolean ragIncluded;

        public SolutionDto() {
        }
    }

    public record CauseDto(int rank, String title, String reason, double confidence) {
    }

    public record SimilarCaseDto(String postId, String title, double similarity, boolean solved, String excerpt) {
    }

    public record UsageDto(String model, int inputTokens, int outputTokens) {
    }

    public static class AiAnalysisDto {
        public String id;
        public AiAnalysisStatus status;
        public String summary;
        public Integer qualityScore;
        public List<CauseDto> possibleCauses = new ArrayList<>();
        public List<String> checklist = new ArrayList<>();
        public List<String> missingContext = new ArrayList<>();
        public List<SimilarCaseDto> similarCases = new ArrayList<>();
        public UsageDto usage = new UsageDto("gpt-5-mini", 0, 0);

        public AiAnalysisDto() {
        }
    }

    public static class PostDto {
        public String id;
        public String title;
        public String summary;
        public PostStatus status;
        public String authorId;
        public String author;
        public String createdAt;
        public String updatedAt;
        public int commentCount;
        public int viewCount;
        public List<String> tags = new ArrayList<>();
        public List<List<String>> environment = new ArrayList<>();
        public String problemDescription;
        public String errorLog;
        public List<String> reproductionSteps = new ArrayList<>();
        public List<String> triedMethods = new ArrayList<>();
        public String blockedPoint;
        public List<CommentDto> comments = new ArrayList<>();
        public SolutionDto solution;
        public AiAnalysisDto aiAnalysis;
        public String ragStatus;

        public PostDto() {
        }
    }
}
