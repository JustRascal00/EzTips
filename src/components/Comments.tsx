"use client";

import { commentsFor } from "@/data/comments";
import { currentUserSeed } from "@/data/creators";
import { formatCount, formatTimeAgo } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { Comment } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Heart } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Button, Chip } from "./ui";

function highlight(text: string) {
  const parts = text.split(/(@[A-Za-z0-9_]+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="text-accent">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function Item({
  comment,
  isCreatorView,
  onPin,
  onMarkAnswer,
}: {
  comment: Comment;
  isCreatorView?: boolean;
  onPin?: (id: string) => void;
  onMarkAnswer?: (id: string) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [localReplies, setLocalReplies] = useState(comment.replies);

  return (
    <div className="flex gap-3">
      <Avatar src={comment.user.avatar} alt="" size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{comment.user.name}</span>
          <span className="text-xs text-muted">@{comment.user.username}</span>
          {comment.pinned && <Chip>Pinned</Chip>}
          {comment.creatorAnswer && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-success">
              Creator Answer
            </span>
          )}
          <span className="text-xs text-muted">{formatTimeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm mt-1 leading-relaxed text-[#d7dbe6]">{highlight(comment.text)}</p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => setLiked((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 text-xs transition-colors duration-150",
              liked ? "text-danger" : "text-muted hover:text-text",
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
            {formatCount(comment.likes + (liked ? 1 : 0))}
          </button>
          <button
            onClick={() => setReplyOpen((v) => !v)}
            className="text-xs text-muted hover:text-text"
          >
            Reply
          </button>
          {isCreatorView && (
            <>
              <button
                onClick={() => onPin?.(comment.id)}
                className="text-xs text-muted hover:text-text"
              >
                Pin
              </button>
              <button
                onClick={() => onMarkAnswer?.(comment.id)}
                className="text-xs text-muted hover:text-text"
              >
                Mark as answer
              </button>
            </>
          )}
        </div>
        {replyOpen && (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!reply.trim()) return;
              setLocalReplies((r) => [
                ...r,
                {
                  id: Math.random().toString(36),
                  tutorialId: comment.tutorialId,
                  user: {
                    name: currentUserSeed.displayName,
                    username: currentUserSeed.username,
                    avatar: currentUserSeed.avatar,
                  },
                  text: reply,
                  likes: 0,
                  createdAt: new Date().toISOString(),
                  replies: [],
                },
              ]);
              setReply("");
              setReplyOpen(false);
            }}
          >
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={`Reply to @${comment.user.username}`}
              className="flex-1 h-9 rounded-[10px] bg-card border border-border px-3 text-sm outline-none focus:border-accent/50"
            />
            <Button size="sm" type="submit">
              Reply
            </Button>
          </form>
        )}
        {localReplies.length > 0 && (
          <div className="mt-3 space-y-3 border-l border-border pl-3">
            {localReplies.map((r) => (
              <Item key={r.id} comment={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentThread({ tutorialId }: { tutorialId: string }) {
  const seed = useMemo(() => commentsFor(tutorialId), [tutorialId]);
  const { currentUser, toast } = useApp();
  const [list, setList] = useState(seed);
  const [text, setText] = useState("");

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Comments</h2>
      <form
        className="flex gap-3 mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setList((l) => [
            {
              id: Math.random().toString(36),
              tutorialId,
              user: {
                name: currentUser.displayName,
                username: currentUser.username,
                avatar: currentUser.avatar,
              },
              text,
              likes: 0,
              createdAt: new Date().toISOString(),
              replies: [],
            },
            ...l,
          ]);
          setText("");
          toast("Comment posted");
        }}
      >
        <Avatar src={currentUser.avatar} alt="" size={36} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question or add a note for other players..."
          className="flex-1 h-10 rounded-xl bg-card border border-border px-3 text-sm outline-none focus:border-accent/50"
        />
        <Button type="submit">Comment</Button>
      </form>
      <div className="space-y-5">
        {list.length === 0 && (
          <p className="text-sm text-muted">No comments yet. Ask how you’d apply this in ranked.</p>
        )}
        {list.map((c) => (
          <Item
            key={c.id}
            comment={c}
            onPin={(id) =>
              setList((l) => l.map((x) => ({ ...x, pinned: x.id === id })))
            }
            onMarkAnswer={(id) =>
              setList((l) =>
                l.map((x) => (x.id === id ? { ...x, creatorAnswer: true } : x)),
              )
            }
          />
        ))}
      </div>
    </section>
  );
}
