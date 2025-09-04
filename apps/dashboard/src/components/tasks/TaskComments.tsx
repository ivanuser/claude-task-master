'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  PaperClipIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ReplyIcon,
} from '@heroicons/react/24/outline';
import { TaskComment, CommentReaction, User } from '@/types/team';
import { AuthService } from '@/lib/services/auth.service';
import { NotificationService } from '@/lib/services/notification.service';

interface TaskCommentsProps {
  taskId: string;
  projectId: string;
  onCommentAdded?: (comment: TaskComment) => void;
}

const reactionEmojis: CommentReaction['type'][] = ['👍', '👎', '❤️', '🎉', '😕', '👀'];

export function TaskComments({
  taskId,
  projectId,
  onCommentAdded,
}: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      const mockComments: TaskComment[] = [
        {
          id: '1',
          taskId,
          projectId,
          userId: '1',
          user: {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            emailVerified: true,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              theme: 'light',
              language: 'en',
              emailNotifications: true,
              pushNotifications: true,
              weeklyDigest: true,
            },
          },
          content: 'I\'ve started working on this task. The authentication logic needs to handle both JWT and OAuth flows.',
          mentions: [],
          reactions: [
            {
              id: 'r1',
              commentId: '1',
              userId: '2',
              user: {
                id: '2',
                name: 'Jane Smith',
                email: 'jane@example.com',
                emailVerified: true,
                twoFactorEnabled: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                preferences: {
                  theme: 'dark',
                  language: 'en',
                  emailNotifications: true,
                  pushNotifications: false,
                  weeklyDigest: true,
                },
              },
              type: '👍',
              createdAt: new Date().toISOString(),
            },
          ],
          edited: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: '2',
          taskId,
          projectId,
          userId: '2',
          user: {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            emailVerified: true,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              theme: 'dark',
              language: 'en',
              emailNotifications: true,
              pushNotifications: false,
              weeklyDigest: true,
            },
          },
          content: '@John Doe Good point! We should also consider implementing refresh token rotation for better security.',
          mentions: ['1'],
          reactions: [],
          edited: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          parentId: '1',
        },
      ];

      setComments(mockComments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setPosting(true);
    try {
      const mentions = extractMentions(newComment);
      
      const comment: TaskComment = {
        id: `comment-${Date.now()}`,
        taskId,
        projectId,
        userId: currentUser.id,
        user: currentUser,
        content: newComment,
        mentions,
        reactions: [],
        edited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setComments([...comments, comment]);
      setNewComment('');
      
      // Notify mentioned users
      for (const userId of mentions) {
        const mentionedUser = await getUserById(userId);
        if (mentionedUser) {
          await NotificationService.notifyTaskMentioned(
            { id: taskId, title: 'Task Title' } as any,
            mentionedUser,
            currentUser,
            newComment
          );
        }
      }

      if (onCommentAdded) {
        onCommentAdded(comment);
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim() || !currentUser) return;

    const mentions = extractMentions(replyText);
    
    const reply: TaskComment = {
      id: `comment-${Date.now()}`,
      taskId,
      projectId,
      userId: currentUser.id,
      user: currentUser,
      content: replyText,
      mentions,
      reactions: [],
      edited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId,
    };

    setComments([...comments, reply]);
    setReplyText('');
    setReplyingTo(null);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;

    setComments(comments.map(c => 
      c.id === commentId 
        ? { ...c, content: editText, edited: true, editedAt: new Date().toISOString() }
        : c
    ));
    
    setEditingComment(null);
    setEditText('');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      setComments(comments.filter(c => c.id !== commentId && c.parentId !== commentId));
    }
  };

  const handleAddReaction = async (commentId: string, type: CommentReaction['type']) => {
    if (!currentUser) return;

    setComments(comments.map(c => {
      if (c.id !== commentId) return c;

      const existingReaction = c.reactions?.find(r => 
        r.userId === currentUser.id && r.type === type
      );

      if (existingReaction) {
        // Remove reaction
        return {
          ...c,
          reactions: c.reactions?.filter(r => r.id !== existingReaction.id),
        };
      } else {
        // Add reaction
        const newReaction: CommentReaction = {
          id: `reaction-${Date.now()}`,
          commentId,
          userId: currentUser.id,
          user: currentUser,
          type,
          createdAt: new Date().toISOString(),
        };
        
        return {
          ...c,
          reactions: [...(c.reactions || []), newReaction],
        };
      }
    }));
    
    setShowEmojiPicker(null);
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // In production, resolve username to user ID
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  const getUserById = async (userId: string): Promise<User | null> => {
    // In production, fetch from API
    return {
      id: userId,
      name: 'User Name',
      email: 'user@example.com',
      emailVerified: true,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        language: 'en',
        emailNotifications: true,
        pushNotifications: true,
        weeklyDigest: true,
      },
    };
  };

  const renderComment = (comment: TaskComment, isReply: boolean = false) => {
    const isOwn = currentUser?.id === comment.userId;
    const replies = comments.filter(c => c.parentId === comment.id);

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12' : ''}`}>
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                {comment.user.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-medium text-sm text-gray-900">
                    {comment.user.name}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    {comment.edited && ' (edited)'}
                  </span>
                </div>
                
                {isOwn && (
                  <div className="relative">
                    <button className="text-gray-400 hover:text-gray-600">
                      <EllipsisVerticalIcon className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10 hidden group-hover:block">
                      <button
                        onClick={() => {
                          setEditingComment(comment.id);
                          setEditText(comment.content);
                        }}
                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                      >
                        <PencilIcon className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-gray-100 w-full"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {editingComment === comment.id ? (
                <div className="mt-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                  />
                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={() => handleEditComment(comment.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingComment(null);
                        setEditText('');
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {comment.content}
                </p>
              )}
              
              {/* Reactions */}
              <div className="mt-2 flex items-center space-x-2">
                {comment.reactions && comment.reactions.length > 0 && (
                  <div className="flex items-center space-x-1">
                    {Object.entries(
                      comment.reactions.reduce((acc, r) => {
                        acc[r.type] = (acc[r.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(comment.id, emoji as CommentReaction['type'])}
                        className="flex items-center px-2 py-1 bg-white border border-gray-200 rounded-full text-xs hover:bg-gray-50"
                      >
                        <span>{emoji}</span>
                        {count > 1 && <span className="ml-1">{count}</span>}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(
                      showEmojiPicker === comment.id ? null : comment.id
                    )}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaceSmileIcon className="w-4 h-4" />
                  </button>
                  
                  {showEmojiPicker === comment.id && (
                    <div className="absolute bottom-6 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                      <div className="flex space-x-1">
                        {reactionEmojis.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(comment.id, emoji)}
                            className="hover:bg-gray-100 p-1 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {!isReply && (
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    <ReplyIcon className="w-4 h-4 inline mr-1" />
                    Reply
                  </button>
                )}
              </div>
            </div>
            
            {/* Reply input */}
            {replyingTo === comment.id && (
              <div className="mt-2 ml-8">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                />
                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Render replies */}
            {replies.length > 0 && (
              <div className="mt-3 space-y-3">
                {replies.map(reply => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse flex space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments list */}
      <div className="space-y-4">
        {comments.filter(c => !c.parentId).map(comment => renderComment(comment))}
        
        {comments.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
      
      {/* New comment form */}
      {currentUser && (
        <form onSubmit={handleSubmitComment} className="mt-6">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </div>
            
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment... Use @ to mention someone"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              
              <div className="mt-2 flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    title="Attach file"
                  >
                    <PaperClipIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={!newComment.trim() || posting}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-4 h-4 mr-1" />
                  {posting ? 'Posting...' : 'Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}