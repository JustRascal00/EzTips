export type SkillLevel = "beginner" | "intermediate" | "advanced" | "competitive";

export type GoalOption = { id: string; name: string };

export type Character = {
  id: string;
  name: string;
  image: string;
  role?: string;
};

export type Game = {
  id: string;
  name: string;
  slug: string;
  short: string;
  icon: string;
  banner: string;
  learners: number;
  tint: string;
  goals: GoalOption[];
  roles: GoalOption[];
  characters: Character[];
  trending?: boolean;
};

export type CredentialType = "rank" | "coach" | "platform";

export type Creator = {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  gameId: string;
  credential: { label: string; type: CredentialType };
  verified: boolean;
  followers: number;
  likes: number;
  helpfulVotes: number;
  mainFocus: string;
};

export type Tutorial = {
  id: string;
  slug: string;
  title: string;
  learn: string;
  takeaways: string[];
  gameId: string;
  category: string;
  topic: string;
  character?: string;
  tags: string[];
  skillLevel: SkillLevel;
  duration: number;
  creatorId: string;
  thumbnail: string;
  videoUrl: string;
  views: number;
  likes: number;
  helpful: number;
  helpfulPercent: number;
  comments: number;
  createdAt: string;
  pathId?: string;
};

export type PathLesson = {
  id: string;
  title: string;
  duration: number;
  tutorialId?: string;
};

export type LearningPath = {
  id: string;
  slug: string;
  title: string;
  gameId: string;
  category: string;
  skillLevel: SkillLevel;
  description: string;
  thumbnail: string;
  lessons: PathLesson[];
  learners: number;
  progress?: number;
};

export type CommentUser = {
  name: string;
  username: string;
  avatar: string;
  isCreator?: boolean;
};

export type Comment = {
  id: string;
  tutorialId: string;
  user: CommentUser;
  text: string;
  likes: number;
  createdAt: string;
  pinned?: boolean;
  creatorAnswer?: boolean;
  replies: Comment[];
};

export type Collection = {
  id: string;
  name: string;
  tutorialIds: string[];
  public?: boolean;
};

export type AppNotification = {
  id: string;
  category: "creators" | "replies" | "learning";
  title: string;
  body: string;
  time: string;
  href: string;
  read: boolean;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  earned: boolean;
};

export type Toast = {
  id: string;
  message: string;
};

export type CurrentUser = {
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  ranks: { gameId: string; label: string }[];
};
