import React from "react";

/**
 * Composant Avatar intelligent qui affiche soit un emoji,
 * soit une image distante (Cloudflare R2).
 */
export default function UserAvatar({ user, size = "md", className = "" }) {
  const avatar = user?.avatar || "🌿";
  const isEmoji = !avatar.startsWith("http");

  const SIZES = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-11 h-11 text-xl",
    lg: "w-20 h-20 text-4xl",
    xl: "w-24 h-24 text-5xl",
  };

  const currentSize = SIZES[size] || SIZES.md;

  return (
    <div 
      className={`${currentSize} rounded-full flex items-center justify-center overflow-hidden border-2 bg-slate-100 border-white shadow-sm flex-shrink-0 ${className}`}
    >
      {isEmoji ? (
        <span>{avatar}</span>
      ) : (
        <img 
          src={avatar} 
          alt={user?.name || "Avatar"} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback si l'image ne charge pas
            e.target.style.display = "none";
            e.target.parentNode.innerHTML = "<span>👤</span>";
          }}
        />
      )}
    </div>
  );
}
