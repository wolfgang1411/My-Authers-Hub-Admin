import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SharedModule } from '../../../modules/shared/shared-module';
import { BlogService } from '../../../services/blog';
import { CommentService } from '../../../services/comment';
import { Blog, Comment, CreateComment } from '../../../interfaces';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../services/user';
import { Logger } from '../../../services/logger';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-blog-view',
  imports: [
    SharedModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './blog-view.html',
  styleUrl: './blog-view.css',
})
export class BlogView implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  blogService = inject(BlogService);
  commentService = inject(CommentService);
  userService = inject(UserService);
  logger = inject(Logger);
  translateService = inject(TranslateService);
  sanitizer = inject(DomSanitizer);

  blog = signal<Blog | null>(null);
  isLoading = signal(true);
  comments = signal<Comment[]>([]);
  isLoadingComments = signal(false);
  totalCommentsCount = signal(0);
  currentPage = signal(1);
  itemsPerPage = signal(20);
  hasMoreComments = computed(() => {
    return this.comments().length < this.totalCommentsCount();
  });

  // Comment form
  commentContent = new FormControl('', [Validators.required]);
  replyingTo = signal<Comment | null>(null);
  replyContent = new FormControl('', [Validators.required]);
  isSubmittingComment = signal(false);

  // Expanded replies for each comment
  expandedReplies = signal<Map<number, Comment[]>>(new Map());
  loadingReplies = signal<Map<number, boolean>>(new Map());
  repliesPage = signal<Map<number, number>>(new Map());

  loggedInUser = computed(() => this.userService.loggedInUser$());

  async ngOnInit() {
    const blogId = this.route.snapshot.paramMap.get('id');
    if (blogId) {
      await this.loadBlog(+blogId);
      await this.loadComments();
    } else {
      this.router.navigate(['/blogs']);
    }
  }

  async loadBlog(id: number) {
    this.isLoading.set(true);
    try {
      const blog = await this.blogService.fetchBlog(id);
      this.blog.set(blog);
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('Error'),
        text: this.translateService.instant('Failed to load blog'),
      });
      this.router.navigate(['/blogs']);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadComments() {
    const blog = this.blog();
    if (!blog) return;

    this.isLoadingComments.set(true);
    try {
      const response = await this.commentService.getFirstLevelComments(
        blog.id,
        this.currentPage(),
        this.itemsPerPage()
      );
      this.comments.set(response.items);
      this.totalCommentsCount.set(response.totalCount);
    } catch (error) {
      this.logger.logError(error);
    } finally {
      this.isLoadingComments.set(false);
    }
  }

  async loadMoreComments() {
    if (!this.hasMoreComments()) return;

    const blog = this.blog();
    if (!blog) return;

    this.currentPage.update((p) => p + 1);
    try {
      const response = await this.commentService.getFirstLevelComments(
        blog.id,
        this.currentPage(),
        this.itemsPerPage()
      );
      this.comments.update((comments) => [...comments, ...response.items]);
    } catch (error) {
      this.logger.logError(error);
      this.currentPage.update((p) => p - 1);
    }
  }

  async loadReplies(commentOrId: Comment | number) {
    const commentId = typeof commentOrId === 'number' ? commentOrId : commentOrId?.id;
    
    if (!commentId) {
      this.logger.logError(new Error('Invalid comment: missing id'));
      return;
    }
    const currentReplies = this.expandedReplies().get(commentId) || [];
    const currentPage = this.repliesPage().get(commentId) || 1;

    // If already loaded, toggle collapse
    if (currentReplies.length > 0) {
      const newMap = new Map(this.expandedReplies());
      newMap.delete(commentId);
      this.expandedReplies.set(newMap);
      return;
    }

    // Load replies
    const loadingMap = new Map(this.loadingReplies());
    loadingMap.set(commentId, true);
    this.loadingReplies.set(loadingMap);

    try {
      const response = await this.commentService.getReplies(
        commentId,
        1,
        20
      );
      const newMap = new Map(this.expandedReplies());
      newMap.set(commentId, response.items);
      this.expandedReplies.set(newMap);
      this.repliesPage.set(new Map(this.repliesPage()).set(commentId, 1));
    } catch (error) {
      this.logger.logError(error);
    } finally {
      const loadingMap = new Map(this.loadingReplies());
      loadingMap.delete(commentId);
      this.loadingReplies.set(loadingMap);
    }
  }

  async loadMoreReplies(commentOrId: Comment | number) {
    const commentId = typeof commentOrId === 'number' ? commentOrId : commentOrId?.id;
    
    if (!commentId) {
      this.logger.logError(new Error('Invalid comment: missing id'));
      return;
    }
    const currentPage = (this.repliesPage().get(commentId) || 1) + 1;

    const loadingMap = new Map(this.loadingReplies());
    loadingMap.set(commentId, true);
    this.loadingReplies.set(loadingMap);

    try {
      const response = await this.commentService.getReplies(
        commentId,
        currentPage,
        20
      );
      const currentReplies = this.expandedReplies().get(commentId) || [];
      const newMap = new Map(this.expandedReplies());
      newMap.set(commentId, [...currentReplies, ...response.items]);
      this.expandedReplies.set(newMap);
      this.repliesPage.set(new Map(this.repliesPage()).set(commentId, currentPage));
    } catch (error) {
      this.logger.logError(error);
    } finally {
      const loadingMap = new Map(this.loadingReplies());
      loadingMap.delete(commentId);
      this.loadingReplies.set(loadingMap);
    }
  }

  startReply(comment: Comment) {
    this.replyingTo.set(comment);
    this.replyContent.setValue('');
  }

  cancelReply() {
    this.replyingTo.set(null);
    this.replyContent.setValue('');
  }

  async submitComment() {
    if (this.commentContent.invalid) {
      this.commentContent.markAsTouched();
      return;
    }

    const blog = this.blog();
    if (!blog) return;

    this.isSubmittingComment.set(true);
    try {
      const commentData: CreateComment = {
        content: this.commentContent.value!,
        blogId: blog.id,
      };
      await this.commentService.createComment(commentData);
      this.commentContent.setValue('');
      await this.loadComments();
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('Success'),
        text: this.translateService.instant('Comment added successfully'),
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('Error'),
        text: this.translateService.instant('Failed to add comment'),
      });
    } finally {
      this.isSubmittingComment.set(false);
    }
  }

  async submitReply() {
    if (this.replyContent.invalid) {
      this.replyContent.markAsTouched();
      return;
    }

    const blog = this.blog();
    const parentComment = this.replyingTo();
    if (!blog || !parentComment) return;

    this.isSubmittingComment.set(true);
    try {
      const commentData: CreateComment = {
        content: this.replyContent.value!,
        blogId: blog.id,
        parentId: parentComment.id,
      };
      await this.commentService.createComment(commentData);
      this.cancelReply();
      
      // Reload replies for the parent comment
      const currentReplies = this.expandedReplies().get(parentComment.id) || [];
      if (currentReplies.length > 0) {
        await this.loadReplies(parentComment);
      }
      
      Swal.fire({
        icon: 'success',
        title: this.translateService.instant('Success'),
        text: this.translateService.instant('Reply added successfully'),
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      this.logger.logError(error);
      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('Error'),
        text: this.translateService.instant('Failed to add reply'),
      });
    } finally {
      this.isSubmittingComment.set(false);
    }
  }

  async deleteComment(comment: Comment) {
    const result = await Swal.fire({
      title: this.translateService.instant('Are you sure?'),
      text: this.translateService.instant('You will not be able to recover this comment!'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translateService.instant('Yes, delete it!'),
      cancelButtonText: this.translateService.instant('Cancel'),
    });

    if (result.isConfirmed) {
      try {
        await this.commentService.deleteComment(comment.id);
        await this.loadComments();
        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('Deleted!'),
          text: this.translateService.instant('Comment has been deleted.'),
        });
      } catch (error) {
        this.logger.logError(error);
      }
    }
  }

  canDeleteComment(comment: Comment): boolean {
    const user = this.loggedInUser();
    if (!user) return false;
    return comment.authorId === user.id || user.accessLevel === 'SUPERADMIN';
  }

  getSanitizedContent(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  hasReplies(comment: Comment): boolean {
    // This would need to be tracked from the API response
    // For now, we'll check if replies are loaded
    return (this.expandedReplies().get(comment.id)?.length || 0) > 0;
  }

  getRepliesForComment(commentId: number): Comment[] {
    return this.expandedReplies().get(commentId) || [];
  }

  isLoadingRepliesFor(commentId: number): boolean {
    return this.loadingReplies().get(commentId) || false;
  }
}

