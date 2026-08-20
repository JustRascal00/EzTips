import type { Achievement, AppNotification } from "@/lib/types";

export const notifications: AppNotification[] = [
  {
    id: "n1",
    category: "creators",
    title: "Kai uploaded a new Ahri tutorial",
    body: "The Ahri combo you're dropping in lane · 39s",
    time: "2026-08-16T13:10:00Z",
    href: "/t/ahri-combo-youre-dropping-in-lane",
    read: false,
  },
  {
    id: "n2",
    category: "learning",
    title: "You're one lesson away",
    body: "Finish Trading patterns to keep your Ahri Mastery streak going.",
    time: "2026-08-19T08:00:00Z",
    href: "/learn/ahri-mastery",
    read: false,
  },
  {
    id: "n3",
    category: "replies",
    title: "Kai replied to your comment",
    body: "The 8-second ping thing is what I was missing.",
    time: "2026-08-14T21:20:00Z",
    href: "/t/stop-making-this-roaming-mistake",
    read: false,
  },
  {
    id: "n4",
    category: "creators",
    title: "Mira posted on Ascent",
    body: "Best Jett smokes on Ascent — A main",
    time: "2026-08-11T19:40:00Z",
    href: "/t/best-jett-smokes-ascent",
    read: true,
  },
  {
    id: "n5",
    category: "learning",
    title: "7-day streak",
    body: "You kept the streak. +40 XP is already on your profile.",
    time: "2026-08-19T07:00:00Z",
    href: "/u/ashen",
    read: true,
  },
  {
    id: "n6",
    category: "replies",
    title: "midorfeed liked your comment",
    body: "On Stop making this roaming mistake",
    time: "2026-08-15T11:02:00Z",
    href: "/t/stop-making-this-roaming-mistake",
    read: true,
  },
];

export const achievements: Achievement[] = [
  {
    id: "first-10",
    name: "First 10 Lessons",
    description: "Complete 10 lessons across any path.",
    earned: true,
  },
  {
    id: "hundred",
    name: "100 Tutorials Completed",
    description: "Finish 100 short tutorials.",
    earned: false,
  },
  {
    id: "aim-student",
    name: "Aim Student",
    description: "Complete Aim Foundations.",
    earned: true,
  },
  {
    id: "gs3",
    name: "Game Sense III",
    description: "Mark 25 game-sense tutorials as helpful.",
    earned: true,
  },
  {
    id: "lol-expert",
    name: "LoL Expert",
    description: "Finish three League learning paths.",
    earned: false,
  },
  {
    id: "week",
    name: "Week on the Board",
    description: "Maintain a 7-day learning streak.",
    earned: true,
  },
];
