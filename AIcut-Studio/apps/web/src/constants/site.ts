export const SITE_URL = "https://aicut.app";

export const SITE_INFO = {
  title: "AIcut",
  description:
    "AI 原生全自动视频剪辑引擎。将 Python AI 逻辑与前端时间轴完美结合。",
  url: SITE_URL,
  openGraphImage: "/open-graph/default.jpg",
  twitterImage: "/open-graph/default.jpg",
  favicon: "/favicon.ico",
};

export const EXTERNAL_TOOLS = [
  {
    name: "Marble",
    description:
      "Modern headless CMS for content management and the blog for AIcut",
    url: "https://marblecms.com?utm_source=aicut",
    icon: "MarbleIcon" as const,
  },
  {
    name: "Vercel",
    description: "Platform where we deploy and host AIcut",
    url: "https://vercel.com?utm_source=aicut",
    icon: "VercelIcon" as const,
  },
  {
    name: "Databuddy",
    description: "GDPR compliant analytics and user insights for AIcut",
    url: "https://databuddy.cc?utm_source=aicut",
    icon: "DataBuddyIcon" as const,
  },
];
