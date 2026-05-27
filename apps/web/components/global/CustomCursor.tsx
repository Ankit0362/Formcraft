"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Check if device supports hover
    if (window.matchMedia("(hover: none)").matches) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleHoverStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === "a" || 
        target.tagName.toLowerCase() === "button" ||
        target.closest("a") || 
        target.closest("button")
      ) {
        setIsHovering(true);
      }
    };
    const handleHoverEnd = () => setIsHovering(false);

    window.addEventListener("mousemove", moveCursor);
    document.body.addEventListener("mouseleave", handleMouseLeave);
    document.body.addEventListener("mouseenter", handleMouseEnter);
    document.body.addEventListener("mouseover", handleHoverStart);
    document.body.addEventListener("mouseout", handleHoverEnd);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      document.body.removeEventListener("mouseenter", handleMouseEnter);
      document.body.removeEventListener("mouseover", handleHoverStart);
      document.body.removeEventListener("mouseout", handleHoverEnd);
    };
  }, [cursorX, cursorY, isVisible]);

  if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) return null;

  return (
    <>
      {/* Outer ring */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-foreground/30 pointer-events-none z-[100] mix-blend-difference hidden md:block"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          opacity: isVisible ? (isHovering ? 0 : 1) : 0,
          translateX: "-50%",
          translateY: "-50%",
          scale: isHovering ? 1.5 : 1,
        }}
      />
      {/* Inner dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-foreground pointer-events-none z-[100] mix-blend-difference hidden md:block"
        style={{
          x: cursorX,
          y: cursorY,
          opacity: isVisible ? 1 : 0,
          translateX: "-50%",
          translateY: "-50%",
          scale: isHovering ? 4 : 1,
        }}
        transition={{ scale: { type: "spring", stiffness: 400, damping: 25 } }}
      />
    </>
  );
}
