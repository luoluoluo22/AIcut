"use client";

import { motion } from "motion/react";
import { Button } from "../ui/button";
import { SponsorButton } from "../ui/sponsor-button";
import { VercelIcon } from "../icons";
import { ArrowRight } from "lucide-react";

import Image from "next/image";
import { Handlebars } from "./handlebars";
import Link from "next/link";

export function Hero() {
  return (
    <div className="min-h-[calc(100svh-4.5rem)] flex flex-col justify-between items-center text-center px-4">
      <Image
        className="absolute top-0 left-0 -z-50 size-full object-cover invert dark:invert-0 opacity-85"
        src="/landing-page-dark.png"
        height={1903.5}
        width={1269}
        alt="landing-page.bg"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mb-4 flex justify-center"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-sm font-medium">
            <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
            Empowering AI Video Automation
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="inline-block font-bold tracking-tighter text-4xl md:text-[4rem]"
        >
          <h1>The AI Native</h1>
          <Handlebars>Video Editor</Handlebars>
        </motion.div>

        <motion.p
          className="mt-10 text-base sm:text-xl text-muted-foreground font-light tracking-wide max-w-xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          AI 原生视频剪辑引擎。将强大的 Python AI 逻辑与前端实时时间轴结合，实现真正的全自动视频生产。
        </motion.p>

        <motion.div
          className="mt-8 flex gap-8 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <Link href="/projects">
            <Button
              type="submit"
              size="lg"
              className="px-6 h-11 text-base bg-foreground"
            >
              Try early beta
              <ArrowRight className="relative z-10 ml-0.5 h-4 w-4 inline-block" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
