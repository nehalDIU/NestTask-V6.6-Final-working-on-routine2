"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";

interface Tab {
  title: string;
  icon: LucideIcon;
  id?: string;
  noBackdrop?: boolean;
  type?: never;
}

interface Separator {
  type: "separator";
  title?: never;
  icon?: never;
  id?: never;
}

type TabItem = Tab | Separator;

interface ExpandableTabsProps {
  tabs: TabItem[];
  className?: string;
  activeColor?: string;
  activeIndex?: number | null;
  onChange?: (index: number | null) => void;
}

// Enhanced button animation
const buttonVariants = {
  initial: {
    width: "auto",
  },
  animate: (isSelected: boolean) => ({
    width: isSelected ? "auto" : "auto",
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    }
  }),
};

// Enhanced text animation for smooth appearance
const spanVariants = {
  initial: { 
    width: 0, 
    opacity: 0,
    marginLeft: 0,
  },
  animate: { 
    width: "auto", 
    opacity: 1,
    marginLeft: 8,
    transition: {
      width: { type: "spring", stiffness: 500, damping: 30 },
      opacity: { duration: 0.2, ease: "easeOut" },
      marginLeft: { type: "spring", stiffness: 500, damping: 30 },
    }
  },
  exit: { 
    width: 0, 
    opacity: 0,
    marginLeft: 0,
    transition: {
      width: { type: "spring", stiffness: 500, damping: 30 },
      opacity: { duration: 0.1, ease: "easeIn" },
      marginLeft: { duration: 0.1, ease: "easeIn" },
    }
  },
};

// Container animation for smoother transitions
const containerVariants = {
  initial: {
    flex: 1,
  },
  animate: (isSelected: boolean) => ({
    flex: isSelected ? 2 : 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    }
  }),
};

export function ExpandableTabs({
  tabs,
  className,
  activeColor = "text-primary",
  activeIndex = null,
  onChange,
}: ExpandableTabsProps) {
  const [selected, setSelected] = React.useState<number | null>(activeIndex);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Update selected state when activeIndex changes
  React.useEffect(() => {
    setSelected(activeIndex);
  }, [activeIndex]);

  const handleSelect = (index: number) => {
    const newSelected = selected === index ? null : index;
    setSelected(newSelected);
    onChange?.(newSelected);
  };

  const Separator = () => (
    <div className="h-[24px] w-[1.2px] bg-border/50 mx-1 flex-shrink-0" aria-hidden="true" />
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center gap-1 rounded-lg bg-background p-1 overflow-x-auto no-scrollbar",
        className
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === "separator") {
          return <Separator key={`separator-${index}`} />;
        }

        const Icon = tab.icon;
        const isSelected = selected === index;
        const hasNoBackdrop = tab.noBackdrop === true;
        
        return (
          <motion.div
            key={`tab-container-${tab.title}`}
            variants={containerVariants}
            initial="initial"
            animate="animate"
            custom={isSelected}
            className={cn(
              "relative rounded-lg overflow-hidden min-w-[48px]",
              isSelected ? "flex-grow" : "flex-shrink-0"
            )}
          >
            <button
              onClick={() => handleSelect(index)}
              className={cn(
                "relative flex items-center justify-center py-2.5 w-full text-sm font-medium rounded-lg transition-colors duration-300",
                isSelected ? "px-4" : "px-3",
                isSelected
                  ? hasNoBackdrop 
                    ? activeColor // No background for tabs with noBackdrop
                    : cn("bg-muted", activeColor) // Normal background for other tabs
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center justify-center w-full">
                <Icon 
                  className={cn(
                    "transition-transform duration-300 flex-shrink-0",
                    isSelected ? "scale-110" : "scale-100"
                  )} 
                  size={22} 
                />
                
                <AnimatePresence initial={false}>
                  {isSelected && (
                    <motion.span
                      key={`text-${tab.title}`}
                      variants={spanVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="overflow-hidden whitespace-nowrap text-xs md:text-sm font-medium origin-left flex-shrink-0"
                    >
                      {tab.title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
} 