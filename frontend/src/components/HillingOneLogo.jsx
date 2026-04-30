/**
 * HillingOne brand logo — SVG recreation of the network-graph icon + wordmark.
 * Variants:
 *   dark  — teal icon, teal+gold text  (default, on white backgrounds)
 *   light — white icon, white+gold text (on dark/teal backgrounds)
 */
export function HillingOneIcon({ size = 40, variant = "dark" }) {
  const teal  = variant === "light" ? "#FFFFFF" : "#2A5C5A";
  const gold  = "#EAB830";
  const line  = variant === "light" ? "rgba(255,255,255,0.55)" : "#2A5C5A";

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Connecting lines — drawn first so nodes sit on top */}
      <line x1="19" y1="10" x2="43" y2="19" stroke={line} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="19" y1="10" x2="9"  y2="31" stroke={line} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="43" y1="19" x2="51" y2="38" stroke={line} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="9"  y1="31" x2="30" y2="35" stroke={line} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="30" y1="35" x2="51" y2="38" stroke={line} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="9"  y1="31" x2="17" y2="53" stroke={line} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="17" y1="53" x2="30" y2="35" stroke={line} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="43" y1="19" x2="30" y2="35" stroke={line} strokeWidth="2.2" strokeLinecap="round"/>

      {/* Dark teal (or white) nodes */}
      <circle cx="19" cy="10" r="7"   fill={teal}/>
      <circle cx="9"  cy="31" r="7"   fill={teal}/>
      <circle cx="17" cy="53" r="6.5" fill={teal}/>
      <circle cx="38" cy="54" r="5.5" fill={teal}/>

      {/* Gold nodes */}
      <circle cx="43" cy="19" r="5.5" fill={gold}/>
      <circle cx="30" cy="35" r="5.5" fill={gold}/>
      <circle cx="51" cy="38" r="6"   fill={gold}/>
    </svg>
  );
}

export function HillingOneWordmark({ variant = "dark", size = "md" }) {
  const tealText = variant === "light" ? "text-white" : "text-[#2A5C5A]";
  const sizeClass = { sm: "text-base", md: "text-lg", lg: "text-2xl", xl: "text-3xl" }[size] || "text-lg";

  return (
    <span className={`font-bold leading-none tracking-tight ${sizeClass}`}>
      <span className={tealText}>Hilling</span>
      <span className="text-[#EAB830]">One</span>
    </span>
  );
}

export default function HillingOneLogo({ size = 40, variant = "dark", showText = true, textSize = "md" }) {
  return (
    <div className="flex items-center gap-2.5">
      <HillingOneIcon size={size} variant={variant} />
      {showText && <HillingOneWordmark variant={variant} size={textSize} />}
    </div>
  );
}
