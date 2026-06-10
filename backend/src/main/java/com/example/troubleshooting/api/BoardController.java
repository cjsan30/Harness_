package com.example.troubleshooting.api;

import com.example.troubleshooting.api.BoardDtos.AiAnalysisDto;
import com.example.troubleshooting.api.BoardDtos.CommentRequest;
import com.example.troubleshooting.api.BoardDtos.CreatePostRequest;
import com.example.troubleshooting.api.BoardDtos.CreateSolutionRequest;
import com.example.troubleshooting.api.BoardDtos.PostDto;
import com.example.troubleshooting.api.BoardDtos.TagDto;
import com.example.troubleshooting.api.BoardDtos.UserDto;
import com.example.troubleshooting.domain.PostStatus;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api")
public class BoardController {
    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    @GetMapping("/auth/me")
    public UserDto currentUser() {
        return boardService.currentUser();
    }

    @GetMapping("/tags")
    public List<TagDto> tags() {
        return boardService.tags();
    }

    @GetMapping("/posts")
    public List<PostDto> posts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) PostStatus status,
            @RequestParam(required = false) Boolean solved,
            @RequestParam(defaultValue = "latest") String sort) {
        return boardService.listPosts(keyword, tag, status, solved, sort);
    }

    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto createPost(@RequestBody CreatePostRequest request) {
        return boardService.createPost(request);
    }

    @GetMapping("/posts/{postId}")
    public PostDto post(@PathVariable String postId) {
        return boardService.getPost(postId);
    }

    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto addComment(@PathVariable String postId, @RequestBody CommentRequest request) {
        return boardService.addComment(postId, request.body());
    }

    @DeleteMapping("/comments/{commentId}")
    public PostDto deleteComment(@PathVariable String commentId) {
        return boardService.deleteComment(commentId);
    }

    @PostMapping("/posts/{postId}/solutions")
    @ResponseStatus(HttpStatus.CREATED)
    public PostDto createSolution(@PathVariable String postId, @RequestBody CreateSolutionRequest request) {
        return boardService.createSolution(postId, request);
    }

    @PostMapping("/posts/{postId}/ai-analysis")
    public PostDto requestAiAnalysis(@PathVariable String postId) {
        return boardService.requestAiAnalysis(postId);
    }

    @GetMapping("/posts/{postId}/ai-analysis")
    public List<AiAnalysisDto> analysisHistory(@PathVariable String postId) {
        return boardService.analysisHistory(postId);
    }
}
