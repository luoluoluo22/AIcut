import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ReactCountryFlag from "react-country-flag";

export interface Language {
  code: string;
  name: string;
  flag?: string;
}

interface LanguageSelectProps {
  selectedCountry: string;
  onSelect: (country: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  languages: Language[];
}

function FlagPreloader({ languages }: { languages: Language[] }) {
  return (
    <div className="absolute -top-[9999px] left-0 pointer-events-none">
      {languages.map((language) => (
        <ReactCountryFlag
          key={language.code}
          countryCode={language.code}
          svg
          style={{ width: "1.05rem", height: "1.05rem" }}
        />
      ))}
    </div>
  );
}

export function LanguageSelect({
  selectedCountry,
  onSelect,
  containerRef,
  languages,
}: LanguageSelectProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRefInternal = useRef<HTMLDivElement>(null);
  const collapsedHeight = "2.5rem";

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  useEffect(() => {
    if (!expanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRefInternal.current &&
        !containerRefInternal.current.contains(event.target as Node)
      ) {
        setExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expanded]);

  const selectedLanguage = languages.find(
    (lang) => lang.code === selectedCountry
  );

  const handleSelect = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(code);
    setExpanded(false);
  };

  return (
    <div className="relative w-full h-10" ref={containerRefInternal}>
      <FlagPreloader languages={languages} />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleExpand}
        className={cn(
          "w-full h-10 flex items-center justify-between rounded-lg px-3",
          "bg-foreground/10 backdrop-blur-md text-foreground",
          "border border-transparent focus:border-ring focus:ring-ring/50 focus:ring-[1px]",
          "transition-all cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2">
          {selectedCountry === "auto" ? (
            <Globe className="size-4" />
          ) : (
            <ReactCountryFlag
              countryCode={selectedCountry}
              svg
              style={{ width: "1.1rem", height: "1.1rem" }}
            />
          )}
          <span className="text-sm">
            {selectedCountry === "auto" ? "Auto" : selectedLanguage?.name}
          </span>
        </div>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 w-full z-50 bg-panel border rounded-lg shadow-xl overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto p-1 scrollbar-hidden">
              <LanguageButton
                language={{ code: "auto", name: "Auto" }}
                onSelect={(code, e) => handleSelect(code, e)}
                isSelected={selectedCountry === "auto"}
              />
              {languages.map((language) => (
                <LanguageButton
                  key={language.code}
                  language={language}
                  onSelect={(code, e) => handleSelect(code, e)}
                  isSelected={selectedCountry === language.code}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LanguageButton({
  language,
  onSelect,
  isSelected,
}: {
  language: Language;
  onSelect: (code: string, e: React.MouseEvent) => void;
  isSelected: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
        "hover:bg-foreground/10 text-left",
        isSelected ? "bg-primary/20 text-primary" : "text-foreground"
      )}
      onClick={(e) => onSelect(language.code, e)}
    >
      {language.code === "auto" ? (
        <Globe className="size-3.5" />
      ) : (
        <ReactCountryFlag
          countryCode={language.code}
          svg
          style={{ width: "1.05rem", height: "1.05rem" }}
        />
      )}
      <span className="truncate">{language.name}</span>
    </button>
  );
}
